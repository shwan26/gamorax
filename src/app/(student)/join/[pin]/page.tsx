"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

import Navbar from "@/src/components/Navbar";
import GradientButton from "@/src/components/GradientButton";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import {
  getLiveByPin,
  joinLiveSession,
  type LiveSession,
  type LiveStudent,
} from "@/src/lib/liveStorage";

const AVATARS = ["/icons/student.png", "/icons/lecturer.png"] as const;

export default function JoinLiveByPinPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").trim();

  const [live, setLive] = useState<LiveSession | null>(null);
  const [game, setGame] = useState<Game | null>(null);

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const [didRedirect, setDidRedirect] = useState(false);

  useEffect(() => {
    if (didRedirect) return;
    if (!joined || !pin || !live) return;

    if (live.status !== "lobby") {
      setDidRedirect(true);
      router.push(`/join/${encodeURIComponent(pin)}/question`);
    }
  }, [didRedirect, joined, live?.status, pin, router]);


  // Poll live session + game
  useEffect(() => {
    if (!pin) return;

    const tick = () => {
      const s = getLiveByPin(pin);
      setLive(s);
      if (s?.gameId) setGame(getGameById(s.gameId));
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [pin]);

  const titleText = useMemo(() => {
    if (game)
      return `${game.quizNumber} - ${game.courseCode} (${game.section}) ${game.semester}`;
    return pin ? `Quiz Session - ${pin}` : "Quiz Session";
  }, [game, pin]);

  const avatarSrc = AVATARS[avatarIndex] ?? AVATARS[0];

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

    // Keep for same-browser demo (optional)
    joinLiveSession(pin, student);

    // Used by /join/[pin]/question
    sessionStorage.setItem("gamorax_live_student", JSON.stringify(student));

    router.push(`/join/${encodeURIComponent(pin)}/question`);
  };


  // Auto-go when host starts
  useEffect(() => {
    if (!joined) return;
    if (!live) return;

  }, [joined, live, pin, router]);


  if (joined) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Navbar />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
          <h2 className="text-xl font-bold mb-2">Waiting for host to start…</h2>
          <p className="text-sm text-gray-600">{titleText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 md:mt-14 px-4">
        <p className="text-sm md:text-base font-semibold text-center mb-6">{titleText}</p>

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
