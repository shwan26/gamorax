"use client";

import { useEffect, useMemo, useState } from "react";

export default function TimerBar({
  duration,
  startAt,
}: {
  duration: number;
  startAt: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(i);
  }, []);

  const elapsed = Math.max(0, (now - startAt) / 1000);
  const remaining = Math.max(0, duration - elapsed);
  const percent = duration > 0 ? (remaining / duration) * 100 : 0;

  const secs = Math.ceil(remaining);

  const danger = percent <= 25;
  const warn = percent <= 50;

  const fillCls = useMemo(() => {
    if (danger) {
      return "from-rose-500 via-orange-400 to-amber-300";
    }
    if (warn) {
      return "from-amber-400 via-sky-400 to-indigo-400";
    }
    return "from-[#00D4FF] via-[#38BDF8] to-[#2563EB]";
  }, [danger, warn]);

  return (
    <div className="w-full">
      {/* outer glass track */}
      <div
        className="
          relative h-3 overflow-hidden rounded-full
          border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/40
        "
      >
        {/* subtle dots (optional, matches your other cards) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* glow behind fill */}
        <div
          className={[
            "pointer-events-none absolute inset-y-0 left-0",
            "blur-xl opacity-40",
            danger ? "opacity-70" : "",
          ].join(" ")}
          style={{ width: `${Math.max(6, percent)}%` }}
        >
          <div className={`h-full w-full bg-gradient-to-r ${fillCls}`} />
        </div>

        {/* main fill */}
        <div
          className={[
            "relative h-full rounded-full",
            "bg-gradient-to-r",
            fillCls,
            "transition-[width] duration-100 ease-linear",
            danger ? "animate-pulse" : "",
          ].join(" ")}
          style={{ width: `${percent}%` }}
        />

        {/* shiny highlight */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.05))",
          }}
        />
      </div>

      {/* time label */}
      <div className="mt-2 flex justify-center">
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
            "border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur",
            "text-slate-700",
            "dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200",
            danger ? "text-rose-700 dark:text-rose-300" : "",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              danger
                ? "bg-rose-500"
                : warn
                ? "bg-amber-400"
                : "bg-sky-400",
            ].join(" ")}
          />
          {secs}s
        </span>
      </div>
    </div>
  );
}
