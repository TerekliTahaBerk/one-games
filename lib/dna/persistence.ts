import {
  DNA_SAVE_VERSION,
  type DnaBoard,
  type DnaDifficulty,
  type DnaGameSave,
  type DnaNotes,
  type DnaSettings,
  type DnaSnapshot,
  type DnaStats,
} from "./types";

const PREFIX = "onegames:v1:dna";
const SETTINGS_KEY = `${PREFIX}:settings`,
  STATS_KEY = `${PREFIX}:stats`,
  TUTORIAL_KEY = `${PREFIX}:tutorial-seen`;
export const DEFAULT_DNA_SETTINGS: DnaSettings = {
  checkMistakes: true,
  highlightRelated: true,
  highlightBonded: true,
  sound: false,
  reducedMotion: false,
};
export const DEFAULT_DNA_STATS: DnaStats = {
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
export function dnaGameKey(date: string, difficulty: DnaDifficulty): string {
  return `${PREFIX}:game:${date}:${difficulty}`;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function board(value: unknown, length: number): value is DnaBoard {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(
      (cell) =>
        cell === null ||
        cell === "A" ||
        cell === "T" ||
        cell === "C" ||
        cell === "G",
    )
  );
}
function notes(value: unknown): DnaNotes {
  if (!record(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => Array.isArray(entry))
      .map(([key, entry]) => [
        Number(key),
        (entry as unknown[]).filter(
          (base) =>
            base === "A" || base === "T" || base === "C" || base === "G",
        ),
      ]),
  );
}
function snapshots(value: unknown, length: number): DnaSnapshot[] {
  if (!Array.isArray(value)) return [];
  const result: DnaSnapshot[] = [];
  for (const item of value) {
    if (!record(item) || !board(item.board, length)) return [];
    result.push({ board: [...item.board], notes: notes(item.notes) });
  }
  return result;
}
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

export function loadDnaGame(
  date: string,
  difficulty: DnaDifficulty,
  puzzleId: string,
  size: number,
): DnaGameSave | null {
  if (typeof window === "undefined") return null;
  let value: unknown;
  try {
    const raw = window.localStorage.getItem(dnaGameKey(date, difficulty));
    if (!raw) return null;
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const discard = () => {
    clearDnaGame(date, difficulty);
    return null;
  };
  if (
    !record(value) ||
    value.version !== DNA_SAVE_VERSION ||
    value.puzzleId !== puzzleId ||
    value.size !== size ||
    !board(value.board, size * size)
  )
    return discard();
  return {
    version: DNA_SAVE_VERSION,
    puzzleId,
    date,
    difficulty,
    size: size === 8 ? 8 : 6,
    board: [...value.board],
    notes: notes(value.notes),
    elapsed: count(value.elapsed),
    started: value.started === true,
    completed: value.completed === true,
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : undefined,
    mistakes: count(value.mistakes),
    hints: count(value.hints),
    history: snapshots(value.history, size * size),
    future: snapshots(value.future, size * size),
  };
}
export function saveDnaGame(game: DnaGameSave): boolean {
  return write(dnaGameKey(game.date, game.difficulty), game);
}
export function loadDnaSettings(): DnaSettings {
  return read(SETTINGS_KEY, DEFAULT_DNA_SETTINGS);
}
export function saveDnaSettings(settings: DnaSettings): boolean {
  return write(SETTINGS_KEY, settings);
}
export function loadDnaStats(): DnaStats {
  const stats = read(STATS_KEY, DEFAULT_DNA_STATS);
  return {
    ...DEFAULT_DNA_STATS,
    ...stats,
    bestTimes: { ...stats.bestTimes },
    completedByDifficulty: {
      ...DEFAULT_DNA_STATS.completedByDifficulty,
      ...stats.completedByDifficulty,
    },
  };
}
export function recordDnaCompletion(game: DnaGameSave): DnaStats {
  const stats = loadDnaStats(),
    key = `${game.date}:${game.difficulty}`;
  if (stats.completedGames.includes(key)) return stats;
  const dates = stats.completedDates.includes(game.date)
    ? stats.completedDates
    : [...stats.completedDates, game.date].sort();
  const previous = dates.at(-2);
  const consecutive = previous
    ? Math.round(
        (new Date(`${game.date}T12:00:00`).getTime() -
          new Date(`${previous}T12:00:00`).getTime()) /
          86400000,
      ) === 1
    : false;
  const next = {
    ...stats,
    completedDates: dates,
    completedGames: [...stats.completedGames, key],
    gamesCompleted: stats.gamesCompleted + 1,
    currentStreak: consecutive ? stats.currentStreak + 1 : 1,
    longestStreak: Math.max(
      stats.longestStreak,
      consecutive ? stats.currentStreak + 1 : 1,
    ),
    bestTimes: {
      ...stats.bestTimes,
      [game.difficulty]: Math.min(
        stats.bestTimes[game.difficulty] ?? Infinity,
        game.elapsed,
      ),
    },
    completedByDifficulty: {
      ...stats.completedByDifficulty,
      [game.difficulty]: stats.completedByDifficulty[game.difficulty] + 1,
    },
    totalTime: stats.totalTime + game.elapsed,
    totalHints: stats.totalHints + game.hints,
  };
  write(STATS_KEY, next);
  return next;
}
export function hasSeenDnaTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return true;
  }
}
export function markDnaTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {}
}
export function clearDnaGame(date: string, difficulty: DnaDifficulty): void {
  try {
    window.localStorage.removeItem(dnaGameKey(date, difficulty));
  } catch {}
}
export function clearAllDnaData(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    ).filter((key): key is string => Boolean(key));
    keys
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}
