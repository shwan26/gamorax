"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export function useLecturerGuard(nextPath: string = "/dashboard") {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1) must be logged in
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      // 2) must be lecturer
      const { data: p, error } = await supabase
        .from("my_profile_api")
        .select("role")
        .single();

      if (error || !p) {
        await supabase.auth.signOut();
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (p.role !== "lecturer") {
        // not lecturer → block
        await supabase.auth.signOut();
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setLoading(false);
    })();
  }, [router, nextPath]);

  return { loading };
}
