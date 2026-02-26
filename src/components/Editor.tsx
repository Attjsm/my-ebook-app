"use client";
import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';

// ตั้งค่า Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function Editor({ 
  onConverted, 
  onOrientationChange 
}: { 
  onConverted: (images: string[]) => void,
  onOrientationChange: (isLandscape: boolean) => void 
}) {

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const handleOrientation = (landscape: boolean) => {
    setIsLandscape(landscape);
    onOrientationChange(landscape);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          await page.render({ canvasContext: context, viewport }).promise;
          pageImages.push(canvas.toDataURL('image/webp', 0.8));
        }

        setProgress(Math.round((i / pdf.numPages) * 100));
      }

      setPdfPages(pageImages);
      onConverted(pageImages);

    } catch (error) {
      alert("ไม่สามารถอ่านไฟล์ PDF ได้");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // ===============================
  // 🔗 ฟังก์ชันสร้างลิงก์แชร์
  // ===============================
  const handleShare = async () => {
    if (pdfPages.length === 0) {
      alert("โปรดอัปโหลด PDF ก่อนแชร์ครับ");
      return;
    }

    setIsSharing(true);

    try {
      const bookId = crypto.randomUUID();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < pdfPages.length; i++) {
        const response = await fetch(pdfPages[i]);
        const blob = await response.blob();
        const fileName = `${bookId}/page-${i}.webp`;

        const { error } = await supabase.storage
          .from('ebooks')
          .upload(fileName, blob);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('ebooks')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: dbError } = await supabase
        .from('books')
        .insert([{ 
          id: bookId, 
          pages: uploadedUrls, 
          is_landscape: isLandscape,
          title: "My Digital E-book"
        }]);

      if (dbError) throw dbError;

      const shareUrl = `${window.location.origin}/read/${bookId}`;
      window.prompt("สร้างลิงก์สำเร็จ! คัดลอกลิงก์นี้ไปส่งให้เพื่อนได้เลย:", shareUrl);

    } catch (err: any) {
      alert("แชร์ไม่สำเร็จ: " + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="p-4 bg-white border-b shadow-md flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
      
      {/* ส่วนชื่อ */}
      <div className="flex flex-col">
        <h1 className="text-xl font-black text-blue-900 leading-none">
          PDF Flipbook
        </h1>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
          Digital Creator
        </span>
      </div>

      {/* ปรับแนว */}
      <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
        <button 
          onClick={() => handleOrientation(false)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            !isLandscape 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Portrait (แนวตั้ง)
        </button>

        <button 
          onClick={() => handleOrientation(true)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            isLandscape 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Landscape (แนวนอน)
        </button>
      </div>

      {/* ปุ่มอัปโหลด + แชร์ */}
      <div className="flex items-center gap-3">
        {loading && (
          <div className="text-xs font-bold text-blue-600 animate-pulse">
            Processing {progress}%
          </div>
        )}

        <label className={`
          cursor-pointer px-6 py-2.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all
          ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
        `}>
          {loading ? "กำลังสร้าง..." : "📂 เลือกไฟล์ PDF"}
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            onChange={handleFileUpload} 
            disabled={loading} 
          />
        </label>

        <button 
          onClick={handleShare}
          disabled={isSharing || pdfPages.length === 0}
          className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all ${
            isSharing 
              ? 'bg-gray-400' 
              : 'bg-green-600 hover:bg-green-700 active:scale-95'
          }`}
        >
          {isSharing ? "กำลังสร้างลิงก์..." : "🔗 สร้างลิงก์แชร์"}
        </button>
      </div>
    </div>
  );
}