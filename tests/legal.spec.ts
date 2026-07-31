import { expect, test } from "@playwright/test";

/**
 * The legal pages use their own reading layout — left-aligned, starting at the
 * top of the column — while keeping the shared shell. `shell.spec.ts` already
 * covers the shell; these cover the document itself.
 */
const DOCUMENTS = [
  { path: "/privacy", title: "Quiet play includes quiet data." },
  { path: "/terms", title: "Simple terms for a simple membership." },
];

test.describe("Legal documents", () => {
  for (const { path, title } of DOCUMENTS) {
    test(`${path} is dated and headed`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByText(/^Last updated \w+ \d{1,2}, \d{4}$/)).toBeVisible();

      // Reference documents read left-aligned, not centred like the rest.
      const align = await page
        .locator(".legal-article")
        .evaluate((node) => getComputedStyle(node).textAlign);
      expect(align).toBe("left");

      // The column starts at the top rather than being vertically centred.
      const article = await page.locator(".legal-article").boundingBox();
      const header = await page.locator("header.site-header").boundingBox();
      expect(article!.y - (header!.y + header!.height)).toBeLessThan(120);
    });
  }

  /**
   * JSX drops whitespace next to an element inconsistently across line breaks,
   * which silently welded "not" to "sent". Assert the rendered sentences, since
   * the source looking right is not evidence that the output is.
   */
  test("inline emphasis keeps the spaces around it", async ({ page }) => {
    await page.goto("/privacy");
    const privacy = await page.locator(".legal-prose").innerText();
    expect(privacy).toContain("preferences are not sent to us");
    expect(privacy).toContain("the onegames:v1 namespace and");

    await page.goto("/terms");
    const terms = await page.locator(".legal-prose").innerText();
    expect(terms).toContain("billed monthly at $1 USD and continues");
    expect(terms).toContain("Games marked Coming soon are not part");
  });

  test("headings and lists carry through to the document", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 2, name: "What we keep" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Verification codes" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "valid for ten minutes" })).toBeVisible();
  });
});
