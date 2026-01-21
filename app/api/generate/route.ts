import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 1. SETUP CLIENTS
// We use the non-null assertion (!) because we know these exist in .env.local
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. THE ULTIMATE FALLBACK LIST
// The code tries these in order. If one hits a rate limit, it instantly tries the next.
const MODELS_TO_TRY = [
  // --- TIER 1: The Best & Newest (2026 Flagships) ---
  "gemini-3-flash",           // Your requested top priority
  "gemini-2.5-flash",         // High speed, high intelligence
  "gemini-2.5-flash-lite",    // Extremely fast, low latency
  
  // --- TIER 2: The Gemma 3 Series (Open Models, different quotas) ---
  "gemma-3-27b",              // Smartest Gemma
  "gemma-3-12b",              // Balanced
  "gemma-3-4b",               // Fast
  "gemma-3-2b",               // Very Fast
  "gemma-3-1b",               // Lightning Fast
  
  // --- TIER 3: Specialized & Legacy (Safety Nets) ---
  "gemini-robotics-er-1.5-preview",
  "gemini-1.5-flash",         // The old reliable backup
];

export async function POST(req: Request) {
  try {
    const { topic, level } = await req.json();
    const cleanTopic = topic.trim().toLowerCase();
    // Create a cache key like: "quantum-physics-beginner"
    const cacheKey = `${cleanTopic.replace(/\s+/g, '-')}-${level.toLowerCase()}`;

    // =========================================================
    // 1. CHECK DATABASE CACHE (Free & Instant)
    // =========================================================
    const { data: cached } = await supabase
      .from("topic_cache")
      .select("content")
      .eq("topic_slug", cacheKey)
      .single();

    if (cached) {
      console.log(`⚡ CACHE HIT: Served "${cleanTopic}" from database.`);
      return NextResponse.json(cached.content);
    }

    // =========================================================
    // 2. ASK AI (With "Waterfall" Fallback)
    // =========================================================
    let finalResult = null;
    let usedModel = "";

    const prompt = `
      Act as an expert tutor. Create a concise study lesson about "${cleanTopic}" for a student at "${level}" level.
      
      You must return STRICT JSON format (no markdown backticks). Structure:
      {
        "title": "A Catchy Title",
        "explanation": "A clear, 2-paragraph explanation.",
        "analogy": "A simple real-world analogy to help understand.",
        "key_points": ["Key Point 1", "Key Point 2", "Key Point 3"],
        "quiz_question": "A multiple choice question testing this concept.",
        "options": ["Option A", "Option B", "Option C"],
        "correct_answer": "Option A"
      }
    `;

    console.log(`🤖 New Topic: "${cleanTopic}". Starting AI Waterfall...`);

    // Loop through the models list
    for (const modelName of MODELS_TO_TRY) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Timeout race: If AI takes > 8 seconds, we kill it and try the next model
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
        ]) as any;

        const response = await result.response;
        const text = response.text();

        // Clean up JSON (remove ```json ... ``` wrappers if present)
        const cleanJson = text.replace(/```json|```/g, "").trim();
        finalResult = JSON.parse(cleanJson);
        usedModel = modelName;
        
        console.log(`✅ Success with model: ${modelName}`);
        break; // Stop the loop, we got the data!

      } catch (error) {
        // Just log a small warning and continue to the next model
        console.warn(`⚠️ Model ${modelName} failed or timed out. Switching...`);
      }
    }

    if (!finalResult) {
      throw new Error("All AI models are currently busy or out of credits. Please try again later.");
    }

    // =========================================================
    // 3. SAVE TO CACHE (Future users get this for free)
    // =========================================================
    const { error: saveError } = await supabase.from("topic_cache").insert({
      topic_slug: cacheKey,
      content: finalResult
    });

    if (saveError) console.error("Cache Save Error:", saveError.message);

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}