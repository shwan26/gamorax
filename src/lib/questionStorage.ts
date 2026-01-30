export type QuestionType = "multiple_choice" | "true_false" | "matching" | "input";

export type Answer = {
  text: string;
  correct: boolean;        // ✅ now can be multiple true
  image?: string | null;
};

export type MatchPair = {
  left: string;
  right: string;
};

export type Question = {
  id: string;
  type: QuestionType;      // ✅ NEW
  text: string;
  image?: string | null;

  // used by MC + TF
  answers: Answer[];

  // used by matching
  matches?: MatchPair[];

  // used by input answer
  acceptedAnswers?: string[];

  timeMode: "default" | "specific";
  time: number;
};

const STORAGE_KEY = "gamorax_questions";

export function getQuestions(gameId: string): Question[] {
  if (typeof window === "undefined") return []; // ✅ prevents SSR crash
  const data = localStorage.getItem(`${STORAGE_KEY}_${gameId}`);
  return data ? JSON.parse(data) : [];
}


export function saveQuestions(gameId: string, questions: Question[]) {
  localStorage.setItem(
    `${STORAGE_KEY}_${gameId}`,
    JSON.stringify(questions)
  );
}

export function updateQuestion(
  gameId: string,
  questionId: string,
  patch: Partial<Question>
) {
  const questions = getQuestions(gameId);

  const next = questions.map((q) => {
    if (q.id !== questionId) return q;

    const updated: Question = { ...q, ...patch };

    // ✅ If we explicitly sent image: null => remove it from storage
    if ("image" in patch && patch.image === null) {
      delete (updated as any).image; // removes key so localStorage JSON is clean
    }

    return updated;
  });

  saveQuestions(gameId, next);
}

export function updateAnswer(
  gameId: string,
  questionId: string,
  answerIndex: number,
  patch: Partial<Answer>
) {
  const questions = getQuestions(gameId);

  const next = questions.map((q) => {
    if (q.id !== questionId) return q;

    const answers = [...q.answers];
    const updatedAnswer: Answer = { ...answers[answerIndex], ...patch };

    if ("image" in patch && patch.image === null) {
      delete (updatedAnswer as any).image;
    }

    answers[answerIndex] = updatedAnswer;
    return { ...q, answers };
  });

  saveQuestions(gameId, next);
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

  if (type === "multiple_choice") return hasQuestion && mcNonEmpty.length >= 2 && mcHasCorrect;
  if (type === "true_false") return hasQuestion && tfHasCorrect;
  if (type === "matching") return hasQuestion && pairCompleteCount >= 2 && !pairHasBroken;
  if (type === "input") return hasQuestion && accepted.length >= 1;

  return false;
}
