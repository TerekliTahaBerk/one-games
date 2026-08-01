import { evaluateGuess } from "./evaluate";
import type { WordStatus } from "./types";

const GLYPHS = { correct: "🟩", present: "🟨", absent: "⬜" } as const;
export function buildWordShare(
  number: number,
  guesses: string[],
  answer: string,
  status: WordStatus,
): string {
  const score = status === "won" ? guesses.length : "X";
  const rows = guesses.map((guess) =>
    evaluateGuess(guess, answer)
      .map((item) => GLYPHS[item.state])
      .join(""),
  );
  return [
    `OneWord #${number} ${score}/6`,
    "",
    ...rows,
    "",
    "onegames.tterekli9.chatgpt.site/word",
  ].join("\n");
}

export async function shareOrCopy(text: string): Promise<"shared" | "copied"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "OneWord", text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw error;
    }
  }
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
  else {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  return "copied";
}
