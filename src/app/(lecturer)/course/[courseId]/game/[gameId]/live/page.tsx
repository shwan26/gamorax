// src/app/(lecturer)/course/[courseId]/game/[gameId]/live/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import GradientButton from "@/src/components/GradientButton";

import { supabase } from "@/src/lib/supabaseClient";
import { socket, setSocketAccessToken } from "@/src/lib/socket";

import QRCode from "react-qr-code";
import { Users, Play, Link2, KeyRound, X } from "lucide-react";


/* ------------------------------ types ------------------------------ */

type CourseRow = {
  id: string;
  courseCode: string;
  courseName: string;
  section?: string | null;
  semester?: string | null;
};

type GameRow = {
  id: string;
  courseId: string;
  quizNumber: string;
  timer: { mode: "automatic" | "manual"; defaultTime: number };
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
};

type LiveSessionRow = {
  id: string;
  pin: string;
  quiz_id?: string;
  lecturer_id?: string;
  is_active?: boolean;
  status?: string;
};

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

/* ------------------------------ helpers ------------------------------ */

function SkeletonLine({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) {
  return (
    <div
      className={[
        "rounded-full bg-slate-200/80 dark:bg-slate-800/70",
        "animate-pulse",
        w,
        h,
      ].join(" ")}
    />
  );
}

function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-3xl bg-slate-200/60 dark:bg-slate-800/50",
        "animate-pulse",
        className,
      ].join(" ")}
    />
  );
}



