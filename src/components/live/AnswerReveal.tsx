const COLORS = ["bg-red-500", "bg-blue-600", "bg-green-500", "bg-yellow-400"];
const LABELS = ["A", "B", "C", "D"];

export default function AnswerReveal({
  q,
  counts,
}: any) {
  const correctIndex = q.answers.findIndex((a: any) => a.correct);

  return (
    <>
      <p className="mt-4 text-sm">
        Correct answer:{" "}
        <b>{LABELS[correctIndex]} – {q.answers[correctIndex]?.text}</b>
      </p>

      <div className="mt-10 flex items-end gap-14 h-56 border-b">
        {counts.map((count: number, i: number) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={`w-16 rounded-md text-white font-bold flex justify-center ${COLORS[i]}`}
              style={{ height: Math.max(20, count * 28) }}
            >
              {i === correctIndex ? "✓" : "✕"}
            </div>
            <span className="font-bold">{LABELS[i]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
