"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentLecturer } from "@/src/lib/fakeAuth";

export default function LecturerNavbar() {
  const router = useRouter();
  const user = getCurrentLecturer();

  return (
    <nav className="w-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 flex items-center justify-between">
      {/* Logo */}
      <Link href="/lecturer/dashboard" className="text-white font-bold text-lg">
        GAMORAX
      </Link>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Lecturer Name */}
        <span className="text-white text-sm hidden md:block">
          {user?.firstName || "Lecturer"}
        </span>

        {/* Avatar */}
        <button
          onClick={() => router.push("/lecturer/profile")}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold"
        >
          {user?.firstName?.charAt(0) || "L"}
        </button>
      </div>
    </nav>
  );
}
