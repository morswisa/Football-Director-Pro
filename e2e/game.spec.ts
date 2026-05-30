import { expect, test } from "@playwright/test";

async function createAcceptanceCareer(page: import("@playwright/test").Page, clubName = "Testford FC") {
  await page.goto("/");
  await page.getByRole("link", { name: /Create Club/ }).click();
  await page.getByLabel("Club name").fill(clubName);
  await page.getByLabel("Chairman").fill("Acceptance Chair");
  await page.getByLabel("Stadium").fill("Acceptance Park");
  const createButton = page.getByRole("button", { name: "Continue" });
  await createButton.scrollIntoViewIfNeeded();
  await createButton.click({ force: true });
  await page.waitForURL(/\/game\/?$/);
  await expect(page.getByText(clubName)).toBeVisible();
}

async function resolveEventsUntilMatchPreview(page: import("@playwright/test").Page) {
  for (let step = 0; step < 40; step += 1) {
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    if (await dialog.getByRole("button", { name: "Play Match" }).count()) {
      return;
    }

    if (await dialog.getByRole("heading", { name: "Set transfer budget" }).count()) {
      await dialog.getByRole("button", { name: /^Normal/ }).click();
      await page.getByRole("button", { name: "Set Transfer Budget" }).click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Walk Away" }).count()) {
      await dialog.getByRole("button", { name: "Walk Away" }).first().click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Reject Bid" }).count()) {
      await dialog.getByRole("button", { name: "Reject Bid" }).click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Reject" }).count()) {
      await dialog.getByRole("button", { name: "Reject" }).first().click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Release" }).count()) {
      await dialog.getByRole("button", { name: "Release" }).click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Continue" }).count()) {
      await dialog.getByRole("button", { name: "Continue" }).click();
      continue;
    }

    throw new Error(`Unhandled event dialog at step ${step}: ${await dialog.innerText()}`);
  }

  throw new Error("Did not reach a match preview within 40 event steps.");
}

async function resolveEventsUntilFirstMatchResult(page: import("@playwright/test").Page) {
  for (let step = 0; step < 40; step += 1) {
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    if (await dialog.getByRole("button", { name: "See Match" }).count()) {
      await dialog.getByRole("button", { name: "See Match" }).click();
      await expect(dialog).toContainText("Match result");
      await expect(dialog).toContainText("Impact: board confidence");
      await expect(dialog).toContainText("manager trust");
      await expect(dialog).toContainText("stadium condition");
      await dialog.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Last result")).toBeVisible();
      return;
    }

    if (await dialog.getByRole("heading", { name: "Set transfer budget" }).count()) {
      await dialog.getByRole("button", { name: /^Normal/ }).click();
      await page.getByRole("button", { name: "Set Transfer Budget" }).click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Walk Away" }).count()) {
      await dialog.getByRole("button", { name: "Walk Away" }).first().click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Reject Bid" }).count()) {
      await dialog.getByRole("button", { name: "Reject Bid" }).click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Reject" }).count()) {
      await dialog.getByRole("button", { name: "Reject" }).first().click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Release" }).count()) {
      await dialog.getByRole("button", { name: "Release" }).click();
      continue;
    }

    if (await dialog.getByRole("button", { name: "Continue" }).count()) {
      await dialog.getByRole("button", { name: "Continue" }).click();
      continue;
    }

    throw new Error(`Unhandled event dialog at step ${step}: ${await dialog.innerText()}`);
  }

  throw new Error("Did not reach a match result within 40 event steps.");
}

