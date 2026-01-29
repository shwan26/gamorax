"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { supabase } from "@/src/lib/supabaseClient";

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

  async function handleRegister() {
    try {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      if (!firstName || !lastName || !email || !password) {
        alert("Please fill in all fields.");
        return;
      }

      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            role: "lecturer",
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      alert("✅ Register success! Please check your email and confirm your account, then login.");
      // IMPORTANT: user is NOT logged in yet when email confirm is ON
      // So we just send them to login.
      window.location.href = "/login";
    } catch (err: any) {
      alert(err?.message ?? "Register failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-16 px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          Create Account as Lecturer
        </h2>

        <div className="w-full max-w-lg space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium">First Name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Last Name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <GradientButton onClick={handleRegister} type="button">
            Register
          </GradientButton>

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
