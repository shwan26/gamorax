"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GradientButton from "@/src/components/GradientButton";
import { BookOpen } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";

function Field({
  label,
  required,
  optionalText,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  optionalText?: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
        {label}{" "}
        {required ? (
          <span className="text-red-500">*</span>
        ) : optionalText ? (
          <span className="text-slate-400 text-xs font-medium">
            ({optionalText})
          </span>
        ) : null}
      </label>

      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5
          text-slate-900 shadow-sm outline-none backdrop-blur
          placeholder:text-slate-400
          focus:ring-2 focus:ring-[#00D4FF]/40
          dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500
        "
      />
    </div>
  );
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    section: "",
    semester: "",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleCreate() {
    const courseCode = form.courseCode.trim();
    const courseName = form.courseName.trim();
    const section = form.section.trim();
    const semester = form.semester.trim();

    if (!courseCode || !courseName) {
      alert("Please fill in Course Code and Course Name.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("courses_api")
      .insert({
        courseCode,
        courseName,
        section: section || null,
        semester: semester || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      alert("Create course failed: " + error.message);
      return;
    }

    router.push(`/course/${data.id}`);
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:pt-12 sm:pb-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-[#020024] to-[#00D4FF] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#7C3AED]">
              Create new course
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Set up a course for your class. You can add section/semester later
            too.
          </p>
        </div>

        <div
          className="
            relative mt-8 overflow-hidden rounded-3xl
            border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur
            sm:p-8
            dark:border-slate-800/70 dark:bg-slate-950/55
          "
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#020024]/10 blur-3xl dark:bg-[#020024]/30" />

          <div className="relative">
            <div className="flex items-center gap-4">
              <div
                className="
                  shrink-0 rounded-3xl p-[1px]
                  bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                "
              >
                <div className="rounded-3xl bg-white/90 p-3 dark:bg-slate-950/75">
                  <BookOpen className="h-6 w-6 text-[#020024] dark:text-[#00D4FF]" />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Course details
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Fields marked with <span className="text-red-500">*</span> are
                  required.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Course Code"
                required
                name="courseCode"
                value={form.courseCode}
                onChange={handleChange}
                placeholder="e.g. CSX3001"
              />
              <Field
                label="Course Name"
                required
                name="courseName"
                value={form.courseName}
                onChange={handleChange}
                placeholder="e.g. Fundamentals of Programming"
              />

              <Field
                label="Section"
                optionalText="optional"
                name="section"
                value={form.section}
                onChange={handleChange}
                placeholder="e.g. 541"
              />
              <Field
                label="Semester"
                optionalText="optional"
                name="semester"
                value={form.semester}
                onChange={handleChange}
                placeholder="e.g. 2/2025"
              />
            </div>

            <div className="mt-6 space-y-3">
              <GradientButton onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create Course"}
              </GradientButton>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                <span className="text-red-500">*</span> required fields
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} GAMORAX
        </footer>
      </main>
    </div>
  );
}
