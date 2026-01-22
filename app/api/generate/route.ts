import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 1. SETUP SUPABASE
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. SETUP API KEYS (Load Balancing)
const API_KEYS = [
  process.env.GOOGLE_API_KEY,  // Main Key
  process.env.QUIZ,            // Secondary Key
].filter(Boolean) as string[]; 

const getRandomKey = () => {
  const randomIndex = Math.floor(Math.random() * API_KEYS.length);
  return API_KEYS[randomIndex];
};

// 3. THE COMPLETE MODEL LIST
const MODELS_TO_TRY = [
  "gemini-3-flash-preview",   
  "gemini-2.5-flash",         
  "gemini-2.5-flash-lite",    
  "gemma-3-27b",              
  "gemma-3-12b",              
  "gemma-3-4b",               
  "gemma-3-2b",               
  "gemma-3-1b",               
  "gemini-robotics-er-1.5-preview",
  "gemini-1.5-flash",         
];

export async function POST(req: Request) {
  try {
    const { topic, level, language, fileData, mimeType, mode } = await req.json(); // Added 'mode'
    const cleanTopic = topic ? topic.trim().toLowerCase() : "uploaded-file";
    
    // Create cache key (Topic + Level + Language + MODE)
    // We add the mode to the key so "gravity-quiz" is stored separately from "gravity-lesson"
    const cacheKey = `${cleanTopic.replace(/\s+/g, '-')}-${level.toLowerCase()}-${language.toLowerCase()}-${mode || 'lesson'}`;

    // =========================================================
    // 1. CHECK CACHE (Only if NO file is uploaded)
    // =========================================================
    if (!fileData) {
      const { data: cached } = await supabase
        .from("topic_cache")
        .select("content")
        .eq("topic_slug", cacheKey)
        .single();
      
      if (cached) {
        console.log(`⚡ CACHE HIT: Served "${cleanTopic}" (${mode}) from DB`);
        return NextResponse.json(cached.content);
      }
    }

    // =========================================================
    // 2. PREPARE PROMPT (Dynamic based on Mode)
    // =========================================================
    let systemPrompt = "";

    if (mode === "quiz") {
      // --- QUIZ MODE PROMPT ---
      systemPrompt = `
        You are an expert exam creator.
        TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
        STUDENT LEVEL: ${level}.
        TOPIC: "${topic}".
        
        INSTRUCTIONS:
        1. Create a Challenging 5-Question Quiz.
        2. If a file is attached, base questions on the file.
        3. Return strictly valid JSON (no markdown) with this schema:
        {
          "title": "Quiz Title in ${language}",
          "type": "quiz",
          "questions": [
            {
              "question": "Question 1 text...",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Option A"
            },
            ... (4 more questions)
          ]
        }
      `;
    } else {
      // --- LESSON MODE PROMPT (Existing) ---
      systemPrompt = `
        You are an expert tutor.
        TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
        STUDENT LEVEL: ${level}.
        TOPIC: "${topic}".
        
        INSTRUCTIONS:
        1. Explain the topic clearly.
        2. Return strictly valid JSON (no markdown) with this schema:
        {
          "title": "Lesson Title in ${language}",
          "type": "lesson",
          "explanation": "Clear explanation...",
          "analogy": "Analogy...",
          "key_points": ["Point 1", "Point 2"],
          "quiz_question": "Single practice question",
          "options": ["A", "B"],
          "correct_answer": "A"
        }
      `;
    }

    const parts: any[] = [{ text: systemPrompt }];
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }

    // =========================================================
    // 3. ASK AI
    // =========================================================
    let finalResult = null;
    let lastError = "";

    for (const modelName of MODELS_TO_TRY) {
      try {
        if (fileData && modelName.includes("gemma") && !modelName.includes("flash")) {
             // Optional: You can keep Gemma disabled for vision if you prefer, 
             // but Gemma 3 is multimodal so we can try allowing it.
             // If you want to be safe, uncomment the next line:
             // continue; 
        }

        const activeKey = getRandomKey();
        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await Promise.race([
          model.generateContent({ contents: [{ role: "user", parts: parts }] }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
        ]) as any;

        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();
        
        finalResult = JSON.parse(text);
        console.log(`✅ Success | Model: ${modelName} (${mode})`);
        break;

      } catch (error: any) {
        console.warn(`⚠️ Model ${modelName} failed. Switching...`);
        lastError = error.message;
      }
    }

    if (!finalResult) throw new Error("System busy. Please try again. " + lastError);

    // =========================================================
    // 4. SAVE TO CACHE
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