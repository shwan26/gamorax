"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

// Public pages that should NOT require lecturer auth
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export default function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // ✅ Allow public pages inside (lecturer) group
    if (
      pathname &&
      PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ) {
      setOk(true);
      return;
    }

    (async () => {
      const { data: u } = await supabase.auth.getUser();

      // Not logged in → go login
      if (!u.user) {
        router.replace(
          `/login?next=${encodeURIComponent(pathname || "/dashboard")}`
        );
        return;
      }

      // Must be lecturer
      const { data: p, error } = await supabase
        .from("my_profile_api")
        .select("role")
        .single();

      if (error || !p || p.role !== "lecturer") {
        await supabase.auth.signOut();
        router.replace(
          `/login?next=${encodeURIComponent(pathname || "/dashboard")}`
        );
        return;
      }

      setOk(true);
    })();
  }, [router, pathname]);

  if (!ok) return null;
  return <>{children}</>;
}
