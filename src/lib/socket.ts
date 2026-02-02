// src/lib/socket.ts
import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

function makeSocket(): Socket {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

  return io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    withCredentials: true,

    // ✅ We'll set this later before connect()
    auth: { accessToken: "" },

    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelayMax: 2000,
  });
}

// ✅ Call only in client components (inside useEffect)
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket cannot be used during SSR. Call inside useEffect.");
  }
  if (!_socket) _socket = makeSocket();
  return _socket;
}

/** ✅ Call this before socket.connect() */
export function setSocketAccessToken(accessToken: string) {
  const s = getSocket();
  // socket.io supports updating auth before connect/reconnect
  (s as any).auth = { ...(s as any).auth, accessToken };
}

/** Optional: clean disconnect */
export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
  }
}

/**
 * ✅ Import { socket } everywhere.
 * This proxy delays creating the real socket until you actually use it on client.
 */
export const socket: Socket = new Proxy({} as Socket, {
  get(_t, prop) {
    const s = getSocket();
    const v = (s as any)[prop];
    return typeof v === "function" ? v.bind(s) : v;
  },
  set(_t, prop, value) {
    const s = getSocket();
    (s as any)[prop] = value;
    return true;
  },
});
