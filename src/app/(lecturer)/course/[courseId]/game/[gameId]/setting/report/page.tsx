"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";
import { getLatestLiveReportByGame } from "@/src/lib/liveStorage";
import { getQuestions } from "@/src/lib/questionStorage";

import {
  Download,
  Trophy,
  CalendarClock,
  GraduationCap,
  HelpCircle,
  ArrowUpAZ,
  ArrowDownZA,
} from "lucide-react";

type SortKey = "rank" | "studentId" | "name" | "score" | "points";
type SortDir = "asc" | "desc";

type Row = {
  rank: number;
  studentId: string;
  name: string;
  score: number;
  points: number;
};

function fmt(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function escapeCsv(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatSemester(input?: string) {
  if (!input) return "";
  if (/^\d{1,2}\/\d{4}$/.test(input.trim())) return input.trim();

  const s = input.trim();
  const parts = s.split(/[-/ ]+/).filter(Boolean);

  if (parts.length >= 2) {
    const [a, b] = parts;
    const year = /^\d{4}$/.test(b) ? b : /^\d{4}$/.test(a) ? a : "";
    const monthPart = year === b ? a : b;

    const monthMap: Record<string, number> = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, sept: 9, september: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12,
    };

    const m =
      /^\d{1,2}$/.test(monthPart)
        ? Number(monthPart)
        : monthMap[monthPart.toLowerCase()] ?? NaN;

    if (year && Number.isFinite(m) && m >= 1 && m <= 12) return `${m}/${year}`;
  }

  return input;
}

function buildCourseLine(course?: Course | null) {
  if (!course) return "-";
  const parts: string[] = [];
  if (course.courseCode) parts.push(course.courseCode);
  if (course.courseName) parts.push(course.courseName);

  const section = (course.section ?? "").toString().trim();
  if (section) parts.push(`Sec ${section}`);

  const sem = formatSemester(course.semester);
  if (sem) parts.push(sem);

  return parts.length ? parts.join(" • ") : "-";
}

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export default function ReportPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const gameId = (params?.gameId ?? "").toString();

  const report = useMemo(
    () => (gameId ? getLatestLiveReportByGame(gameId) : null),
    [gameId]
  );

  const game = useMemo<Game | null>(() => (gameId ? getGameById(gameId) : null), [gameId]);

  const course = useMemo<Course | null>(() => {
    if (!game?.courseId) return null;
    return getCourseById(game.courseId);
  }, [game?.courseId]);

  const questions = useMemo(() => (gameId ? getQuestions(gameId) : []), [gameId]);

  const finishIso = report?.lastQuestionAt || report?.savedAt || "";

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rankedRows: Row[] = useMemo(() => {
    if (!report) return [];
    const rows: Row[] = (report.rows ?? []).map((r) => ({
      rank: 0,
      studentId: String(r.studentId ?? ""),
      name: String(r.name ?? ""),
      score: Number(r.score ?? 0),
      points: Number(r.points ?? 0),
    }));

    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.score !== a.score) return b.score - a.score;
      return a.studentId.localeCompare(b.studentId);
    });

    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [report]);

  const displayRows = useMemo(() => {
    const rows = [...rankedRows];
    rows.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return rows;
  }, [rankedRows, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function downloadCSV() {
    if (!report) return;
    const quizTitle = game?.quizNumber ?? "";
    const totalQ = questions.length || report.totalQuestions || 0;

    const meta: string[][] = [
      ["Report Type", "Quiz Report"],
      ["Finished At", finishIso ? fmt(finishIso) : "-"],
    ];

    if (course?.courseCode) meta.push(["Course Code", course.courseCode]);
    if (course?.courseName) meta.push(["Course Name", course.courseName]);

    const section = (course?.section ?? "").toString().trim();
    if (section) meta.push(["Section", section]);

    const sem = formatSemester(course?.semester);
    if (sem) meta.push(["Semester", `'${String(sem)}`]);

    meta.push(
      ["Quiz Title", quizTitle],
      ["Total Questions", String(totalQ)],
      ["Point Rule", "points += (correct answers * 100) + (10 * time bonus)"],
      ["", ""]
    );

    const header = ["Rank", "Student ID", "Name", `Score (${totalQ})`, "Points"];
    const rows = rankedRows.map((r) => [
      String(r.rank),
      r.studentId,
      r.name,
      r.score.toString(),
      String(r.points),
    ]);

    const csvLines = [
      ...meta.map((r) => r.map(escapeCsv).join(",")),
      header.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-report-${report.pin}-${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const totalQ = questions.length || report?.totalQuestions || 0;

  if (!gameId) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
        Missing game id.
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
        No report found yet.
      </div>
    );
  }

  const Th = ({
    label,
    sort,
    right,
  }: {
    label: string;
    sort: SortKey;
    right?: boolean;
  }) => {
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
    <div>
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
        {/* header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
              <Trophy className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Report
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {game?.quizNumber ?? "-"} • {totalQ} questions
              </p>
            </div>
          </div>

          <button
            onClick={downloadCSV}
            type="button"
            className="
              inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white
              shadow-[0_10px_25px_rgba(37,99,235,0.18)]
              hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)]
              transition-all
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
              w-full sm:w-auto
            "
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
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Finished at
                </div>
                <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">
                  {finishIso ? fmt(finishIso) : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
            <div className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Course
                </div>
                <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">
                  {buildCourseLine(course)}
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
                  <Th label={`Score (${totalQ})`} sort="score" right />
                  <Th label="Points" sort="points" right />
                </tr>
              </thead>

              <tbody>
                {displayRows.map((r) => {
                  const top = r.rank <= 3;
                  return (
                    <tr
                      key={r.studentId}
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

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {r.studentId}
                      </td>

                      <td className="px-4 py-3 text-slate-900 dark:text-slate-50">
                        {r.name}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {r.score}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2563EB] dark:text-[#A7F3FF]">
                        {r.points}
                      </td>
                    </tr>
                  );
                })}

                {displayRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300"
                    >
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

        {/* footer note */}
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Points rule: points += (correct answers * 100) + (10 * time bonus)
        </div>
      </div>
    </div>
  );
}
