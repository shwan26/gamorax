"use client";

import { Question } from "@/src/lib/questionStorage";
import AnswerInput from "./AnswerInput";
import { ImagePlus, Trash2, Timer } from "lucide-react";

export default function QuestionEditorForm({
  question,
  gameDefaultTime,
  onUpdate,
}: {
  question: Question;
  gameDefaultTime: number;
  onUpdate: (patch: Partial<Question>) => void;
}) {
  function handleQuestionImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ image: reader.result as string });
    reader.readAsDataURL(file);
  }

  function handleDeleteQuestionImage() {
    onUpdate({ image: null });
  }

  return (
    <div className="pb-12">
      {/* QUESTION (TOP) */}
      <div>
        <div>
          <div className="relative">
            {/* QUESTION TEXT */}
            <input
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Type Question Here..."
              className="
                w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-base
                text-center font-semibold text-slate-900 shadow-sm outline-none
                focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-50
                placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500
                sm:text-lg
              "
            />

            {/* QUESTION IMAGE */}
            {question.image && (
              <div className="relative mx-auto mt-4 w-fit">
                <img
                  src={question.image}
                  alt="Question"
                  className="
                    max-h-72 rounded-2xl border border-slate-200/80 bg-white shadow-sm
                    dark:border-slate-800/70 dark:bg-slate-950/40
                  "
                />
                <button
                  type="button"
                  onClick={handleDeleteQuestionImage}
                  className="
                    absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl
                    border border-slate-200/70 bg-white/80 text-slate-700 shadow-sm
                    hover:bg-white transition-colors
                    dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-950/80
                    focus:outline-none focus:ring-2 focus:ring-red-400/40
                  "
                  aria-label="Delete question image"
                  title="Delete image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* IMAGE UPLOAD */}
            <div className="mt-4">
              <label
                className="
                  inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl
                  border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-semibold
                  text-slate-700 shadow-sm hover:bg-white transition-colors
                  dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:bg-slate-950/70
                "
              >
                <ImagePlus className="h-4 w-4" />
                {question.image ? "Change Question Image" : "Add Question Image (optional)"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleQuestionImage(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ANSWERS (MIDDLE + CENTERED) */}
      <div className="mx-auto mt-6 w-full max-w-5xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {question.answers.map((ans, i) => (
            <AnswerInput
              key={i}
              index={i}
              answer={ans}
              onChange={(ansPatch) => {
                const next = [...question.answers];
                next[i] = { ...next[i], ...ansPatch };
                onUpdate({ answers: next });
              }}
              onCorrect={() => {
                onUpdate({
                  answers: question.answers.map((a, idx) => ({
                    ...a,
                    correct: idx === i,
                  })),
                });
              }}
            />
          ))}
        </div>
      </div>

      {/* TIMER (BOTTOM + CENTERED) */}
      <div className="mx-auto mt-6 w-full max-w-2xl">
        <div
          className="
            rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/40">
                <Timer className="h-4 w-4 text-slate-700 dark:text-[#A7F3FF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Timer (seconds)
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Set a specific time for this question.
                </p>
              </div>
            </div>

            <input
              type="number"
              min={1}
              value={question.time ?? gameDefaultTime}
              onChange={(e) => {
                const value = Number(e.target.value);
                onUpdate({
                  timeMode: "specific",
                  time: Number.isFinite(value) ? value : gameDefaultTime,
                });
              }}
              className="
                w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                shadow-sm outline-none
                focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                sm:w-32
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}
