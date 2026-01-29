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

  startAt: number;        // ms epoch
  durationSec: number;
};

export type LiveQuestionPayloadMC = LiveQuestionPayloadBase & {
  type: "multiple_choice" | "true_false";
  answers: string[];
  allowMultiple?: boolean;
  correctIndices?: number[]; // optional (usually only lecturer knows)
};

export type LiveQuestionPayloadMatching = LiveQuestionPayloadBase & {
  type: "matching";
  left: string[];
  right: string[];
  // correctPairs can be lecturer-only
  correctPairs?: { left: string; right: string }[];
};

export type LiveQuestionPayloadInput = LiveQuestionPayloadBase & {
  type: "input";
  acceptedAnswers?: string[];
};

export type LiveQuestionShowEvent = {
  pin: string;
  question: LiveQuestionPayloadMC | LiveQuestionPayloadMatching | LiveQuestionPayloadInput;
};

export type LiveAnswerSubmitEvent =
  | {
      pin: string;
      studentId: string;
      questionIndex: number;
      indices: number[]; // MC/TF (and multi-correct)
      timeUsed: number;
    }
  | {
      pin: string;
      studentId: string;
      questionIndex: number;
      value: string; // input
      timeUsed: number;
    }
  | {
      pin: string;
      studentId: string;
      questionIndex: number;
      leftIndex: number;
      rightIndex: number;
      timeUsed: number;
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
  indices: number[];   // ✅ replaces answerIndex
  timeUsed: number;    // seconds
};


export type LiveScore = {
  correct: number;
  points: number;
  totalTime: number;
};

export type LiveStatus = "lobby" | "question" | "answer" | "final";

export type LiveSession = {
  id: string;
  gameId: string;
  pin: string;
  isActive: boolean;

  status: LiveStatus;
  questionIndex: number;

  students: LiveStudent[];
  answersByQuestion: Record<number, LiveAnswer[]>;
  scores: Record<string, LiveScore>;

  startedAt?: string;
  endedAt?: string;

  lastQuestionAt?: string; // save data with last question timestamp
};

const STORAGE_KEY = "gamorax_live_sessions";

function normalizeAnswer(a: any): LiveAnswer {
  const indices =
    Array.isArray(a?.indices) ? a.indices.map((n: any) => Number(n)).filter(Number.isFinite)
    : Number.isFinite(a?.answerIndex) ? [Number(a.answerIndex)]
    : [];

  return {
    studentId: String(a?.studentId ?? ""),
    indices,
    timeUsed: Number.isFinite(a?.timeUsed) ? Number(a.timeUsed) : 0,
  };
}


function normalizeSession(s: any): LiveSession {
  return {
    id: String(s?.id ?? crypto.randomUUID()),
    gameId: String(s?.gameId ?? ""),
    pin: String(s?.pin ?? ""),
    isActive: typeof s?.isActive === "boolean" ? s.isActive : true,

    status: (s?.status as LiveStatus) ?? "lobby",
    questionIndex: Number.isFinite(s?.questionIndex) ? s.questionIndex : 0,

    students: Array.isArray(s?.students) ? s.students : [],
    answersByQuestion:
      s?.answersByQuestion && typeof s.answersByQuestion === "object"
        ? Object.fromEntries(
            Object.entries(s.answersByQuestion).map(([k, arr]) => [
              Number(k),
              Array.isArray(arr) ? arr.map(normalizeAnswer) : [],
            ])
          )
        : {},
        scores: s?.scores && typeof s.scores === "object" ? s.scores : {},

    startedAt: s?.startedAt,
    endedAt: s?.endedAt,

    lastQuestionAt: s?.lastQuestionAt, // ✅ save with last question timestamp
  };
}

