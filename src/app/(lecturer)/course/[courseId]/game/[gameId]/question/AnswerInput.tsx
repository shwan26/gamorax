"use client";

import { Answer } from "@/src/lib/questionStorage";
import { Check, ImagePlus } from "lucide-react";

const labels = ["A", "B", "C", "D"];
const badgeAccent = "from-[#00D4FF] via-[#38BDF8] to-[#2563EB]";

export default function AnswerInput({
  answer,
  index,
  onChange,
  onCorrect,
}: {
  answer: Answer;
  index: number;
  onChange: (patch: Partial<Answer>) => void;
  onCorrect: () => void;
}) {
  function handleAnswerImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ image: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="
        relative rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur
        dark:border-slate-800/70 dark:bg-slate-950/45
      "
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative flex items-start gap-3">
        {/* Label badge (same color for A/B/C/D) */}
        <div className="shrink-0 rounded-2xl bg-gradient-to-br p-[1px]">
          <div
            className={`
              flex h-11 w-11 items-center justify-center rounded-2xl
              bg-gradient-to-br ${badgeAccent}
              text-white shadow-sm
            `}
          >
            <span className="text-sm font-bold">{labels[index]}</span>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-3">
          <input
            value={answer.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={`Answer ${labels[index]}`}
            className="
              w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
              shadow-sm outline-none
              focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
              dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
              placeholder:text-slate-400 dark:placeholder:text-slate-500
            "
          />

          {answer.image && (
            <div className="flex items-start gap-3">
              <img
                src={answer.image}
                alt={`Answer ${labels[index]} image`}
                className="
                  max-h-28 rounded-xl border border-slate-200/80 bg-white shadow-sm
                  dark:border-slate-800/70 dark:bg-slate-950/40
                "
              />

              <button
                type="button"
                onClick={() => onChange({ image: "" })}
                className="
                  text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline
                  dark:text-slate-300 dark:hover:text-slate-50
                "
              >
                Remove
              </button>
            </div>
          )}

          <label
            className="
              inline-flex items-center gap-2 text-xs font-semibold
              text-slate-600 hover:text-slate-900 transition-colors cursor-pointer
              dark:text-slate-300 dark:hover:text-slate-50
            "
          >
            <ImagePlus className="h-4 w-4" />
            Add image (optional)
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleAnswerImage(e.target.files?.[0])}
            />
          </label>
        </div>

        {/* Correct toggle */}
        <button
          type="button"
          onClick={onCorrect}
          className={`
            mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl
            border shadow-sm transition
            ${
              answer.correct
                ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#2563EB] dark:text-[#A7F3FF]"
                : "border-slate-200/80 bg-white/70 text-slate-400 hover:text-slate-700 hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/70"
            }
            focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
          `}
          aria-label="Mark as correct answer"
          title="Mark correct"
        >
          <Check className={`h-5 w-5 ${answer.correct ? "opacity-100" : "opacity-60"}`} />
        </button>
      </div>
    </div>
  );
}
