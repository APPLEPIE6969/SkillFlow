import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// THE FULL LIST (Restored & Updated)
const MODELS_TO_TRY = [
  // --- TIER 1: The Best & Newest (2026 Flagships) ---
  "gemini-3-flash-preview",           
  "gemini-2.5-flash",         
  "gemini-2.5-flash-lite",    
  
  // --- TIER 2: The Gemma 3 Series (Great for text, might skip on images) ---
  "gemma-3-27b",              
  "gemma-3-12b",              
  "gemma-3-4b",               
  "gemma-3-2b",               
  "gemma-3-1b",               
  
  // --- TIER 3: Safety Nets ---
  "gemini-robotics-er-1.5-preview",
  "gemini-1.5-flash",         
];

export async function POST(req: Request) {
  try {
    const { topic, level, language, fileData, mimeType } = await req.json();
    const cleanTopic = topic ? topic.trim().toLowerCase() : "uploaded-file";
    
    // Create a unique cache key that includes the LANGUAGE
    // Example: "quantum-physics-beginner-dutch"
    const cacheKey = `${cleanTopic.replace(/\s+/g, '-')}-${level.toLowerCase()}-${language.toLowerCase()}`;

    // =========================================================
    // 1. CHECK CACHE (Only if NO file is uploaded)
    // =========================================================
    // We never cache file uploads because every picture is different
    if (!fileData) {
      const { data: cached } = await supabase
        .from("topic_cache")
        .select("content")
        .eq("topic_slug", cacheKey)
        .single();

      if (cached) {
        console.log(`⚡ CACHE HIT: Served "${cleanTopic}" in ${language}`);
        return NextResponse.json(cached.content);
      }
    }

    // =========================================================
    // 2. PREPARE THE PROMPT (Vision + Language)
    // =========================================================
    let systemPrompt = `
      You are an expert tutor.
      TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
      STUDENT LEVEL: ${level}.
      
      Task: Create a lesson about: "${topic}".
      
      INSTRUCTIONS:
      1. If an image/PDF is attached, analyze it thoroughly. Solve math problems step-by-step. Translate text if needed.
      2. If no file, explain the topic clearly.
      3. Return strictly valid JSON (no markdown) with this schema:
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

    // Construct the data payload for the AI
    const parts: any[] = [{ text: systemPrompt }];

    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType || "image/jpeg",
        },
      });
      console.log("📸 Vision Mode Activated: File attached.");
    }

    // =========================================================
    // 3. ASK AI (With The Waterfall Fallback)
    // =========================================================
    let finalResult = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        // Optimization: Skip Gemma models if image is attached (they often fail on vision)
        if (fileData && modelName.includes("gemma")) {
          continue; 
        }

        const model = genAI.getGenerativeModel({ model: modelName });
        
        // 10 Second Timeout Race
        const result = await Promise.race([
          model.generateContent({ contents: [{ role: "user", parts: parts }] }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
        ]) as any;
        
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        
        finalResult = JSON.parse(cleanJson);
        console.log(`✅ Success with model: ${modelName}`);
        break; // Stop loop on success

      } catch (error) {
        console.warn(`⚠️ Model ${modelName} failed/skipped. Switching...`);
      }
    }

    if (!finalResult) throw new Error("All AI models are busy. Please try again.");

    // =========================================================
    // 4. SAVE TO CACHE (Only if NO file was used)
    // =========================================================
    if (!fileData) {
      await supabase.from("topic_cache").insert({
        topic_slug: cacheKey,
        content: finalResult
      });
    }

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
