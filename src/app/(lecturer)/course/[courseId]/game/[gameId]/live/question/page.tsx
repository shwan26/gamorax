"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById } from "@/src/lib/courseStorage";
import { getQuestions, type Question } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";

import {
  setLastQuestionAt,
  saveLiveReport,
  getLiveByPin,
  getCurrentLivePin,
  type LiveReportRow,
} from "@/src/lib/liveStorage";

import QuestionView from "@/src/components/live/QuestionView";
import AnswerReveal from "@/src/components/live/AnswerReveal";
import FinalBoard from "@/src/components/live/FinalBoard";

function toCorrectIndex(q: Question | any): number | null {
  if (!q) return null;

  if (Array.isArray(q.answers) && q.answers.length) {
    const idx = q.answers.findIndex((a: any) => a?.correct === true);
    if (idx >= 0) return idx;
  }

  if (Number.isFinite(q?.correctIndex)) return q.correctIndex;
  if (Number.isFinite(q?.correctAnswerIndex)) return q.correctAnswerIndex;

  const cc = String(q?.correctChoice ?? q?.correct ?? q?.answer ?? "")
    .toUpperCase()
    .trim();
  if (cc === "A") return 0;
  if (cc === "B") return 1;
  if (cc === "C") return 2;
  if (cc === "D") return 3;

  return null;
}

function getDurationSec(q: Question | any): number {
  const t = Number(q?.time);
  if (Number.isFinite(t) && t > 0) return Math.min(60 * 60, Math.round(t));
  return 20;
}

function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type GameWithShuffle = Game & {
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
};

