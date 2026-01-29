"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { supabase } from "@/src/lib/supabaseClient";
import { useLecturerGuard } from "../../../../../lib/useLecturerGuard";

type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  section?: string | null;
  semester?: string | null;
};

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

  // ✅ Guard
  const { loading: guardLoading } = useLecturerGuard(`/course/${courseId}/setting`);

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);

  const [form, setForm] = useState<FormState>({
    courseCode: "",
    courseName: "",
    section: "",
    semester: "",
  });

  async function loadCourse() {
    if (!courseId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("courses_api")
      .select("id, courseCode, courseName, section, semester")
      .eq("id", courseId)
      .single();

    if (error) {
      alert("Load course error: " + error.message);
      setCourse(null);
      setLoading(false);
      return;
    }

    const c = data as Course;
    setCourse(c);

    setForm({
      courseCode: c.courseCode ?? "",
      courseName: c.courseName ?? "",
      section: c.section ?? "",
      semester: c.semester ?? "",
    });

    setLoading(false);
  }

  useEffect(() => {
    if (guardLoading) return;
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardLoading, courseId]);

  async function handleSave() {
    const code = form.courseCode.trim();
    const name = form.courseName.trim();

    if (!code || !name) {
      alert("Course Code and Course Name are required.");
      return;
    }

    const { error } = await supabase
      .from("courses_api")
      .update({
        courseCode: code,
        courseName: name,
        section: form.section.trim() || null,
        semester: form.semester.trim() || null,
      })
      .eq("id", courseId);

    if (error) {
      alert("Save failed: " + error.message);
      return;
    }

    alert("✅ Course updated");
    router.push(`/course/${courseId}`);
  }

  async function handleDeleteCourse() {
    if (!confirm("Delete this course and ALL games inside it?")) return;

    // 1) delete games under this course
    const { error: gErr } = await supabase.from("games_api").delete().eq("courseId", courseId);
    if (gErr) return alert("Delete games error: " + gErr.message);

    // 2) delete course
    const { error: cErr } = await supabase.from("courses_api").delete().eq("id", courseId);
    if (cErr) return alert("Delete course error: " + cErr.message);

    router.push("/dashboard");
  }

  // ✅ Safe returns AFTER hooks are declared
  if (guardLoading) return null;
  if (!courseId) return <div className="p-6">Missing course id.</div>;
  if (loading) return <div className="p-6">Loading...</div>;
  if (!course) return <div className="p-6">Course not found.</div>;

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
            type="button"
          >
            Save
          </button>

          <button
            onClick={() => router.push(`/course/${courseId}`)}
            className="border bg-white px-5 py-2 rounded-md font-semibold"
            type="button"
          >
            Cancel
          </button>
        </div>

        <hr className="my-6" />

        <button
          onClick={handleDeleteCourse}
          className="text-red-600 font-semibold"
          type="button"
        >
          Delete Course Entirely
        </button>
      </div>
    </div>
  );
}
