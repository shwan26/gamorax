"use client";

import { useEffect, useState } from "react";
import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";
import { Settings, FileUp, Timer, BarChart3 } from "lucide-react";

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
  if (game.courseId !== courseId) return <div className="p-6">Invalid course/game.</div>;

  const base = `/course/${courseId}/game/${gameId}`;

  const menu = [
    { label: "General", href: `${base}/setting/general`, icon: Settings },
    { label: "Add File", href: `${base}/setting/addfile`, icon: FileUp },
    { label: "Timer", href: `${base}/setting/timer`, icon: Timer },
    { label: "Report", href: `${base}/setting/report`, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode}${
          course.section ? ` • Section ${course.section}` : ""
        }${course.semester ? ` • ${course.semester}` : ""}`}
      />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-8">
        <div
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
          style={{ minHeight: "calc(100vh - 220px)" }}
        >
          {/* dot pattern + glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

          <div className="relative flex h-full">
            {/* LEFT MENU */}
            <aside
              className="
                w-[220px] shrink-0 border-r border-slate-200/70 p-3
                dark:border-slate-800/70
              "
            >
              <p className="px-2 pb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Settings
              </p>

              <nav className="flex flex-col gap-2">
                {menu.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={[
                        "group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40",
                        active
                          ? "border border-[#00D4FF]/40 bg-white/85 text-slate-900 shadow-sm dark:bg-slate-950/65 dark:text-slate-50"
                          : "border border-transparent text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-950/60",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm",
                          active
                            ? "border-[#00D4FF]/40 bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]"
                            : "border-slate-200/80 bg-white/80 dark:border-slate-800/70 dark:bg-slate-950/60",
                        ].join(" ")}
                      >
                        <Icon
                          className={[
                            "h-4 w-4",
                            active ? "text-white" : "text-slate-700 dark:text-slate-200",
                          ].join(" ")}
                        />
                      </span>

                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* CONTENT */}
            <section className="flex-1 p-4 sm:p-6">
              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                  dark:border-slate-800/70 dark:bg-slate-950/55
                "
              >
                {children}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
