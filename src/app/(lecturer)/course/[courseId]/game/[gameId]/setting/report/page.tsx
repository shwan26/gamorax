"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";
import { getLatestLiveReportByGame } from "@/src/lib/liveStorage";
import { getQuestions } from "@/src/lib/questionStorage";

type SortKey = "rank" | "studentId" | "name" | "score" | "points";
type SortDir = "asc" | "desc";

type Row = {
  rank: number;
  studentId: string;
  name: string;
  score: number; // correct count (from live)
  points: number; // points (from live)
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

  // ✅ Use SAVED report as truth (these values must be written at finish time)
  // Re-rank defensively by points/score in case old rank was wrong.
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

  function sortIcon(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function medal(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  }

  function downloadCSV() {
    if (!report) return;

    const courseCode = course?.courseCode ?? "";
    const courseName = course?.courseName ?? "";
    const section = course?.section ?? "";
    const semester = course?.semester ?? "";
    const quizTitle = game?.quizNumber ?? "";
    const totalQ = questions.length || report.totalQuestions || 0;

    const meta: string[][] = [
      ["Report Type", "Quiz Report"],
      ["Finished At", finishIso ? fmt(finishIso) : "-"],
      ["Course Code", courseCode],
      ["Course Name", courseName],
      ["Section", section],
      ["Semester", semester],
      ["Quiz Title", quizTitle],
      ["Total Questions", String(totalQ)],
      ["Point Rule", "server/live-calculated (see /api/socket)"],
      ["", ""],
    ];

    const header = ["Rank", "Student ID", "Name", "Score", "Points"];

    const rows = rankedRows.map((r) => [
      String(r.rank),
      r.studentId,
      r.name,
      `${r.score}/${totalQ}`,
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

  const Th = ({ label, sort }: { label: string; sort: SortKey }) => (
    <th onClick={() => onSort(sort)} className="p-2 cursor-pointer select-none hover:bg-blue-100">
      {label}
      <span className="text-xs">{sortIcon(sort)}</span>
    </th>
  );

  if (!gameId) return <div className="p-6">Missing game id.</div>;
  if (!report) return <div className="p-6">No report found yet.</div>;

  const totalQ = questions.length || report.totalQuestions || 0;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Report</h3>
        <button
          onClick={downloadCSV}
          className="text-sm px-4 py-2 bg-[#6AB6E9] rounded-md hover:bg-[#4fa0d6]"
        >
          ⬇ Download Report
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-4 space-y-1">
        <div>Finished at: {finishIso ? fmt(finishIso) : "-"}</div>
        <div>
          Course:{" "}
          {course
            ? `${course.courseCode} • ${course.courseName} • Sec ${course.section} • ${course.semester}`
            : "-"}
        </div>
        <div>Quiz: {game?.quizNumber ?? "-"}</div>
        <div>Total questions: {totalQ}</div>
      </div>

      <table className="w-full border">
        <thead className="bg-blue-50">
          <tr>
            <Th label="Rank" sort="rank" />
            <Th label="Student ID" sort="studentId" />
            <Th label="Name" sort="name" />
            <Th label="Score" sort="score" />
            <Th label="Points" sort="points" />
          </tr>
        </thead>

        <tbody>
          {displayRows.map((r) => (
            <tr key={r.studentId} className="border-t">
              <td className="p-2 font-bold">
                {medal(r.rank)} #{r.rank}
              </td>
              <td className="p-2">{r.studentId}</td>
              <td className="p-2">{r.name}</td>
              <td className="p-2">
                {r.score}/{totalQ}
              </td>
              <td className="p-2 font-semibold text-blue-700">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
