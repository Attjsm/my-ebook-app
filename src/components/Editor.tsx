"use client";
import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Orientation Toggle ───────────────────────────────────────────────────────
function OrientationToggle({ isLandscape, onChange }: { isLandscape: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 w-full">
      <button
        onClick={() => onChange(false)}
        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          !isLandscape ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Portrait (แนวตั้ง)
      </button>
      <button
        onClick={() => onChange(true)}
        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          isLandscape ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Landscape (แนวนอน)
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Editor({
  onConverted,
  onOrientationChange,
  currentPages,
  isLandscape,
}: {
  onConverted: (images: string[]) => void;
  onOrientationChange: (isLandscape: boolean) => void;
  currentPages: string[];
  isLandscape: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasPages = pdfPages.length > 0;

  // ── PDF conversion ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSheetOpen(false);
    setLoading(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const pageImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport } as any).promise;
          pageImages.push(canvas.toDataURL('image/webp', 0.8));
        }
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
      setPdfPages(pageImages);
      onConverted(pageImages);
    } catch {
      alert('ไม่สามารถอ่านไฟล์ PDF ได้');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!hasPages) { alert('โปรดอัปโหลด PDF ก่อนแชร์ครับ'); return; }
    setSheetOpen(false);
    setIsSharing(true);

    try {
      const bookId = crypto.randomUUID();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < pdfPages.length; i++) {
        const blob = await (await fetch(pdfPages[i])).blob();
        const fileName = `${bookId}/page-${i}.webp`;
        const { error } = await supabase.storage.from('ebooks').upload(fileName, blob);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('ebooks').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: dbError } = await supabase.from('books').insert([{
        id: bookId, pages: uploadedUrls, is_landscape: isLandscape, title: 'My Digital E-book',
      }]);
      if (dbError) throw dbError;

      const shareUrl = `${window.location.origin}/read/${bookId}`;
      window.prompt('สร้างลิงก์สำเร็จ! คัดลอกลิงก์นี้ไปส่งให้เพื่อนได้เลย:', shareUrl);
    } catch (err: any) {
      alert('แชร์ไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          DESKTOP navbar (md+)
      ══════════════════════════════════════════════════════ */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm sticky top-0 z-50">
        <div>
          <p className="text-lg font-black text-blue-900 leading-none">PDF Flipbook</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Digital Creator</p>
        </div>

        <OrientationToggle isLandscape={isLandscape} onChange={onOrientationChange} />

        <div className="flex items-center gap-3">
          {loading && <span className="text-xs font-bold text-blue-500 animate-pulse">Processing {progress}%</span>}

          <label className={`flex items-center gap-2 cursor-pointer px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow transition-all ${loading ? 'bg-gray-300 pointer-events-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}>
            <IconUpload /><span>เลือกไฟล์ PDF</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>

          <button
            onClick={handleShare}
            disabled={isSharing || !hasPages}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow transition-all ${isSharing || !hasPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
          >
            <IconShare /><span>{isSharing ? 'กำลังสร้าง...' : 'สร้างลิงก์แชร์'}</span>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          MOBILE top bar — slim 48px, won't cover content
      ══════════════════════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between px-4 h-12">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z"/>
                <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-sm font-black text-blue-900">PDF Flipbook</span>
          </div>

          {/* Centre status */}
          <div className="flex-1 flex justify-center">
            {loading ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-bold text-blue-500">{progress}%</span>
              </div>
            ) : hasPages ? (
              <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-100">
                ✓ {pdfPages.length} หน้า
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">ยังไม่ได้เลือกไฟล์</span>
            )}
          </div>

          {/* Menu button */}
          <button
            onClick={() => setSheetOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 active:scale-90 transition-all"
            aria-label="เปิดเมนู"
          >
            <IconMenu />
          </button>
        </div>

        {/* Progress bar inline (slim, no extra height) */}
        {loading && (
          <div className="h-0.5 bg-blue-100 mx-4 mb-1 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════
          MOBILE Bottom Sheet overlay
      ══════════════════════════════════════════════════════ */}

      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${sheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSheetOpen(false)}
      />

      {/* Sheet panel */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${sheetOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">ตัวเลือก</h2>
          <button
            onClick={() => setSheetOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:scale-90 transition-all"
          >
            <IconClose />
          </button>
        </div>

        {/* Sheet body */}
        <div className="px-5 py-5 flex flex-col gap-5 pb-10">

          {/* Orientation */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">รูปแบบการแสดงผล</p>
            <OrientationToggle isLandscape={isLandscape} onChange={onOrientationChange} />
          </div>

          <div className="border-t border-gray-100" />

          {/* Upload button */}
          <label className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-sm shadow-lg transition-all select-none ${loading ? 'bg-blue-300 pointer-events-none' : 'bg-blue-600 active:scale-95 cursor-pointer'}`}>
            <IconUpload />
            <span>{loading ? `กำลังแปลง ${progress}%` : '📂 เลือกไฟล์ PDF'}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={isSharing || !hasPages}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-sm shadow-lg transition-all ${isSharing || !hasPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 active:scale-95'}`}
          >
            <IconShare />
            <span>{isSharing ? '⏳ กำลังสร้างลิงก์...' : '🔗 สร้างลิงก์แชร์'}</span>
          </button>

          {!hasPages && (
            <p className="text-center text-xs text-gray-400 -mt-2">กรุณาอัปโหลด PDF ก่อนสร้างลิงก์แชร์</p>
          )}
        </div>
      </div>
    </>
  );
}