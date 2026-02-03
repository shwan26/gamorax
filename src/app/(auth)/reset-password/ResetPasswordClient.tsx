"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { supabase } from "@/src/lib/supabaseClient";
import { ArrowLeft, KeyRound, GraduationCap, UserRound } from "lucide-react";

type Role = "lecturer" | "student";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const role = ((sp.get("role") as Role) || "lecturer") as Role;

  const ui = useMemo(() => {
    if (role === "student") {
      return {
        title: "Set New Password (Student)",
        Icon: UserRound,
        gradient: "from-[#A7F3FF] via-[#38BDF8] to-[#00D4FF]",
      };
    }
    return {
      title: "Set New Password (Lecturer)",
      Icon: GraduationCap,
      gradient: "from-[#020024] via-[#0B3B8F] to-[#2563EB]",
    };
  }, [role]);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error(error.message);
            setReady(false);
            return;
        }
        }

        const { data } = await supabase.auth.getSession();
        setReady(!!data.session);
    })();
  }, []);



  async function onSetPassword() {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (!pw1 || pw1.length < 8) throw new Error("Password must be at least 8 characters.");
      if (pw1 !== pw2) throw new Error("Passwords do not match.");

      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      alert("✅ Password updated. Please login.");
      router.replace(`/login?role=${role}&next=${encodeURIComponent(role === "lecturer" ? "/dashboard" : "/me/reports")}`);
    } catch (err: any) {
      alert(err?.message ?? "Failed to update password");
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
            href={`/login?role=${role}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

          <div className={["mt-4 overflow-hidden rounded-3xl p-[1px] bg-gradient-to-r", ui.gradient].join(" ")}>
            <div className="relative rounded-3xl bg-white/80 p-6 backdrop-blur sm:p-7 border border-slate-200/60 dark:border-slate-800/70 dark:bg-slate-950/70">
              <div className="relative flex items-center gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/70">
                  <KeyRound className="h-6 w-6 text-[#020024] dark:text-[#00D4FF]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{ui.title}</h1>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Choose a new password to finish resetting your account.
                  </p>
                </div>
              </div>

              {!ready ? (
                <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200">
                  This reset link is not active yet. Please open the reset link from your email again.
                </div>
              ) : (
                <div className="relative mt-6 space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={pw1}
                      onChange={(e) => setPw1(e.target.value)}
                      className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  <GradientButton onClick={onSetPassword} type="button">
                    {submitting ? "Updating..." : "Update Password"}
                  </GradientButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
