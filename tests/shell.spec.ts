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

  test("the wordmark is the same size and centred on every page", async ({ page }) => {
    const measurements: { path: string; width: number; centreOffset: number }[] = [];

    for (const { path } of PAGES) {
      await page.goto(path);
      const header = page.locator("header.site-header").first();
      const mark = header.locator(".brand-logo-mark");
      const markBox = await mark.boundingBox();
      const headerBox = await header.boundingBox();
      if (!markBox || !headerBox) throw new Error(`No wordmark measured on ${path}`);

      measurements.push({
        path,
        width: markBox.width,
        centreOffset:
          markBox.x + markBox.width / 2 - (headerBox.x + headerBox.width / 2),
      });
    }

    const widths = measurements.map((entry) => entry.width);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);

    for (const entry of measurements) {
      expect(Math.abs(entry.centreOffset), `${entry.path} is off centre`).toBeLessThan(1.5);
    }
  });

  test("every page uses the same top padding", async ({ page }) => {
    const tops: number[] = [];
    for (const { path } of PAGES) {
      await page.goto(path);
      const box = await page.locator("header.site-header").first().boundingBox();
      if (!box) throw new Error(`No header on ${path}`);
      tops.push(box.y);
    }
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
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
