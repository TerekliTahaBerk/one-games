import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{
    name: "onegames_test",
    value: "1",
    url: "http://localhost:3000",
  }]);
});

test("enters through the test-game path without email or payment", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/play");
  await page.getByRole("button", { name: /Test this game/ }).click();
  await expect(page).toHaveURL(/\/sudoku/);
  await expect(page.getByRole("heading", { name: "OneSudoku" })).toBeVisible();
});

test("starts a daily Sudoku and enters a number", async ({ page }) => {
  await page.goto("/sudoku");
  await expect(page.getByRole("heading", { name: "OneSudoku" })).toBeVisible();
  const emptyCell = page.locator('[data-cell="2"]');
  await emptyCell.click();
  await page.getByRole("button", { name: "Enter 1" }).click();
  await expect(emptyCell).toContainText("1");
  await expect(page.getByLabel(/Elapsed time/)).not.toHaveText("00:00", { timeout: 3000 });
});

test("supports notes and keyboard movement", async ({ page }) => {
  await page.goto("/sudoku");
  const cell = page.locator('[data-cell="2"]');
  await cell.click();
  await page.keyboard.press("n");
  await page.keyboard.press("2");
  await expect(cell).toHaveAttribute("aria-label", /candidates 2/);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-cell="3"]')).toHaveAttribute("aria-selected", "true");
});
