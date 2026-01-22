import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MODELS_TO_TRY = [
  "gemini-1.5-flash", // Best for vision/files
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
];

export async function POST(req: Request) {
  try {
    const { topic, level, language, fileData, mimeType } = await req.json();
    const cleanTopic = topic.trim().toLowerCase();
    
    // Create a cache key (Include language in key!)
    // Note: We skip cache if a file is uploaded, because files are unique.
    const cacheKey = `${cleanTopic.replace(/\s+/g, '-')}-${level.toLowerCase()}-${language}`;

    // 1. CHECK CACHE (Only if NO file is uploaded)
    if (!fileData) {
      const { data: cached } = await supabase
        .from("topic_cache")
        .select("content")
        .eq("topic_slug", cacheKey)
        .single();

      if (cached) {
        return NextResponse.json(cached.content);
      }
    }

    // 2. ASK AI
    let finalResult = null;
    let systemPrompt = `
      You are an expert tutor.
      LANGUAGE: The student speaks ${language}. OUTPUT EVERYTHING IN ${language}.
      LEVEL: ${level} student.
      
      Task: Create a lesson about: "${topic}".
      
      If an image or PDF is attached, analyze it thoroughly and explain the concepts inside it.
      If it's a math problem, solve it step-by-step.
      If it's a text, summarize and explain it.

      Return strictly valid JSON (no markdown) with this schema:
      {
        "title": "Title in ${language}",
        "explanation": "Clear explanation in ${language}...",
        "analogy": "Analogy in ${language}...",
        "key_points": ["Point 1", "Point 2"],
        "quiz_question": "Question in ${language}",
        "options": ["Option A", "Option B"],
        "correct_answer": "Option A"
      }
    `;

    // Prepare content parts
    const parts: any[] = [{ text: systemPrompt }];

    // If file exists, add it to the prompt
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }

    // Loop through models
    for (const modelName of MODELS_TO_TRY) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent({
          contents: [{ role: "user", parts: parts }],
        });
        
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        finalResult = JSON.parse(cleanJson);
        break; 

      } catch (error) {
        console.warn(`Model ${modelName} failed. Switching...`);
      }
    }

    if (!finalResult) throw new Error("AI is busy.");

    // 3. SAVE TO CACHE (Only if NO file was used)
    if (!fileData) {
      await supabase.from("topic_cache").insert({
        topic_slug: cacheKey,
        content: finalResult
      });
    }

    return NextResponse.json(finalResult);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
