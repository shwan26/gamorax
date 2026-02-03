"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { supabase } from "@/src/lib/supabaseClient";
import { ArrowLeft, GraduationCap, UserRound } from "lucide-react";
import { deriveStudentIdFromEmail } from "@/src/lib/studentAuthStorage";

type Role = "lecturer" | "student";

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const r = sp.get("role");
  const role: Role = r === "student" ? "student" : "lecturer";

  const nextUrl =
    sp.get("next") ||
    (role === "lecturer" ? "/login?role=lecturer" : "/login?role=student");

  // Student = brighter, Lecturer = darker (but still neon)
  const STUDENT_BORDER =
    "linear-gradient(90deg, #A7F3FF 0%, #38BDF8 55%, #00D4FF 100%)";
  const LECTURER_BORDER =
    "linear-gradient(90deg, #050057 0%, #1D4ED8 60%, #00D4FF 100%)";

  const borderBg = role === "student" ? STUDENT_BORDER : LECTURER_BORDER;

  const focusRing =
    role === "student" ? "focus:ring-[#00D4FF]/55" : "focus:ring-[#1D4ED8]/45";

  // Icon always pops
  const iconColor = "#00D4FF";

  // ✅ KEY FIX:
  const cardSurface = "bg-white/85 dark:bg-slate-950/70 backdrop-blur";

  const iconChip = "border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-slate-950/70";

  const darkFieldBg = "dark:bg-slate-950/60";

  const ui = useMemo(() => {
    if (role === "student") {
      return {
        title: "Create Student Account",
        subtitle:
          "Use AU email to auto-fill your Student ID, or register with a personal email.",
        Icon: UserRound,
      };
    }
    return {
      title: "Create Lecturer Account",
      subtitle: "Register to create games and host live sessions.",
      Icon: GraduationCap,
    };
  }, [role]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const derivedId = useMemo(() => {
    if (role !== "student") return "";
    return deriveStudentIdFromEmail(email) || "";
  }, [email, role]);

  useEffect(() => {
    if (role === "student" && derivedId) setStudentId(derivedId);
  }, [derivedId, role]);

  async function handleRegister() {
    if (submitting) return;
    setSubmitting(true);

    try {
      const f = firstName.trim();
      const l = lastName.trim();
      const e = email.trim().toLowerCase();
      const pw = password;

      if (!f || !l || !e || !pw) {
        throw new Error("Please fill in all required fields.");
      }

      if (role === "student" && !derivedId && !studentId.trim()) {
        throw new Error("Student ID is required if you use a personal email.");
      }

      const emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/callback`;

      const { error } = await supabase.auth.signUp({
        email: e,
        password: pw,
        options: {
          emailRedirectTo,
          data: {
            role,
            first_name: f,
            last_name: l,
            ...(role === "student"
              ? { student_id: derivedId || studentId.trim() }
              : {}),
          },
        },
      });

      if (error) throw error;

      alert("✅ Register success! Please check your email to confirm, then login.");
      router.push(nextUrl);
    } catch (err: any) {
      alert(err?.message ?? "Register failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* neon frame */}
          <div
            className="mt-4 overflow-hidden rounded-3xl p-[1px] shadow-[0_12px_30px_rgba(0,0,0,0.10)]"
            style={{
              background: borderBg,
              boxShadow:
                role === "student"
                  ? "0 0 0 1px rgba(0,212,255,0.40), 0 18px 55px rgba(0,212,255,0.22)"
                  : "0 0 0 1px rgba(29,78,216,0.30), 0 18px 55px rgba(5,0,87,0.24)",
            }}
          >
            <div
              className={[
                "relative rounded-3xl p-6 sm:p-7 border border-slate-200/60 dark:border-slate-800/70",
                cardSurface,
              ].join(" ")}
            >
              {/* dot pattern */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />

              {/* header */}
              <div className="relative flex items-center gap-3">
                <div className={["rounded-2xl border p-3 shadow-sm", iconChip].join(" ")}>
                  <ui.Icon className="h-6 w-6" style={{ color: iconColor }} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    {ui.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-200">
                    {ui.subtitle}
                  </p>
                </div>
              </div>

              {/* form */}
              <div className="relative mt-6 space-y-4">
                <Field
                  label="First Name"
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="First name"
                  autoComplete="given-name"
                  focusRing={focusRing}
                  darkFieldBg={darkFieldBg}
                />

                <Field
                  label="Last Name"
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Last name"
                  autoComplete="family-name"
                  focusRing={focusRing}
                  darkFieldBg={darkFieldBg}
                />

                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={[
                      "w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm shadow-sm outline-none",
                      "bg-white/80 dark:text-slate-100",
                      "focus:ring-2 focus:border-transparent",
                      "dark:border-slate-800/70",
                      darkFieldBg,
                      focusRing,
                    ].join(" ")}
                    placeholder={
                      role === "student"
                        ? "u6555555@au.edu or yourname@gmail.com"
                        : "lecturer@university.edu"
                    }
                    inputMode="email"
                    autoComplete="email"
                  />

                  {role === "student" ? (
                    derivedId ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                        Detected AU email — Student ID will be{" "}
                        <span className="font-semibold">{derivedId}</span>.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                        If you use a personal email, please enter your Student ID below.
                      </p>
                    )
                  ) : null}
                </div>

                {role === "student" ? (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Student ID
                    </label>
                    <input
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className={[
                        "w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm shadow-sm outline-none",
                        "bg-white/80 dark:text-slate-100",
                        "focus:ring-2 focus:border-transparent",
                        "dark:border-slate-800/70",
                        "disabled:opacity-70 disabled:cursor-not-allowed",
                        darkFieldBg,
                        focusRing,
                      ].join(" ")}
                      placeholder="6555555"
                      inputMode="numeric"
                      disabled={!!derivedId}
                      autoComplete="off"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={[
                      "w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm shadow-sm outline-none",
                      "bg-white/80 dark:text-slate-100",
                      "focus:ring-2 focus:border-transparent",
                      "dark:border-slate-800/70",
                      darkFieldBg,
                      focusRing,
                    ].join(" ")}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                <GradientButton onClick={handleRegister} type="button">
                  {submitting
                    ? "Creating..."
                    : role === "lecturer"
                      ? "Create Lecturer Account"
                      : "Create Student Account"}
                </GradientButton>

                <div className="text-center text-sm text-slate-600 dark:text-slate-300">
                  Already have an account?{" "}
                  <Link
                    href={`/login?role=${role}&next=${encodeURIComponent(
                      role === "lecturer" ? "/dashboard" : "/join"
                    )}`}
                    className="hover:underline hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
                  >
                    Login
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {role === "student" ? (
            <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-300">
              Using AU email like u6555555@au.edu will auto-derive Student ID = 6555555.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  focusRing,
  darkFieldBg,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  focusRing: string;
  darkFieldBg: string;
}) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-xl border border-slate-200/80 px-3 py-2.5 text-sm shadow-sm outline-none",
          "bg-white/80 dark:text-slate-100",
          "focus:ring-2 focus:border-transparent",
          "dark:border-slate-800/70",
          darkFieldBg,
          focusRing,
        ].join(" ")}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}
