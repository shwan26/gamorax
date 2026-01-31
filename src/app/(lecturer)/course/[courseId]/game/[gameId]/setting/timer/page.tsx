"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getGameById, updateGameTimer, type Game } from "@/src/lib/gameStorage";
import { getQuestions, saveQuestions } from "@/src/lib/questionStorage";
import { Clock3, TimerReset, SlidersHorizontal } from "lucide-react";

export default function TimerSettingPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const gameId = (params?.gameId ?? "").toString();

  const [game, setGame] = useState<Game | null>(null);

  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [defaultTime, setDefaultTime] = useState<number>(60);

  // load on client (localStorage / supabase safe)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!gameId) return;

      try {
        const g = await getGameById(gameId); // ✅ await
        if (!alive) return;

        setGame(g);

        if (g) {
          setMode(g.timer.mode);
          setDefaultTime(g.timer.defaultTime);
        }
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setGame(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [gameId]);


  if (!gameId) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
        Missing game id.
      </div>
    );
  }

  if (!game) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
        Loading...
      </div>
    );
  }

  function clampSeconds(n: number) {
    if (!Number.isFinite(n)) return 60;
    return Math.max(5, Math.min(600, Math.floor(n)));
  }

  async function handleSave() {
    const safeDefault = clampSeconds(defaultTime);

    // keep your game timer update (local)
    updateGameTimer(gameId, { mode, defaultTime: safeDefault });
    
    // ✅ await async questions fetch
    const existing = await getQuestions(gameId);

    const updated = existing.map((q) => {
      if (mode === "automatic") {
        return {
          ...q,
          timeMode: "default" as const,
          time: safeDefault,
        };
      }

    const t = Number(q.time);
    return {
      ...q,
      timeMode: "specific" as const,
      time: Number.isFinite(t) && t > 0 ? t : safeDefault,
    };
  });

  // ✅ await async save
  await saveQuestions(gameId, updated);

  alert("Timer setting saved");
}


  return (
    <div
    >
      {/* dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      {/* glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#00D4FF]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

      <div className="relative">
        {/* header */}
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
            <Clock3 className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Timer
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Choose how questions are timed in this game.
            </p>
          </div>
        </div>

        {/* options */}
        <div className="mt-5 space-y-3">
          {/* AUTOMATIC */}
          <button
            type="button"
            onClick={() => setMode("automatic")}
            className={[
              "w-full text-left rounded-2xl border px-4 py-4 transition",
              "bg-white/70 hover:bg-white shadow-sm",
              "dark:bg-slate-950/50 dark:hover:bg-slate-950/70",
              mode === "automatic"
                ? "border-[#38BDF8]/60 ring-2 ring-[#00D4FF]/25"
                : "border-slate-200/70 dark:border-slate-800/70",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center",
                  mode === "automatic"
                    ? "border-[#38BDF8]/70 bg-[#00D4FF]/15"
                    : "border-slate-300/70 dark:border-slate-700/70",
                ].join(" ")}
                aria-hidden
              >
                {mode === "automatic" ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#2563EB] dark:bg-[#A7F3FF]" />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <TimerReset className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    Automatic
                  </p>
                </div>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Apply the same time to all questions.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Default time:
                  </span>

                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={defaultTime}
                    onChange={(e) =>
                      setDefaultTime(clampSeconds(Number(e.target.value) || 0))
                    }
                    disabled={mode !== "automatic"}
                    className="
                      w-24 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      disabled:opacity-60 disabled:bg-slate-50
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100 dark:disabled:bg-slate-950/30
                    "
                  />

                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    seconds
                  </span>

                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    (5–600)
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* MANUAL */}
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={[
              "w-full text-left rounded-2xl border px-4 py-4 transition",
              "bg-white/70 hover:bg-white shadow-sm",
              "dark:bg-slate-950/50 dark:hover:bg-slate-950/70",
              mode === "manual"
                ? "border-[#38BDF8]/60 ring-2 ring-[#00D4FF]/25"
                : "border-slate-200/70 dark:border-slate-800/70",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center",
                  mode === "manual"
                    ? "border-[#38BDF8]/70 bg-[#00D4FF]/15"
                    : "border-slate-300/70 dark:border-slate-700/70",
                ].join(" ")}
                aria-hidden
              >
                {mode === "manual" ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#2563EB] dark:bg-[#A7F3FF]" />
                ) : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    Manual (per question)
                  </p>
                </div>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Each question can have its own time. Existing questions will keep
                  their current time (fallback to default if missing).
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* actions */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatic sets all questions to default time. Manual keeps per-question
            time (and fills missing values).
          </p>

          <button
            onClick={handleSave}
            type="button"
            className="
              inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white
              shadow-[0_10px_25px_rgba(37,99,235,0.18)]
              hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)]
              transition-all
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
              w-full sm:w-auto
            "
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
