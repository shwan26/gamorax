"use client";

import { Question } from "@/src/lib/questionStorage";
import { Plus, Trash2 } from "lucide-react";

export default function InputAnswerEditor({
  question,
  onUpdate,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
}) {
  const list = question.acceptedAnswers?.length ? question.acceptedAnswers : [""];

  return (
    <div
      className="
        rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
        dark:border-slate-800/70 dark:bg-slate-950/45
      "
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Input answer</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add acceptable answers (case-insensitive match recommended)
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdate({ acceptedAnswers: [...list, ""] })}
          className="
            inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold
            border border-slate-200/80 bg-white/70 shadow-sm
            hover:bg-white transition
            dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/70
          "
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {list.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={v}
              onChange={(e) => {
                const next = [...list];
                next[i] = e.target.value;
                onUpdate({ acceptedAnswers: next });
              }}
              placeholder={`Accepted answer ${i + 1}`}
              className="
                w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                shadow-sm outline-none
                focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
              "
            />

            <button
              type="button"
              onClick={() => {
                const next = list.filter((_, idx) => idx !== i);
                onUpdate({ acceptedAnswers: next.length ? next : [""] });
              }}
              className="
                inline-flex h-10 w-10 items-center justify-center rounded-xl
                border border-red-200/80 bg-white/70 text-red-600 shadow-sm
                hover:bg-white transition
                dark:border-red-900/40 dark:bg-slate-950/40 dark:text-red-400 dark:hover:bg-slate-950/70
              "
              title="Remove"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
