"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";
import { getCourses, type Course } from "@/src/lib/courseStorage";
import { getGames } from "@/src/lib/gameStorage";
import {
  Plus,
  Search,
  ArrowUpAZ,
  ArrowDownZA,
  BookOpen,
  Filter,
} from "lucide-react";

type SortKey = "courseName" | "courseCode";
type SortDir = "asc" | "desc";

function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/course/${course.id}`}
      className="
        group relative overflow-hidden rounded-3xl p-[1px]
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
          min-h-[140px]   /*  height */
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

        {/* ✅ layout for equal height */}
        <div className="relative flex h-full flex-col">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
              <BookOpen className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
                {course.courseCode}
              </p>

              {/* ✅ clamp so text doesn't change height too much */}
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                {course.courseName}
              </p>
            </div>
          </div>

          {/* ✅ chips pinned to bottom */}
          <div className="mt-auto pt-4 flex flex-wrap gap-2 text-xs">
            {course.section ? (
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200">
                Section {course.section}
              </span>
            ) : null}
            {course.semester ? (
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200">
                {course.semester}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}


function CreateCourseCard() {
  return (
    <Link
      href="/course/create"
      className="
        group relative overflow-hidden rounded-3xl p-[1px]
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
          min-h-[140px]   /*  height */
        "
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex h-full flex-col">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700/70 dark:bg-[#071A33]">
              <Plus className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Create new course
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                Add course code, name, section, and semester.
              </p>
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}

export default function LecturerDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("courseName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setCourses(getCourses());
    getGames();
  }, []);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = courses.filter((c) => {
      const haystack = `${c.courseCode} ${c.courseName} ${c.section} ${c.semester}`.toLowerCase();
      return haystack.includes(q);
    });

    const dir = sortDir === "asc" ? 1 : -1;

    return filtered.sort((a, b) => {
      const av = (a[sortKey] ?? "").toString();
      const bv = (b[sortKey] ?? "").toString();
      return av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true }) * dir;
    });
  }, [courses, query, sortKey, sortDir]);

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Search and open courses. Create a new one anytime.
            </p>
          </div>

          {/* toolbar */}
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
                  placeholder="Search code, name, section, semester"
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
                    <option value="courseCode">Course Code</option>
                    <option value="courseName">Course Name</option>
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
              </div>
            </div>
          </div>
        </div>

        {/* grid */}
        <div className="mt-6 grid items-start gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">

          <CreateCourseCard />
          {filteredSorted.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        {/* empty state */}
        {filteredSorted.length === 0 && (
          <div className="mt-10 rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-center text-sm text-slate-600 backdrop-blur
                          dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-300">
            No courses found. Try a different search, or create a new course.
          </div>
        )}
      </main>
    </div>
  );
}
