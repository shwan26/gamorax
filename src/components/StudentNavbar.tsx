"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import localFont from "next/font/local";
import { botttsUrl } from "@/src/lib/dicebear";
import { Plus, FileText } from "lucide-react";

const caesar = localFont({
  src: "../../public/fonts/CaesarDressing-Regular.ttf",
});

export default function StudentNavbar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<ReturnType<typeof getCurrentStudent>>(null);

  useEffect(() => {
    setMounted(true);
    setMe(getCurrentStudent());
  }, []);

  // keep avatar stable (avoid recompute)
  const avatarSrc = useMemo(() => {
    const seed = me?.avatarSeed || me?.email || "student";
    return botttsUrl(seed, 96);
  }, [me?.avatarSeed, me?.email]);

  if (!mounted) return null;

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-slate-200/60 bg-white/70 backdrop-blur
        dark:border-slate-800/60 dark:bg-slate-950/55
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Left: Logo */}
        <Link href="/me" className="group inline-flex items-center gap-2">
          <h1 className={`${caesar.className} text-3xl tracking-wide leading-none`}>
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#93C5FD]">
              GAMORAX
            </span>
          </h1>
        </Link>

        {/* Right: actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Join */}
          <button
            onClick={() => router.push("/join")}
            type="button"
            className="
              inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white
              shadow-[0_10px_25px_rgba(37,99,235,0.18)]
              hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)]
              transition-all
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
            "
          >
            <Plus className="h-4 w-4" />
            Join
          </button>

          

          {/* Points chip */}
          <div
            className="
              hidden md:inline-flex items-center rounded-2xl
               bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm
              dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200
            "
            title="Total points"
          >
            Points:&nbsp;<span className="text-slate-900 dark:text-slate-50">{me?.points ?? 0}</span>
          </div>

          {/* Avatar -> Profile */}
          <Link
            href="/me/profile"
            className="
              relative inline-flex h-10 w-10 items-center justify-center rounded-full overflow-hidden
              border border-slate-200/80 bg-white/70 shadow-sm
              hover:bg-white transition-colors
              dark:border-slate-800/70 dark:bg-slate-950/55 dark:hover:bg-slate-950/80
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
            "
            aria-label="Go to profile"
          >
            <img src={avatarSrc} alt="avatar" className="h-10 w-10" />
          </Link>
        </div>
      </div>
    </header>
  );
}
