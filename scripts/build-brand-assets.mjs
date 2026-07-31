/**
 * Prepares the brand artwork in public/ from the source files in assets/brand/.
 *
 * The supplied art sits inside a large white margin, which would make the
 * lockup impossible to size or align predictably. This trims each image to its
 * ink, adds a small even margin back, and writes a web-sized PNG.
 *
 *   node scripts/build-brand-assets.mjs
 */
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Measured from the supplied art: 82% of pixels have a minimum channel of
 * 253–255 (the background field) and the ink sits at 17–20, so there is a wide
 * clean gap to cut in. Everything at or above BACKGROUND is dropped, everything
 * at or below INK is fully opaque, and the band between the two carries the
 * antialiasing.
 */
const WHITE_THRESHOLD = 246;
const BACKGROUND = 250;
const INK = 40;

const TARGETS = [
  {
    source: "assets/brand/onegames-logo-source.png",
    output: "public/onegames-logo.png",
    maxWidth: 1400,
    padding: 0.02,
    // The lockup sits on page backgrounds, so it needs to be cut out.
    transparent: true,
  },
  {
    source: "assets/brand/onegames-mark-source.png",
    output: "public/onegames-mark.png",
    maxWidth: 512,
    padding: 0.05,
    square: true,
    // The tab icon keeps a white tile so it stays legible on dark browser
    // chrome, the way OneRead's does.
    transparent: false,
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const target of TARGETS) {
  const data = await readFile(resolve(ROOT, target.source));
  const dataUrl = `data:image/png;base64,${data.toString("base64")}`;

  const png = await page.evaluate(
    async ({ dataUrl, maxWidth, padding, square, transparent, threshold, BACKGROUND, INK }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);

      // Bounding box of everything that is not background white.
      let top = canvas.height;
      let left = canvas.width;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const index = (y * canvas.width + x) * 4;
          const alpha = pixels[index + 3];
          const isInk =
            alpha > 8 &&
            (pixels[index] < threshold ||
              pixels[index + 1] < threshold ||
              pixels[index + 2] < threshold);
          if (!isInk) continue;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      if (right < 0) throw new Error("Image appears to be blank");

      let width = right - left + 1;
      let height = bottom - top + 1;
      const margin = Math.round(Math.max(width, height) * padding);

      let cropX = left - margin;
      let cropY = top - margin;
      let cropWidth = width + margin * 2;
      let cropHeight = height + margin * 2;

      if (square) {
        const side = Math.max(cropWidth, cropHeight);
        cropX -= Math.round((side - cropWidth) / 2);
        cropY -= Math.round((side - cropHeight) / 2);
        cropWidth = side;
        cropHeight = side;
      }

      const scale = Math.min(1, maxWidth / cropWidth);
      const out = document.createElement("canvas");
      out.width = Math.round(cropWidth * scale);
      out.height = Math.round(cropHeight * scale);
      const outContext = out.getContext("2d", { willReadFrequently: true });
      outContext.imageSmoothingQuality = "high";
      // Paint the background back in, so the crop can extend past the source.
      outContext.fillStyle = "#FFFFFF";
      outContext.fillRect(0, 0, out.width, out.height);
      outContext.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        out.width,
        out.height,
      );

      if (transparent) {
        // The supplied art is flat colour composited on a near-white field, so
        // its "white" reads as a grey box on a white page. Recover the alpha
        // from how far each pixel is from white, then undo the compositing so
        // the coloured buttons keep their true hue instead of staying washed
        // out. Deriving alpha per-pixel preserves the antialiased edges.
        const image = outContext.getImageData(0, 0, out.width, out.height);
        const px = image.data;
        for (let i = 0; i < px.length; i += 4) {
          const min = Math.min(px[i], px[i + 1], px[i + 2]);
          const alpha = Math.round(
            Math.max(0, Math.min(255, ((BACKGROUND - min) / (BACKGROUND - INK)) * 255)),
          );
          if (alpha <= 0) {
            px[i + 3] = 0;
            continue;
          }
          const ratio = alpha / 255;
          for (let channel = 0; channel < 3; channel += 1) {
            px[i + channel] = Math.max(
              0,
              Math.min(255, (px[i + channel] - 255 * (1 - ratio)) / ratio),
            );
          }
          px[i + 3] = alpha;
        }
        outContext.putImageData(image, 0, 0);
      }

      return {
        base64: out.toDataURL("image/png").split(",")[1],
        width: out.width,
        height: out.height,
      };
    },
    {
      dataUrl,
      maxWidth: target.maxWidth,
      padding: target.padding,
      square: Boolean(target.square),
      transparent: Boolean(target.transparent),
      threshold: WHITE_THRESHOLD,
      BACKGROUND,
      INK,
    },
  );

  const buffer = Buffer.from(png.base64, "base64");
  await writeFile(resolve(ROOT, target.output), buffer);
  console.log(
    `${target.output} — ${png.width}×${png.height}, ${(buffer.length / 1024).toFixed(0)} KB`,
  );
}

await browser.close();
