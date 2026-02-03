"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import CoursePageSkeleton from "@/src/components/skeletons/CoursePageSkeleton";


import {
  ArrowLeft,
  Settings,
  Plus,
  BookOpen,
  Timer,
  Copy,
  Trash2,
  Search,
  Filter,
  ArrowUpAZ,
  ArrowDownZA,
} from "lucide-react";

/* ------------------------------ types ------------------------------ */

type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  section?: string | null;
  semester?: string | null;
};

type GameTimer = {
  mode: "automatic" | "manual";
  defaultTime: number;
};

type Game = {
  id: string;
  courseId: string;
  quizNumber: string;
  timer: GameTimer;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  createdAt?: string;
};

type QuestionRow = {
  id: string;
  gameId: string;
  position: number;
  text: string;
  image: string | null;
  timeMode: "default" | "specific";
  time: number;
};

type AnswerRow = {
  id: string;
  questionId: string;
  answerIndex: number;
  text: string;
  image: string | null;
  correct: boolean;
};

type SortKey = "quizNumber" | "timer";
type SortDir = "asc" | "desc";

/* ------------------------------ cards ------------------------------ */

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
            p-6 min-h-[120px]
          "
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
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
                    {game.timer?.mode ?? "automatic"} •{" "}
                    {game.timer?.defaultTime ?? 60}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

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

