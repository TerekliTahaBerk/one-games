import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/generate-word-list.mjs /path/to/enable1.txt",
  );
const words = [
  ...new Set(
    readFileSync(source, "utf8")
      .split(/\r?\n/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => /^[A-Z]{5}$/.test(word)),
  ),
].sort();
const destination = resolve("lib/word/accepted-words.json");
writeFileSync(destination, `${JSON.stringify(words)}\n`);
console.log(
  `Generated ${words.length} accepted five-letter words at ${destination}`,
);
