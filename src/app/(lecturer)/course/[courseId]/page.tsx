"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";

import { supabase } from "@/src/lib/supabaseClient";
import { useLecturerGuard } from "../../../../lib/useLecturerGuard";

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

export default function CoursePage() {
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const router = useRouter();

  // ✅ Guard
  const { loading: guardLoading } = useLecturerGuard(`/course/${courseId || ""}`);

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [games, setGames] = useState<Game[]>([]);

  async function loadAll() {
    if (!courseId) {
      setLoading(false);
      return;
    }

    // 1) load course
    const { data: c, error: cErr } = await supabase
      .from("courses_api")
      .select("id, courseCode, courseName, section, semester")
      .eq("id", courseId)
      .single();

    if (cErr) {
      alert("Load course error: " + cErr.message);
      setCourse(null);
      setGames([]);
      setLoading(false);
      return;
    }

    setCourse(c as Course);

    // 2) load games
    const { data: g, error: gErr } = await supabase
      .from("games_api")
      .select("*")
      .eq("courseId", courseId)
      .order("createdAt", { ascending: false });

    if (gErr) {
      alert("Load games error: " + gErr.message);
      setGames([]);
      setLoading(false);
      return;
    }

    setGames((g ?? []) as Game[]);
    setLoading(false);
  }

  useEffect(() => {
    if (guardLoading) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardLoading, courseId]);

  async function handleDelete(gameId: string) {
    if (!confirm("Delete this game?")) return;

    const { error } = await supabase.from("games_api").delete().eq("id", gameId);
    if (error) return alert("Delete game error: " + error.message);

    loadAll();
  }

  async function handleDuplicate(gameId: string) {
    // We only duplicate the game row here.
    // (Questions duplication will be added after your Questions pages move to Supabase)
    const original = games.find((g) => g.id === gameId);
    if (!original) return;

    const { data, error } = await supabase
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

    if (error) return alert("Duplicate error: " + error.message);

    // go to new game's question page (next step we convert that page to Supabase)
    router.push(`/course/${courseId}/game/${data.id}/question`);
  }

  // ✅ Safe returns AFTER hooks are declared
  if (guardLoading) return null;
  if (!courseId) return <div className="p-6">Missing course id.</div>;
  if (loading) return <div className="p-6">Loading...</div>;
  if (!course) return <div className="p-6">Course not found.</div>;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{course.courseCode}</h2>
            <p className="text-sm text-gray-700">
              {course.courseName}{" "}
              {course.section ? `Section ${course.section}` : ""}{" "}
              {course.semester ? course.semester : ""}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/course/${courseId}/setting`}
              className="border bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-md font-semibold shadow-sm"
            >
              Setting
            </Link>

            <Link
              href={`/course/${courseId}/game/create`}
              className="bg-[#3B8ED6] hover:bg-[#2F79B8] text-white px-4 py-2 rounded-md font-semibold shadow-md"
            >
              + Create new game
            </Link>
          </div>
        </div>

        <div className="flex gap-6 flex-wrap">
          {games.map((game) => (
            <div key={game.id} className="relative">
              <Link
                href={`/course/${courseId}/game/${game.id}/question`}
                className="w-64 h-36 bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                           rounded-xl shadow-md hover:scale-105 transition
                           flex flex-col items-center justify-center text-center"
              >
                <p className="font-semibold">{game.quizNumber}</p>
                <p className="text-sm">
                  Timer: {game.timer?.mode ?? "automatic"} •{" "}
                  {game.timer?.defaultTime ?? 60}s
                </p>
              </Link>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(game.id);
                }}
                className="absolute top-2 right-2 text-xs bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                title="Delete"
                type="button"
              >
                ✕
              </button>

              {/* Duplicate */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDuplicate(game.id);
                }}
                className="absolute bottom-2 right-2 text-xs bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                title="Duplicate"
                type="button"
              >
                ⧉
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
