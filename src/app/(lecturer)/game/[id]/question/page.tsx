"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import { useParams } from "next/navigation";
import { getGameById } from "@/src/lib/gameStorage";
import {
  Question,
  getQuestions,
  saveQuestions,
} from "@/src/lib/questionStorage";

const colors = ["bg-red-500", "bg-blue-600", "bg-green-500", "bg-yellow-400"];
const labels = ["A", "B", "C", "D"];

export default function QuestionEditor() {
  const { id } = useParams<{ id: string }>();
  const game = getGameById(id);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  /* ---------- LOAD ---------- */
  useEffect(() => {
    if (!id) return;

    const stored = getQuestions(id);
    if (stored.length) {
      setQuestions(stored);
    } else {
      addQuestion();
    }
  }, [id]);

  /* ---------- AUTO SAVE ---------- */
  useEffect(() => {
    if (!id || !questions.length) return;
    saveQuestions(id, questions);
  }, [questions, id]);

  /* ---------- HELPERS ---------- */
  function addQuestion() {
    setQuestions((prev) => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: "",
          image: undefined,
          answers: emptyAnswers(),
          timeMode: "default" as const,                
          time: game!.timer.defaultTime,      
        },
      ];
      setActiveIndex(next.length - 1);
      return next;
    });
  }


  function updateQuestion(data: Partial<Question>) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[activeIndex] = { ...copy[activeIndex], ...data };
      return copy;
    });
  }

  function handleImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      updateQuestion({ image: reader.result as string });
    reader.readAsDataURL(file);
  }

  const q = questions[activeIndex];
  if (!game || !q) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <GameSubNavbar
        title={`${game.quizNumber} — ${game.courseCode} (${game.section}) ${game.semester}`}
      />

      <div className="flex mt-6 h-[calc(100vh-160px)]">
        {/* QUESTION LIST */}
        <div className="w-32 px-6 overflow-y-auto">
          <div className="flex flex-col gap-4">

          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`rounded-md py-6 font-bold ${
                i === activeIndex ? "bg-[#6AB6E9]" : "bg-[#A5D4F3]"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={addQuestion}
            className="bg-[#A5D4F3] rounded-md py-6 text-xl"
          >
            +
          </button>
          </div>
        </div>

        {/* EDITOR */}
        <div className="flex-1 px-6 overflow-y-auto">
          <input
            value={q.text}
            onChange={(e) => updateQuestion({ text: e.target.value })}
            placeholder="Type Question Here..."
            className="w-full border rounded-md p-3 text-center text-lg mb-4"
          />

          {q.image && (
            <img
              src={q.image}
              className="mx-auto mb-4 max-h-60 rounded-md"
            />
          )}

          <label className="block border rounded-md p-3 text-center text-gray-500 cursor-pointer mb-6">
            + Add Image (optional)
            <input
              type="file"
              hidden
              onChange={(e) => handleImage(e.target.files?.[0])}
            />
          </label>

          {/* ANSWERS */}
          <div className="grid grid-cols-2 gap-6">
            {q.answers.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-md text-white flex items-center justify-center font-bold ${colors[i]}`}
                >
                  {labels[i]}
                </div>
                <input
                  value={a.text}
                  onChange={(e) => {
                    const answers = [...q.answers];
                    answers[i] = { ...a, text: e.target.value };
                    updateQuestion({ answers });
                  }}
                  className="flex-1 border p-2 rounded-md"
                />
                <input
                  type="checkbox"
                  checked={a.correct}
                  onChange={() => {
                    updateQuestion({
                      answers: q.answers.map((x, idx) => ({
                        ...x,
                        correct: idx === i,
                      })),
                    });
                  }}
                />
              </div>
            ))}
          </div>

          {/* TIMER */}
          <div className="mt-6 text-sm flex items-center gap-4">
            <span className="font-medium">Timer:</span>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={q.timeMode === "default"}
                onChange={() =>
                  updateQuestion({
                    timeMode: "default",
                    time: game.timer.defaultTime,
                  })
                }
              />
              Default ({game.timer.defaultTime}s)
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={q.timeMode === "specific"}
                onChange={() =>
                  updateQuestion({ timeMode: "specific" })
                }
              />
              Specific
              <input
                type="number"
                disabled={q.timeMode === "default"}
                value={q.time}
                onChange={(e) =>
                  updateQuestion({ time: Number(e.target.value) })
                }
                className="border rounded-md w-20 px-2 py-1"
              />
              sec
            </label>
          </div>

        </div>
      </div>
    </div>
  );
}

function emptyAnswers() {
  return [
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
    { text: "", correct: false },
  ];
}
