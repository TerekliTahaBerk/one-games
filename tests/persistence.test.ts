import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearGame,
  gameKey,
  hasSeenColoredIntro,
  loadGame,
  loadSettings,
  loadStats,
  markColoredIntroSeen,
  saveGame,
} from "../lib/sudoku/persistence";
import { getDailyPuzzle } from "../lib/sudoku/puzzles";
import { SAVE_VERSION, type GameSave } from "../lib/sudoku/types";

/** A minimal localStorage so the browser-only module can be exercised in node. */
function installStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
    writable: true,
  });
  return store;
}

const DATE = "2026-08-01";
const puzzle = getDailyPuzzle(DATE, "easy");

function currentSave(): GameSave {
  return {
    version: SAVE_VERSION,
    puzzleId: puzzle.id,
    date: DATE,
    difficulty: "easy",
    board: [...puzzle.clues],
    notes: { 4: [1, 2] },
    elapsed: 42,
    started: true,
    completed: false,
    mistakes: 1,
    hints: 0,
    history: [{ board: [...puzzle.clues], notes: {} }],
    future: [],
  };
}

describe("Save migration", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("round-trips a current save", () => {
    saveGame(currentSave());
    const loaded = loadGame(DATE, "easy", puzzle.id);
    expect(loaded?.elapsed).toBe(42);
    expect(loaded?.notes[4]).toEqual([1, 2]);
    expect(loaded?.history).toHaveLength(1);
  });

  it("drops a version 1 save without crashing, and without touching anything else", () => {
    const legacy = {
      version: 1,
      date: DATE,
      difficulty: "easy",
      board: [...puzzle.clues],
      notes: {},
      elapsed: 300,
      started: true,
      completed: false,
      mistakes: 0,
      hints: 0,
      history: [],
      future: [],
    };
    store.set(gameKey(DATE, "easy"), JSON.stringify(legacy));
    store.set("onegames:v1:settings", JSON.stringify({ sound: true }));
    store.set("onegames:v1:stats", JSON.stringify({ gamesCompleted: 7 }));

    expect(loadGame(DATE, "easy", puzzle.id)).toBeNull();
    expect(store.has(gameKey(DATE, "easy"))).toBe(false);
    // Settings and historical stats are stored separately and must survive.
    expect(loadSettings().sound).toBe(true);
    expect(loadStats().gamesCompleted).toBe(7);
  });

  it("drops a save written against a different puzzle definition", () => {
    saveGame({ ...currentSave(), puzzleId: "easy-99" });
    expect(loadGame(DATE, "easy", puzzle.id)).toBeNull();
  });

  it("survives corrupt or truncated storage", () => {
    store.set(gameKey(DATE, "easy"), "{not json");
    expect(loadGame(DATE, "easy", puzzle.id)).toBeNull();

    store.set(gameKey(DATE, "easy"), JSON.stringify({ version: SAVE_VERSION, board: [1, 2, 3] }));
    expect(loadGame(DATE, "easy", puzzle.id)).toBeNull();

    store.set(gameKey(DATE, "easy"), JSON.stringify(null));
    expect(loadGame(DATE, "easy", puzzle.id)).toBeNull();
  });

  it("repairs a save with missing counters rather than discarding it", () => {
    store.set(
      gameKey(DATE, "easy"),
      JSON.stringify({ version: SAVE_VERSION, puzzleId: puzzle.id, board: [...puzzle.clues] }),
    );
    const loaded = loadGame(DATE, "easy", puzzle.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.elapsed).toBe(0);
    expect(loaded?.history).toEqual([]);
    expect(loaded?.notes).toEqual({});
  });

  it("clears only the game it is asked to clear", () => {
    saveGame(currentSave());
    saveGame({ ...currentSave(), difficulty: "hard" });
    clearGame(DATE, "easy");
    expect(store.has(gameKey(DATE, "easy"))).toBe(false);
    expect(store.has(gameKey(DATE, "hard"))).toBe(true);
  });

  it("remembers that the colored-rule explainer was dismissed", () => {
    expect(hasSeenColoredIntro()).toBe(false);
    markColoredIntroSeen();
    expect(hasSeenColoredIntro()).toBe(true);
  });
});
