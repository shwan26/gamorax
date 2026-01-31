// src/app/(lecturer)/course/[courseId]/game/create/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Copy } from "lucide-react";

import Navbar from "@/src/components/LecturerNavbar";
import { supabase } from "@/src/lib/supabaseClient";

import {
  createGame,
  duplicateGameToCourse,
  getAllMyGames,
  type Game,
} from "@/src/lib/gameStorage";

import { getCourses, type Course } from "@/src/lib/courseStorage";

type Mode = "new" | "copy";

function formatCourseLabel(c?: Course | null) {
  if (!c) return "Unknown course";
  const bits = [`${c.courseCode}`, c.courseName].filter(Boolean);
  const meta: string[] = [];
  if (c.section) meta.push(`Sec ${c.section}`);
  if (c.semester) meta.push(c.semester);
  return meta.length ? `${bits.join(" • ")} — ${meta.join(" • ")}` : bits.join(" • ");
}

export default function CreateGamePage() {
  const router = useRouter();
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();

  const [mode, setMode] = useState<Mode>("new");
  const [quizNumber, setQuizNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // copy-mode data
  const [loadingGames, setLoadingGames] = useState(false);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [sourceCourseId, setSourceCourseId] = useState<string>(courseId);
  const [sourceGameId, setSourceGameId] = useState<string>(""); // ✅ game dropdown

  // courses
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  async function requireUserOrRedirect(nextPath: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }
    return true;
  }

  // Load games + courses
  useEffect(() => {
    if (!courseId) return;

    (async () => {
      const ok = await requireUserOrRedirect(`/course/${courseId}/game/create`);
      if (!ok) return;

      setLoadingGames(true);
      setLoadingCourses(true);

      try {
        const [g, c] = await Promise.all([getAllMyGames(), getCourses()]);
        setAllGames(g);
        setCourses(c);
      } catch {
        // ignore
      } finally {
        setLoadingGames(false);
        setLoadingCourses(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // ✅ course list for "copy from" (only courses that actually have games)
  const copyCourses = useMemo(() => {
    const gameCourseIds = new Set(allGames.map((g) => g.courseId));
    const list = courses
      .filter((c) => gameCourseIds.has(c.id))
      .sort((a, b) => formatCourseLabel(a).localeCompare(formatCourseLabel(b)));
    return list;
  }, [courses, allGames]);

  // ✅ when switching to copy mode: set default course (first available) and reset game
  useEffect(() => {
    if (mode !== "copy") return;

    const currentCourseIsCopyable = copyCourses.some((c) => c.id === courseId);
    const selectedCourseIsCopyable = copyCourses.some((c) => c.id === sourceCourseId);

    // 1) Prefer current course if it has games
    const preferredCourseId = currentCourseIsCopyable
      ? courseId
      : selectedCourseIsCopyable
      ? sourceCourseId
      : copyCourses[0]?.id ?? "";

    // only update if needed (prevents re-renders)
    if (preferredCourseId !== sourceCourseId) {
      setSourceCourseId(preferredCourseId);
      setSourceGameId("");
      return;
    }

    // 2) If course is ok, ensure game belongs to it
    setSourceGameId((prev) => {
      const ok = allGames.some((g) => g.id === prev && g.courseId === preferredCourseId);
      return ok ? prev : "";
    });
  }, [mode, copyCourses, courseId, sourceCourseId, allGames]);


  // ✅ games under selected course
  const gamesInSelectedCourse = useMemo(() => {
    if (!sourceCourseId) return [];
    return allGames
      .filter((g) => g.courseId === sourceCourseId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [allGames, sourceCourseId]);

  // ✅ when course changes, clear game if it doesn’t belong
  useEffect(() => {
    if (!sourceCourseId) {
      setSourceGameId("");
      return;
    }
    setSourceGameId((prev) => {
      const ok = gamesInSelectedCourse.some((g) => g.id === prev);
      return ok ? prev : "";
    });
  }, [sourceCourseId, gamesInSelectedCourse]);

  async function handleCreate() {
    if (!courseId) return;

    const title = quizNumber.trim();
    if (!title) {
      alert("Please fill quiz number/title.");
      return;
    }

    const ok = await requireUserOrRedirect(`/course/${courseId}/game/create`);
    if (!ok) return;

    setSaving(true);
    try {
      if (mode === "new") {
        const { id } = await createGame({
          courseId,
          quizNumber: title,
          timer: { mode: "automatic", defaultTime: 60 },
          shuffleQuestions: false,
          shuffleAnswers: false,
        });

        router.push(`/course/${courseId}/game/${id}/question`);
        return;
      }

      // mode === "copy"
      if (!sourceCourseId) {
        alert("Please choose a course to copy from.");
        return;
      }
      if (!sourceGameId) {
        alert("Please choose a game to copy from.");
        return;
      }

      const { newGameId } = await duplicateGameToCourse({
        sourceGameId,
        targetCourseId: courseId,
        newQuizNumber: title,
      });

      router.push(`/course/${courseId}/game/${newGameId}/question`);
    } catch (e: any) {
      alert(e?.message ?? "Create failed");
    } finally {
      setSaving(false);
    }
  }

  if (!courseId) return <div className="p-6">Missing course id.</div>;

  const loadingAny = loadingGames || loadingCourses;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
        <div className="w-full max-w-md">
          <Link
            href={`/course/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>

          <div
            className="
              mt-4 overflow-hidden rounded-3xl p-[1px]
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              shadow-[0_12px_30px_rgba(37,99,235,0.10)]
              dark:shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_18px_50px_rgba(56,189,248,0.10)]
            "
          >
            <div
              className="
                relative rounded-[23px] bg-white p-6 ring-1 ring-slate-200/70
                dark:bg-[#071A33] dark:ring-slate-700/60
                sm:p-7
              "
            >
              <div className="relative flex items-start gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-700/70 dark:bg-[#0B2447]">
                  <Gamepad2 className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    Create game
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Create a new game or copy from an existing one.
                  </p>
                </div>
              </div>

              {/* MODE TOGGLE */}
              <div className="relative mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={[
                    "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition",
                    mode === "new"
                      ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
                      : "border border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-700/70 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:bg-slate-950/55",
                  ].join(" ")}
                >
                  New
                </button>

                <button
                  type="button"
                  onClick={() => setMode("copy")}
                  className={[
                    "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition inline-flex items-center justify-center gap-2",
                    mode === "copy"
                      ? "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
                      : "border border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-700/70 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:bg-slate-950/55",
                  ].join(" ")}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>

              <div className="relative mt-6 space-y-4">
                {/* TITLE */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Quiz Number / Title
                  </label>

                  <input
                    value={quizNumber}
                    onChange={(e) => setQuizNumber(e.target.value)}
                    placeholder={mode === "copy" ? "Eg. Game 1 (Copy)" : "Eg. Game 1"}
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                  />
                </div>

                {/* COPY CONTROLS */}
                {mode === "copy" && (
                  <>
                    {/* 1) Course dropdown */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Copy from course
                      </label>

                      <select
                        value={sourceCourseId}
                        onChange={(e) => setSourceCourseId(e.target.value)}
                        disabled={loadingAny || saving}
                        className="
                          w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                          shadow-sm outline-none
                          focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed
                          dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                        "
                      >
                        <option value="">
                          {loadingAny ? "Loading courses..." : "-- Select a course --"}
                        </option>

                        {copyCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {formatCourseLabel(c)}
                          </option>
                        ))}
                      </select>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Pick the course where the source game lives.
                      </p>
                    </div>

                    {/* 2) Game dropdown */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Copy from game
                      </label>

                      <select
                        value={sourceGameId}
                        onChange={(e) => setSourceGameId(e.target.value)}
                        disabled={loadingAny || saving || !sourceCourseId}
                        className="
                          w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                          shadow-sm outline-none
                          focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed
                          dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                        "
                      >
                        <option value="">
                          {!sourceCourseId
                            ? "Select a course first..."
                            : loadingAny
                            ? "Loading games..."
                            : gamesInSelectedCourse.length
                            ? "-- Select a game --"
                            : "No games in this course"}
                        </option>

                        {gamesInSelectedCourse.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.quizNumber}
                          </option>
                        ))}
                      </select>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        This will copy all questions & answers.
                      </p>
                    </div>
                  </>
                )}

                {/* ACTION */}
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={
                    saving ||
                    (mode === "copy" && (!sourceCourseId || !sourceGameId))
                  }
                  className="
                    w-full rounded-xl py-3 text-sm font-semibold text-white
                    bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                    shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                    hover:opacity-95 active:scale-[0.99] transition
                    focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                    disabled:opacity-60 disabled:cursor-not-allowed
                  "
                >
                  {saving
                    ? mode === "copy"
                      ? "Copying..."
                      : "Creating..."
                    : mode === "copy"
                    ? "Copy & Create"
                    : "Create"}
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Default settings: automatic timer (60s), no shuffle.
                </p>
              </div>
            </div>
          </div>

          {mode === "copy" && !loadingAny && copyCourses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              You don’t have any existing games to copy yet.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
