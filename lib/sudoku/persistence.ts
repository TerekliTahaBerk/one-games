import { SAVE_VERSION } from "./types";
import type { Difficulty, GameSave, Notes, Settings, Snapshot, Stats } from "./types";

/**
 * Local persistence.
 *
 * The storage prefix is deliberately stable: settings, stats and the onboarding
 * flag survive every schema change. Only an individual game save is discarded,
 * and only when it cannot be matched to the puzzle definition it was played
 * against — see `loadGame`.
 */

const PREFIX = "onegames:v1";
const SETTINGS_KEY = `${PREFIX}:settings`;
const STATS_KEY = `${PREFIX}:stats`;
const COLORED_INTRO_KEY = `${PREFIX}:sudoku:colored-intro-seen`;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoard(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 81 && value.every((cell) => typeof cell === "number");
}

function readNotes(value: unknown): Notes {
  if (!isRecord(value)) return {};
  const notes: Notes = {};
  for (const [key, candidates] of Object.entries(value)) {
    const index = Number(key);
    if (!Number.isInteger(index) || !Array.isArray(candidates)) continue;
    notes[index] = candidates.filter((note): note is number => typeof note === "number");
  }
  return notes;
}

function readSnapshots(value: unknown): Snapshot[] {
  if (!Array.isArray(value)) return [];
  const snapshots: Snapshot[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || !isBoard(entry.board)) return [];
    snapshots.push({ board: [...entry.board], notes: readNotes(entry.notes) });
  }
  return snapshots;
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Reads one saved game, migrating safely.
 *
 * Anything written by an older schema — or written against a different puzzle
 * definition than the one now served for this date — is dropped and the game
 * starts fresh. Settings and stats are stored under their own keys and are
 * never touched here.
 */
export function loadGame(
  date: string,
  difficulty: Difficulty,
  puzzleId?: string,
): GameSave | null {
  if (typeof window === "undefined") return null;
  const key = gameKey(date, difficulty);

  let value: unknown;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  // Anything the current schema cannot vouch for is discarded — an old
  // version: 1 save, a truncated board, or a save made against a different
  // puzzle definition for this date.
  const discard = () => {
    clearGame(date, difficulty);
    return null;
  };

  if (!isRecord(value) || value.version !== SAVE_VERSION) return discard();
  const { puzzleId: savedId, board } = value;
  if (typeof savedId !== "string" || !isBoard(board)) return discard();
  if (puzzleId !== undefined && savedId !== puzzleId) return discard();

  return {
    version: SAVE_VERSION,
    puzzleId: savedId,
    date,
    difficulty,
    board: [...board],
    notes: readNotes(value.notes),
    elapsed: readCount(value.elapsed),
    started: value.started === true,
    completed: value.completed === true,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : undefined,
    mistakes: readCount(value.mistakes),
    hints: readCount(value.hints),
    history: readSnapshots(value.history),
    future: readSnapshots(value.future),
  };
}

export function saveGame(game: GameSave): boolean {
  return safeWrite(gameKey(game.date, game.difficulty), game);
}

/** Whether the colored-groups explainer has already been dismissed on this device. */
export function hasSeenColoredIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COLORED_INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function markColoredIntroSeen(): void {
  try {
    window.localStorage.setItem(COLORED_INTRO_KEY, "1");
  } catch {
    /* storage unavailable */
  }
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
