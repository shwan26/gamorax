"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { socket } from "@/src/lib/socket";

import {
  getCurrentStudent,
  updateCurrentStudent,
} from "@/src/lib/studentAuthStorage";

import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent, writeLiveStudent } from "@/src/lib/liveStudentSession";
import { getAvatarSrc, toLiveStudent } from "@/src/lib/studentAvatar";
import { randomSeed } from "@/src/lib/dicebear";
import { deriveStudentIdFromEmail } from "@/src/lib/studentAuthStorage";

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").trim();

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // live student for socket/session (matches liveStorage type)
  const [student, setStudent] = useState<LiveStudent | null>(null);

  // editable fields (UI)
  const [meEmail, setMeEmail] = useState("");
  const [name, setName] = useState("");
  const [studentIdManual, setStudentIdManual] = useState("");

  const derivedId = useMemo(() => deriveStudentIdFromEmail(meEmail), [meEmail]);
  const canAutoDerive = Boolean(derivedId);
  const [useDerivedId, setUseDerivedId] = useState(true);

  useEffect(() => setMounted(true), []);

  // load current student + session live student
  useEffect(() => {
    if (!mounted) return;
    if (!pin) return;

    const me = getCurrentStudent();
    if (!me) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    setMeEmail(me.email ?? "");
    setName(me.name ?? "");
    setStudentIdManual(me.studentId ?? "");

    // load live student from session or make one from account
    const s = getOrCreateLiveStudent();
    if (!s) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }
    setStudent(s);

    setReady(true);
  }, [mounted, pin, router]);

  // if AU email, default to derived
  useEffect(() => {
    if (!mounted) return;
    if (canAutoDerive) setUseDerivedId(true);
  }, [mounted, canAutoDerive]);

  // keep manual synced when derived is enabled (for display)
  useEffect(() => {
    if (!mounted) return;
    if (useDerivedId && canAutoDerive) setStudentIdManual(derivedId);
  }, [mounted, useDerivedId, canAutoDerive, derivedId]);

  const effectiveStudentId = (
    useDerivedId && canAutoDerive ? derivedId : studentIdManual
  ).trim();

  const avatarSrc = useMemo(() => getAvatarSrc(student, 96), [student]);

  // ✅ join socket + redirect when lecturer starts
  useEffect(() => {
    if (!mounted || !pin || !ready || !student) return;

    socket.connect(); // ✅ connect only inside join flow

    const doJoin = () => socket.emit("join", { pin, student });

    if (socket.connected) doJoin();
    socket.on("connect", doJoin);

    const goQuestion = () => router.push(`/join/${encodeURIComponent(pin)}/question`);
    socket.on("question:show", goQuestion);

    return () => {
      socket.off("connect", doJoin);
      socket.off("question:show", goQuestion);
      // ❌ don’t disconnect here if the next live page needs the socket
    };
  }, [mounted, pin, ready, student, router]);


  // ✅ Random avatar: change avatarSeed in StudentAccount, then rebuild LiveStudent.avatarSrc
  const handleChangeAvatar = () => {
    const me = getCurrentStudent();
    if (!me) return;

    const seed = randomSeed();

    updateCurrentStudent({
      avatarSeed: seed,
      // optional but helpful: keep legacy avatarSrc consistent too
      // avatarSrc will still exist on StudentAccount type
    });

    const me2 = getCurrentStudent();
    if (!me2) return;

    const nextLive = toLiveStudent(me2, 96);
    writeLiveStudent(nextLive);
    setStudent(nextLive);

    socket.emit("join", { pin, student: nextLive });
  };

  // ✅ Save profile (name + studentId + keep current avatarSeed)
  const handleSaveProfile = () => {
    const cleanName = name.trim();
    const sid = effectiveStudentId;

    if (!cleanName) return alert("Please enter your full name.");
    if (!canAutoDerive && !sid) {
      return alert("Please enter your Student ID (or use AU email like u5400000@au.edu).");
    }

    updateCurrentStudent({
      name: cleanName,
      studentId: sid,
      // do NOT touch avatarSeed here (it’s already stored)
    });

    const me2 = getCurrentStudent();
    if (!me2) return;

    const nextLive = toLiveStudent(me2, 96);
    writeLiveStudent(nextLive);
    setStudent(nextLive);

    socket.emit("join", { pin, student: nextLive });

    alert("Profile updated.");
  };

  const handleLeave = () => {
    try {
    socket.disconnect(); // ✅ stops Railway usage when leaving live
  } catch {}
  sessionStorage.removeItem("gamorax_live_student");
  router.push("/me");
  };

  if (!mounted) return null;
  if (!pin) return <div className="p-6">Missing PIN.</div>;
  if (!ready) return <div className="p-6">Loading...</div>;
  if (!student) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-14 px-4">
        <h2 className="text-xl font-bold mb-2">Waiting for host to start…</h2>
        <p className="text-sm text-gray-600 mb-6">PIN: {pin}</p>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-white border shadow-sm overflow-hidden">
            <img src={avatarSrc} alt="Avatar" className="w-20 h-20" />
          </div>

          <button
            onClick={handleChangeAvatar}
            className="px-4 py-1 rounded-md text-xs font-semibold text-white shadow-sm
                       bg-gradient-to-r from-[#0593D1] to-[#034B6B]
                       hover:opacity-90 active:scale-[0.98] transition-all"
            type="button"
          >
            Random Avatar
          </button>
        </div>

        {/* Editable Profile */}
        <div className="w-full max-w-sm space-y-4 bg-white border rounded-xl p-4 shadow-sm">
          <div>
            <label className="block mb-1 text-xs font-medium">Student Email</label>
            <input
              value={meEmail}
              disabled
              className="w-full border rounded-md p-2 shadow-sm bg-gray-50 text-gray-600 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              AU email auto-fills Student ID (u/g + numbers).
            </p>
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block mb-1 text-xs font-medium">Student ID</label>
              {canAutoDerive && (
                <label className="flex items-center gap-2 text-[11px] text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={useDerivedId}
                    onChange={(e) => setUseDerivedId(e.target.checked)}
                  />
                  Use from AU email
                </label>
              )}
            </div>

            <input
              value={useDerivedId && canAutoDerive ? derivedId : studentIdManual}
              onChange={(e) => setStudentIdManual(e.target.value)}
              disabled={useDerivedId && canAutoDerive}
              className={`w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400 text-sm ${
                useDerivedId && canAutoDerive ? "bg-gray-50 text-gray-600" : ""
              }`}
            />
          </div>

          <GradientButton onClick={handleSaveProfile} type="button">
            Save / Update Profile
          </GradientButton>

          <button
            onClick={handleLeave}
            className="w-full border bg-white py-2 rounded-md text-sm font-semibold hover:bg-gray-50"
            type="button"
          >
            Back (Leave Lobby)
          </button>
        </div>
      </div>
    </div>
  );
}
