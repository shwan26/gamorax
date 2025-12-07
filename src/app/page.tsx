"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "../components/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

      <div className="flex flex-col items-center justify-center mt-10 md:mt-20 px-4">

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-[#034B6B] text-center">
          Empower Learning Through Play
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 mt-2 mb-10 max-w-md text-center text-sm md:text-base">
          Create and join real-time interactive quizzes designed to make learning fun and engaging.
        </p>

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">

          {/* Lecturer Button */}
          <Link
            href="/login"
            className="flex items-center justify-center gap-4 bg-[#0593D1] hover:bg-[#034B6B] transition-all text-white
                       px-8 py-5 md:px-10 md:py-6 rounded-xl shadow-lg border border-blue-200 hover:scale-105"
          >
            <Image
              src="/icons/lecturer.png"
              width={40}
              height={40}
              className="md:w-[50px] md:h-[50px]"
              alt="Lecturer"
            />
            <span className="text-lg md:text-xl font-semibold">Lecturer</span>
          </Link>

          {/* Student Button */}
          <Link
            href="/join"
            className="flex items-center justify-center gap-4 bg-[#8ACFF0] hover:bg-[#60a5fa] transition-all text-[#0f172a]
                       px-8 py-5 md:px-10 md:py-6 rounded-xl shadow-lg border border-blue-100 hover:scale-105"
          >
            <Image
              src="/icons/student.png"
              width={40}
              height={40}
              className="md:w-[50px] md:h-[50px]"
              alt="Student"
            />
            <span className="text-lg md:text-xl font-semibold">Student</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
