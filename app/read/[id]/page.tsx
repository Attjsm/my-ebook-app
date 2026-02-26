"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import dynamic from 'next/dynamic';

// โหลด Flipbook แบบ Client-only
const Flipbook = dynamic(() => import('@/src/components/Flipbook'), { 
  ssr: false,
  loading: () => <div className="text-white">กำลังเตรียมหน้ากระดาษ...</div>
});

export default function PublicReadPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ ใช้ React.use() เพื่อดึงค่า id จาก Promise params (มาตรฐาน Next.js 15-16)
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        // ✅ ดึงข้อมูลจาก Supabase โดยใช้ id ที่ได้จาก params
        const { data, error: dbError } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError || !data) {
          console.error("Supabase Error:", dbError);
          setError(true);
        } else {
          setBookData(data);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBook();
  }, [id]);

  // 1. หน้าจอขณะเกิดข้อผิดพลาด
  if (error) {
    return (
      <div className="h-screen w-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">ไม่พบหนังสือเล่มนี้</h1>
        <p className="text-slate-500">ลิงก์อาจไม่ถูกต้อง หรือหนังสือถูกลบออกจากระบบแล้ว</p>
        <a href="/" className="mt-6 text-blue-600 font-bold hover:underline">กลับไปหน้าหลัก</a>
      </div>
    );
  }

  // 2. หน้าจอขณะกำลังโหลด
  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse text-slate-400">กำลังเปิดหนังสือ...</p>
      </div>
    );
  }

  // 3. หน้าจอแสดงผลหนังสือ (Flipbook)
  return (
    <main className="h-screen w-screen bg-slate-950 overflow-hidden flex items-center justify-center">
      {/* ใส่พื้นหลังสีเข้ม (Dark Mode) เพื่อให้หนังสือเด่นขึ้น */}
      <div className="w-full h-full p-2 md:p-10">
        <Flipbook 
          pages={bookData.pages} 
          isLandscape={bookData.is_landscape} 
        />
      </div>

      {/* แถบแจ้งชื่อหนังสือด้านบน (Optional) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
        <p className="text-white text-xs font-medium tracking-wide">
          📖 {bookData.title || "Digital E-book"}
        </p>
      </div>
    </main>
  );
}