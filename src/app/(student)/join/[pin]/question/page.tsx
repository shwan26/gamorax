// src/app/(student)/join/[pin]/question/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import localFont from "next/font/local";

import Navbar from "@/src/components/Navbar";
import { socket } from "@/src/lib/socket";

import { getCurrentStudent, addPointsToStudent } from "@/src/lib/studentAuthStorage";
import { saveStudentAttempt } from "@/src/lib/studentReportStorage";

import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent } from "@/src/lib/liveStudentSession";
import { getAvatarSrc } from "@/src/lib/studentAvatar";

import AnswerGrid from "@/src/components/live/AnswerGrid";
import { calcPoints } from "@/src/lib/quizScoring";

const caesar = localFont({
  src: "../../../../../../public/fonts/CaesarDressing-Regular.ttf",
});

type QuestionShowPayload = {
  questionIndex?: number;
  number?: number;
  total?: number;
  text?: string;
  answers?: string[];
  startAt?: number;
  durationSec?: number;
  correctIndex?: number;
};

type AnswerRevealPayload = {
  questionIndex?: number;
  correctIndex?: number;
  maxTime?: number; // from server
};

type QuizFinishedPayload = {
  total: number;
  qa: any[];
};

export default function StudentQuestionPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").toString().trim();

  const [mounted, setMounted] = useState(false);
  const [student, setStudent] = useState<LiveStudent | null>(null);

  const [phase, setPhase] = useState<"waiting" | "question" | "result" | "final">("waiting");
  const [question, setQuestion] = useState<{
    questionIndex: number;
    number: number;
    total: number;
    text: string;
    answers: string[];
  } | null>(null);

  // stable refs
  const selectedIndexRef = useRef<number | null>(null);
  const answeredQIndexRef = useRef<number | null>(null);
  const currentQIndexRef = useRef<number>(0);
  const correctIndexRef = useRef<number | null>(null);
  const lastScoredQIndexRef = useRef<number>(-1);

  const myByQRef = useRef<Record<number, { answerIndex: number; timeUsed: number }>>({});
  const correctByQRef = useRef<Record<number, number>>({});
  const maxTimeByQRef = useRef<Record<number, number>>({});

  // UI state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);

  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0);

  const [finalPoints, setFinalPoints] = useState<number>(0);
  const [downloadPayload, setDownloadPayload] = useState<QuizFinishedPayload | null>(null);

  // timer
  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number>(20);
  const durationSecRef = useRef<number>(20);

  const [now, setNow] = useState<number>(0);
  const questionStartAtRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  // load student
  useEffect(() => {
    if (!mounted) return;
    if (!pin) return;

    const me = getCurrentStudent();
    if (!me) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    const s = getOrCreateLiveStudent();
    if (!s) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    setStudent(s);
  }, [mounted, pin, router]);

  const titleText = useMemo(() => (pin ? `Quiz Session - ${pin}` : "Quiz Session"), [pin]);
  const avatarSrc = useMemo(() => getAvatarSrc(student, 96), [student]);

  // timer tick
  useEffect(() => {
    if (phase !== "question") return;
    if (!startAt) return;

    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [phase, startAt]);

  // (optional) if time ends locally, show result screen, but still score only on reveal
  useEffect(() => {
    if (phase !== "question") return;
    if (!startAt) return;

    const limit = durationSec * 1000;
    if (now - startAt >= limit) {
      setStartAt(null);
      questionStartAtRef.current = null;
      setPhase("result");
      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    }
  }, [phase, startAt, now, durationSec]);

  // ✅ STABLE socket listeners (no durationSec/scoredCount deps)
  useEffect(() => {
    if (!mounted) return;
    if (!pin || !student) return;

    fetch("/api/socket").catch(() => {});

    const doJoin = () => socket.emit("join", { pin, student });
    if (socket.connected) doJoin();
    socket.on("connect", doJoin);

    const onQuestionShow = (q: QuestionShowPayload) => {
      const number = Number(q?.number ?? 1);
      const qIndex =
        typeof q?.questionIndex === "number" ? q.questionIndex : Math.max(0, number - 1);

      const total = Number(q?.total ?? 1);
      const text = String(q?.text ?? "");
      const answers = Array.isArray(q?.answers) ? q.answers : [];

      currentQIndexRef.current = qIndex;
      if (typeof q?.correctIndex === "number") correctIndexRef.current = q.correctIndex;

      const sAt = typeof q?.startAt === "number" ? q.startAt : Date.now();
      const dur = Number.isFinite(Number(q?.durationSec)) ? Math.max(1, Number(q.durationSec)) : 20;

      maxTimeByQRef.current[qIndex] = dur;
      durationSecRef.current = dur;

      setStartAt(sAt);
      setDurationSec(dur);
      setNow(Date.now());
      questionStartAtRef.current = sAt;

      setQuestion({ questionIndex: qIndex, number, total, text, answers });
      setPhase("question");

      setSelectedIndex(null);
      selectedIndexRef.current = null;
      answeredQIndexRef.current = null;

      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    };

    // ✅ reveal => IMMEDIATE switch + IMMEDIATE score/points
    const onReveal = (p?: AnswerRevealPayload) => {
      setPhase("result");
      setStartAt(null);
      questionStartAtRef.current = null;

      const qIdx =
        typeof p?.questionIndex === "number" ? p.questionIndex : currentQIndexRef.current;

      const correct =
        typeof p?.correctIndex === "number" ? p.correctIndex : correctIndexRef.current;

      if (typeof p?.maxTime === "number" && Number.isFinite(p.maxTime)) {
        maxTimeByQRef.current[qIdx] = Math.max(1, Math.round(p.maxTime));
      }

      setScoredCount((prev) => Math.max(prev, qIdx + 1));

      if (typeof correct !== "number") {
        setLastWasCorrect(null);
        setLastEarnedPoints(0);
        return;
      }

      correctByQRef.current[qIdx] = correct;

      if (qIdx <= lastScoredQIndexRef.current) return;
      lastScoredQIndexRef.current = qIdx;

      const maxTime = maxTimeByQRef.current[qIdx] ?? durationSecRef.current ?? 0;

      const mine = myByQRef.current[qIdx];
      const picked = answeredQIndexRef.current === qIdx ? selectedIndexRef.current : null;

      const isCorrect = typeof picked === "number" && picked === correct;
      const timeUsed = mine?.timeUsed ?? maxTime;

      const earned = calcPoints({ isCorrect, maxTime, timeUsed });

      setLastWasCorrect(isCorrect);
      setLastEarnedPoints(earned);

      if (isCorrect) setCorrectCount((prev) => prev + 1);
      setTotalPoints((prev) => prev + earned);
    };

    const onNext = () => {
      setPhase("waiting");

      setSelectedIndex(null);
      selectedIndexRef.current = null;
      answeredQIndexRef.current = null;

      setStartAt(null);
      questionStartAtRef.current = null;

      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    };

    const onFinished = (data: any) => {
      const payload: QuizFinishedPayload | null =
        data?.payload && typeof data.payload === "object"
          ? data.payload
          : data && typeof data === "object" && Array.isArray(data.qa)
          ? data
          : null;

      setDownloadPayload(payload ?? null);
      setPhase("final");

      const total = Math.max(1, Number(payload?.total ?? scoredCount ?? 1));

      let computedCorrect = 0;
      let computedPoints = 0;

      const perQuestion = [...Array(total)].map((_, qi) => {
        const mine = myByQRef.current[qi];
        const answerIndex = typeof mine?.answerIndex === "number" ? mine.answerIndex : -1;

        const correctIndex = correctByQRef.current[qi];
        const hasCorrect = typeof correctIndex === "number";

        const maxTime = maxTimeByQRef.current[qi] ?? 0;
        const timeUsed = mine?.timeUsed ?? maxTime;

        const isCorrect = hasCorrect && answerIndex >= 0 && answerIndex === correctIndex;
        const earned = calcPoints({ isCorrect, maxTime, timeUsed });

        if (isCorrect) computedCorrect += 1;
        computedPoints += earned;

        return {
          number: qi + 1,
          answerIndex,
          correctIndex: hasCorrect ? correctIndex : -1,
          timeUsed,
          maxTime,
          isCorrect,
          pointsEarned: earned,
        };
      });

      setFinalPoints(computedPoints);

      const me = getCurrentStudent();
      if (!me) return;

      saveStudentAttempt({
        id: crypto.randomUUID(),
        studentEmail: me.email,
        studentId: me.studentId,
        studentName: me.name,
        avatarSrc: getAvatarSrc(student, 96),

        pin,
        quizTitle: `Quiz ${pin}`,
        totalQuestions: total,
        correct: computedCorrect,
        points: computedPoints,
        finishedAt: new Date().toISOString(),
        perQuestion,
      });

      addPointsToStudent(me.email, computedPoints);
    };

    socket.on("question:show", onQuestionShow);
    socket.on("answer:reveal", onReveal);
    socket.on("question:next", onNext);
    socket.on("quiz:finished", onFinished);

    return () => {
      socket.off("connect", doJoin);
      socket.off("question:show", onQuestionShow);
      socket.off("answer:reveal", onReveal);
      socket.off("question:next", onNext);
      socket.off("quiz:finished", onFinished);
      socket.off("quiz_finished", onFinished);
    };
    // ✅ only mount/pin/student changes can rebind
  }, [mounted, pin, student]);

  const pick = (answerIndex: number) => {
    if (!student || !question) return;
    if (phase !== "question") return;

    if (selectedIndexRef.current !== null) return;

    // if time already over locally, block
    if (startAt) {
      const elapsed = Date.now() - startAt;
      if (elapsed >= durationSec * 1000) return;
    }

    setSelectedIndex(answerIndex);
    selectedIndexRef.current = answerIndex;

    const qIndex = question.questionIndex;
    answeredQIndexRef.current = qIndex;

    const ms = questionStartAtRef.current ? Date.now() - questionStartAtRef.current : 0;
    const timeUsed = Math.max(0, Math.round(ms / 1000));

    myByQRef.current[qIndex] = { answerIndex, timeUsed };

    socket.emit("answer", {
      pin,
      studentId: student.studentId,
      questionIndex: qIndex,
      answerIndex,
      timeUsed,
    });
  };

  const hasPicked = selectedIndex !== null;
  const disableButtons = phase !== "question" || hasPicked;

  const elapsed = startAt ? Math.max(0, now - startAt) : 0;
  const limit = durationSec * 1000;
  const pctRemaining = startAt && limit > 0 ? Math.max(0, 100 - (elapsed / limit) * 100) : 0;
  const remainingSec = startAt ? Math.max(0, Math.ceil((limit - elapsed) / 1000)) : 0;

  const finalDenom = (downloadPayload?.total ?? scoredCount) || 1;

  if (!mounted) return null;
  if (!pin) return <div className="p-6">Missing PIN.</div>;
  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-4 pt-8">
        <p className="text-sm md:text-base font-semibold text-center">{titleText}</p>
      </div>

      {phase === "waiting" && (
        <div className="flex flex-col items-center px-4 pt-14">
          <div className="text-center space-y-6 mb-10">
            <h1 className={`${caesar.className} text-3xl md:text-4xl`}>BE READY TO ANSWER!</h1>
            <h2 className={`${caesar.className} text-2xl md:text-3xl`}>GOOD LUCK!</h2>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-white border shadow-sm overflow-hidden">
              <img src={avatarSrc} alt="Avatar" className="w-20 h-20" />
            </div>
            <p className="text-xs md:text-sm text-gray-700 text-center">
              {student.studentId} - {student.name}
            </p>
          </div>
        </div>
      )}

      {phase === "question" && question && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-sm md:text-base font-medium text-center mb-2">
            Question {question.number} of {question.total}
          </p>

          <div className="w-full max-w-3xl mb-4">
            <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
              <div
                className="h-full transition-[width] duration-100"
                style={{ width: `${pctRemaining}%`, backgroundColor: "#034B6B" }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-600 text-center">{remainingSec}s</div>
          </div>

          <p className="text-sm md:text-base text-gray-700 text-center mb-8 max-w-3xl">
            {question.text}
          </p>

          <AnswerGrid
            selectedIndex={selectedIndex}
            disabled={disableButtons}
            onPick={pick}
            labelClassName={caesar.className}
          />

          <div className="mt-6 text-xs text-gray-600">
            Correct: <span className="font-semibold">{correctCount}</span> · Points:{" "}
            <span className="font-semibold">{totalPoints}</span>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-lg font-semibold">Result</p>

          {lastWasCorrect === true && (
            <p className="mt-2 text-green-600 font-semibold">
              Correct! +{lastEarnedPoints} points
            </p>
          )}
          {lastWasCorrect === false && (
            <p className="mt-2 text-red-600 font-semibold">Incorrect · +0 points</p>
          )}
          {lastWasCorrect === null && <p className="mt-2 text-gray-600">Waiting for host reveal…</p>}

          <p className="text-sm text-gray-600 mt-6">Total correct:</p>
          <p className={`${caesar.className} text-5xl mt-2`}>
            {correctCount}/{Math.max(1, scoredCount)}
          </p>

          <p className="mt-4 text-sm text-gray-700">
            Total points: <span className="font-semibold">{totalPoints}</span>
          </p>
        </div>
      )}

      {phase === "final" && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-lg font-semibold">Final Score</p>

          <p className={`${caesar.className} text-6xl mt-4`}>
            {correctCount}/{finalDenom}
          </p>

          <p className="mt-4 text-sm text-gray-700">
            Points earned: <span className="font-semibold">{finalPoints}</span>
          </p>

          <button
            onClick={() => router.push("/me/reports")}
            className="mt-8 px-6 py-3 rounded-full bg-[#3B8ED6] hover:bg-[#2F79B8] text-white font-semibold"
            type="button"
          >
            Go to My Reports
          </button>
        </div>
      )}
    </div>
  );
}
