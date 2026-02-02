"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudentNavbar from "@/src/components/StudentNavbar";
import {
  getCurrentStudent,
  logoutStudent,
  updateCurrentStudent,
  deriveStudentIdFromEmail,
} from "@/src/lib/studentAuthStorage";
import { botttsUrl, randomSeed } from "@/src/lib/dicebear";
import { deleteCurrentStudent } from "@/src/lib/studentAuthStorage";
import { deleteAttemptsByStudent } from "@/src/lib/studentReportStorage";
import { clearLiveStudent } from "@/src/lib/liveStudentSession";
import { LogOut, Trash2, UserRound, Shuffle } from "lucide-react";
import GradientButton from "@/src/components/GradientButton";

function DotPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          "mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5",
          "text-slate-900 shadow-sm outline-none backdrop-blur",
          "placeholder:text-slate-400 focus:ring-2 focus:ring-[#00D4FF]/40",
          "dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500",
          disabled ? "opacity-70 cursor-not-allowed" : "",
        ].join(" ")}
      />
      {hint ? (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{hint}</p>
      ) : null}
    </div>
  );
}

export default function MeProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Awaited<ReturnType<typeof getCurrentStudent>>>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [studentId, setStudentId] = useState("");
  const [avatarSeed, setAvatarSeed] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    (async () => {
      const cur = await getCurrentStudent();
      if (!cur) {
        router.push("/auth/login");
        return;
      }
      setMe(cur);
      setFirstName(cur.firstName || "");
      setLastName(cur.lastName || "");
      setStudentId(cur.studentId || "");
      setAvatarSeed(cur.avatarSeed || cur.email || "student");
    })();
  }, [router]);

  const autoId = useMemo(() => (me ? deriveStudentIdFromEmail(me.email) : ""), [me]);

  const avatarUrl = useMemo(() => {
    const seed = avatarSeed?.trim() || me?.email || "student";
    return botttsUrl(seed, 96);
  }, [avatarSeed, me?.email]);

  if (!mounted) return null;
  if (!me) return null;

  async function onSave() {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const sid = studentId.trim() || autoId;
    const seed = avatarSeed.trim() || me?.email || "student";

    if (!fn) return alert("First name is required.");
    if (!ln) return alert("Last name is required.");
    if (!sid) return alert("Student ID is required (or use AU email).");

    const next = await updateCurrentStudent({
      firstName: fn,
      lastName: ln,
      studentId: sid,
      avatarSeed: seed,
    });

    setMe(next);
    const fresh = await getCurrentStudent();
    if (fresh) setMe(fresh);

    alert("Profile updated");
    router.push("/me");
  }

  async function onLogout() {
    await logoutStudent();
    router.push("/auth/login");
  }

  async function onDeleteAccount() {
    if (!me) return;

    const ok = confirm(
      "Delete your account?\n\nThis will remove:\n- Your account\n- All report history\n- Your points\n\nThis cannot be undone."
    );
    if (!ok) return;

    deleteAttemptsByStudent(me.email);

    try {
      clearLiveStudent();
    } catch {}

    await deleteCurrentStudent();
    router.push("/auth/register");
  }

  const initials =
  (firstName?.trim()?.charAt(0) || "S") + (lastName?.trim()?.charAt(0) || "");

  return (
    <div className="min-h-screen app-surface app-bg">
      <StudentNavbar />

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:pt-12 sm:pb-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-[#020024] to-[#00D4FF] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#7C3AED]">
              My Profile
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Email is your login. Student ID can be auto-derived from AU email.
          </p>
        </div>

        <div
          className="
            relative mt-8 overflow-hidden rounded-3xl
            border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur
            sm:p-8
            dark:border-slate-800/70 dark:bg-slate-950/55
          "
        >
          <DotPattern />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#020024]/10 blur-3xl dark:bg-[#020024]/30" />

          <div className="relative">
            {/* Top row: avatar + email + points */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div>
                <div>
                  <div className="rounded-full p-1.5 dark:bg-slate-950/75">
                    <div
                      className="
                        relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full
                        bg-white/80 text-slate-900 shadow-sm
                        dark:bg-slate-950/60 dark:text-slate-50
                      "
                      aria-label="Avatar"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    </div>
                  </div>
                </div>

              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {[firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "Student"}

                </p>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                  {me.email}
                </p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Points: <span className="font-semibold text-slate-900 dark:text-slate-50">{me.points ?? 0}</span>
                </p>
              </div>

              {/* Avatar actions */}
              <div className="hidden sm:flex items-center gap-2">
                <GradientButton
                  variant="ghost"
                  onClick={() => setAvatarSeed(randomSeed())}
                  iconLeft={<Shuffle className="h-4 w-4" />}
                >
                  Random
                </GradientButton>
                <GradientButton
                  variant="ghost"
                  onClick={() => setAvatarSeed(me.email || "student")}
                >
                  Reset
                </GradientButton>
              </div>
            </div>

            {/* Mobile avatar buttons */}
            <div className="mt-4 flex gap-2 sm:hidden">
              <GradientButton
                variant="ghost"
                onClick={() => setAvatarSeed(randomSeed())}
                iconLeft={<Shuffle className="h-4 w-4" />}
              >
                Random Avatar
              </GradientButton>
              <GradientButton
                variant="ghost"
                onClick={() => setAvatarSeed(me.email || "student")}
              >
                Reset
              </GradientButton>
            </div>

            {/* Fields */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={me.email} disabled />
              <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="e.g. Shwan" />
              <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="e.g. Myat Nay Chi" />

              <Field
                label="Student ID"
                value={studentId}
                onChange={setStudentId}
                placeholder={autoId ? `Auto: ${autoId}` : "Enter your student ID"}
                hint={autoId ? `Auto from email: ${autoId}` : undefined}
              />
              
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <GradientButton onClick={onSave}>Save Changes</GradientButton>

              <div className="grid gap-3 sm:grid-cols-2">
                <GradientButton
                  variant="ghost"
                  onClick={onLogout}
                  iconLeft={<LogOut className="h-4 w-4" />}
                >
                  Logout
                </GradientButton>

                <GradientButton
                  variant="danger"
                  onClick={onDeleteAccount}
                  iconLeft={<Trash2 className="h-4 w-4" />}
                >
                  Delete Account
                </GradientButton>
              </div>

              <button
                type="button"
                onClick={() => router.push("/me")}
                className="
                  w-full rounded-full border border-slate-200/80 bg-white/70 px-6 py-3 text-sm font-semibold
                  text-slate-700 shadow-sm hover:bg-white transition
                  dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/70
                "
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} GAMORAX
        </footer>
      </main>
    </div>
  );
}
