export type Course = {
  id: string;
  courseCode: string;        // ✅ required
  courseName: string;        // ✅ required
  section?: string;          // ✅ optional
  semester?: string;         // ✅ optional
};

const COURSE_KEY = "gamorax_courses";

function normalizeCourse(c: any): Course {
  return {
    id: String(c?.id ?? crypto.randomUUID()),
    courseCode: String(c?.courseCode ?? ""),
    courseName: String(c?.courseName ?? ""),
    section: c?.section ? String(c.section) : undefined,
    semester: c?.semester ? String(c.semester) : undefined,
  };
}

function getAllCourses(): Course[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(COURSE_KEY);
  const raw = data ? JSON.parse(data) : [];
  return Array.isArray(raw) ? raw.map(normalizeCourse) : [];
}

function saveAllCourses(courses: Course[]) {
  localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
}

export function getCourses(): Course[] {
  return getAllCourses();
}

export function getCourseById(id: string): Course | null {
  return getAllCourses().find((c) => c.id === id) || null;
}

export function saveCourse(course: Course) {
  const courses = getAllCourses();
  courses.push(normalizeCourse(course));
  saveAllCourses(courses);
}

export function updateCourse(id: string, data: Partial<Omit<Course, "id">>) {
  const courses = getAllCourses();
  const idx = courses.findIndex((c) => c.id === id);
  if (idx === -1) return;

  courses[idx] = normalizeCourse({ ...courses[idx], ...data });
  saveAllCourses(courses);
}

export function deleteCourse(id: string) {
  const courses = getAllCourses().filter((c) => c.id !== id);
  saveAllCourses(courses);
}
