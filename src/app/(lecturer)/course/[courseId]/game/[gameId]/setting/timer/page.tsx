"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getGameById, updateGameTimer, type Game } from "@/src/lib/gameStorage";
import { getQuestions, saveQuestions } from "@/src/lib/questionStorage";

export default function TimerSettingPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const gameId = (params?.gameId ?? "").toString();

  const [game, setGame] = useState<Game | null>(null);

  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [defaultTime, setDefaultTime] = useState<number>(60);

  // load on client (localStorage safe)
  useEffect(() => {
    if (!gameId) return;
    const g = getGameById(gameId);
    setGame(g);

    if (g) {
      setMode(g.timer.mode);
      setDefaultTime(g.timer.defaultTime);
    }
  }, [gameId]);

  if (!gameId) return <div className="p-6">Missing game id.</div>;
  if (!game) return <div className="p-6">Loading...</div>;

  function handleSave() {
    updateGameTimer(gameId, { mode, defaultTime });

    const updated = getQuestions(gameId).map((q) => {
      if (mode === "automatic") {
        return {
          ...q,
          timeMode: "default" as const,
          time: defaultTime,
        };
      }

      const t = Number(q.time);
      return {
        ...q,
        timeMode: "specific" as const,
        time: Number.isFinite(t) && t > 0 ? t : defaultTime,
      };
    });

    saveQuestions(gameId, updated);

    alert("Timer setting saved");
  }


  return (
    <>
      <h3 className="font-semibold mb-6">Timer</h3>

      {/* AUTOMATIC */}
      <label className="flex items-center gap-3 mb-4">
        <input
          type="radio"
          checked={mode === "automatic"}
          onChange={() => setMode("automatic")}
        />
        Automatic
        <input
          type="number"
          min={5}
          value={defaultTime}
          onChange={(e) => setDefaultTime(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
          disabled={mode !== "automatic"} // optional: only editable in automatic
          className="border rounded-md w-20 px-2 py-1 disabled:bg-gray-100"
        />
        seconds
      </label>

      {/* MANUAL */}
      <label className="flex items-center gap-3">
        <input
          type="radio"
          checked={mode === "manual"}
          onChange={() => setMode("manual")}
        />
        Manual (set per question)
      </label>

      <button
        onClick={handleSave}
        className="mt-6 bg-[#6AB6E9] px-6 py-2 rounded-md font-medium"
      >
        Save
      </button>

      <p className="text-sm text-gray-500 mt-4 max-w-lg">
        Automatic mode applies the same timer to all questions (default).<br />
        Manual mode sets all questions to specific time (editable per question).
      </p>
    </>
  );
}
