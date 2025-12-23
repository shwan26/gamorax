import { io, type Socket } from "socket.io-client";

export const socket: Socket = io({
  path: "/api/socket",
  transports: ["websocket"], // ✅ stop the polling spam
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 2000,
});

