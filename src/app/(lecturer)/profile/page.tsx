"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GradientButton from "@/src/components/GradientButton";
import { supabase } from "@/src/lib/supabaseClient";
import { useLecturerGuard } from "../../../lib/useLecturerGuard";

export default function LecturerProfile() {
  const router = useRouter();

  // ✅ unified guard
  const { loading: guardLoading } = useLecturerGuard("/profile");

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // load profile only after guard finishes
  useEffect(() => {
    if (guardLoading) return;

    (async () => {
      const { data: p, error } = await supabase
        .from("my_profile_api")
        .select("firstName, lastName")
        .single();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setFirstName(p?.firstName ?? "");
      setLastName(p?.lastName ?? "");
      setLoading(false);
    })();
  }, [guardLoading]);

  async function handleSave() {
    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!fn || !ln) {
      alert("First name and last name are required.");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.replace("/login?next=/profile");
      return;
    }

    const { error } = await supabase
      .from("my_profile_api")
      .update({
        firstName: fn,
        lastName: ln,
      })
      .eq("id", u.user.id);

    if (error) return alert("Save error: " + error.message);

    alert("✅ Profile updated");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (guardLoading || loading) return null;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 px-4">
        <h2 className="text-2xl font-bold mb-6">Profile</h2>

        <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold mb-4">
          {firstName?.charAt(0) || "L"}
        </div>

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
        </div>
      </div>
    </div>
  );
}
