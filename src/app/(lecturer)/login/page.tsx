"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useEffect, useState } from "react";
import GradientButton from "@/src/components/GradientButton";
import { fakeLogin } from "@/src/lib/fakeAuth";
import { useRouter } from "next/navigation";


export default function LecturerLogin() {
  const router = useRouter();

  // ✅ ADD HERE (top-level state)
  const [next, setNext] = useState("/dashboard");

  // ✅ ADD HERE (after state declarations)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setNext(sp.get("next") || "/dashboard");
  }, []);

  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin() {
    try {
      fakeLogin(form.email, form.password);
      router.push(next); 
    } catch (err: any) {
      alert(err.message);
    }
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
            <Link href="/forgot-password" className="hover:underline">
              Forgot Password
            </Link>
            <Link href="/register" className="hover:underline">
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
