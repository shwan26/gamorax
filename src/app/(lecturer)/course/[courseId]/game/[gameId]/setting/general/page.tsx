"use client";

import { useParams, useRouter } from "next/navigation";
import { getGameById, updateGame, deleteGame, type Game } from "@/src/lib/gameStorage";
import { useEffect, useState } from "react";

export default function GeneralSettingPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [quizNumber, setQuizNumber] = useState("");

  useEffect(() => {
    if (!gameId) return;
    const g = getGameById(gameId);
    setGame(g);
    setQuizNumber(g?.quizNumber ?? "");
  }, [gameId]);

  if (!gameId) return <div className="p-6">Missing game id in URL.</div>;
  if (!game) return <div className="p-6">Game not found.</div>;

  function handleSave() {
    updateGame(gameId, { quizNumber });
    alert("General settings updated");
  }

  function handleDelete() {
    if (!confirm("This will delete the entire quiz and all data. Continue?")) return;
    deleteGame(gameId);
    router.push(`/course/${courseId}`);
  }

  return (
    <>
      <h3 className="font-semibold mb-6">General</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Quiz Number / Title</label>
        <input
          value={quizNumber}
          onChange={(e) => setQuizNumber(e.target.value)}
          className="border rounded-md px-3 py-2 w-full"
          placeholder="Eg. Game 1"
        />
      </div>

      <button onClick={handleSave} className="bg-[#6AB6E9] px-6 py-2 rounded-md">
        Save
      </button>

      <br />
      <br />

      <button onClick={handleDelete} className="text-red-600 font-medium">
        Delete Entire Quiz
      </button>
    </>
  );
}
