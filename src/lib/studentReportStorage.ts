export type StudentAttempt = {
  id: string;

  studentEmail: string;
  studentId: string;
  studentName: string;
  avatarSrc?: string;

  pin: string;
  gameId?: string;

  // optional metadata (if you have it)
  courseCode?: string;
  courseName?: string;
  section?: string;
  semester?: string;
  quizTitle?: string;

  totalQuestions: number;
  correct: number;
  points: number; // earned points for this quiz (time-based rule)

  finishedAt: string; // ISO

  // optional breakdown (good for future detail page)
  perQuestion?: Array<{
    number: number; // 1-based
    answerIndex: number; // 0-3
    correctIndex: number; // 0-3
    timeUsed: number; // sec
    maxTime: number; // sec
    isCorrect: boolean;
    pointsEarned: number;
  }>;
};

const KEY = "gamorax_student_attempts";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getAll(): StudentAttempt[] {
  if (typeof window === "undefined") return [];
  return safeParse<StudentAttempt[]>(localStorage.getItem(KEY), []);
}

function saveAll(list: StudentAttempt[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveStudentAttempt(attempt: StudentAttempt) {
  const all = getAll();

  // avoid duplicates if same id saved twice
  if (all.some((a) => a.id === attempt.id)) return;

  all.push(attempt);
  // newest first
  all.sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)));
  saveAll(all);
}

export function getAttemptsByStudent(email: string): StudentAttempt[] {
  const e = String(email || "").trim().toLowerCase();
  return getAll().filter((a) => a.studentEmail === e);
}

export function getAttemptById(id: string): StudentAttempt | null {
  return getAll().find((a) => a.id === id) ?? null;
}

export function deleteAttempt(id: string) {
  const all = getAll().filter((a) => a.id !== id);
  saveAll(all);
}
