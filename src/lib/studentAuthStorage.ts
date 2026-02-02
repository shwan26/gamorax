// src/lib/studentAuthStorage.ts
// ✅ Migrated from localStorage auth -> Supabase Auth + profiles (my_profile_api)

import { supabase } from "@/src/lib/supabaseClient";

export type StudentAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  avatarSeed: string | null;
  points: number;
};

function normEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function normPassword(pw: string) {
  return String(pw ?? "").trim();
}

export function deriveStudentIdFromEmail(email: string) {
  // u5400000@au.edu -> 5400000
  // g7777777@au.edu -> 7777777
  const m = normEmail(email).match(/^([a-z])(\d+)@au\.edu$/);
  return m ? m[2] : "";
}

async function fetchMyStudentProfile(): Promise<StudentAccount | null> {
  const { data: u, error: uErr } = await supabase.auth.getUser();
  const authUser = u?.user;

  if (uErr || !authUser?.id) return null;

  // ✅ updated columns: firstName/lastName (no fullName)
  const { data: prof, error: pErr } = await supabase
    .from("my_profile_api")
    .select("id, role, firstName, lastName, studentId, avatarSeed, points")
    .single();

  if (pErr || !prof) return null;
  if (prof.role !== "student") return null;

  return {
    id: prof.id,
    email: authUser.email ?? "",
    firstName: prof.firstName ?? "",
    lastName: prof.lastName ?? "",
    studentId: prof.studentId ?? null,
    avatarSeed: prof.avatarSeed ?? null,
    points: Number(prof.points ?? 0),
  };
}

/**
 * ✅ Register student (Supabase Auth)
 * - writes metadata so your `handle_new_user()` trigger can populate profiles
 * - your `enforce_student_email_and_id()` trigger enforces first_name/last_name + student_id rules
 */
export async function registerStudent(args: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string; // required if non-AU email (based on your trigger)
  avatarSeed?: string;
}) {
  const email = normEmail(args.email);
  const password = normPassword(args.password);

  const firstName = String(args.firstName ?? "").trim();
  const lastName = String(args.lastName ?? "").trim();

  if (!email || !password || !firstName || !lastName) {
    throw new Error("Please fill in email, password, first name, and last name.");
  }
  if (password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  const derived = deriveStudentIdFromEmail(email);
  const studentId = derived || String(args.studentId ?? "").trim() || undefined;

  const avatarSeed = ((args.avatarSeed ?? derived) || email).toString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "student",
        // ✅ IMPORTANT: must match your handle_new_user() keys
        first_name: firstName,
        last_name: lastName,
        // If AU email, student_id may be auto-derived by your trigger anyway.
        // If non-AU email, your trigger requires student_id.
        ...(studentId ? { student_id: studentId } : {}),
        avatar_seed: avatarSeed,
      },
    },
  });

  if (error) throw error;

  // If email confirmations are enabled, session may be null here.
  // We'll still return whatever profile exists (or null).
  const me = await fetchMyStudentProfile();
  return { auth: data.user, profile: me };
}

/**
 * ✅ Login student (Supabase Auth)
 */
export async function loginStudent(emailIn: string, passwordIn: string) {
  const email = normEmail(emailIn);
  const password = normPassword(passwordIn);

  if (!email || !password) throw new Error("Enter email and password.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const me = await fetchMyStudentProfile();
  if (!me) throw new Error("Logged in, but student profile/role not found.");
  return me;
}

/**
 * ✅ Get current student (Supabase session + my_profile_api)
 */
export async function getCurrentStudent(): Promise<StudentAccount | null> {
  return await fetchMyStudentProfile();
}

/**
 * ✅ Logout student (Supabase)
 */
export async function logoutStudent() {
  await supabase.auth.signOut();
}

/**
 * ✅ Update current student profile (my_profile_api view)
 */
export async function updateCurrentStudent(patch: Partial<{
  firstName: string;
  lastName: string;
  studentId: string;
  avatarSeed: string;
}>) {
  const { data: u } = await supabase.auth.getUser();
  const authUser = u?.user;
  if (!authUser) throw new Error("Not logged in.");

  const payload: any = {};
  if (patch.firstName !== undefined) payload.firstName = String(patch.firstName).trim();
  if (patch.lastName !== undefined) payload.lastName = String(patch.lastName).trim();
  if (patch.studentId !== undefined) payload.studentId = String(patch.studentId).trim();
  if (patch.avatarSeed !== undefined) payload.avatarSeed = String(patch.avatarSeed).trim();

  const { error } = await supabase
    .from("my_profile_api")
    .update(payload)
    .eq("id", authUser.id);

  if (error) throw error;

  const me = await fetchMyStudentProfile();
  if (!me) throw new Error("Profile updated, but failed to reload.");
  return me;
}

/**
 * ⚠️ Legacy helper from localStorage era.
 * Points should now be handled by DB (student_attempts trigger updates points_total).
 */
export function addPointsToStudent(_email: string, _points: number) {
  // no-op (kept only so old imports won't explode)
}

/**
 * ⚠️ You cannot delete auth.users from client safely.
 * Keep this function for old UI calls, but it just logs out.
 */
export async function deleteCurrentStudent() {
  await supabase.auth.signOut();
}
