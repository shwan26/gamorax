"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { listAssignmentsByGame } from "@/src/lib/assignmentStorage";
import { listAttemptsByAssignment } from "@/src/lib/assignmentAttemptStorage";

export default function AssignmentReportPage() {
  const params = useParams<{ gameId?: string }>();
  const gameId = String(params?.gameId ?? "");

  const assignments = useMemo(() => listAssignmentsByGame(gameId), [gameId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold">Assignment Reports</h2>

      {assignments.length === 0 ? (
        <div className="text-sm text-slate-600">No assignments yet.</div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const attempts = listAttemptsByAssignment(a.id);
            const avg = attempts.length
              ? Math.round(attempts.reduce((s, x) => s + x.scorePct, 0) / attempts.length)
              : 0;

            return (
              <div key={a.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                <div className="text-sm font-extrabold">{a.title}</div>
                <div className="mt-1 text-xs text-slate-600">
                  Attempts: {attempts.length} • Avg: {avg}%
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3">Submitted</th>
                        <th className="py-2 pr-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((t) => (
                        <tr key={t.id} className="border-t border-slate-200/60">
                          <td className="py-2 pr-3">{t.studentName} ({t.studentId})</td>
                          <td className="py-2 pr-3">{new Date(t.submittedAt).toLocaleString()}</td>
                          <td className="py-2 pr-3 font-extrabold">{t.scorePct}%</td>
                        </tr>
                      ))}
                      {attempts.length === 0 ? (
                        <tr>
                          <td className="py-3 text-xs text-slate-500" colSpan={3}>
                            No attempts yet (note: localStorage demo mode).
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
