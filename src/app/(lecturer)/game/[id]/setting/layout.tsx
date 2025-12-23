"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getGameById, Game } from "@/src/lib/gameStorage";

export default function SettingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id?: string }>();
  const id = (params?.id ?? "").toString();

  const pathname = usePathname() ?? "";

  const [game, setGame] = useState<Game | null>(null);

  /* ✅ CLIENT-SIDE LOAD ONLY */
  useEffect(() => {
    if (!id) return;
    const g = getGameById(id);
    setGame(g);
  }, [id]);

  if (!game) return null; // prevents hydration mismatch

  const menu = [
    { label: "General", href: `/game/${id}/setting/general` },
    { label: "Add File", href: `/game/${id}/setting/addfile` },
    { label: "Timer", href: `/game/${id}/setting/timer` },
    { label: "Report", href: `/game/${id}/setting/report` },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <GameSubNavbar
        title={`${game.quizNumber} — ${game.courseCode} (${game.section}) ${game.semester}`}
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
                  active
                    ? "font-semibold text-blue-700"
                    : "text-gray-600 hover:text-blue-700"
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