function StudentAvatar({ s, size = 44 }: { s: LiveStudent; size?: number }) {

  const src =
    s.avatarSrc ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      (s.studentId || s.name || "student").trim()
    )}`;

  return (
    <div
      className="
        flex items-center justify-center overflow-hidden rounded-full
        bg-white/80 text-slate-900 shadow-sm
        dark:bg-slate-950/60 dark:text-slate-50
      "
      style={{ width: size, height: size }}
      aria-label="Student avatar"
    >
      
      <img
        src={src}
        alt={s.name}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}



/* ------------------------------ page ------------------------------ */

export default function LivePage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  // allow re-using existing PIN from URL (nice for refresh / share)
  const pinFromUrl = (sp?.get("pin") ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [game, setGame] = useState<GameRow | null>(null);

  const [session, setSession] = useState<LiveSessionRow | null>(null);
  const [students, setStudents] = useState<LiveStudent[]>([]);

  // ✅ keep token in component scope (DO NOT do this in middleware)
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // prevent double-create in dev (React strict mode)
  const createdRef = useRef(false);

  const valid = !!course && !!game && game.courseId === courseId;

  async function requireLecturerOrRedirect(nextPath: string) {
    // must be logged in
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    // must be lecturer
    const { data: prof, error } = await supabase
      .from("my_profile_api")
      .select("role")
      .single();

    if (error || !prof || prof.role !== "lecturer") {
      await supabase.auth.signOut();
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    return true;
  }

  function handleRemoveStudent(studentId: string) {
    if (!pin) return;
    socket.emit("lecturer:remove-student", { pin, studentId });
  }

  function handleClearAllStudents() {
    if (!pin || !confirm("Remove all students from the lobby?")) return;
    socket.emit("lecturer:clear-all", { pin });
  }

  /* ------------------------------ auth token ------------------------------ */

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!alive) return;
      setAccessToken(token);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      setAccessToken(token);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------ load course + game ------------------------------ */

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseId || !gameId) return;

      setLoading(true);

      const ok = await requireLecturerOrRedirect(
        `/course/${courseId}/game/${gameId}/live`
      );
      if (!ok) return;

      const { data: c, error: cErr } = await supabase
        .from("courses_api")
        .select("id, courseCode, courseName, section, semester")
        .eq("id", courseId)
        .single();

      if (!alive) return;
      if (cErr) {
        alert("Load course error: " + cErr.message);
        setLoading(false);
        return;
      }

      const { data: g, error: gErr } = await supabase
        .from("games_api")
        .select("id, courseId, quizNumber, timer, shuffleQuestions, shuffleAnswers")
        .eq("id", gameId)
        .single();

      if (!alive) return;
      if (gErr) {
        alert("Load game error: " + gErr.message);
        setLoading(false);
        return;
      }

      setCourse(c as CourseRow);
      setGame(g as GameRow);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [courseId, gameId, router]);

  /* ------------------------------ ensure live session exists ------------------------------ */

  useEffect(() => {
    if (!valid) return;

    if (pinFromUrl) {
      setSession((prev) => prev ?? ({ id: "", pin: pinFromUrl } as LiveSessionRow));
      return;
    }

    if (createdRef.current) return;
    createdRef.current = true;

    (async () => {
      const { data, error } = await supabase.rpc("create_live_session", {
        p_quiz_id: gameId,
      });

      if (error) {
        alert("Create live session error: " + error.message);
        return;
      }

      setSession(data as LiveSessionRow);
    })();
  }, [valid, gameId, pinFromUrl]);

  const pin = session?.pin ?? "";

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (!pin) return "";
    return `${window.location.origin}/join/${pin}`;
  }, [pin]);

  /* ------------------------------ socket connect (lecturer) ------------------------------ */

  useEffect(() => {
    if (!pin || !game || !course) return;
    if (!accessToken) return;

    const s = socket;

    const meta = {
      gameId: game.id,
      quizTitle: game.quizNumber,          // or your real quiz title field
      courseCode: course.courseCode,
      courseName: course.courseName,
      section: course.section ?? null,
      semester: course.semester ?? null,
    };


    const doJoin = () => {
      s.emit("lecturer:join", { pin });
      s.emit("meta:set", { pin, meta });
    };

    const onStudentsUpdate = (list: LiveStudent[]) => {
      setStudents(Array.isArray(list) ? list : []);
    };

    const onErr = (err: any) => {
      console.error("socket connect_error:", err?.message ?? err);
    };

    s.on("connect", doJoin);
    s.on("students:update", onStudentsUpdate);
    s.on("connect_error", onErr);

    // ✅ IMPORTANT: set token on REAL socket instance
    setSocketAccessToken(accessToken);

    // reconnect fresh
    try {
      if (s.connected) s.disconnect();
    } catch {}

    s.connect();

    if (s.connected) doJoin();

    return () => {
      s.off("connect", doJoin);
      s.off("students:update", onStudentsUpdate);
      s.off("connect_error", onErr);
    };
  }, [pin, game, course, accessToken]);


  const hasStudents = students.length > 0;

  function handleStart() {
    if (!hasStudents) return;
    router.push(
      `/course/${courseId}/game/${gameId}/live/question?pin=${encodeURIComponent(pin)}`
    );
  }

  /* ------------------------------ render ------------------------------ */

  if (loading)
  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <GameSubNavbar
        title="Loading…"
        canStartLive={false}
        liveBlockReason=""
      />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-8">
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          {/* LEFT skeleton */}
          <section
            className="
              relative overflow-hidden rounded-3xl
              border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
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
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/14 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

            <div className="relative space-y-5">
              <div className="flex items-start gap-3">
                <SkeletonBox className="h-12 w-12 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine w="w-32" h="h-4" />
                  <SkeletonLine w="w-64" h="h-3" />
                </div>
              </div>

              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm
                  dark:border-slate-800/70 dark:bg-slate-950/55
                  flex items-center justify-center
                "
              >
                {/* QR placeholder */}
                <SkeletonBox className="h-[260px] w-[260px] rounded-2xl" />
              </div>

              <div className="flex items-start gap-3">
                <SkeletonBox className="h-12 w-12 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine w="w-24" h="h-4" />
                  <SkeletonLine w="w-40" h="h-10" />
                </div>
              </div>

              <div className="pt-1">
                <SkeletonBox className="h-11 w-full rounded-2xl" />
                <div className="mt-2 flex justify-center">
                  <SkeletonLine w="w-48" h="h-3" />
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT skeleton */}
          <section
            className="
              relative overflow-hidden rounded-3xl
              border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
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
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/14 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SkeletonLine w="w-28" h="h-4" />
                </div>
                <SkeletonLine w="w-10" h="h-6" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="
                      rounded-3xl border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur
                      dark:border-slate-800/70 dark:bg-slate-950/55
                    "
                  >
                    <div className="flex items-center gap-3">
                      <SkeletonBox className="h-11 w-11 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <SkeletonLine w="w-28" h="h-4" />
                        <SkeletonLine w="w-16" h="h-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <SkeletonLine w="w-72" h="h-3" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );

  if (!courseId || !gameId) return <div className="p-6">Missing route params.</div>;
  if (!valid || !course || !game) return <div className="p-6">Invalid course/game.</div>;
  if (!pin) return <div className="p-6">Creating live session…</div>;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode}${
          course.section ? ` • Section ${course.section}` : ""
        }${course.semester ? ` • ${course.semester}` : ""}`}
        canStartLive={true}
        liveBlockReason=""
      />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-8">
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          {/* LEFT: join info */}
          <section
            className="
              relative overflow-hidden rounded-3xl
              border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
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
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/14 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

            <div className="relative space-y-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
                  <Link2 className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Students join at
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-words">
                    <span className="font-mono">
                      {joinUrl ? joinUrl.replace(/^https?:\/\//, "") : ""}
                    </span>
                  </p>
                </div>
              </div>

              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm
                  dark:border-slate-800/70 dark:bg-slate-950/55
                  flex items-center justify-center
                "
              >
                {joinUrl ? <QRCode value={joinUrl} size={260} /> : null}
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
                  <KeyRound className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Game PIN
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[0.25em] text-slate-900 dark:text-slate-50">
                    {pin}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <GradientButton
                  onClick={handleStart}
                  disabled={!hasStudents}
                  iconLeft={<Play className="h-4 w-4" />}
                  className={hasStudents ? "" : "opacity-60 cursor-not-allowed"}
                >
                  Start
                </GradientButton>
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  {hasStudents ? "Ready when you are." : "Waiting for at least 1 student to join."}
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT: students lobby */}
          <section
            className="
              relative overflow-hidden rounded-3xl
              border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45
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
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/14 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Students joined
                  </h3>
                </div>

                <span
                  className="
                    rounded-full border border-slate-200/70 bg-white/70
                    px-2.5 py-1 text-xs font-semibold text-slate-600
                    dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-300
                  "
                >
                  {students.length}
                </span>
                {hasStudents && (
                  <button
                    onClick={handleClearAllStudents}
                    className="
                      rounded-full border border-red-200/70 bg-red-50/70 
                      px-3 py-1 text-xs font-medium text-red-600
                      hover:bg-red-100 transition-colors
                      dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400
                      dark:hover:bg-red-950/50
                    "
                  >
                    Clear All
                  </button>
                )}
              </div>

              

              {!hasStudents ? (
                <div
                  className="
                    mt-4 rounded-3xl border border-dashed border-slate-300/70 bg-white/50 p-6
                    text-sm text-slate-600
                    dark:border-slate-700/60 dark:bg-slate-950/35 dark:text-slate-300
                  "
                >
                  Waiting for students to join…
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {students.map((st) => (
                  <div
                    key={st.studentId}
                    className="
                      rounded-3xl border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur
                      dark:border-slate-800/70 dark:bg-slate-950/55
                    "
                  >
                    <div className="flex items-center gap-3">
                      <StudentAvatar s={st} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {st.name || "Student"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {st.studentId}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(st.studentId)}
                        className="
                          flex h-8 w-8 items-center justify-center rounded-full
                          border border-red-200/70 bg-red-50/70 text-red-600
                          hover:bg-red-100 transition-colors
                          dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400
                          dark:hover:bg-red-950/50
                        "
                        aria-label="Remove student"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              )}

              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Tip: Students can refresh and re-join with the same PIN.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
