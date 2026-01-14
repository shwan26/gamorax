"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";

import { getCourseById, updateCourse, deleteCourse, type Course } from "@/src/lib/courseStorage";
import { getGamesByCourseId, deleteGame } from "@/src/lib/gameStorage";

export default function CourseSettingPage() {
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({
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
        courseCode: c.courseCode,
        courseName: c.courseName,
        section: c.section,
        semester: c.semester,
      });
    }
  }, [courseId]);

  if (!courseId) return <div className="p-6">Missing course id.</div>;
  if (!course) return <div className="p-6">Loading...</div>;

  function handleSave() {
    updateCourse(courseId, form);
    alert("Course updated");
    router.push(`/course/${courseId}`);
  }

  function handleDeleteCourse() {
    if (!confirm("Delete this course and ALL games inside it?")) return;

    // delete games + their question data
    const games = getGamesByCourseId(courseId);
    games.forEach((g) => deleteGame(g.id));

    // delete the course
    deleteCourse(courseId);

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-6">Course Setting</h2>

        {[
          { label: "Course Code", key: "courseCode" },
          { label: "Course Name", key: "courseName" },
          { label: "Section", key: "section" },
          { label: "Semester", key: "semester" },
        ].map(({ label, key }) => (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="border rounded-md px-3 py-2 w-full"
            />
          </div>
        ))}

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

        <button
          onClick={handleDeleteCourse}
          className="text-red-600 font-semibold"
        >
          Delete Course Entirely
        </button>
      </div>
    </div>
  );
}
