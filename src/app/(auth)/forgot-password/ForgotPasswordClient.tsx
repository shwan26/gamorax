"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { supabase } from "@/src/lib/supabaseClient";

import { ArrowLeft, GraduationCap, UserRound } from "lucide-react";

type Role = "lecturer" | "student";

function getDefaultNext(role: Role) {
  return role === "lecturer" ? "/dashboard" : "/me";
}

export default function ForgotPasswordPage() {
  const sp = useSearchParams();

  const r = sp.get("role");
  const role: Role = r === "student" ? "student" : "lecturer";
  const nextUrl = sp.get("next") || getDefaultNext(role);

  const STUDENT_BORDER =
    "linear-gradient(90deg, #A7F3FF 0%, #38BDF8 55%, #00D4FF 100%)";
  const LECTURER_BORDER =
    "linear-gradient(90deg, #050057 0%, #1D4ED8 60%, #00D4FF 100%)";

  const borderBg = role === "student" ? STUDENT_BORDER : LECTURER_BORDER;

  const focusRing =
    role === "student" ? "focus:ring-[#00D4FF]/55" : "focus:ring-[#1D4ED8]/45";

  const iconColor = "#00D4FF";

  const cardSurface = "bg-white/85 dark:bg-slate-950/70 backdrop-blur";
  const iconChip =
    "border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-slate-950/70";
  const darkFieldBg = "dark:bg-slate-950/60";

  const ui = useMemo(() => {
    if (role === "student") {
      return {
        title: "Student Forgot Password",
        subtitle: "Enter your email to receive reset instructions.",
        Icon: UserRound,
      };
    }
    return {
      title: "Lecturer Forgot Password",
      subtitle: "Enter your email to receive reset instructions.",
      Icon: GraduationCap,
    };
  }, [role]);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;

    const e = email.trim().toLowerCase();
    if (!e) {
      alert("Please enter your email.");
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password?role=${role}`;
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,
      });
      if (error) throw error;

      setSent(true);
    } catch (err: any) {
      alert(err?.message ?? "Failed to send reset email");
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/login?role=${role}&next=${encodeURIComponent(nextUrl)}`;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          <Link
            href={loginHref}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

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
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />

              {/* header (icon changed to role icon, like login) */}
              <div className="relative flex items-center gap-3">
                <div
                  className={[
                    "rounded-2xl border p-3 shadow-sm",
                    iconChip,
                  ].join(" ")}
                >
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

              {/* body */}
              <div className="relative mt-6 space-y-4">
                {!sent ? (
                  <>
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
                            ? "u6555555@au.edu or your email"
                            : "name@university.edu"
                        }
                        inputMode="email"
                        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                      />
                    </div>

                    <GradientButton
                      onClick={onSubmit}
                      type="button"
                      disabled={submitting}
                    >
                      {submitting ? "Sending..." : "Send Reset Link"}
                    </GradientButton>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200">
                    <p className="font-semibold">Check your email</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      If an account exists for{" "}
                      <span className="font-semibold">{email}</span>, you’ll
                      receive a reset link.
                    </p>

                    <div className="mt-4 flex gap-3">
                      <Link
                        href={loginHref}
                        className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-white transition-colors
                                   dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80"
                      >
                        Back to Login
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSent(false);
                          setEmail("");
                        }}
                        className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-white transition-colors
                                   dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80"
                      >
                        Send Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
                Need an account?{" "}
                <Link
                  href={`/register?role=${role}&next=${encodeURIComponent(
                    `/login?role=${role}`
                  )}`}
                  className="hover:underline hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
