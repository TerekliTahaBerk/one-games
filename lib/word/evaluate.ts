import type { EvaluatedLetter, LetterState } from "./types";

/** Duplicate-safe two-pass evaluation: exact matches consume letters first. */
export function evaluateGuess(
  guess: string,
  answer: string,
): EvaluatedLetter[] {
  const normalizedGuess = guess.toUpperCase();
  const normalizedAnswer = answer.toUpperCase();
  if (normalizedGuess.length !== 5 || normalizedAnswer.length !== 5)
    throw new Error("OneWord evaluation requires two five-letter words.");
  const states: LetterState[] = Array(5).fill("absent");
  const remaining = new Map<string, number>();
  for (let index = 0; index < 5; index += 1) {
    if (normalizedGuess[index] === normalizedAnswer[index])
      states[index] = "correct";
    else
      remaining.set(
        normalizedAnswer[index],
        (remaining.get(normalizedAnswer[index]) ?? 0) + 1,
      );
  }
  for (let index = 0; index < 5; index += 1) {
    if (states[index] === "correct") continue;
    const letter = normalizedGuess[index];
    if ((remaining.get(letter) ?? 0) > 0) {
      states[index] = "present";
      remaining.set(letter, (remaining.get(letter) ?? 0) - 1);
    }
  }
  return [...normalizedGuess].map((letter, index) => ({
    letter,
    state: states[index],
  }));
}

const STRENGTH: Record<LetterState, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};
export function buildKeyboardState(
  rows: EvaluatedLetter[][],
): Record<string, LetterState> {
  const result: Record<string, LetterState> = {};
  for (const row of rows)
    for (const item of row) {
      if (
        !result[item.letter] ||
        STRENGTH[item.state] > STRENGTH[result[item.letter]]
      )
        result[item.letter] = item.state;
    }
  return result;
}
