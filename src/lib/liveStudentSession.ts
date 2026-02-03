// src/lib/liveStudentSession.ts
import type { LiveStudent } from "@/src/lib/liveStorage";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import { botttsUrl } from "@/src/lib/dicebear";

/**
 * New source of truth:
 * derive from Supabase profile every time.
 */
export async function getLiveStudentFromProfile(): Promise<LiveStudent | null> {
  const me = await getCurrentStudent();
  if (!me) return null;

  const name = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || "Student";
  const seed = (me.avatarSeed || me.email || me.id || "student").trim();

  return {
    studentId: me.studentId || me.id,
    name,
    avatarSrc: botttsUrl(seed, 96),
  };
}

/**
 * ✅ Backward compatible exports (so old pages compile)
 * These functions used to be sessionStorage-based.
 * Now they just wrap profile-derived data.
 */

export async function getOrCreateLiveStudent(): Promise<LiveStudent | null> {
  return getLiveStudentFromProfile();
}

/** kept for old imports; no longer needed */
export function writeLiveStudent(_s: LiveStudent) {
  // no-op (we don't persist live student anymore)
}

/** kept for old imports; no longer needed */
export function clearLiveStudent() {
  // no-op
}

/** optional alias if any old code calls it */
export function readLiveStudent(): LiveStudent | null {
  return null;
}
