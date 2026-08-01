import { expect, test, type Page } from "@playwright/test";
import { getTodayKey } from "../lib/date";
import { getDailyPuzzle } from "../lib/sudoku/puzzles";
import { candidatesFor, getStandardPeers, solve } from "../lib/sudoku/solver";

/**
 * Pins the first empty cell to a stable locator. Resolving `[aria-label*=empty]`
 * lazily would silently retarget the moment a value is entered.
 */
async function firstEmptyCell(page: Page) {
  const index = await page
    .locator('[data-cell][aria-label*="empty"]')
    .first()
    .getAttribute("data-cell");
  return page.locator(`[data-cell="${index}"]`);
}

test.describe("Access", () => {
  test("the test path opens the game without email or payment", async ({ page }) => {
    await page.goto("/play");

    await expect(
      page.getByRole("heading", { name: "Where should we send your code?" }),
    ).toBeVisible();
    // The no-account option is a line of text under the form, not a rival button.
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();

    await page.getByRole("button", { name: /without an account/ }).click();

    await expect(page).toHaveURL(/\/sudoku/);
    await expect(page.getByRole("heading", { name: "OneSudoku" })).toBeVisible();
  });

  test("the game is gated for visitors with no session", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/sudoku");
    await expect(page).toHaveURL(/\/play/);
  });

  test("an invalid email is rejected before any request is sent", async ({ page }) => {
    await page.goto("/play");
    await page.getByPlaceholder("you@example.com").fill("not-an-email");
    await page.getByRole("button", { name: "Continue with email" }).click();
    // Scoped to main: Next.js keeps its own route announcer with role="alert".
    await expect(page.getByRole("main").getByRole("alert")).toContainText("valid email");
  });
});

test.describe("OneSudoku", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: "onegames_test", value: "1", url: "http://localhost:3000" },
    ]);
    // Each test gets a fresh browser context, so localStorage starts empty —
    // clearing it on every navigation would defeat the persistence test.
    await page.goto("/sudoku");
    await expect(page.getByRole("heading", { name: "OneSudoku" })).toBeVisible();
  });

  test("accepts a number from the pad and starts the clock", async ({ page }) => {
    const cell = await firstEmptyCell(page);
    await cell.click();
    await page.getByRole("button", { name: "Enter 1", exact: false }).first().click();

    await expect(cell).toContainText("1");
    await expect(page.getByLabel(/Elapsed time/)).not.toHaveText("00:00", { timeout: 4000 });
  });

  test("accepts a number from the keyboard", async ({ page }) => {
    const cell = await firstEmptyCell(page);
    await cell.click();
    await page.keyboard.press("4");
    await expect(cell).toContainText("4");
  });

  test("records candidates in notes mode", async ({ page }) => {
    const cell = await firstEmptyCell(page);
    await cell.click();
    await page.keyboard.press("n");
    await expect(page.getByRole("button", { name: /Notes mode on/ })).toBeVisible();

    await page.keyboard.press("2");
    await page.keyboard.press("7");
    await expect(cell).toHaveAttribute("aria-label", /candidates 2 and 7/);

    // Leaving notes mode writes a value rather than another candidate.
    await page.keyboard.press("n");
    await page.keyboard.press("5");
    await expect(cell).toContainText("5");
  });

  test("moves the selection with the arrow keys", async ({ page }) => {
    await page.locator('[data-cell="10"]').click();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('[data-cell="11"]')).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-cell="20"]')).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator('[data-cell="19"]')).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator('[data-cell="10"]')).toHaveAttribute("aria-selected", "true");
  });

  test("undoes, redoes, and erases an entry", async ({ page }) => {
    const cell = await firstEmptyCell(page);
    await cell.click();
    await page.keyboard.press("6");
    await expect(cell).toContainText("6");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(cell).not.toContainText("6");

    await page.getByRole("button", { name: "Redo" }).click();
    await expect(cell).toContainText("6");

    await page.getByRole("button", { name: "Erase selected cell" }).click();
    await expect(cell).not.toContainText("6");
  });

  test("offers a hint and selects the cell it names", async ({ page }) => {
    await page.getByRole("button", { name: "Get a hint" }).click();
    const hint = page.getByRole("status");
    await expect(hint).toContainText(/row \d+, column \d+/);
    await expect(page.locator('[data-cell][aria-selected="true"]')).toHaveCount(1);
  });

  test("pauses and resumes", async ({ page }) => {
    const cell = await firstEmptyCell(page);
    await cell.click();
    await page.keyboard.press("3");

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("heading", { name: "Take your time." })).toBeVisible();

    await page.getByRole("button", { name: "Resume puzzle" }).click();
    await expect(page.getByRole("heading", { name: "Take your time." })).toHaveCount(0);
  });

  test("switches between the three daily chapters", async ({ page }) => {
    for (const level of ["easy", "medium", "hard"]) {
      const tab = page.getByRole("button", { name: level, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("grid", { name: "Sudoku puzzle" })).toBeVisible();
    }
  });

  test("keeps progress across a reload", async ({ page }) => {
    const cell = await firstEmptyCell(page);
    const label = await cell.getAttribute("data-cell");
    await cell.click();
    await page.keyboard.press("8");
    await expect(cell).toContainText("8");

    await page.reload();
    await expect(page.locator(`[data-cell="${label}"]`)).toContainText("8");
  });

  test("explains the colored rule once and remembers the dismissal", async ({ page }) => {
    const intro = page.getByRole("heading", { name: "Something new in the grid." });
    await expect(intro).toBeVisible();
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(intro).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { name: "OneSudoku" })).toBeVisible();
    await expect(intro).toHaveCount(0);

    // The legend keeps the rule in view, and the info button can bring it back.
    await expect(page.getByText("Matching colored cells cannot repeat a number.")).toBeVisible();
    await page.getByRole("button", { name: "How colored cells work" }).click();
    await expect(intro).toBeVisible();
  });

  test("names the colored group in the cell's accessible label", async ({ page }) => {
    const colored = page.locator("[data-cell][data-region]").first();
    await expect(colored).toHaveAttribute("aria-label", /(coral|violet|mint|gold|sky) group/);
    // Cells outside a group say nothing about colour.
    const plain = page.locator("[data-cell]:not([data-region])").first();
    await expect(plain).not.toHaveAttribute("aria-label", /group/);
  });

  test("marks both cells when a colored group repeats a number", async ({ page }) => {
    // The screen opens on medium; find two empty cells that share a colour but
    // no row, column or box, so only the colored rule can be the complaint.
    const puzzle = getDailyPuzzle(getTodayKey(), "medium");
    let pair: [number, number, number] | null = null;
    for (const group of puzzle.coloredGroups) {
      const empty = group.cells.filter((cell) => puzzle.clues[cell] === 0);
      for (const a of empty) {
        for (const b of empty) {
          if (a >= b || getStandardPeers(a).includes(b)) continue;
          const value = candidatesFor(puzzle.clues, a).find((option) =>
            candidatesFor(puzzle.clues, b).includes(option),
          );
          if (value !== undefined && !pair) pair = [a, b, value];
        }
      }
    }
    if (!pair) throw new Error("Today's medium grid has no testable colored pair");
    const [first, second, value] = pair;

    await page.locator(`[data-cell="${first}"]`).click();
    await page.keyboard.press(String(value));
    await page.locator(`[data-cell="${second}"]`).click();
    await page.keyboard.press(String(value));

    await expect(page.locator(`[data-cell="${first}"]`)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`[data-cell="${second}"]`)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`[data-cell="${second}"]`)).toHaveAttribute(
      "aria-label",
      /repeats a number in the \w+ group/,
    );
  });

  test("keeps the reduced-motion preference", async ({ page }) => {
    await expect(page.locator(".page.reduce-motion")).toHaveCount(0);
    await page.getByRole("button", { name: "Open settings" }).click();
    const settings = page.getByRole("dialog", { name: "Settings" });
    await settings.getByText("Reduce motion", { exact: true }).click();
    await page.getByRole("button", { name: "Close settings" }).click();
    await expect(page.locator(".page.reduce-motion")).toHaveCount(1);

    await page.reload();
    await expect(page.locator(".page.reduce-motion")).toHaveCount(1);
  });

  test("reaches the archive from the game", async ({ page }) => {
    // The footer no longer carries it, so the game itself has to.
    await page.getByRole("link", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/sudoku\/archive/);
    await expect(page.getByRole("heading", { name: "Your local archive." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Today/ })).toBeVisible();
  });
});

