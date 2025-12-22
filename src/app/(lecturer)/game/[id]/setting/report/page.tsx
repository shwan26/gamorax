"use client";

export default function ReportPage() {
  // MOCK DATA (later from backend)
  const session = {
    maxTime: 600, // total allowed time (seconds)
    startedAt: "10:00",
    endedAt: "10:15",
    results: [
      { studentId: "6530187", name: "Shwan Myat Nay Chi", score: 20, timeUsed: 300 },
      { studentId: "6530181", name: "Naw Tulip", score: 20, timeUsed: 340 },
      { studentId: "6530143", name: "Min Thuka", score: 15, timeUsed: 420 },
    ],
  };
  
  const ranked = [...session.results]
    .map((r) => {
      const basePoints = r.score * 100;
      const timeBonus = Math.max(0, session.maxTime - r.timeUsed);
      return {
        ...r,
        points: basePoints + timeBonus,
      };
    })
    .sort((a, b) => b.points - a.points);

  return (
    <>
      <h3 className="font-semibold mb-4">Report</h3>

      <p className="text-sm text-gray-600 mb-4">
        Live session: {session.startedAt} – {session.endedAt}
      </p>

      <table className="w-full border">
        <thead className="bg-blue-50">
          <tr>
            <th className="p-2">Rank</th>
            <th className="p-2">Student ID</th>
            <th className="p-2">Name</th>
            <th className="p-2">Score</th>
            <th className="p-2">Points</th>
          </tr>
        </thead>

        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.studentId} className="border-t">
              <td className="p-2 font-semibold">{i + 1}</td>
              <td className="p-2">{r.studentId}</td>
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.score}</td>
              <td className="p-2 font-bold text-blue-700">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
