import { Course } from "./courseStorage";

export type GameTimer = {
  mode: "automatic" | "manual";
  defaultTime: number;
};

export type Game = {
  id: string;
  courseId: string;
  quizNumber: string;
  timer: GameTimer;

  // ✅ new flags
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
};

const STORAGE_KEY = "gamorax_games";

/** Legacy shape (your current saved objects) */
type LegacyGame = {
  id: string;
  quizNumber: string;
  courseCode: string;
  courseName: string;
  section: string;
  semester: string;
  timer: GameTimer;
};

const COURSE_KEY = "gamorax_courses";

function getAllGamesRaw(): any[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? (JSON.parse(data) as any[]) : [];
}

function saveAllGames(games: Game[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

// ✅ normalize new fields even if old items exist
function normalizeGame(g: any): Game {
  return {
    id: String(g?.id ?? crypto.randomUUID()),
    courseId: String(g?.courseId ?? ""),
    quizNumber: String(g?.quizNumber ?? ""),
    timer: g?.timer ?? { mode: "automatic", defaultTime: 60 },
    shuffleQuestions: !!g?.shuffleQuestions,
    shuffleAnswers: !!g?.shuffleAnswers,
  };
}

/**
 * One-time migration:
 * legacy games -> create courses -> new games
 */
function migrateLegacyIfNeeded() {
  if (typeof window === "undefined") return;

  const raw = getAllGamesRaw();
  if (raw.length === 0) return;

  const alreadyNew = raw.every((g) => typeof g?.courseId === "string");
  if (alreadyNew) return;

  const looksLegacy = raw.some((g) => typeof g?.courseCode === "string");
  if (!looksLegacy) return;

  const legacyGames = raw as LegacyGame[];

  const coursesData = localStorage.getItem(COURSE_KEY);
  const courses: Course[] = coursesData ? JSON.parse(coursesData) : [];

  const courseKey = (c: Pick<Course, "courseCode" | "courseName" | "section" | "semester">) =>
    `${c.courseCode}||${c.courseName}||${c.section}||${c.semester}`;

  const map = new Map<string, string>();
  for (const c of courses) map.set(courseKey(c), c.id);

  const newGames: Game[] = legacyGames.map((lg) => {
    const key = courseKey(lg);
    let courseId = map.get(key);

    if (!courseId) {
      courseId = crypto.randomUUID();
      map.set(key, courseId);
      courses.push({
        id: courseId,
        courseCode: lg.courseCode,
        courseName: lg.courseName,
        section: lg.section,
        semester: lg.semester,
      });
    }

    return {
      id: lg.id,
      courseId,
      quizNumber: lg.quizNumber,
      timer: lg.timer ?? { mode: "automatic", defaultTime: 60 },

      // ✅ defaults
      shuffleQuestions: false,
      shuffleAnswers: false,
    };
  });

  localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
  saveAllGames(newGames);
}

/* =======================
   READ
======================= */

export function getGames(): Game[] {
  migrateLegacyIfNeeded();
  return getAllGamesRaw().map(normalizeGame);
}

export function getGamesByCourseId(courseId: string): Game[] {
  return getGames().filter((g) => g.courseId === courseId);
}

export function getGameById(id: string): Game | null {
  return getGames().find((g) => g.id === id) || null;
}

/* =======================
   CREATE
======================= */

export function saveGame(game: Game) {
  const games = getGames();
  games.push(game);
  saveAllGames(games);
}

/* =======================
   UPDATE (GENERAL)
======================= */

export function updateGame(
  id: string,
  data: Partial<Pick<Game, "quizNumber" | "shuffleQuestions" | "shuffleAnswers">>
) {
  const games = getGames();
  const index = games.findIndex((g) => g.id === id);
  if (index === -1) return;

  games[index] = { ...games[index], ...data };
  saveAllGames(games);
}

/* =======================
   UPDATE (TIMER ONLY)
======================= */

export function updateGameTimer(id: string, timer: GameTimer) {
  const games = getGames();
  const index = games.findIndex((g) => g.id === id);
  if (index === -1) return;

  games[index] = { ...games[index], timer };
  saveAllGames(games);
}

/* =======================
   DELETE
======================= */

export function deleteGame(id: string) {
  const games = getGames().filter((g) => g.id !== id);
  saveAllGames(games);
  localStorage.removeItem(`gamorax_questions_${id}`);
}
