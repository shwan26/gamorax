"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudentNavbar from "@/src/components/StudentNavbar";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import {
  getAttemptsByStudent,
  type StudentAttempt,
} from "@/src/lib/studentReportStorage";
import {
  Search,
  Filter,
  ArrowUpAZ,
  ArrowDownZA,
  BookOpen,
  Trophy,
  Wallet,
} from "lucide-react";
import type { StudentAccount } from "@/src/lib/studentAuthStorage";

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type SortKey = "finishedAt" | "score" | "courseCode" | "quizTitle";
type SortDir = "asc" | "desc";

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

export default function MePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<StudentAccount | null>(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("finishedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    setMounted(true);

    (async () => {
      const cur = await getCurrentStudent();
      if (!cur) {
        router.push("/auth/login");
        return;
      }
      setMe(cur);
    })();
  }, [router]);

  // add state
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

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


  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = attempts.filter((a) => {
      const haystack =
        `${a.quizTitle ?? ""} ${a.courseCode ?? ""} ${a.correct}/${a.totalQuestions} ${a.points ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });

    const dir = sortDir === "asc" ? 1 : -1;

    return filtered.sort((a, b) => {
      if (sortKey === "finishedAt") {
        const av = new Date(a.finishedAt).getTime() || 0;
        const bv = new Date(b.finishedAt).getTime() || 0;
        return (av - bv) * dir;
      }

      if (sortKey === "score") {
        const av = (a.totalQuestions ? a.correct / a.totalQuestions : 0) || 0;
        const bv = (b.totalQuestions ? b.correct / b.totalQuestions : 0) || 0;
        return (av - bv) * dir;
      }

      const av = ((a as any)[sortKey] ?? "").toString();
      const bv = ((b as any)[sortKey] ?? "").toString();
      return av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true }) * dir;
    });
  }, [attempts, query, sortKey, sortDir]);

  const last = filteredSorted.slice(0, 6);

  if (!mounted) return null;
  if (!me) return null;

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
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {[me.firstName, me.lastName].filter(Boolean).join(" ").trim() || "Student"}
              {me.studentId ? ` • ${me.studentId}` : ""} • {me.email}
            </p>
          </div>

          {/* toolbar (same feel as lecturer dashboard) */}
          <div
            className="
              rounded-2xl border border-slate-200/70 bg-white/60 p-3 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
              w-full sm:w-auto
            "
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* search */}
              
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder="Search quizzes / course code"
                  className="
                    w-full rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-3 py-2.5 text-sm
                    shadow-sm outline-none
                    focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                  "
                />
              </div>

              {/* sort */}
              <div className="flex gap-2">
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="
                      rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-8 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                    "
                  >
                    <option value="finishedAt">Finished time</option>
                    <option value="score">Score</option>
                    <option value="courseCode">Course code</option>
                    <option value="quizTitle">Quiz title</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="
                    inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                    text-slate-700 shadow-sm hover:bg-white transition-colors
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80
                  "
                  aria-label="Toggle sort direction"
                  title="Toggle sort direction"
                >
                  {sortDir === "asc" ? (
                    <ArrowUpAZ className="h-4 w-4" />
                  ) : (
                    <ArrowDownZA className="h-4 w-4" />
                  )}
                </button>

                {/* wallet */}
                <div
                  className="
                    inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                    shadow-sm
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200
                  "
                  title="Wallet points"
                >
                  <Wallet className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <span className="font-semibold">{me.points ?? 0}</span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/me/reports")}
                  className="
                    inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                    text-slate-700 shadow-sm hover:bg-white transition-colors
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80
                  "
                >
                  <BookOpen className="h-4 w-4" />
                  View all
                </button>
              </div>
            </div>
          </div>
        </div>

        {loadingAttempts && (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-300">
            Loading attempts...
          </div>
        )}

        {/* grid */}
        <div className="mt-6 grid items-start gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-2">
          {last.map((a) => (
            <AttemptCard
              key={a.id}
              a={a}
              onOpen={() => router.push("/me/reports")}
            />
          ))}
        </div>
        

        {/* empty state */}
        {filteredSorted.length === 0 && (
          <div
            className="
              mt-10 rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-center text-sm text-slate-600 backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-300
            "
          >
            No quiz attempts yet. Join a live quiz with PIN.
          </div>
        )}
      </main>
    </div>
  );
}
