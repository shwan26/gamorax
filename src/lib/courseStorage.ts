// src/lib/courseStorage.ts
import { supabase } from "@/src/lib/supabaseClient";

export type Course = {
  id: string;
  courseCode: string; // required
  courseName: string; // required
  section?: string; // optional
  semester?: string; // optional
  createdAt?: string;
  updatedAt?: string;

  // optional if you ever want it (exists in view)
  lecturerId?: string;
};

/* =======================
   READ
======================= */

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses_api")
    .select("id, lecturerId, courseCode, courseName, section, semester, createdAt, updatedAt")
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses_api")
    .select("id, lecturerId, courseCode, courseName, section, semester, createdAt, updatedAt")
    .eq("id", id)
    .single();

  if (error) {
    // PostgREST: "No rows" => return null
    if ((error as any)?.code === "PGRST116") return null;
    throw error;
  }

  return (data ?? null) as Course | null;
}

/* =======================
   CREATE
======================= */

// Replaces saveCourse()
export async function createCourse(input: {
  courseCode: string;
  courseName: string;
  section?: string;
  semester?: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("courses_api")
    .insert({
      courseCode: input.courseCode,
      courseName: input.courseName,
      section: input.section ?? null,
      semester: input.semester ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

/* =======================
   UPDATE
======================= */

// Replaces updateCourse()
export async function updateCourse(
  id: string,
  data: Partial<Omit<Course, "id" | "lecturerId" | "createdAt" | "updatedAt">>
) {
  const patch: any = { ...data };

  // normalize optional fields to null (so clearing works)
  if ("section" in patch) patch.section = patch.section ?? null;
  if ("semester" in patch) patch.semester = patch.semester ?? null;

  const { error } = await supabase.from("courses_api").update(patch).eq("id", id);
  if (error) throw error;
}

/* =======================
   DELETE
======================= */

// Replaces deleteCourse()
export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses_api").delete().eq("id", id);
  if (error) throw error;
}

/* =======================
   Backward-compat helpers (optional)
   If your UI still calls saveCourse(course: Course)
======================= */

// Keep this ONLY if you already have many calls like saveCourse(course)
export async function saveCourse(course: Course) {
  // If it already has an id, treat as update
  if (course?.id) {
    await updateCourse(course.id, {
      courseCode: course.courseCode,
      courseName: course.courseName,
      section: course.section,
      semester: course.semester,
    });
    return;
  }

  // else create
  await createCourse({
    courseCode: course.courseCode,
    courseName: course.courseName,
    section: course.section,
    semester: course.semester,
  });
}
