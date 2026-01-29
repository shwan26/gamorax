"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Trophy, Users, ListOrdered, FileText } from "lucide-react";

type RankedRow = {
  rank?: number;
  studentId?: string;
  name?: string;
  avatarSrc?: string;
  correct?: number;
  points?: number;
  totalTime?: number; // seconds
};

function safeNum(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function initials(name?: string) {
  const s = String(name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function medalEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function scoreLabel(r: RankedRow, total: number) {
  const c = safeNum(r.correct, 0);
  return `${c}/${Math.max(1, total)}`;
}

function DotPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    />
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl",
        "border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur",
        "dark:border-slate-800/70 dark:bg-slate-950/45",
        className,
      ].join(" ")}
    >
      <DotPattern />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />
      <div className="relative">{children}</div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="
        inline-flex items-center gap-2 rounded-2xl
        border border-slate-200/70 bg-white/70 px-3 py-2 shadow-sm
        dark:border-slate-800/70 dark:bg-slate-950/50
      "
    >
      <div className="rounded-xl border border-slate-200/70 bg-white/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/40">
        <Icon className="h-4 w-4 text-slate-700 dark:text-[#A7F3FF]" />
      </div>
      <div className="leading-tight">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          {value}
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  r,
  place,
  total,
  big,
}: {
  r?: RankedRow;
  place: 1 | 2 | 3;
  total: number;
  big?: boolean;
}) {
  if (!r) {
    return (
      <div
        className={[
          "relative overflow-hidden rounded-3xl",
          "border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur",
          "dark:border-slate-800/70 dark:bg-slate-950/45",
          big ? "h-60" : "h-52",
        ].join(" ")}
      >
        <DotPattern />
      </div>
    );
  }

  const rank = safeNum(r.rank, place);
  const name = String(r.name ?? "");
  const sid = String(r.studentId ?? "");
  const pts = typeof r.points === "number" ? safeNum(r.points, 0) : null;

  // ✅ ONE gradient only (same system)
  const headerBg =
    place === 1
      ? "bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]"
      : "bg-white/70 dark:bg-slate-950/50";

  const ring =
    place === 1
      ? "ring-2 ring-[#00D4FF]/40"
      : place === 2
      ? "ring-2 ring-slate-200/70 dark:ring-slate-700/60"
      : "ring-2 ring-slate-200/60 dark:ring-slate-700/50";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl shadow-sm backdrop-blur",
        "border border-slate-200/70 bg-white/60 dark:border-slate-800/70 dark:bg-slate-950/45",
        ring,
        big ? "h-64" : "h-56",
      ].join(" ")}
    >
      <DotPattern />
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/10 blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl opacity-70 dark:bg-[#3B82F6]/18" />

      <div className="relative flex h-full flex-col">
        {/* top area */}
        <div className={[headerBg, "px-5 py-4"].join(" ")}>
          <div className="flex items-center justify-between">
            <div
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                place === 1
                  ? "bg-white/15 text-white"
                  : "border border-slate-200/70 bg-white/70 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200",
              ].join(" ")}
            >
              <span>{medalEmoji(rank)}</span>
              <span>#{rank}</span>
            </div>

            {pts !== null ? (
              <div
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  place === 1
                    ? "bg-white/15 text-white"
                    : "border border-slate-200/70 bg-white/70 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200",
                ].join(" ")}
              >
                {pts} pts
              </div>
            ) : null}
          </div>
        </div>

        {/* content */}
        <div className="flex flex-1 flex-col justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <div
              className="
                h-14 w-14 overflow-hidden rounded-full
                border border-slate-200/70 bg-white/80 shadow-sm
                dark:border-slate-800/70 dark:bg-slate-950/50
              "
            >
              {r.avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.avatarSrc}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
                    {initials(name)}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-extrabold text-slate-900 dark:text-slate-50">
                {name || "(no name)"}
              </div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {sid || "-"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Score
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
                {scoreLabel(r, total)}
              </div>
            </div>

            <div
              className="
                rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-right
                dark:border-slate-800/70 dark:bg-slate-950/45
              "
            >
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Place
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                {place === 1 ? "Champion" : place === 2 ? "Runner-up" : "3rd"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinalBoard({
  ranked,
  total,
  reportHref,
  onReportClick,
}: {
  ranked: RankedRow[];
  total: number;
  reportHref: string;
  onReportClick?: () => void;
}) {
  const rows = useMemo(() => {
    const arr = Array.isArray(ranked) ? [...ranked] : [];

    arr.sort((a, b) => {
      const ap = safeNum(a.points, -1);
      const bp = safeNum(b.points, -1);
      const hasPoints = ap >= 0 || bp >= 0;
      if (hasPoints && bp !== ap) return bp - ap;

      const ac = safeNum(a.correct, 0);
      const bc = safeNum(b.correct, 0);
      if (bc !== ac) return bc - ac;

      const at = safeNum(a.totalTime, 999999);
      const bt = safeNum(b.totalTime, 999999);
      if (at !== bt) return at - bt;

      return String(a.studentId ?? "").localeCompare(String(b.studentId ?? ""));
    });

    return arr.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [ranked]);

  const top1 = rows[0];
  const top2 = rows[1];
  const top3 = rows[2];
  const players = rows.length;

  return (
    <div className="w-full">
      {/* HEADER */}
      <GlassCard className="mb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="
                  rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm
                  dark:border-slate-800/70 dark:bg-slate-950/55
                "
              >
                <Trophy className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-extrabold text-slate-900 dark:text-slate-50">
                  Final Leaderboard
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Podium + full ranking
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <StatPill icon={ListOrdered} label="Questions" value={total} />
            <StatPill icon={Users} label="Players" value={players} />
          </div>
        </div>
      </GlassCard>

      {/* PODIUM */}
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        <div className="md:order-1 order-2">
          <PodiumCard r={top2} place={2} total={total} />
        </div>
        <div className="md:order-2 order-1">
          <PodiumCard r={top1} place={1} total={total} big />
        </div>
        <div className="md:order-3 order-3">
          <PodiumCard r={top3} place={3} total={total} />
        </div>
      </div>

      {/* FULL LIST */}
      <GlassCard className="mt-5 p-0">
        <div
          className="
            flex items-center justify-between gap-3
            border-b border-slate-200/70 px-5 py-4
            bg-white/40 dark:border-slate-800/70 dark:bg-slate-950/30
          "
        >
          <div className="min-w-0">
            <div className="font-extrabold text-slate-900 dark:text-slate-50">
              All Players
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Sorted by points → correct → time
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {rows.length} total
          </div>
        </div>

        <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
          {rows.map((r) => {
            const rank = safeNum(r.rank, 0);
            const name = String(r.name ?? "");
            const sid = String(r.studentId ?? "");
            const c = safeNum(r.correct, 0);
            const pts = typeof r.points === "number" ? safeNum(r.points, 0) : null;

            const isTop = rank <= 3;

            return (
              <div
                key={`${sid}-${rank}`}
                className="
                  px-5 py-4 flex items-center justify-between gap-4
                  hover:bg-white/50 dark:hover:bg-slate-950/35 transition-colors
                "
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 shrink-0 font-extrabold text-slate-900 dark:text-slate-50">
                    <span className="mr-1">{medalEmoji(rank)}</span>#{rank}
                  </div>

                  <div
                    className="
                      h-10 w-10 shrink-0 overflow-hidden rounded-full
                      border border-slate-200/70 bg-white/70
                      dark:border-slate-800/70 dark:bg-slate-950/45
                    "
                  >
                    {r.avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.avatarSrc}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="font-extrabold text-slate-900 dark:text-slate-50">
                          {initials(name)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-50">
                      {name || "(no name)"}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {sid || "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Score
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-50">
                      {c}/{Math.max(1, total)}
                    </div>
                  </div>

                  {pts !== null ? (
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Points
                      </div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-50">
                        {pts}
                      </div>
                    </div>
                  ) : null}

                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Time spent
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-50">
                      {safeNum(r.totalTime, 0)}s
                    </div>
                  </div>
                  
                  {isTop ? (
                    <span
                      className="
                        hidden sm:inline-flex
                        rounded-full border border-[#00D4FF]/35 bg-white/70 px-3 py-1 text-[11px] font-extrabold
                        text-slate-700 dark:bg-slate-950/45 dark:text-slate-200
                      "
                    >
                      Top {rank}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
              No players yet.
            </div>
          )}
        </div>
      </GlassCard>

      {/* BACK TO REPORT */}
      <div className="mt-6 flex justify-end">
        <Link
          href={reportHref}
          onClick={() => onReportClick?.()}
          className="
            inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white
            bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]
            shadow-[0_10px_25px_rgba(37,99,235,0.18)]
            hover:opacity-95 active:scale-[0.99] transition
            focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
          "
        >
          <FileText className="h-4 w-4" />
          Back to Report
        </Link>
      </div>
    </div>
  );
}
