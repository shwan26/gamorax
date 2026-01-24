"use client";

import { useState } from "react";
import Navbar from "@/src/components/Navbar";
import Link from "next/link";
import { ArrowLeft, UserRound, Info } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit() {
    if (!email.trim()) {
      alert("Please enter your email.");
      return;
    }

    // Demo behavior (no backend): just show success message
    setSent(true);
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          {/* back */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
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
                    Forgot Password
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Enter your email to receive reset instructions.
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
                        placeholder="u6555555@au.edu or your email"
                        inputMode="email"
                        className="
                          w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                          shadow-sm outline-none
                          focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                          dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                          placeholder:text-slate-400 dark:placeholder:text-slate-500
                        "
                      />
                    </div>

                    <button
                      onClick={onSubmit}
                      type="button"
                      className="
                        w-full rounded-xl px-4 py-3 font-semibold text-white shadow-sm
                        bg-gradient-to-r from-[#00D4FF] to-[#2563EB]
                        hover:opacity-95 active:scale-[0.99] transition-all
                        focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                      "
                    >
                      Send Reset Link
                    </button>

                    <div className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/60 p-3 text-xs text-slate-600 backdrop-blur
                                    dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-300">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                      <p>
                        Demo mode: this app uses localStorage, so email reset is not connected yet.
                        You can implement real reset later with a backend.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-700 backdrop-blur
                                  dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200">
                    <p className="font-semibold">Request submitted</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      If an account exists for <span className="font-semibold">{email}</span>, you’ll receive reset instructions.
                    </p>

                    <div className="mt-4 flex gap-3">
                      <Link
                        href="/auth/login"
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
                Don’t have an account?{" "}
                <Link
                  href="/auth/register"
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
