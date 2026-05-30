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
  await expect(page.getByText("Pts").first()).toBeVisible();
  await expect(page.getByText("W-D-L").first()).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  await expect(page.getByText("ROSTER")).toBeVisible();
  await expect(page.getByText(/players/)).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
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

test("domestic cup flow shows match, prize money, and history", async ({ page }) => {
  test.setTimeout(45_000);
  await createAcceptanceCareer(page, "Cupford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  const userClub = importedSave.clubs[importedSave.userClubId];
  const opponentId = Object.keys(importedSave.clubs).find((clubId) => clubId !== importedSave.userClubId);
  const opponent = importedSave.clubs[opponentId];
  opponent.name = "Cupshire Rovers";
  userClub.finances.balance = 600_000;
  userClub.finances.transactions = [];
  userClub.record = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  userClub.playerIds.forEach((playerId: string) => {
    importedSave.players[playerId].rating = 88;
    importedSave.players[playerId].fitness = 96;
    importedSave.players[playerId].form = 92;
    importedSave.players[playerId].morale = 92;
  });
  opponent.playerIds.forEach((playerId: string) => {
    importedSave.players[playerId].rating = 34;
    importedSave.players[playerId].fitness = 72;
    importedSave.players[playerId].form = 42;
    importedSave.players[playerId].morale = 45;
  });
  importedSave.week = 6;
  importedSave.currentRound = 5;
  importedSave.cup = { name: "Chairman's Cup", round: 1, maxRounds: 5, eliminated: false, won: false, results: [] };
  importedSave.financialSnapshot = undefined;
  importedSave.eventQueue = [];
  const cupFixture = {
    id: "cup_acceptance_round_one",
    round: 801,
    homeClubId: importedSave.userClubId,
    awayClubId: opponentId,
    status: "scheduled",
    competition: "cup",
    cupRound: 1,
  };
  importedSave.fixtures = [
    cupFixture,
    ...importedSave.fixtures.filter((fixture: { id: string }) => fixture.id !== cupFixture.id),
  ];
  importedSave.currentEvent = {
    id: "cup_draw_acceptance",
    type: "club_update",
    title: "Chairman's Cup draw",
    body: "Cupford FC will face Cupshire Rovers in Round One. Winning pays a cup prize; losing still pays a smaller prize.",
    requiresDecision: false,
    createdSeason: importedSave.season,
    createdWeek: importedSave.week,
    fixtureId: cupFixture.id,
    managerId: userClub.managerId,
  };
  importedSave.eventQueue = [{
    id: "match_preview_cup_acceptance_round_one",
    type: "match_preview",
    title: "Chairman's Cup: First Round",
    body: "Home cup tie against Cupshire Rovers in September.",
    requiresDecision: true,
    createdSeason: importedSave.season,
    createdWeek: importedSave.week,
    fixtureId: cupFixture.id,
    managerId: userClub.managerId,
    note: "Cup matches do not affect league points, but prize money and a cup run can change the season.",
  }];

  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const drawDialog = page.getByRole("dialog");
  await expect(drawDialog).toContainText("Chairman's Cup draw");
  await expect(drawDialog).toContainText("Cupshire Rovers");
  await expect(drawDialog).not.toContainText("Trust");
  await drawDialog.getByRole("button", { name: "Continue" }).click();

  const previewDialog = page.getByRole("dialog");
  await expect(previewDialog).toContainText("Chairman's Cup: First Round");
  await expect(previewDialog).toContainText("Cup matches do not affect league points");
  await previewDialog.getByRole("button", { name: "See Match" }).click();

  const resultDialog = page.getByRole("dialog");
  await expect(resultDialog).toContainText("Chairman's Cup result");
  await expect(resultDialog).toContainText("First Round");
  await resultDialog.getByRole("button", { name: "Continue" }).click();

  const financeDialog = page.getByRole("dialog");
  await expect(financeDialog).toContainText("Financial report");
  await expect(financeDialog).toContainText("Prize money");
  await expect(financeDialog).toContainText("Balance moved from");
  const prizeText = await financeDialog.getByText("Prize money").locator("..").innerText();
  expect(prizeText).not.toContain("£0");
  await financeDialog.getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Record/i }).click();
  await expect(page.getByRole("heading", { name: "Chairman's Cup" })).toBeVisible();
  await expect(page.getByText("First Round", { exact: true })).toBeVisible();
  await expect(page.getByText("Cupshire Rovers")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /League/i }).click();
  await expect(page.getByText("Cupford FC", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("P 0 · W-D-L 0-0-0 · GD 0").first()).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText(/Cup prize: First Round/)).toBeVisible();
  await expect(page.getByTestId("finance-summary-closing")).toBeVisible();
});

