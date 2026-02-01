// src/lib/assignment.ts
import { supabase } from "@/src/lib/supabaseClient";
import { getQuestions } from "@/src/lib/questionStorage";

/* ======================
   Types
====================== */

export type Assignment = {
  id: string;
  courseId: string;
  gameId: string; // quiz_id
  lecturerId: string;

  publicToken: string;

  title: string;

  opensAt: string | null;
  dueAt: string | null;

  durationSec: number;
  passcodeHash: string | null;

  createdAt: string;
};

export type AssignmentMeta = {
  id: string;
  title: string;
  opens_at: string | null;
  due_at: string | null;
  duration_sec: number;
  has_passcode: boolean;
};

export type AssignmentPayload = {
  assignment: {
    id: string;
    title: string;
    opensAt: string | null;
    dueAt: string | null;
    durationSec: number;
    quizId: string;
  };
  questions: any[];
};

function mapAssignmentRow(r: any): Assignment {
  return {
    id: r.id,
    courseId: r.course_id,
    gameId: r.quiz_id,
    lecturerId: r.lecturer_id,
    publicToken: r.public_token,
    title: r.title,
    opensAt: r.opens_at,
    dueAt: r.due_at,
    durationSec: r.duration_sec,
    passcodeHash: r.passcode_hash,
    createdAt: r.created_at,
  };
}

/* ======================
   Lecturer: CRUD Assignments
====================== */

export async function createAssignment(input: {
  courseId: string;
  gameId: string; // quiz_id
  title: string;
  opensAt?: string;
  dueAt?: string;
  durationSec: number;
  passcodeHash?: string;
}): Promise<{ id: string; publicToken: string }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const uid = userRes.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      course_id: input.courseId,
      quiz_id: input.gameId,
      lecturer_id: uid,
      title: input.title,
      opens_at: input.opensAt ?? null,
      due_at: input.dueAt ?? null,
      duration_sec: input.durationSec,
      passcode_hash: input.passcodeHash ?? null,
    })
    .select("id, public_token")
    .single();

  if (error) throw error;

  return { id: data.id, publicToken: data.public_token };
}

export async function listAssignmentsByGame(gameId: string): Promise<Assignment[]> {
  if (!gameId) return [];

  const { data, error } = await supabase
    .from("assignments")
    .select(
      "id, course_id, quiz_id, lecturer_id, public_token, title, opens_at, due_at, duration_sec, passcode_hash, created_at"
    )
    .eq("quiz_id", gameId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapAssignmentRow);
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

/* ======================
   Student: RPC / Flow
====================== */

export async function getAssignmentMeta(token: string): Promise<AssignmentMeta | null> {
  const { data, error } = await supabase.rpc("get_assignment_meta", { p_token: token });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  return row ?? null;
}

export async function getAssignmentPayload(token: string, passcode?: string): Promise<AssignmentPayload> {
  const { data, error } = await supabase.rpc("get_assignment_payload", {
    p_token: token,
    p_passcode: passcode ?? null,
  });
  if (error) throw error;
  return data as AssignmentPayload;
}

export async function hasAttempted(assignmentId: string, profileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("assignment_attempts")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error && (error as any).code !== "PGRST116") throw error;
  return !!data;
}

export async function submitAssignmentAttempt(input: {
  token: string;
  startedAtISO: string;
  answers: Record<string, any>;
}): Promise<{ totalQuestions: number; correct: number; scorePct: number; points: number }> {
  const { data, error } = await supabase.rpc("submit_assignment_attempt", {
    p_token: input.token,
    p_started_at: input.startedAtISO,
    p_answers: input.answers,
  });
  if (error) throw error;

  return data as { totalQuestions: number; correct: number; scorePct: number; points: number };
}
