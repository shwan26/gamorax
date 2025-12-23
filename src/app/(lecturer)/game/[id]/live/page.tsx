"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import { getGameById } from "@/src/lib/gameStorage";
import { createLiveSession, type LiveSession } from "@/src/lib/liveStorage";
import QRCode from "react-qr-code";
import { socket } from "@/src/lib/socket";

type LiveStudent = {
  studentId: string;
  name: string;
  avatarSrc?: string;
};

export default function LivePage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  
  const id = (params?.id ?? "").toString();

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);

  const [session, setSession] = useState<LiveSession | null>(null);

  // ✅ IMPORTANT: lecturer must display students from SOCKET, not localStorage
  const [students, setStudents] = useState<LiveStudent[]>([]);

  // create session once
  useEffect(() => {
    if (!id) return;
    const s = createLiveSession(id);
    setSession(s);
  }, [id]);

  // connect + join room + receive students:update
  useEffect(() => {
    if (!session?.pin) return;

    fetch("/api/socket").catch(() => {});
    const pin = session.pin;

    // join as lecturer (student optional)
    socket.emit("join", { pin });

    const onStudentsUpdate = (list: LiveStudent[]) => {
      setStudents(Array.isArray(list) ? list : []);
    };

    // if students joined before lecturer opened page, they will be pushed after join
    socket.on("students:update", onStudentsUpdate);

    return () => {
      socket.off("students:update", onStudentsUpdate);
      // don't disconnect global socket
    };
  }, [session?.pin]);

  if (!id || !game || !session) return null;

  const pin = session.pin;
  const joinUrl = `http://localhost:3000/join/${pin}`;
  const hasStudents = students.length > 0;

  function handleStart() {
    if (!hasStudents) return;

    fetch("/api/socket").catch(() => {});
    socket.emit("start", { pin }); // ✅ triggers "game:start" to students

    // ✅ pass pin to question page
    router.push(`/game/${id}/live/question?pin=${encodeURIComponent(pin)}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${game.courseCode} (${game.section}) ${game.semester}`}
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
            ${hasStudents ? "bg-[#3B8ED6] text-white hover:bg-[#327bbd]" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
        >
          Start
        </button>
      </div>
    </div>
  );
}
