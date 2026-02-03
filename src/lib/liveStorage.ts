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
  gameId: string;
  pin: string;
  totalQuestions: number;

  startedAt?: string;      // ISO
  lastQuestionAt: string;  // ISO
  savedAt: string;         // ISO

  rows: LiveReportRow[];
  stats?: LiveReportStats;
};

const REPORT_KEY = "gamorax_live_reports_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
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

function getAllReports(): LiveReport[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<any[]>(localStorage.getItem(REPORT_KEY), []);
  const arr = Array.isArray(raw) ? raw : [];
  return arr as LiveReport[];
}

function writeAllReports(list: LiveReport[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REPORT_KEY, JSON.stringify(list));
}

/** ✅ Save ONE report entry (history). */
export function saveLiveReport(report: LiveReport) {
  const all = getAllReports();

  const next: LiveReport = {
    ...report,
    id: report.id || crypto.randomUUID(),
    savedAt: report.savedAt || new Date().toISOString(),
    stats: report.stats ?? computeLiveReportStats(report.rows ?? []),
  };

  all.push(next);

  // newest first
  all.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  writeAllReports(all);
}

/** (Optional helpers if you want them later) */
export function getReportsByGame(gameId: string): LiveReport[] {
  return getAllReports()
    .filter((r) => r.gameId === gameId)
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export function getReportById(reportId: string): LiveReport | null {
  return getAllReports().find((r) => r.id === reportId) ?? null;
}


/* =========================
   SUPABASE HELPERS
========================= */

// 1) Read minimal live session state by pin (uses your RPC)
export async function getLiveStateByPin(pin: string): Promise<LiveSessionState | null> {
  const p = String(pin ?? "").trim();
  if (!p) return null;

  const { data, error } = await supabase.rpc("get_live_state_by_pin", { p_pin: p });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id) return null;

  return {
    sessionId: row.session_id,
    quizId: row.quiz_id,
    pin: p,
    status: row.status,
    questionIndex: row.question_index,
    totalQuestions: row.total_questions,
    currentQuestionId: row.current_question_id ?? null,
    questionStartedAt: row.question_started_at ?? null,
    questionDuration: row.question_duration ?? null,
    meta: null, // socket can send meta:set / session:meta; keep it in React state
  };
}

// 2) Lecturer: create/reuse session (uses your RPC create_live_session(p_quiz_id))
export async function createLiveSessionSupabase(quizId: string) {
  const { data, error } = await supabase.rpc("create_live_session", { p_quiz_id: quizId });
  if (error) throw error;
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
  if (error) throw error;

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

  if (error) throw error;
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

  if (error) throw error;
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

  if (error) throw error;
  return data;
}

/* =========================
   LIVE META (client cache)
   (kept for backward compatibility with old pages)
========================= */

export type LiveMeta = {
  gameId?: string;
  quizTitle?: string;
  courseCode?: string;
  courseName?: string;
  section?: string;
  semester?: string;
};

const LIVE_META_KEY = "gamorax_live_meta_by_pin_v1";

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
    gameId: clean(meta?.gameId),
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
