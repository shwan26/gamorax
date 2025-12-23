"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import localFont from "next/font/local";

import Navbar from "@/src/components/Navbar";
import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getLiveByPin } from "@/src/lib/liveStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { socket } from "@/src/lib/socket";

const caesar = localFont({
  src: "../../../../../../public/fonts/CaesarDressing-Regular.ttf",
});

type QuestionShowPayload = {
  // lecturer should send these
  questionIndex?: number; // 0-based (preferred)
  number?: number; // 1-based (fallback)
  total?: number;
  text?: string;
  answers?: string[];
  // optional but recommended (so student can score even if reveal sends no payload)
  correctIndex?: number; // 0-3
};

type QAItem = {
  number: number;
  question: string;
  answers: string[];
  correctChoice: "A" | "B" | "C" | "D";
  correctAnswerText: string;
};

type QuizFinishedPayload = {
  total: number;
  qa: QAItem[];
};

export default function StudentQuestionPage() {
  const router = useRouter();
  const params = useParams() as { pin?: string } | null;
  const pin = (params?.pin ?? "").toString();

  const [game, setGame] = useState<Game | null>(null);
  const [student, setStudent] = useState<LiveStudent | null>(null);

  const [phase, setPhase] = useState<"waiting" | "question" | "result" | "final">(
    "waiting"
  );

  const [question, setQuestion] = useState<{
    questionIndex: number; // 0-based
    number: number; // 1-based
    total: number;
    text: string;
    answers: string[];
  } | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedIndexRef = useRef<number | null>(null);

  const answeredQIndexRef = useRef<number | null>(null);

  const currentQIndexRef = useRef<number>(0);
  const correctIndexRef = useRef<number | null>(null);
  const lastScoredQIndexRef = useRef<number>(-1);

  const [score, setScore] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);

  const questionStartAtRef = useRef<number | null>(null);

  const [downloadPayload, setDownloadPayload] = useState<QuizFinishedPayload | null>(
    null
  );

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // Load student
  useEffect(() => {
    if (!pin) return;

    const raw = sessionStorage.getItem("gamorax_live_student");
    if (!raw) {
      router.push(`/join/${encodeURIComponent(pin)}`);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as LiveStudent;
      if (!parsed?.studentId || !parsed?.name) {
        router.push(`/join/${encodeURIComponent(pin)}`);
        return;
      }
      setStudent(parsed);
    } catch {
      router.push(`/join/${encodeURIComponent(pin)}`);
      return;
    }

    // Optional: title only works if same browser has liveStorage
    const live = getLiveByPin(pin);
    if (live?.gameId) setGame(getGameById(live.gameId));
  }, [pin, router]);

  const titleText = useMemo(() => {
    if (game)
      return `${game.quizNumber} - ${game.courseCode} (${game.section}) ${game.semester}`;
    return pin ? `Quiz Session - ${pin}` : "Quiz Session";
  }, [game, pin]);

  // Socket listeners (shared socket)
  useEffect(() => {
    if (!pin || !student) return;

    // ensure /api/socket is compiled once (optional but helps in dev)
    fetch("/api/socket").catch(() => {});

    const join = () => {
      socket.emit("join", { pin, student });
    };

    if (socket.connected) join();
    else socket.once("connect", join);

    const onQuestionShow = (q: QuestionShowPayload) => {
      const number = Number(q?.number ?? 1);
      const qIndex =
        typeof q?.questionIndex === "number" ? q.questionIndex : Math.max(0, number - 1);

      const total = Number(q?.total ?? 1);
      const text = String(q?.text ?? "");
      const answers = Array.isArray(q?.answers) ? q.answers : [];

      currentQIndexRef.current = qIndex;

      // store correctIndex if lecturer included it (recommended)
      if (typeof q?.correctIndex === "number") {
        correctIndexRef.current = q.correctIndex;
      }

      // reset per-question state
      setQuestion({
        questionIndex: qIndex,
        number,
        total,
        text,
        answers,
      });

      setPhase("question");
      setSelectedIndex(null);
      selectedIndexRef.current = null;

      answeredQIndexRef.current = null;
      setLastWasCorrect(null);

      questionStartAtRef.current = Date.now();
    };

    // lecturer reveal: sometimes payload is empty in your server → handle both
    const onReveal = (p?: { questionIndex?: number; correctIndex?: number }) => {
      setPhase("result");

      const qIdx =
        typeof p?.questionIndex === "number" ? p.questionIndex : currentQIndexRef.current;

      const correct =
        typeof p?.correctIndex === "number" ? p.correctIndex : correctIndexRef.current;

      // count revealed/scored questions
      setScoredCount((prev) => Math.max(prev, qIdx + 1));

      // if we still don't know correct, we can't evaluate correctness
      if (typeof correct !== "number") {
        setLastWasCorrect(null);
        return;
      }

      // prevent double score
      if (qIdx <= lastScoredQIndexRef.current) return;

      const picked = selectedIndexRef.current;
      const answeredQ = answeredQIndexRef.current;

      const isCorrect = answeredQ === qIdx && picked === correct;
      setLastWasCorrect(isCorrect);

      if (isCorrect) setScore((prev) => prev + 1);

      lastScoredQIndexRef.current = qIdx;
    };

    const onNext = () => {
      setPhase("waiting");
      setSelectedIndex(null);
      selectedIndexRef.current = null;
      answeredQIndexRef.current = null;
      setLastWasCorrect(null);
      questionStartAtRef.current = null;
      // don't clear question; we can keep it or clear it
    };

    // support a few payload shapes
    const onFinished = (data: any) => {
      const payload: QuizFinishedPayload | null =
        data?.payload && typeof data.payload === "object"
          ? data.payload
          : data && typeof data === "object" && Array.isArray(data.qa)
          ? data
          : null;

      if (!payload) return;

      setDownloadPayload(payload);
      setPhase("final");
    };

    socket.on("question:show", onQuestionShow);
    socket.on("answer:reveal", onReveal);
    socket.on("question:next", onNext);

    // support both names
    socket.on("quiz:finished", onFinished);
    socket.on("quiz_finished", onFinished);

    return () => {
      socket.off("question:show", onQuestionShow);
      socket.off("answer:reveal", onReveal);
      socket.off("question:next", onNext);
      socket.off("quiz:finished", onFinished);
      socket.off("quiz_finished", onFinished);
      socket.off("connect", join);
      // ✅ do NOT disconnect shared socket
    };
  }, [pin, student]);

  const pick = (answerIndex: number) => {
    if (!student || !question) return;
    if (phase !== "question") return;

    // hard lock
    if (selectedIndexRef.current !== null) return;

    setSelectedIndex(answerIndex);
    selectedIndexRef.current = answerIndex;

    const qIndex = question.questionIndex;
    answeredQIndexRef.current = qIndex;

    const ms = questionStartAtRef.current ? Date.now() - questionStartAtRef.current : 0;
    const timeUsed = Math.max(0, Math.round(ms / 1000));

    socket.emit("answer", {
      pin,
      studentId: student.studentId,
      questionIndex: qIndex,
      answerIndex,
      timeUsed,
    });
  };

  const disableButtons = phase !== "question" || selectedIndex !== null;

  const downloadQA = () => {
    if (!downloadPayload) return;

    const lines: string[] = [];
    lines.push("Quiz Questions & Answers");
    lines.push(`PIN: ${pin}`);
    lines.push(`Total Questions: ${downloadPayload.total}`);
    lines.push("");

    for (const item of downloadPayload.qa) {
      lines.push(`Q${item.number}: ${item.question}`);
      lines.push(`A: ${item.answers[0] ?? ""}`);
      lines.push(`B: ${item.answers[1] ?? ""}`);
      lines.push(`C: ${item.answers[2] ?? ""}`);
      lines.push(`D: ${item.answers[3] ?? ""}`);
      lines.push(`Correct: ${item.correctChoice} - ${item.correctAnswerText}`);
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-${pin}-questions-answers.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const finalDenom = (downloadPayload?.total ?? scoredCount) || 1;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-4 pt-8">
        <p className="text-sm md:text-base font-semibold text-center">{titleText}</p>
      </div>

      {/* WAITING */}
      {phase === "waiting" && student && (
        <div className="flex flex-col items-center px-4 pt-14">
          <div className="text-center space-y-6 mb-10">
            <h1 className={`${caesar.className} text-3xl md:text-4xl`}>BE READY TO ANSWER!</h1>
            <h2 className={`${caesar.className} text-2xl md:text-3xl`}>GOOD LUCK!</h2>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-white border shadow-sm overflow-hidden">
              <Image
                src={student.avatarSrc || "/icons/student.png"}
                alt="Avatar"
                width={80}
                height={80}
                priority
              />
            </div>
            <p className="text-xs md:text-sm text-gray-700 text-center">
              {student.studentId} - {student.name}
            </p>
          </div>
        </div>
      )}

      {/* QUESTION */}
      {phase === "question" && question && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-sm md:text-base font-medium text-center mb-2">
            Question {question.number} of {question.total}
          </p>

          <p className="text-sm md:text-base text-gray-700 text-center mb-8 max-w-3xl">
            {question.text}
          </p>

          <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-3xl">
            {["A", "B", "C", "D"].map((label, idx) => (
              <button
                key={label}
                disabled={disableButtons}
                onClick={() => pick(idx)}
                className={`h-24 md:h-28 rounded-lg shadow-md flex items-center justify-center
                  active:scale-[0.98] transition
                  ${disableButtons && selectedIndex !== idx ? "opacity-60" : ""} ${
                  selectedIndex === idx ? "ring-4 ring-white/80" : ""
                } ${
                  idx === 0
                    ? "bg-red-600"
                    : idx === 1
                    ? "bg-indigo-700"
                    : idx === 2
                    ? "bg-green-600"
                    : "bg-yellow-300"
                }`}
                type="button"
              >
                <span className={`${caesar.className} text-4xl md:text-5xl ${idx === 3 ? "text-black" : "text-white"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === "result" && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-lg font-semibold">Result</p>

          {lastWasCorrect === true && <p className="mt-2 text-green-600 font-semibold">Correct!</p>}
          {lastWasCorrect === false && <p className="mt-2 text-red-600 font-semibold">Incorrect</p>}
          {lastWasCorrect === null && <p className="mt-2 text-gray-600">Waiting…</p>}

          <p className="text-sm text-gray-600 mt-4">Your score:</p>
          <p className={`${caesar.className} text-5xl mt-2`}>
            {score}/{Math.max(1, scoredCount)}
          </p>

          <p className="text-sm text-gray-600 mt-4">Waiting for next question…</p>
        </div>
      )}

      {/* FINAL */}
      {phase === "final" && student && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-lg font-semibold">Final Score</p>

          <p className={`${caesar.className} text-6xl mt-4`}>
            {score}/{finalDenom}
          </p>

          <button
            onClick={downloadQA}
            disabled={!downloadPayload}
            className="mt-6 px-5 py-2 rounded-md text-xs font-semibold text-white shadow-sm
                       bg-gradient-to-r from-[#0593D1] to-[#034B6B]
                       hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            type="button"
          >
            Download questions and answers!
          </button>
        </div>
      )}
    </div>
  );
}
