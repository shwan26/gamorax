// src/app/(student)/join/[pin]/question/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import { socket } from "@/src/lib/socket";

import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent } from "@/src/lib/liveStudentSession";

import AnswerGrid from "@/src/components/live/AnswerGrid";

import { calcPoints } from "@/src/lib/quizScoring";
import { Trophy, CheckCircle2, XCircle, Timer } from "lucide-react";

type Phase = "question" | "waiting" | "answer" | "final";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function sameSet(a: number[], b: number[]) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

/* ------------------------------ UI helpers ------------------------------ */

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

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur",
        "dark:border-slate-800/70 dark:bg-slate-950/45",
        className,
      ].join(" ")}
    >
      <DotPattern />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />
      <div className="relative">{children}</div>
    </section>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white",
        "bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]",
        "shadow-[0_10px_25px_rgba(37,99,235,0.18)]",
        "hover:opacity-95 active:scale-[0.99] transition",
        "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ------------------------------ page ------------------------------ */

export default function StudentQuestionPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").trim();

  const s = socket;

  const [me, setMe] = useState<LiveStudent | null>(null);

  const [phase, setPhase] = useState<Phase>("question");
  const [q, setQ] = useState<any>(null);
  const qRef = useRef<any>(null);

  const [now, setNow] = useState(Date.now());

  // score state
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const totalPointsRef = useRef(0);
  const [scoredCount, setScoredCount] = useState(0);

  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0);

  const [finalPoints, setFinalPoints] = useState<number>(0);

  // track what student submitted
  const myChoiceRef = useRef<number[] | null>(null);
  const myInputRef = useRef<string | null>(null);
  const matchedPairsRef = useRef<Map<number, number>>(new Map());

  // scoring helper
  const myTimeUsedRef = useRef<number | null>(null);

  // reveal payload
  const [reveal, setReveal] = useState<any>(null);

  // keep qRef synced (so onReveal always reads latest question, not stale closure)
  useEffect(() => {
    qRef.current = q;
  }, [q]);

  // load student
  useEffect(() => {
    if (!pin) return;
    const live = getOrCreateLiveStudent();
    if (!live) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}/question`)}`);
      return;
    }
    setMe(live);
  }, [pin, router]);

  // socket connect + listeners
  useEffect(() => {
    if (!pin || !me) return;

    s.connect();

    const doJoin = () => s.emit("join", { pin, student: me });
    if (s.connected) doJoin();
    s.on("connect", doJoin);

    const onQuestion = (question: any) => {
      setQ(question);
      setReveal(null);

      setPhase("question");

      myChoiceRef.current = null;
      myInputRef.current = null;
      myTimeUsedRef.current = null;
      matchedPairsRef.current = new Map();

      setLastWasCorrect(null);
      setLastEarnedPoints(0);

      setNow(Date.now());
      
      if (question?.number === 1 || question?.questionIndex === 0) {
        totalPointsRef.current = 0;
      }

    };

    const onReveal = (payload: any) => {
      setReveal(payload);
      setPhase("answer");

      const curQ = qRef.current;

      // scoring
      const maxTime = Number(curQ?.durationSec ?? payload?.maxTime ?? 0) || 0;
      const timeUsed = myTimeUsedRef.current ?? maxTime;

      let isCorrect: boolean | null = null;

      if (payload?.type === "multiple_choice" || payload?.type === "true_false") {
        const correct = Array.isArray(payload?.correctIndices) ? payload.correctIndices : [];
        const mine = myChoiceRef.current ?? [];

        if (!correct.length) {
          isCorrect = null;
        } else {
          const allowMultiple = Boolean(payload?.allowMultiple) || correct.length > 1;

          // ✅ your rule: "either one is correct" (ANY match)
          if (allowMultiple) {
            isCorrect = mine.length > 0 ? mine.some((i) => correct.includes(i)) : false;
          } else {
            // single-correct: must match the one correct choice
            isCorrect = sameSet(correct, mine);
          }
        }
      }

      if (payload?.type === "input") {
        const mine = (myInputRef.current ?? "").trim().toLowerCase();
        const accepted = Array.isArray(payload?.acceptedAnswers) ? payload.acceptedAnswers : [];
        const normAccepted = accepted
          .map((x: any) => String(x ?? "").trim().toLowerCase())
          .filter(Boolean);
        isCorrect = mine ? normAccepted.includes(mine) : false;
      }
     if (payload?.type === "matching") {
        const totalPairs = Array.isArray(payload?.correctPairs) ? payload.correctPairs.length : 0;
        isCorrect = totalPairs > 0 ? matchedPairsRef.current.size === totalPairs : null;
      }

      const qNumber = Number(curQ?.number ?? curQ?.questionIndex ?? 0) || 0;
      setScoredCount((p) => Math.max(p, qNumber));

      if (isCorrect === null) {
        setLastWasCorrect(null);
        setLastEarnedPoints(0);
        return;
      }

      const earned = calcPoints({ isCorrect, maxTime, timeUsed });

      setLastWasCorrect(isCorrect);
      setLastEarnedPoints(earned);

      if (isCorrect) setCorrectCount((p) => p + 1);
      setTotalPoints((p) => {
        const next = p + earned;
        totalPointsRef.current = next;
        return next;
      });

      
    };

    const onFinal = () => {
      setPhase("final");
      setFinalPoints(totalPointsRef.current);
    };


    s.on("question:show", onQuestion);
    s.on("answer:reveal", onReveal);
    s.on("final_results", onFinal);

    return () => {
      s.off("connect", doJoin);
      s.off("question:show", onQuestion);
      s.off("answer:reveal", onReveal);
      s.off("final_results", onFinal);
      // do NOT disconnect
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, me]);

  /* ------------------------------ timer ------------------------------ */

  const elapsedSec = useMemo(() => {
    const startAt = Number(q?.startAt ?? 0);
    if (!startAt) return 0;
    return Math.max(0, Math.floor((now - startAt) / 1000));
  }, [q?.startAt, now]);

  const maxSec = useMemo(() => Math.max(0, Number(q?.durationSec ?? 0)), [q?.durationSec]);

  const timeLeft = useMemo(() => clamp(maxSec - elapsedSec, 0, 999999), [maxSec, elapsedSec]);
  const isTimeUp = useMemo(() => maxSec > 0 && elapsedSec >= maxSec, [maxSec, elapsedSec]);

  // ✅ single interval only while answering
  useEffect(() => {
    if (phase !== "question") return;
    if (!q?.startAt || !q?.durationSec) return;

    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [phase, q?.startAt, q?.durationSec]);

  // auto move to waiting when time is up
  useEffect(() => {
    if (phase !== "question") return;
    if (!q) return;
    if (!isTimeUp) return;
    setPhase("waiting");
  }, [phase, q, isTimeUp]);

  /* ------------------------------ disabled logic ------------------------------ */

  const alreadySubmitted = useMemo(() => {
    return (
      myChoiceRef.current !== null ||
      myInputRef.current !== null ||
      (q?.type === "matching" && matchedPairsRef.current.size > 0)
    );
  }, [q?.type, phase]);

  const disabled = phase !== "question" || isTimeUp || alreadySubmitted;

  /* ------------------------------ reveal text ------------------------------ */

  const revealText = useMemo(() => {
    if (!reveal || !q) return null;

    if (reveal.type === "multiple_choice" || reveal.type === "true_false") {
      const idxs = Array.isArray(reveal.correctIndices) ? reveal.correctIndices : [];
      const labels = ["A", "B", "C", "D", "E"];
      const correct = idxs.map((i: number) => labels[i] ?? "?").join(", ");
      return `Correct: ${correct}`;
    }

    if (reveal.type === "input") {
      return `Accepted answers: ${(reveal.acceptedAnswers ?? []).join(", ")}`;
    }

    if (reveal.type === "matching") return "Answer revealed";

    return null;
  }, [reveal, q]);

  /* ------------------------------ submit handlers ------------------------------ */

  function submitChoice(indices: number[]) {
    if (!pin || !me?.studentId || !q) return;

    myChoiceRef.current = indices;
    myTimeUsedRef.current = elapsedSec;
    setPhase("waiting");

    s.emit("answer", {
      pin,
      studentId: me.studentId,
      questionIndex: q.questionIndex,
      indices,
      timeUsed: elapsedSec,
    });
  }

  function submitInput(value: string) {
    if (!pin || !me?.studentId || !q) return;

    myInputRef.current = value;
    myTimeUsedRef.current = elapsedSec;
    setPhase("waiting");

    s.emit("answer:input", {
      pin,
      studentId: me.studentId,
      questionIndex: q.questionIndex,
      value,
      timeUsed: elapsedSec,
    });
  }

  async function attemptMatch(leftIndex: number, rightIndex: number): Promise<{ correct: boolean }> {
    if (!pin || !me?.studentId || !q) return { correct: false };
    if (myTimeUsedRef.current === null) myTimeUsedRef.current = elapsedSec;

    return await new Promise((resolve) => {
      s.emit(
        "match:attempt",
        {
          pin,
          studentId: me.studentId,
          questionIndex: q.questionIndex,
          leftIndex,
          rightIndex,
          timeUsed: elapsedSec,
        },
        (resp: any) => {
          const ok = Boolean(resp?.correct);
          if (ok) matchedPairsRef.current.set(leftIndex, rightIndex);
          resolve({ correct: ok });
        }
      );
    });
  }

  if (!pin) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* header */}
        <GlassCard className="mb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                PIN {pin} • Q{Number(q?.number ?? 0) || "-"} / {Number(q?.total ?? 0) || "-"}
              </div>
              <h1 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">
                {q?.text ?? "Waiting for question..."}
              </h1>
            </div>

            {/* ✅ timer only during question phase */}
            {phase === "question" ? (
              <div className="w-full sm:w-[360px]">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <Timer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Time remaining
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {q?.startAt ? `${timeLeft}s` : "-"}
                  </span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden dark:bg-slate-800/60">
                  <div
                    className="h-full transition-[width] duration-100"
                    style={{
                      width: q?.startAt && maxSec > 0 ? `${(timeLeft / maxSec) * 100}%` : "0%",
                      background: "linear-gradient(90deg, #00D4FF, #38BDF8, #2563EB)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full sm:w-[360px]" />
            )}
          </div>

          {/* status + last result (single place, no duplicates) */}
          <div className="mt-4">
            {phase === "waiting" ? (
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-300">
                Waiting for lecturer to reveal…
              </p>
            ) : phase === "answer" && lastWasCorrect === true ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Correct! +{lastEarnedPoints} points
              </div>
            ) : phase === "answer" && lastWasCorrect === false ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
                <XCircle className="h-4 w-4" />
                Incorrect · +0 points
              </div>
            ) : phase === "answer" ? (
              <p className="text-sm font-semibold text-sky-600 dark:text-sky-300">
                {revealText ?? "Answer revealed"}
              </p>
            ) : phase === "final" ? (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Quiz finished</p>
            ) : (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Answer now</p>
            )}

            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Total correct: <span className="font-semibold">{correctCount}</span> • Total points:{" "}
              <span className="font-semibold">{totalPoints}</span>
            </div>
          </div>
        </GlassCard>

        {/* ✅ final card OUTSIDE header */}
        {phase === "final" ? (
          <GlassCard className="mb-6">
            <div className="flex flex-col items-center gap-4 py-5 text-center">
              <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/45">
                <Trophy className="h-6 w-6 text-slate-700 dark:text-[#A7F3FF]" />
              </div>

              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Final Score</div>

              <div className="text-7xl font-extrabold text-slate-900 dark:text-slate-50">
                {correctCount}/{Number(q?.total ?? scoredCount ?? 1) || 1}
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300">
                Points earned{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {finalPoints}
                </span>
              </div>

              <PrimaryButton onClick={() => router.push("/me/reports")}>Go to My Reports</PrimaryButton>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                You can review your attempt anytime.
              </div>
            </div>
          </GlassCard>
        ) : null}

        {/* grid (hide on final) */}
        {phase !== "final" ? (
          <div className="mt-6">
            <AnswerGrid
              q={q}
              disabled={disabled}
              onSubmitChoice={({ indices }) => submitChoice(indices)}
              onSubmitInput={({ value }) => submitInput(value)}
              onAttemptMatch={
                q?.type === "matching"
                  ? ({ leftIndex, rightIndex }) => attemptMatch(leftIndex, rightIndex)
                  : undefined
              }
            />
          </div>
        ) : null}


        {/* reveal detail for matching */}
        {phase === "answer" && q?.type === "matching" && Array.isArray(reveal?.correctPairs) ? (
          <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/35">
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Correct pairs</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {reveal.correctPairs.map((p: any, i: number) => (
                <li key={i}>
                  • {String(p?.left ?? "")} — {String(p?.right ?? "")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
