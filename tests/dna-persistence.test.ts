import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAllDnaData,
  clearDnaGame,
  dnaGameKey,
  loadDnaGame,
  saveDnaGame,
} from "../lib/dna/persistence";
import { getDailyDnaPuzzle } from "../lib/dna/puzzles";
import { DNA_SAVE_VERSION, type DnaGameSave } from "../lib/dna/types";

function storage() {
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
  });
  return store;
}
const date = "2026-08-01",
  puzzle = getDailyDnaPuzzle(date, "easy");
function game(): DnaGameSave {
  return {
    version: DNA_SAVE_VERSION,
    puzzleId: puzzle.id,
    date,
    difficulty: "easy",
    size: puzzle.size,
    board: [...puzzle.clues],
    notes: {},
    elapsed: 42,
    started: true,
    completed: false,
    mistakes: 1,
    hints: 1,
    history: [{ board: [...puzzle.clues], notes: {} }],
    future: [],
  };
}
describe("OneDNA persistence", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = storage();
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });
  it("round-trips the versioned save and history", () => {
    saveDnaGame(game());
    expect(loadDnaGame(date, "easy", puzzle.id, puzzle.size)?.elapsed).toBe(42);
    expect(
      loadDnaGame(date, "easy", puzzle.id, puzzle.size)?.history,
    ).toHaveLength(1);
  });
  it("fails safely on corrupt or mismatched saves", () => {
    store.set(dnaGameKey(date, "easy"), "{bad");
    expect(loadDnaGame(date, "easy", puzzle.id, puzzle.size)).toBeNull();
    saveDnaGame({ ...game(), puzzleId: "wrong" });
    expect(loadDnaGame(date, "easy", puzzle.id, puzzle.size)).toBeNull();
  });
  it("clears only the selected game", () => {
    saveDnaGame(game());
    store.set("onegames:v1:game:sudoku", "keep");
    clearDnaGame(date, "easy");
    expect(store.get("onegames:v1:game:sudoku")).toBe("keep");
  });
  it("reset all OneDNA data preserves Sudoku", () => {
    store.set("onegames:v1:dna:test", "remove");
    store.set("onegames:v1:stats", "keep");
    clearAllDnaData();
    expect(store.get("onegames:v1:dna:test")).toBeUndefined();
    expect(store.get("onegames:v1:stats")).toBe("keep");
  });
});
