import { expect, test } from "@playwright/test";
import { getTodayKey } from "../lib/date";
import { getDailyDnaPuzzle } from "../lib/dna/puzzles";

test.beforeEach(async ({ page, context }) => {
  await context.addCookies([
    { name: "onegames_test", value: "1", url: "http://localhost:3000" },
  ]);
  await page.addInitScript(() =>
    window.localStorage.setItem("onegames:v1:dna:tutorial-seen", "1"),
  );
  await page.goto("/dna");
});

test.describe("OneDna game", () => {
  test("renders the 6x6 board and accessible bonds", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "OneDna" })).toBeVisible();
    await expect(
      page.getByRole("grid", { name: "6 by 6 OneDna board" }),
    ).toBeVisible();
    await expect(page.locator("[data-cell]")).toHaveCount(36);
    await expect(page.locator(".dna-bonds path")).toHaveCount(5);
    await expect(
      page
        .locator("[data-cell]")
        .filter({ has: page.locator(".dna-bond-badge") })
        .first(),
    ).toHaveAttribute("aria-label", /Bonded cells must be complementary/i);
  });
  test("renders Hard at 8x8 without horizontal overflow", async ({ page }) => {
    await page.getByRole("button", { name: "hard", exact: true }).click();
    await expect(
      page.getByRole("grid", { name: "8 by 8 OneDna board" }),
    ).toBeVisible();
    await expect(page.locator("[data-cell]")).toHaveCount(64);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
  test("supports keyboard base entry, movement, erase, undo and redo", async ({
    page,
  }) => {
    const empty = page.locator("[data-cell]:not(.is-given)").first();
    await empty.click();
    const index = Number(await empty.getAttribute("data-cell"));
    await page.keyboard.press("A");
    await expect(page.locator(`[data-cell="${index}"] .dna-base`)).toHaveText(
      "A",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(`[data-cell="${index + 1}"]`)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    await expect(page.locator(`[data-cell="${index}"] .dna-base`)).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator(`[data-cell="${index}"] .dna-base`)).toHaveText(
      "A",
    );
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.locator(`[data-cell="${index}"] .dna-base`)).toHaveCount(
      0,
    );
  });
  test("explains a real logical hint and pauses the timer", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Hint" }).click();
    await expect(page.getByText("Next move")).toBeVisible();
    await expect(page.locator(".dna-cell.is-hint")).not.toHaveCount(0);
    const empty = page.locator("[data-cell]:not(.is-given)").first();
    await empty.click();
    await page.keyboard.press("A");
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  });
  test("keeps givens immutable and marks both ends of a broken bond", async ({
    page,
  }) => {
    const given = page.locator("[data-cell].is-given").first();
    const original = await given.innerText();
    await given.click();
    await page.keyboard.press(original.includes("A") ? "G" : "A");
    await expect(given).toHaveText(original);

    const puzzle = getDailyDnaPuzzle(getTodayKey(), "medium");
    const bond = puzzle.bonds.find(
      ({ a, b }) => !puzzle.clues[a] || !puzzle.clues[b],
    );
    if (!bond) throw new Error("Today's medium puzzle has no editable bond");
    const first = puzzle.clues[bond.a] ? bond.b : bond.a;
    const second = first === bond.a ? bond.b : bond.a;
    if (!puzzle.clues[second]) {
      await page.locator(`[data-cell="${second}"]`).click();
      await page.keyboard.press("A");
    }
    const partnerValue = puzzle.clues[second] ?? "A";
    await page.locator(`[data-cell="${first}"]`).click();
    await page.keyboard.press(partnerValue);
    await expect(page.locator(`[data-cell="${first}"]`)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator(`[data-cell="${second}"]`)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  test("persists an entry and reduced-motion preference across reloads", async ({
    page,
  }) => {
    const empty = page.locator("[data-cell]:not(.is-given)").first();
    const index = Number(await empty.getAttribute("data-cell"));
    await empty.click();
    await page.keyboard.press("A");
    await page.getByRole("button", { name: "Open OneDna settings" }).click();
    await page.getByRole("switch", { name: "Reduce motion" }).click();
    await page.getByRole("button", { name: "Close settings" }).click();
    await page.reload();
    await expect(page.locator(`[data-cell="${index}"] .dna-base`)).toHaveText(
      "A",
    );
    await expect(page.locator(".page.reduce-motion")).toHaveCount(1);
  });
  test("replays the tutorial and opens an archived puzzle", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "How to play" }).click();
    await expect(page.getByRole("dialog")).toContainText("Two pair families");
    await page.getByRole("button", { name: "Skip" }).click();
    await page.getByRole("link", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/dna\/archive/);
    await page.getByRole("link", { name: /Today/ }).click();
    await expect(page).toHaveURL(/\/dna\?date=/);
  });
});

test("finishes a seeded puzzle and offers a spoiler-free share", async ({
  page,
}) => {
  const date = getTodayKey();
  const puzzle = getDailyDnaPuzzle(date, "medium");
  const last = puzzle.clues.findLastIndex((cell) => !cell);
  const board = puzzle.solution.map((base, index) =>
    index === last ? null : base,
  );
  await page.evaluate(
    ({ key, save }) => window.localStorage.setItem(key, JSON.stringify(save)),
    {
      key: `onegames:v1:dna:game:${date}:medium`,
      save: {
        version: 1,
        puzzleId: puzzle.id,
        date,
        difficulty: "medium",
        size: puzzle.size,
        board,
        notes: {},
        elapsed: 42,
        started: true,
        completed: false,
        mistakes: 0,
        hints: 0,
        history: [],
        future: [],
      },
    },
  );
  await page.reload();
  await page.locator(`[data-cell="${last}"]`).click();
  await page.keyboard.press(puzzle.solution[last]);
  const summary = page.getByRole("dialog", { name: "Puzzle completed" });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("00:42");
  await expect(
    summary.getByRole("button", { name: "Share result" }),
  ).toBeVisible();
  await expect(summary).toContainText("never includes the letters");
});

test("the DNA access path returns to DNA", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/dna");
  await expect(page).toHaveURL(/\/play\?game=dna/);
  await page.getByRole("button", { name: /without an account/ }).click();
  await expect(page).toHaveURL(/\/dna$/);
});

test("homepage links directly to OneDna", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Play OneDna" }).click();
  await expect(page).toHaveURL(/\/dna/);
});
