"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import { socket } from "@/src/lib/socket";

import { getCurrentStudent, updateCurrentStudent } from "@/src/lib/studentAuthStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent, writeLiveStudent } from "@/src/lib/liveStudentSession";
import { getAvatarSrc, toLiveStudent } from "@/src/lib/studentAvatar";
import { randomSeed } from "@/src/lib/dicebear";
import { deriveStudentIdFromEmail } from "@/src/lib/studentAuthStorage";

function DotPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    />
  );
}

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

  // ✅ lock editing after save (persist in session for this pin)
  const lockKey = useMemo(() => (pin ? `gamorax_lobby_locked_${pin}` : ""), [pin]);
  const [locked, setLocked] = useState(false);

  const s = socket;

  useEffect(() => setMounted(true), []);

  // load lock state
  useEffect(() => {
    if (!mounted || !pin) return;
    try {
      setLocked(sessionStorage.getItem(lockKey) === "1");
    } catch {
      setLocked(false);
    }
  }, [mounted, pin, lockKey]);

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
    const live = getOrCreateLiveStudent();
    if (!live) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }
    setStudent(live);
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

  const effectiveStudentId = (useDerivedId && canAutoDerive ? derivedId : studentIdManual).trim();
  const avatarSrc = useMemo(() => getAvatarSrc(student, 96), [student]);

  // ✅ join socket + redirect when lecturer starts
  useEffect(() => {
    if (!mounted || !pin || !ready || !student) return;

    s.connect(); // ✅ connect in lobby

    const doJoin = () => {
      const sid = effectiveStudentId || student.studentId; // must exist
      const nm = (name.trim() || student.name || "").trim();

      if (!sid || !nm) return; // don't join until we have both

      const studentToJoin = { ...student, studentId: sid, name: nm };

      // keep session in sync so refresh/reconnect keeps the id
      writeLiveStudent(studentToJoin);

      s.emit("join", { pin, student: studentToJoin });
      console.log("JOIN payload", { pin, studentToJoin });

    };


    if (s.connected) doJoin();
    s.on("connect", doJoin);

    const goQuestion = () => router.push(`/join/${encodeURIComponent(pin)}/question`);
    s.on("question:show", goQuestion);

    const onErr = (err: any) => console.error("socket connect_error:", err?.message ?? err);
    s.on("connect_error", onErr);

    return () => {
      s.off("connect", doJoin);
      s.off("question:show", goQuestion);
      s.off("connect_error", onErr);
      // ❌ don't disconnect here because question page still needs socket
    };
  }, [mounted, pin, ready, student, router, effectiveStudentId, name]);


  // ✅ Random avatar (disabled after save)
  const handleChangeAvatar = () => {
    if (locked) return;

    const me = getCurrentStudent();
    if (!me) return;

    const seed = randomSeed();

    updateCurrentStudent({ avatarSeed: seed });

    const me2 = getCurrentStudent();
    if (!me2) return;

    const nextLive = toLiveStudent(me2, 96);
    writeLiveStudent(nextLive);
    setStudent(nextLive);

    s.emit("join", { pin, student: nextLive });
  };

  // ✅ Save profile (name + studentId) then lock editing
  const handleSaveProfile = () => {
    if (locked) {
      // already saved -> go to lobby question waiting screen
      router.push(`/join/${encodeURIComponent(pin)}/question`);
      return;
    }

    const cleanName = name.trim();
    const sid = effectiveStudentId;

    if (!cleanName) return alert("Please enter your full name.");
    if (!canAutoDerive && !sid) {
      return alert("Please enter your Student ID (or use AU email like u5400000@au.edu).");
    }

    updateCurrentStudent({
      name: cleanName,
      studentId: sid,
    });

    const me2 = getCurrentStudent();
    if (!me2) return;

    const nextLive = { ...toLiveStudent(me2, 96), studentId: sid, name: cleanName };
    writeLiveStudent(nextLive);
    setStudent(nextLive);
    s.emit("join", { pin, student: nextLive });

    try {
      sessionStorage.setItem(lockKey, "1");
    } catch {}
    setLocked(true);

    // ✅ go to question page (acts like “waiting room”)
    router.push(`/join/${encodeURIComponent(pin)}/question`);
  };

  const handleLeave = () => {
    try {
      s.disconnect(); // ✅ stops Railway usage when leaving live
    } catch {}
    sessionStorage.removeItem("gamorax_live_student");
    // optional: let them edit again next time they open lobby
    try {
      if (lockKey) sessionStorage.removeItem(lockKey);
    } catch {}
    router.push("/me");
  };

  if (!mounted) return null;
  if (!pin) return <div className="p-6">Missing PIN.</div>;
  if (!ready) return <div className="p-6">Loading...</div>;
  if (!student) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-xl px-4 pb-12 pt-6 sm:pt-8">
        {/* Header */}
        <div
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <DotPattern />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

          <div className="relative flex flex-col gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Waiting for host to start…
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {/* ✅ bigger PIN */}
              <span
                className="
                  rounded-full border border-slate-200/70 bg-white/70
                  px-4 py-2 text-sm font-extrabold text-slate-900
                  dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-50
                "
              >
                PIN:{" "}
                <span className="font-mono tracking-widest text-base sm:text-lg">{pin}</span>
              </span>

              {locked ? (
                <span
                  className="
                    rounded-full border border-emerald-300/60 bg-emerald-50/70
                    px-3 py-2 text-xs font-semibold text-emerald-800
                    dark:border-emerald-700/40 dark:bg-emerald-950/25 dark:text-emerald-200
                  "
                >
                  Saved • Ready
                </span>
              ) : (
                <span
                  className="
                    rounded-full border border-[#00D4FF]/40 bg-white/70
                    px-3 py-2 text-xs font-semibold text-slate-700
                    dark:bg-slate-950/50 dark:text-slate-200
                  "
                >
                  Set your name & ID
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              You’ll be redirected automatically when the quiz starts.
            </p>
          </div>
        </div>

        {/* Avatar card */}
        <div
          className="
            relative mt-6 overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <DotPattern />
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

          <div className="relative flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
              <img src={avatarSrc} alt="Avatar" className="h-20 w-20" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Your avatar</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {locked ? "Locked after save." : "You can randomize before saving."}
              </p>
            </div>

            <button
              onClick={handleChangeAvatar}
              disabled={locked}
              className={[
                "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white",
                "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
                "shadow-[0_10px_25px_rgba(37,99,235,0.18)] hover:opacity-95 active:scale-[0.99] transition",
                "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50",
                locked ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
              type="button"
            >
              Random Avatar
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div
          className="
            relative mt-6 overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <DotPattern />

          <div className="relative space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Student Email
              </label>
              <input
                value={meEmail}
                disabled
                className="
                  w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                  shadow-sm outline-none
                  dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                  text-slate-600 dark:text-slate-300
                "
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                AU email auto-fills Student ID (u/g + numbers).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={locked}
                className={[
                  "w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none",
                  "border-slate-200/80 bg-white/80",
                  "focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent",
                  "dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100",
                  locked ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Student ID
                </label>

                {canAutoDerive && (
                  <label
                    className={[
                      "flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 select-none",
                      locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={useDerivedId}
                      onChange={(e) => setUseDerivedId(e.target.checked)}
                      disabled={locked}
                    />
                    Use from AU email
                  </label>
                )}
              </div>

              <input
                value={useDerivedId && canAutoDerive ? derivedId : studentIdManual}
                onChange={(e) => setStudentIdManual(e.target.value)}
                disabled={locked || (useDerivedId && canAutoDerive)}
                className={[
                  "w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none",
                  "border-slate-200/80 bg-white/80",
                  "focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent",
                  "dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100",
                  locked || (useDerivedId && canAutoDerive) ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={locked}
              className={[
                "w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white",
                "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
                "shadow-[0_10px_25px_rgba(37,99,235,0.18)] hover:opacity-95 active:scale-[0.99] transition",
                "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50",
                locked ? "opacity-55 cursor-not-allowed" : "",
              ].join(" ")}
              type="button"
            >
              {locked ? "Continue" : "Save & Continue"}
            </button>

            <button
              onClick={handleLeave}
              className="
                w-full rounded-full border border-slate-200/80 bg-white/70 px-6 py-3 text-sm font-semibold
                text-slate-700 shadow-sm hover:bg-white transition
                dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/70
              "
              type="button"
            >
              Back (Leave Lobby)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
