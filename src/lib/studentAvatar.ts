// src/lib/studentAvatar.ts
import type { StudentAccount } from "@/src/lib/studentAuthStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { botttsUrl } from "@/src/lib/dicebear";

export function getSeedFromAccount(me: StudentAccount) {
  return (me.avatarSeed || me.email || me.studentId || "student").trim();
}

export function getAvatarSrc(input: StudentAccount | LiveStudent | null | undefined, size = 96) {
  if (!input) return "/icons/student.png";

  // LiveStudent already stores avatarSrc
  if ("avatarSrc" in input && input.avatarSrc) return input.avatarSrc;

  // StudentAccount -> compute from seed/email/studentId
  if ("email" in input) {
    const seed = (input.avatarSeed || input.email || input.studentId || "student").trim();
    return botttsUrl(seed, size);
  }

  return "/icons/student.png";
}

/**
 * Build LiveStudent from StudentAccount (keeps your liveStorage type unchanged).
 */
export function toLiveStudent(me: StudentAccount, size = 96): LiveStudent {
  const seed = getSeedFromAccount(me);

  // ✅ LiveStudent.studentId must be string
  const sid =
    (me.studentId && me.studentId.trim()) ||
    // fallback to derived id from email if you want:
    // deriveStudentIdFromEmail(me.email) ||
    me.email ||
    me.id;

  return {
    studentId: sid,
    name: me.name,
    avatarSrc: botttsUrl(seed, size),
  };
}

