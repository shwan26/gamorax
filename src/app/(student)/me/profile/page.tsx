"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StudentNavbar from "@/src/components/StudentNavbar";
import {
  getCurrentStudent,
  logoutStudent,
  updateCurrentStudent,
  deriveStudentIdFromEmail,
} from "@/src/lib/studentAuthStorage";
import { botttsUrl, randomSeed } from "@/src/lib/dicebear";
import { deleteCurrentStudent } from "@/src/lib/studentAuthStorage";
import { deleteAttemptsByStudent } from "@/src/lib/studentReportStorage";
import { clearLiveStudent } from "@/src/lib/liveStudentSession"; // optional

export default function MeProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<ReturnType<typeof getCurrentStudent>>(null);

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [avatarSeed, setAvatarSeed] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    const cur = getCurrentStudent();
    if (!cur) {
      router.push("/auth/login");
      return;
    }
    setMe(cur);
    setName(cur.name || "");
    setStudentId(cur.studentId || "");
    setAvatarSeed(cur.avatarSeed || cur.email || "student");
  }, [router]);

  const autoId = useMemo(() => (me ? deriveStudentIdFromEmail(me.email) : ""), [me]);

  const avatarUrl = useMemo(() => {
    const seed = avatarSeed?.trim() || me?.email || "student";
    return botttsUrl(seed, 96);
  }, [avatarSeed, me?.email]);

  if (!mounted) return null;
  if (!me) return null;

  function onSave() {
    const n = name.trim();
    const sid = studentId.trim() || autoId;
    const seed = avatarSeed.trim() || me?.email || "student";

    if (!n) return alert("Name is required.");
    if (!sid) return alert("Student ID is required (or use AU email).");

    const next = updateCurrentStudent({
      name: n,
      studentId: sid,
      avatarSeed: seed,
    });

    setMe(next);
    alert("Profile updated");
    router.push("/me");
  }

  function onLogout() {
    logoutStudent();
    router.push("/auth/login");
  }

  function onDeleteAccount() {
    if (!me) return;

    const ok = confirm(
      "Delete your account?\n\nThis will remove:\n- Your account\n- All report history\n- Your points\n\nThis cannot be undone."
    );
    if (!ok) return;

    // 1) delete reports
    deleteAttemptsByStudent(me.email);

    // 2) clear live session cached student (optional but nice)
    try { clearLiveStudent(); } catch {}

    // 3) delete account (includes logout)
    deleteCurrentStudent();

    router.push("/auth/register");
  }


  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <StudentNavbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h1 className="text-xl font-extrabold text-[#034B6B]">My Profile</h1>
          <p className="text-xs text-gray-600 mt-1">
            Email is your login. Student ID can be auto-derived from AU email.
          </p>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* left: avatar */}
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border bg-white">
                  <img src={avatarUrl} alt="avatar" className="w-16 h-16" />
                </div>

                <div className="text-sm">
                  <div className="font-semibold">{me.email}</div>
                  <div className="text-xs text-gray-600">
                    Points: <span className="font-semibold">{me.points ?? 0}</span>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarSeed(randomSeed())}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border bg-white hover:bg-gray-50"
                    >
                      Random
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarSeed(me.email || "student")}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border bg-white hover:bg-gray-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* right: info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={me.email}
                  disabled
                  className="w-full border rounded-md px-3 py-2 bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Student ID</label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder={autoId ? `Auto: ${autoId}` : "Enter your student ID"}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
                {autoId && (
                  <div className="text-xs text-gray-600 mt-1">
                    Auto from email: <span className="font-semibold">{autoId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onSave}
              className="bg-[#3B8ED6] hover:bg-[#2F79B8] text-white px-5 py-2 rounded-md font-semibold"
              type="button"
            >
              Save
            </button>

            <button
              onClick={() => router.push("/me")}
              className="border bg-white px-5 py-2 rounded-md font-semibold"
              type="button"
            >
              Cancel
            </button>

            <div className="flex-1" />

            <button
              onClick={onLogout}
              className="text-black-600 font-semibold"
              type="button"
            >
              Logout
            </button>

            <button
              onClick={onDeleteAccount}
              className="text-red-700"
              type="button"
            >
              Delete Account
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
