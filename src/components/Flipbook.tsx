"use client";
import React, { useRef, useState, useCallback, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';

interface FlipbookProps {
  pages: string[];
  isLandscape: boolean;
}

const NAVBAR_H = 64;
const PADDING  = 16;

function getControlsH(screenIsLandscape: boolean) {
  return screenIsLandscape ? 52 : 92;
}

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
        if (stageW / stageH > 1.41) { h = stageH; w = Math.round(h * 1.41); }
        else                         { w = stageW; h = Math.round(w / 1.41); }
      } else {
        if (stageW / stageH > 1 / 1.41) { h = stageH; w = Math.round(h / 1.41); }
        else                              { w = stageW; h = Math.round(w * 1.41); }
      }
      setDims({ width: Math.max(w, 100), height: Math.max(h, 120) });
    }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isLandscape]);
  return dims;
}

function useZoom(min = 1, max = 3, step = 0.4) {
  const [scale, setScale] = useState(1);
  const zoomIn  = useCallback(() => setScale(s => Math.min(max,  Math.round((s + step) * 10) / 10)), [max, step]);
  const zoomOut = useCallback(() => setScale(s => Math.max(min,  Math.round((s - step) * 10) / 10)), [min, step]);
  const reset   = useCallback(() => setScale(1), []);
  return { scale, zoomIn, zoomOut, reset, canIn: scale < max, canOut: scale > min };
}

function playFlipSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.35;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = 0.4;
    src.connect(gain); gain.connect(ctx.destination); src.start();
    setTimeout(() => ctx.close(), 500);
  } catch { /* silent */ }
}

const Page = React.forwardRef<HTMLDivElement, { image: string; index: number; total: number }>(
  ({ image, index, total }, ref) => (
    <div ref={ref} className="relative bg-[#faf8f3] w-full h-full overflow-hidden"
      style={{ boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.06)' }}>
      <img src={image} alt={`Page ${index + 1}`} draggable={false}
        className="w-full h-full object-contain pointer-events-none select-none" />
      <span className="absolute bottom-2 text-[10px] font-medium tracking-widest text-gray-400"
        style={{ [index % 2 === 0 ? 'right' : 'left']: '12px' }}>
        {index + 1} / {total}
      </span>
    </div>
  )
);
Page.displayName = 'Page';

const IconZoomIn = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M7 5v4M5 7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconZoomOut = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M5 7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

function CtrlBtn({ onClick, disabled, label, children }: {
  onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 flex items-center justify-center text-amber-900 shadow-md disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all duration-150 hover:bg-white/90">
      {children}
    </button>
  );
}

export default function Flipbook({ pages, isLandscape }: FlipbookProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const screenLandscape = useScreenLandscape();
  const controlsH = getControlsH(screenLandscape);
  const { width: bookW, height: bookH } = useBookDimensions(isLandscape);
  const { scale, zoomIn, zoomOut, reset, canIn, canOut } = useZoom();

  const totalPages = pages.length;
  const goNext = () => flipBookRef.current?.pageFlip().flipNext();
  const goPrev = () => flipBookRef.current?.pageFlip().flipPrev();

  const handleFlip = (e: any) => {
    setCurrentPage(e.data);
    setIsFlipping(false);
    playFlipSound();
  };

  if (!pages.length) return null;

  const progress = totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0;
  const topPad = screenLandscape ? 4 : NAVBAR_H + 4;
  const isZoomed = scale > 1;

  return (
    <>
      {/* Scrollbar style injection */}
      <style>{`
        .flipbook-stage::-webkit-scrollbar { width: 6px; height: 6px; }
        .flipbook-stage::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 99px; }
        .flipbook-stage::-webkit-scrollbar-thumb { background: rgba(146,96,54,0.45); border-radius: 99px; }
        .flipbook-stage::-webkit-scrollbar-thumb:hover { background: rgba(146,96,54,0.7); }
        .flipbook-stage::-webkit-scrollbar-corner { background: transparent; }
      `}</style>

      <div
        className="w-full flex flex-col items-center justify-between select-none"
        style={{
          height: '100dvh',
          background: 'radial-gradient(ellipse at 60% 40%, #e8e0d5 0%, #d4c9b8 100%)',
          paddingTop: topPad,
        }}
      >
        {/* ── Book Stage ── */}
        <div
          className="flipbook-stage flex-1 w-full"
          style={{
            overflow: isZoomed ? 'auto' : 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(146,96,54,0.45) rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: isZoomed ? 'flex-start' : 'center',
            justifyContent: isZoomed ? 'flex-start' : 'center',
          }}
        >
          {/* Scroll container: must be at least as large as scaled book */}
          <div
            style={{
              minWidth:  isZoomed ? bookW  * scale + 48 : '100%',
              minHeight: isZoomed ? bookH  * scale + 48 : '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isZoomed ? 24 : 0,
              boxSizing: 'border-box' as const,
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: isFlipping ? 'none' : 'transform 0.2s ease-out',
                willChange: 'transform',
                flexShrink: 0,
              }}
            >
              <div style={{ filter: 'drop-shadow(0 20px 40px rgba(80,60,40,0.35)) drop-shadow(0 4px 10px rgba(80,60,40,0.2))' }}>
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
                  mobileScrollSupport={true}
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
        </div>

        {/* ── Controls Bar ── */}
        <div
          className="w-full flex flex-col items-center justify-center gap-1.5 px-4"
          style={{ height: controlsH, paddingBottom: screenLandscape ? 4 : 10 }}
        >
          {/* Progress bar */}
          <div className="w-full max-w-md h-[3px] rounded-full bg-black/10 overflow-hidden">
            <div className="h-full rounded-full bg-amber-700/60 transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2.5">
            <CtrlBtn onClick={goPrev} disabled={currentPage === 0} label="หน้าก่อนหน้า">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </CtrlBtn>

            <div className="flex flex-col items-center min-w-[52px]">
              {!screenLandscape && (
                <span className="text-[9px] font-semibold tracking-widest text-amber-900/50 uppercase">Page</span>
              )}
              <span className="text-sm font-bold text-amber-950 leading-tight tabular-nums">
                {currentPage + 1}
                <span className="text-xs font-normal text-amber-900/50"> / {totalPages}</span>
              </span>
            </div>

            <CtrlBtn onClick={goNext} disabled={currentPage >= totalPages - 1} label="หน้าถัดไป">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </CtrlBtn>

            <div className="w-px h-6 bg-amber-900/20 mx-1" />

            <CtrlBtn onClick={zoomOut} disabled={!canOut} label="ย่อ">
              <IconZoomOut />
            </CtrlBtn>

            <button
              onClick={reset}
              disabled={scale === 1}
              className="min-w-[44px] h-8 px-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/80 text-[11px] font-bold text-amber-900 shadow-sm disabled:opacity-50 active:scale-95 transition-all"
              aria-label="รีเซ็ตการซูม"
            >
              {scale === 1 ? '100%' : `${Math.round(scale * 100)}%`}
            </button>

            <CtrlBtn onClick={zoomIn} disabled={!canIn} label="ขยาย">
              <IconZoomIn />
            </CtrlBtn>
          </div>

          {!screenLandscape && (
            <p className="text-[10px] tracking-widest text-amber-900/40 uppercase font-medium">
              กดปุ่ม 🔍 ขยาย • แตะมุมหน้าเพื่อพลิก
            </p>
          )}
        </div>
      </div>
    </>
  );
}