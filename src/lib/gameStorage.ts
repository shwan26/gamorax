export type Game = {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  semester: string;
};

const STORAGE_KEY = "gamorax_games";

export function getGames(): Game[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGame(game: Game) {
  const games = getGames();
  games.push(game);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function getGameById(id: string): Game | null {
  const games = getGames();
  return games.find((game) => game.id === id) || null;
}
