"use client";

import { useEffect, useMemo, useState } from "react";

type TimerBarProps =
  | { mode: "computed"; duration: number; startAt: number }
  | { mode: "provided"; remainingSec: number; pctRemaining: number };

export default function TimerBar(props: TimerBarProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (props.mode !== "computed") return;
    const i = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(i);
  }, [props.mode]);

  const { remainingSec, pctRemaining } = useMemo(() => {
    if (props.mode === "provided") {
      const r = Math.max(0, Math.round(props.remainingSec));
      const p = Math.max(0, Math.min(100, props.pctRemaining));
      return { remainingSec: r, pctRemaining: p };
    }

    const elapsed = Math.max(0, (now - props.startAt) / 1000);
    const remaining = Math.max(0, props.duration - elapsed);
    const percent = props.duration > 0 ? (remaining / props.duration) * 100 : 0;

    return {
      remainingSec: Math.ceil(remaining),
      pctRemaining: Math.max(0, Math.min(100, percent)),
    };
  }, [props, now]);

  const danger = pctRemaining <= 25;
  const warn = pctRemaining <= 50;

  const fillCls = useMemo(() => {
    if (danger) return "from-rose-500 via-orange-400 to-amber-300";
    if (warn) return "from-amber-400 via-sky-400 to-indigo-400";
    return "from-[#00D4FF] via-[#38BDF8] to-[#2563EB]";
  }, [danger, warn]);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Time remaining
        </p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {remainingSec}s
        </p>
      </div>

      <div
        className="
          relative h-3 overflow-hidden rounded-full
          border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/40
        "
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        <div
          className={[
            "pointer-events-none absolute inset-y-0 left-0",
            "blur-xl opacity-40",
            danger ? "opacity-70" : "",
          ].join(" ")}
          style={{ width: `${Math.max(6, pctRemaining)}%` }}
        >
          <div className={`h-full w-full bg-gradient-to-r ${fillCls}`} />
        </div>

        <div
          className={[
            "relative h-full rounded-full",
            "bg-gradient-to-r",
            fillCls,
            "transition-[width] duration-100 ease-linear",
            danger ? "animate-pulse" : "",
          ].join(" ")}
          style={{ width: `${pctRemaining}%` }}
        />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.05))",
          }}
        />
      </div>
    </div>
  );
}