test("new career reaches playable dashboard", async ({ page }) => {
  await createAcceptanceCareer(page);

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
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  importedSave.clubs[importedSave.userClubId].name = "Imported FC";
  await page.getByPlaceholder("Paste exported save JSON here").fill("{ invalid save");
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();
  await expect(page.getByText("Import failed. Paste a valid Football Director Pro save.")).toBeVisible();
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();
  await expect(page.getByText("Imported into Slot 1.")).toBeVisible();
  await expect(page.getByText("Imported FC", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("League Path");
  await expect(page.getByRole("dialog")).toContainText("Imported FC");
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

  await resolveEventsUntilFirstMatchResult(page);
});

test("play match runs live before returning to the result", async ({ page }) => {
  await createAcceptanceCareer(page, "Liveford FC");

  await page.getByRole("button", { name: "Continue" }).click();
  await resolveEventsUntilMatchPreview(page);
  await page.getByRole("dialog").getByRole("button", { name: "Play Match" }).click();

  const liveDialog = page.getByRole("dialog");
  await expect(liveDialog).toContainText("Live match");
  await expect(liveDialog).toContainText("Match is in progress");
  await expect(page.getByTestId("live-minute")).toContainText("0'");
  await expect(liveDialog.getByRole("button", { name: "Continue" })).toHaveCount(0);

  await expect.poll(async () => {
    const text = await page.getByTestId("live-minute").innerText();
    return Number.parseInt(text, 10);
  }, { timeout: 2_000 }).toBeGreaterThanOrEqual(5);

  const sampledMinutes = await page.evaluate(async () => {
    const element = document.querySelector('[data-testid="live-minute"]');
    const values: number[] = [];
    const started = Date.now();
    while (Date.now() - started < 1_200) {
      const value = Number.parseInt(element?.textContent ?? "", 10);
      if (Number.isFinite(value) && values.at(-1) !== value) values.push(value);
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    }
    return values;
  });
  expect(sampledMinutes.length).toBeGreaterThan(3);
  expect(sampledMinutes.slice(1).every((minute, index) => minute - sampledMinutes[index] === 1)).toBe(true);

  await expect(page.getByTestId("live-minute")).toContainText("90'", { timeout: 12_000 });
  await expect(liveDialog).toContainText("Final whistle");
  await liveDialog.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("Match result");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Last result")).toBeVisible();
});

test("manager dismissal still allows emergency replacement", async ({ page }) => {
  await createAcceptanceCareer(page, "Coachford FC");

  await page.getByRole("button", { name: /Manager/i }).click();
  await page.getByRole("button", { name: "Fire Manager" }).click();

  const fireDialog = page.getByRole("dialog");
  await expect(fireDialog).toContainText("Confirm dismissal");
  await expect(fireDialog).toContainText("Compensation");
  await expect(fireDialog).toContainText("Balance after");
  await expect(fireDialog).toContainText("Debt limit");
  await fireDialog.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("No manager appointed")).toBeVisible();
  await expect(page.getByText("Emergency replacement is available")).toBeVisible();

  const negotiateButtons = page.getByRole("button", { name: "Negotiate" });
  await expect(negotiateButtons.first()).toBeEnabled();
  await negotiateButtons.first().click();

  const hireDialog = page.getByRole("dialog");
  await expect(hireDialog).toContainText("Manager negotiation");
  await expect(hireDialog).toContainText("Expected wage");
  await expect(hireDialog).toContainText("Immediate cost");
  await expect(hireDialog).toContainText("Balance after cost");
  await expect(hireDialog).toContainText("New wage bill");
  await hireDialog.getByRole("button", { name: "Submit Offer" }).click();

  await expect(page.getByText("Manager hired.")).toBeVisible();
  await expect(page.getByText("No manager appointed")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Fire Manager" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Negotiate" }).first()).toBeDisabled();
});

test("stadium upgrades and repairs show clear financial impact", async ({ page }) => {
  await createAcceptanceCareer(page, "Standford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  const importedClub = importedSave.clubs[importedSave.userClubId];
  importedClub.finances.balance = 2_000_000;
  importedClub.stadium.condition = 72;
  delete importedSave.financialSnapshot;
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();
  await expect(page.getByText("Imported into Slot 1.")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Stadium/i }).click();
  await expect(page.getByTestId("stadium-condition")).toContainText("72%");
  const startingCapacity = Number((await page.getByTestId("stadium-capacity").innerText()).replace(/,/g, ""));
  await page.getByRole("button", { name: "Upgrade" }).first().click();
  await expect(page.getByText("Stand upgraded.")).toBeVisible();
  await expect.poll(async () => Number((await page.getByTestId("stadium-capacity").innerText()).replace(/,/g, ""))).toBe(startingCapacity + 850);

  await page.getByRole("button", { name: "Repair Stadium" }).click();
  await expect(page.getByText("Stadium repaired if funds were available.")).toBeVisible();
  await expect(page.getByTestId("stadium-condition")).toContainText("100%");

  await page.getByRole("button", { name: "Back to Dashboard" }).click();
  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Infrastructure spending")).toBeVisible();
  await expect(page.getByText("Stadium repair", { exact: true })).toBeVisible();
  await expect(page.getByText(/Stadium upgrade:/)).toBeVisible();
});
