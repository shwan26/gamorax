"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentLecturer } from "@/src/lib/fakeAuth";
import localFont from "next/font/local";

const caesar = localFont({
  src: "../../public/fonts/CaesarDressing-Regular.ttf",
});

export default function LecturerNavbar() {
  const router = useRouter();
  const user = getCurrentLecturer();

  return (
    <nav className="w-full bg-gradient-to-r from-[#00D4FF] to-[#020024] text-white py-4 px-6 shadow-md flex items-center justify-between">
      
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center">
        <h1
          className={`${caesar.className} text-3xl tracking-wide cursor-pointer`}
        >
          GAMORAX
        </h1>
      </Link>

      {/* Right: User Info */}
      <div className="flex items-center gap-4">
        {/* Lecturer Name */}
        <span className="text-sm hidden md:block">
          {user?.firstName || "Lecturer"}
        </span>

        {/* Avatar */}
        <button
          onClick={() => router.push("/profile")}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold hover:opacity-90"
        >
          {user?.firstName?.charAt(0) || "L"}
        </button>
      </div>

    </nav>
  );
}
