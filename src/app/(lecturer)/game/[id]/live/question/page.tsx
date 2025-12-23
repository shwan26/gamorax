"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import { getQuestions } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";

import QuestionView from "@/src/components/live/QuestionView";
import AnswerReveal from "@/src/components/live/AnswerReveal";
import FinalBoard from "@/src/components/live/FinalBoard";

function getIdFromParams(params: any): string {
  const v = params?.id;
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

// ✅ WORKS with your questionStorage format (answers: {text, correct})
function toCorrectIndex(q: { answers: { correct: boolean }[] } | null | undefined): number | null {
  const idx = q?.answers?.findIndex((a) => a.correct === true);
  return typeof idx === "number" && idx >= 0 ? idx : null;
}

function answersToTextArray(q: any): string[] {
  const a = q?.answers ?? [];
  if (!Array.isArray(a)) return [];

  // objects -> text[]
  if (a.length && typeof a[0] === "object") {
    return a.map((x: any) => String(x?.text ?? ""));
  }

  // already strings
  return a.map((x: any) => String(x ?? ""));
}

export default function TeacherLiveFlowPage() {
  const rawParams = useParams();
  const id = getIdFromParams(rawParams);

  const searchParams = useSearchParams();
  const pin = searchParams?.get("pin") ?? "";

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);
  const questions = useMemo(() => (id ? getQuestions(id) : []), [id]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0);

  const q = questions[qIndex];

  // live counts from server
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [totalAnswers, setTotalAnswers] = useState(0);

  // ✅ join room once so lecturer receives answer:count
  useEffect(() => {
    if (!pin) return;
    fetch("/api/socket").catch(() => {});
    socket.emit("join", { pin });
  }, [pin]);

  // listen for answer counts
  useEffect(() => {
    const onCount = (p: any) => {
      if (!p) return;
      if (p.questionIndex === qIndex) {
        setCounts(Array.isArray(p.counts) ? p.counts : [0, 0, 0, 0]);
        setTotalAnswers(Number(p.totalAnswers ?? 0));
      }
    };

    socket.on("answer:count", onCount);

    // ✅ IMPORTANT: cleanup must return void
    return () => {
      socket.off("answer:count", onCount);
    };
  }, [qIndex]);


  // broadcast question whenever status === "question"
  useEffect(() => {
    if (!pin || !q || status !== "question") return;

    fetch("/api/socket").catch(() => {});

    const answers = Array.isArray(q.answers) ? q.answers.map((a) => a.text ?? "") : [];
    const correctIndex = toCorrectIndex(q);

    socket.emit("question:show", {
      pin,
      question: {
        questionIndex: qIndex,
        number: qIndex + 1,
        total: questions.length,
        text: q.text ?? "",          // ✅ FIX: no q.question
        answers,                     // ✅ FIX: string[]
        ...(typeof correctIndex === "number" ? { correctIndex } : {}),
      },
    });

    setCounts([0, 0, 0, 0]);
    setTotalAnswers(0);
  }, [pin, q, qIndex, questions.length, status]);


  function showAnswer() {
    if (!pin || !q) return;

    const correctIndex = toCorrectIndex(q);
    if (correctIndex === null) {
      console.error("Cannot detect correct answer for question:", q);
      alert(
        "Correct answer not found.\n\nFix: In questionStorage, one of answers must have correct=true."
      );
      return;
    }

    // ✅ reveal includes correctIndex so students can score
    socket.emit("reveal", { pin, questionIndex: qIndex, correctIndex });
    setStatus("answer");
  }

  function next() {
    if (!pin) return;

    // final
    if (qIndex + 1 >= questions.length) {
      // ✅ build payload for student download
      const qa = questions.map((qq: any, idx: number) => {
        const answers = answersToTextArray(qq);
        const ci = toCorrectIndex(qq);
        const choice = (["A", "B", "C", "D"] as const)[ci ?? 0] ?? "A";
        return {
          number: idx + 1,
          question: qq.text ?? qq.question ?? "",
          answers,
          correctChoice: choice,
          correctAnswerText: typeof ci === "number" ? (answers[ci] ?? "") : "",
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
            <QuestionView q={q} index={qIndex} total={questions.length} startAt={null} />

            <div className="mt-6 text-sm text-gray-600">
              Live counts (total {totalAnswers}): A {counts[0]} | B {counts[1]} | C{" "}
              {counts[2]} | D {counts[3]}
            </div>

            <div className="flex justify-end mt-10">
              <button
                onClick={showAnswer}
                className="bg-[#3B8ED6] text-white px-10 py-3 rounded-full"
              >
                Show Answer
              </button>
            </div>
          </>
        )}

        {status === "answer" && (
          <>
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
