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

export default function MePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
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

  const attempts: StudentAttempt[] = useMemo(() => {
    if (!me) return [];
    return getAttemptsByStudent(me.email);
  }, [me]);

  const last5 = attempts.slice(0, 5);

  if (!mounted) return null;
  if (!me) return null;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <StudentNavbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#034B6B]">My Dashboard</h1>
            <p className="text-sm text-gray-700 mt-1">
              {me.name} • {me.studentId} • {me.email}
            </p>
          </div>

          <div className="bg-white border rounded-xl px-5 py-4 shadow-sm w-full md:w-auto">
            <div className="text-xs text-gray-600">Wallet Points</div>
            <div className="text-3xl font-extrabold text-[#034B6B]">{me.points ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Recent reports */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#034B6B]">Recent Quizzes</h2>
              <button
                onClick={() => router.push("/me/reports")}
                className="text-sm text-[#3B8ED6] hover:underline"
                type="button"
              >
                View all
              </button>
            </div>

            {last5.length === 0 ? (
              <p className="text-sm text-gray-600 mt-4">
                No quiz attempts yet. Join a live quiz with PIN.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {last5.map((a) => (
                  <div
                    key={a.id}
                    className="border rounded-lg p-4 bg-[#f9fbff] hover:bg-[#f2f7ff] cursor-pointer"
                    onClick={() => router.push("/me/reports")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-gray-900">
                        {a.quizTitle || "Quiz"}{" "}
                        <span className="text-xs text-gray-500">
                          • {a.courseCode ? a.courseCode : "No course"}
                        </span>

                      </div>
                      <div className="text-sm font-bold text-[#034B6B]">
                        {a.correct}/{a.totalQuestions}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 mt-1">
                      Finished: {fmt(a.finishedAt)} • Points earned:{" "}
                      <span className="font-semibold">{a.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
