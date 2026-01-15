"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";
import { getCourses, type Course } from "@/src/lib/courseStorage";
import { getGames } from "@/src/lib/gameStorage";

type SortKey = "courseName" | "courseCode";
type SortDir = "asc" | "desc";

export default function LecturerDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");

  // default: alphabet order by course name
  const [sortKey, setSortKey] = useState<SortKey>("courseName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setCourses(getCourses());
    getGames(); // triggers legacy migration once, if needed
  }, []);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = courses.filter((c) => {
      const haystack = `${c.courseCode} ${c.courseName} ${c.section} ${c.semester}`.toLowerCase();
      return haystack.includes(q);
    });

    const dir = sortDir === "asc" ? 1 : -1;

    // localeCompare handles text sorting well; numeric helps CSX2 vs CSX10
    return filtered.sort((a, b) => {
      const av = (a[sortKey] ?? "").toString();
      const bv = (b[sortKey] ?? "").toString();
      return av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true }) * dir;
    });
  }, [courses, query, sortKey, sortDir]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by code, name, section, semester"
              className="border px-4 py-2 rounded-md w-full md:w-72"
            />

            {/* Sort Key */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="border px-3 py-2 rounded-md"
            >
              <option value="courseCode">Sort: Course Code</option>
              <option value="courseName">Sort: Course Name</option>
            </select>

            {/* Sort Direction */}
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as SortDir)}
              className="border px-3 py-2 rounded-md"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </div>

        {/* Course Cards */}
        <div className="flex gap-6 flex-wrap">
          {/* Create New Course */}
          <Link
            href="/course/create"
            className="bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                       px-10 py-10 rounded-xl shadow-md hover:scale-105
                       transition flex items-center gap-4"
          >
            <span className="text-3xl font-bold">＋</span>
            <span className="text-lg">Create new course</span>
          </Link>

          {/* Existing Courses */}
          {filteredSorted.map((course) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="w-72 p-6 bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                         rounded-xl shadow-md hover:scale-105 transition
                         flex flex-col justify-center"
            >
              <p className="font-semibold text-lg">{course.courseCode}</p>
              <p className="text-sm">{course.courseName}</p>
              <p className="text-sm">
                {course.section ? `Section ${course.section}` : ""} {course.semester? course.semester : ""}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
