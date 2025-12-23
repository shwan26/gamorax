"use client";

import { useMemo, useState } from "react";

type SortKey = "rank" | "studentId" | "name" | "score" | "points";
type SortDir = "asc" | "desc";

type ResultRow = {
  studentId: string;
  name: string;
  score: number;
  timeUsed: number;
  points: number;
  rank: number;
};

export default function ReportPage() {
  /* MOCK DATA (later from backend) */
  const session = {
    maxTime: 600,
    startedAt: "10:00",
    endedAt: "10:15",
    totalQuestions: 20,
    results: [
      { studentId: "6530187", name: "Shwan Myat Nay Chi", score: 20, timeUsed: 300 },
      { studentId: "6530181", name: "Naw Tulip", score: 20, timeUsed: 340 },
      { studentId: "6530143", name: "Min Thuka", score: 15, timeUsed: 420 },
    ],
  };

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /* ---------- CALCULATE POINTS + RANK ---------- */
  const rankedRows: ResultRow[] = useMemo(() => {
    const withPoints = session.results.map((r) => {
      const base = r.score * 100;
      const timeBonus = Math.max(0, session.maxTime - r.timeUsed);
      return { ...r, points: base + timeBonus };
    });

    const sortedByPoints = [...withPoints].sort(
      (a, b) => b.points - a.points
    );

    return sortedByPoints.map((r, i) => ({
      ...r,
      rank: i + 1,
    }));
  }, [session.results, session.maxTime]);

  /* ---------- DISPLAY SORT (RANK FIXED) ---------- */
  const displayRows = useMemo(() => {
    const rows = [...rankedRows];
    rows.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc"
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      }

      return sortDir === "asc"
        ? Number(va) - Number(vb)
        : Number(vb) - Number(va);
    });

    return rows;
  }, [rankedRows, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
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

  /* ---------- DOWNLOAD CSV ---------- */
  function downloadCSV() {
    const header = [
      "Rank",
      "Student ID",
      "Name",
      "Score",
      "Points",
    ];

    const rows = rankedRows.map((r) => [
      r.rank,
      r.studentId,
      r.name,
      `${r.score}/${session.totalQuestions}`,
      r.points,
    ]);

    const csv =
      [header, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const Th = ({
    label,
    sort,
  }: {
    label: string;
    sort: SortKey;
  }) => (
    <th
      onClick={() => onSort(sort)}
      className="p-2 cursor-pointer select-none hover:bg-blue-100"
    >
      {label}
      <span className="text-xs">{sortIcon(sort)}</span>
    </th>
  );

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

      <p className="text-sm text-gray-600 mb-4">
        Live session: {session.startedAt} – {session.endedAt}
      </p>

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
                {r.score}/{session.totalQuestions}
              </td>
              <td className="p-2 font-semibold text-blue-700">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
