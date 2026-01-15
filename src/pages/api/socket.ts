// src/pages/api/socket.ts
import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";

export const config = { api: { bodyParser: false } };

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

type QuestionPayloadIn = {
  questionIndex: number; // 0-based
  number: number; // 1-based
  total: number;
  text: string;
  answers: string[];
  correctIndex?: number; // 0-3 (optional but recommended)
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

type Room = {
  students: Map<string, LiveStudent>;
  current?: QuestionPayloadOut;
  answers: Map<number, Map<string, AnswerRecord>>; // answers[qIndex][studentId]
  correctByQuestion: Map<number, number>;
  scoredQuestions: Set<number>; // prevents double scoring
  scores: Map<string, Score>;
  durationByQuestion: Map<number, number>;

};

type ResWithSocket = NextApiResponse & { socket: any & { server: any } };

const rooms = new Map<string, Room>();

function getRoom(pin: string): Room {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      students: new Map(),
      current: undefined,
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
    if (ans >= 0 && ans <= 3) counts[ans] += 1;
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

export default function handler(_req: NextApiRequest, res: ResWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
      cors: { origin: "*" },
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      // JOIN
      socket.on("join", ({ pin, student }: { pin: string; student?: LiveStudent }) => {
        if (!pin) return;
        socket.join(pin);

        const room = getRoom(pin);

        if (student?.studentId) {
          room.students.set(student.studentId, student);

          // ensure score exists
          if (!room.scores.has(student.studentId)) {
            room.scores.set(student.studentId, { correct: 0, totalTime: 0, points: 0 });
          }
          io.to(pin).emit("students:update", Array.from(room.students.values()));
        }

        // late join sync
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

      // QUESTION SHOW (lecturer)
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
          startAt: Number.isFinite(question.startAt) ? question.startAt : undefined,
          durationSec: Number.isFinite(question.durationSec) ? question.durationSec : undefined,
        };

        room.current = out;
        const dur = Number.isFinite(question.durationSec) ? Number(question.durationSec) : 60;
        room.durationByQuestion.set(qIndex, dur);


        // store correct index if provided
        if (Number.isFinite(question.correctIndex) && question.correctIndex! >= 0 && question.correctIndex! <= 3) {
          room.correctByQuestion.set(qIndex, question.correctIndex!);
        }

        // IMPORTANT: reset answers for THIS question
        room.answers.set(qIndex, new Map());

        // allow scoring this question again (fresh)
        room.scoredQuestions.delete(qIndex);

        io.to(pin).emit("question:show", out);

        io.to(pin).emit("answer:count", {
          questionIndex: qIndex,
          counts: [0, 0, 0, 0],
          totalAnswers: 0,
        });
      });

      // STUDENT ANSWER
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

        // dedupe
        if (map.has(studentId)) return;

        map.set(studentId, { answerIndex, timeUsed });

        const { counts, totalAnswers } = countsForRoom(room, questionIndex);
        io.to(pin).emit("answer:count", { questionIndex, counts, totalAnswers });
      });

      // REVEAL (lecturer) -> score + broadcast leaderboard
      socket.on(
        "reveal",
        ({ pin, questionIndex, correctIndex }: { pin: string; questionIndex: number; correctIndex?: number }) => {
          if (!pin) return;

          const room = getRoom(pin);
          const qIndex = safeInt(questionIndex, room.current?.questionIndex ?? 0);

          // store correct index if provided
          if (Number.isFinite(correctIndex) && correctIndex! >= 0 && correctIndex! <= 3) {
            room.correctByQuestion.set(qIndex, correctIndex!);
          }

          const correct = room.correctByQuestion.get(qIndex);
          if (typeof correct !== "number") return;

          // send to students so they can score UI
          io.to(pin).emit("answer:reveal", { questionIndex: qIndex, correctIndex: correct });

          // prevent double scoring
          if (room.scoredQuestions.has(qIndex)) return;
          room.scoredQuestions.add(qIndex);

          // score everyone who answered
          const ansMap = room.answers.get(qIndex) ?? new Map();
          const maxTime = room.durationByQuestion.get(qIndex) ?? 60;

          for (const [sid, rec] of ansMap.entries()) {
            const prev = room.scores.get(sid) ?? { correct: 0, totalTime: 0, points: 0 };
            const isCorrect = rec.answerIndex === correct;

            let addPoints = 0;
            if (isCorrect) {
              const timeUsed = Math.max(0, Math.round(rec.timeUsed));
              const timeLeft = Math.max(0, Math.round(maxTime - timeUsed));
              addPoints = timeLeft * 10; // ✅ rule you want
            }

            room.scores.set(sid, {
              correct: prev.correct + (isCorrect ? 1 : 0),
              totalTime: prev.totalTime + rec.timeUsed,
              points: prev.points + addPoints,
            });
          }


          // broadcast updated leaderboard
          io.to(pin).emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
        }
      );

      // FINISH QUIZ -> final leaderboard + download payload
      socket.on("finish", ({ pin, payload }: { pin: string; payload: QuizFinishedPayload }) => {
        if (!pin || !payload) return;

        const room = getRoom(pin);
        const leaderboard = makeLeaderboard(room);

        io.to(pin).emit("final_results", {
          pin,
          total: payload.total,
          leaderboard,
        });

        // students download
        io.to(pin).emit("quiz:finished", payload);
        io.to(pin).emit("quiz_finished", { payload }); // optional compatibility
      });

      socket.on("next", ({ pin }: { pin: string }) => {
        if (!pin) return;
        io.to(pin).emit("question:next");
      });
    });
  }

  res.end();
}
