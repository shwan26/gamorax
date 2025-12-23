"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import localFont from "next/font/local";
import { io, type Socket } from "socket.io-client";

import Navbar from "@/src/components/Navbar";
import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getLiveByPin } from "@/src/lib/liveStorage";
import type { LiveStudent } from "@/src/lib/liveStorage";

const caesar = localFont({
  src: "../../../../../../public/fonts/CaesarDressing-Regular.ttf",
});

type LiveQuestion = { number?: number; total?: number };

export default function StudentQuestionPage() {
  const router = useRouter();
  const params = useParams<{ pin: string }>();
  const pin = (params?.pin || "").toString();

  const [game, setGame] = useState<Game | null>(null);
  const [student, setStudent] = useState<LiveStudent | null>(null);

  const [sock, setSock] = useState<Socket | null>(null);

  const [phase, setPhase] = useState<"waiting" | "question" | "result">("waiting");
  const [question, setQuestion] = useState<LiveQuestion>({ number: 1 });
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [questionStartAt, setQuestionStartAt] = useState<number | null>(null);

  // Load student from sessionStorage
  useEffect(() => {
    if (!pin) return;

    const raw = sessionStorage.getItem("gamorax_live_student");
    if (!raw) {
      router.push(`/join/${encodeURIComponent(pin)}`);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as LiveStudent;
      if (!parsed?.studentId || !parsed?.name) {
        router.push(`/join/${encodeURIComponent(pin)}`);
        return;
      }
      setStudent(parsed);
    } catch {
      router.push(`/join/${encodeURIComponent(pin)}`);
      return;
    }

    // Optional title (works only if same browser has liveStorage)
    const live = getLiveByPin(pin);
    if (live?.gameId) setGame(getGameById(live.gameId));
  }, [pin, router]);

  const titleText = useMemo(() => {
    if (game)
      return `${game.quizNumber} - ${game.courseCode} (${game.section}) ${game.semester}`;
    return pin ? `Quiz Session - ${pin}` : "Quiz Session";
  }, [game, pin]);

  useEffect(() => {
    if (!pin || !student) return;

    fetch("/api/socket").catch(() => {});

    const s = io({ path: "/api/socket" });
    setSock(s);

    const onStart = ({ startAt }: { startAt: number }) => {
        setQuestionStartAt(startAt ?? Date.now());
        setSelected(null);
        setPhase("question");
        setQuestion((prev) => prev ?? { number: 1 });
    };

    const onNext = () => {
        setQuestionStartAt(Date.now());
        setSelected(null);
        setPhase("question");
        setQuestion((prev) => ({ number: (prev?.number ?? 1) + 1, total: prev?.total }));
    };

    const onReveal = () => setPhase("result");

    s.on("connect", () => {
        s.emit("join", { pin, student });
    });

    s.on("game:start", onStart);
    s.on("question:next", onNext);
    s.on("answer:reveal", onReveal);


    // ✅ IMPORTANT: return a CLEANUP FUNCTION (not s.disconnect() directly)
    return () => {
        s.off("game:start", onStart);
        s.off("question:next", onNext);
        s.off("answer:reveal", onReveal);
        s.disconnect(); // ✅ this is void here
    };
    }, [pin, student]);


  const pick = (choice: "A" | "B" | "C" | "D") => {
    if (!sock) return;
    if (selected) return;

    setSelected(choice);

    const answerIndex =
      choice === "A" ? 0 : choice === "B" ? 1 : choice === "C" ? 2 : 3;

    const qNumber = question?.number ?? 1;
    const questionIndex = Math.max(0, qNumber - 1);

    const ms = questionStartAt ? Date.now() - questionStartAt : 0;
    const timeUsed = Math.max(0, Math.round(ms / 1000));

    // ✅ server expects this payload
    sock.emit("answer", { pin, questionIndex, answerIndex, timeUsed });
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <div className="px-4 pt-8">
        <p className="text-sm md:text-base font-semibold text-center">{titleText}</p>
      </div>

      {phase === "waiting" && student && (
        <div className="flex flex-col items-center px-4 pt-14">
          <div className="text-center space-y-6 mb-16">
            <h1 className={`${caesar.className} text-3xl md:text-4xl`}>BE READY TO ANSWER!</h1>
            <h2 className={`${caesar.className} text-2xl md:text-3xl`}>GOOD LUCK!</h2>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-white border shadow-sm overflow-hidden">
              <Image
                src={student.avatarSrc || "/icons/student.png"}
                alt="Avatar"
                width={80}
                height={80}
                priority
              />
            </div>
            <p className="text-xs md:text-sm text-gray-700 text-center">
              {student.studentId} - {student.name}
            </p>
          </div>
        </div>
      )}

      {phase === "question" && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-sm md:text-base font-medium text-center mb-10">
            Question {question?.number ?? 1}
          </p>

          <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-3xl">
            {(["A", "B", "C", "D"] as const).map((c) => (
              <button
                key={c}
                onClick={() => pick(c)}
                className={`h-24 md:h-28 rounded-lg shadow-md flex items-center justify-center
                  active:scale-[0.98] transition
                  ${selected && selected !== c ? "opacity-60" : ""} ${
                  selected === c ? "ring-4 ring-white/80" : ""
                } ${
                  c === "A"
                    ? "bg-red-600"
                    : c === "B"
                    ? "bg-indigo-700"
                    : c === "C"
                    ? "bg-green-600"
                    : "bg-yellow-300"
                }`}
                type="button"
              >
                <span className={`${caesar.className} text-4xl md:text-5xl ${c === "D" ? "text-black" : "text-white"}`}>
                  {c}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="px-4 pt-10 flex flex-col items-center">
          <p className="text-lg font-semibold">Answer revealed</p>
          <p className="text-sm text-gray-600 mt-2">Waiting for next question…</p>
        </div>
      )}
    </div>
  );
}
