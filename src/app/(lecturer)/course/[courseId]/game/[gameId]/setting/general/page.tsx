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
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const g = getGameById(gameId);
    setGame(g);

    setQuizNumber(g?.quizNumber ?? "");
    setShuffleQuestions(!!g?.shuffleQuestions);
    setShuffleAnswers(!!g?.shuffleAnswers);
  }, [gameId]);

  if (!gameId) return <div className="p-6">Missing game id in URL.</div>;
  if (!game) return <div className="p-6">Game not found.</div>;

  function handleSave() {
    updateGame(gameId, {
      quizNumber,
      shuffleQuestions,
      shuffleAnswers,
    });
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

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Quiz Number / Title</label>
        <input
          value={quizNumber}
          onChange={(e) => setQuizNumber(e.target.value)}
          className="border rounded-md px-3 py-2 w-full"
          placeholder="Eg. Game 1"
        />
      </div>

      {/* ✅ Shuffle Options */}
      <div className="mb-6 space-y-3">
        <p className="text-sm font-medium">Shuffle in Live Mode</p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffleQuestions}
            onChange={(e) => setShuffleQuestions(e.target.checked)}
          />
          Shuffle Questions
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffleAnswers}
            onChange={(e) => setShuffleAnswers(e.target.checked)}
          />
          Shuffle Answers (A/B/C/D order)
        </label>

        <p className="text-xs text-gray-500">
          These shuffles apply only during Live sessions. Your editor order stays the same.
        </p>
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
