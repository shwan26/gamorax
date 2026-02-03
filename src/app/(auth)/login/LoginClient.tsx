"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { supabase } from "@/src/lib/supabaseClient";
import { ArrowLeft, GraduationCap, UserRound } from "lucide-react";

type Role = "lecturer" | "student";

function getDefaultNext(role: Role) {
  return role === "lecturer" ? "/dashboard" : "/me";
}

export default function LoginPage() {
  const router = useRouter();
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

  // ✅ KEY FIX (same as register)
  const cardSurface = "bg-white/85 dark:bg-slate-950/70 backdrop-blur";

  const iconChip = "border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-slate-950/70";

  const darkFieldBg = "dark:bg-slate-950/60";

  const ui = useMemo(() => {
    if (role === "student") {
      return {
        title: "Student Login",
        subtitle: "Login to join sessions and view your reports.",
        Icon: UserRound,
      };
    }
    return {
      title: "Login as Lecturer",
      subtitle: "Enter your credentials to continue.",
      Icon: GraduationCap,
    };
  }, [role]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) router.replace(nextUrl);
    })();
    return () => {
      alive = false;
    };
  }, [router, nextUrl]);

  async function onLogin() {
    if (submitting) return;
    setSubmitting(true);

    try {
      const e = email.trim().toLowerCase();
      const pw = password;
      if (!e || !pw) throw new Error("Email and password required");

      const { error: e1 } = await supabase.auth.signInWithPassword({
        email: e,
        password: pw,
      });
      if (e1) throw e1;

      const { data: profile, error: e2 } = await supabase
        .from("my_profile_api")
        .select("role")
        .single();
      if (e2) throw e2;

      if (profile?.role !== role) {
        await supabase.auth.signOut();
        throw new Error(`This account is not a ${role}.`);
      }

      router.replace(nextUrl);
    } catch (err: any) {
      alert(err?.message ?? "Login failed");
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

              <div className="relative mt-6 space-y-4">
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
                    onKeyDown={(e) => e.key === "Enter" && onLogin()}
                  />
                </div>

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
                    onKeyDown={(e) => e.key === "Enter" && onLogin()}
                  />
                </div>

                <GradientButton onClick={onLogin} type="button">
                  {submitting ? "Logging in..." : "Login"}
                </GradientButton>

                <div className="flex items-center justify-between pt-1 text-sm">
                  <Link
                    href={`/forgot-password?role=${role}`}
                    className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Forgot Password
                  </Link>

                  <Link
                    href={`/register?role=${role}&next=${encodeURIComponent(
                      `/login?role=${role}`
                    )}`}
                    className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
