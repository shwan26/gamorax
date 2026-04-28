"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const code = sp.get("code");
        const next = sp.get("next") || "/login";
        const role = sp.get("role");

        if (!code) {
          router.replace("/login?error=missing_code");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("exchangeCodeForSession error:", error.message);

          if (next === "/reset-password") {
            router.replace("/forgot-password?error=invalid_recovery_link");
            return;
          }

          router.replace("/login?error=auth_callback_failed");
          return;
        }

        if (next === "/reset-password") {
          const email = sp.get("email");

          router.replace(
            `/reset-password?role=${role ?? "lecturer"}${
              email ? `&email=${encodeURIComponent(email)}` : ""
            }`
          );
          return;
        }

        if (role === "student" || role === "lecturer") {
          router.replace(`/login?role=${role}`);
          return;
        }

        router.replace("/login");
      } catch (e: any) {
        console.error("unexpected callback error:", e);
        router.replace(
          `/login?error=${encodeURIComponent(e?.message ?? "unexpected_callback_error")}`
        );
      }
    })();
  }, [router]);

  return <div className="p-6">Confirming…</div>;
}