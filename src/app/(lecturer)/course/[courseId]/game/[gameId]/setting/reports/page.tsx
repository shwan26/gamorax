"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getQuestions } from "@/src/lib/questionStorage";

import { getReportsByGame, type LiveReport } from "@/src/lib/liveStorage";

import {
  ClipboardList,
  CalendarClock,
  Users,
  BarChart3,
  ArrowUpAZ,
  ArrowDownZA,
  HelpCircle,
} from "lucide-react";

type SortKey = "savedAt" | "pin" | "students" | "avgScore" | "avgTime" | "avgPoints";
type SortDir = "asc" | "desc";

function fmt(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type HistoryRow = {
  id: string;
  pin: string;
  savedAt: string;
  students: number;
  avgScore: number;
  avgTime: number;
  avgPoints: number;
};

export default function ReportHistoryPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const gameId = (params?.gameId ?? "").toString();

  const game = useMemo<Game | null>(() => (gameId ? getGameById(gameId) : null), [gameId]);
  const questions = useMemo(() => (gameId ? getQuestions(gameId) : []), [gameId]);
  const totalQ = questions.length || 0;

  const reports = useMemo<LiveReport[]>(() => (gameId ? getReportsByGame(gameId) : []), [gameId]);

  // ✅ SAFE: after migration, stats always has points/score/timeSpent
  const rows: HistoryRow[] = useMemo(() => {
    return reports.map((r) => ({
      id: r.id,
      pin: r.pin,
      savedAt: r.savedAt || r.lastQuestionAt || "",
      students: r.stats?.students ?? 0,
      avgScore: r.stats?.score?.avg ?? 0,
      avgTime: r.stats?.timeSpent?.avg ?? 0,
      avgPoints: r.stats?.points?.avg ?? 0,
    }));
  }, [reports]);

  const [sortKey, setSortKey] = useState<SortKey>("savedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function onSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "savedAt" ? "desc" : "asc");
    }
  }

  const displayRows = useMemo(() => {
    const out = [...rows];
    out.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (sortKey === "savedAt") {
        const na = new Date(va).getTime();
        const nb = new Date(vb).getTime();
        return sortDir === "asc" ? na - nb : nb - na;
      }

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return out;
  }, [rows, sortKey, sortDir]);

  if (!gameId) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
        Missing game id.
      </div>
    );
  }

  const Th = ({ label, sort, right }: { label: string; sort: SortKey; right?: boolean }) => {
    const active = sortKey === sort;
    return (
      <th className="p-0">
        <button
          type="button"
          onClick={() => onSort(sort)}
          className={[
            "w-full select-none px-4 py-3 text-left text-xs font-semibold tracking-wide",
            "text-slate-600 hover:text-slate-900 hover:bg-slate-50/70 transition",
            "dark:text-slate-300 dark:hover:text-slate-50 dark:hover:bg-slate-900/30",
            right ? "text-right" : "",
            active ? "text-slate-900 dark:text-slate-50" : "",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-2">
            {label}
            {active ? (
              sortDir === "asc" ? (
                <ArrowUpAZ className="h-4 w-4 opacity-70" />
              ) : (
                <ArrowDownZA className="h-4 w-4 opacity-70" />
              )
            ) : null}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="relative">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
            <ClipboardList className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Report History
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {game?.quizNumber ?? "-"} • {totalQ} questions • {reports.length} reports
            </p>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-900/30">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/70">
                <Th label="Saved at" sort="savedAt" />
                <Th label="PIN" sort="pin" />
                <Th label="#Students" sort="students" right />
                <Th label="Avg Score" sort="avgScore" right />
                <Th label="Avg Time (s)" sort="avgTime" right />
                <Th label="Avg Points" sort="avgPoints" right />
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">
                  Detail
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-200/60 hover:bg-slate-50/70 transition dark:border-slate-800/60 dark:hover:bg-slate-900/20"
                >
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-slate-400" />
                      {fmt(r.savedAt)}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">
                    {r.pin}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    <span className="inline-flex items-center gap-2 justify-end">
                      <Users className="h-4 w-4 text-slate-400" />
                      {r.students}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {r.avgScore}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {r.avgTime}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2563EB] dark:text-[#A7F3FF]">
                    {r.avgPoints}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`${gameId ? `/course/${params.courseId}/game/${gameId}/setting/reports/${r.id}` : "#"}`
                      }
                      className="
                        inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold
                        bg-white/80 text-slate-700 border border-slate-200/70
                        hover:bg-slate-50/70 transition
                        dark:bg-slate-950/55 dark:text-slate-200 dark:border-slate-800/70 dark:hover:bg-slate-900/30
                      "
                    >
                      <BarChart3 className="h-4 w-4" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                      No reports yet.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Tip: Older reports are auto-migrated to include points stats.
      </div>
    </div>
  );
}
