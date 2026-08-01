import {
  WORD_SAVE_VERSION,
  type WordGameSave,
  type WordSettings,
  type WordStats,
} from "./types";

const PREFIX = "onegames:v1:word";
const SETTINGS_KEY = `${PREFIX}:settings`,
  STATS_KEY = `${PREFIX}:stats`,
  HELP_KEY = `${PREFIX}:help-seen`;
export const DEFAULT_WORD_SETTINGS: WordSettings = {
  reducedMotion: false,
  highContrast: false,
};
export const DEFAULT_WORD_STATS: WordStats = {
  version: 1,
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0],
  completedPuzzleIds: [],
  totalAttempts: 0,
  totalTime: 0,
};
export const wordGameKey = (date: string) => `${PREFIX}:game:${date}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function read(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function loadWordGame(
  date: string,
  puzzleId: string,
): WordGameSave | null {
  const value = read(wordGameKey(date));
  if (!isRecord(value)) return null;
  const guesses = Array.isArray(value.guesses) ? value.guesses : [];
  const validGuesses =
    Array.isArray(value.guesses) &&
    guesses.every(
      (guess) => typeof guess === "string" && /^[A-Z]{5}$/.test(guess),
    );
  if (
    value.version !== WORD_SAVE_VERSION ||
    value.puzzleId !== puzzleId ||
    !validGuesses ||
    guesses.length > 6 ||
    (value.status !== "playing" &&
      value.status !== "won" &&
      value.status !== "lost")
  ) {
    try {
      window.localStorage.removeItem(wordGameKey(date));
    } catch {}
    return null;
  }
  return {
    version: WORD_SAVE_VERSION,
    puzzleId,
    date,
    guesses: [...guesses] as string[],
    currentGuess:
      typeof value.currentGuess === "string" &&
      /^[A-Z]{0,5}$/.test(value.currentGuess)
        ? value.currentGuess
        : "",
    status: value.status,
    elapsed:
      typeof value.elapsed === "number" && value.elapsed >= 0
        ? value.elapsed
        : 0,
    startedAt:
      typeof value.startedAt === "string" ? value.startedAt : undefined,
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : undefined,
  };
}
export function saveWordGame(game: WordGameSave): boolean {
  return write(wordGameKey(game.date), game);
}
export function loadWordSettings(): WordSettings {
  const value = read(SETTINGS_KEY);
  return isRecord(value)
    ? {
        reducedMotion: value.reducedMotion === true,
        highContrast: value.highContrast === true,
      }
    : DEFAULT_WORD_SETTINGS;
}
export function saveWordSettings(settings: WordSettings): boolean {
  return write(SETTINGS_KEY, settings);
}
export function loadWordStats(): WordStats {
  const value = read(STATS_KEY);
  if (!isRecord(value) || value.version !== 1) return DEFAULT_WORD_STATS;
  const distribution =
    Array.isArray(value.distribution) && value.distribution.length === 6
      ? (value.distribution.map((n) =>
          typeof n === "number" && n >= 0 ? n : 0,
        ) as WordStats["distribution"])
      : DEFAULT_WORD_STATS.distribution;
  return {
    ...DEFAULT_WORD_STATS,
    ...value,
    distribution,
    completedPuzzleIds: Array.isArray(value.completedPuzzleIds)
      ? value.completedPuzzleIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
  } as WordStats;
}
function previousDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}
export function recordWordCompletion(
  game: WordGameSave,
  isDaily: boolean,
): WordStats {
  const stats = loadWordStats();
  if (stats.completedPuzzleIds.includes(game.puzzleId)) return stats;
  const won = game.status === "won";
  const dailyStreak = won && isDaily;
  const currentStreak = dailyStreak
    ? stats.lastDailyWin === previousDate(game.date)
      ? stats.currentStreak + 1
      : stats.lastDailyWin === game.date
        ? stats.currentStreak
        : 1
    : stats.currentStreak;
  const distribution = [...stats.distribution] as WordStats["distribution"];
  if (won) distribution[Math.max(0, Math.min(5, game.guesses.length - 1))] += 1;
  const next: WordStats = {
    ...stats,
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    completedPuzzleIds: [...stats.completedPuzzleIds, game.puzzleId],
    lastDailyWin: dailyStreak ? game.date : stats.lastDailyWin,
    totalAttempts: stats.totalAttempts + game.guesses.length,
    totalTime: stats.totalTime + game.elapsed,
  };
  write(STATS_KEY, next);
  return next;
}
export function hasSeenWordHelp(): boolean {
  try {
    return window.localStorage.getItem(HELP_KEY) === "1";
  } catch {
    return true;
  }
}
export function markWordHelpSeen(): void {
  try {
    window.localStorage.setItem(HELP_KEY, "1");
  } catch {}
}
export function clearAllWordData(): void {
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
