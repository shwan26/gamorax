// src/lib/studentReportStorage.ts
import { supabase } from "@/src/lib/supabaseClient";

export type StudentAttempt = {
  id: string;

  // ✅ legacy fields (client-only / old localStorage era)
  // Supabase does NOT need these (profile_id from auth.uid()), but keeping them avoids TS breaks.
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
  correct: number;
  points: number;

  finishedAt: string;

  perQuestion?: Array<{
    number: number;
    answerIndex: number;
    correctIndex: number;
    timeUsed: number;
    maxTime: number;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
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
  correct: number;
  points: number;
  finished_at?: string; // timestamptz
  per_question?: any; // jsonb
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
    correct: Number(r.correct ?? 0),
    points: Number(r.points ?? 0),

    finishedAt: String(r.finishedAt ?? new Date().toISOString()),
    perQuestion: (r.perQuestion ?? undefined) as any,
  };
}

/**
 * RLS ensures students can only read their own rows (profile_id = auth.uid()).
 * Signature keeps _email so old UI code compiles.
 */
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
      correct,
      points,
      finishedAt,
      perQuestion
    `
    )
    .order("finishedAt", { ascending: false });

  if (error) {
    console.error("getAttemptsByStudent error:", error);
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

    total_questions: Number(attempt.totalQuestions ?? 0),
    correct: Number(attempt.correct ?? 0),
    points: Number(attempt.points ?? 0),

    // Let DB default to now() if not provided
    finished_at: attempt.finishedAt ?? undefined,

    per_question: attempt.perQuestion ?? null,
  };

  if (!row.pin) throw new Error("pin is required");
  if (!Number.isFinite(row.total_questions)) throw new Error("totalQuestions invalid");

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

/**
 * ✅ BACKWARD COMPAT:
 * old code imports `saveStudentAttempt` from studentReportStorage.
 * We keep it as a wrapper.
 */
export async function saveStudentAttempt(attempt: StudentAttempt) {
  return saveStudentAttemptSupabase(attempt);
}

/** ✅ READ from the camelCase view */
export async function getMyAttemptsSupabase(): Promise<StudentAttempt[]> {
  const { data, error } = await supabase
    .from("student_attempts_api")
    .select("*")
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

/**
 * ✅ BACKWARD COMPAT:
 * /me/profile imports `deleteAttemptsByStudent`.
 * Old localStorage version probably deleted by email.
 * Supabase version deletes ALL attempts for current authenticated user.
 */
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
