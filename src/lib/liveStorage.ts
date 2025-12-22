export type LivePlayer = {
  studentId: string;
  name: string;
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

  players: LivePlayer[];
  answersByQuestion: Record<number, LiveAnswer[]>;
  scores: Record<string, LiveScore>;

  startedAt?: string;
  endedAt?: string;
};

const STORAGE_KEY = "gamorax_live_sessions";

function getAll(): LiveSession[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
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
    players: [],
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
  const sessions = getAll();
  const idx = sessions.findIndex((s) => s.pin === pin);
  if (idx === -1) return;

  sessions[idx] = updater(sessions[idx]);
  saveAll(sessions);
}

/* ---------- JOIN ---------- */
export function joinLiveSession(pin: string, player: LivePlayer) {
  updateSession(pin, (s) => {
    if (s.players.some((p) => p.studentId === player.studentId)) return s;

    return {
      ...s,
      players: [...s.players, player],
      scores: {
        ...s.scores,
        [player.studentId]:
          s.scores[player.studentId] || { correct: 0, points: 0, totalTime: 0 },
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
