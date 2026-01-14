"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { saveGame } from "@/src/lib/gameStorage";

export default function CreateGamePage() {
  const router = useRouter();
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();

  const [quizNumber, setQuizNumber] = useState("");

  function handleCreate() {
    if (!courseId) return;

    if (!quizNumber.trim()) {
      alert("Please fill quiz number/title.");
      return;
    }

    const id = crypto.randomUUID();

    saveGame({
      id,
      courseId,
      quizNumber,
      timer: { mode: "automatic", defaultTime: 60 }, // always 60 seconds
    });

    router.push(`/course/${courseId}/game/${id}/question`);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 px-4">
        <h2 className="text-2xl font-bold mb-8">Create new game</h2>

        <div className="w-full max-w-lg space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Quiz Number / Title
            </label>
            <input
              value={quizNumber}
              onChange={(e) => setQuizNumber(e.target.value)}
              placeholder="Eg. Game 1"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={handleCreate}
            className="w-full bg-[#3B8ED6] hover:bg-[#2F79B8] text-white py-2 rounded-md font-semibold shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
