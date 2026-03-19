// src/lib/studentReportStorage.ts
import { supabase } from "@/src/lib/supabaseClient";

export type StudentAttempt = {
  id: string;
  studentEmail?: string;
  studentId?: string | null;
  studentName?: string;
  avatarSrc?: string;

  pin: string;
  gameId?: string;
  sessionId?: string;

  courseCode?: string;
  courseName?: string;
  section?: string;
  semester?: string;
  quizTitle?: string;

  totalQuestions: number;
  totalScore?: number;
  correct: number;
  points: number;

  finishedAt: string;

  perQuestion?: never; 
};


type DbInsert = {
  profile_id: string;
  pin: string;
  quiz_id?: string | null;
  session_id?: string | null;

  course_code?: string | null;
  course_name?: string | null;
  section?: string | null;
  semester?: string | null;
  quiz_title?: string | null;

  total_questions: number;
  total_score: number; 
  correct: number;
  points: number;
  finished_at?: string; 
  per_question?: any; 
};

function mapRowToAttempt(r: any): StudentAttempt {
  return {
    id: String(r.id),

    pin: String(r.pin ?? ""),
    gameId: r.gameId ?? undefined,
    sessionId: r.sessionId ?? undefined,

    courseCode: r.courseCode ?? undefined,
    courseName: r.courseName ?? undefined,
    section: r.section ?? undefined,
    semester: r.semester ?? undefined,
    quizTitle: r.quizTitle ?? undefined,

    totalQuestions: Number(r.totalQuestions ?? 0),
    totalScore: Number(r.totalScore ?? 0),
    correct: Number(r.correct ?? 0),
    points: Number(r.points ?? 0),

    finishedAt: String(r.finishedAt ?? new Date().toISOString()),
    perQuestion: undefined,
  };
}

export async function getAttemptsByStudent(_email: string): Promise<StudentAttempt[]> {
  const { data, error } = await supabase
    .from("student_attempts_api")
    .select(
      `
      id,
      pin,
      gameId,
      sessionId,
      courseCode,
      courseName,
      section,
      semester,
      quizTitle,
      totalQuestions,
      totalScore,
      correct,
      points,
      finishedAt,
      perQuestion
    `
    )
    .order("finishedAt", { ascending: false });

  if (error) {
    console.error("getAttemptsByStudent error:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data ?? []).map(mapRowToAttempt);
}

/** ✅ INSERT into base table (student_attempts) so RLS works cleanly */
export async function saveStudentAttemptSupabase(attempt: StudentAttempt) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user = authData.user;
  if (!user) throw new Error("Not authenticated");

  const totalQ = Number(attempt.totalQuestions ?? 0);
  const correctCount = Number(attempt.correct ?? 0);
  const totalScore = Number(attempt.totalScore ?? 0);

  // ✅ enforce correct data
  if (!Number.isFinite(totalScore) || totalScore <= 0) {
    throw new Error("totalScore is required (expected max quiz score like 36).");
  }
  if (!Number.isFinite(totalQ) || totalQ <= 0) {
    throw new Error("totalQuestions invalid");
  }
  if (!Number.isFinite(correctCount) || correctCount < 0) {
    throw new Error("correct invalid");
  }

  const row: DbInsert = {
    profile_id: user.id,
    pin: String(attempt.pin ?? "").trim(),
    quiz_id: attempt.gameId ?? null,
    session_id: attempt.sessionId ?? null,

    course_code: attempt.courseCode ?? null,
    course_name: attempt.courseName ?? null,
    section: attempt.section ?? null,
    semester: attempt.semester ?? null,
    quiz_title: attempt.quizTitle ?? null,

    total_questions: totalQ,
    correct: correctCount,
    total_score: totalScore,
    points: Number(attempt.points ?? 0),

    finished_at: attempt.finishedAt ?? undefined,
    per_question: null, // ✅ not used
  };

  if (!row.pin) throw new Error("pin is required");

  const { data, error } = await supabase
    .from("student_attempts")
    .insert(row)
    .select("id, finished_at")
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    finishedAt: data.finished_at as string,
  };
}

export async function saveStudentAttempt(attempt: StudentAttempt) {
  return saveStudentAttemptSupabase(attempt);
}

/** ✅ READ from the camelCase view */
export async function getMyAttemptsSupabase(): Promise<StudentAttempt[]> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("student_attempts_api")
    .select("*")
    .eq("profile_id", uid)
    .order("finishedAt", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRowToAttempt);
}

export async function getMyAttemptByIdSupabase(id: string): Promise<StudentAttempt | null> {
  const { data, error } = await supabase
    .from("student_attempts_api")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRowToAttempt(data) : null;
}

export async function deleteMyAttemptSupabase(id: string) {
  const { error } = await supabase.from("student_attempts").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAttemptsByStudent(_email: string) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const user = authData.user;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("student_attempts")
    .delete()
    .eq("profile_id", user.id);

  if (error) throw error;
}
