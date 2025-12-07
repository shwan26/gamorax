"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useState } from "react";
import GradientButton from "@/src/components/GradientButton";

export default function LecturerLogin() {
  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin() {
    console.log("Login clicked", form);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-16 px-4">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">Login as Lecturer</h2>

        {/* Form Container */}
        <div className="w-full max-w-sm space-y-4">

          {/* Email */}
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm 
                         focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm 
                         focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
            />
          </div>

          {/* Login Button */}
          <GradientButton onClick={handleLogin} type="submit">
            Login
          </GradientButton>

          {/* Links */}
          <div className="flex justify-between mt-1 text-xs md:text-sm text-gray-600">
            <Link href="/lecturer/forgot-password" className="hover:underline">
              Forgot Password
            </Link>
            <Link href="/lecturer/register" className="hover:underline">
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
