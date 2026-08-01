import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  [320, 568],
  [360, 800],
  [390, 844],
  [768, 1024],
  [1440, 900],
] as const;

test("OneWord remains focused and usable at every required viewport", async ({
  context,
  page,
}) => {
  await context.addCookies([
    { name: "onegames_test", value: "1", url: "http://localhost:3000" },
  ]);
  await page.addInitScript(() =>
    window.localStorage.setItem("onegames:v1:word:help-seen", "1"),
  );
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    await page.goto("/word?date=2026-01-01");
    await expect(page.getByRole("heading", { name: "OneWord" })).toBeVisible();
    const geometry = await page.evaluate(() => ({
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      keyboardBottom: Math.round(
        document.querySelector(".word-keyboard")?.getBoundingClientRect()
          .bottom ?? 9999,
      ),
      overlay: Boolean(
        document.querySelector(
          "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
        ),
      ),
    }));
    expect(
      geometry.horizontalOverflow,
      `${width}x${height} horizontal overflow`,
    ).toBeLessThanOrEqual(1);
    expect(
      geometry.keyboardBottom,
      `${width}x${height} keyboard below fold`,
    ).toBeLessThanOrEqual(height);
    expect(geometry.overlay).toBe(false);
    await page.screenshot({
      path: `/private/tmp/oneword-${width}x${height}.png`,
      fullPage: true,
    });
  }
});
