"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";
import { getGames, Game } from "@/src/lib/gameStorage";

export default function LecturerDashboard() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    setGames(getGames());
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Dashboard</h2>

          <input
            type="text"
            placeholder="Search"
            className="border px-4 py-2 rounded-md w-60"
          />
        </div>

        {/* Game Cards */}
        <div className="flex gap-6 flex-wrap">
          {/* Create New Game */}
          <Link
            href="/game/create"
            className="bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                       px-10 py-10 rounded-xl shadow-md hover:scale-105
                       transition flex items-center gap-4"
          >
            <span className="text-3xl font-bold">＋</span>
            <span className="text-lg">Create new game</span>
          </Link>

          {/* Existing Games */}
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/game/${game.id}`}
              className="w-64 h-36 bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                         rounded-xl shadow-md hover:scale-105 transition
                         flex flex-col items-center justify-center text-center"
            >
              <p className="font-semibold">{game.courseCode} ({game.section})</p>
              <p className="text-sm">{game.semester}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
