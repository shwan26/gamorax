// src/lib/questionStorage.ts
import { supabase } from "@/src/lib/supabaseClient";

export type QuestionType = "multiple_choice" | "true_false" | "matching" | "input";

export type Answer = {
  text: string;
  correct: boolean;
  image?: string | null;
};

export type MatchPair = { left: string; right: string };

export type Question = {
  id: string;
  type: QuestionType;
  text: string;
  image?: string | null;
  answers: Answer[];
  matches?: MatchPair[];
  acceptedAnswers?: string[];
  timeMode: "default" | "specific";
  time: number;
  score?: number;

  allowMultiple?: boolean; 
};

// -------------------- Supabase rows --------------------
type QuestionApiRow = {
  id: string;
  gameId: string;
  position: number;
  type: QuestionType;
  text: string;
  image: string | null;
  timeMode: "default" | "specific";
  time: number;
  matches: any | null;
  acceptedAnswers: string[] | null;
  allowMultiple?: boolean | null;
  score?: number | null;
};

type AnswerApiRow = {
  id: string;
  questionId: string;
  answerIndex: number;
  text: string;
  image: string | null;
  correct: boolean;
};

// helpers
const MC_MIN = 3;
const MC_MAX = 5;

function emptyAnswers(n = 4): Answer[] {
  return Array.from({ length: n }, () => ({ text: "", correct: false, image: null }));
}


function normalizeQuestion(row: QuestionApiRow, answers: AnswerApiRow[]): Question {
  const qType = row.type ?? "multiple_choice";

  let localAnswers: Answer[] = [];

  if (qType === "multiple_choice") {
    const sorted = [...answers].sort((a, b) => a.answerIndex - b.answerIndex);
    localAnswers = sorted.map((a) => ({
      text: a.text ?? "",
      correct: !!a.correct,
      image: a.image ?? null,
    }));

    if (localAnswers.length > MC_MAX) localAnswers = localAnswers.slice(0, MC_MAX);
    while (localAnswers.length < MC_MIN) {
      localAnswers.push({ text: "", correct: false, image: null });
    }
  } else if (qType === "true_false") {
    const sorted = [...answers].sort((a, b) => a.answerIndex - b.answerIndex);
    const tRow = sorted[0];
    const fRow = sorted[1];

    localAnswers = [
      { text: "True", correct: !!tRow?.correct, image: tRow?.image ?? null },
      { text: "False", correct: !!fRow?.correct, image: fRow?.image ?? null },
    ];

    if (!localAnswers.some((a) => a.correct)) localAnswers[0].correct = true;
  } else {
    localAnswers = emptyAnswers(4);
  }

  return {
    id: row.id,
    type: qType,
    text: row.text ?? "",
    image: row.image ?? null,
    answers: localAnswers,

    // ✅ IMPORTANT: persist allowMultiple on question
    allowMultiple: !!row.allowMultiple,
    score: Number(row.score ?? 1),

    matches: Array.isArray(row.matches)
      ? row.matches
      : Array.from({ length: 5 }, () => ({ left: "", right: "" })),
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [""],
    timeMode: row.timeMode ?? "specific",
    time: Number(row.time ?? 60),
  };
}

// ✅ Supabase-backed reads
export async function getQuestions(gameId: string): Promise<Question[]> {
  if (!gameId) return [];

  const { data: qs, error: qErr } = await supabase
    .from("questions_api")
    .select("id, gameId, position, type, text, image, timeMode, time, matches, acceptedAnswers, allowMultiple, score")
    .eq("gameId", gameId)
    .order("position", { ascending: true });

  if (qErr) throw qErr;

  const qRows = (qs ?? []) as QuestionApiRow[];
  if (qRows.length === 0) return [];

  const qIds = qRows.map((r) => r.id);

  const { data: ans, error: aErr } = await supabase
    .from("answers_api")
    .select("id, questionId, answerIndex, text, image, correct")
    .in("questionId", qIds)
    .order("answerIndex", { ascending: true });

  if (aErr) throw aErr;

  const aRows = (ans ?? []) as AnswerApiRow[];

  return qRows.map((qr) => {
    const thisAnswers = aRows.filter((a) => a.questionId === qr.id);
    return normalizeQuestion(qr, thisAnswers);
  });
}

