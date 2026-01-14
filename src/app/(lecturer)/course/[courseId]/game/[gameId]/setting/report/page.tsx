"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getLatestLiveReportByGame, type LiveReportRow } from "@/src/lib/liveStorage";
import { getQuestions } from "@/src/lib/questionStorage";

type SortKey = "rank" | "studentId" | "name" | "score" | "points";
type SortDir = "asc" | "desc";

function fmt(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function ReportPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const gameId = (params?.gameId ?? "").toString();

  const report = useMemo(
    () => (gameId ? getLatestLiveReportByGame(gameId) : null),
    [gameId]
  );

  const totalQuestions = useMemo(
    () => (gameId ? getQuestions(gameId).length : 0),
    [gameId]
  );

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const displayRows = useMemo(() => {
    const rows = [...(report?.rows ?? [])];

    rows.sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return rows;
  }, [report, sortKey, sortDir]);

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

    const header = ["Rank", "Student ID", "Name", "Score", "Points"];

    const rows = report.rows.map((r) => [
      r.rank,
      r.studentId,
      r.name,
      `${r.score}/${report.totalQuestions}`,
      r.points,
    ]);

    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz-report.csv";
    a.click();
    URL.revokeObjectURL(url);
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
        <div>Saved at: {fmt(report.savedAt)}</div>
        <div>Last question time: {fmt(report.lastQuestionAt)}</div>
        <div>Total questions: {report.totalQuestions || totalQuestions}</div>
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
                {r.score}/{report.totalQuestions || totalQuestions}
              </td>
              <td className="p-2 font-semibold text-blue-700">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
