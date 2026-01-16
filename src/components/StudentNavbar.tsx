"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import localFont from "next/font/local";
import { botttsUrl } from "@/src/lib/dicebear";


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

  if (!mounted) return null;

  return (
    <nav className="w-full bg-gradient-to-r from-[#0593D1] to-[#034B6B] text-white py-4 px-6 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left */}
        <Link href="/me">
          <h1
          className={`${caesar.className} text-3xl tracking-wide cursor-pointer`}
        >
          GAMORAX
        </h1>
        </Link>

        {/* Middle: Join button only */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/join")}
            className="px-5 py-2 rounded-md text-sm font-semibold bg-white/15 hover:bg-white/25 border border-white/20"
            type="button"
          >
            Join
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link href="/me/reports" className="text-sm hover:underline">
            Reports
          </Link>

          <div className="flex items-center gap-2">
            <div className="text-xs hidden md:block text-white/90">
              <span className="font-semibold">Points:</span> {me?.points ?? 0}
            </div>

            {/* Avatar only -> Profile */}
            <Link
              href="/me/profile"
              className="w-9 h-9 rounded-full overflow-hidden border border-white/25 bg-white/10"
              aria-label="Go to profile"
            >
              <img
                    src={botttsUrl(me?.avatarSeed || me?.email || "student", 96)}
                    alt="avatar"
                    className="w-9 h-9 rounded-full border"
                    />

            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
