"use client";

import { useState, useRef } from "react";

interface Lesson {
  title: string;
  explanation: string;
  analogy: string;
  key_points: string[];
  quiz_question: string;
  options: string[];
  correct_answer: string;
}

interface WordDef {
  word: string;
  phonetic: string;
  definition: string;
  audio: string;
}

const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Dutch", flag: "🇳🇱" },
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Italian", flag: "🇮🇹" },
  { code: "Chinese", flag: "🇨🇳" },
];

export default function Home() {
  // --- STATE ---
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState("English");
  const [file, setFile] = useState<File | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // New Features State
  const [focusMode, setFocusMode] = useState(false);
  const [loadingFact, setLoadingFact] = useState("Did you know? Learning changes your brain structure!");
  const [definition, setDefinition] = useState<WordDef | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HELPERS ---

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // 1. API: Useless Facts (For Loading Screen)
  const fetchRandomFact = async () => {
    try {
      const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
      const data = await res.json();
      setLoadingFact(data.text);
    } catch (e) {
      setLoadingFact("Learning implies change. Change implies effort.");
    }
  };

  // 2. API: Dictionary (Double click word)
  const handleWordClick = async () => {
    // Only works reliably for English currently
    if (language !== "English") return;

    const selection = window.getSelection();
    const word = selection?.toString().trim();

    if (word && word.length > 2) {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const entry = data[0];
          setDefinition({
            word: entry.word,
            phonetic: entry.phonetic || "",
            definition: entry.meanings[0]?.definitions[0]?.definition || "No definition found.",
            audio: entry.phonetics.find((p: any) => p.audio)?.audio || ""
          });
        }
      } catch (e) {
        console.log("Dictionary lookup failed");
      }
    }
  };

  // --- MAIN LOGIC ---

  const startLearning = async () => {
    if (!topic && !file) {
      setError("Please enter a topic OR upload a file!");
      return;
    }
    
    setLoading(true);
    fetchRandomFact(); // Get a fun fact while waiting
    setLesson(null);
    setError("");
    setSelectedAnswer(null);
    setShowResult(false);
    setDefinition(null); // Clear old definitions

    try {
      let fileBase64 = null;
      let mimeType = null;

      if (file) {
        const fullBase64 = await convertFileToBase64(file);
        fileBase64 = fullBase64.split(",")[1];
        mimeType = file.type;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: topic || "Analyze the attached file", 
          level, 
          language,
          fileData: fileBase64,
          mimeType: mimeType
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate lesson");
      
      setLesson(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuiz = (option: string) => {
    setSelectedAnswer(option);
    setShowResult(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-2">
              SkillFlow 5.0 🚀
            </h1>
            <p className="text-gray-600">AI Tutor • Vision • Dictionary • Music</p>
          </div>
          
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all ${
              focusMode 
                ? "bg-indigo-600 text-white animate-pulse" 
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {focusMode ? "🎧 Focus Mode ON" : "🎵 Enable Music"}
          </button>
        </header>

        {/* MUSIC PLAYER */}
        {focusMode && (
          <div className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-xl overflow-hidden border-2 border-indigo-500 bg-black">
            <iframe 
              width="300" 
              height="80" 
              src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&controls=0" 
              title="Lofi Music" 
              allow="autoplay"
            ></iframe>
          </div>
        )}

        {/* DICTIONARY POPUP */}
        {definition && (
          <div className="fixed top-20 right-4 z-50 w-72 bg-white p-5 rounded-xl shadow-2xl border-l-4 border-yellow-400 animate-fade-in-up">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xl font-bold capitalize text-gray-800">{definition.word}</h4>
              <button onClick={() => setDefinition(null)} className="text-gray-400 hover:text-red-500">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-2">{definition.phonetic}</p>
            <p className="text-gray-700 leading-snug mb-3">{definition.definition}</p>
            {definition.audio && (
              <audio controls src={definition.audio} className="w-full h-8">
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}

        {/* INPUT SECTION */}
        <div className="bg-white p-8 rounded-2xl shadow-xl space-y-6 border border-gray-100 mb-10">
          
          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 bg-white"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.code}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 bg-white"
              >
                {["Beginner", "Intermediate", "Expert"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic & File */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
            <input
              type="text"
              placeholder="e.g. Photosynthesis..."
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLearning()}
            />
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              file ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-purple-500"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? <span className="text-green-700 font-bold">📄 {file.name}</span> : <span className="text-gray-500">📸 Upload Homework (Image/PDF)</span>}
          </div>

          <button
            onClick={startLearning}
            disabled={loading}
            className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg"
          >
            {loading ? (
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-2"><span className="animate-spin text-xl">⚡</span> Generating Lesson...</span>
                <span className="text-xs font-normal opacity-80 mt-1">🧠 Fact: {loadingFact}</span>
              </div>
            ) : "Start Lesson 🚀"}
          </button>
          
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">❌ {error}</div>}
        </div>

        {/* RESULT SECTION */}
        {lesson && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            
            {/* LEFT: Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-lg border-l-8 border-purple-500 relative">
                <div className="absolute top-4 right-4 text-xs text-gray-400">
                   (Double-click words for definition)
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{lesson.title}</h2>
                
                {/* INTERACTIVE TEXT */}
                <div 
                  className="prose prose-lg text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap cursor-text"
                  onDoubleClick={handleWordClick}
                >
                  {lesson.explanation}
                </div>
                
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h4 className="font-bold text-amber-800">💡 Analogy</h4>
                  <p className="text-amber-700 italic">{lesson.analogy}</p>
                </div>
              </div>

              {/* AUTO VIDEO */}
              <div className="bg-black rounded-2xl shadow-lg overflow-hidden aspect-video">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed?listType=search&list=lesson+${topic || lesson.title}+${level}`} 
                  title="Video Lesson" 
                  frameBorder="0" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* RIGHT: Quiz */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-md">
                <h3 className="font-bold mb-4">📌 Key Points</h3>
                <ul className="space-y-3">
                  {lesson.key_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="bg-purple-100 text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-indigo-900 p-6 rounded-2xl shadow-xl text-white">
                <h3 className="font-bold mb-4">🧠 Quiz</h3>
                <p className="mb-4 text-sm">{lesson.quiz_question}</p>
                <div className="grid gap-2">
                  {lesson.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => !showResult && handleQuiz(opt)}
                      className={`w-full p-3 rounded-lg text-left text-sm transition-all border ${
                        showResult 
                          ? opt === lesson.correct_answer ? "bg-green-500 border-green-500" : opt === selectedAnswer ? "bg-red-500 border-red-500" : "bg-white/10"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}