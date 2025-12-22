import TimerBar from "../live/TimeBar";

const COLORS = ["bg-red-500", "bg-blue-600", "bg-green-500", "bg-yellow-400"];
const LABELS = ["A", "B", "C", "D"];

export default function QuestionView({
  q,
  index,
  total,
  startAt,
}: any) {
  return (
    <>
      <div className="flex gap-6">
        <div className="w-20 text-center">
          <p className="text-sm text-gray-500">Question</p>
          <p className="text-4xl font-bold">{index + 1}</p>
          <p className="text-sm text-gray-500">of {total}</p>
        </div>

        <div className="flex-1 border rounded-md p-6 text-lg">
          {q.text}
        </div>
      </div>

      {startAt && (
        <TimerBar duration={q.time} startAt={startAt} />
      )}

      {q.image && (
        <img src={q.image} className="mx-auto my-6 max-h-64 rounded-md" />
      )}

      <div className="grid grid-cols-2 gap-8 mt-8">
        {q.answers.map((a: any, i: number) => (
          <div key={i} className="flex gap-4 border rounded-md p-4">
            <div
              className={`w-14 h-14 text-white font-bold text-xl flex items-center justify-center rounded-md ${COLORS[i]}`}
            >
              {LABELS[i]}
            </div>

            <div>
              <div className="font-medium">{a.text}</div>
              {a.image && (
                <img src={a.image} className="mt-2 max-h-20 rounded-md" />
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
