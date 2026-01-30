"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";

import { getCourseById } from "@/src/lib/courseStorage";
import { getGameById } from "@/src/lib/gameStorage";
import {
  type Question,
  getQuestions,
  saveQuestions,
  isQuestionComplete
} from "@/src/lib/questionStorage";

import QuestionList from "@/src/components/question-edit/QuestionList";
import QuestionEditorForm from "@/src/components/question-edit/QuestionEditorForm";
import DeleteModal from "@/src/components/question-edit/DeleteModal";

/* ------------------------------ helpers ------------------------------ */

function emptyAnswers(n = 4) {
  return Array.from({ length: n }, () => ({ text: "", correct: false, image: undefined }));
}

function createBlankQuestion(defaultTime: number): Question {
  return {
    id: crypto.randomUUID(),
    type: "multiple_choice",     // ✅ default
    text: "",
    image: undefined,
    answers: emptyAnswers(4),
    matches: Array.from({ length: 5 }, () => ({ left: "", right: "" })),
    acceptedAnswers: [""],
    timeMode: "specific",
    time: defaultTime,
  };
}

/* ------------------------------ page ------------------------------ */

export default function QuestionPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const course = useMemo(
    () => (courseId ? getCourseById(courseId) : null),
    [courseId]
  );
  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);

  const valid = !!course && !!game && game.courseId === courseId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const allGreen = questions.length > 0 && questions.every((q) => isQuestionComplete(q));

  // drag
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Load
  useEffect(() => {
    if (!valid || !game) return;

    const stored = getQuestions(gameId);
    if (stored.length > 0) {
      setQuestions(stored);
      setActiveIndex(0);
    } else {
      const first = createBlankQuestion(game.timer.defaultTime);
      setQuestions([first]);
      setActiveIndex(0);
    }
  }, [valid, gameId, game]);

  // Auto-save
  useEffect(() => {
    if (!valid) return;
    if (questions.length === 0) return;
    saveQuestions(gameId, questions);
  }, [valid, gameId, questions]);

  const activeQuestion = questions[activeIndex];

  function addQuestion() {
    if (!game) return;
    setQuestions((prev) => [...prev, createBlankQuestion(game.timer.defaultTime)]);
    setActiveIndex(questions.length);
  }

  function duplicateQuestion(index: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      const duplicated: Question = {
        ...copy[index],
        id: crypto.randomUUID(),
        answers: copy[index].answers.map((a) => ({ ...a })),
        matches: copy[index].matches?.map((m) => ({ ...m })),
        acceptedAnswers: copy[index].acceptedAnswers ? [...copy[index].acceptedAnswers] : undefined,
      };
      
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
    setActiveIndex(index + 1);
  }

  function requestDelete(index: number) {
    setDeleteIndex(index);
  }

  function confirmDelete() {
    if (deleteIndex === null) return;

    if (questions.length === 1) {
      alert("At least one question is required.");
      setDeleteIndex(null);
      return;
    }

    const idx = deleteIndex;

    setQuestions((prev) => prev.filter((_, i) => i !== idx));

    setActiveIndex((curr) => {
      if (curr === idx) return Math.max(0, idx - 1);
      if (curr > idx) return curr - 1;
      return curr;
    });

    setDeleteIndex(null);
  }

  function updateActiveQuestion(patch: Partial<Question>) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[activeIndex] = { ...copy[activeIndex], ...patch };
      return copy;
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;

    setQuestions((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });

    setActiveIndex((curr) => {
      if (curr === dragIndex) return targetIndex;
      if (dragIndex < curr && targetIndex >= curr) return curr - 1;
      if (dragIndex > curr && targetIndex <= curr) return curr + 1;
      return curr;
    });

    setDragIndex(null);
  }

  if (!valid || !course || !game || !activeQuestion) return null;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode}${
          course.section ? ` • Section ${course.section}` : ""
        }${course.semester ? ` • ${course.semester}` : ""}`}
        canStartLive = {allGreen}
        liveBlockReason ="Some questions are incomplete. Please fix the red/grey ones before going live."
      />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-8">
        <div
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
          style={{ height: "calc(100vh - 220px)" }}
        >
          {/* dot pattern + glow like other pages */}
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
            {/* LEFT LIST */}
            <aside
              className="
                w-[90px] shrink-0
                border-r border-slate-200/70
                dark:border-slate-800/70
                sm:w-[100px]
                lg:w-[120px]
              "
            >
              <QuestionList
                questions={questions}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
                onAdd={addQuestion}
                onDuplicate={duplicateQuestion}
                onDelete={requestDelete}
                dragIndex={dragIndex}
                setDragIndex={setDragIndex}
                onDrop={handleDrop}
              />
            </aside>


            {/* RIGHT EDITOR */}
            <section className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div>
                <QuestionEditorForm
                  question={activeQuestion}
                  gameDefaultTime={game.timer.defaultTime}
                  onUpdate={updateActiveQuestion}
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      <DeleteModal
        open={deleteIndex !== null}
        title="Delete Question?"
        description="This action cannot be undone."
        onCancel={() => setDeleteIndex(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
