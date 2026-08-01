import { describe, expect, it } from "vitest";
import { buildKeyboardState, evaluateGuess } from "../lib/word/evaluate";
import { buildWordShare } from "../lib/word/share";

describe("OneWord evaluation", () => {
  it("scores exact, present, and absent letters", () => {
    expect(evaluateGuess("CRANE", "CLOUD").map((item) => item.state)).toEqual([
      "correct",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
  });
  it("does not over-credit duplicate letters", () => {
    expect(evaluateGuess("ALLEY", "APPLE").map((item) => item.state)).toEqual([
      "correct",
      "present",
      "absent",
      "present",
      "absent",
    ]);
    expect(evaluateGuess("SHEEP", "EERIE").map((item) => item.state)).toEqual([
      "absent",
      "absent",
      "present",
      "present",
      "absent",
    ]);
  });
  it("never downgrades keyboard evidence", () => {
    const state = buildKeyboardState([
      evaluateGuess("ALERT", "APPLE"),
      evaluateGuess("APPLE", "APPLE"),
    ]);
    expect(state.A).toBe("correct");
    expect(state.P).toBe("correct");
    expect(state.R).toBe("absent");
  });
  it("shares a spoiler-free board", () => {
    const text = buildWordShare(8, ["ALERT", "APPLE"], "APPLE", "won");
    expect(text).toContain("OneWord #8 2/6");
    expect(text).not.toContain("APPLE");
    expect(text.match(/🟩/g)?.length).toBeGreaterThan(0);
  });
});
