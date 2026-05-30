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

async function expectMobileSurfaceHealthy(page: import("@playwright/test").Page, label: string) {
  const result = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const text = document.body.innerText;
    const overflowing = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return false;
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 5)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        text: element.textContent?.trim().slice(0, 80) ?? "",
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return {
      viewportWidth,
      documentWidth,
      hasBrokenText: /\bNaN\b|\bundefined\b/.test(text),
      overflowing,
    };
  });

  expect(result.hasBrokenText, `${label} should not show NaN or undefined`).toBe(false);
  expect(result.documentWidth, `${label} should not create page-level horizontal overflow`).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.overflowing, `${label} should not have visible elements outside the viewport`).toEqual([]);
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

async function readEventFinancialSnapshot(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog");
  return {
    period: await dialog.getByTestId("event-finance-period").innerText(),
    opening: await dialog.getByTestId("event-finance-opening").innerText(),
    closing: await dialog.getByTestId("event-finance-closing").innerText(),
    income: await dialog.getByTestId("event-finance-income").innerText(),
    expenses: await dialog.getByTestId("event-finance-expenses").innerText(),
    result: await dialog.getByTestId("event-finance-result").innerText(),
  };
}

async function resolveConservativeDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  if (await dialog.getByRole("button", { name: "See Match" }).count()) {
    await dialog.getByRole("button", { name: "See Match" }).click();
    return;
  }

  if (await dialog.getByRole("heading", { name: "Set transfer budget" }).count()) {
    await dialog.getByRole("button", { name: /^Normal/ }).click();
    await dialog.getByRole("button", { name: "Set Transfer Budget" }).click();
    return;
  }

  if (await dialog.getByRole("button", { name: "Walk Away" }).count()) {
    await dialog.getByRole("button", { name: "Walk Away" }).first().click();
    return;
  }

  if (await dialog.getByRole("button", { name: "Reject Bid" }).count()) {
    await dialog.getByRole("button", { name: "Reject Bid" }).click();
    return;
  }

  if (await dialog.getByRole("button", { name: "Reject" }).count()) {
    await dialog.getByRole("button", { name: "Reject" }).first().click();
    return;
  }

  if (await dialog.getByRole("button", { name: "Release" }).count()) {
    await dialog.getByRole("button", { name: "Release" }).click();
    return;
  }

  if (await dialog.getByRole("button", { name: "Extend Contract" }).count()) {
    await dialog.getByRole("button", { name: "Extend Contract" }).click();
    return;
  }

  if (await dialog.getByRole("button", { name: "Continue" }).count()) {
    await dialog.getByRole("button", { name: "Continue" }).click();
    return;
  }

  throw new Error(`Unhandled event dialog: ${await dialog.innerText()}`);
}

async function collectFinancialReports(page: import("@playwright/test").Page, targetCount: number) {
  const reports: Awaited<ReturnType<typeof readEventFinancialSnapshot>>[] = [];
  for (let step = 0; step < 160 && reports.length < targetCount; step += 1) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.count())) {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(dialog).toBeVisible();
    }

    if (await dialog.getByTestId("event-finance-result").count()) {
      await expect(dialog).toContainText("Balance moved from");
      await expect(dialog).toContainText("Balance movement");
      const dialogText = await dialog.innerText();
      expect(dialogText).not.toContain("NaN");
      reports.push(await readEventFinancialSnapshot(page));
      await dialog.getByRole("button", { name: "Continue" }).click();
      continue;
    }

    await resolveConservativeDialog(page);
  }

  expect(reports.length).toBe(targetCount);
  return reports;
}

async function clearCurrentDialog(page: import("@playwright/test").Page) {
  for (let step = 0; step < 40; step += 1) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.count())) return;
    await resolveConservativeDialog(page);
  }
  throw new Error("Could not clear the visible event dialog.");
}

async function resolveEventsUntilSeasonReview(page: import("@playwright/test").Page) {
  for (let step = 0; step < 280; step += 1) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.count())) {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(dialog).toBeVisible();
    }

    if (await dialog.getByText(/season review/i).count()) {
      await expect(dialog).toContainText("Season award");
      await expect(dialog).toContainText("Season impact");
      await expect(dialog).toContainText("Next");
      await expectMobileSurfaceHealthy(page, "Season review modal");
      return;
    }

    await resolveConservativeDialog(page);
  }

  throw new Error("Did not reach a season review from a clean save.");
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

