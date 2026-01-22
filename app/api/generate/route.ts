import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

<<<<<<< HEAD
// 1. SETUP SUPABASE
=======
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

<<<<<<< HEAD
// 2. SETUP API KEYS (Load Balancing)
const API_KEYS = [
  process.env.GOOGLE_API_KEY,  // Main Key
  process.env.QUIZ,            // Secondary Key
].filter(Boolean) as string[]; 

const getRandomKey = () => {
  const randomIndex = Math.floor(Math.random() * API_KEYS.length);
  return API_KEYS[randomIndex];
};

// 3. THE CORRECTED MODEL LIST
const MODELS_TO_TRY = [
  // --- TIER 1: The Best & Newest ---
  "gemini-3-flash-preview",   // The specific model you requested
  "gemini-2.5-flash",         
  "gemini-2.5-flash-lite",    
  
  // --- TIER 2: The Gemma 3 Series (Great for text) ---
=======
// THE FULL LIST (Restored & Updated)
const MODELS_TO_TRY = [
  // --- TIER 1: The Best & Newest (2026 Flagships) ---
  "gemini-3-flash-preview",           
  "gemini-2.5-flash",         
  "gemini-2.5-flash-lite",    
  
  // --- TIER 2: The Gemma 3 Series (Great for text, might skip on images) ---
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
  "gemma-3-27b",              
  "gemma-3-12b",              
  "gemma-3-4b",               
  "gemma-3-2b",               
  "gemma-3-1b",               
  
<<<<<<< HEAD
  // --- TIER 3: Safety Nets & Robotics ---
=======
  // --- TIER 3: Safety Nets ---
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
  "gemini-robotics-er-1.5-preview",
  "gemini-1.5-flash",         
];

export async function POST(req: Request) {
  try {
    const { topic, level, language, fileData, mimeType } = await req.json();
    const cleanTopic = topic ? topic.trim().toLowerCase() : "uploaded-file";
    
<<<<<<< HEAD
    // Create cache key (Topic + Level + Language)
=======
    // Create a unique cache key that includes the LANGUAGE
    // Example: "quantum-physics-beginner-dutch"
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
    const cacheKey = `${cleanTopic.replace(/\s+/g, '-')}-${level.toLowerCase()}-${language.toLowerCase()}`;

    // =========================================================
    // 1. CHECK CACHE (Only if NO file is uploaded)
    // =========================================================
<<<<<<< HEAD
=======
    // We never cache file uploads because every picture is different
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
    if (!fileData) {
      const { data: cached } = await supabase
        .from("topic_cache")
        .select("content")
        .eq("topic_slug", cacheKey)
        .single();
<<<<<<< HEAD
      
      if (cached) {
        console.log(`⚡ CACHE HIT: Served "${cleanTopic}" from DB`);
=======

      if (cached) {
        console.log(`⚡ CACHE HIT: Served "${cleanTopic}" in ${language}`);
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
        return NextResponse.json(cached.content);
      }
    }

    // =========================================================
<<<<<<< HEAD
    // 2. PREPARE PROMPT
    // =========================================================
    const systemPrompt = `
      You are an expert tutor.
      TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
      STUDENT LEVEL: ${level}.
      TOPIC: "${topic}".
      
      INSTRUCTIONS:
      1. If an image/PDF is attached, analyze it thoroughly. Solve math problems step-by-step.
=======
    // 2. PREPARE THE PROMPT (Vision + Language)
    // =========================================================
    let systemPrompt = `
      You are an expert tutor.
      TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
      STUDENT LEVEL: ${level}.
      
      Task: Create a lesson about: "${topic}".
      
      INSTRUCTIONS:
      1. If an image/PDF is attached, analyze it thoroughly. Solve math problems step-by-step. Translate text if needed.
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
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

<<<<<<< HEAD
    const parts: any[] = [{ text: systemPrompt }];
=======
    // Construct the data payload for the AI
    const parts: any[] = [{ text: systemPrompt }];

>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType || "image/jpeg",
        },
      });
<<<<<<< HEAD
    }

    // =========================================================
    // 3. ASK AI (With Key Rotation + Model Fallback)
    // =========================================================
    let finalResult = null;
    let lastError = "";

    for (const modelName of MODELS_TO_TRY) {
      try {
        // SAFETY: Skip Gemma models if an image is attached (they often crash on vision)
=======
      console.log("📸 Vision Mode Activated: File attached.");
    }

    // =========================================================
    // 3. ASK AI (With The Waterfall Fallback)
    // =========================================================
    let finalResult = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        // Optimization: Skip Gemma models if image is attached (they often fail on vision)
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
        if (fileData && modelName.includes("gemma")) {
          continue; 
        }

<<<<<<< HEAD
        // ROTATION: Pick a random key for every attempt
        const activeKey = getRandomKey();
        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        // TIMEOUT: 10 second race to prevent hanging
=======
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // 10 Second Timeout Race
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13
        const result = await Promise.race([
          model.generateContent({ contents: [{ role: "user", parts: parts }] }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
        ]) as any;
        
        const response = await result.response;
<<<<<<< HEAD
        const text = response.text().replace(/```json|```/g, "").trim();
        
        finalResult = JSON.parse(text);
        console.log(`✅ Success | Model: ${modelName} | Key: ...${activeKey.slice(-4)}`);
        break; // Stop loop

      } catch (error: any) {
        console.warn(`⚠️ Model ${modelName} failed/skipped. Switching...`);
        lastError = error.message;
      }
    }

    if (!finalResult) throw new Error("System busy. Please try again. " + lastError);
=======
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
>>>>>>> 6cfae064c8fbd3fe1c2513dcd92d01900ca1ec13

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
