"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";
import { getLiveByPin, joinLiveSession, type LiveSession, type LiveStudent } from "@/src/lib/liveStorage";
import { socket } from "@/src/lib/socket";

const AVATARS = ["/icons/student.png", "/icons/lecturer.png"] as const;

export default function JoinLiveByPinPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").trim();

  const [serverConnected, setServerConnected] = useState(false);

  // Optional (ONLY works if this device has the host's localStorage)
  const [liveLocal, setLiveLocal] = useState<LiveSession | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [course, setCourse] = useState<Course | null>(null);

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const avatarSrc = AVATARS[avatarIndex] ?? AVATARS[0];

  // 1) Socket connection indicator (cross-device)
  useEffect(() => {
    if (!pin) return;

    fetch("/api/socket").catch(() => {});

    const onConnect = () => setServerConnected(true);
    const onDisconnect = () => setServerConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) setServerConnected(true);

    // Join room (no student yet) so we can be redirected if host already started
    socket.emit("join", { pin });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [pin]);

  // 2) Restore student from sessionStorage (refresh-safe)
  useEffect(() => {
    const raw = sessionStorage.getItem("gamorax_live_student");
    if (!raw) return;

    try {
      const s = JSON.parse(raw) as LiveStudent;
      if (s?.studentId && s?.name) {
        setStudentId(s.studentId);
        setName(s.name);

        const idx = AVATARS.findIndex((a) => a === s.avatarSrc);
        if (idx >= 0) setAvatarIndex(idx);

        setJoined(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // 3) Optional: localStorage lookup (same-device only). Never treat null as "pin wrong".
  useEffect(() => {
    if (!pin) return;

    const tick = () => {
      const s = getLiveByPin(pin);
      setLiveLocal(s);

      if (s?.gameId) {
        const g = getGameById(s.gameId);
        setGame(g);
        setCourse(g?.courseId ? getCourseById(g.courseId) : null);
      } else {
        setGame(null);
        setCourse(null);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [pin]);

  // 4) After joining: redirect when host sends first question
  useEffect(() => {
    if (!joined || !pin) return;

    const onQuestionShow = () => {
      router.push(`/join/${encodeURIComponent(pin)}/question`);
    };

    socket.on("question:show", onQuestionShow);

    // If host already has a current question, server will emit it on join.
    // To ensure we get it, re-emit join with student (if we have it in sessionStorage).
    const raw = sessionStorage.getItem("gamorax_live_student");
    if (raw) {
      try {
        const st = JSON.parse(raw) as LiveStudent;
        if (st?.studentId && st?.name) socket.emit("join", { pin, student: st });
      } catch {}
    }

    return () => {
      socket.off("question:show", onQuestionShow);
    };
  }, [joined, pin, router]);

  const titleText = useMemo(() => {
    if (game && course) {
      return `${game.quizNumber} - ${course.courseCode} ${course.section ? `Section ${course.section}` : ""} ${course.semester? course.semester : ""}`;
    }
    if (game) return `${game.quizNumber}`;
    return pin ? `Quiz Session - ${pin}` : "Quiz Session";
  }, [game, course, pin]);

  const handleChangeAvatar = () => {
    setAvatarIndex((i) => (i + 1) % AVATARS.length);
  };

  const handleJoin = () => {
    if (!pin) return;

    if (!studentId.trim() || !name.trim()) {
      alert("Please enter Student ID and Full Name.");
      return;
    }

    const student: LiveStudent = {
      studentId: studentId.trim(),
      name: name.trim(),
      avatarSrc,
    };

    // Persist for question page + refresh
    sessionStorage.setItem("gamorax_live_student", JSON.stringify(student));

    // Cross-device join via socket
    fetch("/api/socket").catch(() => {});
    socket.emit("join", { pin, student });

    // Optional: keep your localStorage demo behavior (same device only)
    joinLiveSession(pin, student);

    setJoined(true);
  };

  // Waiting screen
  if (joined) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Navbar />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
          <h2 className="text-xl font-bold mb-2">Waiting for host to start…</h2>
          <p className="text-sm text-gray-600">{titleText}</p>

          <p className={`text-xs mt-3 ${serverConnected ? "text-green-700" : "text-gray-600"}`}>
            {serverConnected ? "Connected to live server." : "Connecting to live server…"}
          </p>

          {!liveLocal && (
            <p className="text-[11px] text-gray-500 mt-2 max-w-sm">
              If you’re on a different device, course details may not show here because they’re stored in the host browser.
              You can still join normally.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Join form
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-14 px-4">
        <p className="text-sm md:text-base font-semibold text-center mb-2">{titleText}</p>
        <p className={`text-xs mb-6 ${serverConnected ? "text-green-700" : "text-gray-600"}`}>
          {serverConnected ? "Connected to live server." : "Connecting…"}
        </p>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
            <Image src={avatarSrc} alt="Avatar" width={80} height={80} priority />
          </div>

          <button
            onClick={handleChangeAvatar}
            className="px-4 py-1 rounded-md text-xs font-semibold text-white shadow-sm
                       bg-gradient-to-r from-[#0593D1] to-[#034B6B]
                       hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Change Avatar
          </button>
        </div>

        {/* Form */}
        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="block mb-1 text-xs font-medium">Student ID</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <GradientButton onClick={handleJoin}>Join Game</GradientButton>
        </div>
      </div>
    </div>
  );
}
