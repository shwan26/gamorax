// src/lib/gameStorage.ts
import { supabase } from "@/src/lib/supabaseClient";

export type GameTimer = {
  mode: "automatic" | "manual";
  defaultTime: number;
};

export type Game = {
  id: string;
  courseId: string;
  quizNumber: string;
  timer: GameTimer;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  createdAt?: string;
};

export type QuestionRow = {
  id: string;
  gameId: string;
  position: number;
  text: string;
  image: string | null;
  timeMode: "default" | "specific";
  time: number;

  // optional (if your view includes it)
  type?: string;
  matches?: any;
  acceptedAnswers?: string[] | null;
};

export type AnswerRow = {
  id: string;
  questionId: string;
  answerIndex: number;
  text: string;
  image: string | null;
  correct: boolean;
};

/* =======================
   READ
======================= */

export async function getGamesByCourseId(courseId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games_api")
    .select("*")
    .eq("courseId", courseId)
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function getAllMyGames(): Promise<Game[]> {
  // RLS: lecturer can only see games in courses they own
  const { data, error } = await supabase
    .from("games_api")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function getGameById(id: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games_api")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // "No rows" can happen -> return null
    if ((error as any)?.code === "PGRST116") return null;
    throw error;
  }
  return (data ?? null) as Game | null;
}

/* =======================
   CREATE / UPDATE / DELETE
======================= */

export async function createGame(input: {
  courseId: string;
  quizNumber: string;
  timer?: GameTimer;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("games_api")
    .insert({
      courseId: input.courseId,
      quizNumber: input.quizNumber,
      timer: input.timer ?? { mode: "automatic", defaultTime: 60 },
      shuffleQuestions: !!input.shuffleQuestions,
      shuffleAnswers: !!input.shuffleAnswers,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

export async function updateGame(
  id: string,
  data: Partial<Pick<Game, "quizNumber" | "shuffleQuestions" | "shuffleAnswers">>
) {
  const { error } = await supabase
    .from("games_api")
    .update(data)
    .eq("id", id);

  if (error) throw error;
}

export async function updateGameTimer(id: string, timer: GameTimer) {
  const { error } = await supabase
    .from("games_api")
    .update({ timer })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteGame(id: string) {
  const { error } = await supabase.from("games_api").delete().eq("id", id);
  if (error) throw error;
}

/* =======================
   DUPLICATE (copy questions + answers)
======================= */

export async function duplicateGameToCourse(input: {
  sourceGameId: string;
  targetCourseId: string;
  newQuizNumber: string;
}): Promise<{ newGameId: string }> {
  // 1) load source game
  const source = await getGameById(input.sourceGameId);
  if (!source) throw new Error("Source game not found");

  // 2) create new game in target course (copy settings)
  const { id: newGameId } = await createGame({
    courseId: input.targetCourseId,
    quizNumber: input.newQuizNumber,
    timer: source.timer,
    shuffleQuestions: source.shuffleQuestions,
    shuffleAnswers: source.shuffleAnswers,
  });

  // 3) load source questions
  const { data: oldQs, error: qErr } = await supabase
    .from("questions_api")
    .select("*")
    .eq("gameId", input.sourceGameId)
    .order("position", { ascending: true });

  if (qErr) throw qErr;

  const questions = (oldQs ?? []) as QuestionRow[];

  // 4) copy each question + answers
  for (const q of questions) {
    const { data: newQ, error: newQErr } = await supabase
      .from("questions_api")
      .insert({
        gameId: newGameId,
        position: q.position,
        text: q.text,
        image: q.image,
        timeMode: q.timeMode,
        time: q.time,

        // optional new features (safe if your view supports them)
        type: q.type,
        matches: q.matches,
        acceptedAnswers: q.acceptedAnswers ?? [],
      })
      .select("id")
      .single();

    if (newQErr) throw newQErr;
    const newQuestionId = newQ.id as string;

    const { data: oldAs, error: aErr } = await supabase
      .from("answers_api")
      .select("*")
      .eq("questionId", q.id)
      .order("answerIndex", { ascending: true });

    if (aErr) throw aErr;

    const answers = (oldAs ?? []) as AnswerRow[];
    if (answers.length) {
      const { error: aInsErr } = await supabase.from("answers_api").insert(
        answers.map((a) => ({
          questionId: newQuestionId,
          answerIndex: a.answerIndex,
          text: a.text,
          image: a.image,
          correct: a.correct,
        }))
      );
      if (aInsErr) throw aInsErr;
    }
  }

  return { newGameId };
}
