// src/app/(student)/join/[pin]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import { socket, setSocketAccessToken } from "@/src/lib/socket";

import { getCurrentStudent, updateCurrentStudent } from "@/src/lib/studentAuthStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent, writeLiveStudent } from "@/src/lib/liveStudentSession";
import { getAvatarSrc, toLiveStudent } from "@/src/lib/studentAvatar";
import { randomSeed } from "@/src/lib/dicebear";
import { deriveStudentIdFromEmail } from "@/src/lib/studentAuthStorage";
import { joinLiveSessionSupabase, saveLiveMeta } from "@/src/lib/liveStorage";
import { supabase } from "@/src/lib/supabaseClient";

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

  type PinStatus = "checking" | "active" | "inactive" | "error";

  const [pinStatus, setPinStatus] = useState<PinStatus>("checking");
  const [liveMeta, setLiveMeta] = useState<{
    quizTitle?: string;
    courseCode?: string;
    courseName?: string;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // live student for socket/session (matches liveStorage type)
  const [student, setStudent] = useState<LiveStudent | null>(null);

  // editable fields (UI)
  const [meEmail, setMeEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentIdManual, setStudentIdManual] = useState("");

  const derivedId = useMemo(() => deriveStudentIdFromEmail(meEmail), [meEmail]);
  const canAutoDerive = Boolean(derivedId);
  const [useDerivedId, setUseDerivedId] = useState(true);

  // ✅ lock editing after save (persist in session for this pin)
  const lockKey = useMemo(() => (pin ? `gamorax_lobby_locked_${pin}` : ""), [pin]);
  const [locked, setLocked] = useState(false);

  const pinIsActive = pinStatus === "active";

  const headerTitle =
    pinStatus === "checking"
      ? "Checking PIN…"
      : pinStatus === "active"
      ? liveMeta?.quizTitle
        ? `Lobby: ${liveMeta.quizTitle}`
        : "Lobby ready"
      : pinStatus === "inactive"
      ? "No live session for this PIN"
      : "Connection error";

  const headerSubtitle =
    pinStatus === "active"
      ? `${liveMeta?.courseCode ?? ""}${liveMeta?.courseName ? " • " + liveMeta.courseName : ""}`
      : pinStatus === "inactive"
      ? "Ask your lecturer for the correct PIN, then try again."
      : pinStatus === "error"
      ? "Check your internet and try reconnecting."
      : "Please wait…";

  const s = socket;

  // ✅ Supabase access token for socket auth
  const effectiveStudentId = (useDerivedId && canAutoDerive ? derivedId : studentIdManual).trim();

  const displayName = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    return [fn, ln].filter(Boolean).join(" ").trim();
  }, [firstName, lastName]);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    if (!mounted) return;
    if (!pin) return;
    if (!ready) return;
    if (!accessToken) return;
    if (pinStatus !== "active") return;
    if (!student) return;

    (async () => {
      try {
        // IMPORTANT: join with final studentId/name (what you'll use in socket)
        const sid = (effectiveStudentId || student.studentId || "").trim();
        const nm = (displayName || student.name || "").trim();
        if (!sid || !nm) return;

        const studentToJoin = { ...student, studentId: sid, name: nm };
        writeLiveStudent(studentToJoin);

        await joinLiveSessionSupabase(pin, studentToJoin);
      } catch (e) {
        console.error("joinLiveSessionSupabase failed:", e);
      }
    })();
  }, [mounted, pin, ready, accessToken, pinStatus, student, effectiveStudentId, displayName]);



  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!alive) return;
      setAccessToken(token);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

    (async () => {
      const me = await getCurrentStudent();
      if (!me) {
        router.replace(`/login?next=${encodeURIComponent("/join/" + pin)}`);
        return;
      }

      setMeEmail(me.email ?? "");
      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
      setStudentIdManual(me.studentId ?? "");

      const live = await getOrCreateLiveStudent();
      if (!live) {
        router.replace(`/login?next=${encodeURIComponent("/join/" + pin)}`);
        return;
      }

      setStudent(live);
      setReady(true);
    })();
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

  const avatarSrc = useMemo(() => getAvatarSrc(student, 96), [student]);
  // ✅ Connect socket ONCE (with token) and keep it authenticated
  useEffect(() => {
    if (!mounted || !pin || !ready) return;
    if (!accessToken) return;

    // ✅ set token before connect
    setSocketAccessToken(accessToken);

    // clean reconnect to ensure auth handshake uses latest token
    try {
      if (s.connected) s.disconnect();
    } catch {}

    s.connect();

    const onErr = (err: any) => {
      console.error("socket connect_error:", err?.message ?? err);
      setPinStatus("error");
    };

    s.on("connect_error", onErr);

    return () => {
      s.off("connect_error", onErr);
      // ❌ do not disconnect here (question page needs socket)
    };
  }, [mounted, pin, ready, accessToken, s]);

  // ✅ PIN check (runs after socket is connected)
  useEffect(() => {
    if (!mounted || !pin || !ready) return;
    if (!accessToken) return;

    const check = () => {
      setPinStatus("checking");

      s.emit("pin:check", { pin }, (resp: any) => {
        const exists = Boolean(resp?.exists);

        if (!exists) {
          setPinStatus("inactive");
          setLiveMeta(null);
          return;
        }

        setPinStatus("active");
        setLiveMeta({
          quizTitle: resp?.meta?.quizTitle,
          courseCode: resp?.meta?.courseCode,
          courseName: resp?.meta?.courseName,
        });

        if (resp?.meta) saveLiveMeta(pin, resp.meta);
      });
    };

    if (s.connected) check();
    s.on("connect", check);

    return () => {
      s.off("connect", check);
    };
  }, [mounted, pin, ready, accessToken, s]);

  // ✅ join socket + redirect when lecturer starts
  useEffect(() => {
    if (!mounted || !pin || !ready || !student) return;
    if (!accessToken) return;
    if (pinStatus !== "active") return;

    const doJoin = () => {
      const sid = (effectiveStudentId || student.studentId || "").trim();
      const nm = (displayName || student.name || "").trim();
      if (!sid || !nm) return;

      const studentToJoin = { ...student, studentId: sid, name: nm };

      // keep session in sync
      writeLiveStudent(studentToJoin);

      s.emit("join", { pin, student: studentToJoin });
    };

    if (s.connected) doJoin();
    s.on("connect", doJoin);

    const goQuestion = () => router.push(`/join/${encodeURIComponent(pin)}/question`);
    s.on("question:show", goQuestion);

    return () => {
      s.off("connect", doJoin);
      s.off("question:show", goQuestion);
    };
  }, [mounted, pin, ready, student, accessToken, pinStatus, effectiveStudentId, displayName, router, s]);

  // ✅ Random avatar (disabled after save)
  const handleChangeAvatar = async () => {
    if (locked) return;

    const me = await getCurrentStudent();
    if (!me) return;

    const seed = randomSeed();
    await updateCurrentStudent({ avatarSeed: seed });

    const me2 = await getCurrentStudent();
    if (!me2) return;

    const nextLive = toLiveStudent(me2, 96);
    writeLiveStudent(nextLive);
    setStudent(nextLive);

    if (pinStatus === "active") {
      s.emit("join", { pin, student: nextLive });
    }
  };

  // ✅ Save profile (first/last + studentId) then lock editing
  const handleSaveProfile = async () => {
    if (pinStatus !== "active") {
      return alert("This PIN is not active right now. Please check with your lecturer.");
    }

    if (locked) {
      router.push(`/join/${encodeURIComponent(pin)}/question`);
      return;
    }

    const fn = firstName.trim();
    const ln = lastName.trim();
    const sid = effectiveStudentId;
    const nm = [fn, ln].filter(Boolean).join(" ").trim();

    if (!fn) return alert("Please enter your first name.");
    if (!ln) return alert("Please enter your last name.");
    if (!canAutoDerive && !sid) {
      return alert("Please enter your Student ID (or use AU email like u5400000@au.edu).");
    }

    await updateCurrentStudent({
      firstName: fn,
      lastName: ln,
      studentId: sid,
    });

    const me2 = await getCurrentStudent();
    if (!me2) return;

    const nextLive = { ...toLiveStudent(me2, 96), studentId: sid, name: nm };
    writeLiveStudent(nextLive);
    setStudent(nextLive);

    // ensure join after save
    if (pinStatus === "active") {
      s.emit("join", { pin, student: nextLive });
    }

    try {
      sessionStorage.setItem(lockKey, "1");
    } catch {}
    setLocked(true);

    router.push(`/join/${encodeURIComponent(pin)}/question`);
  };

  const handleLeave = () => {
    try {
      s.disconnect(); // ✅ stops Railway usage when leaving live
    } catch {}

    try {
      sessionStorage.removeItem("gamorax_live_student");
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
              {headerTitle}
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300">{headerSubtitle}</p>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="
                  rounded-full border border-slate-200/70 bg-white/70
                  px-4 py-2 text-sm font-extrabold text-slate-900
                  dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-50
                "
              >
                PIN: <span className="font-mono tracking-widest text-base sm:text-lg">{pin}</span>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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
              disabled={locked || !pin || pinStatus !== "active"}
              className={[
                "w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white",
                "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
                "shadow-[0_10px_25px_rgba(37,99,235,0.18)] hover:opacity-95 active:scale-[0.99] transition",
                "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50",
                locked ? "opacity-55 cursor-not-allowed" : "",
              ].join(" ")}
              type="button"
            >
              {pinIsActive ? (locked ? "Continue" : "Save & Continue") : "PIN not active"}
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
