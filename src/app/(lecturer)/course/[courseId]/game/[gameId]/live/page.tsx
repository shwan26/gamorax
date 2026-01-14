"use client";

import { useEffect, useMemo, useState } from "react";
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

  // create session once
  useEffect(() => {
    if (!valid) return;
    const s = createLiveSession(gameId);
    setSession(s);
  }, [valid, gameId]);

  // connect + join room + receive students:update
  useEffect(() => {
    if (!session?.pin) return;

    fetch("/api/socket").catch(() => {});
    const pin = session.pin;

    socket.emit("join", { pin });

    const onStudentsUpdate = (list: LiveStudent[]) => {
      setStudents(Array.isArray(list) ? list : []);
    };

    socket.on("students:update", onStudentsUpdate);

    return () => {
      socket.off("students:update", onStudentsUpdate);
    };
  }, [session?.pin]);

  if (!valid || !game || !course || !session) return null;

  const pin = session.pin;

  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL as string | undefined) ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const joinUrl = `${normalizedBase}/join/${pin}`;

  const hasStudents = students.length > 0;

  function handleStart() {
    if (!hasStudents) return;

    fetch("/api/socket").catch(() => {});
    socket.emit("start", { pin });

    router.push(
      `/course/${courseId}/game/${gameId}/live/question?pin=${encodeURIComponent(pin)}`
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode} (${course.section}) ${course.semester}`}
      />

      <div className="flex px-10 py-10 gap-20">
        <div className="space-y-6">
          <p className="text-xl font-bold">
            JOIN AT <span className="font-mono font-normal">gamorax.live.app</span>
          </p>

          <QRCode value={joinUrl} size={260} />

          <p className="text-2xl font-bold">
            GAME PIN <span className="tracking-widest">{pin}</span>
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Students joined ({students.length})</h3>
          <ul className="text-sm space-y-1">
            {students.map((s) => (
              <li key={s.studentId}>
                {s.studentId} – {s.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end px-10">
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
