"use client";
import React, { useRef, useState, useCallback, useEffect, TouchEvent } from 'react';
import HTMLFlipBook from 'react-pageflip';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlipbookProps {
  pages: string[];
  isLandscape: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVBAR_H = 64;
const PADDING  = 16;

function getControlsH(screenIsLandscape: boolean) {
  // compact controls on landscape mobile to maximise book height
  return screenIsLandscape ? 52 : 88;
}

// ─── Hook: Screen orientation (physical, not PDF orientation) ─────────────────
function useScreenLandscape() {
  const [ls, setLs] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const update = () => setLs(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return ls;
}

// ─── Hook: Measure available viewport for the book stage ─────────────────────
function useBookDimensions(isLandscape: boolean) {
  const [dims, setDims] = useState({ width: 300, height: 420 });

  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const screenLandscape = vw > vh;
      const controlsH = getControlsH(screenLandscape);

      const stageW = vw - PADDING;
      const stageH = vh - NAVBAR_H - controlsH - PADDING;

      let w: number, h: number;

      if (isLandscape) {
        // PDF page is A4 landscape: ratio 1.41 : 1
        if (stageW / stageH > 1.41) {
          h = stageH; w = Math.round(h * 1.41);
        } else {
          w = stageW; h = Math.round(w / 1.41);
        }
      } else {
        // PDF page is A4 portrait: ratio 1 : 1.41
        if (stageW / stageH > 1 / 1.41) {
          h = stageH; w = Math.round(h / 1.41);
        } else {
          w = stageW; h = Math.round(w * 1.41);
        }
      }

      setDims({ width: Math.max(w, 100), height: Math.max(h, 120) });
    }

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isLandscape]);

  return dims;
}

// ─── Hook: Pinch-to-Zoom ──────────────────────────────────────────────────────
function usePinchZoom(minScale = 1, maxScale = 4) {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [isPinching, setIsPinching] = useState(false);
  const lastDist = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDistance = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      lastDist.current = getDistance(e.touches[0], e.touches[1]);
      setIsPinching(true);
      // Stop the event reaching react-pageflip so it won't trigger a flip
      e.stopPropagation();
    }
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && lastDist.current !== null) {
        e.preventDefault();
        e.stopPropagation();           // ← prevent flip while pinching
        const dist = getDistance(e.touches[0], e.touches[1]);
        const delta = dist / lastDist.current;
        lastDist.current = dist;
        setScale((s) => Math.min(maxScale, Math.max(minScale, s * delta)));

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          setOrigin({
            x: ((mx - rect.left) / rect.width) * 100,
            y: ((my - rect.top) / rect.height) * 100,
          });
        }
      }
    },
    [maxScale, minScale]
  );

  const onTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      lastDist.current = null;
      setIsPinching(false);
    }
  }, []);

  const resetZoom = () => { setScale(1); setIsPinching(false); };

  return { scale, origin, isPinching, containerRef, onTouchStart, onTouchMove, onTouchEnd, resetZoom };
}

// ─── Flip Sound (Web Audio API) ───────────────────────────────────────────────
function playFlipSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.35;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    setTimeout(() => ctx.close(), 500);
  } catch { /* silent fail */ }
}

// ─── Page Component ───────────────────────────────────────────────────────────
const Page = React.forwardRef<
  HTMLDivElement,
  { image: string; index: number; total: number }
