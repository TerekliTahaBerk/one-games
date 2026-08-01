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
  dna: { accent: "#2F7D95", pale: "#DCEBF1" },
};

const INK = "#1A1A1A";
const OUTER = 3.2;
const INNER = 2;

/** Mirrors SUDOKU_REGION_PALE in components/GameLogo.tsx. */
const REGION_PALE = { coral: "#F1D9D4", mint: "#D8E8DE", gold: "#EFE3C8" };

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

  const rung = (x, y, width, fill) =>
    `<rect x="${x}" y="${y}" width="${width}" height="5" rx="2.5" fill="${fill}" stroke="${INK}" stroke-width="${INNER}" stroke-linejoin="round"/>`;
  const strand = (d) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${OUTER}" stroke-linecap="round"/>`;

  return `${open}
    ${rung(18, 13.5, 28, pale)}
    ${rung(23, 20.5, 18, pale)}
    ${rung(23, 38.5, 18, accent)}
    ${rung(18, 45.5, 28, pale)}
    ${strand("M16 8C16 26 48 38 48 56")}
    ${strand("M48 8C48 26 16 38 16 56")}
  </svg>`;
}

/** Inlines a font as base64 so the card renders identically anywhere. */
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

  const labels = ["OneSudoku", "OneDNA"];
  const games = ["sudoku", "dna"];

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
    .row{display:flex;align-items:flex-start;justify-content:center;gap:118px;}
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