// ✅ Supabase-backed save (VIEW-safe, no upsert/onConflict)
export async function saveQuestions(gameId: string, questions: Question[]): Promise<void> {
  if (!gameId) return;

  // normalize final order 1..n
  const normalized = questions.map((q, i) => ({ ...q, _pos: i + 1 }));

  // ✅ 1) Upsert into REAL TABLE: public.questions
  const qRows = normalized.map((q) => ({
    id: q.id,
    quiz_id: gameId,
    position: q._pos,

    q_type: q.type,                 // enum question_kind
    text: q.text ?? "",
    image_url: q.image ?? null,

    time_mode: q.timeMode ?? "specific",
    time_seconds: Number(q.time ?? 60),

    matches: q.type === "matching" ? (q.matches ?? null) : null,
    accepted_answers: q.type === "input" ? (q.acceptedAnswers ?? null) : null,

    score: Number(q.score ?? 1),
    allow_multiple: q.type === "multiple_choice" ? !!q.allowMultiple : false,
  }));

  const { error: qErr } = await supabase.from("questions").upsert(qRows, { onConflict: "id" });
  if (qErr) throw qErr;

  // ✅ 2) Answers -> REAL TABLE: public.question_answers
  // We do delete + insert to avoid leftover rows after reducing choices.
  for (const q of normalized) {
    const { error: delErr } = await supabase
      .from("question_answers")
      .delete()
      .eq("question_id", q.id);

    if (delErr) throw delErr;

    // Only MC + TF store rows in question_answers
    if (q.type === "multiple_choice" || q.type === "true_false") {
      const payload =
        q.type === "true_false"
          ? [
              {
                question_id: q.id,
                position: 0,
                text: "True",
                image_url: null,
                is_correct: !!q.answers?.[0]?.correct,
              },
              {
                question_id: q.id,
                position: 1,
                text: "False",
                image_url: null,
                is_correct: !!q.answers?.[1]?.correct,
              },
            ]
          : (q.answers ?? emptyAnswers(4))
              .slice(0, MC_MAX)
              .map((a, idx) => ({
                question_id: q.id,
                position: idx,              // ✅ your answerIndex
                text: a.text ?? "",
                image_url: a.image ?? null,
                is_correct: !!a.correct,
              }));

      const { error: insErr } = await supabase.from("question_answers").insert(payload);
      if (insErr) throw insErr;
    }
  }
}

export function isQuestionComplete(q: Question): boolean {
  const type = q.type ?? "multiple_choice";
  const hasQuestion = !!q.text?.trim();

  const mcAnswers = (q.answers ?? []).map((a) => String(a?.text ?? "").trim());
  const mcNonEmpty = mcAnswers.filter(Boolean);
  const mcHasCorrect = (q.answers ?? []).some((a) => !!a.correct);

  const tfHasCorrect = (q.answers ?? []).some((a) => !!a.correct);

  const pairs = q.matches ?? [];
  const pairCompleteCount = pairs.filter(
    (p) => !!String(p?.left ?? "").trim() && !!String(p?.right ?? "").trim()
  ).length;
  const pairHasBroken = pairs.some((p) => {
    const L = !!String(p?.left ?? "").trim();
    const R = !!String(p?.right ?? "").trim();
    return (L && !R) || (!L && R);
  });

  const accepted = (q.acceptedAnswers ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);

  if (type === "multiple_choice") return hasQuestion && mcNonEmpty.length >= 3 && mcHasCorrect;
  if (type === "true_false") return hasQuestion && tfHasCorrect;
  if (type === "matching") return hasQuestion && pairCompleteCount >= 2 && !pairHasBroken;
  if (type === "input") return hasQuestion && accepted.length >= 1;

  return false;
}

export async function getTotalQuestions(gameId: string): Promise<number> {
  const qs = await getQuestions(gameId);
  return qs.length;
}

