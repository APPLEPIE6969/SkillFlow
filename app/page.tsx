"use client";

import { useState, useRef } from "react";

// Define the shape of our data
interface Lesson {
  title: string;
  explanation: string;
  analogy: string;
  key_points: string[];
  quiz_question: string;
  options: string[];
  correct_answer: string;
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
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [language, setLanguage] = useState("English");
  const [file, setFile] = useState<File | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Hidden input for file selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const startLearning = async () => {
    if (!topic && !file) {
      setError("Please enter a topic OR upload a file!");
      return;
    }
    
    setLoading(true);
    setLesson(null);
    setError("");
    setSelectedAnswer(null);
    setShowResult(false);

    try {
      let fileBase64 = null;
      let mimeType = null;

      // If user uploaded a file, convert it
      if (file) {
        const fullBase64 = await convertFileToBase64(file);
        // Remove the "data:image/png;base64," part
        fileBase64 = fullBase64.split(",")[1];
        mimeType = file.type;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: topic || "Analyze the attached file", // Fallback if no text
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
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-2">
            SkillFlow 3.0 🚀
          </h1>
          <p className="text-gray-600">Upload homework or type a topic!</p>
        </header>

        {/* INPUT SECTION */}
        <div className="bg-white p-8 rounded-2xl shadow-xl space-y-6 border border-gray-100">
          
          {/* 1. Language & Difficulty Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 bg-white"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.code}
                  </option>
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

          {/* 2. Text Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Topic (Optional if file uploaded)</label>
            <input
              type="text"
              placeholder="e.g. History of Rome..."
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          {/* 3. File Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-purple-500 hover:bg-purple-50"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="text-green-700 font-bold">
                📄 Attached: {file.name}
              </div>
            ) : (
              <div className="text-gray-500">
                <span className="text-2xl block mb-2">📸 / 📄</span>
                Click to upload Homework (Image or PDF)
              </div>
            )}
          </div>

          <button
            onClick={startLearning}
            disabled={loading}
            className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <span className="animate-spin text-xl">⚡</span> Analyzing...
              </>
            ) : (
              "Teach Me 🚀"
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              ❌ {error}
            </div>
          )}
        </div>

        {/* LESSON DISPLAY (Same as before) */}
        {lesson && (
          <div className="mt-8 space-y-6 animate-fade-in-up">
            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-8 border-purple-500">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{lesson.title}</h2>
              <div className="prose prose-lg text-gray-600 leading-relaxed mb-6">
                {lesson.explanation}
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-bold text-amber-800">Analogy</h4>
                  <p className="text-amber-700 italic">{lesson.analogy}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">📌 Key Takeaways</h3>
              <ul className="space-y-3">
                {lesson.key_points.map((point, i) => (
                  <li key={i} className="flex gap-3 text-gray-700">
                    <span className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 rounded-2xl shadow-xl text-white">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">🧠 Quick Quiz</h3>
              <p className="text-lg font-medium mb-4">{lesson.quiz_question}</p>
              <div className="grid gap-3">
                {lesson.options.map((opt) => {
                  let btnColor = "bg-white/10 hover:bg-white/20 border-white/10";
                  if (showResult) {
                    if (opt === lesson.correct_answer) btnColor = "bg-green-500 border-green-500";
                    else if (opt === selectedAnswer) btnColor = "bg-red-500 border-red-500";
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => !showResult && handleQuiz(opt)}
                      className={`w-full p-4 rounded-xl text-left transition-all border ${btnColor} ${showResult ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showResult && (
                <div className="mt-6 text-center animate-bounce">
                  {selectedAnswer === lesson.correct_answer ? (
                    <span className="text-2xl font-bold text-green-300">🎉 Correct! Great job.</span>
                  ) : (
                    <span className="text-2xl font-bold text-red-300">😅 Oops! The answer was {lesson.correct_answer}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
