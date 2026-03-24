"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function ResetPasswordClient() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initRecoverySession() {
      try {
        // First try current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          if (mounted) setCheckingSession(false);
          return;
        }

        // Recovery links often come back with tokens in the hash
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

          if (error) {
            throw error;
          }

          // Optional: clean URL after session is set
          window.history.replaceState({}, document.title, "/reset-password");
        } else {
          // No valid recovery tokens
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
  }, []);

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
      router.replace("/login");
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

              {checkingSession ? (
                <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                  Verifying reset link...
                </p>
              ) : (
                <form onSubmit={onSubmit} className="mt-6 space-y-3">
                  <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border px-3"
                  />

                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border px-3"
                  />

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