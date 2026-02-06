import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import fetch from "node-fetch";

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

const getRandomKey = () => API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

// 3. THE COMPLETE MODEL LIST (Restored 100%)
const MODELS_TO_TRY = [
  // --- TIER 1: The Best & Newest ---
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",

  // --- TIER 2: The Gemma 3 Series (Multimodal) ---
  "gemma-3-27b",
  "gemma-3-12b",
  "gemma-3-4b",
  "gemma-3-2b",
  "gemma-3-1b",
  "gemma-3-1b",

  // --- TIER 3: Safety Nets ---
  "gemini-robotics-er-1.5-preview",
  "gemini-1.5-flash",
];

// --- VIDEO SEARCH ---
const searchYouTube = async (query: string): Promise<string> => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return "";

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
    const res = await fetch(url);
const data = await res.json() as { items?: Array<{ id: { videoId: string } }> };
    if (Array.isArray(data.items) && data.items.length > 0) {
      return data.items[0].id.videoId;
    } else {
      return "";
    }
  } catch (error) {
    console.error("YouTube search failed:", error);
    return "";
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, level, language, fileData, mimeType, mode, explanationStyle, complexity, format } = body;

    // 🛡️ SECURITY LAYER 2: INPUT VALIDATION
    if (topic && topic.length > 500) {
      return NextResponse.json({ error: "Topic is too long (Max 500 chars)" }, { status: 400 });
    }
    if (fileData && fileData.length > 10 * 1024 * 1024) { // 10MB Limit
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    const cleanTopic = topic ? topic.trim().toLowerCase() : "uploaded-file";

    // Create cache key (Topic + Level + Language + MODE + Style)
    const cacheKey = `${cleanTopic.replace(/\s+/g, '-')}-${level.toLowerCase()}-${language.toLowerCase()}-${mode || 'lesson'}-${explanationStyle || 'default'}-${complexity || 'medium'}-${format || 'paragraph'}`;

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

    // Safety guardrail
    const safetyInstruction = "Ensure content is educational, safe for schools, and strictly non-political.";

    if (mode === "quiz") {
      // --- QUIZ MODE ---
      systemPrompt = `
        You are an expert exam creator. ${safetyInstruction}
        TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
        STUDENT LEVEL: ${level}.
        TOPIC: "${topic}".

        INSTRUCTIONS:
        1. Create a Challenging 5-Question Quiz.
        2. If file attached, base questions on the file.
        3. Return strictly valid JSON (no markdown) with this schema:
        {
          "title": "Quiz Title in ${language}",
          "type": "quiz",
          "questions": [
            {
              "question": "Question 1 text...",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Option A"
            }
            ... (5 questions total)
          ]
        }
      `;
    } else {
      // --- LESSON MODE ---
      systemPrompt = `
        You are an expert tutor. ${safetyInstruction}
        TARGET LANGUAGE: ${language} (MUST OUTPUT IN THIS LANGUAGE).
        STUDENT LEVEL: ${level}.
        EXPLANATION STYLE: ${explanationStyle || 'balanced'}.
        COMPLEXITY: ${complexity || 'medium'}.
        FORMAT: ${format || 'paragraph'}.
        TOPIC: "${topic}".

        INSTRUCTIONS:
        1. Explain the topic according to the specified style, complexity, and format.
        2. If file attached, analyze it.
        3. Generate the explanation in the requested format:
           - For "paragraph" format: Write a clear, flowing explanation
           - For "bullet_points" format: Use concise bullet points
           - For "step_by_step" format: Break down into numbered steps
        4. Adjust complexity:
           - For "low" complexity: Use simple language and basic concepts
           - For "medium" complexity: Use standard educational language
           - For "high" complexity: Include technical details and advanced concepts
        5. Apply explanation style:
           - For "simple" style: Focus on basic understanding
           - For "detailed" style: Provide comprehensive coverage
           - For "technical" style: Include technical terminology and details
           - For "balanced" style: Mix of all approaches
        6. Create an appropriate analogy based on the topic and style
        7. Generate 3-5 key points that summarize the main concepts
        8. Create a single practice quiz question with 4 options
        9. Search for a relevant YouTube video that explains the topic
        10. Return strictly valid JSON (no markdown) with this schema:
        {
          "title": "Lesson Title in ${language}",
          "type": "lesson",
          "explanation": "Explanation in ${format} format...",
          "analogy": "Analogy...",
          "key_points": ["Point 1", "Point 2"],
          "quiz_question": "Single practice question",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "A",
          "video_url": "https://www.youtube.com/watch?v=..."
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
    // 3. ASK AI (With Key Rotation + Fallback)
    // =========================================================
    let finalResult = null;
    let lastError = "";

    for (const modelName of MODELS_TO_TRY) {
      try {
        // NOTE: We allow Gemma to see images now (Vision enabled)

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
        console.log(`✅ Success | Model: ${modelName} | Mode: ${mode}`);
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

    // =========================================================
    // 5. SEARCH FOR VIDEO
    // =========================================================
    if (finalResult.type === "lesson" && finalResult.title) {
      try {
        const videoUrl = await searchYouTube(finalResult.title);
        if (videoUrl) {
          finalResult.video_url = `https://www.youtube.com/watch?v=${videoUrl}`;
        }
      } catch (error) {
        console.log("Video search failed:", error);
      }
    }

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Fatal Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}