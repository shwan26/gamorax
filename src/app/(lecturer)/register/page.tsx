"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { fakeRegister } from "@/src/lib/fakeAuth";
import { useRouter } from "next/navigation";


export default function LecturerRegister() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  const router = useRouter();

  async function handleRegister() {
    try {
      fakeRegister(form);
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.message);
    }
  }


  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-16 px-4">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Create Account as Lecturer
        </h2>

        {/* Register Form */}
        <div className="w-full max-w-lg space-y-5">

          {/* First Name */}
          <div>
            <label className="block mb-1 text-sm font-medium">First Name</label>
            <input
              name="firstName"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block mb-1 text-sm font-medium">Last Name</label>
            <input
              name="lastName"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

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

          {/* Register Button */}
          <GradientButton onClick={handleRegister} type="button">
            Register
          </GradientButton>

          {/* Link to Login */}
          <div className="text-center text-sm text-gray-600 mt-1">
            <Link href="/login" className="hover:underline">
              Already have an account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
