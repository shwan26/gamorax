/* =======================
   TYPES
======================= */

export type GameTimer = {
  mode: "automatic" | "manual";
  defaultTime: number;
};

export type Game = {
  id: string;
  quizNumber: string;
  courseCode: string;
  courseName: string;
  section: string;
  semester: string;
  timer: GameTimer;
};

/* =======================
   STORAGE KEY
======================= */

const STORAGE_KEY = "gamorax_games";

/* =======================
   INTERNAL HELPERS
======================= */

function getAllGames(): Game[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAllGames(games: Game[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

/* =======================
   READ
======================= */

export function getGames(): Game[] {
  return getAllGames();
}

export function getGameById(id: string): Game | null {
  return getAllGames().find((g) => g.id === id) || null;
}

/* =======================
   CREATE
======================= */

export function saveGame(game: Game) {
  const games = getAllGames();
  games.push(game);
  saveAllGames(games);
}

/* =======================
   UPDATE (GENERAL)
======================= */

export function updateGame(
  id: string,
  data: Partial<Omit<Game, "id" | "timer">>
) {
  const games = getAllGames();
  const index = games.findIndex((g) => g.id === id);
  if (index === -1) return;

  games[index] = {
    ...games[index],
    ...data,
  };

  saveAllGames(games);
}

/* =======================
   UPDATE (TIMER ONLY)
======================= */

export function updateGameTimer(
  id: string,
  timer: GameTimer
) {
  const games = getAllGames();
  const index = games.findIndex((g) => g.id === id);
  if (index === -1) return;

  games[index] = {
    ...games[index],
    timer,
  };

  saveAllGames(games);
}

/* =======================
   DELETE
======================= */

export function deleteGame(id: string) {
  const games = getAllGames().filter((g) => g.id !== id);
  saveAllGames(games);

  // Clean related question data
  localStorage.removeItem(`gamorax_questions_${id}`);
}
