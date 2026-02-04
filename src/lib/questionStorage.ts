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

    // clamp to 3..5, but DO NOT auto-pad back to 4
    if (localAnswers.length > MC_MAX) localAnswers = localAnswers.slice(0, MC_MAX);

    // If DB has <3 (old data), pad up to 3 so editor doesn’t break
    while (localAnswers.length < MC_MIN) {
      localAnswers.push({ text: "", correct: false, image: null });
    }
  } else if (qType === "true_false") {
    // TF should be fixed 2
    localAnswers = [
      { text: "True", correct: true, image: null },
      { text: "False", correct: false, image: null },
    ];
  } else {
    localAnswers = emptyAnswers(4);
  }

  return {
    id: row.id,
    type: qType,
    text: row.text ?? "",
    image: row.image ?? null,
    answers: localAnswers,
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
    .select("id, gameId, position, type, text, image, timeMode, time, matches, acceptedAnswers")
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

// ✅ Supabase-backed save (replaces localStorage)
export async function saveQuestions(gameId: string, questions: Question[]): Promise<void> {
  if (!gameId) return;

  // ensure positions 1..n
  const normalized = questions.map((q, i) => ({ ...q, _pos: i + 1 }));

  for (const q of normalized) {
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

    // update -> if 0 rows -> insert
    const { data: updRows, error: updErr } = await supabase
      .from("questions_api")
      .update(qPayload)
      .eq("id", q.id)
      .select("id");

    if (updErr) throw updErr;

    if (!updRows || updRows.length === 0) {
      const { error: insErr } = await supabase.from("questions_api").insert(qPayload);
      if (insErr) throw insErr;
    }

    // answers table
    if (q.type === "multiple_choice" || q.type === "true_false") {
      const { error: delErr } = await supabase.from("answers_api").delete().eq("questionId", q.id);
      if (delErr) throw delErr;

      const payload = (q.answers ?? emptyAnswers(4))
        .slice(0, MC_MAX)
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
      await supabase.from("answers_api").delete().eq("questionId", q.id);
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

