"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";

import {
  getAssignmentById,
  listAttemptsByAssignmentId,
  computeAssignmentReportStats,
  rankAssignmentAttempts,
  type AssignmentDetailRow,
} from "@/src/lib/assignmentReportStorage";

import { type AssignmentAttempt } from "@/src/lib/assignmentAttemptStorage";

import {
  Download,
  Trophy,
  CalendarClock,
  GraduationCap,
  HelpCircle,
  ArrowUpAZ,
  ArrowDownZA,
  Users,
  BarChart3,
  Clock,
} from "lucide-react";

type SortKey = "rank" | "studentId" | "name" | "correct" | "score" | "timeSpentSec" | "submittedAt";
type SortDir = "asc" | "desc";

function fmt(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatTime(sec: number): string {
  if (!sec || sec <= 0) return "-";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function escapeCsv(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export default function AssignmentReportDetailPage() {
  const params = useParams<{ courseId?: string; gameId?: string; assignmentId?: string }>();
  const courseId = String(params?.courseId ?? "");
  const gameId = String(params?.gameId ?? "");
  const assignmentId = String(params?.assignmentId ?? "");

  const [game, setGame] = useState<Game | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [attempts, setAttempts] = useState<AssignmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!gameId) return;
      try {
        const g = await getGameById(gameId);
        if (!alive) return;
        setGame(g);
        if (g?.courseId) {
          const c = await getCourseById(g.courseId);
          if (alive) setCourse(c);
        } else {
          if (alive) setCourse(null);
        }
      } catch (e) {
        console.error(e);
        if (alive) { setGame(null); setCourse(null); }
      }
    })();
    return () => { alive = false; };
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!assignmentId) {
        setAssignment(null); setAttempts([]); setLoading(false); return;
      }
      setLoading(true);
      try {
        const a = await getAssignmentById(assignmentId);
        if (cancelled) return;
        setAssignment(a);
        const ats = await listAttemptsByAssignmentId(assignmentId);
        if (cancelled) return;
        setAttempts(ats);
      } catch (e) {
        console.error(e);
        if (!cancelled) { setAssignment(null); setAttempts([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId]);

  const stats = useMemo(() => computeAssignmentReportStats(attempts), [attempts]);
  const rankedRows = useMemo<AssignmentDetailRow[]>(() => rankAssignmentAttempts(attempts), [attempts]);

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function onSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const displayRows = useMemo(() => {
    const rows = [...rankedRows];
    rows.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return rows;
  }, [rankedRows, sortKey, sortDir]);

  function downloadCSV() {
    const a = assignment;
    if (!a) return;

    const meta: string[][] = [
      ["Report Type", "Assignment Report (Detail)"],
      ["Assignment ID", String(a.id)],
      ["Assignment Title", String(a.title ?? "")],
      ["Public Token", String(a.public_token ?? "")],
      ["Created At", fmt(String(a.created_at ?? ""))],
      ["Opens At", a.opens_at ? fmt(String(a.opens_at)) : "-"],
      ["Due At", a.due_at ? fmt(String(a.due_at)) : "-"],
      ["Duration (sec)", String(a.duration_sec ?? "")],
      ["", ""],
      ["STATISTICS", ""],
      ["Students", String(stats.students)],
      ["Score Min", String(stats.score.min)],
      ["Score Max", String(stats.score.max)],
      ["Score Avg", String(stats.score.avg)],
      ["", ""],
    ];

    const header = ["Rank", "Student ID", "Name", "Correct", "Total Qs", "Score", "Time Spent", "Submitted At"];
    const rows = rankedRows.map((r) => [
      String(r.rank),
      r.studentId,
      r.name,
      String(r.correct),
      String(r.total),
      String(r.score),
      formatTime(r.timeSpentSec),
      fmt(r.submittedAt),
    ]);

    const csvLines = [
      ...meta.map((r) => r.map(escapeCsv).join(",")),
      header.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `assignment-report-${a.id}-${new Date().toISOString().slice(0, 19)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
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
              sortDir === "asc" ? <ArrowUpAZ className="h-4 w-4 opacity-70" /> : <ArrowDownZA className="h-4 w-4 opacity-70" />
            ) : null}
          </span>
        </button>
      </th>
    );
  };

  if (!gameId) return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
      Missing game id.
    </div>
  );

  if (loading) return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
      Loading...
    </div>
  );

  if (!assignment) return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
      No assignment found.
    </div>
  );

  const a = assignment;

  return (
    <div className="relative">
      {/* header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-2">
            <Link
              href={`/course/${courseId}/game/${gameId}/setting/assignment/reports`}
              className="inline-flex w-fit items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold bg-white/80 text-slate-700 border border-slate-200/70 hover:bg-slate-50/70 transition dark:bg-slate-950/55 dark:text-slate-200 dark:border-slate-800/70 dark:hover:bg-slate-900/30"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to History
            </Link>

            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
                <Trophy className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Assignment Report Detail</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{game?.quizNumber ?? "-"} • {a.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Assignment ID: <span className="font-mono">{a.id}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={downloadCSV}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white shadow-[0_10px_25px_rgba(37,99,235,0.18)] hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)] transition-all focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40 w-full sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      </div>

      {/* meta */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Window</div>
              <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">
                Opens: {a.opens_at ? fmt(a.opens_at) : "-"} <br />
                Due: {a.due_at ? fmt(a.due_at) : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Course</div>
              <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">
                {course?.courseCode ?? "-"} • {course?.courseName ?? "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* stats — 2 cards: Students | Score */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Students</div>
              <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{stats.students}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Score</div>
                <div className="flex items-center divide-x divide-slate-200 dark:divide-slate-700">
                  {[["Min", stats.score.min], ["Avg", stats.score.avg], ["Max", stats.score.max]].map(([label, val]) => (
                    <div key={label} className="flex flex-col items-center px-3 first:pl-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
                      <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50">{val}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-900/30">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/70">
              <Th label="Rank" sort="rank" />
              <Th label="Student ID" sort="studentId" />
              <Th label="Name" sort="name" />
              <Th label="Correct (/ Total Qs)" sort="correct" right />
              <Th label="Score (Total Score)" sort="score" right />
              <Th label="Time Spent" sort="timeSpentSec" right />
              <Th label="Submitted" sort="submittedAt" right />
            </tr>
            </thead>

            <tbody>
              {displayRows.map((r) => {
                const top = r.rank <= 3;
                return (
                  <tr
                    key={`${r.studentId}-${r.submittedAt}`}
                    className={[
                      "border-b border-slate-200/60 dark:border-slate-800/60",
                      "hover:bg-slate-50/70 dark:hover:bg-slate-900/20 transition",
                      top ? "bg-[#00D4FF]/[0.06] dark:bg-[#00D4FF]/[0.08]" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{medal(r.rank)}</span>
                        <span>#{r.rank}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.studentId || "-"}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-50">{r.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2563EB] dark:text-[#A7F3FF]">
                      {r.correct} / {r.total}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2563EB] dark:text-[#A7F3FF]">
                      {r.score}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatTime(r.timeSpentSec)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {fmt(r.submittedAt)}
                    </td>
                  </tr>
                );
              })}

              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                      No rows to display.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}