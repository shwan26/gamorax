// src/app/(lecturer)/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // If this runs in a context where cookies are readonly, ignore.
          }
        },
      },
    }
  );

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
