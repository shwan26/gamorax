// src/lib/assignmentAttempts.ts
import { supabase } from "@/src/lib/supabaseClient";

export type AssignmentAttempt = {
  id: string;
  assignmentId: string;
  profileId: string;

  studentEmail: string | null;
  studentId: string | null;
  studentName: string | null;

  startedAt: string;
  submittedAt: string;

  totalQuestions: number;
  correct: number;
  scorePct: number;
  points: number;

  answers: Record<string, any>;
};

function mapRow(r: any): AssignmentAttempt {
  return {
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
  };
}

/**
 * Lecturer report: list attempts for an assignment.
 * RLS policy should allow lecturer to SELECT attempts for assignments they own.
 */
export async function listAttemptsByAssignment(assignmentId: string): Promise<AssignmentAttempt[]> {
  if (!assignmentId) return [];

  const { data, error } = await supabase
    .from("assignment_attempts")
    .select(
      "id, assignment_id, profile_id, student_email, student_id, student_name, started_at, submitted_at, total_questions, correct, score_pct, points, answers"
    )
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}


export async function hasAttempted(assignmentId: string, profileId: string): Promise<boolean> {
  if (!assignmentId || !profileId) return false;

  const { data, error } = await supabase
    .from("assignment_attempts")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("profile_id", profileId)
    .maybeSingle();

  // maybeSingle returns "no rows" sometimes as PGRST116 depending on client/version
  if (error && (error as any).code !== "PGRST116") throw error;

  return !!data;
}