export default function TeacherLiveFlowPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const searchParams = useSearchParams();

  // ✅ pin from URL OR fallback from localStorage
  const pin = useMemo(() => {
    const fromQuery = (searchParams?.get("pin") ?? "").trim();
    if (fromQuery) return fromQuery;

    if (!gameId) return "";
    return (getCurrentLivePin(gameId) ?? "").trim();
  }, [searchParams, gameId]);

  const game = useMemo(() => {
    const g = gameId ? getGameById(gameId) : null;
    return (g as GameWithShuffle | null) ?? null;
  }, [gameId]);

  const course = useMemo(
    () => (courseId ? getCourseById(courseId) : null),
    [courseId]
  );

  const valid = !!game && !!course && game.courseId === courseId;

  const shuffleQuestions = Boolean(game?.shuffleQuestions);
  const shuffleAnswers = Boolean(game?.shuffleAnswers);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [liveOrder, setLiveOrder] = useState<number[]>([]);

  useEffect(() => {
    if (!valid) return;
    setQuestions(getQuestions(gameId));
  }, [valid, gameId]);

  // ✅ stable LIVE question order (saved per pin + game)
  useEffect(() => {
    if (!pin || !gameId) return;
    if (!questions.length) return;

    const key = `gamorax_live_qorder_${pin}_${gameId}`;
    const saved = sessionStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === questions.length) {
          setLiveOrder(parsed);
          return;
        }
      } catch {}
    }

    const base = [...Array(questions.length)].map((_, i) => i);
    const next = shuffleQuestions ? shuffleArray(base) : base;

    sessionStorage.setItem(key, JSON.stringify(next));
    setLiveOrder(next);
  }, [pin, gameId, questions.length, shuffleQuestions]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0); // LIVE index (0..n-1)

  // base question index
  const baseIndex = liveOrder[qIndex] ?? qIndex;
  const baseQ = questions[baseIndex];

  // ✅ stable answer order per LIVE question index
  const getOrCreateAnswerOrder = (liveQIndex: number) => {
    if (!pin || !gameId) return [0, 1, 2, 3];

    const key = `gamorax_live_aorder_${pin}_${gameId}_${liveQIndex}`;
    const saved = sessionStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed as number[];
      } catch {}
    }

    const base = [0, 1, 2, 3];
    const order = shuffleAnswers ? shuffleArray(base) : base;

    sessionStorage.setItem(key, JSON.stringify(order));
    return order;
  };

  const answerOrder = useMemo(() => {
    if (!baseQ) return [0, 1, 2, 3];
    return getOrCreateAnswerOrder(qIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, gameId, qIndex, shuffleAnswers, baseQ?.id]);

  // ✅ display question (answers already in shuffled display order)
  const q = useMemo(() => {
    if (!baseQ) return null;

    const orderedAnswers = answerOrder.map((i) => baseQ.answers?.[i]).filter(Boolean);
    const originalCorrect = toCorrectIndex(baseQ);
    const correctInDisplay =
      typeof originalCorrect === "number" ? answerOrder.indexOf(originalCorrect) : -1;

    const displayAnswers = orderedAnswers.map((a: any, idx: number) => ({
      ...a,
      correct: idx === correctInDisplay,
    }));

    return { ...baseQ, answers: displayAnswers };
  }, [baseQ, answerOrder]);

  // live counts (A/B/C/D in DISPLAY order)
  const [counts, setCounts] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [totalAnswers, setTotalAnswers] = useState(0);

  // timer
  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number>(20);
  const [now, setNow] = useState<number>(() => Date.now());

  const autoRevealedRef = useRef(false);

  const s = socket;

  // ✅ join room
  useEffect(() => {
    if (!pin) return;
    
    s.connect(); // ✅ connect only on Live page

    const doJoin = () => s.emit("join", { pin });

    if (s.connected) doJoin();
    s.on("connect", doJoin);

    return () => {
      s.off("connect", doJoin);
      s.disconnect(); // ✅ disconnect when leaving lecturer live page
    };
  }, [pin]);


  // listen answer counts
  useEffect(() => {
    const onCount = (p: any) => {
      if (!p) return;
      if (p.questionIndex === qIndex && Array.isArray(p.counts)) {
        setCounts([
          Number(p.counts[0] ?? 0),
          Number(p.counts[1] ?? 0),
          Number(p.counts[2] ?? 0),
          Number(p.counts[3] ?? 0),
        ]);
        setTotalAnswers(Number(p.totalAnswers ?? 0));
      }
    };

    s.on("answer:count", onCount);

    return () => {
      s.off("answer:count", onCount); // ✅ returns socket, but inside block => cleanup returns void
    };
  }, [qIndex]);


  // ✅ broadcast question
  useEffect(() => {
    if (!pin || !q || status !== "question") return;


    // ✅ last question timestamp (when shown)
    setLastQuestionAt(pin);

    const dur = getDurationSec(q);
    const sAt = Date.now();

    setStartAt(sAt);
    setDurationSec(dur);
    setNow(Date.now());
    autoRevealedRef.current = false;

    setCounts([0, 0, 0, 0]);
    setTotalAnswers(0);

    const correctIndex = toCorrectIndex(q) ?? 0;
    const answersText = q.answers.map((a) => a.text);

    s.emit("question:show", {
      pin,
      question: {
        questionIndex: qIndex,
        number: qIndex + 1,
        total: questions.length,
        text: q.text ?? "",
        answers: answersText,
        ...(correctIndex >= 0 ? { correctIndex } : {}),
        startAt: sAt,
        durationSec: dur,
      },
    });
  }, [pin, q, qIndex, questions.length, status]);

  // timer tick
  useEffect(() => {
    if (status !== "question") return;
    if (!startAt) return;

    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [status, startAt]);

  // auto reveal
  useEffect(() => {
    if (status !== "question") return;
    if (!q || !startAt) return;

    const elapsedMs = now - startAt;
    const limitMs = durationSec * 1000;

    if (elapsedMs >= limitMs && !autoRevealedRef.current) {
      autoRevealedRef.current = true;
      showAnswer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, status, startAt, durationSec, q]);

  function showAnswer(isAuto = false) {
    if (!pin || !q) return;

    const correctIndex = q.answers.findIndex((a: any) => a?.correct === true);
    if (correctIndex < 0) {
      console.error("Cannot detect correct answer for question:", q);
      if (!isAuto) alert("Correct answer not found. Check question format.");
      return;
    }

    autoRevealedRef.current = true;
    setStartAt(null);

    s.emit("reveal", { pin, questionIndex: qIndex, correctIndex });
    setStatus("answer");
  }

  const [ranked, setRanked] = useState<any[]>([]);

  // leaderboard + final -> save report
  useEffect(() => {
    const onLb = (p: any) => {
      if (Array.isArray(p?.leaderboard)) setRanked(p.leaderboard);
    };

    const onFinal = (p: any) => {
      const lb = Array.isArray(p?.leaderboard) ? p.leaderboard : [];
      if (lb.length > 0) setRanked(lb);
      setStatus("final");

      const rows: LiveReportRow[] = [...lb]
        .sort((a: any, b: any) => Number(b.points ?? 0) - Number(a.points ?? 0))
        .map((r: any, idx: number) => ({
          rank: idx + 1,
          studentId: String(r.studentId ?? ""),
          name: String(r.name ?? ""),
          score: Number(r.correct ?? 0),
          points: Number(r.points ?? 0),
        }));

      const nowIso = new Date().toISOString();
      const live = pin ? getLiveByPin(pin) : null;

      saveLiveReport({
        id: crypto.randomUUID(),
        gameId,
        pin: pin || "(missing)",
        totalQuestions: questions.length,
        startedAt: live?.startedAt,
        lastQuestionAt: live?.lastQuestionAt ?? nowIso,
        savedAt: nowIso,
        rows,
      });
    };

    s.on("leaderboard:update", onLb);
    s.on("final_results", onFinal);

    return () => {
      s.off("leaderboard:update", onLb);
      s.off("final_results", onFinal);
    };
  }, [pin, gameId, questions.length]);

  function next() {
    if (!pin) return;

    setStartAt(null);
    setNow(Date.now());
    autoRevealedRef.current = false;

    if (qIndex + 1 >= questions.length) {
      // QA in LIVE order + answer order per live question
      const qa = [...Array(questions.length)].map((_, liveIdx) => {
        const bIdx = liveOrder[liveIdx] ?? liveIdx;
        const qq = questions[bIdx];

        const order = getOrCreateAnswerOrder(liveIdx);
        const answers = Array.isArray(qq?.answers)
          ? order.map((i) => qq.answers[i]?.text ?? "")
          : [];

        const originalCorrect = toCorrectIndex(qq);
        const correctIdxDisplay =
          typeof originalCorrect === "number" ? order.indexOf(originalCorrect) : 0;

        const correctChoice = (["A", "B", "C", "D"] as const)[correctIdxDisplay] ?? "A";

        return {
          number: liveIdx + 1,
          question: qq?.text ?? "",
          answers,
          correctChoice,
          correctAnswerText: answers[correctIdxDisplay] ?? "",
        };
      });

      s.emit("finish", { pin, payload: { total: questions.length, qa } });
      setStatus("final");
      return;
    }

    setQIndex((prev) => prev + 1);
    setStatus("question");
    s.emit("next", { pin });
  }

  // guards
  if (!valid || !game || !course) return null;

  if (!pin) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="p-10">
          <p className="font-semibold">PIN is missing.</p>
          <p className="text-sm text-gray-600 mt-2">
            Open Live page first (it creates a session), then click Start.
          </p>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <p className="p-10">No questions found.</p>
      </div>
    );
  }

  // timer UI (FULL -> EMPTY)
  const elapsed = startAt ? Math.max(0, now - startAt) : 0;
  const limit = durationSec * 1000;
  const pctRemaining = startAt && limit > 0 ? Math.max(0, 100 - (elapsed / limit) * 100) : 0;
  const remainingSec = startAt ? Math.max(0, Math.ceil((limit - elapsed) / 1000)) : 0;

  // ✅ props for your AnswerReveal (matches your TS error)
  const correctIndex = toCorrectIndex(q) ?? 0;
  const answersText = q.answers.map((a) => a.text);

  return (
  <div className="min-h-screen app-surface app-bg">
    <Navbar />

    <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:pt-8">
      {/* Header */}
      <div
        className="
          relative overflow-hidden rounded-3xl
          border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/45
        "
      >
        {/* dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* glow blobs */}
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
                px-3 py-1 text-xs font-semibold text-slate-700
                dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-200
              "
            >
              PIN: <span className="font-mono tracking-wider">{pin}</span>
            </span>

            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold",
                status === "question"
                  ? "border-[#00D4FF]/40 bg-white/70 text-slate-700 dark:bg-slate-950/50 dark:text-slate-200"
                  : status === "answer"
                  ? "border-amber-300/60 bg-amber-50/70 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/25 dark:text-amber-200"
                  : "border-emerald-300/60 bg-emerald-50/70 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/25 dark:text-emerald-200",
              ].join(" ")}
            >
              {status === "question"
                ? "Question"
                : status === "answer"
                ? "Answer"
                : "Final"}
            </span>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="mt-6 grid gap-4">
        {/* main panel */}
        <section
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
        
          {/* dot pattern */}
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
                {/* Timer */}
                {startAt && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Time remaining
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {remainingSec}s
                      </p>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden dark:bg-slate-800/60">
                      <div
                        className="h-full transition-[width] duration-100"
                        style={{
                          width: `${pctRemaining}%`,
                          background:
                            "linear-gradient(90deg, #00D4FF, #38BDF8, #2563EB)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Question view wrapped */}
                <div
                  className="
                    rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                    dark:border-slate-800/70 dark:bg-slate-950/55
                  "
                >
                  <QuestionView q={q} index={qIndex} total={questions.length} />

                </div>

                {/* Show Answer */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => showAnswer(false)}
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
              </>
            )}

            {status === "answer" && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Question {qIndex + 1} of {questions.length}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {q.text}
                  </p>
                </div>

                <div
                  className="
                    rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                    dark:border-slate-800/70 dark:bg-slate-950/55
                  "
                >
                  <AnswerReveal
                    counts={counts}
                    correctIndex={correctIndex}
                    answersText={answersText}
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={next}
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
                  total={questions.length}
                  reportHref={`/course/${courseId}/game/${gameId}/setting/report`}
                  onReportClick={() => {
                    try {
                      s.disconnect();
                    } catch {}
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Live stats */}
        <aside
          className="
            rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Live counts
            </p>
            <span
              className="
                rounded-full border border-slate-200/70 bg-white/70
                px-2.5 py-1 text-[11px] font-semibold text-slate-600
                dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-300
              "
            >
              Total {totalAnswers}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Updates in real-time.
          </p>
        </aside>
      </div>
    </main>
  </div>
);

}
