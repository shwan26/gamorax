"use client";

const LABELS = ["A", "B", "C", "D"];

function DotPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    />
  );
}

export default function QuestionView({
  q,
  index,
  total,
}: {
  q: any;
  index: number;
  total: number;
}) {
  const hasImage = !!q?.image;

  return (
    <div className="relative">
      <DotPattern />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

      <div className="relative">
        {/* small line only: Question 2/4 */}
        <div className="mb-4 flex items-center justify-center">
          <div
            className="
              inline-flex items-center gap-2 rounded-2xl
              border border-slate-200/70 bg-white/70 px-3 py-2 shadow-sm
              dark:border-slate-800/70 dark:bg-slate-950/50
            "
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Question
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
              {index + 1}/{total}
            </span>
          </div>
        </div>

        {/* QUESTION TEXT big */}
        <div className="text-center">
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
            {q.text}
          </p>


          {/* QUESTION IMAGE */}
          {hasImage ? (
            <div
              className="
                mx-auto mt-6 w-full max-w-5xl overflow-hidden rounded-3xl
                border border-slate-200/70 bg-white/70 shadow-sm
                dark:border-slate-800/70 dark:bg-slate-950/55
              "
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.image}
                className="max-h-[46vh] w-full object-contain p-4"
                alt="Question"
              />
            </div>
          ) : null}
        </div>

        {/* ANSWERS big + same “blue badge” look like editor */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {q.answers.map((a: any, i: number) => (
            <div
              key={i}
              className="
                group relative overflow-hidden rounded-3xl
                border border-slate-200/70 bg-white/60 p-5 sm:p-6 shadow-sm backdrop-blur
                transition-all hover:-translate-y-0.5 hover:shadow-md
                dark:border-slate-800/70 dark:bg-slate-950/45
              "
            >
              <DotPattern />

              <div className="relative flex items-center gap-4">
                {/* badge: EXACT same blue vibe */}
                <div className="shrink-0 rounded-2xl bg-gradient-to-br p-[1px]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#034B6B] to-[#0B6FA6] text-white shadow-sm">
                    <span className="text-2xl font-extrabold">{LABELS[i]}</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-extrabold leading-snug text-slate-900 sm:text-xl md:text-2xl dark:text-slate-50">
                    {a.text}
                  </div>

                  {a.image ? (
                    <div
                      className="
                        mt-4 overflow-hidden rounded-2xl
                        border border-slate-200/70 bg-white/70 shadow-sm
                        dark:border-slate-800/70 dark:bg-slate-950/55
                      "
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.image}
                        className="max-h-[20vh] w-full object-contain p-3"
                        alt={`Answer ${LABELS[i]}`}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
