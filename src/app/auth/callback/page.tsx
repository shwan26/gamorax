"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Supabase may send ?code=... (PKCE flow)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // Even if exchange fails, user can still login manually after confirming
        if (error) console.error("exchangeCodeForSession error:", error.message);
      }

      router.replace("/login");
    })();
  }, [router]);

  return <div className="p-6">Confirming…</div>;
}
