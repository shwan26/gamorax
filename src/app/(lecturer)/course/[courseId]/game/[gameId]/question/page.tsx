"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";

import {
  type Question,
  type Answer,
  getQuestions,
  saveQuestions,
  isQuestionComplete,
} from "@/src/lib/questionStorage";

import QuestionList from "@/src/components/question-edit/QuestionList";
import QuestionEditorForm from "@/src/components/question-edit/QuestionEditorForm";
import DeleteModal from "@/src/components/question-edit/DeleteModal";
import QuestionPageSkeleton from "@/src/components/skeletons/QuestionPageSkeleton";
import { supabase } from "@/src/lib/supabaseClient";

/* ------------------------------ helpers ------------------------------ */

function emptyAnswers(n = 4): Answer[] {
  return Array.from({ length: n }, () => ({ text: "", correct: false, image: null }));
}

function createBlankQuestion(defaultTime: number): Question {
  return {
    id: crypto.randomUUID(),
    type: "multiple_choice",
    text: "",
    image: null,
    answers: emptyAnswers(4),
    matches: Array.from({ length: 5 }, () => ({ left: "", right: "" })),
    acceptedAnswers: [""],
    timeMode: "specific",
    time: defaultTime,
  };
}

type CourseRow = {
  id: string;
  courseCode: string;
  courseName: string;
  section?: string | null;
  semester?: string | null;
};

type GameRow = {
  id: string;
  courseId: string;
  quizNumber: string;
  timer: { mode: "automatic" | "manual"; defaultTime: number };
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
};





/* ------------------------------ page ------------------------------ */

export default function QuestionPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();
  const router = useRouter();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [game, setGame] = useState<GameRow | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const allGreen = questions.length > 0 && questions.every((q) => isQuestionComplete(q));

  // drag
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // loading/saving state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // debounce save
  const saveTimer = useRef<number | null>(null);

  const valid = !!courseId && !!gameId && !!course && !!game && game.courseId === courseId;
  const activeQuestion = questions[activeIndex];

  async function requireLecturerOrRedirect(nextPath: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    const { data: prof, error } = await supabase.from("my_profile_api").select("role").single();
    if (error || !prof || prof.role !== "lecturer") {
      await supabase.auth.signOut();
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    return true;
  }

  async function loadAll() {
    if (!courseId || !gameId) return;

    setLoading(true);

    const ok = await requireLecturerOrRedirect(`/course/${courseId}/game/${gameId}/question`);
    if (!ok) return;

    // load course
    const { data: c, error: cErr } = await supabase
      .from("courses_api")
      .select("id, courseCode, courseName, section, semester")
      .eq("id", courseId)
      .single();

    if (cErr) {
      setLoading(false);
      alert("Load course error: " + cErr.message);
      return;
    }
    setCourse(c as CourseRow);

    // load game
    const { data: g, error: gErr } = await supabase
      .from("games_api")
      .select("id, courseId, quizNumber, timer, shuffleQuestions, shuffleAnswers")
      .eq("id", gameId)
      .single();

    if (gErr) {
      setLoading(false);
      alert("Load game error: " + gErr.message);
      return;
    }
    setGame(g as GameRow);

    // ✅ now use shared storage (no duplicates)
    const built = await getQuestions(gameId);

    if (built.length === 0) {
      const first = createBlankQuestion(g.timer?.defaultTime ?? 60);

      // Create first question row
      const { error: insErr } = await supabase.from("questions_api").insert({
        id: first.id,
        gameId,
        position: 1,
        type: first.type,
        text: first.text,
        image: first.image,
        timeMode: first.timeMode,
        time: first.time,
        matches: first.matches ?? null,
        acceptedAnswers: first.acceptedAnswers ?? null,
      });

      if (insErr) {
        setLoading(false);
        alert("Create first question error: " + insErr.message);
        return;
      }

      // Save answers using shared save (will do 3..5 logic correctly)
      await saveQuestions(gameId, [first]);

      setQuestions([first]);
      setActiveIndex(0);
      setLoading(false);
      return;
    }

    setQuestions(built);
    setActiveIndex(0);
    setLoading(false);
  }

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, gameId]);


  // Debounced autosave to Supabase
  useEffect(() => {
    if (!valid) return;
    if (!questions.length) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true);
        await saveQuestions(gameId, questions);
      } catch (e: any) {
        console.error(e);
        alert("Auto-save error: " + (e?.message ?? String(e)));
      } finally {
        setSaving(false);
      }
    }, 650);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [valid, gameId, questions]);


  function addQuestion() {
    if (!game) return;
    setQuestions((prev) => [...prev, createBlankQuestion(game.timer?.defaultTime ?? 60)]);
    setActiveIndex(questions.length);
  }

  function duplicateQuestion(index: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      const src = copy[index];

      const duplicated: Question = {
        ...src,
        id: crypto.randomUUID(),
        answers: (src.answers ?? []).map((a) => ({ ...a })),
        matches: src.matches ? src.matches.map((m) => ({ ...m })) : undefined,
        acceptedAnswers: src.acceptedAnswers ? [...src.acceptedAnswers] : undefined,
      };

      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
    setActiveIndex(index + 1);
  }

  function requestDelete(index: number) {
    setDeleteIndex(index);
  }

  async function confirmDelete() {
    if (deleteIndex === null) return;
    if (questions.length === 1) {
      alert("At least one question is required.");
      setDeleteIndex(null);
      return;
    }

    const idx = deleteIndex;
    const qid = questions[idx]?.id;

    // delete in DB immediately
    if (qid) {
      const { error } = await supabase.from("questions_api").delete().eq("id", qid);
      if (error) alert("Delete question error: " + error.message);
    }

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

  if (loading) return <QuestionPageSkeleton />;
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

            <section className="flex-1 overflow-y-auto p-4 sm:p-6">
              <QuestionEditorForm
                question={activeQuestion}
                gameDefaultTime={game.timer?.defaultTime ?? 60}
                onUpdate={updateActiveQuestion}
              />
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
