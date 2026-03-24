"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

type Role = "student" | "lecturer";

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const roleParam = sp.get("role");
  const emailParam = sp.get("email");

  const role: Role = roleParam === "student" ? "student" : "lecturer";
  const email = emailParam ?? "";

  const loginHref = useMemo(() => {
    return role === "student" ? "/login?role=student" : "/login?role=lecturer";
  }, [role]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initRecoverySession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          if (mounted) setCheckingSession(false);
          return;
        }

        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : window.location.hash;

        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type === "recovery" && access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) throw error;

          const cleanUrl = `/reset-password?role=${encodeURIComponent(role)}${
            email ? `&email=${encodeURIComponent(email)}` : ""
          }`;

          window.history.replaceState({}, document.title, cleanUrl);
        } else {
          throw new Error("Invalid or expired recovery link.");
        }

        if (mounted) setCheckingSession(false);
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? "Unable to verify reset link.");
          setCheckingSession(false);
        }
      }
    }

    initRecoverySession();

    return () => {
      mounted = false;
    };
  }, [role, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password updated successfully.");

    setTimeout(() => {
      router.replace(loginHref);
    }, 1200);
  };

  return (
    <div className="min-h-screen app-surface app-bg">
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          <div className="mt-4 overflow-hidden rounded-3xl p-[1px] bg-slate-200/70 dark:bg-slate-800/70">
            <div className="rounded-3xl p-6 sm:p-7 bg-white/70 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/70">
              <h1 className="text-2xl font-semibold">Reset password</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Enter your new password below.
              </p>

              {email ? (
                <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-200">
                  <span className="font-medium">Email:</span> {email}
                </div>
              ) : null}

              {checkingSession ? (
                <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                  Verifying reset link...
                </p>
              ) : (
                <form onSubmit={onSubmit} className="mt-6 space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border px-3 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border px-3 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  {message && <p className="text-sm text-green-600">{message}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-2xl bg-black text-white disabled:opacity-60"
                  >
                    {loading ? "Updating..." : "Update password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}