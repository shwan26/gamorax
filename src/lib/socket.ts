// src/lib/socket.ts
import { io, type Socket } from "socket.io-client";

const url = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!url) {
  // this throws early so you notice missing env in Vercel
  throw new Error("Missing NEXT_PUBLIC_SOCKET_URL");
}

export const socket: Socket = io(url, {
  transports: ["websocket"],
  autoConnect: false, // ✅ important
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 2000,
});
