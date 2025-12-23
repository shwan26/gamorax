export type Answer = {
  text: string;
  correct: boolean;
  image?: string;
};

export type Question = {
  id: string;
  text: string;
  image?: string;
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
