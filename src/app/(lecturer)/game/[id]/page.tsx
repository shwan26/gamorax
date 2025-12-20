"use client";

import Navbar from "../../../../components/Navbar";
import Link from "next/link";

export default function GameSlotPage({ params }: any) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        <h2 className="text-2xl font-bold mb-6">CSX3001 (541) 2/2025</h2>

        <div className="flex justify-end mb-6">
          <input className="border px-4 py-2 rounded-md w-60" placeholder="Search" />
        </div>

        <Link
          href={`/game/${id}/question`}
          className="bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                       px-10 py-10 rounded-xl shadow-md hover:scale-105
                       transition flex items-center gap-4"
        >
          <span className="text-3xl">＋</span>
          <span>Create Gamorax</span>
        </Link>
      </div>
    </div>
  );
}
