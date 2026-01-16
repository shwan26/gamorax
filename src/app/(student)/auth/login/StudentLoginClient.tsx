"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/Navbar";
import { loginStudent } from "@/src/lib/studentAuthStorage";

function getNextFromUrl(): string {
  if (typeof window === "undefined") return "/me/reports";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("next") || "/me/reports";
}

export default function StudentLoginClient() {
  const router = useRouter();

  const [next, setNext] = useState("/me/reports");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setNext(getNextFromUrl());
  }, []);

  function onLogin() {
    if (!email.trim() || !password) {
      alert("Enter email and password.");
      return;
    }
    try {
      loginStudent(email, password);
      router.push(next);
    } catch (e: any) {
      alert(e?.message ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4">Student Login</h1>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full border rounded-md p-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full border rounded-md p-2 mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={onLogin}
          className="w-full py-2 rounded-md text-white font-semibold bg-[#3B8ED6] hover:bg-[#2F79B8]"
          type="button"
        >
          Login
        </button>
      </div>
    </div>
  );
}
