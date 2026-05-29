import { expect, test } from "@playwright/test";

test("new career reaches playable dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Create Club/ }).click();
  await page.getByLabel("Club name").fill("Testford FC");
  await page.getByLabel("Chairman").fill("Acceptance Chair");
  await page.getByLabel("Stadium").fill("Acceptance Park");
  const createButton = page.getByRole("button", { name: "Continue" });
  await createButton.scrollIntoViewIfNeeded();
  await createButton.click({ force: true });
  await page.waitForURL(/\/game\/?$/);
  await expect(page.getByText("Testford FC")).toBeVisible();

  await page.getByRole("button", { name: /League/i }).click();
  await expect(page.getByText("Standings")).toBeVisible();
  await expect(page.getByText("Pts")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  await expect(page.getByText("ROSTER")).toBeVisible();
  await expect(page.getByText(/players/)).toBeVisible();
  await page.getByRole("button", { name: "Rate" }).click();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Manager/i }).click();
  await expect(page.getByText("Fire Manager")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Report period").first()).toBeVisible();
  await expect(page.getByText("Latest report breakdown")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Stadium/i }).click();
  await expect(page.getByText("Acceptance Park")).toBeVisible();
  await expect(page.getByText("Repair Stadium")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Training/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Training Ground");
  await expect(page.getByRole("dialog")).toContainText("Selected change");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: /Youth/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Youth Academy");
  await expect(page.getByRole("dialog")).toContainText("Cost to upgrade");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: /Record/i }).click();
  await expect(page.getByText("Current Season")).toBeVisible();
  await expect(page.getByText("Achievements")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Export Save")).toBeVisible();
  await expect(page.getByText("Import Save")).toBeVisible();
  await expect(page.getByText("Reset Career")).toBeVisible();
  await page.getByRole("button", { name: "Large Text" }).click();
  await expect(page.getByRole("button", { name: "Sound On" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("League Path");
  await expect(page.getByRole("dialog")).toContainText("Testford FC");
  await expect(page.getByRole("dialog")).not.toContainText("Trust");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Crowd outlook")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Transfer window open")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Set transfer budget" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: /^Normal/ }).click();
  await page.getByRole("button", { name: "Set Transfer Budget" }).click();
  await expect(page.getByText("Transfer budget confirmed")).toBeVisible();
});
