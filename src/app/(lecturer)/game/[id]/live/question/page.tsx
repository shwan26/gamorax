"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import { getQuestions } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";

import QuestionView from "@/src/components/live/QuestionView";
import AnswerReveal from "@/src/components/live/AnswerReveal";
import FinalBoard from "@/src/components/live/FinalBoard";

export default function TeacherLiveFlowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const game = useMemo(() => id && getGameById(id), [id]);
  const questions = useMemo(() => id ? getQuestions(id) : [], [id]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);

  const q = questions[qIndex];

  useEffect(() => {
    socket.emit("start", { gameId: id });

    socket.on("timer:start", ({ startAt }) => setStartAt(startAt));
    socket.on("answer:count", (data) => setAnswers(data));
    socket.on("final:score", (data) => setScores(data));

    return () => {
      socket.off();
    };
  }, [id]);

  function showAnswer() {
    socket.emit("reveal", { index: qIndex });
    setStatus("answer");
  }

  function next() {
    if (qIndex + 1 === questions.length) {
      setStatus("final");
    } else {
      setQIndex(qIndex + 1);
      setStatus("question");
      socket.emit("next");
    }
  }

  if (!game || !q) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="px-10 mt-6">
        <h2 className="font-semibold">
          {game.quizNumber} – {game.courseCode} ({game.section}) {game.semester}
        </h2>
      </div>

      <div className="px-10 mt-10">
        {status === "question" && (
          <>
            <QuestionView
              q={q}
              index={qIndex}
              total={questions.length}
              startAt={startAt}
            />

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
            <AnswerReveal q={q} counts={answers} />
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

        {status === "final" && (
          <FinalBoard ranked={scores} total={questions.length} />
        )}
      </div>
    </div>
  );
}
