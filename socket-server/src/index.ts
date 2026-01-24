import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import { calcPoints } from "./quizScoring.js";

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

type QuestionPayloadIn = {
  questionIndex: number;
  number: number;
  total: number;
  text: string;
  answers: string[];
  correctIndex?: number;
  startAt?: number;
  durationSec?: number;
};

type QuestionPayloadOut = {
  questionIndex: number;
  number: number;
  total: number;
  text: string;
  answers: string[];
  startAt?: number;
  durationSec?: number;
};

type QuizFinishedPayload = {
  total: number;
  qa: Array<{
    number: number;
    question: string;
    answers: string[];
    correctChoice: "A" | "B" | "C" | "D";
    correctAnswerText: string;
  }>;
};

type AnswerRecord = { answerIndex: number; timeUsed: number };
type Score = { correct: number; totalTime: number; points: number };

type RoomMeta = {
  gameId?: string | undefined;
  quizTitle?: string | undefined;   // "Game name"
  courseCode?: string | undefined;
  courseName?: string | undefined;
  section?: string | undefined;
  semester?: string | undefined;
};

type Room = {
  meta?: RoomMeta;
  students: Map<string, LiveStudent>;
  current?: QuestionPayloadOut;
  answers: Map<number, Map<string, AnswerRecord>>;
  correctByQuestion: Map<number, number>;
  scoredQuestions: Set<number>;
  scores: Map<string, Score>;
  durationByQuestion: Map<number, number>;
};

function cleanMeta(m: any): RoomMeta {
  const s = (x: any) => {
    const v = String(x ?? "").trim();
    return v ? v : undefined;
  };

  return {
    gameId: s(m?.gameId),
    quizTitle: s(m?.quizTitle),
    courseCode: s(m?.courseCode),
    courseName: s(m?.courseName),
    section: s(m?.section),
    semester: s(m?.semester),
  };
}


const rooms = new Map<string, Room>();

function getRoom(pin: string): Room {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      students: new Map(),
      // ✅ remove current: undefined
      answers: new Map(),
      correctByQuestion: new Map(),
      scoredQuestions: new Set(),
      scores: new Map(),
      durationByQuestion: new Map(),
    });
  }
  return rooms.get(pin)!;
}


function safeInt(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function countsForRoom(room: Room, questionIndex: number) {
  const map = room.answers.get(questionIndex);
  const counts = [0, 0, 0, 0];
  if (!map) return { counts, totalAnswers: 0 };

  for (const rec of map.values()) {
    const ans = rec.answerIndex;
    if (ans >= 0 && ans <= 3) counts[ans] = (counts[ans] ?? 0) + 1;
  }
  return { counts, totalAnswers: map.size };
}

function makeLeaderboard(room: Room) {
  const list = Array.from(room.students.values()).map((st) => {
    const sc = room.scores.get(st.studentId) ?? { correct: 0, totalTime: 0, points: 0 };
    return { ...st, correct: sc.correct, totalTime: sc.totalTime, points: sc.points };
  });

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.correct !== a.correct) return b.correct - a.correct;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return String(a.studentId).localeCompare(String(b.studentId));
  });

  return list.map((s, idx) => ({ ...s, rank: idx + 1 }));
}

// --- server bootstrap ---
const app = express();

// ✅ lock this down in production (set env var in Railway)
const origin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true;

app.use(cors({ origin, credentials: true }));
app.get("/", (_req, res) => res.send("ok"));
app.get("/health", (_req, res) => res.send("health ok"));

const httpServer = createServer(app);

const io = new IOServer(httpServer, {
  path: "/socket.io",
  cors: { origin, credentials: true },
});

