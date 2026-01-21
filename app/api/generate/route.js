import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { topic, level } = await req.json();
    const cleanTopic = topic.trim().toLowerCase();

    // 1. CHECK CACHE (Save money)
    const { data: cached } = await supabase
      .from("topic_cache")
      .select("content")
      .eq("topic", cleanTopic)
      .eq("level", level)
      .single();

    if (cached) {
      return NextResponse.json(cached.content);
    }

    // 2. ASK GOOGLE AI (If not in cache)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are a tutor. Create a lesson on "${cleanTopic}" for a "${level}" student.
      Return strictly JSON format:
      {
        "title": "Topic Title",
        "explanation": "2 paragraphs explaining the concept simply.",
        "key_points": ["Point 1", "Point 2", "Point 3"],
        "quiz_question": "A multiple choice question",
        "options": ["A", "B", "C"],
        "correct_answer": "A"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean markdown if AI adds it
    const jsonText = text.replace(/```json|```/g, "").trim();
    const lessonData = JSON.parse(jsonText);

    // 3. SAVE TO CACHE
    await supabase.from("topic_cache").insert({
      topic: cleanTopic,
      level: level,
      content: lessonData
    });

    return NextResponse.json(lessonData);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}