"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { supabase } from "@/src/lib/supabaseClient";
import { LogOut, Trash2, UserRound } from "lucide-react";
import GradientButton from "@/src/components/GradientButton";

function Skel({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-slate-200/80",
        "dark:bg-slate-800/70",
        className,
      ].join(" ")}
    />
  );
}
function LecturerProfileSkeleton() {
  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:pt-12 sm:pb-16">
        {/* header skeleton */}
        <div className="text-center">
          <Skel className="mx-auto h-10 w-40 rounded-2xl" />
          <Skel className="mx-auto mt-4 h-4 w-72" />
        </div>

        {/* card skeleton */}
        <div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-8 dark:border-slate-800/70 dark:bg-slate-950/55">
          <div className="relative">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* avatar */}
              <div className="rounded-3xl bg-white/90 p-2 dark:bg-slate-950/75">
                <Skel className="h-16 w-16 rounded-2xl" />
              </div>

              {/* name/email */}
              <div className="min-w-0 flex-1 space-y-2">
                <Skel className="h-5 w-48" />
                <Skel className="h-4 w-64" />
              </div>
            </div>

            {/* fields */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skel className="h-4 w-24 rounded-lg" />
                <Skel className="h-11 w-full rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Skel className="h-4 w-24 rounded-lg" />
                <Skel className="h-11 w-full rounded-2xl" />
              </div>
            </div>

            {/* buttons */}
            <div className="mt-6 space-y-3">
              <Skel className="h-12 w-full rounded-3xl" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skel className="h-12 w-full rounded-3xl" />
                <Skel className="h-12 w-full rounded-3xl" />
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-10 flex justify-center">
          <Skel className="h-4 w-40" />
        </div>
      </main>
    </div>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5
          text-slate-900 shadow-sm outline-none backdrop-blur
          placeholder:text-slate-400
          focus:ring-2 focus:ring-[#00D4FF]/40
          dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500
        "
      />
    </div>
  );
}

type Profile = {
  id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
};

export default function LecturerProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      // ✅ must be logged in
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (!u.user || uErr) {
        router.replace(`/login?next=${encodeURIComponent("/profile")}`);
        return;
      }

      if (!alive) return;
      setEmail(u.user.email ?? "");

      // ✅ load profile (NO email here)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name")
        .single();

      if (!alive) return;

      if (error) {
        console.error(error);
        alert("Load profile failed: " + error.message);
        setLoading(false);
        return;
      }

      // ✅ must be lecturer
      if (data?.role !== "lecturer") {
        await supabase.auth.signOut();
        router.replace(`/login?next=${encodeURIComponent("/dashboard")}`);
        return;
      }

      setProfile(data as Profile);
      setFirstName((data?.first_name ?? "").toString());
      setLastName((data?.last_name ?? "").toString());
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const initials = useMemo(() => {
    const a = (firstName || "").trim().charAt(0) || "L";
    const b = (lastName || "").trim().charAt(0) || "";
    return (a + b).toUpperCase();
  }, [firstName, lastName]);

  async function handleSave() {
    if (!profile?.id) return;

    try {
      setSaving(true);

      // ✅ IMPORTANT: my_profile_api is likely a VIEW (not writable)
      // Update the real table that stores these fields (you must set the correct table name)
      const { error } = await supabase
        .from("profiles") // <-- CHANGE THIS to your real table (e.g. "profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      alert("✅ Profile updated");
    } catch (err: any) {
      alert(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    const ok = confirm(
      "Delete your account?\n\nThis will permanently delete your account and profile data."
    );
    if (!ok) return;

    try {
      setDeleting(true);

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not logged in");

      const res = await fetch("/api/lecturer/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.user.id }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error || "Delete failed");

      await supabase.auth.signOut();
      router.replace("/register");
    } catch (err: any) {
      alert(err?.message ?? "Delete failed");
    } finally {
      setDeleting(false);
    }
  }


  if (loading) return <LecturerProfileSkeleton />;


  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:pt-12 sm:pb-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-[#020024] to-[#00D4FF] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#7C3AED]">
              Profile
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Manage your lecturer profile.
          </p>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-8 dark:border-slate-800/70 dark:bg-slate-950/55">
          <div className="relative">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="rounded-3xl bg-white/90 p-2 dark:bg-slate-950/75">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-sm dark:bg-slate-950/60 dark:text-slate-50"
                  aria-label="Avatar"
                >
                  {initials.trim() ? (
                    <span className="text-xl font-bold">{initials}</span>
                  ) : (
                    <UserRound className="h-6 w-6" />
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Lecturer"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="First Name" value={firstName} onChange={setFirstName} />
              <Field label="Last Name" value={lastName} onChange={setLastName} />
            </div>

            <div className="mt-6 space-y-3">
              <GradientButton onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </GradientButton>

              <div className="grid gap-3 sm:grid-cols-2">
                <GradientButton
                  variant="ghost"
                  onClick={handleLogout}
                  iconLeft={<LogOut className="h-4 w-4" />}
                >
                  Logout
                </GradientButton>

                <GradientButton
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  iconLeft={<Trash2 className="h-4 w-4" />}
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </GradientButton>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} GAMORAX
        </footer>
      </main>
    </div>
  );
}
