"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import { getQuestions, type Question } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";

import QuestionView from "@/src/components/live/QuestionView";
import AnswerReveal from "@/src/components/live/AnswerReveal";
import FinalBoard from "@/src/components/live/FinalBoard";

// ✅ your Question type: answers: { text, correct }[]
function toCorrectIndex(q: Question | any): number | null {
  if (!q) return null;

  // primary: boolean correct flag
  if (Array.isArray(q.answers) && q.answers.length) {
    const idx = q.answers.findIndex((a: any) => a?.correct === true);
    if (idx >= 0) return idx;
  }

  // fallback: some older formats
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
  return 20; // fallback default
}

export default function TeacherLiveFlowPage() {
  const params = useParams() as { id?: string } | null;
  const id = (params?.id ?? "").toString();

  const searchParams = useSearchParams();
  const pin = searchParams?.get("pin") ?? "";

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!id) return;
    setQuestions(getQuestions(id));
  }, [id]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0);

  const q = questions[qIndex];

  // live counts
  const [counts, setCounts] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [totalAnswers, setTotalAnswers] = useState(0);

  // ✅ timer state
  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number>(20);
  const [now, setNow] = useState<number>(() => Date.now());

  // ✅ prevent multiple auto-reveals
  const autoRevealedRef = useRef(false);

  // join room once (so lecturer can receive answer:count)
  useEffect(() => {
    if (!pin) return;
    fetch("/api/socket").catch(() => {});
    socket.emit("join", { pin });

    // cleanup MUST return void or function, not socket
    return () => {
      // do not disconnect shared socket
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

    socket.on("answer:count", onCount);
    return () => {
      socket.off("answer:count", onCount);
    };
  }, [qIndex]);

  // ✅ broadcast question whenever status === "question"
  useEffect(() => {
    if (!pin || !q || status !== "question") return;

    fetch("/api/socket").catch(() => {});

    const correctIndex = toCorrectIndex(q);
    const answersText = Array.isArray(q.answers) ? q.answers.map((a) => a.text) : [];
    const dur = getDurationSec(q);

    // ✅ start timer for this question
    const sAt = Date.now();
    setStartAt(sAt);
    setDurationSec(dur);
    setNow(Date.now());
    autoRevealedRef.current = false;

    // reset counts display locally (server will also broadcast current counts)
    setCounts([0, 0, 0, 0]);
    setTotalAnswers(0);

    socket.emit("question:show", {
      pin,
      question: {
        questionIndex: qIndex,
        number: qIndex + 1,
        total: questions.length,
        text: q.text ?? "",
        answers: answersText,

        // store correctIndex on server (NOT broadcast to students)
        ...(typeof correctIndex === "number" ? { correctIndex } : {}),

        // ✅ timer sync (students can render same blue line)
        startAt: sAt,
        durationSec: dur,
      },
    });
  }, [pin, q, qIndex, questions.length, status]);

  // ✅ timer tick loop (updates "now" while on question)
  useEffect(() => {
    if (status !== "question") return;
    if (!startAt) return;

    const t = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(t);
  }, [status, startAt]);

  // ✅ auto reveal when time is up
  useEffect(() => {
    if (status !== "question") return;
    if (!q) return;
    if (!startAt) return;

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

    const correctIndex = toCorrectIndex(q);
    if (correctIndex === null) {
      console.error("Cannot detect correct answer for question:", q);
      if (!isAuto) alert("Correct answer not found. Check question format.");
      return;
    }

    // ✅ stop timer immediately so auto-reveal can't fire again
    autoRevealedRef.current = true;
    setStartAt(null);

    socket.emit("reveal", { pin, questionIndex: qIndex, correctIndex });
    setStatus("answer");
  }


  function next() {
    if (!pin) return;

    // ✅ IMPORTANT: clear previous timer BEFORE setting status="question"
    setStartAt(null);
    setNow(Date.now());
    autoRevealedRef.current = false;

    // last question -> finish
    if (qIndex + 1 >= questions.length) {
      const qa = questions.map((qq: any, idx: number) => {
        const answers = Array.isArray(qq.answers) ? qq.answers.map((a: any) => a.text) : [];
        const ci = toCorrectIndex(qq);
        const correctChoice = (["A", "B", "C", "D"] as const)[ci ?? 0] ?? "A";
        return {
          number: idx + 1,
          question: qq.text ?? "",
          answers,
          correctChoice,
          correctAnswerText: typeof ci === "number" ? answers[ci] ?? "" : "",
        };
      });

      socket.emit("finish", { pin, payload: { total: questions.length, qa } });
      setStatus("final");
      return;
    }

    setQIndex((prev) => prev + 1);
    setStatus("question");
    socket.emit("next", { pin });
  }

  if (!game) return null;
  if (!q) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <p className="p-10">No questions found.</p>
      </div>
    );
  }

  // ✅ timer bar values (FULL -> EMPTY)
  const elapsed = startAt ? Math.max(0, now - startAt) : 0;
  const limit = durationSec * 1000;

  const pctRemaining =
    startAt && limit > 0 ? Math.max(0, 100 - (elapsed / limit) * 100) : 0;

  const remainingSec =
    startAt ? Math.max(0, Math.ceil((limit - elapsed) / 1000)) : 0;


  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="px-10 mt-6">
        <h2 className="font-semibold">
          {game.quizNumber} – {game.courseCode} ({game.section}) {game.semester}
        </h2>
        <p className="text-sm text-gray-600 mt-1">PIN: {pin || "(missing)"}</p>
      </div>

      

      <div className="px-10 mt-10">
        {status === "question" && (
        <>
          {startAt && (
            <div className="w-full max-w-3xl mt-4">
              <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full transition-[width] duration-100"
                  style={{ width: `${pctRemaining}%`, backgroundColor: "#034B6B" }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-600 text-center">{remainingSec}s</div>
            </div>
          )}

          <QuestionView q={q} index={qIndex} total={questions.length} startAt={null} />

          

          <div className="mt-6 text-sm text-gray-600">
            Live counts: A {counts[0]} | B {counts[1]} | C {counts[2]} | D {counts[3]}
            <span className="ml-2">(Total: {totalAnswers})</span>
          </div>

          <div className="flex justify-end mt-10">
            <button
              onClick={() => showAnswer(false)}
              className="bg-[#3B8ED6] text-white px-10 py-3 rounded-full"
            >
              Show Answer
            </button>
          </div>
        </>
      )}


        {status === "answer" && (
          <>
            {/* ✅ show question ALSO on answer screen */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">
                Question {qIndex + 1} of {questions.length}
              </div>
              <div className="text-lg font-semibold">{q.text}</div>
            </div>

            <AnswerReveal q={q} counts={counts} />

            <div className="flex justify-end mt-10">
              <button
                onClick={next}
                className="bg-[#3B8ED6] text-white px-10 py-3 rounded-full"
              >
                Next
              </button>
            </div>
          </>
        )}

        {status === "final" && <FinalBoard ranked={[]} total={questions.length} />}
      </div>
    </div>
  );
}
