// src/lib/assignmentAttemptStorage.ts
export type AssignmentAttempt = {
  id: string;
  assignmentId: string;

  studentEmail: string;
  studentId: string;
  studentName: string;

  startedAt: string;   // ISO
  submittedAt: string; // ISO

  totalQuestions: number;
  correct: number;
  scorePct: number;

  // store student answers for review
  answers: Record<string, any>; // key = questionId
};

const KEY = "gamorax_assignment_attempts";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getAll(): AssignmentAttempt[] {
  if (typeof window === "undefined") return [];
  return safeParse<AssignmentAttempt[]>(localStorage.getItem(KEY), []);
}

function saveAll(list: AssignmentAttempt[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveAssignmentAttempt(attempt: AssignmentAttempt) {
  const all = getAll();
  if (all.some((a) => a.id === attempt.id)) return;
  all.unshift(attempt);
  saveAll(all);
}

export function listAttemptsByAssignment(assignmentId: string): AssignmentAttempt[] {
  return getAll().filter((a) => a.assignmentId === assignmentId);
}
