import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";

export const config = { api: { bodyParser: false } };

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

type QuestionPayload = {
  number: number; // 1-based
  total: number;
  text: string;
  answers: string[];
};

type Room = {
  students: LiveStudent[];
  startedAt?: number;
  currentQuestion?: QuestionPayload;
};

type ResWithSocket = NextApiResponse & {
  socket: any & { server: any };
};

function getRooms(server: any): Map<string, Room> {
  if (!server.__gamoraxRooms) server.__gamoraxRooms = new Map<string, Room>();
  return server.__gamoraxRooms;
}

function getRoom(rooms: Map<string, Room>, pin: string): Room {
  const prev = rooms.get(pin);
  if (prev) return prev;
  const next: Room = { students: [] };
  rooms.set(pin, next);
  return next;
}

function upsertStudent(list: LiveStudent[], st: LiveStudent): LiveStudent[] {
  const idx = list.findIndex((x) => x.studentId === st.studentId);
  if (idx === -1) return [...list, st];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...st };
  return copy;
}

export default function handler(req: NextApiRequest, res: ResWithSocket) {
  const server = res.socket?.server;
  if (!server) {
    res.status(500).end("No socket server");
    return;
  }

  if (!server.io) {
    const io = new IOServer(server, {
      path: "/api/socket",
      cors: { origin: "*" },
    });

    server.io = io;

    // ✅ capture rooms ONCE, using server (not res)
    const rooms = getRooms(server);

    io.on("connection", (socket) => {
      socket.on("join", ({ pin, student }: { pin: string; student?: LiveStudent }) => {
        if (!pin) return;
        socket.join(pin);

        const room = getRoom(rooms, pin);

        if (student?.studentId) {
          room.students = upsertStudent(room.students, student);
          io.to(pin).emit("students:update", room.students);
        }

        // late joiners sync
        if (room.startedAt) socket.emit("game:start", { startAt: room.startedAt });
        if (room.currentQuestion) socket.emit("question:show", room.currentQuestion);
      });

      socket.on("start", ({ pin }: { pin: string }) => {
        if (!pin) return;
        const room = getRoom(rooms, pin);
        room.startedAt = Date.now();
        io.to(pin).emit("game:start", { startAt: room.startedAt });
      });

      socket.on(
        "question:show",
        ({ pin, question }: { pin: string; question: QuestionPayload }) => {
          if (!pin) return;
          const room = getRoom(rooms, pin);
          room.currentQuestion = question;
          io.to(pin).emit("question:show", question);
        }
      );

      socket.on("answer", ({ pin, questionIndex, answerIndex, timeUsed }) => {
        if (!pin) return;
        io.to(pin).emit("answer:received", { questionIndex, answerIndex, timeUsed });
      });

      socket.on("reveal", ({ pin }: { pin: string }) => {
        if (!pin) return;
        io.to(pin).emit("answer:reveal");
      });

      socket.on("next", ({ pin }: { pin: string }) => {
        if (!pin) return;
        io.to(pin).emit("question:next");
      });
    });
  }

  res.end();
}
