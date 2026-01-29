"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { useEffect, useState } from "react";
import GradientButton from "@/src/components/GradientButton";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function LecturerLogin() {
  const router = useRouter();
  const [next, setNext] = useState("/dashboard");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setNext(sp.get("next") || "/dashboard");
  }, []);

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin() {
    try {
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      if (!email || !password) {
        alert("Email and password required");
        return;
      }

      const { error: e1 } = await supabase.auth.signInWithPassword({ email, password });
      if (e1) throw e1;

      const { data: profile, error: e2 } = await supabase
        .from("my_profile_api")
        .select("*")
        .single();

      if (e2) throw e2;

      if (profile?.role !== "lecturer") {
        await supabase.auth.signOut();
        throw new Error("This account is not a lecturer.");
      }

      router.push(next);
    } catch (err: any) {
      alert(err?.message ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-16 px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">
          Login as Lecturer
        </h2>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              onChange={handleChange}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
            />
          </div>

          <GradientButton onClick={handleLogin} type="submit">
            Login
          </GradientButton>

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
