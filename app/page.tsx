"use client";

import { useState } from "react";

// Define the shape of our data so TypeScript is happy
interface Lesson {
  title: string;
  explanation: string;
  analogy: string;
  key_points: string[];
  quiz_question: string;
  options: string[];
  correct_answer: string;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const startLearning = async () => {
    if (!topic) return;
    
    setLoading(true);
    setLesson(null);
    setError("");
    setSelectedAnswer(null);
    setShowResult(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level }),
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            SkillFlow 🧠
          </h1>
          <p className="text-gray-600">Your AI-Powered Personal Tutor</p>
        </header>

        {/* INPUT SECTION */}
        <div className="bg-white p-8 rounded-2xl shadow-xl space-y-6 border border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What do you want to learn?</label>
            <input
              type="text"
              placeholder="e.g. Quantum Physics, Python Loops, French Revolution..."
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLearning()}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
              {["Beginner", "Intermediate", "Expert"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    level === l
                      ? "bg-blue-600 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startLearning}
            disabled={loading || !topic}
            className="w-full bg-black text-white p-4 rounded-xl font-bold text-lg hover:opacity-80 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin text-xl">⚡</span> Generating Lesson...
              </>
            ) : (
              "Start Learning 🚀"
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              ❌ {error}
            </div>
          )}
        </div>

        {/* LESSON DISPLAY */}
        {lesson && (
          <div className="mt-8 space-y-6 animate-fade-in-up">
            
            {/* 1. Main Content */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-8 border-blue-500">
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

            {/* 2. Key Points */}
            <div className="bg-white p-8 rounded-2xl shadow-md">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                📌 Key Takeaways
              </h3>
              <ul className="space-y-3">
                {lesson.key_points.map((point, i) => (
                  <li key={i} className="flex gap-3 text-gray-700">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Quiz */}
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-2xl shadow-xl text-white">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                🧠 Quick Quiz
              </h3>
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
