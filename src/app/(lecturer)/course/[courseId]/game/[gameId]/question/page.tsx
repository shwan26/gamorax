"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";

import { getCourseById } from "@/src/lib/courseStorage";
import { getGameById } from "@/src/lib/gameStorage";
import { Question, getQuestions, saveQuestions } from "@/src/lib/questionStorage";

import QuestionList from "./QuestionList";
import QuestionEditorForm from "./QuestionEditorForm";
import DeleteModal from "./DeleteModal";

import { useLecturerGuard } from "../../../../../../../lib/useLecturerGuard";

function emptyAnswers() {
  return [
    { text: "", correct: false, image: undefined },
    { text: "", correct: false, image: undefined },
    { text: "", correct: false, image: undefined },
    { text: "", correct: false, image: undefined },
  ];
}

function createBlankQuestion(defaultTime: number): Question {
  return {
    id: crypto.randomUUID(),
    text: "",
    image: undefined,
    answers: emptyAnswers(),
    timeMode: "specific",
    time: defaultTime,
  };
}

export default function QuestionPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  // ✅ Guard (must run but do NOT early-return before hooks)
  const { loading: guardLoading } = useLecturerGuard(
    `/course/${courseId}/game/${gameId}/question`
  );

  const course = useMemo(() => (courseId ? getCourseById(courseId) : null), [courseId]);
  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);

  const valid = !!course && !!game && game.courseId === courseId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // drag
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Load
  useEffect(() => {
    if (guardLoading) return;
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
  }, [guardLoading, valid, gameId, game]);

  // Auto-save
  useEffect(() => {
    if (guardLoading) return;
    if (!valid) return;
    if (questions.length === 0) return;
    saveQuestions(gameId, questions);
  }, [guardLoading, valid, gameId, questions]);

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

  // ✅ Safe returns AFTER hooks
  if (guardLoading) return null;
  if (!valid || !course || !game || !activeQuestion) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <GameSubNavbar
        title={`${game.quizNumber} — ${course.courseCode} ${
          course.section ? `Section ${course.section}` : ""
        } ${course.semester ? course.semester : ""}`}
      />

      <div className="flex mt-6 h-[calc(100vh-160px)]">
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

        <div className="w-px bg-gray-300 mx-2" />

        <div className="flex-1 px-6 overflow-y-auto">
          <QuestionEditorForm
            question={activeQuestion}
            gameDefaultTime={game.timer.defaultTime}
            onUpdate={updateActiveQuestion}
          />
        </div>
      </div>

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
