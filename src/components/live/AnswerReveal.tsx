"use client";

const MC_LABELS = ["A", "B", "C", "D", "E"] as const;

type RevealProps = {
  // For choice questions (MC/TF)
  type?: "multiple_choice" | "true_false" | "matching" | "input";
  counts?: number[];                 // counts per option in DISPLAY order
  correctIndices?: number[];         // supports multiple correct (MC)
  correctIndex?: number | null;      // legacy single correct
  answersText?: string[];            // options text in DISPLAY order

  // For matching
  matchingSolvedCount?: number;      // optional: how many pairs solved
  matchingTotalPairs?: number;       // optional: total pairs
  correctPairs?: Array<{ left: string; right: string }>; // optional for showing the solution

  // For input
  acceptedAnswers?: string[];        // optional: show accepted answers
  studentAnswers?: Array<{ name?: string; answer: string }>; // optional
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

/** normalize correct indices */
function normalizeCorrectIndices(p: RevealProps) {
  if (Array.isArray(p.correctIndices) && p.correctIndices.length) {
    return p.correctIndices
      .map((x) => safeNumber(x))
      .filter((x) => Number.isFinite(x) && x >= 0);
  }
  if (typeof p.correctIndex === "number" && p.correctIndex >= 0) return [p.correctIndex];
  return [];
}

/** Make bars for choice questions (MC/TF) */
function ChoiceBars(props: RevealProps) {
  const answers = (props.answersText ?? []).map((a) => String(a ?? ""));
  const counts = (props.counts ?? []).map((c) => Math.max(0, safeNumber(c)));

  const optionCount = clamp(Math.max(answers.length, counts.length, 2), 2, 5);

  const safeAnswers = [...Array(optionCount)].map((_, i) => String(answers[i] ?? ""));
  const safeCounts = [...Array(optionCount)].map((_, i) => Math.max(0, safeNumber(counts[i] ?? 0)));

  const correct = new Set(normalizeCorrectIndices(props));
  const hasCorrect = correct.size > 0;

  const total = safeCounts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...safeCounts);

  const maxBarPx = 220;
  const minBarPx = 10;

  const isTF = props.type === "true_false";

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3 sm:gap-5">
        {safeCounts.map((count, i) => {
          const percent = pct(count, total);
          const isCorrect = correct.has(i);

          const h =
            count <= 0
              ? 0
              : Math.max(minBarPx, Math.round((count / maxCount) * maxBarPx));

          const dimIncorrect = hasCorrect && !isCorrect;
          const itemDimClass = dimIncorrect ? "opacity-40 saturate-75" : "opacity-100";

          const barClass = isCorrect
            ? "bg-gradient-to-b from-[#022B3A] via-[#034B6B] to-[#0B6FA6]"
            : "bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800/60 dark:via-slate-900/40 dark:to-slate-950/20";

          const ringClass = isCorrect
            ? "ring-2 ring-[#034B6B]/35"
            : "ring-1 ring-slate-200/80 dark:ring-slate-800/50";

          const label = isTF ? (i === 0 ? "T" : "F") : (MC_LABELS[i] ?? String(i + 1));

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
                <span className="text-[11px] font-semibold opacity-70">({percent}%)</span>
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
                  {label}
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

/** Matching reveal */
function MatchingReveal(props: RevealProps) {
  const pairs = (props.correctPairs ?? [])
    .map((p) => ({
      left: String(p?.left ?? "").trim(),
      right: String(p?.right ?? "").trim(),
    }))
    .filter((p) => p.left || p.right)
    .slice(0, 5);

  const totalPairs = props.matchingTotalPairs ?? (pairs.length || 0);
  const solved = props.matchingSolvedCount ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          Matching result
        </p>
        {Number.isFinite(totalPairs) && totalPairs > 0 ? (
          <span className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-200">
            Solved {Math.max(0, solved)} / {totalPairs}
          </span>
        ) : null}
      </div>

      {/* Show correct pairs (teacher view) */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Word L</p>
          <div className="mt-3 space-y-2">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-100"
              >
                {p.left || `Left ${i + 1}`}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Word R</p>
          <div className="mt-3 space-y-2">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-100"
              >
                {p.right || `Right ${i + 1}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pairs.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No matching pairs provided.</p>
      ) : null}
    </div>
  );
}

/** Input reveal */
function InputReveal(props: RevealProps) {
  const accepted = (props.acceptedAnswers ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);

  return (
    <div className="space-y-3">
      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
        Input answer result
      </p>

      <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Accepted answers
        </p>

        {accepted.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {accepted.slice(0, 10).map((a, i) => (
              <span
                key={i}
                className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800 dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-100"
              >
                {a}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            (No accepted answers set)
          </p>
        )}
      </div>
    </div>
  );
}

export default function AnswerReveal(props: RevealProps) {
  const type = props.type ?? "multiple_choice";

  if (type === "matching") return <MatchingReveal {...props} />;
  if (type === "input") return <InputReveal {...props} />;

  // default: choice types
  return <ChoiceBars {...props} />;
}
