/**
 * Renders public/og.png — the OneGames social card.
 *
 * The card is composed from the same geometry as components/GameLogo.tsx and
 * the same type as the site (Fraunces + Inter, loaded from node_modules), so
 * the preview a link produces and the page it opens are visibly one product.
 *
 *   node scripts/build-og.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 630;

const PALETTE = {
  sudoku: { accent: "#3F6FA8", pale: "#DCE8F7" },
  word: { accent: "#6E5598", pale: "#E7DFF6" },
  match: { accent: "#9B5C72", pale: "#F5E1E8" },
  numbers: { accent: "#3F7652", pale: "#DFEDE4" },
};

const INK = "#1A1A1A";
const OUTER = 3.2;
const INNER = 2;

/** Mirrors SUDOKU_REGION_PALE in components/GameLogo.tsx. */
const REGION_PALE = { coral: "#F1D9D4", mint: "#D8E8DE", gold: "#EFE3C8" };
const NUMBERS_PANEL =
  "M7 22C7 13.716 13.716 7 22 7H52C54.761 7 57 9.239 57 12V42C57 50.284 50.284 57 42 57H12C9.239 57 7 54.761 7 52Z";

function mark(game, size) {
  const { accent, pale } = PALETTE[game];
  const open = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;

  if (game === "sudoku") {
    return `${open}
      <defs><clipPath id="c-sudoku"><rect x="6" y="6" width="52" height="52" rx="9"/></clipPath></defs>
      <g clip-path="url(#c-sudoku)">
        <rect x="6" y="6" width="52" height="52" fill="#fff"/>
        <rect x="6" y="40.667" width="17.333" height="17.333" fill="${REGION_PALE.coral}"/>
        <rect x="23.333" y="23.333" width="17.333" height="17.333" fill="${REGION_PALE.mint}"/>
        <rect x="40.667" y="6" width="17.333" height="17.333" fill="${REGION_PALE.gold}"/>
        <rect x="40.667" y="40.667" width="17.333" height="17.333" fill="${accent}"/>
      </g>
      <path d="M23.333 6V58M40.667 6V58M6 23.333H58M6 40.667H58" stroke="${INK}" stroke-width="${INNER}" stroke-linecap="round"/>
      <rect x="6" y="6" width="52" height="52" rx="9" fill="none" stroke="${INK}" stroke-width="${OUTER}"/>
    </svg>`;
  }

  if (game === "word") {
    const tile = (x, rotate, fill) =>
      `<rect x="${x}" y="21" width="17" height="26" rx="4.5" fill="${fill}" stroke="${INK}" stroke-width="${OUTER}" stroke-linejoin="round" transform="rotate(${rotate} ${x + 8.5} 47)"/>`;
    return `${open}
      <rect x="6" y="47" width="52" height="8" rx="4" fill="${pale}" stroke="${INK}" stroke-width="${OUTER}" stroke-linejoin="round"/>
      ${tile(7.5, -9, pale)}
      ${tile(39.5, 9, pale)}
      ${tile(23.5, 0, accent)}
    </svg>`;
  }

  if (game === "match") {
    const radius = 13;
    const ring = (degrees) => {
      const radians = (degrees * Math.PI) / 180;
      const cx = 32 + Math.cos(radians) * radius;
      const cy = 34 + Math.sin(radians) * radius;
      return `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${radius}" fill="${pale}" fill-opacity="0.65" stroke="${INK}" stroke-width="${OUTER}"/>`;
    };
    return `${open}
      ${[-90, 30, 150].map(ring).join("")}
      <circle cx="32" cy="34" r="5" fill="${accent}" stroke="${INK}" stroke-width="${INNER}"/>
    </svg>`;
  }

  return `${open}
    <defs><clipPath id="c-numbers"><path d="${NUMBERS_PANEL}"/></clipPath></defs>
    <path d="${NUMBERS_PANEL}" fill="#fff"/>
    <g clip-path="url(#c-numbers)">
      <rect x="7" y="7" width="25" height="25" fill="${pale}"/>
      <rect x="32" y="32" width="25" height="25" fill="${pale}"/>
    </g>
    <path d="M19.5 14.5v11M14 20h11" stroke="${accent}" stroke-width="${INNER + 0.6}" stroke-linecap="round"/>
    <path d="M39 41h11M39 47.5h11" stroke="${accent}" stroke-width="${INNER + 0.6}" stroke-linecap="round"/>
    <path d="M32 7v50M7 32h50" stroke="${INK}" stroke-width="${INNER}" stroke-linecap="round"/>
    <path d="${NUMBERS_PANEL}" fill="none" stroke="${INK}" stroke-width="${OUTER}" stroke-linejoin="round"/>
  </svg>`;
}

async function fontFace(family, file, weight, style = "normal") {
  const data = await readFile(resolve(ROOT, "node_modules/@fontsource", file));
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");}`;
}

async function buildHtml() {
  const fonts = [
    await fontFace("Fraunces", "fraunces/files/fraunces-latin-400-italic.woff2", 400, "italic"),
    await fontFace("Inter", "inter/files/inter-latin-500-normal.woff2", 500),
  ].join("");

  // The lockup is artwork, so the card uses the same file the site does rather
  // than re-typesetting the wordmark.
  const logo = await readFile(resolve(ROOT, "public/onegames-logo.png"));
  const logoUrl = `data:image/png;base64,${logo.toString("base64")}`;

  const labels = ["OneSudoku", "OneWord", "OneMatch", "OneNumbers"];
  const games = ["sudoku", "word", "match", "numbers"];

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fonts}
    *{box-sizing:border-box;margin:0;}
    body{width:${WIDTH}px;height:${HEIGHT}px;background:#fff;color:${INK};
      font-family:Inter,sans-serif;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:64px 72px;
      -webkit-font-smoothing:antialiased;}
    .lockup{display:block;height:150px;width:auto;}
    .tagline{margin-top:26px;font-family:Fraunces,serif;font-style:italic;
      font-weight:400;font-size:34px;color:#52525b;letter-spacing:-.01em;}
    .rule{width:180px;height:1px;background:#e4e4e7;margin:46px 0 42px;}
    .row{display:flex;align-items:flex-start;justify-content:center;gap:74px;}
    .cell{display:flex;flex-direction:column;align-items:center;gap:16px;}
    .cell span{font-size:19px;font-weight:500;color:#71717a;letter-spacing:.01em;}
  </style></head><body>
    <img class="lockup" src="${logoUrl}" alt="OneGames"/>
    <p class="tagline">One thoughtful game at a time.</p>
    <div class="rule"></div>
    <div class="row">
      ${games.map((game, index) => `<div class="cell">${mark(game, 116)}<span>${labels[index]}</span></div>`).join("")}
    </div>
  </body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});
await page.setContent(await buildHtml(), { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: "png" });
await browser.close();

await mkdir(resolve(ROOT, "public"), { recursive: true });
await writeFile(resolve(ROOT, "public/og.png"), png);
console.log(`Wrote public/og.png (${WIDTH}×${HEIGHT} @2x, ${(png.length / 1024).toFixed(0)} KB)`);
