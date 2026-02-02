"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import GameSubNavbar from "@/src/components/GameSubNavbar";

import {
  type Question,
  type Answer,
  isQuestionComplete,
} from "@/src/lib/questionStorage";


import QuestionList from "@/src/components/question-edit/QuestionList";
import QuestionEditorForm from "@/src/components/question-edit/QuestionEditorForm";
import DeleteModal from "@/src/components/question-edit/DeleteModal";

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

type QuestionApiRow = {
  id: string;
  gameId: string;
  position: number;
  type: "multiple_choice" | "true_false" | "matching" | "input";
  text: string;
  image: string | null;
  timeMode: "default" | "specific";
  time: number;
  matches: any | null; // jsonb
  acceptedAnswers: string[] | null;
};

type AnswerApiRow = {
  id: string;
  questionId: string;
  answerIndex: number;
  text: string;
  image: string | null;
  correct: boolean;
};

function normalizeQuestion(row: QuestionApiRow, answers: AnswerApiRow[]): Question {
  const qType = row.type ?? "multiple_choice";

  // MC/TF use answers table
  let localAnswers: Answer[] = [];
  if (qType === "multiple_choice" || qType === "true_false") {
    const sorted = [...answers].sort((a, b) => a.answerIndex - b.answerIndex);
    localAnswers = sorted.map((a) => ({
      text: a.text ?? "",
      correct: !!a.correct,
      image: a.image ?? null,
    }));

    // Ensure we always have 4 slots for UI consistency
    while (localAnswers.length < 4) localAnswers.push({ text: "", correct: false, image: null });
    if (localAnswers.length > 4) localAnswers = localAnswers.slice(0, 4);
  } else {
    // matching/input: keep a dummy 4 answers so UI won't explode if it expects it
    localAnswers = emptyAnswers(4);
  }

  return {
    id: row.id,
    type: qType,
    text: row.text ?? "",
    image: row.image ?? null,
    answers: localAnswers,
    matches: Array.isArray(row.matches) ? row.matches : (Array.from({ length: 5 }, () => ({ left: "", right: "" }))),
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [""],
    timeMode: row.timeMode ?? "specific",
    time: Number(row.time ?? 60),
  };
}

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

    // load questions
    const { data: qs, error: qErr } = await supabase
      .from("questions_api")
      .select("id, gameId, position, type, text, image, timeMode, time, matches, acceptedAnswers")
      .eq("gameId", gameId)
      .order("position", { ascending: true });

    if (qErr) {
      setLoading(false);
      alert("Load questions error: " + qErr.message);
      return;
    }

    const qRows = (qs ?? []) as QuestionApiRow[];

    if (qRows.length === 0) {
      const first = createBlankQuestion((g as GameRow).timer?.defaultTime ?? 60);

      const { data: newQ, error: insErr } = await supabase
        .from("questions_api")
        .insert({
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
        })
        .select("id")
        .single();

      // ✅ If duplicate position happens, someone already created it → just reload from DB
      if (insErr) {
        const msg = insErr.message?.toLowerCase() ?? "";
        if (msg.includes("questions_unique_position") || msg.includes("duplicate key")) {
          // re-fetch questions and continue normally
          const { data: qs2, error: qErr2 } = await supabase
            .from("questions_api")
            .select("id, gameId, position, type, text, image, timeMode, time, matches, acceptedAnswers")
            .eq("gameId", gameId)
            .order("position", { ascending: true });

          if (qErr2) {
            setLoading(false);
            alert("Load questions error: " + qErr2.message);
            return;
          }

          // continue with the normal flow:
          const qRows2 = (qs2 ?? []) as QuestionApiRow[];
          const qIds2 = qRows2.map((r) => r.id);

          const { data: ans2, error: aErr2 } = await supabase
            .from("answers_api")
            .select("id, questionId, answerIndex, text, image, correct")
            .in("questionId", qIds2)
            .order("answerIndex", { ascending: true });

          if (aErr2) {
            setLoading(false);
            alert("Load answers error: " + aErr2.message);
            return;
          }

          const aRows2 = (ans2 ?? []) as AnswerApiRow[];
          const built2 = qRows2.map((qr) => normalizeQuestion(qr, aRows2.filter((a) => a.questionId === qr.id)));

          setQuestions(built2);
          setActiveIndex(0);
          setLoading(false);
          return;
        }

        setLoading(false);
        alert("Create first question error: " + insErr.message);
        return;
      }

      // insert answers for MC
      const payload = first.answers.map((a, idx) => ({
        questionId: newQ.id,
        answerIndex: idx,
        text: a.text ?? "",
        image: a.image ?? null,
        correct: !!a.correct,
      }));

      const { error: aErr } = await supabase.from("answers_api").insert(payload);
      if (aErr) console.warn("Insert default answers error:", aErr.message);

      setQuestions([first]);
      setActiveIndex(0);
      setLoading(false);
      return;
    }


    // load all answers for these questions (one query)
    const qIds = qRows.map((r) => r.id);
    const { data: ans, error: aErr } = await supabase
      .from("answers_api")
      .select("id, questionId, answerIndex, text, image, correct")
      .in("questionId", qIds)
      .order("answerIndex", { ascending: true });

    if (aErr) {
      setLoading(false);
      alert("Load answers error: " + aErr.message);
      return;
    }

    const aRows = (ans ?? []) as AnswerApiRow[];

    const built = qRows.map((qr) => {
      const thisAnswers = aRows.filter((a) => a.questionId === qr.id);
      return normalizeQuestion(qr, thisAnswers);
    });

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

        // Ensure positions are 1..n in current order
        const normalized = questions.map((q, i) => ({ ...q, _pos: i + 1 }));

        for (const q of normalized) {
          // upsert question
          // ✅ views can't use upsert/onConflict. Do UPDATE first, if nothing updated -> INSERT.
          const qPayload = {
            id: q.id,
            gameId,
            position: (q as any)._pos,
            type: q.type,
            text: q.text ?? "",
            image: q.image ?? null,
            timeMode: q.timeMode,
            time: q.time,
            matches: q.type === "matching" ? (q.matches ?? null) : null,
            acceptedAnswers: q.type === "input" ? (q.acceptedAnswers ?? null) : null,
          };

          const { data: updRows, error: updErr } = await supabase
            .from("questions_api")
            .update(qPayload)
            .eq("id", q.id)
            .select("id");

          if (updErr) throw updErr;

          if (!updRows || updRows.length === 0) {
            const { error: insErr } = await supabase
              .from("questions_api")
              .insert(qPayload);

            if (insErr) throw insErr;
          }


          // MC/TF answers: replace by delete+insert (simple + reliable)
          if (q.type === "multiple_choice" || q.type === "true_false") {
            const { error: delErr } = await supabase
              .from("answers_api")
              .delete()
              .eq("questionId", q.id);

            if (delErr) throw delErr;

            const payload = (q.answers ?? emptyAnswers(4))
              .slice(0, 4)
              .map((a, idx) => ({
                questionId: q.id,
                answerIndex: idx,
                text: a.text ?? "",
                image: a.image ?? null,
                correct: !!a.correct,
              }));

            const { error: insErr } = await supabase.from("answers_api").insert(payload);
            if (insErr) throw insErr;
          } else {
            // matching/input: ensure no leftover answers
            await supabase.from("answers_api").delete().eq("questionId", q.id);
          }
        }
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

  if (loading) return null;
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
