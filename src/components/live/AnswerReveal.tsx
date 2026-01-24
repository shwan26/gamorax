const LABELS = ["A", "B", "C", "D"] as const;

function clampIndex(i: unknown) {
  const n = Number(i);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 3) return 3;
  return n;
}

function safe4Counts(counts?: number[]) {
  return [0, 1, 2, 3].map((i) => Math.max(0, Number(counts?.[i] ?? 0)));
}

function safe4Answers(answersText?: string[]) {
  return [0, 1, 2, 3].map((i) => String(answersText?.[i] ?? ""));
}

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export default function AnswerReveal({
  counts,
  correctIndex,
  answersText,
}: {
  counts?: number[];
  correctIndex?: number | null;
  answersText?: string[];
}) {
  const ci = clampIndex(correctIndex);
  const safeCounts = safe4Counts(counts);
  const safeAnswers = safe4Answers(answersText);

  const total = safeCounts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...safeCounts);

  // If correctIndex is not provided, don't dim anything.
  const hasCorrect = typeof correctIndex === "number" && correctIndex >= 0;

  const maxBarPx = 220;
  const minBarPx = 10;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 sm:gap-5">
        {safeCounts.map((count, i) => {
          const percent = pct(count, total);
          const isCorrect = i === ci;

          const h =
            count <= 0
              ? 0
              : Math.max(minBarPx, Math.round((count / maxCount) * maxBarPx));

          // ✅ Dim incorrect choices (bar + text + label) when correct exists
          const dimIncorrect = hasCorrect && !isCorrect;
          const itemDimClass = dimIncorrect ? "opacity-40 saturate-75" : "opacity-100";

          const barClass = isCorrect
            ? "bg-gradient-to-b from-[#022B3A] via-[#034B6B] to-[#0B6FA6]"
            : "bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800/60 dark:via-slate-900/40 dark:to-slate-950/20";

          const ringClass = isCorrect
            ? "ring-2 ring-[#034B6B]/35"
            : "ring-1 ring-slate-200/80 dark:ring-slate-800/50";

          return (
            <div key={i} className={`flex w-full flex-col items-center ${itemDimClass}`}>
              {/* Count pill */}
              <div
                className={[
                  "mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold",
                  "border shadow-sm transition-opacity",
                  isCorrect
                    ? "border-[#034B6B]/25 bg-[#034B6B]/10 text-[#034B6B] dark:bg-[#034B6B]/20 dark:text-[#9FD4F2]"
                    : "border-slate-200/70 bg-white/70 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200",
                ].join(" ")}
              >
                {count}
                <span className="text-[11px] font-semibold opacity-70">
                  ({percent}%)
                </span>
              </div>

              {/* Bar rail */}
              <div
                className="
                  relative flex h-[240px] w-full max-w-[82px] items-end justify-center
                  rounded-2xl border border-slate-200/70 bg-white/60 p-2
                  shadow-sm backdrop-blur
                  dark:border-slate-800/70 dark:bg-slate-950/35
                "
              >
                <div className="pointer-events-none absolute bottom-2 left-2 right-2 h-px bg-slate-200/70 dark:bg-slate-800/60" />

                <div
                  className={[
                    "w-full rounded-xl shadow-sm transition-[height] duration-200",
                    barClass,
                    ringClass,
                  ].join(" ")}
                  style={{ height: h }}
                >
                  <div
                    className={[
                      "h-2 w-full rounded-t-xl opacity-70",
                      isCorrect ? "bg-white/25" : "bg-white/35",
                    ].join(" ")}
                  />
                </div>
              </div>

              {/* Label */}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={[
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold transition-opacity",
                    isCorrect
                      ? "bg-[#034B6B] text-white"
                      : "bg-white text-[#034B6B] border border-slate-200/70 dark:bg-slate-950/40 dark:border-slate-800/70",
                  ].join(" ")}
                >
                  {LABELS[i]}
                </span>
              </div>

              {/* Answer text */}
              {safeAnswers[i] ? (
                <div
                  className={[
                    "mt-3 max-w-[150px] text-center text-sm sm:text-base font-semibold line-clamp-3 transition-opacity",
                    isCorrect
                      ? "text-slate-900 dark:text-slate-50"
                      : "text-slate-500 dark:text-slate-400",
                  ].join(" ")}
                >
                  {safeAnswers[i]}
                </div>
              ) : (
                <div className="mt-3 text-center text-sm sm:text-base font-semibold text-slate-400">
                  (no text)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
