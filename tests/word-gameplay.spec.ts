import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: "onegames_test", value: "1", url: "http://localhost:3000" },
  ]);
  await page.goto("/word?date=2026-01-01");
  const help = page.getByRole("dialog", { name: "How to play OneWord" });
  await expect(help).toBeVisible();
  await help.getByRole("button", { name: "Let’s play" }).click();
  await expect(help).toHaveCount(0);
});

test.describe("OneWord gameplay", () => {
  test("supports physical input, validation, duplicate-safe feedback, and reload", async ({
    page,
  }) => {
    await page.keyboard.type("ABC");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toHaveText("Not enough letters");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("ALERT");
    await page.keyboard.press("Enter");
    await expect(page.locator(".word-row.is-submitted")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /A, correct/ }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".word-row.is-submitted")).toHaveCount(1);
  });

  test("wins once and restores the completed result", async ({ page }) => {
    await page.keyboard.type("ACORN");
    await page.keyboard.press("Enter");
    const result = page.getByRole("dialog", { name: "OneWord results" });
    await expect(result).toBeVisible({ timeout: 4000 });
    await expect(result).toContainText("Lovely work");
    await expect(result).toContainText("1 guess");
    await result.getByRole("button", { name: "Close" }).click();
    await page.reload();
    await expect(
      page.getByRole("dialog", { name: "OneWord results" }),
    ).toContainText("Lovely work");
  });

  test("locks after six valid misses and reveals the answer", async ({
    page,
  }) => {
    for (const guess of [
      "ALERT",
      "BERRY",
      "CLOUD",
      "DREAM",
      "ELITE",
      "FANCY",
    ]) {
      await page.keyboard.type(guess);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(700);
    }
    const result = page.getByRole("dialog", { name: "OneWord results" });
    await expect(result).toBeVisible();
    await expect(result).toContainText("ACORN");
    await result.getByRole("button", { name: "Close" }).click();
    await page.keyboard.type("ACORN");
    await expect(page.locator(".word-row.is-submitted")).toHaveCount(6);
  });

  test("settings are keyboard-accessible and persist", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    const settings = page.getByRole("dialog", { name: "OneWord settings" });
    await expect(settings).toBeVisible();
    await settings.getByRole("checkbox", { name: /Reduced motion/ }).check();
    await page.keyboard.press("Escape");
    await expect(settings).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(
      page.getByRole("checkbox", { name: /Reduced motion/ }),
    ).toBeChecked();
  });
});

test("homepage and access flow include OneWord", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Play OneWord" }).click();
  await expect(page).toHaveURL(/\/word/);
  await expect(page.getByRole("heading", { name: "OneWord" })).toBeVisible();
});
