"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";

import {
  getCourseById,
  updateCourse,
  deleteCourse,
  type Course,
} from "@/src/lib/courseStorage";
import { getGamesByCourseId, deleteGame } from "@/src/lib/gameStorage";

type FormState = {
  courseCode: string;
  courseName: string;
  section: string;  // UI always string
  semester: string; // UI always string
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
        section: c.section ?? "",   // ✅ optional -> ""
        semester: c.semester ?? "", // ✅ optional -> ""
      });
    }
  }, [courseId]);

  if (!courseId) return <div className="p-6">Missing course id.</div>;
  if (!course) return <div className="p-6">Loading...</div>;

  function handleSave() {
    // ✅ required fields
    if (!form.courseCode.trim() || !form.courseName.trim()) {
      alert("Course Code and Course Name are required.");
      return;
    }

    updateCourse(courseId, {
      courseCode: form.courseCode.trim(),
      courseName: form.courseName.trim(),
      section: form.section.trim() || undefined,   // ✅ empty -> undefined
      semester: form.semester.trim() || undefined, // ✅ empty -> undefined
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
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-6">Course Setting</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Course Code <span className="text-red-600">*</span>
          </label>
          <input
            value={form.courseCode}
            onChange={(e) => setForm((p) => ({ ...p, courseCode: e.target.value }))}
            className="border rounded-md px-3 py-2 w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Course Name <span className="text-red-600">*</span>
          </label>
          <input
            value={form.courseName}
            onChange={(e) => setForm((p) => ({ ...p, courseName: e.target.value }))}
            className="border rounded-md px-3 py-2 w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Section <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={form.section}
            onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
            className="border rounded-md px-3 py-2 w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Semester <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={form.semester}
            onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
            className="border rounded-md px-3 py-2 w-full"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="bg-[#3B8ED6] hover:bg-[#2F79B8] text-white px-5 py-2 rounded-md font-semibold"
          >
            Save
          </button>

          <button
            onClick={() => router.push(`/course/${courseId}`)}
            className="border bg-white px-5 py-2 rounded-md font-semibold"
          >
            Cancel
          </button>
        </div>

        <hr className="my-6" />

        <button onClick={handleDeleteCourse} className="text-red-600 font-semibold">
          Delete Course Entirely
        </button>
      </div>
    </div>
  );
}
