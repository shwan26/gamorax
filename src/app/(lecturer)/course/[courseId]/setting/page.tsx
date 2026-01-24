"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";

import {
  getCourseById,
  updateCourse,
  deleteCourse,
  type Course,
} from "@/src/lib/courseStorage";
import { getGamesByCourseId, deleteGame } from "@/src/lib/gameStorage";
import { ArrowLeft, Settings, Trash2 } from "lucide-react";

type FormState = {
  courseCode: string;
  courseName: string;
  section: string;
  semester: string;
};

export default function CourseSettingPage() {
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<FormState>({
    courseCode: "",
    courseName: "",
    section: "",
    semester: "",
  });

  useEffect(() => {
    if (!courseId) return;
    const c = getCourseById(courseId);
    setCourse(c);

    if (c) {
      setForm({
        courseCode: c.courseCode ?? "",
        courseName: c.courseName ?? "",
        section: c.section ?? "",
        semester: c.semester ?? "",
      });
    }
  }, [courseId]);

  if (!courseId) return <div className="p-6">Missing course id.</div>;
  if (!course) return <div className="p-6">Loading...</div>;

  function handleSave() {
    if (!form.courseCode.trim() || !form.courseName.trim()) {
      alert("Course Code and Course Name are required.");
      return;
    }

    updateCourse(courseId, {
      courseCode: form.courseCode.trim(),
      courseName: form.courseName.trim(),
      section: form.section.trim() || undefined,
      semester: form.semester.trim() || undefined,
    });

    alert("Course updated");
    router.push(`/course/${courseId}`);
  }

  function handleDeleteCourse() {
    if (!confirm("Delete this course and ALL games inside it?")) return;

    const games = getGamesByCourseId(courseId);
    games.forEach((g) => deleteGame(g.id));

    deleteCourse(courseId);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
        <div className="w-full max-w-md">
          {/* back */}
          <Link
            href={`/course/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>

          {/* card shell */}
          <div
            className="
              mt-4 overflow-hidden rounded-3xl p-[1px]
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              shadow-[0_12px_30px_rgba(37,99,235,0.10)]
              dark:shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_18px_50px_rgba(56,189,248,0.10)]
            "
          >
            <div
              className="
                relative rounded-[23px] bg-white p-6 ring-1 ring-slate-200/70
                dark:bg-[#071A33] dark:ring-slate-700/60
                sm:p-7
              "
            >
              {/* dots */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />

              {/* header */}
              <div className="relative flex items-start gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-700/70 dark:bg-[#0B2447]">
                  <Settings className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    Course Setting
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Update course details or delete the course.
                  </p>
                </div>
              </div>

              {/* form */}
              <div className="relative mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.courseCode}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, courseCode: e.target.value }))
                    }
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Course Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.courseName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, courseName: e.target.value }))
                    }
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                    "
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Section <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={form.section}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, section: e.target.value }))
                    }
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                    "
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Semester <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={form.semester}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, semester: e.target.value }))
                    }
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                    "
                  />
                </div>

                {/* actions */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="
                      flex-1 rounded-xl py-3 text-sm font-semibold text-white
                      bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                      shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                      hover:opacity-95 active:scale-[0.99] transition
                      focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                    "
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/course/${courseId}`)}
                    className="
                      flex-1 rounded-xl py-3 text-sm font-semibold
                      border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm
                      hover:bg-white transition-colors
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-950/80
                      focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/30
                    "
                  >
                    Cancel
                  </button>
                </div>

                {/* danger */}
                <div className="pt-4">
                  <div className="h-px bg-slate-200/70 dark:bg-slate-700/60" />

                  <div className="mt-4 rounded-2xl border border-red-200/70 bg-white/60 p-4 dark:border-red-900/35 dark:bg-slate-950/35">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Danger Zone
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      This will delete the course and all games inside it.
                    </p>

                    <button
                      type="button"
                      onClick={handleDeleteCourse}
                      className="
                        mt-3 inline-flex w-full items-center justify-center gap-2
                        rounded-xl border border-red-200/80 bg-white/70 px-4 py-2.5
                        text-sm font-semibold text-red-600 shadow-sm
                        hover:bg-white transition-colors
                        dark:border-red-900/40 dark:bg-slate-950/50 dark:text-red-400 dark:hover:bg-slate-950/80
                        focus:outline-none focus:ring-2 focus:ring-red-400/40
                      "
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Course Entirely
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
        </div>
      </main>
    </div>
  );
}
