"use client";

import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";

export default function LecturerDashboard() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        {/* Search */}
        <div className="flex justify-end mb-6">
          <input
            type="text"
            placeholder="Search"
            className="border px-4 py-2 rounded-md w-60"
          />
        </div>

        <div className="flex gap-6">
          <Link
            href="/game/create"
            className="bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                       px-10 py-10 rounded-xl shadow-md hover:scale-105
                       transition flex items-center gap-4"
          >
            <span className="text-3xl font-bold">＋</span>
            <span className="text-lg">Create new game</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
