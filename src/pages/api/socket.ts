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
  // from lecturer
  questionIndex: number; // 0-based
  number: number; // 1-based
  total: number;
  text: string;
  answers: string[];

  // optional (OK if missing)
  correctIndex?: number; // 0-3

  // ✅ TIMER (lecturer sends)
  startAt?: number; // ms timestamp
  durationSec?: number; // seconds
};

type QuestionPayloadOut = {
  // to students (NO correctIndex)
  questionIndex: number;
  number: number;
  total: number;
  text: string;
  answers: string[];

  // ✅ TIMER (students receive)
  startAt: number; // ms timestamp
  durationSec: number; // seconds
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

type Room = {
  students: Map<string, LiveStudent>;
  current?: QuestionPayloadOut; // broadcasted question (no correctIndex)
  // answers[questionIndex][studentId] = answerIndex
  answers: Map<number, Map<string, number>>;
  // correctByQuestion[questionIndex] = correctIndex
  correctByQuestion: Map<number, number>;
};

type ResWithSocket = NextApiResponse & { socket: any & { server: any } };

// ---- in-memory rooms (module scope) ----
const rooms = new Map<string, Room>();

function getRoom(pin: string): Room {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      students: new Map(),
      current: undefined,
      answers: new Map(),
      correctByQuestion: new Map(),
    });
  }
  return rooms.get(pin)!;
}

function safeInt(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function safeStartAt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? x : Date.now();
}

function safeDurationSec(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return 20;
  // clamp to avoid insane values
  return Math.min(60 * 60, Math.max(1, Math.round(x)));
}

function countsForRoom(
  room: Room,
  questionIndex: number
): { counts: number[]; totalAnswers: number } {
  const map = room.answers.get(questionIndex);
  const counts = [0, 0, 0, 0];
  if (!map) return { counts, totalAnswers: 0 };

  for (const ans of map.values()) {
    if (ans >= 0 && ans <= 3) counts[ans] += 1;
  }
  return { counts, totalAnswers: map.size };
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

        // add/update student (if provided)
        if (student?.studentId) {
          room.students.set(student.studentId, student);
          io.to(pin).emit("students:update", Array.from(room.students.values()));
        }

        // ✅ sync current question for late joiners (includes timer)
        if (room.current) {
          socket.emit("question:show", room.current);

          // ✅ also sync current counts
          const { counts, totalAnswers } = countsForRoom(room, room.current.questionIndex);
          socket.emit("answer:count", {
            questionIndex: room.current.questionIndex,
            counts,
            totalAnswers,
          });
        }
      });

      // LECTURER SHOW QUESTION
      socket.on("question:show", ({ pin, question }: { pin: string; question: QuestionPayloadIn }) => {
        if (!pin || !question) return;

        const room = getRoom(pin);

        const qIndex = safeInt(question.questionIndex, 0);

        // ✅ timer values (synced)
        const startAt = safeStartAt(question.startAt);
        const durationSec = safeDurationSec(question.durationSec);

        const out: QuestionPayloadOut = {
          questionIndex: qIndex,
          number: safeInt(question.number, qIndex + 1),
          total: safeInt(question.total, 1),
          text: String(question.text ?? ""),
          answers: Array.isArray(question.answers) ? question.answers : [],
          startAt,
          durationSec,
        };

        room.current = out;

        // store correctIndex if lecturer provided it (optional)
        if (
          Number.isFinite(question.correctIndex) &&
          question.correctIndex! >= 0 &&
          question.correctIndex! <= 3
        ) {
          room.correctByQuestion.set(qIndex, question.correctIndex!);
        }

        // ✅ only reset answers if first time this questionIndex appears
        if (!room.answers.has(qIndex)) {
          room.answers.set(qIndex, new Map());
        }

        // broadcast to students (NO correctIndex, BUT with timer)
        io.to(pin).emit("question:show", out);

        // send current counts (either reset or existing)
        const { counts, totalAnswers } = countsForRoom(room, qIndex);
        io.to(pin).emit("answer:count", { questionIndex: qIndex, counts, totalAnswers });
      });

      // STUDENT ANSWER
      socket.on("answer", (p: { pin: string; studentId: string; questionIndex: number; answerIndex: number; timeUsed: number }) => {
        const pin = String(p?.pin ?? "");
        const studentId = String(p?.studentId ?? "");
        const questionIndex = safeInt(p?.questionIndex, -1);
        const answerIndex = safeInt(p?.answerIndex, -1);

        if (!pin || !studentId) return;
        if (questionIndex < 0) return;
        if (answerIndex < 0 || answerIndex > 3) return;

        const room = getRoom(pin);
        if (!room.answers.has(questionIndex)) room.answers.set(questionIndex, new Map());

        const map = room.answers.get(questionIndex)!;

        // dedupe: 1 answer per student per question
        if (map.has(studentId)) return;

        map.set(studentId, answerIndex);

        const { counts, totalAnswers } = countsForRoom(room, questionIndex);

        // lecturer UI listens to this
        io.to(pin).emit("answer:count", { questionIndex, counts, totalAnswers });
      });

      // LECTURER REVEAL
      socket.on(
        "reveal",
        ({ pin, questionIndex, correctIndex }: { pin: string; questionIndex: number; correctIndex?: number }) => {
          if (!pin) return;

          const room = getRoom(pin);
          const qIndex = safeInt(questionIndex, room.current?.questionIndex ?? 0);

          // store correctIndex if provided
          if (Number.isFinite(correctIndex) && correctIndex! >= 0 && correctIndex! <= 3) {
            room.correctByQuestion.set(qIndex, correctIndex!);
          }

          const stored = room.correctByQuestion.get(qIndex);
          if (typeof stored !== "number") return;

          io.to(pin).emit("answer:reveal", { questionIndex: qIndex, correctIndex: stored });
        }
      );

      // FINISH QUIZ (download)
      socket.on("finish", ({ pin, payload }: { pin: string; payload: QuizFinishedPayload }) => {
        if (!pin || !payload) return;
        io.to(pin).emit("quiz:finished", payload);
        io.to(pin).emit("quiz_finished", { payload }); // optional compatibility
      });

      // NEXT
      socket.on("next", ({ pin }: { pin: string }) => {
        if (!pin) return;
        io.to(pin).emit("question:next");
      });
    });
  }

  res.end();
}
