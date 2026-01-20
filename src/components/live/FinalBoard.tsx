"use client";

import React, { useMemo } from "react";
import Link from "next/link";

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

function fmtTime(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
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

export default function FinalBoard({
  ranked,
  total,
  reportHref,
  onReportClick,
}: {
  ranked: RankedRow[];
  total: number;
  reportHref: string; // ✅ add
  onReportClick?: () => void; // ✅ add
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

  const StatPill = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="px-4 py-2 rounded-full border bg-white shadow-sm flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-[#034B6B]">{value}</span>
    </div>
  );

  const PodiumCard = ({
    r,
    place,
    big,
  }: {
    r?: RankedRow;
    place: 1 | 2 | 3;
    big?: boolean;
  }) => {
    if (!r) {
      return (
        <div className={`rounded-2xl border bg-white shadow-sm p-4 ${big ? "h-52" : "h-44"}`} />
      );
    }

    const rank = safeNum(r.rank, place);
    const name = String(r.name ?? "");
    const sid = String(r.studentId ?? "");
    const t = safeNum(r.totalTime, 0);

    const ring =
      place === 1
        ? "ring-2 ring-[#0B6FA6]"
        : place === 2
        ? "ring-2 ring-blue-200"
        : "ring-2 ring-blue-100";

    const bg =
      place === 1
        ? "bg-gradient-to-b from-[#0B6FA6] to-[#034B6B]"
        : "bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]";

    const chipBg = place === 1 ? "bg-white/15" : "bg-white";
    const textColor = place === 1 ? "text-white" : "text-[#034B6B]";

    return (
      <div className={`rounded-2xl shadow-md overflow-hidden ${ring} ${big ? "h-56" : "h-48"}`}>
        <div className={`${bg} h-full p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold ${chipBg} ${
                place === 1 ? "text-white" : "text-[#034B6B]"
              }`}
            >
              {medalEmoji(rank)} #{rank}
            </div>

            {typeof r.points === "number" && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold ${chipBg} ${
                  place === 1 ? "text-white" : "text-[#034B6B]"
                }`}
              >
                {safeNum(r.points)} pts
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/90 border flex items-center justify-center overflow-hidden">
              {r.avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-extrabold text-[#034B6B]">{initials(name)}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className={`font-semibold truncate ${textColor}`}>{name || "(no name)"}</div>
              <div className={`text-xs opacity-90 ${textColor}`}>{sid || "-"}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className={`${textColor}`}>
              <div className="text-xs opacity-90">Score</div>
              <div className="text-lg font-extrabold">{scoreLabel(r, total)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#034B6B]">Final Leaderboard</h2>
            <p className="text-sm text-gray-600">Top players + full ranking</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <StatPill label="Questions" value={total} />
            <StatPill label="Players" value={players} />
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8">
        <div className="md:order-1 order-2">
          <PodiumCard r={top2} place={2} />
        </div>

        <div className="md:order-2 order-1">
          <PodiumCard r={top1} place={1} big />
        </div>

        <div className="md:order-3 order-3">
          <PodiumCard r={top3} place={3} />
        </div>
      </div>

      {/* Full list */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="font-semibold text-[#034B6B]">All Players</div>
          <div className="text-xs text-gray-500">Sorted by points/correct/time</div>
        </div>

        <div className="divide-y">
          {rows.map((r) => {
            const rank = safeNum(r.rank, 0);
            const name = String(r.name ?? "");
            const sid = String(r.studentId ?? "");
            const c = safeNum(r.correct, 0);
            const t = safeNum(r.totalTime, 0);
            const pts = typeof r.points === "number" ? safeNum(r.points, 0) : null;

            return (
              <div
                key={`${sid}-${rank}`}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 font-extrabold text-[#034B6B]">
                    {medalEmoji(rank)} #{rank}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-blue-50 border flex items-center justify-center overflow-hidden">
                    {r.avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-[#034B6B]">{initials(name)}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold truncate">{name || "(no name)"}</div>
                    <div className="text-xs text-gray-500 truncate">{sid || "-"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="font-extrabold text-[#034B6B]">
                      {c}/{Math.max(1, total)}
                    </div>
                  </div>

                  {pts !== null && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Points</div>
                      <div className="font-extrabold text-[#034B6B]">{pts}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-gray-600">No players yet.</div>
          )}
        </div>
      </div>

      {/* ✅ Back to Report button */}
      <div className="mt-8 flex justify-end">
        <Link
          href={reportHref}
          onClick={() => {
            onReportClick?.();
          }}
          className="px-6 py-3 rounded-full font-semibold text-white shadow-md
                     bg-gradient-to-r from-[#0593D1] to-[#034B6B]
                     hover:opacity-90 active:scale-[0.98] transition"
        >
          Back to Report
        </Link>
      </div>
    </div>
  );
}
