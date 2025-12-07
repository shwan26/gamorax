"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import GradientButton from "@/src/components/GradientButton";

export default function StudentJoin() {
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (!code) return;
    window.location.href = `/student/name?pin=${code}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-12 md:mt-20 px-4">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">
          Join GamoRaX
        </h2>

        {/* Form Card */}
        <div className="w-full max-w-sm space-y-4">

          {/* Code Input */}
          <div>
            <label className="block mb-1 text-sm font-medium">Enter Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full border rounded-md p-2 shadow-sm 
                         focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
            />
          </div>

          {/* Join Button */}
          <GradientButton onClick={handleJoin} type="submit">
            Join
          </GradientButton>

          {/* Link to Lecturer */}
          <div className="text-center text-xs md:text-sm text-gray-600">
            <Link href="/login" className="hover:underline">
              Join as Lecturer
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
