// src/app/(lecturer)/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieLike = { name: string; value: string };

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies(); // ✅ await

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          cookieStore
            .getAll()
            .map((c: CookieLike) => ({ name: c.name, value: c.value })), // ✅ typed
        setAll: () => {},
      },
    }
  );

  // ✅ faster than getUser() (cookie-based)
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  const { data: prof, error } = await supabase
    .from("my_profile_api")
    .select("role")
    .single();

  if (error || prof?.role !== "lecturer") {
    redirect(`/login?next=${encodeURIComponent("/dashboard")}`);
  }

  return <>{children}</>;
}
