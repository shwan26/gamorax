"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudentNavbar from "@/src/components/StudentNavbar";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import { getAttemptsByStudent, type StudentAttempt } from "@/src/lib/studentReportStorage";

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function MeReportsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<ReturnType<typeof getCurrentStudent>>(null);

  useEffect(() => {
    setMounted(true);
    const cur = getCurrentStudent();
    if (!cur) {
      router.push("/auth/login");
      return;
    }
    setMe(cur);
  }, [router]);

  const all = useMemo<StudentAttempt[]>(() => {
    if (!me) return [];
    return getAttemptsByStudent(me.email);
  }, [me]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;

    return all.filter((a) => {
      const hay = [
        a.pin,
        a.quizTitle,
        a.courseCode,
        a.courseName,
        a.section,
        a.semester,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [all, q]);

  if (!mounted) return null;
  if (!me) return null;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <StudentNavbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-extrabold text-[#034B6B]">My Reports</h1>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search course / quiz / PIN..."
            className="w-full md:w-80 border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-6 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-6 px-4 py-3 text-xs font-semibold text-gray-600 bg-[#f2f7ff]">
            <div className="col-span-2">Quiz</div>
            <div>PIN</div>
            <div>Score</div>
            <div>Points</div>
            <div>Finished</div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-sm text-gray-600">
              No reports found.
            </div>
          ) : (
            filtered.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-6 px-4 py-4 border-t text-sm hover:bg-[#f9fbff]"
              >
                <div className="col-span-2">
                  <div className="font-semibold text-gray-900">
                    {a.quizTitle || "Quiz"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {a.courseCode ? `${a.courseCode} • ` : ""}
                    {a.courseName || ""}
                  </div>
                </div>
                <div className="text-gray-800">{a.pin}</div>
                <div className="font-bold text-[#034B6B]">
                  {a.correct}/{a.totalQuestions}
                </div>
                <div className="font-semibold text-[#034B6B]">{a.points}</div>
                <div className="text-xs text-gray-600">{fmt(a.finishedAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
