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

export default function TeacherLiveFlowPage() {
  const params = useParams<{ id?: string }>();
  const id = (params?.id ?? "").toString();

  const searchParams = useSearchParams();
  const pin = (searchParams ?? new URLSearchParams()).get("pin") ?? "";

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);
  const questions = useMemo(() => (id ? getQuestions(id) : []), [id]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0);

  const q = questions[qIndex];

  // ✅ whenever we are on a question, broadcast it to students
  useEffect(() => {
    if (!pin) return;
    if (!q) return;
    if (status !== "question") return;

    fetch("/api/socket").catch(() => {});
    socket.emit("question:show", {
      pin,
      question: {
        number: qIndex + 1,
        total: questions.length,
        text: (q as any).question ?? (q as any).text ?? "",
        answers: (q as any).answers ?? (q as any).choices ?? (q as any).options ?? [],
      },
    });
  }, [pin, q, qIndex, questions.length, status]);

  function showAnswer() {
    if (!pin) return;
    socket.emit("reveal", { pin });
    setStatus("answer");
  }

  function next() {
    if (!pin) return;

    if (qIndex + 1 >= questions.length) {
      setStatus("final");
      return;
    }

    setQIndex((prev) => prev + 1);
    setStatus("question");
    socket.emit("next", { pin });
  }

  if (!game) return null;
  if (!q) return <div className="min-h-screen bg-white"><Navbar /><p className="p-10">No questions found.</p></div>;

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
            <div className="flex justify-end mt-10">
              <button onClick={showAnswer} className="bg-[#3B8ED6] text-white px-10 py-3 rounded-full">
                Show Answer
              </button>
            </div>
          </>
        )}

        {status === "answer" && (
          <>
            <AnswerReveal q={q} counts={[]} />
            <div className="flex justify-end mt-10">
              <button onClick={next} className="bg-[#3B8ED6] text-white px-10 py-3 rounded-full">
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
