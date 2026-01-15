const COLORS = ["bg-red-500", "bg-blue-600", "bg-green-500", "bg-yellow-400"];
const LABELS = ["A", "B", "C", "D"];

function clampIndex(i: unknown) {
  const n = Number(i);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 3) return 3;
  return n;
}

export default function AnswerReveal({
  counts,
  correctIndex,
  answersText,
}: {
  counts?: number[];          // ✅ optional
  correctIndex?: number | null; // ✅ allow null
  answersText?: string[];     // ✅ optional
}) {
  const ci = clampIndex(correctIndex);

  // always 4 counts so UI doesn't break
  const safeCounts = [0, 0, 0, 0].map((_, i) => Number(counts?.[i] ?? 0));

  // always 4 answers so text doesn't break
  const safeAnswers = [0, 1, 2, 3].map((i) => String(answersText?.[i] ?? ""));

  return (
    <>
      <p className="mt-4 text-sm">
        Correct answer:{" "}
        <b>
          {LABELS[ci]} – {safeAnswers[ci] || "(no text)"}
        </b>
      </p>

      <div className="mt-10 flex items-end gap-14 h-56 border-b">
        {safeCounts.map((count, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={`w-16 rounded-md text-white font-bold flex justify-center ${COLORS[i]}`}
              style={{ height: Math.max(20, count * 28) }}
            >
              {i === ci ? "✓" : "✕"}
            </div>
            <span className="font-bold">{LABELS[i]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
