// src/lib/studentAvatar.ts
import type { StudentAccount } from "@/src/lib/studentAuthStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { botttsUrl } from "@/src/lib/dicebear";

export function getSeedFromAccount(me: StudentAccount) {
  return (me.avatarSeed || me.email || me.studentId || me.id || "student").trim();
}

function getSeedFromLiveStudent(s: LiveStudent) {
  // LiveStudent doesn’t have email/avatarSeed, so use stable fields
  return (s.studentId || s.name || "student").trim();
}

/**
 * Always returns a valid avatar URL (no /icons/student.png fallback).
 */
export function getAvatarSrc(
  input: StudentAccount | LiveStudent | null | undefined,
  size = 96
) {
  if (!input) return botttsUrl("student", size);

  // LiveStudent already stores avatarSrc
  if ("avatarSrc" in input && input.avatarSrc) return input.avatarSrc;

  // StudentAccount -> compute from seed/email/studentId
  if ("email" in input) {
    return botttsUrl(getSeedFromAccount(input), size);
  }

  // LiveStudent without avatarSrc
  return botttsUrl(getSeedFromLiveStudent(input), size);
}

/**
 * Build LiveStudent from StudentAccount (keeps your liveStorage type unchanged).
 */
export function toLiveStudent(me: StudentAccount, size = 96): LiveStudent {
  const seed = getSeedFromAccount(me);

  const sid =
    (me.studentId && me.studentId.trim()) ||
    me.email ||
    me.id;

  const name = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || "Student";

  return {
    studentId: sid,
    name,
    avatarSrc: botttsUrl(seed, size),
  };
}
