"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";

// --- TYPES ---
interface LessonData {
  type: "lesson";
  title: string;
  explanation: string;
  analogy: string;
  key_points: string[];
  quiz_question: string;
  options: string[];
  correct_answer: string;
  video_url?: string;
}

interface QuizData {
  type: "quiz";
  title: string;
  questions: {
    question: string;
    options: string[];
    correct_answer: string;
  }[];
}

interface WordDef {
  word: string;
  phonetic: string;
  definition: string;
  audio: string;
}

// --- CONSTANTS ---
const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Dutch", flag: "🇳🇱" },
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Italian", flag: "🇮🇹" },
  { code: "Chinese", flag: "🇨🇳" },
];

const MUSIC_PRESETS = [
  { name: "☕ Lofi Girl", id: "jfKfPfyJRdk" },
  { name: "🎹 Classical Piano", id: "mIYzp5rcTvU" },
  { name: "🌧️ Rain Sounds", id: "mPZkdNFkNps" },
  { name: "🌌 Synthwave", id: "4xDzrJKXOOY" },
  { name: "🎸 Acoustic", id: "zyDcEdTMjE8" },
];

// 🎨 THEMES CONFIGURATION
const THEMES: Record<string, any> = {
  default: {
    name: "🦄 Default",
    bg: "bg-gradient-to-br from-purple-50 to-indigo-100",
    card: "bg-white/80 backdrop-blur-md border-white/40",
    textMain: "text-gray-800",
    textSec: "text-gray-600",
    title: "from-purple-600 to-indigo-600",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
    accent: "border-purple-500",
    quizBg: "bg-indigo-900 text-white",
    input: "bg-white/90 border-gray-200 text-gray-900 focus:border-purple-500",
    highlight: "bg-purple-100 text-purple-600",
    dropdownHover: "hover:bg-purple-50"
  },
  darkRed: {
    name: "🔴 Cyber Red",
    bg: "bg-gray-950",
    card: "bg-gray-900/90 backdrop-blur-md border-gray-800",
    textMain: "text-gray-100",
    textSec: "text-gray-400",
    title: "from-red-500 to-rose-600",
    button: "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20",
    accent: "border-red-600",
    quizBg: "bg-red-950 text-red-50 border border-red-900",
    input: "bg-gray-800 border-gray-700 text-white focus:border-red-500 placeholder-gray-500",
    highlight: "bg-red-900/50 text-red-300",
    dropdownHover: "hover:bg-gray-800"
  },
  yellow: {
    name: "🐝 Bee Yellow",
    bg: "bg-stone-100",
    card: "bg-white/90 backdrop-blur-sm border-stone-200",
    textMain: "text-stone-800",
    textSec: "text-stone-500",
    title: "from-yellow-500 to-amber-600",
    button: "bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold",
    accent: "border-yellow-400",
    quizBg: "bg-stone-800 text-yellow-50",
    input: "bg-stone-50 border-stone-200 text-stone-800 focus:border-yellow-500",
    highlight: "bg-yellow-100 text-yellow-800",
    dropdownHover: "hover:bg-yellow-100"
  },
  oled: {
    name: "⚫ OLED",
    bg: "bg-black",
    card: "bg-gray-900/90 backdrop-blur-md border-gray-700",
    textMain: "text-gray-200",
    textSec: "text-gray-400",
    title: "from-green-400 to-cyan-400",
    button: "bg-green-600 hover:bg-green-700 text-white shadow-green-900/20",
    accent: "border-green-500",
    quizBg: "bg-gray-800 text-cyan-100 border border-gray-700",
    input: "bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500 placeholder-gray-500",
    highlight: "bg-green-900/50 text-green-300",
    dropdownHover: "hover:bg-gray-800"
  }
};

