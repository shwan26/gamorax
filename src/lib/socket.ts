import { io, type Socket } from "socket.io-client";

const url = process.env.NEXT_PUBLIC_SOCKET_URL!;

export const socket: Socket = io(url, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 2000,
});