io.on("connection", (socket) => {
  socket.on("join", ({ pin, student }: { pin: string; student?: LiveStudent }) => {
    if (!pin) return;
    socket.join(pin);

    const room = getRoom(pin);
    if (room.meta) {
      socket.emit("session:meta", room.meta);
    }

    socket.on("meta:set", ({ pin, meta }: { pin: string; meta: RoomMeta }) => {
      if (!pin || !meta) return;

      const room = getRoom(pin);
      const next = cleanMeta(meta);

      room.meta = { ...(room.meta ?? {}), ...next };

      // ✅ broadcast to everyone in room (students + lecturer)
      io.to(pin).emit("session:meta", room.meta);
    });


    if (student?.studentId) {
      room.students.set(student.studentId, student);
      if (!room.scores.has(student.studentId)) {
        room.scores.set(student.studentId, { correct: 0, totalTime: 0, points: 0 });
      }
      io.to(pin).emit("students:update", Array.from(room.students.values()));
    }

    if (room.current) {
      socket.emit("question:show", room.current);

      const { counts, totalAnswers } = countsForRoom(room, room.current.questionIndex);
      socket.emit("answer:count", {
        questionIndex: room.current.questionIndex,
        counts,
        totalAnswers,
      });

      socket.emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
    }
  });

  socket.on("question:show", ({ pin, question }: { pin: string; question: QuestionPayloadIn }) => {
    if (!pin || !question) return;

    const room = getRoom(pin);
    const qIndex = safeInt(question.questionIndex, 0);

    const out: QuestionPayloadOut = {
        questionIndex: qIndex,
        number: safeInt(question.number, qIndex + 1),
        total: safeInt(question.total, 1),
        text: String(question.text ?? ""),
        answers: Array.isArray(question.answers) ? question.answers : [],
        ...(Number.isFinite(question.startAt) ? { startAt: Number(question.startAt) } : {}),
        ...(Number.isFinite(question.durationSec) ? { durationSec: Number(question.durationSec) } : {}),
    };


    room.current = out;

    const dur = Number.isFinite(question.durationSec) ? Number(question.durationSec) : 20;
    room.durationByQuestion.set(qIndex, dur);

    if (
      Number.isFinite(question.correctIndex) &&
      question.correctIndex! >= 0 &&
      question.correctIndex! <= 3
    ) {
      room.correctByQuestion.set(qIndex, question.correctIndex!);
    }

    room.answers.set(qIndex, new Map());
    room.scoredQuestions.delete(qIndex);

    io.to(pin).emit("question:show", out);

    io.to(pin).emit("answer:count", {
      questionIndex: qIndex,
      counts: [0, 0, 0, 0],
      totalAnswers: 0,
    });
  });

  socket.on("answer", (p: { pin: string; studentId: string; questionIndex: number; answerIndex: number; timeUsed: number }) => {
    const pin = String(p?.pin ?? "");
    const studentId = String(p?.studentId ?? "");
    const questionIndex = safeInt(p?.questionIndex, -1);
    const answerIndex = safeInt(p?.answerIndex, -1);
    const timeUsed = safeInt(p?.timeUsed, 0);

    if (!pin || !studentId) return;
    if (questionIndex < 0) return;
    if (answerIndex < 0 || answerIndex > 3) return;

    const room = getRoom(pin);
    if (!room.answers.has(questionIndex)) room.answers.set(questionIndex, new Map());

    const map = room.answers.get(questionIndex)!;
    if (map.has(studentId)) return; // dedupe

    map.set(studentId, { answerIndex, timeUsed });

    const { counts, totalAnswers } = countsForRoom(room, questionIndex);
    io.to(pin).emit("answer:count", { questionIndex, counts, totalAnswers });
  });

  socket.on("reveal", ({ pin, questionIndex, correctIndex }: { pin: string; questionIndex: number; correctIndex?: number }) => {
    if (!pin) return;

    const room = getRoom(pin);
    const qIndex = safeInt(questionIndex, room.current?.questionIndex ?? 0);

    if (Number.isFinite(correctIndex) && correctIndex! >= 0 && correctIndex! <= 3) {
      room.correctByQuestion.set(qIndex, correctIndex!);
    }

    const correct = room.correctByQuestion.get(qIndex);
    if (typeof correct !== "number") return;

    const maxTime = room.durationByQuestion.get(qIndex) ?? 20;

    io.to(pin).emit("answer:reveal", {
      questionIndex: qIndex,
      correctIndex: correct,
      maxTime,
    });

    if (room.scoredQuestions.has(qIndex)) return;
    room.scoredQuestions.add(qIndex);

    const ansMap = room.answers.get(qIndex) ?? new Map();

    for (const [sid, rec] of ansMap.entries()) {
      const prev = room.scores.get(sid) ?? { correct: 0, totalTime: 0, points: 0 };
      const isCorrect = rec.answerIndex === correct;
      const timeUsed = Math.max(0, Math.round(rec.timeUsed));
      const addPoints = calcPoints({ isCorrect, maxTime, timeUsed });

      room.scores.set(sid, {
        correct: prev.correct + (isCorrect ? 1 : 0),
        totalTime: prev.totalTime + rec.timeUsed,
        points: prev.points + addPoints,
      });
    }

    io.to(pin).emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
  });

  socket.on("finish", ({ pin, payload }: { pin: string; payload: QuizFinishedPayload }) => {
    if (!pin || !payload) return;

    const room = getRoom(pin);
    const leaderboard = makeLeaderboard(room);

    io.to(pin).emit("final_results", { pin, total: payload.total, leaderboard });
    io.to(pin).emit("quiz:finished", payload);
  });

  socket.on("next", ({ pin }: { pin: string }) => {
    if (!pin) return;
    io.to(pin).emit("question:next");
  });

  socket.on("leave", ({ pin, studentId }: { pin: string; studentId: string }) => {
    if (!pin || !studentId) return;

    const room = getRoom(pin);
    room.students.delete(studentId);
    room.scores.delete(studentId);

    for (const map of room.answers.values()) map.delete(studentId);

    socket.leave(pin);
    io.to(pin).emit("students:update", Array.from(room.students.values()));
    io.to(pin).emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
  });
});

const PORT = Number(process.env.PORT || 4000);
httpServer.listen(PORT, () => console.log(`Socket server running on :${PORT}`));
