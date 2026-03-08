// src/lib/assignmentReportStorage.ts
import { supabase } from "@/src/lib/supabaseClient";
import {
  listAttemptsByAssignment,
  type AssignmentAttempt,
} from "@/src/lib/assignmentAttemptStorage";

export type AssignmentReportStats = {
  students: number;
  score: { min: number; max: number; avg: number };
};

export type AssignmentHistoryRow = {
  id: string;
  title: string;
  token: string;
  opensAt: string | null;
  dueAt: string | null;
  durationSec: number;
  students: number;
  avgScore: number;
};

export type AssignmentDetailRow = {
  rank: number;
  studentId: string;
  name: string;
  correct: number;
  total: number;
  score: number;
  timeSpentSec: number;
  submittedAt: string;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeAssignmentReportStats(attempts: AssignmentAttempt[]): AssignmentReportStats {
  const students = attempts.length;
  const scoreArr = attempts.map((a) => Number(a.score ?? 0));

  const stat = (arr: number[]) => {
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    return {
      min: round2(Math.min(...arr)),
      max: round2(Math.max(...arr)),
      avg: round2(arr.reduce((s, x) => s + x, 0) / arr.length),
    };
  };

  return {
    students,
    score: stat(scoreArr),
  };
}

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
      "id, assignment_id, profile_id, student_email, student_id, student_name, started_at, submitted_at, total_questions, correct, score_pct, answers"
    )
    .in("assignment_id", ids)
    .order("submitted_at", { ascending: false });

  if (tErr) throw tErr;

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
    score: r.score_pct,
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

export async function listAttemptsByAssignmentId(assignmentId: string) {
  return listAttemptsByAssignment(assignmentId);
}

export function rankAssignmentAttempts(attempts: AssignmentAttempt[]): AssignmentDetailRow[] {
  const rows = attempts.map((t) => {
    const startMs = t.startedAt ? new Date(t.startedAt).getTime() : 0;
    const endMs = t.submittedAt ? new Date(t.submittedAt).getTime() : 0;
    const timeSpentSec = startMs && endMs ? Math.max(0, Math.round((endMs - startMs) / 1000)) : 0;

    return {
      rank: 0,
      studentId: String(t.studentId ?? ""),
      name: String(t.studentName ?? "Student"),
      correct: Number(t.correct ?? 0),
      total: Number(t.totalQuestions ?? 0),
      score: Number(t.score ?? 0),
      timeSpentSec,
      submittedAt: String(t.submittedAt ?? ""),
    };
  });

  rows.sort((a, b) => {
    // rank by score desc, then time asc (faster = better)
    if (b.score !== a.score) return b.score - a.score;
    if (a.timeSpentSec !== b.timeSpentSec) return a.timeSpentSec - b.timeSpentSec;
    const ta = new Date(a.submittedAt).getTime();
    const tb = new Date(b.submittedAt).getTime();
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    return a.studentId.localeCompare(b.studentId);
  });

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}