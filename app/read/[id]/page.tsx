"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import dynamic from 'next/dynamic';

const Flipbook = dynamic(() => import('@/src/components/Flipbook'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/60 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-200/60 text-sm">กำลังเตรียมหน้ากระดาษ...</p>
      </div>
    </div>
  ),
});

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      className="h-dvh w-screen flex flex-col items-center justify-center gap-5"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e1a14 0%, #0d0b08 100%)' }}
    >
      {/* Animated book icon */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-xl bg-amber-500/20 animate-ping" />
        <div className="relative w-16 h-16 bg-amber-900/40 rounded-xl border border-amber-700/40 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="#d97706" opacity=".8"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="#f59e0b" opacity=".6"/>
          </svg>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-amber-100 font-semibold text-base">กำลังเปิดหนังสือ</p>
        <p className="text-amber-200/40 text-xs tracking-wide">โปรดรอสักครู่...</p>
      </div>
      {/* Dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Error Screen ─────────────────────────────────────────────────────────────
function ErrorScreen() {
  return (
    <div
      className="h-dvh w-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e1a14 0%, #0d0b08 100%)' }}
    >
      <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-700/30 flex items-center justify-center text-3xl">
        📭
      </div>
      <div>
        <h1 className="text-xl font-bold text-white mb-1">ไม่พบหนังสือเล่มนี้</h1>
        <p className="text-amber-200/40 text-sm leading-relaxed">
          ลิงก์อาจไม่ถูกต้อง<br/>หรือหนังสือถูกลบออกจากระบบแล้ว
        </p>
      </div>
      <a
        href="/"
        className="mt-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors"
      >
        กลับหน้าหลัก
      </a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicReadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [titleVisible, setTitleVisible] = useState(true);

  // Auto-hide title bar after 3s
  useEffect(() => {
    if (!bookData) return;
    const t = setTimeout(() => setTitleVisible(false), 3000);
    return () => clearTimeout(t);
  }, [bookData]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();
        if (dbError || !data) setError(true);
        else setBookData(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen />;

  return (
    <main
      className="w-screen overflow-hidden"
      style={{
        height: '100dvh',
        background: 'radial-gradient(ellipse at 60% 40%, #e8e0d5 0%, #d4c9b8 100%)',
      }}
    >
      {/* Flipbook fills the whole screen — it manages its own padding/controls */}
      <Flipbook
        pages={bookData.pages}
        isLandscape={bookData.is_landscape}
      />

      {/* ── Floating title pill (fades after 3s, tap to show again) ── */}
      <button
        onClick={() => setTitleVisible(v => !v)}
        aria-label="Toggle title"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-500"
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: `translateX(-50%) translateY(${titleVisible ? '0' : '-8px'})`,
          pointerEvents: titleVisible ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <span className="text-base">📖</span>
          <p className="text-white text-xs font-medium tracking-wide max-w-[200px] truncate">
            {bookData.title || 'Digital E-book'}
          </p>
        </div>
      </button>

      {/* Tap-to-reveal hint (only shows after title is hidden) */}
      {!titleVisible && (
        <button
          onClick={() => setTitleVisible(true)}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-8 h-1.5 bg-black/20 rounded-full hover:bg-black/30 transition-colors"
          aria-label="Show title"
        />
      )}
    </main>
  );
}