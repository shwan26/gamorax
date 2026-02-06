"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudentNavbar from "@/src/components/StudentNavbar";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import {
  getAttemptsByStudent,
  type StudentAttempt,
} from "@/src/lib/studentReportStorage";
import { BookOpen, Trophy, Wallet } from "lucide-react";
import type { StudentAccount } from "@/src/lib/studentAuthStorage";

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function AttemptCard({
  a,
  onOpen,
}: {
  a: StudentAttempt;
  onOpen: () => void;
}) {
  const title = a.quizTitle || "Quiz";
  const course = a.courseCode || "No course";
  const scoreText = `${a.correct}/${a.totalQuestions}`;
  const pct =
    a.totalQuestions > 0 ? Math.round((a.correct / a.totalQuestions) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="
        group relative w-full overflow-hidden rounded-3xl p-[1px] text-left
        bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
        shadow-[0_12px_30px_rgba(37,99,235,0.10)]
        transition-all hover:-translate-y-1
        hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)]
        focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
      "
    >
      <div
        className="
          relative rounded-[23px] bg-white ring-1 ring-slate-200/70
          dark:bg-[#071A33] dark:ring-slate-700/60
          p-6
        "
      >
        {/* dots */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* glow */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#00D4FF]/14 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-[#2563EB]/12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity dark:bg-[#3B82F6]/18" />

        <div className="relative flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
            <Trophy className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
                  {title}
                </p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 truncate">
                  Finished {fmt(a.finishedAt)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {scoreText}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {pct}% • +{a.points ?? 0} pts
                </p>
              </div>
            </div>

            {/* chips */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200">
                {course}
              </span>
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200">
                Correct {a.correct}
              </span>
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200">
                Total {a.totalQuestions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function SkeletonLine({ w = "w-full", h = "h-3" }: { w?: string; h?: string }) {
  return (
    <div
      className={[
        "rounded-full bg-slate-200/80 animate-pulse",
        "dark:bg-slate-800/70",
        w,
        h,
      ].join(" ")}
    />
  );
}

function SkeletonBox({ w = "w-10", h = "h-10" }: { w?: string; h?: string }) {
  return (
    <div
      className={[
        "rounded-xl bg-slate-200/80 animate-pulse",
        "dark:bg-slate-800/70",
        w,
        h,
      ].join(" ")}
    />
  );
}

function ToolbarSkeleton() {
  return (
    <div
      className="
        rounded-2xl border border-slate-200/70 bg-white/60 p-3 shadow-sm backdrop-blur
        dark:border-slate-800/70 dark:bg-slate-950/45
        w-full sm:w-auto
      "
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-72">
          <SkeletonBox w="w-full" h="h-10" />
        </div>

        <div className="flex flex-wrap gap-2">
          <SkeletonBox w="w-44" h="h-10" /> {/* select */}
          <SkeletonBox w="w-10" h="h-10" /> {/* toggle */}
          <SkeletonBox w="w-24" h="h-10" /> {/* wallet */}
          <SkeletonBox w="w-28" h="h-10" /> {/* view all */}
        </div>
      </div>
    </div>
  );
}

function AttemptCardSkeleton() {
  return (
    <div
      className="
        relative w-full overflow-hidden rounded-3xl p-[1px] text-left
        bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
        shadow-[0_12px_30px_rgba(37,99,235,0.10)]
      "
    >
      <div
        className="
          relative rounded-[23px] bg-white ring-1 ring-slate-200/70
          dark:bg-[#071A33] dark:ring-slate-700/60
          p-6
        "
      >
        {/* dots */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* subtle glow (static) */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#00D4FF]/10 blur-3xl opacity-40" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl opacity-40 dark:bg-[#3B82F6]/18" />

        <div className="relative flex items-start gap-3">
          {/* icon placeholder */}
          <div className="h-12 w-12 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60" />

          <div className="min-w-0 flex-1">
            {/* top row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine w="w-2/3" h="h-4" />
                <SkeletonLine w="w-1/2" />
              </div>

              <div className="shrink-0 space-y-2 text-right">
                <SkeletonLine w="w-20" h="h-4" />
                <SkeletonLine w="w-28" />
              </div>
            </div>

            {/* chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="h-6 w-24 rounded-full bg-slate-200/80 animate-pulse dark:bg-slate-800/70" />
              <div className="h-6 w-20 rounded-full bg-slate-200/80 animate-pulse dark:bg-slate-800/70" />
              <div className="h-6 w-20 rounded-full bg-slate-200/80 animate-pulse dark:bg-slate-800/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function MePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<StudentAccount | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    setMounted(true);

    (async () => {
      setLoadingMe(true);
      const cur = await getCurrentStudent();
      if (!cur) {
        router.push("/login?role=student");
        return;
      }
      setMe(cur);
      setLoadingMe(false);
    })();
  }, [router]);


  // add state
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const recent6 = useMemo(() => {
      return [...attempts]
        .sort((a, b) => {
          const av = new Date(a.finishedAt).getTime() || 0;
          const bv = new Date(b.finishedAt).getTime() || 0;
          return bv - av; // newest first
        })
        .slice(0, 6);
    }, [attempts]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!me) {
        setAttempts([]);
        return;
      }

      setLoadingAttempts(true);
      try {
        const rows = await getAttemptsByStudent(me.email ?? "");
        if (alive) setAttempts(rows);
      } finally {
        if (alive) setLoadingAttempts(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [me]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen app-surface app-bg">
      <StudentNavbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              My Dashboard
            </h2>

            {loadingMe ? (
              <div className="mt-2 space-y-2">
                <SkeletonLine w="w-64" h="h-4" />
                <SkeletonLine w="w-80" h="h-3" />
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {[me?.firstName, me?.lastName].filter(Boolean).join(" ").trim() || "Student"}
                {me?.studentId ? ` • ${me.studentId}` : ""} • {me?.email}
              </p>
            )}
          </div>

          <div
            className="
              rounded-2xl border border-slate-200/70 bg-white/60 p-3 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
              w-full sm:w-auto
            "
          >
            {loadingMe ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <SkeletonBox w="w-24" h="h-10" />
                <SkeletonBox w="w-28" h="h-10" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div
                  className="
                    inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                    shadow-sm
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200
                  "
                  title="Wallet points"
                >
                  <Wallet className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <span className="font-semibold">{me?.points ?? 0}</span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/me/reports")}
                  className="
                    inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                    text-slate-700 shadow-sm hover:bg-white transition-colors
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80
                  "
                >
                  <BookOpen className="h-4 w-4" />
                  View all
                </button>
              </div>
            )}
          </div>
        </div>


        {loadingMe || loadingAttempts ? (
          <>
            <div className="mt-6">
              <ToolbarSkeleton />
            </div>

            <div className="mt-6 grid items-start gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <AttemptCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 grid items-start gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-2">
              {recent6.map((a) => (
                <AttemptCard key={a.id} a={a} onOpen={() => router.push("/me/reports")} />
              ))}
            </div>

            {attempts.length === 0 && (
              <div
                className="
                  mt-10 rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-center text-sm text-slate-600 backdrop-blur
                  dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-300
                "
              >
                No quiz attempts yet. Join a live quiz with PIN.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
