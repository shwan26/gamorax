"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  getGameById,
  updateGameTimer,
} from "@/src/lib/gameStorage";
import {
  getQuestions,
  saveQuestions,
} from "@/src/lib/questionStorage";

export default function TimerSettingPage() {
  const params = useParams<{ id?: string }>();
const id = (params?.id ?? "").toString();

  const game = getGameById(id);

  if (!game) return null;

  const [mode, setMode] = useState<"automatic" | "manual">(
    game.timer.mode
  );
  const [defaultTime, setDefaultTime] = useState(
    game.timer.defaultTime
  );

  function handleSave() {
    // 1️⃣ Update game timer
    updateGameTimer(id, {
      mode,
      defaultTime,
    });

    // 2️⃣ Update all questions that use DEFAULT timer
    const questions = getQuestions(id).map((q) =>
      q.timeMode === "default"
        ? { ...q, time: defaultTime }
        : q
    );

    saveQuestions(id, questions);

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
          onChange={(e) => setDefaultTime(Number(e.target.value))}
          className="border rounded-md w-20 px-2 py-1"
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

      {/* INFO */}
      <p className="text-sm text-gray-500 mt-4 max-w-lg">
        Automatic mode applies the same timer to all questions that
        use the default setting.  
        Manual mode allows each question to define its own time.
      </p>
    </>
  );
}
