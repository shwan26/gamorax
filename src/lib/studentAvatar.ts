// src/lib/studentAvatar.ts
import type { StudentAccount } from "@/src/lib/studentAuthStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { botttsUrl } from "@/src/lib/dicebear";

export function getSeedFromAccount(me: StudentAccount) {
  return (me.avatarSeed || me.email || me.studentId || me.id || "student").trim();
}

function getSeedFromLiveStudent(s: LiveStudent) {
  return (s.studentId || s.name || "student").trim();
}

export function getAvatarSrc(
  input: StudentAccount | LiveStudent | null | undefined,
  size = 96
) {
  if (!input) return botttsUrl("student", size);

  if ("avatarSrc" in input && input.avatarSrc) return input.avatarSrc;

  if ("email" in input) {
    return botttsUrl(getSeedFromAccount(input), size);
  }

  return botttsUrl(getSeedFromLiveStudent(input), size);
}

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
