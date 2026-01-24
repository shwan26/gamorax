"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useEffect, useState } from "react";
import GradientButton from "@/src/components/GradientButton";
import { fakeLogin } from "@/src/lib/fakeAuth";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function LecturerLogin() {
  const router = useRouter();

  const [next, setNext] = useState("/dashboard");
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setNext(sp.get("next") || "/dashboard");
  }, []);

  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin() {
    try {
      fakeLogin(form.email, form.password);
      router.push(next);
    } catch (err: any) {
      alert(err.message);
    }
  }

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
                relative rounded-3xl bg-white/80 p-6 backdrop-blur
                sm:p-7
                dark:bg-slate-950/70
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
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm
                                dark:border-slate-700/80 dark:bg-slate-950/70">
                  <GraduationCap className="h-6 w-6 text-[#020024] dark:text-[#00D4FF]" />
                </div>


                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    Login as Lecturer
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Enter your credentials to continue.
                  </p>
                </div>
              </div>

              {/* form */}
              <div className="relative mt-6 space-y-4">
                {/* Email */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@university.edu"
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                  />
                </div>

                {/* button */}
                <GradientButton
                  onClick={handleLogin}
                  type="submit"
                >
                  Login
                </GradientButton>

                {/* links */}
                <div className="flex items-center justify-between pt-1 text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-50"
                  >
                    Forgot Password
                  </Link>
                  <Link
                    href="/register"
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
