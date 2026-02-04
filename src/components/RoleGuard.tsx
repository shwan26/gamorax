"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

type Role = "lecturer" | "student";

export default function RoleGuard({
  requiredRole,
  children,
}: {
  requiredRole: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  const loginHref = useMemo(() => {
    const next = pathname || (requiredRole === "lecturer" ? "/dashboard" : "/me");
    return `/login?role=${requiredRole}&next=${encodeURIComponent(next)}`;
  }, [pathname, requiredRole]);

  const PUBLIC_PATHS = useMemo(
    () => ["/login", "/register", "/forgot-password", "/auth/forgot-password"],
    []
  );

  useEffect(() => {
    let cancelled = false;

    if (pathname && PUBLIC_PATHS.includes(pathname)) {
      setOk(true);
      return;
    }

    (async () => {
      setOk(false);

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace(loginHref);
        return;
      }

      const { data: p, error } = await supabase
        .from("my_profile_api")
        .select("role")
        .single();

      if (error || !p || p.role !== requiredRole) {
        await supabase.auth.signOut();
        router.replace(loginHref);
        return;
      }

      if (!cancelled) setOk(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname, loginHref, PUBLIC_PATHS, requiredRole]);

  if (!ok) return null;
  return <>{children}</>;
}