test("financial reports stay consistent across several continue periods", async ({ page }) => {
  await createAcceptanceCareer(page, "Ledgerford FC");

  const reports = await collectFinancialReports(page, 3);
  const latestReport = reports.at(-1)!;
  expect(new Set(reports.map((report) => report.period)).size).toBeGreaterThan(1);

  await clearCurrentDialog(page);
  await expect(page.getByTestId("dashboard-latest-report")).toContainText(latestReport.result);

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByTestId("finance-summary-period")).toHaveText(latestReport.period);
  await expect(page.getByTestId("finance-summary-income")).toHaveText(latestReport.income);
  await expect(page.getByTestId("finance-summary-expenses")).toHaveText(latestReport.expenses);
  await expect(page.getByTestId("finance-summary-result")).toHaveText(latestReport.result);
  await expect(page.getByTestId("finance-summary-opening")).toHaveText(latestReport.opening);
  await expect(page.getByTestId("finance-summary-closing")).toHaveText(latestReport.closing);
  await expect(page.getByTestId("finance-breakdown-income")).toHaveText(latestReport.income);
  await expect(page.getByTestId("finance-breakdown-expenses")).toHaveText(latestReport.expenses);
  await expect(page.getByTestId("finance-breakdown-result")).toHaveText(latestReport.result);
});

test("mobile V1 surfaces stay readable without horizontal overflow", async ({ page }) => {
  await createAcceptanceCareer(page, "Mobileford FC");
  await expectMobileSurfaceHealthy(page, "Dashboard");

  const surfaces: { button: RegExp | string; expected: string; label: string }[] = [
    { button: /League/i, expected: "Standings", label: "League" },
    { button: /Roster/i, expected: "ROSTER", label: "Roster" },
    { button: /Manager/i, expected: "Fire Manager", label: "Manager" },
    { button: /Finances/i, expected: "Latest report breakdown", label: "Finances" },
    { button: /Stadium/i, expected: "Repair Stadium", label: "Stadium" },
    { button: /Record/i, expected: "Current Season", label: "History" },
  ];

  for (const surface of surfaces) {
    await page.getByRole("button", { name: surface.button }).click();
    await expect(page.getByText(surface.expected).first()).toBeVisible();
    await expectMobileSurfaceHealthy(page, surface.label);
    await page.getByRole("button", { name: "Back to Dashboard" }).click();
    await expectMobileSurfaceHealthy(page, `Dashboard after ${surface.label}`);
  }

  await page.getByRole("button", { name: /Training/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Training Ground");
  await expectMobileSurfaceHealthy(page, "Training modal");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: /Youth/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Youth Academy");
  await expectMobileSurfaceHealthy(page, "Youth modal");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Export Save")).toBeVisible();
  await expectMobileSurfaceHealthy(page, "Settings");
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectMobileSurfaceHealthy(page, "Continue event modal");
});

test("clean save reaches repeated season reviews and history in browser", async ({ page }) => {
  test.setTimeout(140_000);
  await createAcceptanceCareer(page, "Seasonford FC");

  await resolveEventsUntilSeasonReview(page);
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("League Path");
  await expect(page.getByRole("dialog")).toContainText("Seasonford FC");
  await expectMobileSurfaceHealthy(page, "Next season intro modal");
  await resolveEventsUntilSeasonReview(page);
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("League Path");
  await expect(page.getByRole("dialog")).toContainText("Seasonford FC");
  await expectMobileSurfaceHealthy(page, "Second next season intro modal");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: /Record/i }).click();
  await expect(page.getByText("Season History")).toBeVisible();
  await expect(page.getByText("Seasonford FC")).toBeVisible();
  await expect(page.getByText("2030/31")).toBeVisible();
  await expect(page.getByText("2031/32")).toBeVisible();
  await expect(page.getByText("Award").first()).toBeVisible();
  await expect(page.getByText("Balance").first()).toBeVisible();
  await expect(page.getByText(/Board [+-]?\d+ pts/).first()).toBeVisible();
  await expect(page.getByText(/Trust [+-]?\d+ pts/).first()).toBeVisible();
  await expect(page.getByText(/Reputation [+-]?\d+ pts/).first()).toBeVisible();
  await expect(page.locator("p", { hasText: /Season impact: Board/ })).toHaveCount(2);
  await expectMobileSurfaceHealthy(page, "Post-season history surface");
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

  await page.getByRole("button", { name: "Back to Dashboard" }).click();
  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText(/Manager compensation:/)).toBeVisible();
  await expect(page.getByText("Infrastructure spending")).toBeVisible();
  await expect(page.getByTestId("finance-summary-closing")).toBeVisible();
});

