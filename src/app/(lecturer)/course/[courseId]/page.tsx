"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";

import { getCourseById } from "@/src/lib/courseStorage";
import { getGamesByCourseId, getGameById, saveGame, deleteGame, type Game } from "@/src/lib/gameStorage";
import { getQuestions, saveQuestions, type Question } from "@/src/lib/questionStorage";

function duplicateQuestions(oldGameId: string, newGameId: string) {
  const oldQs = getQuestions(oldGameId);

  const copied: Question[] = oldQs.map((q) => ({
    ...q,
    id: crypto.randomUUID(), // new question id
    answers: q.answers.map((a) => ({ ...a })), // deep copy
  }));

  saveQuestions(newGameId, copied);
}

export default function CoursePage() {
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const router = useRouter();

  const course = useMemo(() => (courseId ? getCourseById(courseId) : null), [courseId]);
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


    // copy questions
    duplicateQuestions(gameId, newId);

    refresh();
    router.push(`/course/${courseId}/game/${newId}/question`);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{course.courseCode}</h2>
            <p className="text-sm text-gray-700">
              {course.courseName} • Section {course.section} • {course.semester}
            </p>
          </div>

          <div className="flex gap-3">
            {/* Course Setting */}
            <Link
              href={`/course/${courseId}/setting`}
              className="border bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-md font-semibold shadow-sm"
            >
              Setting
            </Link>

            {/* Create New Game */}
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
              {/* Main card link */}
              <Link
                href={`/course/${courseId}/game/${game.id}/question`}
                className="w-64 h-36 bg-gradient-to-b from-[#6AB6E9] to-[#CDE9FB]
                           rounded-xl shadow-md hover:scale-105 transition
                           flex flex-col items-center justify-center text-center"
              >
                <p className="font-semibold">{game.quizNumber}</p>
                <p className="text-sm">
                  Timer: {game.timer.mode} • {game.timer.defaultTime}s
                </p>
              </Link>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(game.id);
                }}
                className="absolute top-2 right-2 text-xs bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                title="Delete"
              >
                ✕
              </button>

              {/* Duplicate button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDuplicate(game.id);
                }}
                className="absolute bottom-2 right-2 text-xs bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                title="Duplicate"
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
