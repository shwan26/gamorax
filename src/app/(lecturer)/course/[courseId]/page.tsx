"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";

import { getCourseById } from "@/src/lib/courseStorage";
import {
  getGamesByCourseId,
  getGameById,
  saveGame,
  deleteGame,
  type Game,
} from "@/src/lib/gameStorage";
import { getQuestions, saveQuestions, type Question } from "@/src/lib/questionStorage";
import {
  ArrowLeft,
  Settings,
  Plus,
  BookOpen,
  Timer,
  Copy,
  Trash2,
} from "lucide-react";

function duplicateQuestions(oldGameId: string, newGameId: string) {
  const oldQs = getQuestions(oldGameId);

  const copied: Question[] = oldQs.map((q) => ({
    ...q,
    id: crypto.randomUUID(),
    answers: q.answers.map((a) => ({ ...a })),
  }));

  saveQuestions(newGameId, copied);
}

function GameCard({
  courseId,
  game,
  onDelete,
  onDuplicate,
}: {
  courseId: string;
  game: Game;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="relative">
      <Link
        href={`/course/${courseId}/game/${game.id}/question`}
        className="
          group relative block overflow-hidden rounded-3xl p-[1px]
          bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
          shadow-[0_12px_30px_rgba(37,99,235,0.10)]
          transition-all hover:-translate-y-1
          hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)]
          focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
        "
      >
        <div
          className="
            relative rounded-[23px]
            bg-white ring-1 ring-slate-200/70
            dark:bg-[#071A33] dark:ring-slate-700/60
            p-6 min-h-[160px]
          "
        >
          {/* dots */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          {/* glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#00D4FF]/12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity dark:bg-[#3B82F6]/18" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
                <BookOpen className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
                  {game.quizNumber}
                </p>

                <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Timer className="h-4 w-4 text-slate-400" />
                  <span className="truncate">
                    {game.timer.mode} • {game.timer.defaultTime}s
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 flex justify-end">
              <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-300">
                Open
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* action buttons */}
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDuplicate(game.id);
          }}
          className="
            inline-flex h-9 w-9 items-center justify-center rounded-full
            border border-slate-200/80 bg-white/80 shadow-sm
            hover:bg-white transition-colors
            dark:border-slate-800/70 dark:bg-slate-950/60 dark:hover:bg-slate-950/80
            focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
          "
          title="Duplicate"
          aria-label="Duplicate"
        >
          <Copy className="h-4 w-4 text-slate-700 dark:text-slate-200" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(game.id);
          }}
          className="
            inline-flex h-9 w-9 items-center justify-center rounded-full
            border border-red-200/80 bg-white/80 shadow-sm
            hover:bg-white transition-colors
            dark:border-red-900/40 dark:bg-slate-950/60 dark:hover:bg-slate-950/80
            focus:outline-none focus:ring-2 focus:ring-red-400/40
          "
          title="Delete"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
        </button>
      </div>
    </div>
  );
}

export default function CoursePage() {
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const router = useRouter();

  const course = useMemo(
    () => (courseId ? getCourseById(courseId) : null),
    [courseId]
  );
  const [games, setGames] = useState<Game[]>([]);

  function refresh() {
    if (!courseId) return;
    setGames(getGamesByCourseId(courseId));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!course) return null;

  function handleDelete(gameId: string) {
    if (!confirm("Delete this game and all its questions?")) return;
    deleteGame(gameId);
    refresh();
  }

  function handleDuplicate(gameId: string) {
    const original = getGameById(gameId);
    if (!original) return;

    const newId = crypto.randomUUID();

    saveGame({
      id: newId,
      courseId: original.courseId,
      quizNumber: `${original.quizNumber} (Copy)`,
      timer: { ...original.timer },
      shuffleQuestions: original.shuffleQuestions,
      shuffleAnswers: original.shuffleAnswers,
    });

    duplicateQuestions(gameId, newId);

    refresh();
    router.push(`/course/${courseId}/game/${newId}/question`);
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
        {/* top row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {course.courseCode}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {course.courseName}{" "}
                {course.section ? `• Section ${course.section}` : ""}{" "}
                {course.semester ? `• ${course.semester}` : ""}
              </p>
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Link
              href={`/course/${courseId}/setting`}
              className="
                inline-flex items-center justify-center gap-2 rounded-xl
                border border-slate-200/80 bg-white/70 px-4 py-2.5 text-sm font-semibold
                text-slate-800 shadow-sm hover:bg-white transition-colors
                dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-950/80
              "
            >
              <Settings className="h-4 w-4" />
              Setting
            </Link>

            <Link
              href={`/course/${courseId}/game/create`}
              className="
                inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white
                bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                hover:opacity-95 active:scale-[0.99] transition
              "
            >
              <Plus className="h-4 w-4" />
              Create new game
            </Link>
          </div>
        </div>

        {/* grid */}
        <div className="mt-6 grid items-start gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* create card first */}
          <Link
            href={`/course/${courseId}/game/create`}
            className="
              group relative overflow-hidden rounded-3xl p-[1px]
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              shadow-[0_12px_30px_rgba(37,99,235,0.10)]
              transition-all hover:-translate-y-1
              hover:shadow-[0_0_0_1px_rgba(56,189,248,0.30),0_18px_55px_rgba(56,189,248,0.16)]
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
            "
          >
            <div className="relative rounded-[23px] bg-white ring-1 ring-slate-200/70 dark:bg-[#071A33] dark:ring-slate-700/60 p-6 min-h-[160px]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700/70 dark:bg-[#071A33]">
                    <Plus className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      Create new game
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      Set timer, shuffle options, and start building questions.
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex justify-end">
                  <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-300">
                    New
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {games.map((game) => (
            <GameCard
              key={game.id}
              courseId={courseId}
              game={game}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>

        {games.length === 0 && (
          <div
            className="
              mt-10 rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-center text-sm text-slate-600 backdrop-blur
              dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-300
            "
          >
            No games yet. Create your first game to start adding questions.
          </div>
        )}
      </main>
    </div>
  );
}
