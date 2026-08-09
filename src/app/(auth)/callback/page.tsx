"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const next = sp.get("next") || "/login";
        const role = sp.get("role");

        // createBrowserClient exchanges the PKCE code automatically.
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          if (error) console.error("Auth callback error:", error.message);
          router.replace("/login?error=auth_callback_failed");
          return;
        }

        if (next === "/reset-password") {
          router.replace("/reset-password");
          return;
        }

        if (role === "student" || role === "lecturer") {
          router.replace(`/login?role=${role}`);
          return;
        }

        router.replace("/login");
      } catch (e: unknown) {
        console.error("unexpected callback error:", e);
        const message = e instanceof Error ? e.message : "unexpected_callback_error";
        router.replace(
          `/login?error=${encodeURIComponent(message)}`
        );
      }
    })();
  }, [router]);

  return <div className="p-6">Confirming…</div>;
}
