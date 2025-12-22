"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import {
  createLiveSession,
  getLiveByPin,
  LiveSession,
} from "@/src/lib/liveStorage";
import QRCode from "react-qr-code";

export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const game = getGameById(id);

  const [session, setSession] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (!id) return;

    const s = createLiveSession(id);
    setSession(s);

    // polling (mock realtime)
    const interval = setInterval(() => {
      const updated = getLiveByPin(s.pin);
      if (updated) setSession(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [id]);

  if (!game || !session) return null;

  const joinUrl = `https://localhost:3000/join/${session.pin}`;

  const hasPlayers = session.players.length > 0;

    function handleStart() {
    if (!hasPlayers) return;
    router.push(`/game/${id}/live/question`);
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
            JOIN AT{" "}
            <span className="font-mono font-normal">
              gamorax.live.app
            </span>
          </p>

          <QRCode value={joinUrl} size={260} />

          <p className="text-2xl font-bold">
            GAME PIN{" "}
            <span className="tracking-widest">
              {session.pin}
            </span>
          </p>
        </div>

        {/* RIGHT */}
        <div>
          <h3 className="font-semibold mb-2">
            Players joined ({session.players.length})
          </h3>

          <ul className="text-sm space-y-1">
            {session.players.map((p) => (
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
            disabled={!hasPlayers}
            className={`px-10 py-3 rounded-full text-lg transition
                ${
                hasPlayers
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
