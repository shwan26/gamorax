export type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

export type LiveAnswer = {
  studentId: string;
  answerIndex: number; // 0-3
  timeUsed: number; // seconds
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
        ? s.answersByQuestion
        : {},
    scores: s?.scores && typeof s.scores === "object" ? s.scores : {},

    startedAt: s?.startedAt,
    endedAt: s?.endedAt,

    lastQuestionAt: s?.lastQuestionAt, // ✅ save with last question timestamp
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
export function submitAnswer(
  pin: string,
  questionIndex: number,
  answer: LiveAnswer
) {
  updateSession(pin, (s) => {
    const prev = s.answersByQuestion[questionIndex] || [];

    // prevent double submit per student per question
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
export function revealAndScoreQuestion(params: {
  pin: string;
  questionIndex: number;
  correctIndex: number;
  maxTime: number;
}) {
  const { pin, questionIndex, correctIndex, maxTime } = params;

  updateSession(pin, (s) => {
    const answers = s.answersByQuestion[questionIndex] || [];

    const nextScores: Record<string, LiveScore> = { ...s.scores };

    for (const a of answers) {
      const prev = nextScores[a.studentId] || { correct: 0, points: 0, totalTime: 0 };

      const isCorrect = a.answerIndex === correctIndex;

      // Points: correct gives 100, plus speed bonus (maxTime - timeUsed)
      const base = isCorrect ? 100 : 0;
      const bonus = isCorrect ? Math.max(0, maxTime - a.timeUsed) : 0;

      nextScores[a.studentId] = {
        correct: prev.correct + (isCorrect ? 1 : 0),
        points: prev.points + base + bonus,
        totalTime: prev.totalTime + a.timeUsed,
      };
    }

    return {
      ...s,
      status: "answer",
      scores: nextScores,
    };
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
export type LiveReportRow = {
  rank: number;
  studentId: string;
  name: string;
  score: number;     // correct answers count
  points: number;
};

export type LiveReport = {
  id: string;
  gameId: string;
  pin: string;
  totalQuestions: number;
  startedAt?: string;           // ISO
  lastQuestionAt: string;       // ISO (timestamp of last live question)
  savedAt: string;              // ISO (when report saved)
  rows: LiveReportRow[];
};

const REPORT_KEY = "gamorax_live_reports";

function getAllReports(): LiveReport[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(REPORT_KEY);
  const raw = data ? JSON.parse(data) : [];
  return Array.isArray(raw) ? raw : [];
}

// store ONLY latest report per game (simple)
export function saveLiveReport(report: LiveReport) {
  const all = getAllReports().filter((r) => r.gameId !== report.gameId);
  all.push(report);
  localStorage.setItem(REPORT_KEY, JSON.stringify(all));
}

export function getLatestLiveReportByGame(gameId: string): LiveReport | null {
  const all = getAllReports().filter((r) => r.gameId === gameId);
  if (all.length === 0) return null;
  // latest by savedAt
  all.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  return all[0] ?? null;
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

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

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
