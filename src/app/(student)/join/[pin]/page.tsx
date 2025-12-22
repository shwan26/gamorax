"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { joinLiveSession } from "@/src/lib/liveStorage";

export default function JoinPage() {
  const { pin } = useParams<{ pin: string }>();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  function handleJoin() {
    if (!name) return;

    joinLiveSession(pin, {
      studentId: Math.floor(1000000 + Math.random() * 9000000).toString(),
      name,
    });

    setJoined(true);
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h2 className="text-xl font-bold">
          Waiting for host to start…
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Enter your name</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-4 py-2 rounded-md"
        placeholder="Your name"
      />

      <button
        onClick={handleJoin}
        className="bg-[#3B8ED6] text-white px-6 py-2 rounded-md"
      >
        Join Game
      </button>
    </div>
  );
}
