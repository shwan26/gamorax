"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import { getGameById, updateGameTimer } from "@/src/lib/gameStorage";

export default function GameSettingPage() {
  const { id } = useParams<{ id: string }>();
  const game = getGameById(id);

  const [mode, setMode] = useState<"automatic" | "manual">(
    game?.timer.mode || "automatic"
  );
  const [time, setTime] = useState(
    game?.timer.defaultTime || 60
  );

  if (!game) return null;

  function handleSave() {
    updateGameTimer(id, {
      mode,
      defaultTime: time,
    });
    alert("Timer setting saved");
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${game.courseCode} (${game.section}) ${game.semester}`}
      />

      <div className="px-6 mt-6">
        <h3 className="font-semibold mb-4">Timer</h3>

        <label className="flex items-center gap-3 mb-4">
          <input
            type="radio"
            checked={mode === "automatic"}
            onChange={() => setMode("automatic")}
          />
          Automatic
          <input
            type="number"
            value={time}
            onChange={(e) => setTime(+e.target.value)}
            className="border rounded-md w-20 px-2 py-1"
          />
          seconds
        </label>

        <label className="flex items-center gap-3">
          <input
            type="radio"
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
          />
          Manual
        </label>

        <button
          onClick={handleSave}
          className="mt-6 bg-[#6AB6E9] px-6 py-2 rounded-md font-medium"
        >
          Save
        </button>
      </div>
    </div>
  );
}
