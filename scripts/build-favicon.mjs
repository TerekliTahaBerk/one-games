/**
 * Renders public/favicon.svg — the OneGames character on a rounded white tile.
 *
 *   node scripts/build-favicon.mjs
 */
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { characterBody } from "./brand-character.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 104" width="104" height="104">
  <title>OneGames</title>
  <rect width="104" height="104" rx="22" fill="#FFFFFF"/>
  <g transform="translate(2 3)">
  ${characterBody()}
  </g>
</svg>
`;

await writeFile(resolve(ROOT, "public/favicon.svg"), svg);
console.log("Wrote public/favicon.svg");
