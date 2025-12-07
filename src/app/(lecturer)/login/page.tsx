"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useState } from "react";

export default function LecturerLogin() {
  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e: { target: { name: any; value: any; }; }) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin() {
    // Later: API call for lecturer login
    console.log("Login clicked", form);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-16">
        <h2 className="text-2xl font-bold mb-8">Login as Lecturer</h2>

        <div className="w-[380px] space-y-4">

          {/* Email */}
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full bg-[#3B8ED6] hover:bg-[#2F79B8] transition text-white py-2 rounded-md font-semibold shadow-md"
          >
            Login
          </button>

          {/* Links */}
          <div className="flex justify-between mt-2 text-sm text-gray-600">
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
