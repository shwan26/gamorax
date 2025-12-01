import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // SOCKET.IO SERVER
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Student joins session
    socket.on("join_room", ({ pin, studentName }) => {
      socket.join(pin);
      io.to(pin).emit("student_joined", studentName);
    });

    // Lecturer starts question
    socket.on("start_question", ({ pin, question }) => {
      io.to(pin).emit("question_started", question);
    });

    // Student sends answer
    socket.on("answer", ({ pin, studentId, choice }) => {
      io.to(pin).emit("answer_received", { studentId, choice });
    });

    // Lecturer starts question
    socket.on("show_result", ({ pin, result }) => {
      io.to(pin).emit("result_shown", result);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

});
