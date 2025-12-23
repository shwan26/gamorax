"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import { getQuestions } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";
import { getCurrentLivePin } from "@/src/lib/liveStorage"; // ✅ add this

import QuestionView from "@/src/components/live/QuestionView";
import AnswerReveal from "@/src/components/live/AnswerReveal";
import FinalBoard from "@/src/components/live/FinalBoard";

export default function TeacherLiveFlowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ pin from URL, fallback to localStorage (same browser)
  const pin = searchParams.get("pin") || getCurrentLivePin(id) || "";

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);
  const questions = useMemo(() => (id ? getQuestions(id) : []), [id]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0);

  const q = questions[qIndex];

  // ✅ Ensure socket server is ready + start game when entering this page
  useEffect(() => {
    if (!pin) return;
    fetch("/api/socket").catch(() => {});
    socket.emit("start", { pin }); // ✅ this triggers "game:start" to students
  }, [pin]);

  function showAnswer() {
    if (!pin) return;
    socket.emit("reveal", { pin }); // ✅ server expects { pin }
    setStatus("answer");
  }

  function next() {
    if (!pin) return;

    if (qIndex + 1 === questions.length) {
      setStatus("final");
      return;
    }

    setQIndex((prev) => prev + 1);
    setStatus("question");
    socket.emit("next", { pin }); // ✅ server expects { pin }
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
            <QuestionView q={q} index={qIndex} total={questions.length} startAt={null} />
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
            <AnswerReveal q={q} counts={[]} />
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