export default function Home() {
  // --- STATE ---
  const [theme, setTheme] = useState("oled");
  const [mode, setMode] = useState<"lesson" | "quiz">("lesson");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState("English");
  const [file, setFile] = useState<File | null>(null);
  const [explanationStyle, setExplanationStyle] = useState("balanced");
  const [complexity, setComplexity] = useState("medium");
  const [format, setFormat] = useState("paragraph");
  
  // Data State
  const [data, setData] = useState<LessonData | QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Quiz State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: string}>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Extras
  const [focusMode, setFocusMode] = useState(false);
  const [musicId, setMusicId] = useState("jfKfPfyJRdk");
  const [customUrl, setCustomUrl] = useState("");
  const [loadingFact, setLoadingFact] = useState("Did you know? Learning changes your brain structure!");
  const [definition, setDefinition] = useState<WordDef | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = THEMES[theme];

  // --- HELPERS ---
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const fetchRandomFact = async () => {
    try {
      const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
      const data = await res.json();
      setLoadingFact(data.text);
    } catch (e) {
      setLoadingFact("Learning implies change. Change implies effort.");
    }
  };

  const handleWordClick = async () => {
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
      } catch (e) { console.log("Dictionary failed"); }
    }
  };

  const handleCustomMusic = () => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = customUrl.match(regExp);
    if (match && match[2].length === 11) {
      setMusicId(match[2]);
      setCustomUrl("");
    } else {
      alert("Invalid YouTube URL.");
    }
  };

  const startLearning = async () => {
    if (!topic && !file) {
      setError("Please enter a topic OR upload a file!");
      return;
    }
    
    setLoading(true);
    fetchRandomFact();
    setData(null);
    setError("");
    setSelectedAnswer(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShowResult(false);
    setDefinition(null);

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
          mimeType: mimeType,
          mode: mode
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      
      if (mode === "quiz") {
        result.type = "quiz";
      } else {
        result.type = "lesson";
      }
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- QUIZ HANDLERS ---
  const handleSingleQuiz = (option: string) => {
    setSelectedAnswer(option);
    setShowResult(true);
  };

  const handleMultiQuizSelect = (qIndex: number, option: string) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({...prev, [qIndex]: option}));
  };

  const calculateScore = () => {
    if (!data || data.type !== "quiz") return 0;
    let score = 0;
    data.questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_answer) score++;
    });
    return score;
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 font-sans transition-colors duration-700 ease-in-out ${t.bg} ${t.textMain}`}>
      {/* 🔮 CUSTOM CSS */}
      <style jsx global>{`
        /* 💫 Enhanced Animations */
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.5); }
          70% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-20px); }
          60% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 20px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rotateIn {
          from { opacity: 0; transform: rotate(-180deg) scale(0.5); }
          to { opacity: 1; transform: rotate(0deg) scale(1); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        /* 🎨 Enhanced Classes */
        .animate-spring { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-dropdown-down { animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-dropdown-up { animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-fade-in { animation: fadeIn 0.5s ease-in forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.5s ease-out forwards; }
        .animate-slide-in-right { animation: slideInRight 0.5s ease-out forwards; }
        .animate-bounce { animation: bounce 1s infinite; }
        .animate-pulse { animation: pulse 2s infinite; }
        .animate-glow { animation: glow 2s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-slide-in-up { animation: slideInUp 0.5s ease-out forwards; }
        .animate-slide-in-down { animation: slideInDown 0.5s ease-out forwards; }
        .animate-rotate-in { animation: rotateIn 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-scale-in { animation: scaleIn 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

        /* ✨ Enhanced Hover Effects */
        .hover-scale { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .hover-scale:hover { transform: scale(1.05); }
        .hover-glow { transition: all 0.3s ease; box-shadow: 0 0 10px rgba(255,255,255,0.2); }
        .hover-glow:hover { box-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.2); }
        .hover-rotate { transition: transform 0.3s ease; }
        .hover-rotate:hover { transform: rotate(5deg) scale(1.02); }
        .hover-float { transition: transform 0.3s ease; }
        .hover-float:hover { transform: translateY(-5px); }
        .hover-pulse { transition: transform 0.3s ease; }
        .hover-pulse:hover { transform: scale(1.1); animation: pulse 0.5s; }

        /* ⚡ Enhanced Button Effects */
        .btn-press:active { transform: scale(0.95); }
        .btn-press { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .btn-press:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
        .btn-press:active { transform: translateY(-1px) scale(0.98); }

        /* 🌈 Enhanced Card Effects */
        .card-hover { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .card-hover:active { transform: translateY(0); }

        /* ✨ Enhanced Text Effects */
        .text-glow { text-shadow: 0 0 10px rgba(255,255,255,0.3); transition: text-shadow 0.3s ease; }
        .text-glow:hover { text-shadow: 0 0 20px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4); }

        /* 🎨 Enhanced Input Effects */
        .input-glow { transition: all 0.3s ease; box-shadow: 0 0 0 rgba(255,255,255,0.3); }
        .input-glow:focus { box-shadow: 0 0 10px rgba(255,255,255,0.3), 0 0 20px rgba(255,255,255,0.2); }

        /* 🎉 Enhanced Loading Effects */
        .loading-spinner { animation: rotate 1s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading-pulse { animation: pulse 1s infinite; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-10 gap-4 md:gap-6">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-center md:justify-start">
            <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 group hover:scale-105 transition-transform duration-300">
              <Image 
                src="/logo.png" 
                alt="SkillFlow Logo" 
                fill 
                className="object-cover bg-white" 
              />
            </div>
            <div className="text-center md:text-left">
              <h1 className={`text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r ${t.title} mb-1`}>
                SkillFlow 🚀
              </h1>
              <p className={`${t.textSec} font-medium text-xs md:text-sm tracking-wide`}>
                The Adaptive AI Learning Ecosystem
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex gap-2 items-center z-50 w-full md:w-auto justify-center">
            <CustomSelect 
              value={theme}
              onChange={setTheme}
              options={Object.keys(THEMES).map(k => ({ label: THEMES[k].name, value: k }))}
              t={t}
              width="w-36 md:w-40"
            />

            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`flex items-center gap-2 px-4 py-3 md:px-5 md:py-3 rounded-2xl font-bold shadow-lg transition-all btn-press text-sm md:text-base ${
                focusMode ? `${t.button} ring-4 ring-opacity-50` : `${t.card} ${t.textMain} hover-scale`
              }`}
            >
              {focusMode ? "🎧 Hide" : "🎵 Music"}
            </button>
          </div>
        </header>

        {/* 🎵 RESPONSIVE MUSIC PLAYER */}
        {focusMode && (
          // Mobile: Fixed Bottom (Full Width) | Desktop: Bottom Right Floating
          <div className={`fixed bottom-0 left-0 right-0 md:bottom-4 md:left-auto md:right-4 z-50 w-full md:w-80 p-4 rounded-t-3xl md:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] md:shadow-2xl border-t md:border border flex flex-col gap-3 animate-spring ${theme === 'darkRed' ? 'bg-black/95 border-red-900' : 'bg-white/95 border-indigo-200 backdrop-blur-xl'}`}>
            <iframe 
              className="rounded-xl w-full h-32 md:h-40 shadow-inner"
              src={`https://www.youtube.com/embed/${musicId}?autoplay=1&controls=0&loop=1`} 
              title="Music" 
              allow="autoplay"
            ></iframe>
            <div className="flex flex-col gap-2 relative">
              
              {/* DROPDOWN NOW OPENS UPWARDS */}
              <CustomSelect 
                value={musicId}
                onChange={setMusicId}
                options={[
                  ...MUSIC_PRESETS.map(p => ({ label: p.name, value: p.id })),
                  { label: "🔗 Custom Link", value: "custom" }
                ]}
                t={{ ...t, input: "bg-gray-800 border-gray-600 text-white" }}
                direction="up" // <--- Force Up Direction
              />

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste YouTube Link..." 
                  className="bg-gray-800 text-white text-xs p-3 rounded-xl flex-1 border border-gray-600 outline-none"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <button onClick={handleCustomMusic} className={`${t.button} text-xs px-4 rounded-xl btn-press`}>Go</button>
              </div>
            </div>
          </div>
        )}

        {/* 📖 RESPONSIVE DICTIONARY */}
        {definition && (
          <div className="fixed top-20 left-4 right-4 md:left-auto md:right-4 z-50 md:w-72 bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border-l-4 border-yellow-400 animate-pop">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xl font-bold capitalize text-gray-800">{definition.word}</h4>
              <button onClick={() => setDefinition(null)} className="text-gray-400 hover:text-red-500 transition-colors text-xl font-bold">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-3 font-mono">{definition.phonetic}</p>
            <p className="text-gray-700 leading-snug mb-4 text-sm">{definition.definition}</p>
            {definition.audio && <audio controls src={definition.audio} className="w-full h-8" />}
          </div>
        )}

        {/* MAIN INPUT CARD */}
        <div className={`p-5 md:p-8 rounded-3xl shadow-xl space-y-5 md:space-y-6 border ${t.card} mb-10 transition-all duration-300 relative z-10`}>
          
          {/* Mode Switcher */}
          <div className={`flex p-1.5 rounded-2xl ${theme === 'darkRed' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button onClick={() => setMode("lesson")} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-sm md:text-base transition-all duration-300 ${mode === "lesson" ? `${t.card} shadow-md ${t.textMain} scale-[1.02]` : "text-gray-500 hover:text-gray-400"}`}>
              📚 Lesson Mode
            </button>
            <button onClick={() => setMode("quiz")} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-sm md:text-base transition-all duration-300 ${mode === "quiz" ? `${t.card} shadow-md ${t.textMain} scale-[1.02]` : "text-gray-500 hover:text-gray-400"}`}>
              📝 Quiz Maker
            </button>
          </div>

          {/* Settings Row */}
          <div className="flex flex-col sm:flex-row gap-4 relative z-20">
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Language</label>
              <CustomSelect 
                value={language}
                onChange={setLanguage}
                options={LANGUAGES.map(l => ({ label: `${l.flag} ${l.code}`, value: l.code }))}
                t={t}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Level</label>
              <CustomSelect 
                value={level}
                onChange={setLevel}
                options={["Beginner", "Intermediate", "Expert"].map(l => ({ label: l, value: l }))}
                t={t}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Style</label>
              <CustomSelect 
                value={explanationStyle}
                onChange={setExplanationStyle}
                options={[
                  { label: "Balanced", value: "balanced" },
                  { label: "Simple", value: "simple" },
                  { label: "Detailed", value: "detailed" },
                  { label: "Technical", value: "technical" }
                ]}
                t={t}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 relative z-20">
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Complexity</label>
              <CustomSelect 
                value={complexity}
                onChange={setComplexity}
                options={[
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "medium" },
                  { label: "High", value: "high" }
                ]}
                t={t}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Format</label>
              <CustomSelect 
                value={format}
                onChange={setFormat}
                options={[
                  { label: "Paragraph", value: "paragraph" },
                  { label: "Bullet Points", value: "bullet_points" },
                  { label: "Step-by-Step", value: "step_by_step" }
                ]}
                t={t}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Topic</label>
            <input
              type="text"
              placeholder={mode === "quiz" ? "Topic (e.g. World War 2)" : "Topic (e.g. Gravity)"}
              className={`w-full p-4 border-2 rounded-2xl outline-none text-base md:text-lg transition-all focus:ring-4 focus:ring-opacity-20 ${t.input}`}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLearning()}
            />
          </div>

          <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-5 md:p-6 text-center cursor-pointer transition-all duration-300 hover-scale ${file ? "border-green-500 bg-green-50/10" : `border-gray-400 hover:border-current hover:bg-gray-50/5`}`}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file ? <span className="text-green-600 font-bold flex items-center justify-center gap-2 text-sm md:text-base">✅ Attached: {file.name}</span> : <span className={`${t.textSec} font-medium text-sm md:text-base`}>📸 Click to Upload Image / PDF</span>}
          </div>

          <button onClick={startLearning} disabled={loading} className={`w-full p-4 md:p-5 rounded-2xl font-bold text-lg md:text-xl transition-all btn-press shadow-xl flex justify-center items-center gap-3 ${t.button} ${loading ? 'opacity-90 cursor-wait' : 'hover:-translate-y-1'}`}>
            {loading ? (
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-2"><span className="animate-spin text-xl md:text-2xl">⚡</span> Thinking...</span>
                <span className="text-[10px] md:text-xs font-normal opacity-90 mt-1 line-clamp-1">🧠 Fact: {loadingFact}</span>
              </div>
            ) : mode === "quiz" ? "Generate Quiz 📝" : "Start Lesson 🚀"}
          </button>
          
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 animate-pop">❌ {error}</div>}
        </div>

        {/* --- RESULTS AREA --- */}
        {data && data.type === "lesson" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-spring">
            <div className="lg:col-span-2 space-y-6">
              <div className={`p-6 md:p-8 rounded-3xl shadow-lg border-l-8 relative ${t.card} ${t.accent}`}>
                 <div className="hidden md:block absolute top-4 right-4 text-xs opacity-50 font-bold uppercase tracking-widest">Interactive Text</div>
                <h2 className={`text-2xl md:text-4xl font-extrabold mb-4 md:mb-6 ${t.textMain}`}>{data.title}</h2>
                <div className={`prose prose-lg leading-relaxed mb-6 whitespace-pre-wrap cursor-text selection:bg-yellow-200 selection:text-black ${theme === 'darkRed' ? 'prose-invert text-gray-300' : 'text-gray-600'}`} onDoubleClick={handleWordClick}>
                  {data.explanation}
                </div>
                <div className={`p-5 md:p-6 rounded-2xl border flex flex-col md:flex-row items-start gap-4 transition-transform hover:scale-[1.01] ${theme === 'darkRed' ? 'bg-gray-800/50 border-gray-700' : 'bg-amber-50 border-amber-100'}`}>
                  <span className="text-3xl">💡</span>
                  <div>
                    <h4 className={`font-bold text-lg mb-1 ${theme === 'darkRed' ? 'text-gray-200' : 'text-amber-800'}`}>Analogy</h4>
                    <p className={`italic leading-relaxed ${theme === 'darkRed' ? 'text-gray-400' : 'text-amber-700'}`}>{data.analogy}</p>
                  </div>
                </div>
              </div>
              {data.video_url && (
                <div className="bg-black rounded-3xl shadow-2xl overflow-hidden aspect-video ring-4 ring-black/5">
                  <iframe width="100%" height="100%" src={data.video_url} title="Video Lesson" frameBorder="0" allowFullScreen></iframe>
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl shadow-md ${t.card}`}>
                <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${t.textMain}`}>📌 Key Points</h3>
                <ul className="space-y-4">
                  {data.key_points.map((p, i) => (
                    <li key={i} className={`flex gap-3 text-sm leading-snug ${t.textMain}`}>
                      <span className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm ${t.highlight}`}>{i + 1}</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`p-6 rounded-3xl shadow-xl ${t.quizBg}`}>
                <h3 className="font-bold text-xl mb-4">🧠 Quick Quiz</h3>
                <p className="mb-4 text-sm font-medium opacity-90">{data.quiz_question}</p>
                <div className="grid gap-2.5">
                  {data.options.map((opt) => (
                    <button key={opt} onClick={() => !showResult && handleSingleQuiz(opt)} className={`w-full p-3.5 rounded-xl text-left text-sm font-medium transition-all btn-press border ${showResult ? opt === data.correct_answer ? "bg-green-500 border-green-400 text-white shadow-lg scale-105" : opt === selectedAnswer ? "bg-red-500 border-red-400 text-white opacity-50" : "bg-white/5 border-white/10" : "bg-white/10 border-white/10 hover:bg-white/20 hover:border-white/30"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ MODE */}
        {data && data.type === "quiz" && (
          <div className="space-y-6 animate-spring">
            <div className={`p-6 md:p-8 rounded-3xl shadow-xl border-t-8 ${t.card} ${t.accent}`}>
              <h2 className={`text-2xl md:text-4xl font-extrabold mb-3 ${t.textMain}`}>{data.title}</h2>
              <p className={`mb-8 text-base md:text-lg ${t.textSec}`}>Test your knowledge! Select an answer for each question.</p>
              
              <div className="space-y-6 md:space-y-8">
                {data.questions.map((q, idx) => (
                  <div key={idx} className={`p-5 md:p-6 rounded-2xl border transition-all hover:shadow-md ${theme === 'darkRed' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50/50 border-gray-200'}`}>
                    <p className={`font-bold text-lg md:text-xl mb-4 md:mb-5 ${t.textMain}`}><span className="opacity-40 text-sm align-middle mr-2">#{idx+1}</span> {q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => {
                        let btnClass = "";
                        if (theme === 'darkRed') {
                           btnClass = "bg-gray-700/50 border-gray-600 text-gray-200 hover:border-red-500 hover:bg-gray-700";
                        } else {
                           btnClass = "bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700";
                        }
                        if (quizSubmitted) {
                          if (opt === q.correct_answer) btnClass = "bg-green-600 border-green-500 text-white font-bold shadow-lg scale-[1.02]";
                          else if (opt === quizAnswers[idx]) btnClass = "bg-red-600 border-red-500 text-white opacity-60";
                          else btnClass = "opacity-30 blur-[1px]";
                        } else if (quizAnswers[idx] === opt) {
                          btnClass = `${t.button} border-transparent shadow-md scale-[1.02]`;
                        }
                        return (
                          <button 
                            key={opt}
                            onClick={() => handleMultiQuizSelect(idx, opt)}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 font-medium text-sm md:text-base ${btnClass}`}
                            disabled={quizSubmitted}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-10 flex flex-col md:flex-row items-center justify-between border-t pt-8 gap-4 ${theme === 'darkRed' ? 'border-gray-700' : 'border-gray-100'}`}>
                {!quizSubmitted ? (
                  <button onClick={() => setQuizSubmitted(true)} className={`w-full md:w-auto px-10 py-4 rounded-2xl font-bold text-xl shadow-xl hover:-translate-y-1 transition-transform btn-press ${t.button}`}>
                    Submit Quiz 📝
                  </button>
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 animate-pop w-full md:w-auto">
                    <span className={`text-2xl md:text-3xl font-extrabold ${t.textMain}`}>
                      Your Score: <span className={calculateScore() >= 3 ? "text-green-500 drop-shadow-sm" : "text-red-500"}>{calculateScore()} / {data.questions.length}</span>
                    </span>
                    <button onClick={startLearning} className={`underline font-bold text-lg hover-scale ${t.textMain}`}>Try Another?</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// 💎 CUSTOM DROPDOWN (Now with UP/DOWN DIRECTION)
function CustomSelect({ value, onChange, options, t, width = "w-full", direction = "down" }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o: any) => o.value === value)?.label || value;

  // Decide position class based on direction prop
  const positionClass = direction === "up" ? "bottom-full mb-2 animate-dropdown-up" : "top-full mt-2 animate-dropdown-down";

  return (
    <div className={`relative ${width}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 md:p-4 border-2 rounded-2xl outline-none flex justify-between items-center transition-all hover:border-current text-sm md:text-base ${t.input} ${isOpen ? 'ring-4 ring-opacity-10' : ''}`}
      >
        <span className="truncate font-medium">{selectedLabel}</span>
        <svg 
          className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute ${positionClass} left-0 w-full z-50 rounded-2xl shadow-2xl border overflow-hidden ${t.card} ${t.textMain}`}>
          <div className="max-h-60 overflow-y-auto">
            {options.map((opt: any) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`p-3 cursor-pointer transition-colors flex items-center justify-between text-sm md:text-base ${t.dropdownHover || 'hover:bg-gray-100'} ${value === opt.value ? 'font-bold bg-gray-50/50' : ''}`}
              >
                {opt.label}
                {value === opt.value && <span className="text-green-500">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}