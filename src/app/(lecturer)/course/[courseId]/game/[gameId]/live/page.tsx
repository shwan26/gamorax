"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import { getCourseById } from "@/src/lib/courseStorage";
import { createLiveSession, type LiveSession } from "@/src/lib/liveStorage";
import QRCode from "react-qr-code";
import { socket } from "@/src/lib/socket";
import { Users, Play, Link2, KeyRound } from "lucide-react";
import GradientButton from "@/src/components/GradientButton";

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string; // optional
};

function initialsFromName(name: string) {
  const s = (name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") ?? "";
  return (first + last).toUpperCase();
}

function StudentAvatar({
  s,
  size = 44,
}: {
  s: LiveStudent;
  size?: number;
}) {
  const initials = initialsFromName(s.name);

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
      {s.avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.avatarSrc}
          alt={s.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-bold">{initials}</span>
      )}
    </div>
  );
}

export default function LivePage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const router = useRouter();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);
  const course = useMemo(
    () => (courseId ? getCourseById(courseId) : null),
    [courseId]
  );

  const valid = !!game && !!course && game.courseId === courseId;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [students, setStudents] = useState<LiveStudent[]>([]);

  // prevent double-create in dev (React strict mode)
  const createdRef = useRef(false);

  useEffect(() => {
    if (!valid) return;
    if (createdRef.current) return;
    createdRef.current = true;

    const s = createLiveSession(gameId);
    setSession(s);
  }, [valid, gameId]);

  // connect + join room + receive students:update
  useEffect(() => {
    if (!session?.pin) return;

    const s = socket;
    s.connect();

    const pin = session.pin;

    const meta = {
      gameId,
      quizTitle: game?.quizNumber ?? "Quiz",
      courseCode: course?.courseCode ?? "",
      courseName: course?.courseName ?? "",
      section: (course?.section ?? "").toString(),
      semester: (course?.semester ?? "").toString(),
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

    if (s.connected) doJoin();
    s.on("connect", doJoin);
    s.on("students:update", onStudentsUpdate);
    s.on("connect_error", onErr);

    return () => {
      s.off("connect", doJoin);
      s.off("students:update", onStudentsUpdate);
      s.off("connect_error", onErr);
      // optional: don't disconnect globally if other pages use same socket
      // s.disconnect();
    };
  }, [session?.pin, gameId, game?.quizNumber, course?.courseCode, course?.courseName, course?.section, course?.semester]);

  if (!valid || !game || !course || !session) return null;

  const pin = session.pin;

  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join/${pin}` : "";

  const hasStudents = students.length > 0;

  function handleStart() {
    if (!hasStudents) return;
    router.push(
      `/course/${courseId}/game/${gameId}/live/question?pin=${encodeURIComponent(
        pin
      )}`
    );
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode}${
          course.section ? ` • Section ${course.section}` : ""
        }${course.semester ? ` • ${course.semester}` : ""}`}
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
            {/* dot pattern + glow */}
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
                      {joinUrl.replace(/^https?:\/\//, "")}
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
                {/* QR code */}
                <QRCode value={joinUrl} size={260} />
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
                  {hasStudents
                    ? "Ready when you are."
                    : "Waiting for at least 1 student to join."}
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
            {/* dot pattern + glow */}
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
                  {students.map((s) => (
                    <div
                      key={s.studentId}
                      className="
                        rounded-3xl border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur
                        dark:border-slate-800/70 dark:bg-slate-950/55
                      "
                    >
                      <div className="flex items-center gap-3">
                        <StudentAvatar s={s} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {s.name || "Student"}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {s.studentId}
                          </p>
                        </div>
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
