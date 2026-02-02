// src/lib/assignmentReportStorage.ts
import { supabase } from "@/src/lib/supabaseClient";
import {
  listAttemptsByAssignment,
  type AssignmentAttempt,
} from "@/src/lib/assignmentAttemptStorage";

export type AssignmentReportStats = {
  students: number;
  scorePct: { min: number; max: number; avg: number };
  points: { min: number; max: number; avg: number };
};

export type AssignmentHistoryRow = {
  id: string;              // assignment id
  title: string;
  token: string;           // public_token
  opensAt: string | null;
  dueAt: string | null;
  durationSec: number;

  students: number;
  avgScorePct: number;
  avgPoints: number;
};

export type AssignmentDetailRow = {
  rank: number;
  studentId: string;
  name: string;
  scorePct: number;
  points: number;
  submittedAt: string;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeAssignmentReportStats(attempts: AssignmentAttempt[]): AssignmentReportStats {
  const students = attempts.length;

  const scorePctArr = attempts.map((a) => Number(a.scorePct ?? 0));
  const pointsArr = attempts.map((a) => Number(a.points ?? 0));

  const stat = (arr: number[]) => {
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    return { min: round2(min), max: round2(max), avg: round2(avg) };
  };

  return {
    students,
    scorePct: stat(scorePctArr),
    points: stat(pointsArr),
  };
}

/**
 * History page: get assignments + attempts grouped by assignment
 * (Uses a single attempts query via IN to avoid N+1)
 */
export async function listAssignmentsWithAttemptsByGame(gameId: string) {
  const { data: as, error: aErr } = await supabase
    .from("assignments")
    .select("id, public_token, title, opens_at, due_at, duration_sec, created_at")
    .eq("quiz_id", gameId)
    .order("created_at", { ascending: false });

  if (aErr) throw aErr;

  const assignments = as ?? [];
  if (!assignments.length) {
    return { assignments: [], attemptsByAssignment: {} as Record<string, AssignmentAttempt[]> };
  }

  const ids = assignments.map((x: any) => x.id);

  const { data: at, error: tErr } = await supabase
    .from("assignment_attempts")
    .select(
      "id, assignment_id, profile_id, student_email, student_id, student_name, started_at, submitted_at, total_questions, correct, score_pct, points, answers"
    )
    .in("assignment_id", ids)
    .order("submitted_at", { ascending: false });

  if (tErr) throw tErr;

  // map rows to your AssignmentAttempt type (same as assignmentAttempts.ts)
  const attempts: AssignmentAttempt[] = (at ?? []).map((r: any) => ({
    id: r.id,
    assignmentId: r.assignment_id,
    profileId: r.profile_id,
    studentEmail: r.student_email,
    studentId: r.student_id,
    studentName: r.student_name,
    startedAt: r.started_at,
    submittedAt: r.submitted_at,
    totalQuestions: r.total_questions,
    correct: r.correct,
    scorePct: r.score_pct,
    points: r.points,
    answers: r.answers ?? {},
  }));

  const map: Record<string, AssignmentAttempt[]> = {};
  for (const id of ids) map[id] = [];
  for (const t of attempts) map[t.assignmentId] = [...(map[t.assignmentId] ?? []), t];

  return { assignments, attemptsByAssignment: map };
}

export async function getAssignmentById(id: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("id, quiz_id, course_id, public_token, title, opens_at, due_at, duration_sec, created_at")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as any;
}

/**
 * Detail page helper: just reuse existing attempt storage
 */
export async function listAttemptsByAssignmentId(assignmentId: string) {
  return listAttemptsByAssignment(assignmentId);
}

export function rankAssignmentAttempts(attempts: AssignmentAttempt[]): AssignmentDetailRow[] {
  const rows = attempts.map((t) => ({
    rank: 0,
    studentId: String(t.studentId ?? ""),
    name: String(t.studentName ?? "Student"),
    scorePct: Number(t.scorePct ?? 0),
    points: Number(t.points ?? 0),
    submittedAt: String(t.submittedAt ?? ""),
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.scorePct !== a.scorePct) return b.scorePct - a.scorePct;

    const ta = new Date(a.submittedAt).getTime();
    const tb = new Date(b.submittedAt).getTime();
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;

    return a.studentId.localeCompare(b.studentId);
  });

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
