"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getCurrentLecturer, fakeLogout } from "@/src/lib/fakeAuth";
import GradientButton from "@/src/components/GradientButton";

export default function LecturerProfile() {
  const router = useRouter();
  const user = getCurrentLecturer();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");

  function handleSave() {
    localStorage.setItem(
      "gamorax_lecturer",
      JSON.stringify({
        ...user,
        firstName,
        lastName,
      })
    );
    alert("Profile updated (mock)");
  }

  function handleLogout() {
    fakeLogout();
    router.push("/login");
  }

  function handleDeleteAccount() {
    const ok = confirm(
      "Delete your lecturer account?\n\nThis will remove your account from this browser (mock)."
    );
    if (!ok) return;

    // remove account record (mock storage)
    localStorage.removeItem("gamorax_lecturer");

    // logout state
    fakeLogout();

    // go to register (or login)
    router.push("/register");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 px-4">
        <h2 className="text-2xl font-bold mb-6">Profile</h2>

        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold mb-4">
          {firstName?.charAt(0) || "L"}
        </div>

        {/* Profile Form */}
        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <GradientButton onClick={handleSave}>Save Changes</GradientButton>

          <button
            onClick={handleLogout}
            className="w-full text-red-600 text-sm mt-2 hover:underline"
            type="button"
          >
            Logout
          </button>

          {/* ✅ Delete Account */}
          <button
            onClick={handleDeleteAccount}
            className="w-full border border-red-200 bg-red-50 text-red-700 py-2 rounded-md text-sm font-semibold hover:bg-red-100"
            type="button"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
