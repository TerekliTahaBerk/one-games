import { expect, test } from "@playwright/test";

/**
 * The brief is that OneGames reads as one product from the opening frame to the
 * footer, and as OneRead's sibling. These tests hold the shell to that: the same
 * wordmark at the same size in the same place, and the same footer, on every
 * route — including the game and the archive.
 */
const PAGES = [
  { path: "/", name: "home" },
  { path: "/play", name: "access" },
  { path: "/pricing", name: "pricing" },
  { path: "/about", name: "about" },
  { path: "/privacy", name: "privacy" },
  { path: "/terms", name: "terms" },
  { path: "/sudoku", name: "game" },
  { path: "/sudoku/archive", name: "archive" },
];

const FOOTER_LINKS = ["Terms", "Privacy", "About", "Pricing", "Archive", "OneRead"];

test.beforeEach(async ({ context }) => {
  // The game and archive need a session; the test path is the honest way in.
  await context.addCookies([
    { name: "onegames_test", value: "1", url: "http://localhost:3000" },
  ]);
});

test.describe("Shared shell", () => {
  for (const { path, name } of PAGES) {
    test(`${name} carries the same wordmark and footer`, async ({ page }) => {
      await page.goto(path);

      const wordmark = page.getByText("OneGames", { exact: true }).first();
      await expect(wordmark).toBeVisible();

      const footer = page.getByRole("contentinfo");
      await expect(footer).toContainText("One good game at a time.");
      for (const label of FOOTER_LINKS) {
        await expect(footer.getByRole("link", { name: label, exact: true })).toBeVisible();
      }
    });
  }

  test("the lockup is the same size and centred on every page", async ({ page }) => {
    const measurements: {
      path: string;
      markWidth: number;
      characterHeight: number;
      centreOffset: number;
    }[] = [];

    for (const { path } of PAGES) {
      await page.goto(path);
      const header = page.locator("header.site-header").first();
      const lockup = header.locator(".brand-logo");
      const markBox = await lockup.locator(".brand-logo-mark").boundingBox();
      const characterBox = await lockup.locator(".brand-character").boundingBox();
      const lockupBox = await lockup.boundingBox();
      const headerBox = await header.boundingBox();
      if (!markBox || !characterBox || !lockupBox || !headerBox) {
        throw new Error(`No lockup measured on ${path}`);
      }

      measurements.push({
        path,
        markWidth: markBox.width,
        characterHeight: characterBox.height,
        // It is the whole lockup — wordmark plus character — that is centred,
        // not the text on its own.
        centreOffset: lockupBox.x + lockupBox.width / 2 - (headerBox.x + headerBox.width / 2),
      });
    }

    const markWidths = measurements.map((entry) => entry.markWidth);
    const characterHeights = measurements.map((entry) => entry.characterHeight);
    expect(Math.max(...markWidths) - Math.min(...markWidths)).toBeLessThan(1);
    expect(Math.max(...characterHeights) - Math.min(...characterHeights)).toBeLessThan(1);

    for (const entry of measurements) {
      expect(Math.abs(entry.centreOffset), `${entry.path} is off centre`).toBeLessThan(1.5);
    }
  });

  test("the character stands on the wordmark's baseline", async ({ page }) => {
    await page.goto("/");

    // Measure the real typographic baseline: a zero-height inline-block aligns
    // its top to it. Comparing against the text's box would only measure the
    // line box, which is not where the glyphs sit.
    const baseline = await page.evaluate(() => {
      const mark = document.querySelector(".brand-logo-mark");
      if (!mark) throw new Error("No wordmark");
      const probe = document.createElement("span");
      probe.style.cssText = "display:inline-block;width:0;height:0;";
      mark.appendChild(probe);
      const top = probe.getBoundingClientRect().top;
      probe.remove();
      return top;
    });

    const mark = await page.locator(".brand-logo-mark").first().boundingBox();
    const character = await page.locator(".brand-character").first().boundingBox();
    if (!mark || !character) throw new Error("No lockup measured");

    // Feet on the baseline, quills above the cap height, and to the right of
    // the wordmark rather than over it.
    expect(Math.abs(character.y + character.height - baseline)).toBeLessThan(3);
    expect(character.y).toBeLessThan(mark.y);
    expect(character.x).toBeGreaterThanOrEqual(mark.x + mark.width - 1);
  });

  test("every page uses the same top padding", async ({ page }) => {
    // Measured from the computed style rather than a bounding box: the reveal
    // animation offsets the header by 10px mid-flight, which would make a
    // geometry check pass or fail on timing alone.
    const paddings = new Set<string>();
    for (const { path } of PAGES) {
      await page.goto(path);
      const padding = await page
        .locator(".page")
        .first()
        .evaluate((node) => getComputedStyle(node).paddingTop);
      paddings.add(padding);
    }
    expect([...paddings]).toHaveLength(1);
  });

  test("footer links keep an accessible touch height", async ({ page }) => {
    await page.goto("/");
    const links = page.getByRole("contentinfo").getByRole("link");
    const count = await links.count();
    expect(count).toBe(FOOTER_LINKS.length);

    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("the page never scrolls sideways", async ({ page }) => {
    for (const { path } of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("Homepage", () => {
  test("shows the opening animation once per session, then reveals the page", async ({ page }) => {
    await page.goto("/");

    // The loader owns the first frame and hands off to the content reveal.
    await expect(page.locator(".opening-loader")).toBeVisible();
    await expect(page.locator(".opening-loader")).toHaveCount(0, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "One thoughtful game at a time." }),
    ).toBeVisible();

    // A second visit in the same session goes straight to the page.
    await page.goto("/pricing");
    await expect(page.locator(".opening-loader")).toHaveCount(0);
  });

  test("introduces the four games and their state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Meet the OneGames family." })).toBeVisible();

    await expect(page.getByRole("link", { name: "Play OneSudoku" })).toBeVisible();
    for (const name of ["OneWord", "OneMatch", "OneNumbers"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Coming soon")).toHaveCount(3);
  });

  test("the primary call to action reaches the access flow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Play OneGames" }).click();
    await expect(page).toHaveURL(/\/play/);
  });
});