function normalizeReport(r: any): LiveReport {
  const rows: LiveReportRow[] = Array.isArray(r?.rows) ? r.rows : [];

  // stats might be missing or partially missing (old data)
  const hasFullStats =
    r?.stats &&
    r.stats.score &&
    r.stats.timeSpent &&
    r.stats.points &&
    typeof r.stats.score.avg === "number" &&
    typeof r.stats.timeSpent.avg === "number" &&
    typeof r.stats.points.avg === "number";

  const stats: LiveReportStats = hasFullStats
    ? r.stats
    : computeLiveReportStats(rows);

  return {
    id: String(r?.id ?? crypto.randomUUID()),
    gameId: String(r?.gameId ?? ""),
    pin: String(r?.pin ?? ""),
    totalQuestions: Number(r?.totalQuestions ?? 0),

    startedAt: r?.startedAt,
    lastQuestionAt: String(r?.lastQuestionAt ?? ""),
    savedAt: String(r?.savedAt ?? ""),

    rows,
    stats,
  };
}



function getAll(): LiveSession[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  const raw = data ? JSON.parse(data) : [];
  return Array.isArray(raw) ? raw.map(normalizeSession) : [];
}

function saveAll(sessions: LiveSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}



/* ---------- CURRENT SESSION PER GAME ---------- */
export function setCurrentLivePin(gameId: string, pin: string) {
  localStorage.setItem(`gamorax_live_current_${gameId}`, pin);
}

export function getCurrentLivePin(gameId: string) {
  return localStorage.getItem(`gamorax_live_current_${gameId}`);
}

/* ---------- CREATE / GET ---------- */
export function createLiveSession(gameId: string): LiveSession {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  const session: LiveSession = {
    id: crypto.randomUUID(),
    gameId,
    pin,
    isActive: true,
    status: "lobby",
    questionIndex: 0,
    students: [],
    answersByQuestion: {},
    scores: {},
    startedAt: new Date().toISOString(),
  };

  const sessions = getAll();
  sessions.push(session);
  saveAll(sessions);

  setCurrentLivePin(gameId, pin);
  return session;
}

export function getLiveByPin(pin: string): LiveSession | null {
  return getAll().find((s) => s.pin === pin && s.isActive) || null;
}

export function getCurrentLiveSession(gameId: string): LiveSession | null {
  const pin = getCurrentLivePin(gameId);
  if (!pin) return null;
  return getLiveByPin(pin);
}

function updateSession(pin: string, updater: (s: LiveSession) => LiveSession) {
  const sessions = getAll(); // already normalized
  const idx = sessions.findIndex((s) => s.pin === pin);
  if (idx === -1) return;

  const current = normalizeSession(sessions[idx]);
  sessions[idx] = normalizeSession(updater(current));
  saveAll(sessions);
}

/* ---------- JOIN ---------- */
export function joinLiveSession(pin: string, student: LiveStudent) {
  updateSession(pin, (s) => {
    const students = Array.isArray(s.students) ? s.students : [];

    if (students.some((p) => p.studentId === student.studentId)) {
      return { ...s, students };
    }

    return {
      ...s,
      students: [...students, student],
      scores: {
        ...s.scores,
        [student.studentId]:
          s.scores?.[student.studentId] || { correct: 0, points: 0, totalTime: 0 },
      },
    };
  });
}


/* ---------- START / PHASE ---------- */
export function startLive(pin: string) {
  updateSession(pin, (s) => ({
    ...s,
    status: "question",
    questionIndex: 0,
  }));
}

export function setLiveStatus(pin: string, status: LiveStatus) {
  updateSession(pin, (s) => ({ ...s, status }));
}

/* ---------- SUBMIT ANSWER ---------- */
export function submitAnswer(pin: string, questionIndex: number, answer: LiveAnswer) {
  updateSession(pin, (s) => {
    const prev = s.answersByQuestion[questionIndex] || [];
    if (prev.some((a) => a.studentId === answer.studentId)) return s;

    return {
      ...s,
      answersByQuestion: {
        ...s.answersByQuestion,
        [questionIndex]: [...prev, answer],
      },
    };
  });
}


export function setLastQuestionAt(pin: string, iso = new Date().toISOString()) {
  updateSession(pin, (s) => ({ ...s, lastQuestionAt: iso }));
}


