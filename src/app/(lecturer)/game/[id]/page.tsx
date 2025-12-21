"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGameById, Game } from "@/src/lib/gameStorage";

export default function GameSlotPage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!id) return;
    const foundGame = getGameById(id);
    setGame(foundGame);
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {game
              ? `${game.courseCode} (${game.section}) ${game.semester}`
              : "Game"}
          </h2>

          <input
            className="border px-4 py-2 rounded-md w-60"
            placeholder="Search"
          />
        </div>

        {/* Create Question Card — ALWAYS visible */}
        <Link
          href={`/game/${id}/question`}
          className="w-64 h-36 bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                     rounded-xl shadow-md hover:scale-105 transition
                     flex items-center justify-center gap-3"
        >
          <span className="text-3xl font-bold">＋</span>
          <span className="text-lg font-medium">Create Gamorax</span>
        </Link>

        {/* Optional empty state */}
        {!game && (
          <p className="mt-4 text-sm text-gray-500">
            Game details not found (mock data).
          </p>
        )}
      </div>
    </div>
  );
}
