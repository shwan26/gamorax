"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";

export default function SettingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const pathname = usePathname() ?? "";

  const [game, setGame] = useState<Game | null>(null);
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!courseId || !gameId) return;

    const g = getGameById(gameId);
    const c = getCourseById(courseId);

    setGame(g);
    setCourse(c);
  }, [courseId, gameId]);

  if (!courseId || !gameId) return <div className="p-6">Missing route params.</div>;
  if (!game || !course) return <div className="p-6">Loading...</div>;

  // (optional) guard mismatch
  if (game.courseId !== courseId) return <div className="p-6">Invalid course/game.</div>;

  const base = `/course/${courseId}/game/${gameId}`;

  const menu = [
    { label: "General", href: `${base}/setting/general` },
    { label: "Add File", href: `${base}/setting/addfile` },
    { label: "Timer", href: `${base}/setting/timer` },
    { label: "Report", href: `${base}/setting/report` },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode} • ${course.section ? `Section ${course.section}` : ""}• ${course.semester? course.semester : ""}`}
      />

      <div className="flex px-6 mt-4 min-h-[calc(100vh-140px)]">
        {/* LEFT MENU */}
        <div className="w-32 pr-4 border-r flex flex-col gap-3 text-sm">
          {menu.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`transition ${
                  active ? "font-semibold text-blue-700" : "text-gray-600 hover:text-blue-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="flex-1 px-10">{children}</div>
      </div>
    </div>
  );
}
