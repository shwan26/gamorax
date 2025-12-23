"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import {
  createLiveSession,
  getLiveByPin,
  type LiveSession,
} from "@/src/lib/liveStorage";
import QRCode from "react-qr-code";
import { startLive } from "@/src/lib/liveStorage";
import { getQuestions } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";

export default function LivePage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();

  const id = (params?.id ?? "").toString();

  // ✅ only read game when id exists
  const game = useMemo(() => {
    if (!id) return null;
    return getGameById(id);
  }, [id]);

  const [session, setSession] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!id) return;

    const s = createLiveSession(id);
    setSession(s);

    const interval = window.setInterval(() => {
      const updated = getLiveByPin(s.pin);
      if (updated) setSession(updated);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [id]);

  if (!id || !game || !session) return null;

  const joinUrl = `https://localhost:3000/join/${session.pin}`;

  // ✅ LiveSession uses students
  const hasStudents = (session.students?.length ?? 0) > 0;

  function handleStart() {
    if (!session) return;              // ✅ TS happy
    if (!hasStudents) return;

    fetch("/api/socket").catch(() => {});
    socket.emit("start", { pin: session.pin });

    startLive(session.pin);
    router.push(`/game/${id}/live/question?pin=${encodeURIComponent(session.pin)}`);
  }




  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${game.courseCode} (${game.section}) ${game.semester}`}
      />

      <div className="flex px-10 py-10 gap-20">
        {/* LEFT */}
        <div className="space-y-6">
          <p className="text-xl font-bold">
            JOIN AT <span className="font-mono font-normal">gamorax.live.app</span>
          </p>

          <QRCode value={joinUrl} size={260} />

          <p className="text-2xl font-bold">
            GAME PIN <span className="tracking-widest">{session.pin}</span>
          </p>
        </div>

        {/* RIGHT */}
        <div>
          <h3 className="font-semibold mb-2">
            Students joined ({session.students?.length ?? 0})
          </h3>

          <ul className="text-sm space-y-1">
            {(session.students ?? []).map((p) => (
              <li key={p.studentId}>
                {p.studentId} – {p.name}
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
