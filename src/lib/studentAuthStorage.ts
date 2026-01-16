// src/lib/studentAuthStorage.ts
export type StudentAccount = {
  id: string;
  email: string;       // normalized (lowercase)
  password: string;    // demo only (plain). If production, hash it server-side.
  name: string;
  studentId: string;

  // legacy/local avatar (optional). You can keep it or ignore it once using DiceBear.
  avatarSrc?: string;

  // DiceBear Bottts seed (deterministic avatar)
  avatarSeed?: string;

  points: number;
  createdAt: string;
};

const STUDENTS_KEY = "gamorax_students_v1";
const CURRENT_EMAIL_KEY = "gamorax_current_student_email_v1";

function normEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function normPassword(pw: string) {
  // avoid "space" mistakes
  return String(pw ?? "").trim();
}

export function deriveStudentIdFromEmail(email: string) {
  // u5400000@au.edu -> 5400000
  // g7777777@au.edu -> 7777777
  const m = normEmail(email).match(/^([a-z])(\d+)@au\.edu$/);
  return m ? m[2] : "";
}

function safeRandomSeed() {
  // browser-safe random seed
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getAllStudents(): StudentAccount[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STUDENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StudentAccount[]) : [];
  } catch {
    return [];
  }
}

function saveAllStudents(list: StudentAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(list));
}

export function registerStudent(args: {
  email: string;
  password: string;
  name: string;
  studentId?: string; // optional if AU email
  avatarSrc?: string;

  // optional: if you want to set seed explicitly
  avatarSeed?: string;
}) {
  const email = normEmail(args.email);
  const password = normPassword(args.password);
  const name = String(args.name ?? "").trim();

  if (!email || !password || !name) {
    throw new Error("Please fill in email, password, and name.");
  }

  // basic password rule (adjust if you want)
  if (password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  const derived = deriveStudentIdFromEmail(email);
  const studentId = derived || String(args.studentId ?? "").trim();

  if (!studentId) {
    throw new Error("Student ID is required (or use AU email like u5400000@au.edu).");
  }

  const list = getAllStudents();
  const exists = list.find((s) => normEmail(s.email) === email);
  if (exists) throw new Error("Account already exists for this email.");

  // Prefer provided seed, otherwise use email (stable) or random seed
  const avatarSeed = (args.avatarSeed ?? email ?? safeRandomSeed()).toString();

  const account: StudentAccount = {
    id: crypto.randomUUID(),
    email,
    password,
    name,
    studentId,
    avatarSrc: args.avatarSrc ?? "/icons/student.png",
    avatarSeed,
    points: 0,
    createdAt: new Date().toISOString(),
  };

  list.push(account);
  saveAllStudents(list);

  // auto-login after register
  localStorage.setItem(CURRENT_EMAIL_KEY, email);

  return account;
}

export function loginStudent(emailIn: string, passwordIn: string) {
  const email = normEmail(emailIn);
  const password = normPassword(passwordIn);

  const list = getAllStudents();
  const account = list.find((s) => normEmail(s.email) === email);

  if (!account) throw new Error("Account not found. Please register first.");
  if (normPassword(account.password) !== password) throw new Error("Incorrect password.");

  // Backfill seed for older accounts that don't have it yet
  if (!account.avatarSeed) {
    const idx = list.findIndex((s) => s.id === account.id);
    if (idx !== -1) {
      list[idx] = { ...account, avatarSeed: account.email || safeRandomSeed() };
      saveAllStudents(list);
    }
  }

  localStorage.setItem(CURRENT_EMAIL_KEY, email);
  return getCurrentStudent();
}

export function getCurrentStudent(): StudentAccount | null {
  if (typeof window === "undefined") return null;

  const email = normEmail(localStorage.getItem(CURRENT_EMAIL_KEY) ?? "");
  if (!email) return null;

  const list = getAllStudents();
  const me = list.find((s) => normEmail(s.email) === email) ?? null;

  // Backfill seed if missing
  if (me && !me.avatarSeed) {
    const idx = list.findIndex((s) => s.id === me.id);
    if (idx !== -1) {
      const next = { ...me, avatarSeed: me.email || safeRandomSeed() };
      list[idx] = next;
      saveAllStudents(list);
      return next;
    }
  }

  return me;
}

export function logoutStudent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_EMAIL_KEY);
}

export function updateCurrentStudent(
  patch: Partial<
    Omit<StudentAccount, "id" | "email" | "createdAt" | "points">
  > & {
    // allow updating password optional
    password?: string;
  }
) {
  const me = getCurrentStudent();
  if (!me) throw new Error("Not logged in.");

  const list = getAllStudents();
  const idx = list.findIndex((s) => s.id === me.id);
  if (idx === -1) throw new Error("Account not found.");

  const next: StudentAccount = {
    ...list[idx],
    name: patch.name !== undefined ? String(patch.name).trim() : list[idx].name,
    studentId:
      patch.studentId !== undefined
        ? String(patch.studentId).trim()
        : list[idx].studentId,

    avatarSrc: patch.avatarSrc !== undefined ? patch.avatarSrc : list[idx].avatarSrc,

    // DiceBear seed update
    avatarSeed:
      patch.avatarSeed !== undefined
        ? String(patch.avatarSeed).trim()
        : (list[idx].avatarSeed ?? list[idx].email),

    password:
      patch.password !== undefined
        ? normPassword(patch.password)
        : list[idx].password,
  };

  list[idx] = next;
  saveAllStudents(list);
  return next;
}

export function addPointsToStudent(emailIn: string, pointsToAdd: number) {
  const email = normEmail(emailIn);
  const add = Number(pointsToAdd);
  if (!Number.isFinite(add) || add <= 0) return;

  const list = getAllStudents();
  const idx = list.findIndex((s) => normEmail(s.email) === email);
  if (idx === -1) return;

  list[idx] = { ...list[idx], points: (list[idx].points ?? 0) + add };
  saveAllStudents(list);
}

// ✅ Delete current student account permanently (localStorage)
export function deleteCurrentStudent() {
  if (typeof window === "undefined") return;

  const me = getCurrentStudent();
  if (!me) return;

  // remove from students list
  const raw = localStorage.getItem(STUDENTS_KEY);
  const list = raw ? (JSON.parse(raw) as StudentAccount[]) : [];
  const next = Array.isArray(list) ? list.filter((s) => s.id !== me.id) : [];

  localStorage.setItem(STUDENTS_KEY, JSON.stringify(next));

  // logout
  localStorage.removeItem(CURRENT_EMAIL_KEY);
}