function CreateGameCard({ courseId }: { courseId: string }) {
  return (
    <Link
      href={`/course/${courseId}/game/create`}
      aria-label="Create new game"
      title="Create new game"
      className="
        group relative overflow-hidden rounded-3xl p-[1px]
        bg-gradient-to-r from-[#00D4FF] to-[#00D4FF]
        shadow-[0_0_0_1px_rgba(0,212,255,0.45),0_18px_55px_rgba(124,58,237,0.22)]
        transition-all hover:-translate-y-1
        hover:shadow-[0_0_0_2px_rgba(0,212,255,0.65),0_25px_80px_rgba(124,58,237,0.30)]
        focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/60
      "
    >
      <div
        className="
          relative rounded-[23px]
          border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/45
          min-h-[120px]
        "
      >
        {/* dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* glow blobs (light blue + purple) */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#00D4FF]/18 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[#7C3AED]/18 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative flex h-full flex-col">
          <div className="flex items-start gap-4">
            {/* icon badge */}
            <div className="rounded-2xl p-[1px] bg-gradient-to-br from-[#00D4FF] to-[#7C3AED] shadow-sm">
              <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-950/70">
                <Plus className="h-5 w-5 text-[#0B3B8F] dark:text-[#A7F3FF]" />
              </div>
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
        </div>
      </div>
    </Link>
  );
}


/* ------------------------------ page ------------------------------ */

export default function CoursePage() {
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string>("");

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("quizNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function requireUserOrRedirect(nextPath: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }
    return true;
  }

  async function loadAll() {
    if (!courseId) return;

    setLoading(true);
    setErrMsg("");

    const ok = await requireUserOrRedirect(`/course/${courseId}`);
    if (!ok) return;

    try {
      // course
      const { data: c, error: cErr } = await supabase
        .from("courses_api")
        .select("id, courseCode, courseName, section, semester")
        .eq("id", courseId)
        .single();

      if (cErr) {
        setCourse(null);
        setGames([]);
        setErrMsg("Load course error: " + cErr.message);
        return;
      }

      setCourse(c as Course);

      // games
      const { data: g, error: gErr } = await supabase
        .from("games_api")
        .select("*")
        .eq("courseId", courseId)
        .order("createdAt", { ascending: false });

      if (gErr) {
        setGames([]);
        setErrMsg("Load games error: " + gErr.message);
        return;
      }

      setGames((g ?? []) as Game[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleDelete(gameId: string) {
    if (!confirm("Delete this game and all its questions?")) return;

    const { error } = await supabase.from("games_api").delete().eq("id", gameId);
    if (error) return alert("Delete game error: " + error.message);

    loadAll();
  }

  async function handleDuplicate(gameId: string) {
    const original = games.find((g) => g.id === gameId);
    if (!original) return;

    // 1) create new game
    const { data: newGame, error: insErr } = await supabase
      .from("games_api")
      .insert({
        courseId: original.courseId,
        quizNumber: `${original.quizNumber} (Copy)`,
        timer: original.timer,
        shuffleQuestions: original.shuffleQuestions,
        shuffleAnswers: original.shuffleAnswers,
      })
      .select("id")
      .single();

    if (insErr) return alert("Duplicate game error: " + insErr.message);

    const newGameId = newGame.id as string;

    // 2) load old questions
    const { data: oldQs, error: qErr } = await supabase
      .from("questions_api")
      .select("id, position, text, image, timeMode, time")
      .eq("gameId", gameId)
      .order("position", { ascending: true });

    if (qErr) {
      alert("Duplicate questions load error: " + qErr.message);
      router.push(`/course/${courseId}/game/${newGameId}/question`);
      return;
    }

    const oldQuestions = (oldQs ?? []) as Array<
      Pick<QuestionRow, "id" | "position" | "text" | "image" | "timeMode" | "time">
    >;

    // 3) copy each question + answers
    for (const q of oldQuestions) {
      const { data: newQ, error: newQErr } = await supabase
        .from("questions_api")
        .insert({
          gameId: newGameId,
          position: q.position,
          text: q.text,
          image: q.image,
          timeMode: q.timeMode,
          time: q.time,
        })
        .select("id")
        .single();

      if (newQErr) {
        alert("Duplicate question insert error: " + newQErr.message);
        break;
      }

      const newQuestionId = newQ.id as string;

      const { data: oldAs, error: aErr } = await supabase
        .from("answers_api")
        .select("answerIndex, text, image, correct")
        .eq("questionId", q.id)
        .order("answerIndex", { ascending: true });

      if (aErr) {
        alert("Duplicate answers load error: " + aErr.message);
        continue;
      }

      const answers = (oldAs ?? []) as Array<
        Pick<AnswerRow, "answerIndex" | "text" | "image" | "correct">
      >;

      if (answers.length) {
        const { error: aInsErr } = await supabase.from("answers_api").insert(
          answers.map((a) => ({
            questionId: newQuestionId,
            answerIndex: a.answerIndex,
            text: a.text,
            image: a.image,
            correct: a.correct,
          }))
        );

        if (aInsErr) alert("Duplicate answers insert error: " + aInsErr.message);
      }
    }

    await loadAll();
    router.push(`/course/${courseId}/game/${newGameId}/question`);
  }

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = games.filter((g) => {
      const haystack = `${g.quizNumber} ${g.timer?.mode ?? ""} ${
        g.timer?.defaultTime ?? ""
      }`.toLowerCase();
      return haystack.includes(q);
    });

    const dir = sortDir === "asc" ? 1 : -1;

    return filtered.sort((a, b) => {
      if (sortKey === "timer") {
        const av = Number(a.timer?.defaultTime ?? 0);
        const bv = Number(b.timer?.defaultTime ?? 0);
        return (av - bv) * dir;
      }

      const av = (a.quizNumber ?? "").toString();
      const bv = (b.quizNumber ?? "").toString();
      return (
        av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true }) *
        dir
      );
    });
  }, [games, query, sortKey, sortDir]);

  if (!courseId) return <div className="p-6">Missing course id.</div>;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
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
                {course?.courseCode ?? "Course"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {course?.courseName ?? ""}
                {course?.section ? ` • Section ${course.section}` : ""}
                {course?.semester ? ` • ${course.semester}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/course/${courseId}/setting`}
              className="
                inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-semibold
                text-slate-800 shadow-sm backdrop-blur hover:bg-white transition-colors
                dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-100 dark:hover:bg-slate-950/70
              "
            >
              <Settings className="h-4 w-4" />
              Setting
            </Link>

          </div>
        </div>

        <div
          className="
            mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-3 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Search quiz title or timer"
                className="
                  w-full rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-3 py-2.5 text-sm
                  shadow-sm outline-none
                  focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                  dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                "
              />
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="
                    rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-8 py-2.5 text-sm
                    shadow-sm outline-none
                    focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-100
                  "
                >
                  <option value="quizNumber">Quiz Title</option>
                  <option value="timer">Timer</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="
                  inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                  text-slate-700 shadow-sm hover:bg-white transition-colors
                  dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80
                "
                aria-label="Toggle sort direction"
                title="Toggle sort direction"
              >
                {sortDir === "asc" ? (
                  <ArrowUpAZ className="h-4 w-4" />
                ) : (
                  <ArrowDownZA className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {loading ?  <CoursePageSkeleton /> : errMsg ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {errMsg}
          </div>
        ) : (
          <div className="mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CreateGameCard courseId={courseId} />

            {filteredSorted.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200">
                No games found.
              </div>
            ) : (
              filteredSorted.map((game) => (
                <GameCard
                  key={game.id}
                  courseId={courseId}
                  game={game}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