test("debt warning and bankruptcy explain the financial limit", async ({ page }) => {
  await createAcceptanceCareer(page, "Debtford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const warningSave = JSON.parse(exportedSave);
  const warningClub = warningSave.clubs[warningSave.userClubId];
  warningClub.finances.balance = -250_000;
  warningClub.finances.debtLimit = -1_000_000;
  warningSave.currentEvent = {
    id: "bank_warning_acceptance",
    type: "bank_warning",
    title: "Bank balance in the red",
    body: "Debtford FC is currently overdrawn. Balance is -£250,000; debt limit is -£1,000,000.",
    note: "Debt headroom remaining: £750,000. If the balance falls below the debt limit, the board ends the career.",
    requiresDecision: false,
    createdSeason: warningSave.season,
    createdWeek: warningSave.week,
    variant: "negative",
  };
  warningSave.eventQueue = [];
  warningSave.financialSnapshot = undefined;
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(warningSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const warningDialog = page.getByRole("dialog");
  await expect(warningDialog).toContainText("Bank balance in the red");
  await expect(warningDialog).toContainText("Balance is -£250,000");
  await expect(warningDialog).toContainText("debt limit is -£1,000,000");
  await expect(warningDialog).toContainText("Debt headroom remaining: £750,000");
  await warningDialog.getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  const gameOverSave = JSON.parse(exportedSave);
  const gameOverClub = gameOverSave.clubs[gameOverSave.userClubId];
  gameOverClub.finances.balance = -1_150_000;
  gameOverClub.finances.debtLimit = -1_000_000;
  gameOverSave.currentEvent = undefined;
  gameOverSave.eventQueue = [];
  gameOverSave.gameOver = "The board has removed you after the club exceeded its debt limit. Balance -£1,150,000; debt limit -£1,000,000; over limit by £150,000.";
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(gameOverSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const gameOverDialog = page.getByRole("dialog");
  await expect(gameOverDialog).toContainText("Career stopped");
  await expect(gameOverDialog).toContainText("Board Decision");
  await expect(gameOverDialog).toContainText("exceeded its debt limit");
  await expect(gameOverDialog).toContainText("Balance -£1,150,000");
  await expect(gameOverDialog).toContainText("debt limit -£1,000,000");
  await expect(gameOverDialog).toContainText("over limit by £150,000");
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
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
  await expect(liveDialog).toContainText("Match feed");
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

test("manager contract expiry can extend or force replacement", async ({ page }) => {
  await createAcceptanceCareer(page, "Expiryford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const extensionSave = JSON.parse(exportedSave);
  const extensionClub = extensionSave.clubs[extensionSave.userClubId];
  const extensionManager = extensionSave.managers[extensionClub.managerId];
  extensionManager.name = "Acceptance Manager";
  extensionManager.wage = 1_200;
  extensionManager.contractYears = 0;
  extensionManager.compensationFee = 0;
  extensionSave.eventQueue = [];
  extensionSave.financialSnapshot = undefined;
  extensionSave.currentEvent = {
    id: "manager_contract_acceptance_extend",
    type: "manager_contract_decision",
    title: "Manager contract expired",
    body: "Acceptance Manager's contract has expired. Decide whether to extend him or let him leave.",
    note: "Letting him leave means the club must hire a replacement.",
    requiresDecision: true,
    createdSeason: extensionSave.season,
    createdWeek: extensionSave.week,
    managerId: extensionManager.id,
    variant: "neutral",
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(extensionSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const extensionDialog = page.getByRole("dialog");
  await expect(extensionDialog).toContainText("Manager contract expired");
  await expect(extensionDialog).toContainText("Acceptance Manager");
  await expect(extensionDialog).toContainText("Decision impact");
  await expect(extensionDialog).toContainText("manager trust +4");
  await extensionDialog.getByRole("button", { name: "Extend Contract" }).click();

  await expect(page.getByRole("dialog")).toContainText("Manager contract extended");
  await expect(page.getByRole("dialog")).toContainText("Acceptance Manager has signed a 2-year deal");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Manager/i }).click();
  await expect(page.getByRole("heading", { name: "Acceptance Manager" })).toBeVisible();
  await expect(page.getByText(/2 years left/)).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  const releaseSave = JSON.parse(exportedSave);
  const releaseClub = releaseSave.clubs[releaseSave.userClubId];
  const releaseManager = releaseSave.managers[releaseClub.managerId];
  releaseManager.name = "Leaving Manager";
  releaseManager.wage = 1_100;
  releaseManager.contractYears = 0;
  releaseManager.compensationFee = 0;
  releaseSave.eventQueue = [];
  releaseSave.financialSnapshot = undefined;
  releaseSave.currentEvent = {
    id: "manager_contract_acceptance_release",
    type: "manager_contract_decision",
    title: "Manager contract expired",
    body: "Leaving Manager's contract has expired. Decide whether to extend him or let him leave.",
    note: "Letting him leave means the club must hire a replacement.",
    requiresDecision: true,
    createdSeason: releaseSave.season,
    createdWeek: releaseSave.week,
    managerId: releaseManager.id,
    variant: "neutral",
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(releaseSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const releaseDialog = page.getByRole("dialog");
  await expect(releaseDialog).toContainText("Manager contract expired");
  await expect(releaseDialog).toContainText("Leaving Manager");
  await releaseDialog.getByRole("button", { name: "Let Him Leave" }).click();

  await expect(page.getByRole("dialog")).toContainText("Manager leaves club");
  await expect(page.getByRole("dialog")).toContainText("must appoint a manager before continuing");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("dialog")).toContainText("Hire a Manager");
  await expect(page.getByRole("dialog")).toContainText("cannot continue without a manager");
  await page.getByRole("dialog").getByRole("button", { name: "View All Candidates" }).click();

  await expect(page.getByText("No manager appointed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Negotiate" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Negotiate" }).first().click();

  const hireDialog = page.getByRole("dialog");
  await expect(hireDialog).toContainText("Manager negotiation");
  await expect(hireDialog).toContainText("Expected wage");
  await hireDialog.getByRole("button", { name: "Submit Offer" }).click();
  await expect(page.getByText("Manager hired.")).toBeVisible();
  await expect(page.getByText("No manager appointed")).toHaveCount(0);
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

test("loan decisions show roster and finance impact", async ({ page }) => {
  await createAcceptanceCareer(page, "Loanford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const loanInSave = JSON.parse(exportedSave);
  const loanInClub = loanInSave.clubs[loanInSave.userClubId];
  const parentClubId = Object.keys(loanInSave.clubs).find((clubId) => clubId !== loanInSave.userClubId);
  const parentClub = loanInSave.clubs[parentClubId];
  const loanInPlayerId = parentClub.playerIds[0];
  const loanInPlayer = loanInSave.players[loanInPlayerId];
  loanInSave.week = 2;
  loanInClub.finances.balance = 300_000;
  loanInClub.finances.transactions = [];
  loanInPlayer.name = "Acceptance Loan In";
  loanInPlayer.position = "M";
  loanInPlayer.rating = 67;
  loanInPlayer.age = 22;
  loanInPlayer.value = 280_000;
  loanInPlayer.wage = 1_500;
  loanInSave.transferBudget = { mode: "normal", amount: 300_000 };
  loanInSave.pendingDeals = [];
  loanInSave.eventQueue = [];
  loanInSave.financialSnapshot = undefined;
  loanInSave.currentEvent = {
    id: "loan_in_acceptance_event",
    type: "contract_offer",
    title: "Manager suggests loan signing",
    body: `The manager wants to loan Acceptance Loan In from ${parentClub.name}.`,
    note: "Loan signings add short-term squad depth without a permanent transfer fee.",
    requiresDecision: true,
    createdSeason: loanInSave.season,
    createdWeek: loanInSave.week,
    playerId: loanInPlayerId,
    managerId: loanInClub.managerId,
    variant: "neutral",
    proposal: {
      id: "proposal_acceptance_loan_in",
      type: "loan",
      loanDirection: "in",
      week: loanInSave.week,
      title: "Loan Acceptance Loan In",
      rationale: "Short-term midfield depth.",
      playerId: loanInPlayerId,
      fromClubId: parentClubId,
      toClubId: loanInSave.userClubId,
      fee: 10_000,
      wageDelta: 500,
      expiresWeek: loanInSave.week + 2,
      requestedWage: 500,
      requestedYears: 1,
    },
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(loanInSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const loanInDialog = page.getByRole("dialog");
  await expect(loanInDialog).toContainText("Manager suggests loan signing");
  await expect(loanInDialog).toContainText("Acceptance Loan In");
  await expect(loanInDialog).toContainText("Selected loan impact");
  await expect(loanInDialog).toContainText("completed loan +2");
  await loanInDialog.getByRole("button", { name: "Submit Loan" }).click();

  await expect(page.getByRole("dialog")).toContainText("Loan signing completed");
  await expect(page.getByRole("dialog")).toContainText("Manager trust +2");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  const loanInRow = page.locator("section").filter({ hasText: "Acceptance Loan In" }).first();
  await expect(loanInRow).toBeVisible();
  await expect(loanInRow).toContainText("Loan in");
  await expect(loanInRow).toContainText("£500/w");
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Loan fee paid: Acceptance Loan In")).toBeVisible();
  await expect(page.getByText("Fees out")).toBeVisible();
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  const loanOutSave = JSON.parse(exportedSave);
  const loanOutClub = loanOutSave.clubs[loanOutSave.userClubId];
  const destinationClubId = Object.keys(loanOutSave.clubs).find((clubId) => clubId !== loanOutSave.userClubId);
  const destinationClub = loanOutSave.clubs[destinationClubId];
  const loanOutPlayerId = loanOutClub.playerIds[0];
  const loanOutPlayer = loanOutSave.players[loanOutPlayerId];
  loanOutSave.week = 2;
  loanOutClub.finances.transactions = [];
  loanOutPlayer.name = "Acceptance Loan Out";
  loanOutPlayer.position = "D";
  loanOutPlayer.rating = 49;
  loanOutPlayer.age = 20;
  loanOutPlayer.wage = 900;
  loanOutSave.pendingDeals = [];
  loanOutSave.eventQueue = [];
  loanOutSave.financialSnapshot = undefined;
  loanOutSave.currentEvent = {
    id: "loan_out_acceptance_event",
    type: "contract_offer",
    title: "Loan offer received",
    body: `${destinationClub.name} wants to loan Acceptance Loan Out until the end of the season.`,
    note: "The player returns at season end.",
    requiresDecision: true,
    createdSeason: loanOutSave.season,
    createdWeek: loanOutSave.week,
    playerId: loanOutPlayerId,
    managerId: loanOutClub.managerId,
    variant: "neutral",
    proposal: {
      id: "proposal_acceptance_loan_out",
      type: "loan",
      loanDirection: "out",
      week: loanOutSave.week,
      title: "Loan out Acceptance Loan Out",
      rationale: "Development minutes.",
      playerId: loanOutPlayerId,
      fromClubId: loanOutSave.userClubId,
      toClubId: destinationClubId,
      fee: 8_000,
      wageDelta: -400,
      expiresWeek: loanOutSave.week + 2,
      requestedWage: 400,
      requestedYears: 1,
    },
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(loanOutSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const loanOutDialog = page.getByRole("dialog");
  await expect(loanOutDialog).toContainText("Loan offer received");
  await expect(loanOutDialog).toContainText("Acceptance Loan Out");
  await expect(loanOutDialog).toContainText("Accept loan impact");
  await expect(loanOutDialog).toContainText("accept loan +1");
  await loanOutDialog.getByRole("button", { name: "Accept Loan" }).click();

  await expect(page.getByRole("dialog")).toContainText("Loan agreed");
  await expect(page.getByRole("dialog")).toContainText("Manager trust +1");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  await expect(page.getByText("Acceptance Loan Out")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Loan fee received: Acceptance Loan Out")).toBeVisible();
  await expect(page.getByText("Fees in")).toBeVisible();
  await expect(page.getByTestId("finance-summary-closing")).toBeVisible();
});

test("player sale shows replacement pressure, roster removal, and finance trail", async ({ page }) => {
  await createAcceptanceCareer(page, "Saleford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  const userClub = importedSave.clubs[importedSave.userClubId];
  const bidderId = Object.keys(importedSave.clubs).find((clubId) => clubId !== importedSave.userClubId);
  const replacementClubId = Object.keys(importedSave.clubs).find((clubId) => clubId !== importedSave.userClubId && clubId !== bidderId) ?? bidderId;
  const bidder = importedSave.clubs[bidderId];
  const replacementClub = importedSave.clubs[replacementClubId];
  const playerId = userClub.playerIds[0];
  const teammateId = userClub.playerIds[1];
  const player = importedSave.players[playerId];
  const teammate = importedSave.players[teammateId];
  const replacementId = replacementClub.playerIds[0];
  const replacement = importedSave.players[replacementId];

  importedSave.week = 1;
  userClub.finances.balance = 500_000;
  userClub.finances.transactions = [];
  userClub.playerIds.forEach((id: string) => {
    if (id === playerId) return;
    importedSave.players[id].rating = 45;
    importedSave.players[id].morale = 70;
  });
  Object.values(importedSave.players as Record<string, { id: string; clubId?: string; position: string; rating: number; value: number }>).forEach((item) => {
    if (item.clubId === importedSave.userClubId || item.id === replacementId) return;
    item.position = "D";
    item.rating = 40;
    item.value = 500_000;
  });
  player.name = "Acceptance Sale";
  player.position = "F";
  player.rating = 74;
  player.age = 26;
  player.value = 260_000;
  player.wage = 2_400;
  player.contractYears = 3;
  player.morale = 72;
  player.careerStats.apps = 35;
  teammate.name = "Acceptance Teammate";
  teammate.morale = 70;
  replacement.name = "Acceptance Replacement";
  replacement.position = "F";
  replacement.rating = 71;
  replacement.age = 24;
  replacement.value = 120_000;
  replacement.wage = 1_200;
  replacement.contractYears = 2;
  importedSave.transferBudget = { mode: "normal", amount: 500_000 };
  importedSave.pendingDeals = [];
  importedSave.eventQueue = [];
  importedSave.financialSnapshot = undefined;
  importedSave.currentEvent = {
    id: "incoming_bid_acceptance_sale",
    type: "incoming_bid",
    title: "Bid received",
    body: `${bidder.name} has made an offer for Acceptance Sale.`,
    requiresDecision: true,
    createdSeason: importedSave.season,
    createdWeek: importedSave.week,
    playerId,
    managerId: userClub.managerId,
    variant: "neutral",
    proposal: {
      id: "proposal_acceptance_sale",
      type: "sell",
      week: importedSave.week,
      title: "Sell Acceptance Sale",
      rationale: "A serious bid has arrived for a first-team player.",
      playerId,
      fromClubId: importedSave.userClubId,
      toClubId: bidderId,
      fee: 240_000,
      wageDelta: -player.wage,
      expiresWeek: importedSave.week + 2,
    },
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const bidDialog = page.getByRole("dialog");
  await expect(bidDialog).toContainText("Bid received");
  await expect(bidDialog).toContainText("Acceptance Sale");
  await expect(bidDialog).toContainText("Bidding club");
  await expect(bidDialog).toContainText(bidder.name);
  await expect(bidDialog).toContainText("Sale decision impact");
  await bidDialog.getByRole("button", { name: "Accept Bid" }).click();

  await expect(page.getByRole("dialog")).toContainText("sale ready");
  await expect(page.getByRole("dialog")).toContainText("Confirm sale impact");
  await expect(page.getByRole("dialog")).toContainText("Board confidence -");
  await expect(page.getByRole("dialog")).toContainText("squad morale -");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm Sale" }).click();

  await expect(page.getByRole("dialog")).toContainText("Player sale confirmed");
  await expect(page.getByRole("dialog")).toContainText("Acceptance Sale has been sold to");
  await expect(page.getByRole("dialog")).toContainText("Board confidence -");
  await expect(page.getByRole("dialog")).toContainText("squad morale -");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("dialog")).toContainText("Replacement needed");
  await expect(page.getByRole("dialog")).toContainText("should replace Acceptance Sale");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("dialog")).toContainText("Manager target identified");
  await expect(page.getByRole("dialog")).toContainText("Target identity F");
  await expect(page.getByRole("dialog")).toContainText("external transfer target");
  await page.getByRole("dialog").getByRole("button", { name: "Walk Away" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  await expect(page.getByText("Acceptance Sale")).toHaveCount(0);
  const teammateRow = page.locator("section").filter({ hasText: "Acceptance Teammate" }).first();
  await expect(teammateRow).toBeVisible();
  await expect(teammateRow).toContainText("Morale 66%");
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Transfer fee received: Acceptance Sale")).toBeVisible();
  await expect(page.getByText("Fees in")).toBeVisible();
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

test("youth contract promotion shows player and roster impact", async ({ page }) => {
  await createAcceptanceCareer(page, "Youthford FC");

  await page.getByRole("button", { name: "Settings" }).click();
  const exportedSave = await page.locator("textarea[readonly]").inputValue();
  const importedSave = JSON.parse(exportedSave);
  const userClub = importedSave.clubs[importedSave.userClubId];
  const youthPlayerId = "youth_acceptance_prospect";
  importedSave.players[youthPlayerId] = {
    id: youthPlayerId,
    clubId: importedSave.userClubId,
    name: "Acceptance Prospect",
    position: "D",
    age: 17,
    rating: 62,
    potential: 82,
    wage: 0,
    value: 95_000,
    contractYears: 0,
    form: 58,
    fitness: 88,
    morale: 60,
    personality: "Builder",
    seasonStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
    careerStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
  };
  userClub.playerIds.push(youthPlayerId);
  importedSave.eventQueue = [];
  importedSave.financialSnapshot = undefined;
  importedSave.currentEvent = {
    id: "youth_contract_acceptance_prospect",
    type: "youth_contract",
    title: "Youth contract decision",
    body: "Acceptance Prospect's academy terms are ready to be reviewed.",
    note: "The manager sees real promise in this player.",
    requiresDecision: true,
    createdSeason: importedSave.season,
    createdWeek: importedSave.week,
    playerId: youthPlayerId,
    managerId: userClub.managerId,
    variant: "neutral",
  };
  await page.getByPlaceholder("Paste exported save JSON here").fill(JSON.stringify(importedSave));
  await page.getByRole("button", { name: "Import Into Slot 1" }).click();

  const youthDialog = page.getByRole("dialog");
  await expect(youthDialog).toContainText("Youth contract decision");
  await expect(youthDialog).toContainText("Acceptance Prospect");
  await expect(youthDialog).toContainText("Youth decision impact");
  await expect(youthDialog).toContainText("weekly wage bill rises");
  await youthDialog.getByRole("button", { name: "Offer Contract" }).click();

  await expect(page.getByRole("dialog")).toContainText("Youth player promoted");
  await expect(page.getByRole("dialog")).toContainText("Acceptance Prospect has signed professional terms");
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await clearCurrentDialog(page);
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Roster/i }).click();
  const prospectRow = page.locator("section").filter({ hasText: "Acceptance Prospect" }).first();
  await expect(prospectRow).toBeVisible();
  await expect(prospectRow).toContainText("Morale 68%");
  await expect(prospectRow).toContainText("Form 58%");
  await expect(prospectRow).toContainText("Fit 88%");
  await expectMobileSurfaceHealthy(page, "Roster after youth promotion");
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
  await page.getByRole("button", { name: "Back to Dashboard" }).click();

  await page.getByRole("button", { name: /Record/i }).click();
  const stadiumAchievement = page.getByTestId("achievement-stadium_upgrade");
  await expect(stadiumAchievement).toContainText("Concrete Plans");
  await expect(stadiumAchievement).toContainText("Unlocked");
  await expect(page.getByTestId("achievement-progress-stadium_upgrade")).toHaveAttribute("style", /width:\s*100%/);
});

test("clean career coherence audit keeps events readable and explainable", async ({ page }) => {
  test.setTimeout(90_000);
  await createAcceptanceCareer(page, "Coherence FC");

  const seen = {
    financialReports: 0,
    matchResults: 0,
    transferBudgetConfirmation: false,
    relationshipExplanation: false,
  };

  for (let step = 0; step < 90; step += 1) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.count())) {
      await page.getByRole("button", { name: /Continue|Open Decision/ }).click();
      await expect(dialog).toBeVisible();
    }

    const text = await dialog.innerText();
    expect(text, `event ${step} should not expose broken values`).not.toMatch(/\bNaN\b|\bundefined\b/);
    await expectMobileSurfaceHealthy(page, `Coherence event ${step}`);

    if (await dialog.getByTestId("event-finance-result").count()) {
      seen.financialReports += 1;
      await expect(dialog).toContainText("Balance moved from");
      await expect(dialog).toContainText("Balance movement");
      await expect(dialog.getByTestId("event-finance-opening")).toBeVisible();
      await expect(dialog.getByTestId("event-finance-closing")).toBeVisible();
      await expect(dialog.getByTestId("event-finance-income")).toBeVisible();
      await expect(dialog.getByTestId("event-finance-expenses")).toBeVisible();
    }

    if (/Match result/i.test(text)) {
      seen.matchResults += 1;
      await expect(dialog).toContainText("Impact: board confidence");
      await expect(dialog).toContainText("manager trust");
      await expect(dialog).toContainText("stadium condition");
      seen.relationshipExplanation = true;
    }

    if (/Transfer budget confirmed/i.test(text)) {
      seen.transferBudgetConfirmation = true;
      expect(text).toMatch(/manager trust/i);
    }

    await resolveConservativeDialog(page);

    if (seen.financialReports >= 2 && seen.matchResults >= 2 && seen.transferBudgetConfirmation && seen.relationshipExplanation) {
      break;
    }
  }

  expect(seen.financialReports).toBeGreaterThanOrEqual(2);
  expect(seen.matchResults).toBeGreaterThanOrEqual(2);
  expect(seen.transferBudgetConfirmation).toBe(true);
  expect(seen.relationshipExplanation).toBe(true);

  await clearCurrentDialog(page);
  await expect(page.getByText("Last result")).toBeVisible();
  await expect(page.getByTestId("dashboard-latest-report")).toBeVisible();
  await expectMobileSurfaceHealthy(page, "Coherence dashboard after audit");

  await page.getByRole("button", { name: /Finances/i }).click();
  await expect(page.getByText("Report period").first()).toBeVisible();
  await expect(page.getByText("Opening balance").first()).toBeVisible();
  await expect(page.getByText("Closing balance").first()).toBeVisible();
  await expectMobileSurfaceHealthy(page, "Coherence finances after audit");
});
