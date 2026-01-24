"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/Navbar";
import { loginStudent } from "@/src/lib/studentAuthStorage";
import Link from "next/link";
import GradientButton from "@/src/components/GradientButton";
import { ArrowLeft, UserRound } from "lucide-react";

function getNextFromUrl(): string {
  if (typeof window === "undefined") return "/me/reports";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("next") || "/me/reports";
}

export default function StudentLoginClient() {
  const router = useRouter();

  const [next, setNext] = useState("/me/reports");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setNext(getNextFromUrl());
  }, []);

  function onLogin() {
    if (!email.trim() || !password) {
      alert("Enter email and password.");
      return;
    }
    try {
      loginStudent(email, password);
      router.push(next);
    } catch (e: any) {
      alert(e?.message ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          {/* back */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* card */}
          <div
            className="
              mt-4 overflow-hidden rounded-3xl p-[1px]
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              shadow-[0_12px_30px_rgba(37,99,235,0.10)]
              dark:shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_18px_50px_rgba(56,189,248,0.10)]
            "
          >
            <div
              className="
                relative rounded-3xl bg-white/80 p-6 backdrop-blur sm:p-7
                border border-slate-200/60
                dark:border-slate-800/70 dark:bg-slate-950/70
              "
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
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/70">
                  <UserRound className="h-6 w-6 text-[#020024] dark:text-[#00D4FF]" />
                </div>

                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    Student Login
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Login to join sessions and view your reports.
                  </p>
                </div>
              </div>

              {/* form */}
              <div className="relative mt-6 space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Email
                  </label>
                  <input
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="u6555555@au.edu or your email"
                    inputMode="email"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onLogin();
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <input
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onLogin();
                    }}
                  />
                </div>

                <GradientButton onClick={onLogin} type="button">
                  Login
                </GradientButton>

                <div className="flex items-center justify-between pt-1 text-sm">
                  <Link
                    href="/auth/forgot-password"
                    className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Forgot Password
                  </Link>
                  <Link
                    href="/auth/register"
                    className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Tip: If you don’t have an account, create one first.
          </p>
        </div>
      </main>
    </div>
  );
}
