"use client";
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Editor from '../src/components/Editor';

// ✅ แก้ปัญหา DOMMatrix: ใช้ dynamic import และปิด SSR (Server Side Rendering) ให้เด็ดขาด
const Flipbook = dynamic(() => import('../src/components/Flipbook'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-200">
      <p className="font-bold text-blue-600 animate-pulse">กำลังเตรียมระบบแสดงผล...</p>
    </div>
  )
});

export default function Home() {
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isLandscape, setIsLandscape] = useState(false);

  // ✅ แก้ปัญหาอัปโหลดต่อเนื่อง: สร้าง Unique Key ทุกครั้งที่มีการอัปโหลดไฟล์ใหม่
  // เพื่อบังคับให้ Flipbook รีเซ็ตตัวเองและแสดงผลเล่มใหม่ทันที
  const flipbookKey = useMemo(() => {
    return pdfPages.length > 0 ? `book-${pdfPages.length}-${isLandscape}` : 'empty';
  }, [pdfPages, isLandscape]);

  return (
    // ✅ แก้ปัญหา Header บัง: ใช้ h-screen (เต็มจอ) และ flex-col เพื่อแบ่งพื้นที่
    <main className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      
      {/* 1. ส่วน Header (Editor): ยึดความสูงตามเนื้อหาจริง (flex-none) */}
      <header className="flex-none z-50 shadow-sm">
        <Editor 
          onConverted={(images) => setPdfPages(images)} 
          onOrientationChange={(landscape) => setIsLandscape(landscape)} 
            currentPages={pdfPages}
            isLandscape={isLandscape}
        />
      </header>
      
      {/* 2. ส่วนแสดงผล E-book: ใช้ flex-grow เพื่อให้ยืดเต็มพื้นที่ที่เหลือจาก Header */}
      {/* <section className="flex-grow w-full relative bg-slate-200 overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-8"> */}
      <section className="grow w-full relative bg-slate-200 overflow-hidden flex items-center justify-center">
        {pdfPages.length > 0 ? (
         
          <div className="w-full h-full max-w-[1400px] flex items-center justify-center p-2">
            {/* ใส่ key เพื่อให้ React ทำลายตัวเก่าและสร้างตัวใหม่เมื่ออัปโหลดไฟล์ใหม่ */}
            <Flipbook 
              key={flipbookKey} 
              pages={pdfPages} 
              isLandscape={isLandscape} 
            />
          </div>
        ) : (
          // หน้าจอว่างเมื่อยังไม่ได้อัปโหลด
          <div className="text-center p-10 border-4 border-dashed border-slate-300 rounded-3xl">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-xl font-bold text-slate-500">พร้อมสร้าง E-book ของคุณแล้ว</h2>
            <p className="text-slate-400">กรุณาเลือกไฟล์ PDF จากเมนูด้านบน</p>
          </div>
        )}
      </section>

      {/* 3. ส่วน Footer (ถ้ามี): แสดงสถานะเล็กน้อยด้านล่างสุด */}
      <footer className="flex-none bg-white py-1 px-4 border-t text-[10px] text-gray-400 flex justify-between">
        <span>Status: {pdfPages.length > 0 ? `Loaded ${pdfPages.length} pages` : 'Ready'}</span>
        <span>© 2026 Digital Flipbook Creator – Developed by Sattawat JSM</span>
      </footer>

    </main>
  );
}