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

const FOOTER_LINKS = ["Terms", "Privacy", "Pricing"];

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

      const wordmark = page.locator("header.site-header .brand-logo");
      await expect(wordmark).toBeVisible();
      await expect(wordmark).toHaveAttribute("aria-label", /OneGames/);

      const footer = page.getByRole("contentinfo");
      await expect(footer).toContainText("One good game at a time.");
      for (const label of FOOTER_LINKS) {
        await expect(footer.getByRole("link", { name: label, exact: true })).toBeVisible();
      }
    });
  }

  test("the lockup is the same size and centred on every page", async ({ page }) => {
    const measurements: { path: string; width: number; height: number; centreOffset: number }[] =
      [];

    for (const { path } of PAGES) {
      await page.goto(path);
      const header = page.locator("header.site-header").first();
      const lockup = header.locator(".brand-logo");
      const markBox = await lockup.locator(".brand-logo-mark").boundingBox();
      const lockupBox = await lockup.boundingBox();
      const headerBox = await header.boundingBox();
      if (!markBox || !lockupBox || !headerBox) throw new Error(`No lockup measured on ${path}`);

      measurements.push({
        path,
        width: markBox.width,
        height: markBox.height,
        centreOffset: lockupBox.x + lockupBox.width / 2 - (headerBox.x + headerBox.width / 2),
      });
    }

    const widths = measurements.map((entry) => entry.width);
    const heights = measurements.map((entry) => entry.height);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);

    for (const entry of measurements) {
      expect(Math.abs(entry.centreOffset), `${entry.path} is off centre`).toBeLessThan(1.5);
    }
  });

  test("the lockup artwork loads and keeps its proportions", async ({ page }) => {
    await page.goto("/");

    // A missing or broken asset still occupies a box, so assert the bitmap
    // actually decoded rather than trusting the layout.
    const image = await page.locator(".brand-logo-mark").first().evaluate((node) => {
      const element = node as HTMLImageElement;
      return {
        complete: element.complete,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
        renderedWidth: element.getBoundingClientRect().width,
        renderedHeight: element.getBoundingClientRect().height,
        src: element.currentSrc || element.src,
      };
    });

    expect(image.complete).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
    expect(image.src).toContain("/onegames-logo.png");

    // Rendered at the intended fixed height, undistorted.
    expect(image.renderedHeight).toBeGreaterThanOrEqual(27);
    expect(image.renderedHeight).toBeLessThanOrEqual(35);
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const renderedRatio = image.renderedWidth / image.renderedHeight;
    expect(Math.abs(sourceRatio - renderedRatio)).toBeLessThan(0.05);
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

  test("footer navigation links keep an accessible touch height", async ({ page }) => {
    // Scoped to the nav row specifically: the maker credit at the very bottom
    // is supplementary, not primary navigation, so it isn't held to the same
    // touch-target guarantee.
    await page.goto("/");
    const links = page.locator(".site-footer-nav a");
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

test.describe("Family credit", () => {
  test("the homepage points at OneRead from the top left", async ({ page }) => {
    await page.goto("/");

    const credit = page.locator(".parent-brand");
    await expect(credit).toHaveAttribute("href", "https://www.oneread.email/");
    await expect(credit.locator(".parent-brand-name")).toBeVisible();
    await expect(credit).toContainText("The One family");

    // The descriptor needs room beside the centred lockup, so it appears once
    // the header is wide enough; the "The One family" line always carries the
    // relationship on its own.
    const width = page.viewportSize()?.width ?? 0;
    const note = credit.locator(".parent-brand-note");
    if (width >= 640) {
      await expect(note).toBeVisible();
      await expect(note).toHaveText("Sibling to OneRead");
    } else {
      await expect(note).toBeHidden();
    }

    // Top left, and never reaching the lockup.
    const creditBox = await credit.boundingBox();
    const lockupBox = await page.locator(".brand-logo").boundingBox();
    const headerBox = await page.locator("header.site-header").boundingBox();
    if (!creditBox || !lockupBox || !headerBox) throw new Error("Header not measured");

    expect(creditBox.x).toBeLessThan(headerBox.x + 4);
    expect(creditBox.x + creditBox.width).toBeLessThanOrEqual(lockupBox.x);
  });

  test("it appears only on the homepage", async ({ page }) => {
    for (const { path } of PAGES.filter((entry) => entry.path !== "/")) {
      await page.goto(path);
      await expect(page.locator(".parent-brand")).toHaveCount(0);
    }
  });
});

test.describe("About link", () => {
  test("is a plain word in the homepage header, not an icon, and not in the footer", async ({
    page,
  }) => {
    await page.goto("/");

    const about = page
      .locator("header.site-header")
      .getByRole("link", { name: "About OneGames" });
    await expect(about).toBeVisible();
    await expect(about).toHaveText("About");
    await expect(about).toHaveAttribute("href", "/about");
    await expect(about.locator("svg")).toHaveCount(0);

    // Not duplicated at the bottom of the page it appears on.
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "About", exact: true }),
    ).toHaveCount(0);
  });

  test("does not appear on any other page's header or footer", async ({ page }) => {
    for (const { path } of PAGES.filter((entry) => entry.path !== "/")) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: "About OneGames" })).toHaveCount(0);
      await expect(
        page.getByRole("contentinfo").getByRole("link", { name: "About", exact: true }),
      ).toHaveCount(0);
    }
  });
});

test.describe("Footer statement and credit", () => {
  const MANIFESTO =
    "No feed to check. Just something worth opening. For people who want better inputs without another app to open.";

  test("the homepage carries the fuller statement under the tagline", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toContainText(MANIFESTO);
  });

  test("the statement does not appear on other pages", async ({ page }) => {
    for (const { path } of PAGES.filter((entry) => entry.path !== "/")) {
      await page.goto(path);
      await expect(page.locator(".site-footer-manifesto")).toHaveCount(0);
    }
  });

  test("the maker credit is the last line of the footer, on every page", async ({ page }) => {
    for (const { path } of PAGES) {
      await page.goto(path);

      const footer = page.getByRole("contentinfo");
      const credit = footer.locator(".site-footer-credit");
      await expect(credit).toContainText("digital products, thoughtfully crafted.");

      const link = credit.getByRole("link", { name: "yula.co" });
      await expect(link).toHaveAttribute("href", "https://yula.co");

      const isLastChild = await footer.evaluate(
        (node) => node.lastElementChild?.classList.contains("site-footer-credit") ?? false,
      );
      expect(isLastChild, `credit is not the last element in the footer on ${path}`).toBe(true);
    }
  });
});
