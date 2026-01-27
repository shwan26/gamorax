"use client";

import type { Course } from "@/src/lib/courseStorage";
import type { Game } from "@/src/lib/gameStorage";
import type { LiveStatus } from "@/src/lib/liveStorage";
import type { LiveDisplayQuestion } from "@/src/components/live/types";

import QuestionView from "@/src/components/live/QuestionView";
import AnswerReveal from "@/src/components/live/AnswerReveal";
import FinalBoard from "@/src/components/live/FinalBoard";
import TimerBar from "./TimerBar";

export default function LecturerLiveLayout({
  courseId,
  gameId,
  game,
  course,
  pin,

  status,
  q,
  qIndex,
  totalQuestions,

  startAt,
  durationSec,

  joinedCount,
  answeredCount,
  counts,

  ranked,

  onShowAnswer,
  onNext,
  onDisconnectAfterReportClick,
}: {
  courseId: string;
  gameId: string;
  game: Game;
  course: Course;
  pin: string;

  status: LiveStatus;
  q: LiveDisplayQuestion;
  qIndex: number;
  totalQuestions: number;

  startAt: number | null;
  durationSec: number;

  joinedCount: number;
  answeredCount: number;
  counts: [number, number, number, number];

  ranked: any[];

  onShowAnswer: () => void;
  onNext: () => void;
  onDisconnectAfterReportClick?: () => void;
}) {
  const correctIndex =
    q.type === "multiple_choice" || q.type === "true_false"
      ? (q.answers ?? []).findIndex((a: any) => a?.correct === true)
      : 0;

  const answersText =
    q.type === "multiple_choice" || q.type === "true_false"
      ? (q.answers ?? []).map((a: any) => a?.text ?? "")
      : [];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:pt-8">
      {/* Header */}
      <div
        className="
          relative overflow-hidden rounded-3xl
          border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/45
        "
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {game.quizNumber}{" "}
              <span className="text-slate-500 dark:text-slate-300 font-semibold">
                — {course.courseCode}
                {course.section ? ` • Section ${course.section}` : ""}
                {course.semester ? ` • ${course.semester}` : ""}
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Teacher live control panel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="
                rounded-full border border-slate-200/70 bg-white/70
                px-4 py-2 text-sm font-extrabold text-slate-900
                dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-50
              "
            >
              PIN:{" "}
              <span className="font-mono tracking-widest text-base sm:text-lg">
                {pin}
              </span>
            </span>

            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold",
                status === "question"
                  ? "border-[#00D4FF]/40 bg-white/70 text-slate-700 dark:bg-slate-950/50 dark:text-slate-200"
                  : status === "answer"
                  ? "border-amber-300/60 bg-amber-50/70 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/25 dark:text-amber-200"
                  : status === "final"
                  ? "border-emerald-300/60 bg-emerald-50/70 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                  : "border-slate-200/60 bg-white/60 text-slate-600 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-300",
              ].join(" ")}
            >
              {status === "question"
                ? "Question"
                : status === "answer"
                ? "Answer"
                : status === "final"
                ? "Final"
                : "Lobby"}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 grid gap-4">
        <section
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

          <div className="relative">
            {status === "question" && (
              <>
                {startAt ? (
                  <div className="mb-5">
                    <TimerBar mode="computed" duration={durationSec} startAt={startAt} />
                  </div>
                ) : null}


                <div
                  className="
                    rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                    dark:border-slate-800/70 dark:bg-slate-950/55
                  "
                >
                  <QuestionView q={q as any} index={qIndex} total={totalQuestions} />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={onShowAnswer}
                    className="
                      inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-white
                      bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                      shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                      hover:opacity-95 active:scale-[0.99] transition
                      focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                    "
                  >
                    Show Answer
                  </button>
                </div>

                <div
                  className="
                    mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
                    dark:border-slate-800/70 dark:bg-slate-950/45
                  "
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Live room
                    </p>

                    <div className="flex items-center gap-2">
                      <span
                        className="
                          rounded-full border border-slate-200/70 bg-white/70
                          px-2.5 py-1 text-[11px] font-semibold text-slate-600
                          dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-300
                        "
                      >
                        Joined {joinedCount}
                      </span>
                      <span
                        className="
                          rounded-full border border-slate-200/70 bg-white/70
                          px-2.5 py-1 text-[11px] font-semibold text-slate-600
                          dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-300
                        "
                      >
                        Answered {answeredCount}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Students can join anytime with the PIN. Answered counts update in real-time.
                  </p>
                </div>
              </>
            )}

            {status === "answer" && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Question {qIndex + 1} of {totalQuestions}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {q.text}
                    </p>

                    <span
                      className="
                        rounded-full border border-slate-200/70 bg-white/70
                        px-3 py-1 text-xs font-semibold text-slate-700
                        dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-200
                      "
                    >
                      Answered: <span className="font-extrabold">{answeredCount}</span>
                    </span>
                  </div>
                </div>

                <div
                  className="
                    rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                    dark:border-slate-800/70 dark:bg-slate-950/55
                  "
                >
                  {(q.type === "multiple_choice" || q.type === "true_false") && (
                    <AnswerReveal
                      counts={counts}
                      correctIndex={correctIndex}
                      answersText={answersText}
                    />
                  )}

                  {q.type === "matching" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(q.matches ?? []).slice(0, 5).map((p: any, i: number) => (
                        <div
                          key={i}
                          className="
                            rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm
                            dark:border-slate-800/70 dark:bg-slate-950/45
                          "
                        >
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Pair {i + 1}
                          </div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                            {String(p?.left ?? "")}{" "}
                            <span className="mx-2 text-slate-400">↔</span>{" "}
                            {String(p?.right ?? "")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "input" && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Accepted answers
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(q.acceptedAnswers ?? []).filter(Boolean).map((a: any, i: number) => (
                          <span
                            key={i}
                            className="
                              rounded-full border border-slate-200/70 bg-white/70
                              px-3 py-1 text-xs font-semibold text-slate-700
                              dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-200
                            "
                          >
                            {String(a)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onNext}
                    className="
                      inline-flex items-center justify-center rounded-full px-10 py-3 text-sm font-semibold text-white
                      bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                      shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                      hover:opacity-95 active:scale-[0.99] transition
                      focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                    "
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {status === "final" && (
              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                  dark:border-slate-800/70 dark:bg-slate-950/55
                "
              >
                <FinalBoard
                  ranked={ranked}
                  total={totalQuestions}
                  reportHref={`/course/${courseId}/game/${gameId}/setting/report`}
                  onReportClick={() => onDisconnectAfterReportClick?.()}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
