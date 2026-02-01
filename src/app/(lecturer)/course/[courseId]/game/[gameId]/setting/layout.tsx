// src/app/(lecturer)/course/[courseId]/game/[gameId]/setting/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";

import { useQuestions } from "@/src/hooks/useQuestions";
import { isQuestionComplete } from "@/src/lib/questionStorage";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getCourseById, type Course } from "@/src/lib/courseStorage";

import { Settings, FileUp, Timer, BarChart3, Link2 } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";

export default function SettingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();
  const pathname = usePathname() ?? "";

  const [game, setGame] = useState<Game | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string>("");

  // ✅ load questions (does not block nav)
  const { questions, loading: qLoading, error: qError } = useQuestions(gameId);

  const allGreen = useMemo(() => {
    if (qLoading) return false;
    return questions.length > 0 && questions.every(isQuestionComplete);
  }, [questions, qLoading]);

  // ✅ auth + load supabase data
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseId || !gameId) return;

      setLoadingMeta(true);
      setMetaError("");

      // Require logged-in user (lecturer)
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace(`/login?next=${encodeURIComponent(`/course/${courseId}/game/${gameId}/setting/general`)}`);
        return;
      }

      try {
        const [c, g] = await Promise.all([getCourseById(courseId), getGameById(gameId)]);
        if (!alive) return;

        setCourse(c);
        setGame(g);

        if (!c) setMetaError("Course not found.");
        else if (!g) setMetaError("Game not found.");
        else if (g.courseId !== courseId) setMetaError("Invalid course/game.");
      } catch (e: any) {
        if (!alive) return;
        setMetaError(e?.message ?? "Failed to load course/game.");
      } finally {
        if (!alive) return;
        setLoadingMeta(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseId, gameId, router]);

  if (!courseId || !gameId) return <div className="p-6">Missing route params.</div>;
  if (qError) return <div className="p-6">Failed to load questions: {qError}</div>;

  if (loadingMeta) return <div className="p-6">Loading...</div>;
  if (metaError) return <div className="p-6">{metaError}</div>;
  if (!game || !course) return <div className="p-6">Not found.</div>;

  const base = `/course/${courseId}/game/${gameId}`;

  const menu = [
    { label: "General", href: `${base}/setting/general`, icon: Settings },
    { label: "Add File", href: `${base}/setting/addfile`, icon: FileUp },
    { label: "Timer", href: `${base}/setting/timer`, icon: Timer },
    { label: "Report", href: `${base}/setting/reports`, icon: BarChart3 },
    { label: "Assignment", href: `${base}/setting/assignment`, icon: Link2 },
    { label: "Assignment Report", href: `${base}/setting/assignment/reports`, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode}${course.section ? ` • Section ${course.section}` : ""}${
          course.semester ? ` • ${course.semester}` : ""
        }`}
        canStartLive={allGreen}
        liveBlockReason="Some questions are incomplete. Please fix the red/grey ones before going live."
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
          <div className="relative flex h-full">
            <aside className="w-[180px] shrink-0 border-r border-slate-200/70 p-3 dark:border-slate-800/70">
              <p className="px-2 pb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Settings
              </p>

              <nav className="flex flex-col gap-2">
                {menu.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      prefetch
                      className={[
                        "group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40",
                        active
                          ? "border border-[#00D4FF]/40 bg-white/85 text-slate-900 shadow-sm dark:bg-slate-950/65 dark:text-slate-50"
                          : "border border-transparent text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-slate-950/60",
                      ].join(" ")}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <section className="flex-1 p-4 sm:p-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/55">
                {children}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
