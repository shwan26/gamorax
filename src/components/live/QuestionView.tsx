import TimerBar from "../live/TimeBar";

const LABELS = ["A", "B", "C", "D"];

export default function QuestionView({
  q,
  index,
  total,
  startAt,
}: any) {
  return (
    <div className="w-full px-6">
      <div className="w-full max-w-5xl mx-auto py-4">
        {/* Top info */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">Question</p>
            <p className="text-3xl md:text-4xl font-extrabold text-[#034B6B]">
              {index + 1}
              <span className="text-sm md:text-base text-gray-400 font-semibold">
                {" "}
                / {total}
              </span>
            </p>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-semibold">Progress:</span> {index + 1} of {total}
          </div>
        </div>

        {/* Timer */}
        {startAt && (
          <div className="w-full mb-6">
            <TimerBar duration={q.time} startAt={startAt} />
          </div>
        )}

        {/* Question */}
        <div className="w-full text-center mb-8">
          <p className="text-xl md:text-3xl font-semibold leading-snug text-gray-900">
            {q.text}
          </p>

          {q.image && (
            <img
              src={q.image}
              className="mx-auto mt-6 max-h-[36vh] object-contain rounded-xl border bg-white"
              alt="Question"
            />
          )}
        </div>

        {/* Answers */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
          {q.answers.map((a: any, i: number) => (
            <div
              key={i}
              className="border bg-white rounded-2xl shadow-sm px-5 py-5 flex items-center gap-5"
            >
  
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center
                           font-extrabold text-xl md:text-2xl text-white
                           bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]"
              >
                {LABELS[i]}
              </div>

              <div className="flex-1 text-center">
                <div className="text-lg md:text-2xl font-semibold text-gray-900 leading-snug">
                  {a.text}
                </div>

                {a.image && (
                  <img
                    src={a.image}
                    className="mx-auto mt-3 max-h-[16vh] object-contain rounded-xl border bg-white"
                    alt={`Answer ${LABELS[i]}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
