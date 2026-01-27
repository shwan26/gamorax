"use client";

import { Question } from "@/src/lib/questionStorage";

export default function TrueFalseEditor({
  question,
  onUpdate,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
}) {
  const answers = question.answers ?? [
    { text: "True", correct: true },
    { text: "False", correct: false },
  ];

  function setCorrect(idx: number) {
    onUpdate({
      answers: answers.map((a, i) => ({ ...a, correct: i === idx })),
    });
  }

  return (
    <div
      className="
        rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
        dark:border-slate-800/70 dark:bg-slate-950/45
      "
    >
      <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
        True / False
      </p>

      <div className="grid grid-cols-2 gap-3">
        {answers.slice(0, 2).map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCorrect(i)}
            className={[
              "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
              a.correct
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                : "border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/70",
            ].join(" ")}
          >
            {a.text}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Click one option to mark it as correct.
      </p>
    </div>
  );
}
