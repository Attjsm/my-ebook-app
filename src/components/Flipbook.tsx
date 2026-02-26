"use client";
import React, { useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';

export default function Flipbook({ pages, isLandscape }: { pages: string[], isLandscape: boolean }) {
  const flipBookRef = useRef<any>(null);

  // ✅ ปรับอัตราส่วนให้เหมาะสม (สัดส่วนมาตรฐานกระดาษ A4/Letter)
  // แนวตั้ง 3:4.2 (ขยายความสูงเพิ่ม) | แวนอน 4.2:3 (ขยายความกว้างเพิ่ม)
  const width = isLandscape ? 400 : 300;
  const height = isLandscape ? 300 : 400; 

  const playFlipSound = () => {
    const audio = new Audio('https://assets.mixkit.co');
    audio.volume = 0.15;
    audio.play().catch(() => {});
  };

  if (pages.length === 0) return null;

  return (
    // ✅ ลด padding (p-1) เพื่อให้หนังสือเข้าใกล้ขอบจอมากขึ้น
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden p-1 sm:p-2">
      
      <div className="relative w-full h-full flex items-center justify-center">
        {/* @ts-ignore */}
        <HTMLFlipBook
          width={width}
          height={height}
          size="stretch"         // ✅ กลับมาใช้ stretch แต่คุมด้วย Container h-full
          minWidth={200}
          maxWidth={2000}
          minHeight={200}
          maxHeight={2000}
          
          usePortrait={!isLandscape}
          startPage={0}
          drawShadow={true}
          flippingTime={800}     // ปรับความเร็วการพลิกให้ดูพรีเมียมขึ้น
          showCover={true}
          mobileScrollSupport={true}
          onFlip={playFlipSound}
          className="shadow-[0_20px_50px_rgba(0,0,0,0.3)] mx-auto" // เพิ่มเงาให้ดูมีมิติ
          ref={flipBookRef}
        >
          {pages.map((image, index) => (
            <div key={index} className="bg-white flex items-center justify-center w-full h-full border-l border-gray-100">
              <img 
                src={image} 
                alt={`Page ${index + 1}`} 
                // ✅ ใช้ object-fill ถ้าต้องการให้เต็มกระดาษหนังสือ หรือ object-contain เพื่อความเป๊ะ
                className="w-full h-full object-contain pointer-events-none" 
              />
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      {/* แถบสถานะแบบจางๆ ไม่รบกวนสายตา */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/5 rounded-full text-[10px] text-gray-400 font-medium backdrop-blur-sm">
        {pages.length} Pages • Click corner to flip
      </div>
    </div>
  );
}