test("paid transfer signing shows player and finance trail", async ({ page }) => {
  test.setTimeout(45_000);
  await createAcceptanceCareer(page, "Transferford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  const userClub = importedSave.clubs[importedSave.userClubId];
  const sellerId = Object.keys(importedSave.clubs).find((clubId) => clubId !== importedSave.userClubId);
  const seller = importedSave.clubs[sellerId];
  const targetId = seller.playerIds[0];
  const target = importedSave.players[targetId];
  userClub.finances.balance = 1_500_000;
  userClub.finances.transactions = [];
  target.name = "Acceptance Target";
  target.position = "F";
  target.rating = 68;
  target.age = 24;
  target.value = 180_000;
  target.wage = 2_000;
  target.contractYears = 2;
  importedSave.transferBudget = { mode: "normal", amount: 1_500_000 };
  importedSave.financialSnapshot = undefined;
  importedSave.eventQueue = [];
  importedSave.currentEvent = {
    id: "contract_offer_acceptance_target",
    type: "contract_offer",
    title: "Manager target identified",
    body: `The manager wants to negotiate for transfer target Acceptance Target from ${seller.name}.`,
    note: "This is an external transfer target, not a current squad contract. Walking away reduces manager trust by 4; completing the signing improves it by 4.",
    requiresDecision: true,
    createdSeason: importedSave.season,
    createdWeek: importedSave.week,
    playerId: targetId,
    managerId: userClub.managerId,
    variant: "neutral",
    proposal: {
      id: "proposal_acceptance_target",
      type: "buy",
      week: importedSave.week,
      title: "Sign Acceptance Target",
      rationale: "Acceptance transfer target",
      playerId: targetId,
      fromClubId: sellerId,
      toClubId: importedSave.userClubId,
      fee: 180_000,
      wageDelta: 2_000,
      expiresWeek: importedSave.week + 2,
      requestedWage: 2_000,
      requestedYears: 3,
    },
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const transferDialog = page.getByRole("dialog");
  await expect(transferDialog).toContainText("Manager target identified");
  await expect(transferDialog).toContainText("Acceptance Target");
  await expect(transferDialog).toContainText("Selected offer impact");
  await expect(transferDialog).toContainText("Trust impact");
  await transferDialog.getByRole("button", { name: "Submit Offer" }).click();

  await expect(page.getByRole("dialog")).toContainText("Signing completed");
  await expect(page.getByRole("dialog")).toContainText("Manager trust +4");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  await expect(page.getByText("Acceptance Target")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Transfer fee paid: Acceptance Target")).toBeVisible();
  await expect(page.getByText("Fees out")).toBeVisible();
  await expect(page.getByTestId("finance-summary-closing")).toBeVisible();
});

test("contract rejection shows trust and morale impact", async ({ page }) => {
  await createAcceptanceCareer(page, "Contractford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  const userClub = importedSave.clubs[importedSave.userClubId];
  const playerId = userClub.playerIds[0];
  const player = importedSave.players[playerId];
  player.name = "Acceptance Contract";
  player.position = "M";
  player.rating = 66;
  player.age = 25;
  player.wage = 1_000;
  player.contractYears = 1;
  player.morale = 68;
  player.form = 64;
  player.fitness = 91;
  importedSave.eventQueue = [];
  importedSave.financialSnapshot = undefined;
  importedSave.currentEvent = {
    id: "contract_offer_acceptance_contract",
    type: "contract_offer",
    title: "Manager suggests new deal",
    body: "The manager thinks Acceptance Contract should be offered a new deal.",
    note: "This is a current squad contract decision. A weak offer can damage morale and manager trust.",
    requiresDecision: true,
    createdSeason: importedSave.season,
    createdWeek: importedSave.week,
    playerId,
    managerId: userClub.managerId,
    variant: "neutral",
    proposal: {
      id: "proposal_acceptance_contract",
      type: "contract",
      week: importedSave.week,
      title: "Renew Acceptance Contract",
      rationale: "The manager wants to protect a squad player.",
      playerId,
      fromClubId: importedSave.userClubId,
      fee: 0,
      wageDelta: 1_000,
      expiresWeek: importedSave.week + 2,
      requestedWage: 2_000,
      requestedYears: 3,
    },
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const contractDialog = page.getByRole("dialog");
  await expect(contractDialog).toContainText("Manager suggests new deal");
  await expect(contractDialog).toContainText("Acceptance Contract");
  await expect(contractDialog).toContainText("Selected offer impact");
  await contractDialog.getByRole("button", { name: "£1,700/w" }).click();
  await expect(contractDialog).toContainText("Likely response: reject");
  await expect(contractDialog).toContainText("Manager trust -3; player morale -8");
  await contractDialog.getByRole("button", { name: "Submit Offer" }).click();

  await expect(page.getByRole("dialog")).toContainText("Contract turned down");
  await expect(page.getByRole("dialog")).toContainText("Manager trust -3; player morale -8");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  await expect(page.getByText("Acceptance Contract")).toBeVisible();
  await expect(page.getByText("Morale 60%")).toBeVisible();
  await expect(page.getByText("Form 64%")).toBeVisible();
  await expect(page.getByText("Fit 91%")).toBeVisible();
  await expectMobileSurfaceHealthy(page, "Roster after contract rejection");
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
