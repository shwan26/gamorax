export type Answer = {
  text: string;
  correct: boolean;
  image?: string | null;   // allow delete
};

export type Question = {
  id: string;
  text: string;
  image?: string | null;   // allow delete
  answers: Answer[];
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
