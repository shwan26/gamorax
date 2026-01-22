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

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

export default function LivePage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const router = useRouter();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);
  const course = useMemo(() => (courseId ? getCourseById(courseId) : null), [courseId]);

  const valid = !!game && !!course && game.courseId === courseId;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [students, setStudents] = useState<LiveStudent[]>([]);

  // ✅ prevent double-create in dev (React strict mode)
  const createdRef = useRef(false);

  useEffect(() => {
    if (!valid) return;
    if (createdRef.current) return;
    createdRef.current = true;

    const s = createLiveSession(gameId);
    setSession(s);
  }, [valid, gameId]);

  // ✅ connect + join room + receive students:update
  useEffect(() => {
    if (!session?.pin) return;
    
    const s = socket;

    s.connect(); // ✅ IMPORTANT

    const pin = session.pin;

    const doJoin = () => s.emit("join", { pin });

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

    };
  }, [session?.pin]);

  if (!valid || !game || !course || !session) return null;

  const pin = session.pin;

  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL as string | undefined) ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  
    const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${pin}`
      : "";

  const hasStudents = students.length > 0;

  function handleStart() {
    if (!hasStudents) return;
    router.push(`/course/${courseId}/game/${gameId}/live/question?pin=${encodeURIComponent(pin)}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode} ${
          course.section ? `Section ${course.section}` : ""
        } ${course.semester ? course.semester : ""}`}
      />

      <div className="flex px-10 py-10 gap-20">
        <div className="space-y-6">
          <p className="text-xl font-bold">
            JOIN AT <span className="font-mono font-normal">{joinUrl.replace(/^https?:\/\//, "")}</span>
          </p>

          <QRCode value={joinUrl} size={260} />

          <p className="text-2xl font-bold">
            GAME PIN <span className="tracking-widest">{pin}</span>
          </p>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Students joined ({students.length})</h3>
          </div>

          {students.length === 0 ? (
            <div className="text-sm text-gray-500 border border-dashed rounded-xl p-6">
              Waiting for students to join…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((s) => (
                <div key={s.studentId} className="rounded-xl border border-gray-200 px-3 py-2">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-gray-500 truncate">{s.studentId}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end px-10 pb-10">
        <button
          onClick={handleStart}
          disabled={!hasStudents}
          className={`px-10 py-3 rounded-full text-lg transition
            ${
              hasStudents
                ? "bg-[#3B8ED6] text-white hover:bg-[#327bbd]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          Start
        </button>
      </div>
    </div>
  );
}
