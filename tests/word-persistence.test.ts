import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAllWordData,
  loadWordGame,
  loadWordStats,
  recordWordCompletion,
  saveWordGame,
  wordGameKey,
} from "../lib/word/persistence";
import { WORD_SAVE_VERSION, type WordGameSave } from "../lib/word/types";

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
const game = (date = "2026-08-01"): WordGameSave => ({
  version: WORD_SAVE_VERSION,
  puzzleId: `word-${date}`,
  date,
  guesses: ["APPLE"],
  currentGuess: "",
  status: "won",
  elapsed: 25,
  completedAt: new Date().toISOString(),
});
describe("OneWord persistence", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = storage();
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });
  it("round-trips and rejects corrupt versioned saves", () => {
    saveWordGame(game());
    expect(loadWordGame(game().date, game().puzzleId)?.status).toBe("won");
    store.set(wordGameKey(game().date), "{bad");
    expect(loadWordGame(game().date, game().puzzleId)).toBeNull();
  });
  it("records a completion exactly once", () => {
    recordWordCompletion(game(), true);
    recordWordCompletion(game(), true);
    expect(loadWordStats().played).toBe(1);
    expect(loadWordStats().wins).toBe(1);
    expect(loadWordStats().distribution[0]).toBe(1);
  });
  it("keeps archive wins out of the daily streak", () => {
    recordWordCompletion(game("2026-07-31"), false);
    expect(loadWordStats().currentStreak).toBe(0);
  });
  it("resets only OneWord keys", () => {
    store.set("onegames:v1:word:test", "remove");
    store.set("onegames:v1:dna:test", "keep");
    clearAllWordData();
    expect(store.has("onegames:v1:word:test")).toBe(false);
    expect(store.get("onegames:v1:dna:test")).toBe("keep");
  });
});
