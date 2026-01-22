"use client";

import { useState, useRef } from "react";

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
  const [mode, setMode] = useState<"lesson" | "quiz">("lesson"); // NEW: Mode Switch
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState("English");
  const [file, setFile] = useState<File | null>(null);
  
  // Data State
  const [data, setData] = useState<LessonData | QuizData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Quiz State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null); // For single question (Lesson)
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: string}>({}); // For multiple questions (Quiz)
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Extras
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

  // --- MAIN API CALL ---
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
          mode: mode // Send the selected mode!
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      
      // Force type assignment based on mode request
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-2">
              SkillFlow 6.0 🚀
            </h1>
            <p className="text-gray-600">AI Tutor • Quiz Maker • Vision</p>
          </div>
          
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all ${
              focusMode ? "bg-indigo-600 text-white animate-pulse" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {focusMode ? "🎧 Focus Mode ON" : "🎵 Enable Music"}
          </button>
        </header>

        {/* MUSIC PLAYER */}
        {focusMode && (
          <div className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-xl overflow-hidden border-2 border-indigo-500 bg-black">
            <iframe width="300" height="80" src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&controls=0" title="Lofi Music" allow="autoplay"></iframe>
          </div>
        )}

        {/* DICTIONARY */}
        {definition && (
          <div className="fixed top-20 right-4 z-50 w-72 bg-white p-5 rounded-xl shadow-2xl border-l-4 border-yellow-400 animate-fade-in-up">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xl font-bold capitalize text-gray-800">{definition.word}</h4>
              <button onClick={() => setDefinition(null)} className="text-gray-400 hover:text-red-500">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-2">{definition.phonetic}</p>
            <p className="text-gray-700 leading-snug mb-3">{definition.definition}</p>
            {definition.audio && <audio controls src={definition.audio} className="w-full h-8" />}
          </div>
        )}

        {/* INPUT BOX */}
        <div className="bg-white p-8 rounded-2xl shadow-xl space-y-6 border border-gray-100 mb-10">
          
          {/* MODE SWITCHER */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setMode("lesson")}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${mode === "lesson" ? "bg-white shadow text-purple-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              📚 Lesson Mode
            </button>
            <button
              onClick={() => setMode("quiz")}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${mode === "quiz" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              📝 Quiz Maker
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 bg-white">
                {LANGUAGES.map((lang) => <option key={lang.code} value={lang.code}>{lang.flag} {lang.code}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 bg-white">
                {["Beginner", "Intermediate", "Expert"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
            <input
              type="text"
              placeholder={mode === "quiz" ? "Topic for Quiz (e.g. World War 2)" : "Topic for Lesson (e.g. Gravity)"}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLearning()}
            />
          </div>

          <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${file ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-purple-500"}`}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file ? <span className="text-green-700 font-bold">📄 {file.name}</span> : <span className="text-gray-500">📸 Upload Content for {mode === "quiz" ? "Quiz" : "Lesson"}</span>}
          </div>

          <button onClick={startLearning} disabled={loading} className={`w-full text-white p-4 rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg ${mode === "quiz" ? "bg-indigo-600" : "bg-purple-600"}`}>
            {loading ? (
              <div className="flex flex-col items-center">
                <span className="flex items-center gap-2"><span className="animate-spin text-xl">⚡</span> Generating...</span>
                <span className="text-xs font-normal opacity-80 mt-1">🧠 Fact: {loadingFact}</span>
              </div>
            ) : mode === "quiz" ? "Generate Quiz 📝" : "Start Lesson 🚀"}
          </button>
          
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">❌ {error}</div>}
        </div>

        {/* --- DISPLAY RESULTS --- */}
        
        {/* CASE A: LESSON MODE */}
        {data && data.type === "lesson" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-lg border-l-8 border-purple-500 relative">
                 <div className="absolute top-4 right-4 text-xs text-gray-400">(Double-click words for definition)</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{data.title}</h2>
                <div className="prose prose-lg text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap cursor-text" onDoubleClick={handleWordClick}>
                  {data.explanation}
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h4 className="font-bold text-amber-800">💡 Analogy</h4>
                  <p className="text-amber-700 italic">{data.analogy}</p>
                </div>
              </div>
              <div className="bg-black rounded-2xl shadow-lg overflow-hidden aspect-video">
                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed?listType=search&list=lesson+${topic || data.title}+${level}`} title="Video Lesson" frameBorder="0" allowFullScreen></iframe>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-md">
                <h3 className="font-bold mb-4">📌 Key Points</h3>
                <ul className="space-y-3">
                  {data.key_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="bg-purple-100 text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-indigo-900 p-6 rounded-2xl shadow-xl text-white">
                <h3 className="font-bold mb-4">🧠 Quick Quiz</h3>
                <p className="mb-4 text-sm">{data.quiz_question}</p>
                <div className="grid gap-2">
                  {data.options.map((opt) => (
                    <button key={opt} onClick={() => !showResult && handleSingleQuiz(opt)} className={`w-full p-3 rounded-lg text-left text-sm transition-all border ${showResult ? opt === data.correct_answer ? "bg-green-500 border-green-500" : opt === selectedAnswer ? "bg-red-500 border-red-500" : "bg-white/10" : "bg-white/10 hover:bg-white/20"}`}>
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
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-8 rounded-2xl shadow-lg border-t-8 border-indigo-600">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{data.title}</h2>
              <p className="text-gray-500 mb-6">Test your knowledge! Select an answer for each question.</p>
              
              <div className="space-y-8">
                {data.questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="font-bold text-lg mb-4 text-gray-800"><span className="text-indigo-600">Q{idx+1}.</span> {q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => {
                        let btnClass = "bg-white border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700";
                        if (quizSubmitted) {
                          if (opt === q.correct_answer) btnClass = "bg-green-100 border-green-500 text-green-800 font-bold";
                          else if (opt === quizAnswers[idx]) btnClass = "bg-red-100 border-red-500 text-red-800 opacity-70";
                          else btnClass = "bg-gray-100 border-gray-200 opacity-50";
                        } else if (quizAnswers[idx] === opt) {
                          btnClass = "bg-indigo-600 border-indigo-600 text-white shadow-md";
                        }

                        return (
                          <button 
                            key={opt}
                            onClick={() => handleMultiQuizSelect(idx, opt)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${btnClass}`}
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
              <div className="mt-8 flex items-center justify-between border-t pt-6">
                {!quizSubmitted ? (
                  <button 
                    onClick={() => setQuizSubmitted(true)}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg"
                  >
                    Submit Quiz 📝
                  </button>
                ) : (
                  <div className="flex items-center gap-4 animate-bounce">
                    <span className="text-2xl font-bold">
                      Your Score: <span className={calculateScore() >= 3 ? "text-green-600" : "text-red-500"}>{calculateScore()} / {data.questions.length}</span>
                    </span>
                    <button 
                      onClick={startLearning} // Regenerate
                      className="text-indigo-600 underline font-semibold"
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