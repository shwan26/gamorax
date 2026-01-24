"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { getCurrentLecturer, fakeLogout } from "@/src/lib/fakeAuth";
import { LogOut, Trash2, UserRound } from "lucide-react";
import GradientButton from "@/src/components/GradientButton";

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

export default function LecturerProfile() {
  const router = useRouter();
  const user = useMemo(() => getCurrentLecturer(), []);

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

    localStorage.removeItem("gamorax_lecturer");
    fakeLogout();
    router.push("/register");
  }

  const initials =
    (firstName?.trim()?.charAt(0) || "L") + (lastName?.trim()?.charAt(0) || "");

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
            Update your lecturer details for this device (mock storage).
          </p>
        </div>

        <div
          className="
            relative mt-8 overflow-hidden rounded-3xl
            border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur
            sm:p-8
            dark:border-slate-800/70 dark:bg-slate-950/55
          "
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#020024]/10 blur-3xl dark:bg-[#020024]/30" />

          <div className="relative">
            <div className="flex items-center gap-4 sm:gap-5">
              <div
                className="
                  shrink-0 rounded-3xl p-[1px]
                  bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                "
              >
                <div className="rounded-3xl bg-white/90 p-1.5 dark:bg-slate-950/75">
                  <div
                    className="
                      flex h-16 w-16 items-center justify-center rounded-2xl
                      bg-white/80 text-slate-900 shadow-sm
                      dark:bg-slate-950/60 dark:text-slate-50
                    "
                    aria-label="Avatar"
                  >
                    {initials.trim() ? (
                      <span className="text-xl font-bold">{initials}</span>
                    ) : (
                      <UserRound className="h-6 w-6" />
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : "Lecturer"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                  {user?.email ? user.email : "Signed in on this device"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="e.g. Taylor"
              />
              <Field
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="e.g. Swift"
              />
            </div>

            <div className="mt-6 space-y-3">
              <GradientButton onClick={handleSave}>Save Changes</GradientButton>

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
                  iconLeft={<Trash2 className="h-4 w-4" />}
                >
                  Delete Account
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
