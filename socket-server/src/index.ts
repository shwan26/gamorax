import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { calcPoints } from "./quizScoring.js";

/* -------------------- Types -------------------- */

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

type QuestionPayloadOut = Omit<QuestionPayloadIn, "correctIndex">;

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
  quizTitle?: string | undefined;
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

/* -------------------- Helpers -------------------- */

const rooms = new Map<string, Room>();

function getRoom(pin: string): Room {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      students: new Map(),
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

function cleanMeta(meta: any): RoomMeta {
  const clean = (v: any) => {
    const s = String(v ?? "").trim();
    return s || undefined;
  };

  return {
    gameId: clean(meta?.gameId),
    quizTitle: clean(meta?.quizTitle),
    courseCode: clean(meta?.courseCode),
    courseName: clean(meta?.courseName),
    section: clean(meta?.section),
    semester: clean(meta?.semester),
  };
}

function countsForRoom(room: Room, q: number) {
  const map = room.answers.get(q);
  const counts: [number, number, number, number] = [0, 0, 0, 0];

  if (!map) return { counts, totalAnswers: 0 };

  for (const r of map.values()) {
    const idx = r.answerIndex;
    if (idx === 0 || idx === 1 || idx === 2 || idx === 3) {
      counts[idx]++;
    }
  }

  return { counts, totalAnswers: map.size };
}



function makeLeaderboard(room: Room) {
  return Array.from(room.students.values())
    .map((s) => {
      const sc = room.scores.get(s.studentId) ?? { correct: 0, totalTime: 0, points: 0 };
      return { ...s, ...sc };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.correct - a.correct ||
      a.totalTime - b.totalTime ||
      a.studentId.localeCompare(b.studentId)
    )
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/* -------------------- Server -------------------- */

const app = express();

const origin =
  process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? false;

app.use(cors({ origin, credentials: true }));
app.get("/health", (_, res) => res.send("ok"));

const httpServer = createServer(app);

const io = new IOServer(httpServer, {
  path: "/socket.io",
  cors: { origin, credentials: true },
  transports: ["websocket"],
});

/* -------------------- Socket Logic -------------------- */

io.on("connection", (socket: Socket) => {

  /* JOIN */
  socket.on("join", ({ pin, student }) => {
    if (!pin) return;
    socket.join(pin);

    const room = getRoom(pin);

    if (room.meta) socket.emit("session:meta", room.meta);

    if (student?.studentId) {
      room.students.set(student.studentId, student);
      room.scores.set(student.studentId, room.scores.get(student.studentId) ?? {
        correct: 0,
        totalTime: 0,
        points: 0,
      });

      io.to(pin).emit("students:update", [...room.students.values()]);
    }

    if (room.current) {
      socket.emit("question:show", room.current);
      const { counts, totalAnswers } = countsForRoom(room, room.current.questionIndex);
      socket.emit("answer:count", { questionIndex: room.current.questionIndex, counts, totalAnswers });
      socket.emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
    }
  });

  /* META */
  socket.on("meta:set", ({ pin, meta }) => {
    if (!pin || !meta) return;
    const room = getRoom(pin);
    room.meta = { ...(room.meta ?? {}), ...cleanMeta(meta) };
    io.to(pin).emit("session:meta", room.meta);
  });

  /* QUESTION */
  socket.on("question:show", ({ pin, question }: { pin: string; question: QuestionPayloadIn }) => {
    if (!pin || !question) return;

    const room = getRoom(pin);
    const q = safeInt(question.questionIndex, 0);

    room.current = {
      questionIndex: q,
      number: safeInt(question.number, q + 1),
      total: safeInt(question.total, 1),
      text: String(question.text ?? ""),
      answers: question.answers ?? [],
      ...(question.startAt !== undefined && { startAt: question.startAt }),
      ...(question.durationSec !== undefined && { durationSec: question.durationSec }),
    };


    room.answers.set(q, new Map());
    room.scoredQuestions.delete(q);

    if (Number.isFinite(question.correctIndex)) {
      room.correctByQuestion.set(q, question.correctIndex!);
    }

    room.durationByQuestion.set(q, question.durationSec ?? 20);

    io.to(pin).emit("question:show", room.current);
    io.to(pin).emit("answer:count", { questionIndex: q, counts: [0, 0, 0, 0], totalAnswers: 0 });
  });

  /* ANSWER */
  socket.on("answer", ({ pin, studentId, questionIndex, answerIndex, timeUsed }) => {
    if (!pin || !studentId) return;

    const room = getRoom(pin);
    const q = safeInt(questionIndex, -1);
    if (q < 0 || answerIndex < 0 || answerIndex > 3) return;

    const map = room.answers.get(q) ?? new Map();
    if (map.has(studentId)) return;

    map.set(studentId, { answerIndex, timeUsed });
    room.answers.set(q, map);

    io.to(pin).emit("answer:count", {
      questionIndex: q,
      ...countsForRoom(room, q),
    });
  });

  /* REVEAL */
  socket.on("reveal", ({ pin, questionIndex, correctIndex }) => {
    if (!pin) return;

    const room = getRoom(pin);
    const q = safeInt(questionIndex, room.current?.questionIndex ?? 0);

    if (Number.isFinite(correctIndex)) {
      room.correctByQuestion.set(q, correctIndex!);
    }

    const correct = room.correctByQuestion.get(q);
    if (correct == null || room.scoredQuestions.has(q)) return;

    room.scoredQuestions.add(q);

    const maxTime = room.durationByQuestion.get(q) ?? 20;
    io.to(pin).emit("answer:reveal", { questionIndex: q, correctIndex: correct, maxTime });

    for (const [sid, rec] of room.answers.get(q) ?? []) {
      const prev = room.scores.get(sid)!;
      const add = calcPoints({ isCorrect: rec.answerIndex === correct, maxTime, timeUsed: rec.timeUsed });
      room.scores.set(sid, {
        correct: prev.correct + (rec.answerIndex === correct ? 1 : 0),
        totalTime: prev.totalTime + rec.timeUsed,
        points: prev.points + add,
      });
    }

    io.to(pin).emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
  });

  /* FINISH */
  socket.on("finish", ({ pin, payload }: { pin: string; payload: QuizFinishedPayload }) => {
    if (!pin || !payload) return;
    const room = getRoom(pin);
    io.to(pin).emit("final_results", { pin, total: payload.total, leaderboard: makeLeaderboard(room) });
    io.to(pin).emit("quiz:finished", payload);
  });

  socket.on("leave", ({ pin, studentId }) => {
    if (!pin || !studentId) return;
    const room = getRoom(pin);
    room.students.delete(studentId);
    room.scores.delete(studentId);
    for (const m of room.answers.values()) m.delete(studentId);
    socket.leave(pin);
    io.to(pin).emit("students:update", [...room.students.values()]);
  });
});

/* -------------------- Boot -------------------- */

const PORT = Number(process.env.PORT || 4000);
httpServer.listen(PORT, () => console.log(`✅ Socket server running on ${PORT}`));
