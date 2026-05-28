import { expect, test } from "@playwright/test";

test("new career reaches playable dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Create Club/ }).click();
  await page.getByLabel("Club name").fill("Testford FC");
  const createButton = page.getByRole("button", { name: "Continue" });
  await createButton.scrollIntoViewIfNeeded();
  await createButton.click({ force: true });
  await page.waitForURL(/\/game\/?$/);
  await expect(page.getByText("Testford FC")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Crowd outlook")).toBeVisible();
});
