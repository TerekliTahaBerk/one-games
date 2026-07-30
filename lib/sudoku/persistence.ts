import type { Difficulty, GameSave, Settings, Stats } from "./types";

const PREFIX = "onegames:v1";
const SETTINGS_KEY = `${PREFIX}:settings`;
const STATS_KEY = `${PREFIX}:stats`;

export const DEFAULT_SETTINGS: Settings = {
  checkMistakes: true,
  highlightRelated: true,
  highlightMatching: true,
  autoRemoveNotes: true,
  autoCandidates: false,
  sound: false,
  reducedMotion: false,
};

export const DEFAULT_STATS: Stats = {
  completedDates: [],
  completedGames: [],
  gamesCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  bestTimes: {},
  completedByDifficulty: { easy: 0, medium: 0, hard: 0 },
  totalTime: 0,
  totalHints: 0,
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? ({ ...fallback, ...JSON.parse(value) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function gameKey(date: string, difficulty: Difficulty): string {
  return `${PREFIX}:game:${date}:${difficulty}`;
}

export function loadGame(date: string, difficulty: Difficulty): GameSave | null {
  const value = safeRead<GameSave | null>(gameKey(date, difficulty), null);
  if (!value || value.version !== 1 || !Array.isArray(value.board) || value.board.length !== 81) return null;
  return value;
}

export function saveGame(game: GameSave): boolean {
  return safeWrite(gameKey(game.date, game.difficulty), game);
}

export function loadSettings(): Settings {
  return safeRead(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): boolean {
  return safeWrite(SETTINGS_KEY, settings);
}

export function loadStats(): Stats {
  const stats = safeRead(STATS_KEY, DEFAULT_STATS);
  return {
    ...DEFAULT_STATS,
    ...stats,
    completedByDifficulty: { ...DEFAULT_STATS.completedByDifficulty, ...stats.completedByDifficulty },
    bestTimes: { ...stats.bestTimes },
  };
}

function dayDifference(later: string, earlier: string): number {
  return Math.round(
    (new Date(`${later}T12:00:00`).getTime() - new Date(`${earlier}T12:00:00`).getTime()) / 86_400_000,
  );
}

export function recordCompletion(game: GameSave): Stats {
  const stats = loadStats();
  const completionKey = `${game.date}:${game.difficulty}`;
  if (stats.completedGames.includes(completionKey)) return stats;
  const isNewDate = !stats.completedDates.includes(game.date);
  const dates = isNewDate ? [...stats.completedDates, game.date].sort() : stats.completedDates;
  const previous = isNewDate ? dates.at(-2) : undefined;
  const currentStreak = isNewDate
    ? previous && dayDifference(game.date, previous) === 1 ? stats.currentStreak + 1 : 1
    : stats.currentStreak;
  const next: Stats = {
    ...stats,
    completedDates: dates,
    completedGames: [...stats.completedGames, completionKey],
    gamesCompleted: stats.gamesCompleted + 1,
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    completedByDifficulty: {
      ...stats.completedByDifficulty,
      [game.difficulty]: stats.completedByDifficulty[game.difficulty] + 1,
    },
    bestTimes: {
      ...stats.bestTimes,
      [game.difficulty]: Math.min(stats.bestTimes[game.difficulty] ?? Infinity, game.elapsed),
    },
    totalTime: stats.totalTime + game.elapsed,
    totalHints: stats.totalHints + game.hints,
  };
  safeWrite(STATS_KEY, next);
  return next;
}

export function getPuzzleStatus(date: string): string {
  const games = (["easy", "medium", "hard"] as Difficulty[])
    .map((difficulty) => loadGame(date, difficulty))
    .filter(Boolean);
  if (games.some((game) => game?.completed)) return "Completed today";
  if (games.some((game) => game?.started)) return "In progress";
  return "Ready when you are";
}

export function clearGame(date: string, difficulty: Difficulty): void {
  try { window.localStorage.removeItem(gameKey(date, difficulty)); } catch { /* storage unavailable */ }
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch { /* storage unavailable */ }
}
