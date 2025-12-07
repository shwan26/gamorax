"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../../../components/Navbar";

export default function StudentJoin() {
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (!code) return;

    // later: validate code, redirect to name input page
    window.location.href = `/student/name?pin=${code}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-20">
        <h2 className="text-3xl font-bold mb-8">Join GamoRaX</h2>

        <div className="w-[350px] space-y-4">

          {/* Code Input */}
          <div>
            <label className="block mb-1 text-sm font-medium">Enter Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoin}
            className="w-full bg-gradient-to-r from-[#0593D1] to-[#034B6B] hover:opacity-90 transition text-white py-2 rounded-md font-semibold shadow-md"
          >
            Join
          </button>

          {/* Link to Lecturer */}
          <div className="text-center text-sm text-gray-600">
            <Link href="/login" className="hover:underline">
              Join as Lecturer
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
