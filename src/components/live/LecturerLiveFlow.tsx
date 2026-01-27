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
import TimeBar from "@/src/components/live/TimerBar";

/* ---------------- helpers ---------------- */

function getDurationSec(q: any): number {
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

function toCorrectIndex(q: any): number | null {
  if (!q) return null;
  if (Array.isArray(q.answers) && q.answers.length) {
    const idx = q.answers.findIndex((a: any) => a?.correct === true);
    if (idx >= 0) return idx;
  }
  return null;
}

function toCorrectIndices(q: any): number[] {
  if (!q) return [];
  if (Array.isArray(q.answers) && q.answers.length) {
    const idxs = q.answers
      .map((a: any, i: number) => (a?.correct ? i : -1))
      .filter((i: number) => i >= 0);
    if (idxs.length) return idxs;
  }
  const one = toCorrectIndex(q);
  return typeof one === "number" && one >= 0 ? [one] : [];
}

type GameWithShuffle = Game & {
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
};

export default function LecturerLiveFlow() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();
  const searchParams = useSearchParams();

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

  // stable LIVE question order
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
  const [qIndex, setQIndex] = useState(0);

  const baseIndex = liveOrder[qIndex] ?? qIndex;
  const baseQ = questions[baseIndex];

  // stable MC answer order
  const getOrCreateAnswerOrder = (liveQIndex: number, optionCount: number) => {
    if (!pin || !gameId) return [...Array(optionCount)].map((_, i) => i);

    const key = `gamorax_live_aorder_${pin}_${gameId}_${liveQIndex}_${optionCount}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === optionCount) return parsed as number[];
      } catch {}
    }

    const base = [...Array(optionCount)].map((_, i) => i);
    const order = shuffleAnswers ? shuffleArray(base) : base;
    sessionStorage.setItem(key, JSON.stringify(order));
    return order;
  };

  // stable Matching orders
  const getOrCreateMatchOrder = (liveQIndex: number, side: "L" | "R", optionCount: number) => {
    if (!pin || !gameId) return [...Array(optionCount)].map((_, i) => i);

    const key = `gamorax_live_match_${side}_${pin}_${gameId}_${liveQIndex}_${optionCount}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === optionCount) return parsed as number[];
      } catch {}
    }

    const base = [...Array(optionCount)].map((_, i) => i);
    const order = shuffleAnswers ? shuffleArray(base) : base;
    sessionStorage.setItem(key, JSON.stringify(order));
    return order;
  };

  // DISPLAY question (important: memo depends on baseQ.id, not baseQ object)
  const q = useMemo(() => {
    if (!baseQ) return null;

    // MC / TF
    if (baseQ.type === "multiple_choice" || baseQ.type === "true_false") {
      const options =
        baseQ.type === "true_false"
          ? [
              { text: "True", correct: baseQ.answers?.[0]?.correct ?? true },
              { text: "False", correct: baseQ.answers?.[1]?.correct ?? false },
            ]
          : (baseQ.answers ?? []).slice(0, 5);

      const order =
        baseQ.type === "true_false"
          ? [0, 1]
          : getOrCreateAnswerOrder(qIndex, options.length);

      const ordered = order.map((i) => options[i]).filter(Boolean);

      const originalCorrect = options
        .map((a: any, i: number) => (a?.correct ? i : -1))
        .filter((i: number) => i >= 0);

      const correctInDisplay = new Set(originalCorrect.map((i) => order.indexOf(i)));

      const displayAnswers = ordered.map((a: any, idx: number) => ({
        ...a,
        correct: correctInDisplay.has(idx),
      }));

      return { ...baseQ, answers: displayAnswers };
    }

    // Matching
    if (baseQ.type === "matching") {
      const pairs = (baseQ.matches ?? []).slice(0, 5);
      const leftRaw = pairs.map((p: any) => String(p?.left ?? ""));
      const rightRaw = pairs.map((p: any) => String(p?.right ?? ""));
      const n = Math.min(leftRaw.length, rightRaw.length);

      const left = leftRaw.slice(0, n);
      const right = rightRaw.slice(0, n);

      const leftOrder = getOrCreateMatchOrder(qIndex, "L", n);
      const rightOrder = getOrCreateMatchOrder(qIndex, "R", n);

      return {
        ...baseQ,
        matches: pairs,
        left: leftOrder.map((i) => left[i]),
        right: rightOrder.map((i) => right[i]),
      };
    }

    // Input
    return { ...baseQ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQ?.id, baseQ?.type, qIndex, pin, gameId, shuffleAnswers]);

  // ---------------- socket + counts ----------------

  const s = socket;

  const [joinedCount, setJoinedCount] = useState(0);
  const [counts, setCounts] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [answeredCount, setAnsweredCount] = useState(0);

  // join room once per pin
  useEffect(() => {
    if (!pin) return;

    s.connect();

    const doJoin = () => s.emit("join", { pin });
    if (s.connected) doJoin();
    s.on("connect", doJoin);

    return () => {
      s.off("connect", doJoin);
      s.disconnect();
    };
  }, [pin]);

  // joined count listener (stable handler + correct cleanup)
  useEffect(() => {
    const onJoined = (p: any) => {
      const n = Number(p?.totalJoined ?? p?.total ?? p?.count ?? 0);
      if (Number.isFinite(n) && n >= 0) setJoinedCount(n);
    };

    s.on("room:count", onJoined);
    s.on("join:count", onJoined);
    s.on("room:joined", onJoined);

    return () => {
      s.off("room:count", onJoined);
      s.off("join:count", onJoined);
      s.off("room:joined", onJoined);
    };
  }, []);

  // answer counts listener (only update if questionIndex matches)
  useEffect(() => {
    const onCount = (p: any) => {
      if (!p) return;
      if (p.questionIndex !== qIndex) return;
      if (!Array.isArray(p.counts)) return;

      const a0 = Number(p.counts[0] ?? 0);
      const a1 = Number(p.counts[1] ?? 0);
      const a2 = Number(p.counts[2] ?? 0);
      const a3 = Number(p.counts[3] ?? 0);

      // prevent pointless rerenders
      setCounts((prev) => {
        if (prev[0] === a0 && prev[1] === a1 && prev[2] === a2 && prev[3] === a3) return prev;
        return [a0, a1, a2, a3];
      });

      setAnsweredCount(Math.max(0, a0 + a1 + a2 + a3));
    };

    s.on("answer:count", onCount);
    return () => {
      s.off("answer:count", onCount);
    };
  }, [qIndex]);

  // ---------------- timer ----------------

  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number>(20);
  const [now, setNow] = useState<number>(() => Date.now());
  const autoRevealedRef = useRef(false);

  // ✅ IMPORTANT: only initialize timing ONCE per question show
  const lastShowKeyRef = useRef<string>("");

  useEffect(() => {
    if (!pin || !q || status !== "question") return;

    const showKey = `${pin}|${gameId}|${qIndex}|${q?.id ?? ""}|${q?.type ?? ""}`;
    if (lastShowKeyRef.current === showKey) return; // prevents loop
    lastShowKeyRef.current = showKey;

    setLastQuestionAt(pin);

    const dur = getDurationSec(q);
    const sAt = Date.now();

    setStartAt(sAt);
    setDurationSec(dur);
    setNow(Date.now());
    autoRevealedRef.current = false;

    setCounts([0, 0, 0, 0]);
    setAnsweredCount(0);

    const common = {
      questionIndex: qIndex,
      number: qIndex + 1,
      total: questions.length,
      text: q.text ?? "",
      image: q.image ?? null,
      type: q.type ?? "multiple_choice",
      startAt: sAt,
      durationSec: dur,
    };

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const answersText = (q.answers ?? []).map((a: any) => a.text ?? "");
      const correctIndices = toCorrectIndices(q);

      s.emit("question:show", {
        pin,
        question: {
          ...common,
          answers: answersText,
          allowMultiple: correctIndices.length > 1,
          correctIndices,
        },
      });
      return;
    }

    if (q.type === "matching") {
        const pairs = (q.matches ?? []).slice(0, 5);
        const left = pairs.map((p: any) => String(p?.left ?? ""));
        const right = pairs.map((p: any) => String(p?.right ?? ""));

        s.emit("question:show", {
        pin,
        question: {
            ...common,
            left,
            right,
            correctPairs: pairs,
        },
        });

      return;
    }

    // input
    s.emit("question:show", {
      pin,
      question: {
        ...common,
        acceptedAnswers: (q.acceptedAnswers ?? []).filter(Boolean),
      },
    });
  }, [pin, gameId, q?.id, q?.type, status, qIndex, questions.length]);

  // tick
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
  }, [now, status, startAt, durationSec, q?.id]);

  function showAnswer(isAuto = false) {
    if (!pin || !q) return;

    autoRevealedRef.current = true;
    setStartAt(null);

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const correct = toCorrectIndices(q);
      if (!correct.length) {
        if (!isAuto) alert("Correct answer not found.");
        return;
      }
      s.emit("reveal", { pin, questionIndex: qIndex, type: q.type, correctIndices: correct });
      setStatus("answer");
      return;
    }

    if (q.type === "matching") {
      const pairs = (q.matches ?? []).slice(0, 5);
      s.emit("reveal", { pin, questionIndex: qIndex, type: "matching", correctPairs: pairs });
      setStatus("answer");
      return;
    }

    s.emit("reveal", {
      pin,
      questionIndex: qIndex,
      type: "input",
      acceptedAnswers: (q.acceptedAnswers ?? []).filter(Boolean),
    });
    setStatus("answer");
  }

  const [ranked, setRanked] = useState<any[]>([]);

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
      s.emit("finish", { pin, payload: { total: questions.length } });
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

  // time UI
  const elapsed = startAt ? Math.max(0, now - startAt) : 0;
  const limit = durationSec * 1000;
  const pctRemaining = startAt && limit > 0 ? Math.max(0, 100 - (elapsed / limit) * 100) : 0;
  const remainingSec = startAt ? Math.max(0, Math.ceil((limit - elapsed) / 1000)) : 0;

  // AnswerReveal props (MC/TF)
  const correctIndex = toCorrectIndex(q) ?? 0;
  const answersText = (q.answers ?? []).map((a: any) => a.text ?? "");

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:pt-8">
        <div className="mt-6 grid gap-4">
          <section
            className="
              relative overflow-hidden rounded-3xl
              border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
            "
          >
            <div className="relative">
              {status === "question" && (
                <>
                  {startAt ? (
                    <div className="mb-5">
                        <TimeBar mode="computed" duration={durationSec} startAt={startAt} />
                    </div>
                    ) : null}

                  <div
                    className="
                      rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                      dark:border-slate-800/70 dark:bg-slate-950/55
                    "
                  >
                    <QuestionView q={q} index={qIndex} total={questions.length} />
                  </div>

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
                  </div>
                </>
              )}

              {status === "answer" && (
                <>
                  <div
                    className="
                      rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                      dark:border-slate-800/70 dark:bg-slate-950/55
                    "
                  >
                    {q?.type === "multiple_choice" || q?.type === "true_false" ? (
                        <AnswerReveal
                            type={q.type}
                            counts={counts} // counts in display order
                            answersText={(q.answers ?? []).map((a: any) => a.text ?? "")}
                            correctIndices={toCorrectIndices(q)} // your helper (supports multi-correct)
                        />
                        ) : q?.type === "matching" ? (
                        <AnswerReveal
                            type="matching"
                            correctPairs={(q.matches ?? []).slice(0, 5)}
                            matchingTotalPairs={(q.matches ?? []).slice(0, 5).length}
                            // optional if you have solved count:
                            // matchingSolvedCount={...}
                        />
                        ) : (
                        <AnswerReveal
                            type="input"
                            acceptedAnswers={q.acceptedAnswers ?? []}
                            // optional if you collect student answers:
                            // studentAnswers={...}
                        />
                        )}

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
        </div>
      </main>
    </div>
  );
}
