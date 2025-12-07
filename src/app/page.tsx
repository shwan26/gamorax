// app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "../components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

      <div className="flex flex-col items-center justify-center mt-20">

        <h2 className="text-3xl font-bold text-[#034B6B] text-center">
          Empower Learning Through Play
        </h2>

        <p className="text-gray-600 mt-2 mb-10 max-w-md text-center">
          Create and join real-time interactive quizzes designed to make learning fun and engaging.
        </p>
        <div className="flex gap-10">

          {/* Lecturer Button */}
          <Link
            href="/login"
            className="flex items-center gap-4 bg-[#0593D1] hover:bg-[#034B6B] transition-all text-white px-10 py-6 rounded-xl shadow-lg border border-blue-200 hover:scale-105"
          >
            <Image
              src="/icons/lecturer.png"
              width={50}
              height={50}
              alt="Lecturer"
            />
            <span className="text-xl font-semibold">Lecturer</span>
          </Link>

          {/* Student Button */}
          <Link
            href="/join"
            className="flex items-center gap-4 bg-[#8ACFF0] hover:bg-[#60a5fa] transition-all text-[#0f172a] px-10 py-6 rounded-xl shadow-lg border border-blue-100 hover:scale-105"
          >
            <Image
              src="/icons/student.png"
              width={50}
              height={50}
              alt="Student"
            />
            <span className="text-xl font-semibold">Student</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
