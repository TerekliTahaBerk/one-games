import acceptedWords from "./accepted-words.json";
import { WORD_ANSWERS } from "./answers";

export function validateWordData(): string[] {
  const errors: string[] = [],
    accepted = new Set<string>(acceptedWords);
  if (WORD_ANSWERS.length < 365)
    errors.push(`Expected at least 365 answers, found ${WORD_ANSWERS.length}.`);
  if (new Set(WORD_ANSWERS).size !== WORD_ANSWERS.length)
    errors.push("Answer schedule contains duplicates.");
  for (const word of WORD_ANSWERS) {
    if (!/^[A-Z]{5}$/.test(word)) errors.push(`Malformed answer: ${word}`);
    if (!accepted.has(word))
      errors.push(`Answer is not accepted by dictionary: ${word}`);
  }
  if (accepted.size < 2_000)
    errors.push(`Accepted dictionary is unexpectedly small: ${accepted.size}.`);
  return errors;
}
