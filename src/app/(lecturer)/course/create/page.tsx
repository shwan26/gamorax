"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { saveCourse } from "@/src/lib/courseStorage";

export default function CreateCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    section: "",
    semester: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function handleCreate() {
    if (!form.courseCode.trim() || !form.courseName.trim()) {
      alert("Please fill in Course Code and Course Name.");
      return;
    }

    const id = crypto.randomUUID();

    saveCourse({
      id,
      courseCode: form.courseCode.trim(),
      courseName: form.courseName.trim(),
      section: form.section.trim() || undefined,   // ✅ optional
      semester: form.semester.trim() || undefined, // ✅ optional
    });

    router.push(`/course/${id}`);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 px-4">
        <h2 className="text-2xl font-bold mb-8">Create new course</h2>

        <div className="w-full max-w-lg space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Course Code <span className="text-red-600">*</span>
            </label>
            <input
              name="courseCode"
              value={form.courseCode}
              onChange={handleChange}
              placeholder="Eg. CSX3001"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Course Name <span className="text-red-600">*</span>
            </label>
            <input
              name="courseName"
              value={form.courseName}
              onChange={handleChange}
              placeholder="Eg. Fundamentals of Programming"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Section <span className="text-gray-400">(optional)</span>
            </label>
            <input
              name="section"
              value={form.section}
              onChange={handleChange}
              placeholder="Eg. 541"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Semester <span className="text-gray-400">(optional)</span>
            </label>
            <input
              name="semester"
              value={form.semester}
              onChange={handleChange}
              placeholder="Eg. 2/2025"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={handleCreate}
            className="w-full bg-[#3B8ED6] hover:bg-[#2F79B8] text-white py-2 rounded-md font-semibold shadow-md"
          >
            Create Course
          </button>

          <p className="text-xs text-gray-500 text-center">
            <span className="text-red-600">*</span> required fields
          </p>
        </div>
      </div>
    </div>
  );
}
