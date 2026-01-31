"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import localFont from "next/font/local";

import { supabase } from "@/src/lib/supabaseClient";

type LecturerProfile = {
  id: string;
  role: "lecturer" | "student" | null;
  firstName?: string | null;
  lastName?: string | null;
};

type Lecturer = {
  firstName?: string | null;
  email?: string | null;
};

const caesar = localFont({
  src: "../../public/fonts/CaesarDressing-Regular.ttf",
});

export default function LecturerNavbar() {
  const router = useRouter();

  // start null so SSR + first client render match
  const [user, setUser] = useState<Lecturer | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const load = async () => {
      const { data, error } = await supabase.auth.getUser();
      const authUser = data?.user;

      if (error || !authUser) {
        setUser(null);
        // optional: redirect if not logged in
        router.replace("/login");
        return;
      }

      // Pull profile (role + name) via your view (RLS should allow select own)
      const { data: prof, error: pErr } = await supabase
        .from("my_profile_api")
        .select("id, role, firstName, lastName")
        .single();

      if (pErr || !prof) {
        // still show auth email initial if profile fetch fails
        setUser({ firstName: null, email: authUser.email ?? null });
        return;
      }

      // optional: if someone logs in but isn't lecturer, kick them out
      if (prof.role !== "lecturer") {
        setUser(null);
        router.replace("/login");
        return;
      }

      setUser({
        firstName: (prof as LecturerProfile).firstName ?? null,
        email: authUser.email ?? null,
      });
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // when login/logout happens, refresh user/profile
      if (!session?.user) {
        setUser(null);
        return;
      }
      load();
    });

    unsub = () => sub.subscription.unsubscribe();

    return () => {
      unsub?.();
    };
  }, [router]);

  const initial = useMemo(() => {
    if (!user) return "L";
    return (
      user.firstName?.trim()?.charAt(0) ||
      user.email?.trim()?.charAt(0) ||
      "L"
    ).toUpperCase();
  }, [user]);

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-slate-200/60 bg-white/70 backdrop-blur
        dark:border-slate-800/60 dark:bg-slate-950/55
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/dashboard" className="group inline-flex items-center gap-2">
          <h1 className={`${caesar.className} text-3xl tracking-wide leading-none`}>
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#020024] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#7C3AED]">
              GAMORAX
            </span>
          </h1>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/profile")}
            className="
              relative inline-flex h-10 w-10 items-center justify-center rounded-full
              border border-slate-200/80 bg-white/80 shadow-sm
              hover:bg-white transition-colors
              dark:border-slate-800/70 dark:bg-slate-950/55 dark:hover:bg-slate-950/80
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
            "
            aria-label="Open profile"
            type="button"
          >
            <span className="absolute inset-0 flex items-center justify-center font-semibold text-slate-900 dark:text-slate-50">
              {initial}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
