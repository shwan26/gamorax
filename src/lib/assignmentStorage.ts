// src/lib/assignmentStorage.ts
import type { Question } from "./questionStorage";

export type Assignment = {
  id: string;
  courseId: string;
  gameId: string;

  title: string;

  // availability
  opensAt?: string; // ISO
  dueAt?: string;   // ISO

  // total duration for the attempt
  durationSec: number;

  createdAt: string; // ISO
  passcodeHash?: string;
};

const KEY = "gamorax_assignments";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getAll(): Assignment[] {
  if (typeof window === "undefined") return [];
  return safeParse<Assignment[]>(localStorage.getItem(KEY), []);
}

function saveAll(list: Assignment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listAssignmentsByGame(gameId: string): Assignment[] {
  return getAll().filter((a) => a.gameId === gameId);
}

export function getAssignmentById(id: string): Assignment | null {
  return getAll().find((a) => a.id === id) ?? null;
}

export function createAssignment(input: Omit<Assignment, "id" | "createdAt">): Assignment {
  const next: Assignment = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const all = getAll();
  all.unshift(next);
  saveAll(all);
  return next;
}

export function updateAssignment(id: string, patch: Partial<Assignment>) {
  const all = getAll();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  saveAll(all);
}

export function deleteAssignment(id: string) {
  saveAll(getAll().filter((a) => a.id !== id));
}

/**
 * Share token (optional): pack assignment + questions into the URL so it works even without DB.
 * This makes the link genuinely shareable today.
 */
export function makeAssignmentShareToken(payload: { assignment: Assignment; questions: Question[] }) {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json))); // safe base64 for unicode
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function readAssignmentShareToken(token: string): { assignment: Assignment; questions: Question[] } | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((token.length + 3) % 4);
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
