// src/lib/liveStudentSession.ts
import type { LiveStudent } from "@/src/lib/liveStorage";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import { toLiveStudent } from "@/src/lib/studentAvatar";

const KEY = "gamorax_live_student";

export function readLiveStudent(): LiveStudent | null {
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
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function clearLiveStudent() {
  sessionStorage.removeItem(KEY);
}

export async function getOrCreateLiveStudent(): Promise<LiveStudent | null> {
  const fromSession = readLiveStudent();
  if (fromSession) return fromSession;

  const me = await getCurrentStudent();
  if (!me) return null;

  const live = toLiveStudent(me, 96);
  writeLiveStudent(live);
  return live;
}
