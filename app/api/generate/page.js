"use client";
import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  const startLearning = async () => {
    setLoading(true);
    setLesson(null);
    
    const res = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({ topic, level }),
    });

    const data = await res.json();
    setLesson(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-blue-600">AI Tutor 🤖</h1>
        
        {/* INPUT SECTION */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
          <input
            type="text"
            placeholder="What do you want to learn? (e.g. Gravity)"
            className="w-full p-3 border rounded-lg text-black"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          
          <div className="flex gap-4">
            {["Beginner", "Intermediate", "Expert"].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-4 py-2 rounded-lg ${
                  level === l ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={startLearning}
            disabled={loading || !topic}
            className="w-full bg-green-500 text-white p-3 rounded-lg font-bold hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Teach Me!"}
          </button>
        </div>

        {/* LESSON DISPLAY */}
        {lesson && (
          <div className="mt-8 bg-white p-8 rounded-xl shadow-lg animate-fade-in text-black">
            <h2 className="text-3xl font-bold mb-4">{lesson.title}</h2>
            <p className="text-gray-700 leading-relaxed mb-6">{lesson.explanation}</p>
            
            <h3 className="font-bold text-xl mb-2">Key Points:</h3>
            <ul className="list-disc pl-5 mb-6">
              {lesson.key_points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="font-bold mb-2">Quiz: {lesson.quiz_question}</p>
              <div className="grid grid-cols-1 gap-2">
                {lesson.options.map((opt) => (
                  <button key={opt} className="bg-white p-2 border rounded hover:bg-blue-100 text-left">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}