import { expect, test, type Page } from "@playwright/test";

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

    await expect(page.getByRole("heading", { name: "Start OneGames." })).toBeVisible();
    // The offer sits directly under the email field, as an alternative to it.
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();

    await page.getByRole("button", { name: /Test this game/ }).click();

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
    await expect(page.getByRole("alert")).toContainText("valid email");
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

  test("reaches the archive and back", async ({ page }) => {
    await page.getByRole("link", { name: "Archive" }).first().click();
    await expect(page).toHaveURL(/\/sudoku\/archive/);
    await expect(page.getByRole("heading", { name: "Your local archive." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Today/ })).toBeVisible();
  });
});
