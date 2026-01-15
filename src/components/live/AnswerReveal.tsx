const LABELS = ["A", "B", "C", "D"];

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

  // scale bars nicely (avoid huge heights)
  const maxCount = Math.max(1, ...safeCounts);
  const maxBarPx = 220;
  const minBarPx = 24;

  return (
    <>
      <p className="mt-4 text-sm">
        Correct answer:{" "}
        <b className="text-[#034B6B]">
          {LABELS[ci]} – {safeAnswers[ci] || "(no text)"}
        </b>
      </p>

      <div className="mt-8 text-xs text-gray-600">
        Total answers: <b>{total}</b>
      </div>

      <div className="mt-6 flex items-end gap-10 h-64 border-b">
        {safeCounts.map((count, i) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          // proportional height
          const h =
            maxCount > 0
              ? Math.round((count / maxCount) * maxBarPx)
              : minBarPx;

          const heightPx = Math.max(minBarPx, h);

          // ✅ blue gradients only
          // Correct = darker + stronger gradient
          // Wrong = lighter + softer gradient
          const barClass =
            i === ci
              ? "bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]"
              : "bg-gradient-to-b from-[#9FD4F2] to-[#D9F0FF]";

          const textClass = i === ci ? "text-white" : "text-[#034B6B]";

          const borderClass = i === ci ? "ring-2 ring-[#034B6B]/30" : "ring-1 ring-[#034B6B]/10";

          return (
            <div key={i} className="flex flex-col items-center gap-2 w-20">
              {/* Bar */}
              <div
                className={`w-16 rounded-md font-bold flex items-end justify-center pb-2 ${barClass} ${borderClass}`}
                style={{ height: heightPx }}
              >
                {/* count inside bar */}
                <span className={`text-xs ${textClass}`}>
                  {count}
                </span>
              </div>

              {/* Label */}
              <div className="font-bold text-sm text-[#034B6B]">{LABELS[i]}</div>

              {/* Percent */}
              <div className="text-xs text-gray-600">
                {pct}% ({count})
              </div>

              {/* Answer text (optional) */}
              {safeAnswers[i] ? (
                <div className="text-[11px] text-gray-600 text-center line-clamp-2">
                  {safeAnswers[i]}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
