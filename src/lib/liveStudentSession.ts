// src/lib/liveStudentSession.ts
import type { LiveStudent } from "@/src/lib/liveStorage";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import { toLiveStudent } from "@/src/lib/studentAvatar";
const KEY = "gamorax_live_student";

/** Guard: sessionStorage only exists in the browser */
function hasSessionStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/* -------------------------------------------------------
   Session helpers (kept for backward compatibility)
------------------------------------------------------- */
export function readLiveStudent(): LiveStudent | null {
  if (!hasSessionStorage()) return null;

  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const s = JSON.parse(raw) as LiveStudent;
    if (!s?.studentId || !s?.name) return null;
    return s;
  } catch {
    return null;
  }
}

export function writeLiveStudent(s: LiveStudent) {
  if (!hasSessionStorage()) return;
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function clearLiveStudent() {
  if (!hasSessionStorage()) return;
  sessionStorage.removeItem(KEY);
}

/* -------------------------------------------------------
   Supabase profile (async)
------------------------------------------------------- */
export async function getLiveStudentFromProfile(): Promise<LiveStudent | null> {
  const me = await getCurrentStudent();
  if (!me) return null;

  // centralize mapping + avatar building
  return toLiveStudent(me, 96);
}

export async function getOrCreateLiveStudent(): Promise<LiveStudent | null> {
  const fromSession = readLiveStudent();
  if (fromSession) return fromSession;

  const live = await getLiveStudentFromProfile();
  if (!live) return null;

  writeLiveStudent(live);
  return live;
}

export function getOrCreateLiveStudentSync(): LiveStudent | null {
  return readLiveStudent();
}
