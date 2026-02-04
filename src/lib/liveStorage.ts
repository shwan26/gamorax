// src/lib/liveStorage.ts
import { supabase } from "@/src/lib/supabaseClient";

/* =========================
   LIVE SOCKET TYPES
========================= */

export type LiveQuestionType = "multiple_choice" | "true_false" | "matching" | "input";

export type LiveQuestionPayloadBase = {
  questionIndex: number;
  number: number;
  total: number;
  text: string;
  type: LiveQuestionType;
  image?: string | null;

  startAt: number; // ms epoch
  durationSec: number;
};

export type LiveQuestionPayloadMC = LiveQuestionPayloadBase & {
  type: "multiple_choice" | "true_false";
  answers: string[];
  allowMultiple?: boolean;
  correctIndices?: number[]; // lecturer-only usually
};

export type LiveQuestionPayloadMatching = LiveQuestionPayloadBase & {
  type: "matching";
  left: string[];
  right: string[];
  correctPairs?: { left: string; right: string }[]; // lecturer-only
};

export type LiveQuestionPayloadInput = LiveQuestionPayloadBase & {
  type: "input";
  acceptedAnswers?: string[]; // lecturer-only
};

export type LiveQuestionShowEvent = {
  pin: string;
  question: LiveQuestionPayloadMC | LiveQuestionPayloadMatching | LiveQuestionPayloadInput;
};

export type LiveRevealEvent =
  | {
      pin: string;
      questionIndex: number;
      type: "multiple_choice" | "true_false";
      correctIndices: number[];
      maxTime: number;
    }
  | {
      pin: string;
      questionIndex: number;
      type: "matching";
      correctPairs: { left: string; right: string }[];
      maxTime: number;
    }
  | {
      pin: string;
      questionIndex: number;
      type: "input";
      acceptedAnswers: string[];
      maxTime: number;
    };

export type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

export type LiveAnswer = {
  studentId: string;
  indices: number[]; // for choice
  timeUsed: number; // seconds
};

export type LiveScore = {
  correct: number;
  points: number;
  totalTime: number;
};

export type LiveStatus = "lobby" | "question" | "answer" | "final";

/**
 * This type is now "DB state", not local state.
 * (Students/answers/scores are fetched from Supabase when needed.)
 */
export type LiveSessionState = {
  sessionId: string;
  quizId: string;
  pin: string;
  status: LiveStatus;
  questionIndex: number;
  totalQuestions: number;
  currentQuestionId: string | null;
  questionStartedAt: string | null;
  questionDuration: number | null;
  meta?: LiveMeta | null;
};


/* =========================
   REPORT STORAGE (client)
========================= */
export type LiveReportRow = {
  rank: number;
  studentId: string;
  name: string;
  score: number;
  points: number;
  totalTime: number; // seconds
};

export type LiveReportStats = {
  students: number;
  score: { min: number; max: number; avg: number };
  points: { min: number; max: number; avg: number };
  timeSpent: { min: number; max: number; avg: number };
};

export type LiveReport = {
  id: string;
  sessionId: string | null;
  quizId: string;
  pin: string;

  courseCode: string | null;
  courseName: string | null;
  section: string | null;
  semester: string | null;
  quizTitle: string | null;

  totalQuestions: number;
  finishedAt: string; // timestamptz
  createdAt: string;  // timestamptz

  rows: LiveReportRow[];
  stats: LiveReportStats;
};

