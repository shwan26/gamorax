"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import {
  getCurrentStudent,
  logoutStudent, // ✅ make sure this exists in your studentAuthStorage
} from "@/src/lib/studentAuthStorage";
import { botttsUrl } from "@/src/lib/dicebear";
import { ArrowLeft, UserRound, LogOut } from "lucide-react";
import Link from "next/link";

export default function StudentJoin() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState("");

  const [me, setMe] = useState<ReturnType<typeof getCurrentStudent>>(null);

  useEffect(() => {
    setMounted(true);
    setMe(getCurrentStudent());
  }, []);

  const avatarUrl = useMemo(() => {
    const seed = me?.avatarSeed || me?.email || "student";
    return botttsUrl(seed, 96);
  }, [me?.avatarSeed, me?.email]);

  const handleJoin = () => {
    const meNow = getCurrentStudent();
    const pin = code.trim();
    if (!pin) return;

    if (!meNow) {
      router.push(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    router.push(`/join/${encodeURIComponent(pin)}`);
  };

  const handleLogout = () => {
    try {
      logoutStudent();
    } finally {
      setMe(null);
      setCode("");
      router.refresh?.();
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          {/* back link */}
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
              {/* subtle dot pattern */}
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
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    Join GamoRaX
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Enter your session PIN to continue.
                  </p>
                </div>
              </div>

              {/* avatar / status */}
              <div className="relative mt-5">
                {me ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200/80 bg-white dark:border-slate-800/70 dark:bg-slate-950/60">
                        <img src={avatarUrl} alt="avatar" className="h-11 w-11" />
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-slate-900 dark:text-slate-50">
                          {me.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {me.email}
                        </div>
                      </div>
                    </div>

                    {/* logout button (when logged in) */}
                    <button
                      onClick={handleLogout}
                      type="button"
                      className="
                        inline-flex items-center gap-2 rounded-xl
                        border border-slate-200/80 bg-white/80 px-3 py-2 text-sm
                        text-slate-700 shadow-sm hover:bg-white transition-colors
                        dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200
                        dark:hover:bg-slate-950/80
                      "
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Not logged in — you can login or create an account, or just
                    enter PIN and continue.
                  </div>
                )}
              </div>

              {/* form */}
              <div className="relative mt-6 space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Enter Code
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleJoin();
                    }}
                    placeholder="123456"
                    inputMode="numeric"
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                  />
                </div>

                <GradientButton
                  onClick={handleJoin}
                  type="button"
                  className="py-3 rounded-xl"
                >
                  Join
                </GradientButton>

                {/* auth buttons (only when NOT logged in) */}
                {!me && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => router.push("/auth/login")}
                      type="button"
                      className="
                        rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                        text-slate-700 shadow-sm hover:bg-white transition-colors
                        dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200
                        dark:hover:bg-slate-950/80
                      "
                    >
                      Login
                    </button>

                    <button
                      onClick={() => router.push("/auth/register")}
                      type="button"
                      className="
                        rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                        text-slate-700 shadow-sm hover:bg-white transition-colors
                        dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200
                        dark:hover:bg-slate-950/80
                      "
                    >
                      Create Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
