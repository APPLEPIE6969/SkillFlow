"use client";

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
    highlight: "bg-purple-100 text-purple-600"
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
    highlight: "bg-red-900/50 text-red-300"
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
    highlight: "bg-yellow-100 text-yellow-800"
  }
};

export default function Home() {
  // --- STATE ---
  const [theme, setTheme] = useState("default");
  const [mode, setMode] = useState<"lesson" | "quiz">("lesson");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState("English");
  const [file, setFile] = useState<File | null>(null);
  
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
    <div className={`min-h-screen p-6 font-sans transition-colors duration-700 ease-in-out ${t.bg} ${t.textMain}`}>
      {/* 🔮 CUSTOM CSS FOR SMOOTH ANIMATIONS */}
      <style jsx global>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.5); }
          70% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-spring { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .hover-scale { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .hover-scale:hover { transform: scale(1.02); }
        .btn-press:active { transform: scale(0.95); }
      `}</style>

      <div className="max-w-4xl mx-auto">
        
        {/* HEADER & THEME SWITCHER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <h1 className={`text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${t.title} mb-2`}>
              SkillFlow 🚀
            </h1>
            <p className={`${t.textSec} font-medium`}>AI Tutor • Quiz Maker • Vision</p>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={`px-4 py-3 rounded-full font-bold shadow-sm outline-none cursor-pointer hover-scale transition-all ${t.card} ${t.textMain}`}
            >
              {Object.keys(THEMES).map(key => (
                <option key={key} value={key}>{THEMES[key].name}</option>
              ))}
            </select>

            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all btn-press ${
                focusMode ? `${t.button} ring-4 ring-opacity-50` : `${t.card} ${t.textMain} hover-scale`
              }`}
            >
              {focusMode ? "🎧 Hide" : "🎵 Music"}
            </button>
          </div>
        </header>

        {/* 🎵 SMOOTH MUSIC PLAYER */}
        {focusMode && (
          <div className={`fixed bottom-4 right-4 z-50 w-80 p-4 rounded-2xl shadow-2xl border flex flex-col gap-3 animate-spring origin-bottom-right ${theme === 'darkRed' ? 'bg-black/90 border-red-900' : 'bg-white/90 border-indigo-200 backdrop-blur-xl'}`}>
            <iframe 
              className="rounded-xl w-full h-40 shadow-inner"
              src={`https://www.youtube.com/embed/${musicId}?autoplay=1&controls=0&loop=1`} 
              title="Music" 
              allow="autoplay"
            ></iframe>
            <div className="flex flex-col gap-2">
              <select 
                onChange={(e) => setMusicId(e.target.value)} 
                className="bg-gray-800 text-white text-sm p-2.5 rounded-xl border border-gray-600 outline-none hover:bg-gray-700 transition-colors"
                value={musicId}
              >
                {MUSIC_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="custom">🔗 Custom Link...</option>
              </select>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste YouTube Link..." 
                  className="bg-gray-800 text-white text-xs p-2.5 rounded-xl flex-1 border border-gray-600 outline-none"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <button onClick={handleCustomMusic} className={`${t.button} text-xs px-4 rounded-xl btn-press`}>Go</button>
              </div>
            </div>
          </div>
        )}

        {/* 📖 POP-UP DICTIONARY */}
        {definition && (
          <div className="fixed top-20 right-4 z-50 w-72 bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border-l-4 border-yellow-400 animate-pop origin-top-right">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xl font-bold capitalize text-gray-800">{definition.word}</h4>
              <button onClick={() => setDefinition(null)} className="text-gray-400 hover:text-red-500 transition-colors text-xl font-bold">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-3 font-mono">{definition.phonetic}</p>
            <p className="text-gray-700 leading-snug mb-4 text-sm">{definition.definition}</p>
            {definition.audio && <audio controls src={definition.audio} className="w-full h-8" />}
          </div>
        )}

        {/* INPUT BOX */}
        <div className={`p-8 rounded-3xl shadow-xl space-y-6 border ${t.card} mb-10 transition-all duration-300`}>
          
          {/* MODE SWITCHER */}
          <div className={`flex p-1.5 rounded-2xl ${theme === 'darkRed' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button
              onClick={() => setMode("lesson")}
              className={`flex-1 py-3.5 rounded-xl font-bold transition-all duration-300 ${mode === "lesson" ? `${t.card} shadow-md ${t.textMain} scale-[1.02]` : "text-gray-500 hover:text-gray-400"}`}
            >
              📚 Lesson Mode
            </button>
            <button
              onClick={() => setMode("quiz")}
              className={`flex-1 py-3.5 rounded-xl font-bold transition-all duration-300 ${mode === "quiz" ? `${t.card} shadow-md ${t.textMain} scale-[1.02]` : "text-gray-500 hover:text-gray-400"}`}
            >
              📝 Quiz Maker
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`w-full p-4 border-2 rounded-2xl outline-none hover-scale cursor-pointer ${t.input}`}>
                {LANGUAGES.map((lang) => <option key={lang.code} value={lang.code}>{lang.flag} {lang.code}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={`w-full p-4 border-2 rounded-2xl outline-none hover-scale cursor-pointer ${t.input}`}>
                {["Beginner", "Intermediate", "Expert"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${t.textSec}`}>Topic</label>
            <input
              type="text"
              placeholder={mode === "quiz" ? "Topic for Quiz (e.g. World War 2)" : "Topic for Lesson (e.g. Gravity)"}
              className={`w-full p-4 border-2 rounded-2xl outline-none text-lg transition-all focus:ring-4 focus:ring-opacity-20 ${t.input}`}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLearning()}
            />
          </div>

          <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 hover-scale ${file ? "border-green-500 bg-green-50/10" : `border-gray-400 hover:border-current hover:bg-gray-50/5`}`}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file ? <span className="text-green-600 font-bold flex items-center justify-center gap-2">✅ Attached: {file.name}</span> : <span className={`${t.textSec} font-medium`}>📸 Click to Upload Image / PDF</span>}
          </div>

          <button onClick={startLearning} disabled={loading} className={`w-full p-5 rounded-2xl font-bold text-xl transition-all btn-press shadow-xl flex justify-center items-center gap-3 ${t.button} ${loading ? 'opacity-90 cursor-wait' : 'hover:-translate-y-1'}`}>
            {loading ? (
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-2"><span className="animate-spin text-2xl">⚡</span> Thinking...</span>
                <span className="text-xs font-normal opacity-90 mt-1">🧠 Fact: {loadingFact}</span>
              </div>
            ) : mode === "quiz" ? "Generate Quiz 📝" : "Start Lesson 🚀"}
          </button>
          
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 animate-pop">❌ {error}</div>}
        </div>

        {/* --- RESULTS AREA (Spring Animation) --- */}
        
        {/* CASE A: LESSON MODE */}
        {data && data.type === "lesson" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-spring">
            <div className="lg:col-span-2 space-y-6">
              <div className={`p-8 rounded-3xl shadow-lg border-l-8 relative ${t.card} ${t.accent}`}>
                 <div className="absolute top-4 right-4 text-xs opacity-50 font-bold uppercase tracking-widest">Interactive Text</div>
                <h2 className={`text-4xl font-extrabold mb-6 ${t.textMain}`}>{data.title}</h2>
                <div className={`prose prose-lg leading-relaxed mb-6 whitespace-pre-wrap cursor-text selection:bg-yellow-200 selection:text-black ${theme === 'darkRed' ? 'prose-invert text-gray-300' : 'text-gray-600'}`} onDoubleClick={handleWordClick}>
                  {data.explanation}
                </div>
                <div className={`p-6 rounded-2xl border flex items-start gap-4 transition-transform hover:scale-[1.01] ${theme === 'darkRed' ? 'bg-gray-800/50 border-gray-700' : 'bg-amber-50 border-amber-100'}`}>
                  <span className="text-3xl">💡</span>
                  <div>
                    <h4 className={`font-bold text-lg mb-1 ${theme === 'darkRed' ? 'text-gray-200' : 'text-amber-800'}`}>Analogy</h4>
                    <p className={`italic leading-relaxed ${theme === 'darkRed' ? 'text-gray-400' : 'text-amber-700'}`}>{data.analogy}</p>
                  </div>
                </div>
              </div>
              <div className="bg-black rounded-3xl shadow-2xl overflow-hidden aspect-video ring-4 ring-black/5">
                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed?listType=search&list=lesson+${topic || data.title}+${level}`} title="Video Lesson" frameBorder="0" allowFullScreen></iframe>
              </div>
            </div>
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl shadow-md ${t.card}`}>
                <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${t.textMain}`}>📌 Key Points</h3>
                <ul className="space-y-4">
                  {data.key_points.map((p, i) => (
                    <li key={i} className={`flex gap-3 text-sm leading-snug ${t.textMain}`}>
                      <span className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-sm ${t.highlight}`}>{i + 1}</span>{p}
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

        {/* CASE B: QUIZ MAKER MODE */}
        {data && data.type === "quiz" && (
          <div className="space-y-6 animate-spring">
            <div className={`p-8 rounded-3xl shadow-xl border-t-8 ${t.card} ${t.accent}`}>
              <h2 className={`text-4xl font-extrabold mb-3 ${t.textMain}`}>{data.title}</h2>
              <p className={`mb-8 text-lg ${t.textSec}`}>Test your knowledge! Select an answer for each question.</p>
              
              <div className="space-y-8">
                {data.questions.map((q, idx) => (
                  <div key={idx} className={`p-6 rounded-2xl border transition-all hover:shadow-md ${theme === 'darkRed' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50/50 border-gray-200'}`}>
                    <p className={`font-bold text-xl mb-5 ${t.textMain}`}><span className="opacity-40 text-sm align-middle mr-2">#{idx+1}</span> {q.question}</p>
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
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 font-medium ${btnClass}`}
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

              {/* QUIZ CONTROLS */}
              <div className={`mt-10 flex items-center justify-between border-t pt-8 ${theme === 'darkRed' ? 'border-gray-700' : 'border-gray-100'}`}>
                {!quizSubmitted ? (
                  <button 
                    onClick={() => setQuizSubmitted(true)}
                    className={`px-10 py-4 rounded-2xl font-bold text-xl shadow-xl hover:-translate-y-1 transition-transform btn-press ${t.button}`}
                  >
                    Submit Quiz 📝
                  </button>
                ) : (
                  <div className="flex items-center gap-6 animate-pop">
                    <span className={`text-3xl font-extrabold ${t.textMain}`}>
                      Your Score: <span className={calculateScore() >= 3 ? "text-green-500 drop-shadow-sm" : "text-red-500"}>{calculateScore()} / {data.questions.length}</span>
                    </span>
                    <button 
                      onClick={startLearning}
                      className={`underline font-bold text-lg hover-scale ${t.textMain}`}
                    >
                      Try Another?
                    </button>
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