/* ---------- REVEAL (CALC POINTS) ---------- */
function sameSet(a: number[], b: number[]) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

export function revealAndScoreQuestion(params: {
  pin: string;
  questionIndex: number;
  correctIndices: number[]; // ✅ array now
  maxTime: number;
}) {
  const { pin, questionIndex, correctIndices, maxTime } = params;

  updateSession(pin, (s) => {
    const answers = s.answersByQuestion[questionIndex] || [];
    const nextScores: Record<string, LiveScore> = { ...s.scores };

    for (const a of answers) {
      const prev = nextScores[a.studentId] || { correct: 0, points: 0, totalTime: 0 };
      const isCorrect = sameSet(a.indices ?? [], correctIndices ?? []);

      const base = isCorrect ? 100 : 0;
      const bonus = isCorrect ? Math.max(0, maxTime - a.timeUsed) : 0;

      nextScores[a.studentId] = {
        correct: prev.correct + (isCorrect ? 1 : 0),
        points: prev.points + base + bonus,
        totalTime: prev.totalTime + a.timeUsed,
      };
    }

    return { ...s, status: "answer", scores: nextScores };
  });
}


/* ---------- NEXT / FINAL ---------- */
export function nextOrFinal(params: {
  pin: string;
  totalQuestions: number;
}) {
  const { pin, totalQuestions } = params;

  updateSession(pin, (s) => {
    const nextIndex = s.questionIndex + 1;

    if (nextIndex >= totalQuestions) {
      return {
        ...s,
        status: "final",
        endedAt: new Date().toISOString(),
      };
    }

    return {
      ...s,
      status: "question",
      questionIndex: nextIndex,
    };
  });
}

/* ---------- REPORT STORAGE ---------- */
/* ---------- REPORT STORAGE ---------- */
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

const REPORT_KEY = "gamorax_live_reports";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getAllReports(): LiveReport[] {
  if (typeof window === "undefined") return [];

  const raw = safeParse<any[]>(localStorage.getItem(REPORT_KEY), []);
  const arr = Array.isArray(raw) ? raw : [];

  const normalized = arr.map(normalizeReport);

  // optional: write back if something changed (migrate old stats -> new stats)
  // cheap check: if any report had missing stats.points
  const needWriteBack = arr.some((r) => !(r?.stats?.points));
  if (needWriteBack) {
    localStorage.setItem(REPORT_KEY, JSON.stringify(normalized));
  }

  return normalized;
}


function writeAllReports(list: LiveReport[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REPORT_KEY, JSON.stringify(list));
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
    if (arr.length === 0) return { min: 0, max: 0, avg: 0 };
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

/** ✅ List all reports for a game (history) */
export function getReportsByGame(gameId: string): LiveReport[] {
  return getAllReports()
    .filter((r) => r.gameId === gameId)
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

/** ✅ Get one report by id (detail) */
export function getReportById(reportId: string): LiveReport | null {
  return getAllReports().find((r) => r.id === reportId) ?? null;
}

/** Keep this helper if you still want “latest” */
export function getLatestLiveReportByGame(gameId: string): LiveReport | null {
  const list = getReportsByGame(gameId);
  return list[0] ?? null;
}



export type LiveMeta = {
  gameId?: string;
  quizTitle?: string;
  courseCode?: string;
  courseName?: string;
  section?: string;
  semester?: string;
};

const KEY = "gamorax_live_meta_by_pin";

function readAll(): Record<string, LiveMeta> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, LiveMeta>>(localStorage.getItem(KEY), {});
}

function writeAll(obj: Record<string, LiveMeta>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(obj));
}

export function saveLiveMeta(pin: string, meta: any) {
  if (!pin) return;
  const all = readAll();

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

  all[pin] = { ...(all[pin] ?? {}), ...next };
  writeAll(all);
}

export function getLiveMeta(pin: string): LiveMeta | null {
  if (!pin) return null;
  const all = readAll();
  return all[pin] ?? null;
}
