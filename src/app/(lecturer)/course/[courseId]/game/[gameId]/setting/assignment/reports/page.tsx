"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getGameById, type Game } from "@/src/lib/gameStorage";

import {
  listAssignmentsWithAttemptsByGame,
  computeAssignmentReportStats,
  type AssignmentHistoryRow,
} from "@/src/lib/assignmentReportStorage";

import {
  ClipboardList,
  CalendarClock,
  Users,
  BarChart3,
  ArrowUpAZ,
  ArrowDownZA,
  HelpCircle,
} from "lucide-react";

type SortKey = "createdAt" | "title" | "students" | "avgScorePct" | "avgPoints";
type SortDir = "asc" | "desc";

function fmt(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
}

export default function AssignmentReportHistoryPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = String(params?.courseId ?? "");
  const gameId = String(params?.gameId ?? "");

  const [game, setGame] = useState<Game | null>(null);

  const [loading, setLoading] = useState(true);
  const [rowsRaw, setRowsRaw] = useState<AssignmentHistoryRow[]>([]);
  const [createdAtMap, setCreatedAtMap] = useState<Record<string, string>>({}); // assignmentId -> created_at

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!gameId) {
        if (alive) setGame(null);
        return;
      }
      try {
        const g = await getGameById(gameId);
        if (alive) setGame(g);
      } catch {
        if (alive) setGame(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!gameId) {
        setRowsRaw([]);
        setCreatedAtMap({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { assignments, attemptsByAssignment } = await listAssignmentsWithAttemptsByGame(gameId);
        if (cancelled) return;

        const nextRows: AssignmentHistoryRow[] = assignments.map((a: any) => {
          const attempts = attemptsByAssignment[a.id] ?? [];
          const stats = computeAssignmentReportStats(attempts);

          return {
            id: a.id,
            title: a.title,
            token: a.public_token,
            opensAt: a.opens_at,
            dueAt: a.due_at,
            durationSec: Number(a.duration_sec ?? 0),

            students: stats.students,
            avgScorePct: stats.scorePct.avg,
            avgPoints: stats.points.avg,
          };
        });

        const cMap: Record<string, string> = {};
        for (const a of assignments) cMap[a.id] = String(a.created_at ?? "");
        setCreatedAtMap(cMap);

        setRowsRaw(nextRows);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRowsRaw([]);
          setCreatedAtMap({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function onSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  }

  const rows = useMemo(() => {
    const out = [...rowsRaw];
    out.sort((a: any, b: any) => {
      const va = keyValue(a, sortKey);
      const vb = keyValue(b, sortKey);

      if (sortKey === "createdAt") {
        const na = new Date(String(va)).getTime();
        const nb = new Date(String(vb)).getTime();
        return sortDir === "asc" ? na - nb : nb - na;
      }

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return out;
  }, [rowsRaw, sortKey, sortDir]);

  function keyValue(r: AssignmentHistoryRow, key: SortKey) {
    if (key === "createdAt") return createdAtMap[r.id] ?? "";
    return (r as any)[key];
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

  if (!gameId) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
        Missing game id.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
            <ClipboardList className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Assignment Reports
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {game?.quizNumber ?? "-"} • {rows.length} assignments
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-900/30">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/70">
                <Th label="Created at" sort="createdAt" />
                <Th label="Title" sort="title" />
                <Th label="#Students" sort="students" right />
                <Th label="Avg Score (%)" sort="avgScorePct" right />
                <Th label="Avg Points" sort="avgPoints" right />
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">
                  Detail
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                      No assignments yet.
                    </span>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-200/60 hover:bg-slate-50/70 transition dark:border-slate-800/60 dark:hover:bg-slate-900/20"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        {fmt(createdAtMap[r.id])}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">
                      {r.title}
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Token: <span className="font-mono">{r.token}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      <span className="inline-flex items-center gap-2 justify-end">
                        <Users className="h-4 w-4 text-slate-400" />
                        {r.students}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {r.avgScorePct}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2563EB] dark:text-[#A7F3FF]">
                      {r.avgPoints}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/course/${courseId}/game/${gameId}/setting/assignment-reports/${r.id}`}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Assignment scores are read from <span className="font-mono">assignment_attempts</span>.
      </div>
    </div>
  );
}
