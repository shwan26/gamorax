import { Server } from "socket.io";

let io: Server | null = null;

export async function GET() {
  if (!io) {
    io = new Server({
      path: "/api/socket",
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      socket.on("join", ({ pin, player }) => {
        socket.join(pin);
        io!.to(pin).emit("players:update");
      });

      socket.on("start", ({ pin }) => {
        io!.to(pin).emit("game:start", {
          startAt: Date.now(),
        });
      });

      socket.on("answer", ({ pin, questionIndex, answerIndex, timeUsed }) => {
        io!.to(pin).emit("answer:received", {
          questionIndex,
          answerIndex,
          timeUsed,
        });
      });

      socket.on("reveal", ({ pin }) => {
        io!.to(pin).emit("answer:reveal");
      });

      socket.on("next", ({ pin }) => {
        io!.to(pin).emit("question:next");
      });
    });
  }

  return new Response("Socket ready");
}