function throwNice(error: any): never {
  const msg =
    error?.message ||
    error?.error_description ||
    error?.details ||
    JSON.stringify(error) ||
    String(error);
  throw new Error(msg);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeLiveReportStats(rows: LiveReportRow[]): LiveReportStats {
  const students = rows.length;

  const scores = rows.map((r) => Number(r.score || 0));
  const points = rows.map((r) => Number(r.points || 0));
  const times = rows.map((r) => Number(r.totalTime || 0));

  const stat = (arr: number[]) => {
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { min: round2(min), max: round2(max), avg: round2(avg) };
  };

  return {
    students,
    score: stat(scores),
    points: stat(points),
    timeSpent: stat(times),
  };
}

/** ✅ Save full report into live_reports (rows + stats are jsonb columns in your table) */
export async function saveLiveReport(args: {
  id?: string;
  sessionId: string | null;
  quizId: string;
  pin: string;

  courseCode?: string | null;
  courseName?: string | null;
  section?: string | null;
  semester?: string | null;
  quizTitle?: string | null;

  totalQuestions: number;

  rows: LiveReportRow[];
  stats?: LiveReportStats;

  finishedAt?: string;
  createdAt?: string;
}) {
  const nowIso = new Date().toISOString();
  const rows = Array.isArray(args.rows) ? args.rows : [];
  const stats = args.stats ?? computeLiveReportStats(rows);

  const payload = {
    id: args.id ?? crypto.randomUUID(),
    session_id: args.sessionId,
    quiz_id: args.quizId,
    pin: args.pin,

    course_code: args.courseCode ?? null,
    course_name: args.courseName ?? null,
    section: args.section ?? null,
    semester: args.semester ?? null,
    quiz_title: args.quizTitle ?? null,

    total_questions: args.totalQuestions ?? 0,
    finished_at: args.finishedAt ?? nowIso,
    created_at: args.createdAt ?? nowIso,

    rows,
    stats,
  };

  const { error } = await supabase
    .from("live_reports")
    .upsert(payload, { onConflict: "id" });

  if (error) throwNice(error);

  return {
    id: String(payload.id),
    sessionId: payload.session_id ?? null,
    quizId: String(payload.quiz_id),
    pin: String(payload.pin),

    courseCode: payload.course_code ?? null,
    courseName: payload.course_name ?? null,
    section: payload.section ?? null,
    semester: payload.semester ?? null,
    quizTitle: payload.quiz_title ?? null,

    totalQuestions: Number(payload.total_questions ?? 0),
    finishedAt: String(payload.finished_at),
    createdAt: String(payload.created_at),

    rows,
    stats,
  } satisfies LiveReport;
}


/** ✅ List reports by quiz_id */
export async function getReportsByQuiz(quizId: string): Promise<LiveReport[]> {
  const { data, error } = await supabase
    .from("live_reports")
    .select(
      "id, session_id, quiz_id, pin, course_code, course_name, section, semester, quiz_title, total_questions, finished_at, created_at, rows, stats"
    )
    .eq("quiz_id", quizId)
    .order("finished_at", { ascending: false });

  if (error) throwNice(error);

  const arr = Array.isArray(data) ? data : [];
  return arr.map((r: any) => {
    const rows: LiveReportRow[] = Array.isArray(r.rows) ? r.rows : [];
    const stats: LiveReportStats = r.stats ?? computeLiveReportStats(rows);

    return {
      id: String(r.id),
      sessionId: r.session_id ?? null,
      quizId: String(r.quiz_id),
      pin: String(r.pin ?? ""),

      courseCode: r.course_code ?? null,
      courseName: r.course_name ?? null,
      section: r.section ?? null,
      semester: r.semester ?? null,
      quizTitle: r.quiz_title ?? null,

      totalQuestions: Number(r.total_questions ?? 0),
      finishedAt: String(r.finished_at ?? r.created_at ?? ""),
      createdAt: String(r.created_at ?? ""),

      rows,
      stats,
    } satisfies LiveReport;
  });
}

/** ✅ Single report by id */
export async function getReportById(reportId: string): Promise<LiveReport | null> {
  const { data, error } = await supabase
    .from("live_reports")
    .select(
      "id, session_id, quiz_id, pin, course_code, course_name, section, semester, quiz_title, total_questions, finished_at, created_at, rows, stats"
    )
    .eq("id", reportId)
    .maybeSingle();

  if (error) throwNice(error);
  if (!data) return null;

  const rows: LiveReportRow[] = Array.isArray((data as any).rows) ? (data as any).rows : [];
  const stats: LiveReportStats = (data as any).stats ?? computeLiveReportStats(rows);

  return {
    id: String((data as any).id),
    sessionId: (data as any).session_id ?? null,
    quizId: String((data as any).quiz_id),
    pin: String((data as any).pin ?? ""),

    courseCode: (data as any).course_code ?? null,
    courseName: (data as any).course_name ?? null,
    section: (data as any).section ?? null,
    semester: (data as any).semester ?? null,
    quizTitle: (data as any).quiz_title ?? null,

    totalQuestions: Number((data as any).total_questions ?? 0),
    finishedAt: String((data as any).finished_at ?? (data as any).created_at ?? ""),
    createdAt: String((data as any).created_at ?? ""),

    rows,
    stats,
  } satisfies LiveReport;
}

/* =========================
   SUPABASE HELPERS
========================= */

// 1) Read minimal live session state by pin (uses your RPC)
export async function getLiveStateByPin(pin: string): Promise<LiveSessionState | null> {
  const p = String(pin ?? "").trim();
  if (!p) return null;

  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      "id, quiz_id, pin, status, question_index, total_questions, current_question_id, question_started_at, question_duration"
    )
    .eq("pin", p)
    // ✅ remove is_active filter
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throwNice(error);
  if (!data) return null;

  return {
    sessionId: String((data as any).id),
    quizId: String((data as any).quiz_id),
    pin: String((data as any).pin),
    status: (data as any).status,
    questionIndex: Number((data as any).question_index ?? 0),
    totalQuestions: Number((data as any).total_questions ?? 0),
    currentQuestionId: (data as any).current_question_id ?? null,
    questionStartedAt: (data as any).question_started_at ?? null,
    questionDuration: (data as any).question_duration ?? null,
    meta: null,
  };
}