test.describe("Finishing a puzzle", () => {
  test("shows the completion summary on the final entry", async ({ page, context }) => {
    const date = getTodayKey();
    const difficulty = "easy";
    const puzzle = getDailyPuzzle(date, difficulty);
    const clues = puzzle.clues;
    const solution = solve(clues, puzzle.coloredGroups);
    if (!solution) throw new Error("Today's easy grid has no solution");

    // Seed a save that is one entry short, so the test exercises the real
    // completion path rather than a mocked flag.
    const lastEmpty = clues.lastIndexOf(0);
    const board = solution.map((value, index) => (index === lastEmpty ? 0 : value));

    await context.addCookies([
      { name: "onegames_test", value: "1", url: "http://localhost:3000" },
    ]);
    await page.addInitScript(
      ({ key, save }) => window.localStorage.setItem(key, JSON.stringify(save)),
      {
        key: `onegames:v1:game:${date}:${difficulty}`,
        save: {
          version: 2,
          puzzleId: puzzle.id,
          date,
          difficulty,
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

    await page.goto("/sudoku");
    await page.getByRole("button", { name: "easy", exact: true }).click();

    const cell = page.locator(`[data-cell="${lastEmpty}"]`);
    await cell.click();
    await page.keyboard.press(String(solution[lastEmpty]));

    const summary = page.getByRole("dialog", { name: "Nicely done." });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("00:42");
    await expect(summary).toContainText("easy");
    if (puzzle.coloredGroups.length) {
      await expect(summary).toContainText(`${puzzle.coloredGroups.length} colored groups`);
    }
    await expect(summary.getByRole("button", { name: "Share result" })).toBeVisible();

    await summary.getByRole("button", { name: "Close completion summary" }).click();
    await expect(summary).toHaveCount(0);
  });
});
