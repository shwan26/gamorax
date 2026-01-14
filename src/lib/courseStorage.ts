export type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  semester: string;
};

const COURSE_KEY = "gamorax_courses";

function getAllCourses(): Course[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(COURSE_KEY);
  return data ? (JSON.parse(data) as Course[]) : [];
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
  courses.push(course);
  saveAllCourses(courses);
}

export function updateCourse(id: string, data: Partial<Omit<Course, "id">>) {
  const courses = getAllCourses();
  const idx = courses.findIndex((c) => c.id === id);
  if (idx === -1) return;

  courses[idx] = { ...courses[idx], ...data };
  saveAllCourses(courses);
}

export function deleteCourse(id: string) {
  const courses = getAllCourses().filter((c) => c.id !== id);
  saveAllCourses(courses);
}