// 2) Lecturer: create/reuse session (uses your RPC create_live_session(p_quiz_id))
export async function createLiveSessionSupabase(quizId: string) {
  const { data, error } = await supabase.rpc("create_live_session", { p_quiz_id: quizId });
  if (error) throwNice(error);
  return data; // live_sessions row
}

// 3) Student join lobby (writes live_participants; RLS already enforces lobby + student)
export async function joinLiveSessionSupabase(pin: string, student: LiveStudent) {
  const state = await getLiveStateByPin(pin);
  if (!state?.sessionId) throw new Error("PIN not active");

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const payload = {
    session_id: state.sessionId,
    profile_id: uid,
    display_name: student.name,
    student_id: student.studentId || null,
    avatar_url: student.avatarSrc || null,
  };

  const { error } = await supabase.from("live_participants").upsert(payload, {
    onConflict: "session_id,profile_id",
  });
  if (error) throwNice(error);


  return state;
}

// 4) Submit choice answer (MC/TF) via your RPC submit_live_answer_by_pin(pin, indices, time_used)
export async function submitChoiceAnswerByPin(args: {
  pin: string;
  indices: number[];
  timeUsed: number;
}) {
  const p = String(args.pin ?? "").trim();
  if (!p) throw new Error("Missing pin");

  const indices = Array.isArray(args.indices) ? args.indices : [];
  const timeUsed = Number.isFinite(args.timeUsed) ? Number(args.timeUsed) : 0;

  const { data, error } = await supabase.rpc("submit_live_answer_by_pin", {
    p_pin: p,
    p_answer_indices: indices,
    p_time_used: timeUsed,
  });

  if (error) throwNice(error);
  return data;
}

/**
 * OPTIONAL (recommended):
 * If you add the generic RPC for input/matching later,
 * you can use these immediately without changing pages again.
 */
export async function submitInputAnswerByPin(args: { pin: string; value: string; timeUsed: number }) {
  const p = String(args.pin ?? "").trim();
  const value = String(args.value ?? "");
  const timeUsed = Number.isFinite(args.timeUsed) ? Number(args.timeUsed) : 0;

  // expects you to create: submit_live_answer_generic_by_pin(pin, kind, payload, time_used)
  const { data, error } = await supabase.rpc("submit_live_answer_generic_by_pin", {
    p_pin: p,
    p_kind: "input",
    p_payload: { value },
    p_time_used: timeUsed,
  });

  if (error) throwNice(error);
  return data;
}

export async function submitMatchingAnswerByPin(args: {
  pin: string;
  pairs: Record<number, number>;
  timeUsed: number;
}) {
  const p = String(args.pin ?? "").trim();
  const timeUsed = Number.isFinite(args.timeUsed) ? Number(args.timeUsed) : 0;

  const { data, error } = await supabase.rpc("submit_live_answer_generic_by_pin", {
    p_pin: p,
    p_kind: "matching",
    p_payload: { pairs: args.pairs ?? {} },
    p_time_used: timeUsed,
  });

  if (error) throwNice(error);
  return data;
}

/* =========================
   LIVE META (client cache)
   (kept for backward compatibility with old pages)
========================= */

export type LiveMeta = {
  quizId?: string;
  quizTitle?: string;
  courseCode?: string;
  courseName?: string;
  section?: string;
  semester?: string;
};

const LIVE_META_KEY = "gamorax_live_meta_by_pin_v1";

// ✅ JSON parse helper (used by Live Meta cache)
function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}


function readAllLiveMeta(): Record<string, LiveMeta> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, LiveMeta>>(localStorage.getItem(LIVE_META_KEY), {});
}

function writeAllLiveMeta(obj: Record<string, LiveMeta>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIVE_META_KEY, JSON.stringify(obj));
}

export function saveLiveMeta(pin: string, meta: any) {
  const p = String(pin ?? "").trim();
  if (!p) return;

  const clean = (x: any) => {
    const v = String(x ?? "").trim();
    return v ? v : undefined;
  };

  const next: LiveMeta = {
    quizId: clean(meta?.quizId),
    quizTitle: clean(meta?.quizTitle),
    courseCode: clean(meta?.courseCode),
    courseName: clean(meta?.courseName),
    section: clean(meta?.section),
    semester: clean(meta?.semester),
  };

  const all = readAllLiveMeta();
  all[p] = { ...(all[p] ?? {}), ...next };
  writeAllLiveMeta(all);
}

export function getLiveMeta(pin: string): LiveMeta | null {
  const p = String(pin ?? "").trim();
  if (!p) return null;
  const all = readAllLiveMeta();
  return all[p] ?? null;
}
