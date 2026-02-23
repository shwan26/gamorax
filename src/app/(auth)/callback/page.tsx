"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

type Role = "lecturer" | "student";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // ✅ Use full URL so PKCE exchange works
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) console.error("exchangeCodeForSession error:", error.message);

        // ✅ Read role without useSearchParams (avoids Suspense build error)
        const sp = new URLSearchParams(window.location.search);
        const r = sp.get("role");
        const role: Role = r === "student" ? "student" : "lecturer";

        router.replace(`/login?role=${role}`);
      } catch (e: any) {
        console.error(e?.message ?? e);
        router.replace("/login");
      }
    })();
  }, [router]);

  return <div className="p-6">Confirming…</div>;
}