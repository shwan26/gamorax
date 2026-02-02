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

  // ✅ Different login routes for lecturer vs student
  const loginPath = requiredRole === "lecturer" ? "/login" : "/auth/login";
  const registerPath = requiredRole === "lecturer" ? "/register" : "/auth/register";

  // ✅ Public pages we must allow inside guarded layouts (avoids redirect loop)
  const PUBLIC_PATHS = useMemo(() => {
    const common = requiredRole === "lecturer" ? ["/forgot-password"] : ["/auth/forgot-password"];
    return requiredRole === "lecturer"
      ? [loginPath, registerPath, ...common]
      : [loginPath, registerPath, ...common];
  }, [requiredRole, loginPath, registerPath]);

  useEffect(() => {
    let cancelled = false;

    // ✅ allow public routes
    if (pathname && PUBLIC_PATHS.includes(pathname)) {
      setOk(true);
      return;
    }

    (async () => {
      setOk(false);

      // 1) must be logged in
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace(`${loginPath}?next=${encodeURIComponent(pathname || "/")}`);
        return;
      }

      // 2) must have correct role
      const { data: p, error } = await supabase
        .from("my_profile_api")
        .select("role")
        .single();

      if (error || !p || p.role !== requiredRole) {
        await supabase.auth.signOut();
        router.replace(`${loginPath}?next=${encodeURIComponent(pathname || "/")}`);
        return;
      }

      if (!cancelled) setOk(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname, requiredRole, loginPath, PUBLIC_PATHS]);

  if (!ok) return null;
  return <>{children}</>;
}