>(({ image, index, total }, ref) => (
  <div
    ref={ref}
    className="relative bg-[#faf8f3] w-full h-full overflow-hidden"
    style={{ boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.06)' }}
  >
    <img
      src={image}
      alt={`Page ${index + 1}`}
      draggable={false}
      className="w-full h-full object-contain pointer-events-none select-none"
    />
    <span
      className="absolute bottom-2 text-[10px] font-medium tracking-widest text-gray-400"
      style={{ [index % 2 === 0 ? 'right' : 'left']: '12px' }}
    >
      {index + 1} / {total}
    </span>
  </div>
));
Page.displayName = 'Page';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Flipbook({ pages, isLandscape }: FlipbookProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const screenLandscape = useScreenLandscape();
  const controlsH = getControlsH(screenLandscape);

  const { width: bookW, height: bookH } = useBookDimensions(isLandscape);
  const { scale, origin, isPinching, containerRef, onTouchStart, onTouchMove, onTouchEnd, resetZoom } =
    usePinchZoom(1, 4);

  const totalPages = pages.length;
  const goNext = () => flipBookRef.current?.pageFlip().flipNext();
  const goPrev = () => flipBookRef.current?.pageFlip().flipPrev();

  const handleFlip = (e: any) => {
    setCurrentPage(e.data);
    setIsFlipping(false);
    playFlipSound();
  };

  if (pages.length === 0) return null;

  const progressPercent = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0;
  // On landscape mobile, skip the navbar offset (public reader has no navbar)
  const topPad = screenLandscape ? 4 : NAVBAR_H + 4;

  return (
    <div
      className="w-full flex flex-col items-center justify-between select-none"
      style={{
        height: '100dvh',
        background: 'radial-gradient(ellipse at 60% 40%, #e8e0d5 0%, #d4c9b8 100%)',
        paddingTop: topPad,
      }}
    >
      {/* ── Book Stage ─────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          // 'none' during pinch so browser doesn't scroll/pan; 'pan-y' otherwise for normal scroll
          touchAction: isPinching ? 'none' : 'pan-y',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: isFlipping ? 'none' : 'transform 0.15s ease-out',
            willChange: 'transform',
          }}
        >
          <div
            style={{
              filter: 'drop-shadow(0 20px 40px rgba(80,60,40,0.35)) drop-shadow(0 4px 10px rgba(80,60,40,0.2))',
            }}
          >
            {/* @ts-ignore */}
            <HTMLFlipBook
              ref={flipBookRef}
              width={bookW}
              height={bookH}
              size="fixed"
              usePortrait={true}
              startPage={0}
              drawShadow={true}
              flippingTime={700}
              showCover={true}
              // Disable flipbook's own touch handling while pinching so it can't fire a flip
              mobileScrollSupport={!isPinching}
              onFlip={handleFlip}
              onChangeState={(s: any) => { if (s.data === 'flipping') setIsFlipping(true); }}
            >
              {pages.map((image, index) => (
                // @ts-ignore
                <Page key={index} image={image} index={index} total={totalPages} />
              ))}
            </HTMLFlipBook>
          </div>
        </div>
      </div>

      {/* ── Controls Bar (compact on landscape mobile) ─────── */}
      <div
        className="w-full flex flex-col items-center justify-center gap-1.5 px-4"
        style={{ height: controlsH, paddingBottom: screenLandscape ? 4 : 12 }}
      >
        {/* Progress bar */}
        <div className="w-full max-w-md h-[3px] rounded-full bg-black/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-700/60 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            aria-label="Previous page"
            className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 flex items-center justify-center text-amber-900 shadow-md disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all duration-150 hover:bg-white/90"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex flex-col items-center min-w-[60px]">
            {!screenLandscape && (
              <span className="text-[10px] font-semibold tracking-widest text-amber-900/60 uppercase">Page</span>
            )}
            <span className="text-base font-bold text-amber-950 leading-tight tabular-nums">
              {currentPage + 1}
              <span className="text-xs font-normal text-amber-900/50"> / {totalPages}</span>
            </span>
          </div>

          <button
            onClick={goNext}
            disabled={currentPage >= totalPages - 1}
            aria-label="Next page"
            className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 flex items-center justify-center text-amber-900 shadow-md disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all duration-150 hover:bg-white/90"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {scale > 1 && (
            <button
              onClick={resetZoom}
              aria-label="Reset zoom"
              className="w-10 h-10 rounded-full bg-amber-700/80 backdrop-blur-sm border border-amber-600/50 flex items-center justify-center text-white shadow-md active:scale-95 transition-all duration-150 hover:bg-amber-700"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2 7.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 0 0-11 0Zm5-2v4m-2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {!screenLandscape && (
          <p className="text-[10px] tracking-widest text-amber-900/40 uppercase font-medium">
            Pinch to zoom • Tap corners to flip
          </p>
        )}
      </div>
    </div>
  );
}