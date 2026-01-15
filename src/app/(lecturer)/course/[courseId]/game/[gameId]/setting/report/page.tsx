"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";
import {
  getLatestLiveReportByGame,
  getLiveByPin,
  type LiveSession,
} from "@/src/lib/liveStorage";
import { getQuestions, type Question } from "@/src/lib/questionStorage";

type SortKey = "rank" | "studentId" | "name" | "score" | "points";
type SortDir = "asc" | "desc";

type Row = {
  rank: number;
  studentId: string;
  name: string;
  score: number; // correct count
  points: number;
};

function fmt(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function correctIndexOf(q: Question): number {
  return Math.max(0, q.answers.findIndex((a) => a.correct));
}

function safeMaxTime(q: Question, fallback = 60) {
  const t = Number(q?.time);
  return Number.isFinite(t) && t > 0 ? Math.round(t) : fallback;
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

  // attempt to get live session to compute time-based points
  const session = useMemo<LiveSession | null>(() => {
    if (!report?.pin) return null;
    return getLiveByPin(report.pin); // NOTE: requires session still stored as active
  }, [report?.pin]);

  const finishIso = report?.lastQuestionAt || report?.savedAt || "";

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /**
   * ✅ Recompute points from timeUsed:
   * per correct question: (maxTime - timeUsed) * 10
   */
  const computedRows: Row[] = useMemo(() => {
    if (!report) return [];

    // If we don't have session answers, fallback to stored rows
    if (!session?.answersByQuestion || questions.length === 0) {
      const fallback = (report.rows ?? []).map((r) => ({
        rank: r.rank,
        studentId: r.studentId,
        name: r.name,
        score: r.score,
        points: r.points,
      }));

      // keep stable ranking by points desc if needed
      return [...fallback].sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, rank: i + 1 }));
    }

    const qMaxTimes = questions.map((q) => safeMaxTime(q, 60));
    const qCorrect = questions.map((q) => correctIndexOf(q));

    const baseStudents = report.rows ?? [];

    const rows: Row[] = baseStudents.map((s) => {
      let score = 0;
      let points = 0;

      for (let qi = 0; qi < questions.length; qi++) {
        const answers = session.answersByQuestion?.[qi] ?? [];
        const a = answers.find((x) => x.studentId === s.studentId);

        if (!a) continue;

        const maxT = qMaxTimes[qi] ?? 60;
        const correctIdx = qCorrect[qi] ?? 0;

        const used = Math.max(0, Math.round(Number(a.timeUsed ?? 0)));
        const isCorrect = Number(a.answerIndex) === correctIdx;

        if (!isCorrect) continue;

        score += 1;

        const timeLeft = Math.max(0, maxT - used);
        points += timeLeft * 10;
      }

      return {
        rank: 0, // assigned after sorting
        studentId: s.studentId,
        name: s.name,
        score,
        points,
      };
    });

    // Rank by points desc, then score desc, then studentId asc
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.score !== a.score) return b.score - a.score;
      return a.studentId.localeCompare(b.studentId);
    });

    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [report, session, questions]);

  const displayRows = useMemo(() => {
    const rows = [...computedRows];

    rows.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return rows;
  }, [computedRows, sortKey, sortDir]);

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

    const meta: string[][] = [
      ["Report Type", "Quiz Report"],
      ["Finished At", finishIso ? fmt(finishIso) : "-"],
      ["PIN", report.pin],
      ["Course Code", courseCode],
      ["Course Name", courseName],
      ["Section", section],
      ["Semester", semester],
      ["Quiz Title", quizTitle],
      ["Total Questions", String(questions.length || report.totalQuestions || 0)],
      ["Point Rule", "per correct question: (maxTime - timeUsed) * 10"],
      ["", ""],
    ];

    const header = ["Rank", "Student ID", "Name", "Score", "Points"];

    const rows = computedRows.map((r) => [
      String(r.rank),
      r.studentId,
      r.name,
      `${r.score}/${questions.length || report.totalQuestions || 0}`,
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

  function escapeCsv(v: any) {
    const s = String(v ?? "");
    // quote if contains comma/newline/quote
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  const Th = ({ label, sort }: { label: string; sort: SortKey }) => (
    <th
      onClick={() => onSort(sort)}
      className="p-2 cursor-pointer select-none hover:bg-blue-100"
    >
      {label}
      <span className="text-xs">{sortIcon(sort)}</span>
    </th>
  );

  if (!gameId) return <div className="p-6">Missing game id.</div>;
  if (!report) return <div className="p-6">No report found yet.</div>;

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
        <div>Total questions: {questions.length || report.totalQuestions || 0}</div>

        {!session && (
          <div className="text-xs text-amber-700 mt-2">
            Note: Live session not found, showing stored points instead of time-based recompute.
          </div>
        )}
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
                {r.score}/{questions.length || report.totalQuestions || 0}
              </td>
              <td className="p-2 font-semibold text-blue-700">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
