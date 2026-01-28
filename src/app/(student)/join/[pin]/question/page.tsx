"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import { socket } from "@/src/lib/socket";

import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent } from "@/src/lib/liveStudentSession";

import AnswerGrid from "@/src/components/live/AnswerGrid";

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

export default function StudentQuestionPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").trim();

  const s = socket;

  const [me, setMe] = useState<LiveStudent | null>(null);

  const [phase, setPhase] = useState<Phase>("question");
  const [q, setQ] = useState<any>(null);

  const [now, setNow] = useState(Date.now());

  // what student submitted
  const myChoiceRef = useRef<number[] | null>(null);
  const myInputRef = useRef<string | null>(null);

  // matching progress for scoring UI (server also stores)
  const matchedPairsRef = useRef<Map<number, number>>(new Map());

  // reveal payload
  const [reveal, setReveal] = useState<any>(null);

  // my live score from leaderboard
  const [myScore, setMyScore] = useState<{ points: number; correct: number } | null>(null);

  useEffect(() => {
    if (!pin) return;
    const live = getOrCreateLiveStudent();
    if (!live) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}/question`)}`);
      return;
    }
    setMe(live);
  }, [pin, router]);

  // connect + join
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
      matchedPairsRef.current = new Map();

      setNow(Date.now());
    };

    const onReveal = (payload: any) => {
      setReveal(payload);
      setPhase("answer");
    };

    const onFinal = (payload: any) => {
      setPhase("final");
      // optional: you can route to a final page if you have one
      // router.push(`/join/${encodeURIComponent(pin)}/final`);
    };

    const onLeaderboard = (payload: any) => {
      const lb = Array.isArray(payload?.leaderboard) ? payload.leaderboard : [];
      if (!me?.studentId) return;
      const row = lb.find((x: any) => String(x?.studentId) === String(me.studentId));
      if (row) setMyScore({ points: Number(row.points ?? 0), correct: Number(row.correct ?? 0) });
    };

    s.on("question:show", onQuestion);
    s.on("answer:reveal", onReveal);
    s.on("final_results", onFinal);
    s.on("leaderboard:update", onLeaderboard);

    return () => {
      s.off("connect", doJoin);
      s.off("question:show", onQuestion);
      s.off("answer:reveal", onReveal);
      s.off("final_results", onFinal);
      s.off("leaderboard:update", onLeaderboard);
      // do NOT disconnect; student might navigate back/forth
    };
  }, [pin, me, s, router]);

  // timer tick for disabling when time is out
  useEffect(() => {
    if (!q) return;
    if (!q?.startAt || !q?.durationSec) return;

    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [q]);

  const elapsedSec = useMemo(() => {
    const startAt = Number(q?.startAt ?? 0);
    if (!startAt) return 0;
    return Math.max(0, Math.floor((now - startAt) / 1000));
  }, [q, now]);

  const maxSec = useMemo(() => Math.max(0, Number(q?.durationSec ?? 0)), [q]);

  const timeLeft = useMemo(() => clamp(maxSec - elapsedSec, 0, 999999), [maxSec, elapsedSec]);
  const isTimeUp = useMemo(() => maxSec > 0 && elapsedSec >= maxSec, [maxSec, elapsedSec]);

  const alreadySubmitted = useMemo(() => {
    return (
      myChoiceRef.current !== null ||
      myInputRef.current !== null ||
      (q?.type === "matching" && matchedPairsRef.current.size > 0)
    );
  }, [q, phase]); // phase forces recalculation in render

  const disabled = phase !== "question" || isTimeUp || alreadySubmitted;

  // display labels for reveal
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

    if (reveal.type === "matching") {
      return `Answer revealed`;
    }

    return null;
  }, [reveal, q]);

  function submitChoice(indices: number[]) {
    if (!pin || !me?.studentId || !q) return;

    myChoiceRef.current = indices;
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
          if (ok) {
            // lock locally too
            matchedPairsRef.current.set(leftIndex, rightIndex);
          }
          // once they start matching, we still let them continue until reveal/timeup
          // so we DO NOT force waiting here.
          resolve({ correct: ok });
        }
      );
    });
  }

  // auto switch to waiting when time is up and student hasn't answered
  useEffect(() => {
    if (!q) return;
    if (phase !== "question") return;
    if (!isTimeUp) return;

    // time up: student must wait for lecturer auto-reveal
    setPhase("waiting");
  }, [isTimeUp, phase, q]);

  if (!pin) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* header */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/35">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                PIN {pin} • Q{Number(q?.number ?? 0) || "-"} / {Number(q?.total ?? 0) || "-"}
              </p>
              <h1 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">
                {q?.text ?? "Waiting for question..."}
              </h1>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time left</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                {q?.startAt ? `${timeLeft}s` : "-"}
              </p>
              {myScore ? (
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Points: {myScore.points} • Correct: {myScore.correct}
                </p>
              ) : null}
            </div>
          </div>

          {/* phase label */}
          <div className="mt-3">
            {phase === "question" ? (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Answer now</p>
            ) : phase === "waiting" ? (
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-300">
                Waiting for lecturer to reveal…
              </p>
            ) : phase === "answer" ? (
              <p className="text-sm font-semibold text-sky-600 dark:text-sky-300">
                {revealText ?? "Answer revealed"}
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Quiz finished</p>
            )}
          </div>
        </div>

        {/* grid */}
        <div className="mt-6">
          <AnswerGrid
            q={q}
            disabled={disabled}
            onSubmitChoice={({ indices }) => submitChoice(indices)}
            onSubmitInput={({ value }) => submitInput(value)}
            onAttemptMatch={q?.type === "matching" ? ({ leftIndex, rightIndex }) => attemptMatch(leftIndex, rightIndex) : undefined}
          />
        </div>

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
