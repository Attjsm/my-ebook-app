import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    console.log("KEY:", process.env.OPENROUTER_API_KEY);
    console.log("🔗 กำลังส่งคำขอไปที่ OpenRouter API...");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "upstage/solar-pro-3:free",
        messages: [
          {
            role: "user",
            content: `เขียน E-book ภาษาไทยเกี่ยวกับ "${prompt}" ตอบเป็น JSON เท่านั้น`
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ebook-ai-generator"
        }
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("❌ ERROR DETAILS:", error.response?.data || error.message);
    return NextResponse.json(
      { error: "Generate failed" },
      { status: 500 }
    );
  }
}