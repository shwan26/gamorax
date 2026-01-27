"use client";

import { Question } from "@/src/lib/questionStorage";

export default function MatchingEditor({
  question,
  onUpdate,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
}) {
  const pairs =
    question.matches?.length
      ? question.matches
      : Array.from({ length: 5 }, () => ({ left: "", right: "" }));

  return (
    <div
      className="
        rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
        dark:border-slate-800/70 dark:bg-slate-950/45
      "
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Matching</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">5 pairs</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Left</p>
          {pairs.map((p, i) => (
            <input
              key={`l-${i}`}
              value={p.left}
              onChange={(e) => {
                const next = pairs.map((x, idx) => (idx === i ? { ...x, left: e.target.value } : x));
                onUpdate({ matches: next });
              }}
              placeholder={`Left ${i + 1}`}
              className="
                w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                shadow-sm outline-none
                focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
              "
            />
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Right</p>
          {pairs.map((p, i) => (
            <input
              key={`r-${i}`}
              value={p.right}
              onChange={(e) => {
                const next = pairs.map((x, idx) => (idx === i ? { ...x, right: e.target.value } : x));
                onUpdate({ matches: next });
              }}
              placeholder={`Right ${i + 1}`}
              className="
                w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                shadow-sm outline-none
                focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
              "
            />
          ))}
        </div>
      </div>
    </div>
  );
}
