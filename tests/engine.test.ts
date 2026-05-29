import { describe, expect, it } from "vitest";
import {
  advanceToNextMatch,
  calculateManagerCompensation,
  calculateRecommendedManagerWage,
  calculateRecommendedPlayerWage,
  checkDebtAndBankruptcy,
  confirmFireManager,
  createNewGame,
  downgradeTraining,
  downgradeYouthAcademy,
  finishSeason,
  generateNextEvents,
  leagueTable,
  latestFinancialSnapshot,
  normalizeGameState,
  resolveEvent,
  returnSeasonLoans,
  submitManagerHireOffer,
  upgradeStand,
  upgradeTraining,
  upgradeYouthAcademy,
} from "../src/game/engine";
import { cupRoundWeeks } from "../src/game/calendar";
import { migrateSave } from "../src/game/persistence";

const setup = {
  chairmanName: "Alex Morgan",
  clubName: "Sunnyvale FC",
  stadiumName: "Greenfield Stadium",
  primaryColor: "#159947",
  secondaryColor: "#f2f7f1",
  seed: 42,
};

function resolveBalancedEvent(save: ReturnType<typeof createNewGame>) {
  const event = save.currentEvent;
  if (!event) return save;
  if (event.type === "transfer_budget") return resolveEvent(save, event.id, { mode: "normal" });
  if (event.type === "match_preview") return resolveEvent(save, event.id, { action: "see" });
  if (event.type === "manager_contract_decision") {
    const manager = event.managerId ? save.managers[event.managerId] : undefined;
    const divisionLevel = save.divisions.find((division) => division.id === save.clubs[save.userClubId].divisionId)?.level ?? 7;
    return resolveEvent(save, event.id, { action: "extend", terms: { wage: manager ? calculateRecommendedManagerWage(manager, divisionLevel) : 1_000, years: 2 } });
  }
  if (event.type === "contract_offer") {
    const proposal = event.proposal;
    if (proposal?.type === "buy") return resolveEvent(save, event.id, { action: "reject" });
    if (proposal?.type === "loan") return resolveEvent(save, event.id, { action: "offer", terms: { fee: proposal.fee, wage: proposal.requestedWage ?? Math.abs(proposal.wageDelta), years: 1 } });
    return resolveEvent(save, event.id, { action: "offer", terms: { wage: proposal?.requestedWage ?? 1_000, years: proposal?.requestedYears ?? 2 } });
  }
  if (event.type === "incoming_bid") return resolveEvent(save, event.id, { action: "reject" });
  if (event.type === "sale_ready") return resolveEvent(save, event.id, { action: "confirm" });
  if (event.type === "youth_contract") return resolveEvent(save, event.id, { action: "offer" });
  return resolveEvent(save, event.id, { action: "continue" });
}

function resolveHumanStyleEvent(save: ReturnType<typeof createNewGame>) {
  const event = save.currentEvent;
  if (!event) return save;
  const club = save.clubs[save.userClubId];
  const proposal = event.proposal;
  const player = event.playerId ? save.players[event.playerId] : undefined;
  if (event.type === "transfer_budget") {
    const mode = club.finances.balance < 0 ? "strict" : club.finances.balance > 900_000 ? "generous" : "normal";
    return resolveEvent(save, event.id, { mode });
  }
  if (event.type === "match_preview") return resolveEvent(save, event.id, { action: "see" });
  if (event.type === "manager_contract_decision") {
    const manager = event.managerId ? save.managers[event.managerId] : undefined;
    const divisionLevel = save.divisions.find((division) => division.id === club.divisionId)?.level ?? 7;
    return resolveEvent(save, event.id, { action: "extend", terms: { wage: manager ? calculateRecommendedManagerWage(manager, divisionLevel) : 1_000, years: 2 } });
  }
  if (event.type === "incoming_bid" && proposal && player) {
    const accept = player.age >= 31 || player.contractYears <= 1 || proposal.fee >= player.value;
    return resolveEvent(save, event.id, { action: accept ? "accept" : "reject" });
  }
  if (event.type === "sale_ready") return resolveEvent(save, event.id, { action: "confirm" });
  if (event.type === "youth_contract" && player) {
    const keep = player.potential >= 62 && club.playerIds.length < 30;
    return resolveEvent(save, event.id, { action: keep ? "offer" : "release" });
  }
  if (event.type === "contract_offer" && proposal && player) {
    if (proposal.type === "buy") {
      const fee = proposal.fee;
      const wage = proposal.requestedWage ?? player.wage;
      const affordableFee = fee <= Math.max(40_000, club.finances.balance * 0.35);
      const affordableWage = wage <= Math.max(2_000, club.finances.weeklyWages * 0.18);
      const withinBudget = !save.transferBudget || fee <= save.transferBudget.amount;
      if (affordableFee && affordableWage && withinBudget) return resolveEvent(save, event.id, { action: "offer", terms: { fee, wage, years: proposal.requestedYears ?? 3 } });
      return resolveEvent(save, event.id, { action: "reject" });
    }
    if (proposal.type === "loan") {
      const loanIn = proposal.loanDirection !== "out";
      const wage = proposal.requestedWage ?? Math.abs(proposal.wageDelta);
      if (!loanIn || club.finances.balance > proposal.fee * 2) return resolveEvent(save, event.id, { action: "offer", terms: { fee: proposal.fee, wage, years: 1 } });
      return resolveEvent(save, event.id, { action: "reject" });
    }
    const requestedWage = proposal.requestedWage ?? player.wage + proposal.wageDelta;
    const keyPlayer = player.rating >= 58 || player.contractYears <= 1 || player.morale < 50;
    const wageIsSafe = requestedWage <= Math.max(2_000, club.finances.weeklyWages * 0.16);
    if (keyPlayer && wageIsSafe) return resolveEvent(save, event.id, { action: "offer", terms: { wage: requestedWage, years: proposal.requestedYears ?? 2 } });
    return resolveEvent(save, event.id, { action: "reject" });
  }
  return resolveEvent(save, event.id, { action: "continue" });
}

describe("game engine", () => {
  it("creates a deterministic world", () => {
    const a = createNewGame(setup);
    const b = createNewGame(setup);
    expect(a.userClubId).toBe(b.userClubId);
    expect(Object.keys(a.clubs)).toHaveLength(140);
    expect(a.fixtures.length).toBeGreaterThan(300);
    expect(a.clubs[a.userClubId].name).toBe("Sunnyvale FC");
    const userDivision = a.divisions.find((division) => division.id === a.clubs[a.userClubId].divisionId)!;
    for (let round = 0; round < (userDivision.clubIds.length - 1) * 2; round += 1) {
      const roundClubIds = a.fixtures.filter((fixture) => fixture.round === round).flatMap((fixture) => [fixture.homeClubId, fixture.awayClubId]);
      expect(new Set(roundClubIds).size).toBe(userDivision.clubIds.length);
      expect(roundClubIds).toContain(a.userClubId);
    }
  });

  it("advances matches and updates the league table", () => {
    let save = createNewGame(setup);
    save = advanceToNextMatch(save);
    const table = leagueTable(save);
    expect(save.week).toBe(2);
    expect(table[0].record.played).toBeGreaterThan(0);
    expect(save.lastMatch?.result).toBeDefined();
  });

  it("supports manager hiring and firing", () => {
    let save = createNewGame(setup);
    const manager = save.managers[save.clubs[save.userClubId].managerId!];
    const compensation = calculateManagerCompensation(manager);
    const beforeBalance = save.clubs[save.userClubId].finances.balance;
    save = confirmFireManager(save);
    expect(save.clubs[save.userClubId].managerId).toBeUndefined();
    expect(save.clubs[save.userClubId].finances.balance).toBe(beforeBalance - compensation);
    const candidate = save.managerCandidates[0];
    const expectedWage = calculateRecommendedManagerWage(candidate, 7);
    save = submitManagerHireOffer(save, candidate.id, { wage: expectedWage, years: 2, compensationFee: candidate.compensationFee ?? 0 });
    expect(save.clubs[save.userClubId].managerId).toBeDefined();
    expect(candidate.name).toBeTruthy();
  });

  it("ages manager contracts and clears short-term manager action locks at season change", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const manager = save.managers[club.managerId!];
    manager.contractYears = 1;
    manager.compensationFee = calculateManagerCompensation(manager);
    const startingAge = manager.age;
    const startingCompensation = calculateManagerCompensation(manager);
    save.managerActionLockUntilWeek = 45;

    save = finishSeason(save);

    const carriedManager = save.managers[save.clubs[save.userClubId].managerId!];
    expect(carriedManager.age).toBe(startingAge + 1);
    expect(carriedManager.contractYears).toBe(0);
    expect(calculateManagerCompensation(carriedManager)).toBeLessThan(startingCompensation);
    expect(calculateManagerCompensation(carriedManager)).toBe(0);
    expect(carriedManager.compensationFee).toBe(0);
    expect(save.managerActionLockUntilWeek).toBe(0);
    save = generateNextEvents(save);
    while (save.currentEvent && save.currentEvent.type !== "manager_contract_decision") {
      save = resolveEvent(save, save.currentEvent.id);
    }
    expect(save.currentEvent?.type).toBe("manager_contract_decision");
    save = resolveEvent(save, save.currentEvent!.id, { action: "extend", terms: { wage: calculateRecommendedManagerWage(carriedManager, 7), years: 2 } });
    expect(save.clubs[save.userClubId].managerId).toBe(carriedManager.id);
    expect(save.managers[carriedManager.id].contractYears).toBe(2);
    expect(save.managers[carriedManager.id].compensationFee).toBeGreaterThan(0);
  });

  it("blocks season progression after an expired manager contract is released", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const manager = save.managers[club.managerId!];
    manager.contractYears = 1;
    save = finishSeason(save);
    save = generateNextEvents(save);
    while (save.currentEvent && save.currentEvent.type !== "manager_contract_decision") {
      save = resolveEvent(save, save.currentEvent.id);
    }
    expect(save.currentEvent?.type).toBe("manager_contract_decision");

    save = resolveEvent(save, save.currentEvent!.id, { action: "release" });
    expect(save.currentEvent?.title).toBe("Manager leaves club");
    expect(save.clubs[save.userClubId].managerId).toBeUndefined();
    expect(save.managerCandidates.length).toBeGreaterThan(0);

    save = resolveEvent(save, save.currentEvent!.id, { action: "continue" });
    expect(save.currentEvent).toBeUndefined();
    expect(save.eventQueue.length).toBeGreaterThan(0);
    const afterContinue = generateNextEvents(save);
    expect(afterContinue.currentEvent).toBeUndefined();
    expect(afterContinue.eventQueue.length).toBe(save.eventQueue.length);
  });

  it("resumes the parked season queue after hiring a replacement manager", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const manager = save.managers[club.managerId!];
    manager.contractYears = 1;
    save = finishSeason(save);
    save = generateNextEvents(save);
    while (save.currentEvent && save.currentEvent.type !== "manager_contract_decision") {
      save = resolveEvent(save, save.currentEvent.id);
    }
    save = resolveEvent(save, save.currentEvent!.id, { action: "release" });
    save = resolveEvent(save, save.currentEvent!.id, { action: "continue" });
    const queuedTitle = save.eventQueue[0]?.title;
    const candidate = save.managerCandidates[0];
    const divisionLevel = save.divisions.find((division) => division.id === save.clubs[save.userClubId].divisionId)?.level ?? 7;

    save = submitManagerHireOffer(save, candidate.id, {
      wage: calculateRecommendedManagerWage(candidate, divisionLevel),
      years: 2,
      compensationFee: candidate.compensationFee ?? 0,
    });

    expect(save.clubs[save.userClubId].managerId).toBe(candidate.id);
    save = generateNextEvents(save);
    expect(save.currentEvent?.title).toBe(queuedTitle);
    expect(save.currentEvent?.type).not.toBe("manager_contract_decision");
  });

  it("calculates wages from rating, division and reputation", () => {
    const save = createNewGame(setup);
    const player = Object.values(save.players)[0];
    const manager = Object.values(save.managers)[0];
    expect(calculateRecommendedPlayerWage({ ...player, rating: 80 }, 1)).toBeGreaterThan(calculateRecommendedPlayerWage({ ...player, rating: 60 }, 7));
    expect(calculateRecommendedManagerWage({ ...manager, reputation: 90, training: 90, tactics: 90, transferTaste: 90, youthPreference: 90 }, 1)).toBeGreaterThan(calculateRecommendedManagerWage({ ...manager, reputation: 45, training: 45, tactics: 45, transferTaste: 45, youthPreference: 45 }, 7));
  });

  it("normalizes duplicate club and squad display names", () => {
    const save = createNewGame(setup);
    const division = save.divisions.find((item) => item.id === save.clubs[save.userClubId].divisionId)!;
    save.clubs[division.clubIds[1]].name = save.clubs[division.clubIds[0]].name;
    const club = save.clubs[save.userClubId];
    save.players[club.playerIds[1]].name = save.players[club.playerIds[0]].name;
    const normalized = normalizeGameState(save);
    const clubNames = division.clubIds.map((id) => normalized.clubs[id].name);
    const squadNames = normalized.clubs[normalized.userClubId].playerIds.map((id) => normalized.players[id].name);
    expect(new Set(clubNames).size).toBe(clubNames.length);
    expect(new Set(squadNames).size).toBe(squadNames.length);
  });

  it("preserves V1 transient fields during save migration", () => {
    const save = createNewGame(setup);
    save.managerActionLockUntilWeek = 7;
    save.liveMatch = { fixtureId: save.fixtures[0].id, currentMinute: 42, revealedEventCount: 2, finished: false };
    const migrated = migrateSave(JSON.parse(JSON.stringify(save)));
    expect(migrated.managerActionLockUntilWeek).toBe(7);
    expect(migrated.liveMatch?.currentMinute).toBe(42);
  });

  it("generates manager-led proposals without manual scouting", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const player = save.players[club.playerIds[0]];
    player.contractYears = 1;
    save.week = 6;
    save.currentRound = 6;
    save.currentEvent = undefined;
    save.eventQueue = [];
    save = generateNextEvents(save);
    let guard = 0;
    while (save.currentEvent && save.currentEvent.type !== "contract_offer" && guard < 12) {
      save = resolveEvent(save, save.currentEvent.id, save.currentEvent.type === "match_preview" ? { action: "see" } : undefined);
      guard += 1;
    }
    expect(save.currentEvent?.type).toBe("contract_offer");
    expect(save.currentEvent?.proposal?.type).toBe("contract");
    const before = save.clubs[save.userClubId].finances.balance;
    save = resolveEvent(save, save.currentEvent!.id, { action: "offer", terms: { wage: player.wage, years: 2 } });
    expect(save.clubs[save.userClubId].finances.balance).not.toBeNaN();
    expect(save.clubs[save.userClubId].finances.balance).toBeLessThanOrEqual(before + 2_000_000);
  });

  it("drives the dashboard through a blocking event queue", () => {
    let save = createNewGame(setup);
    save = generateNextEvents(save);
    expect(save.currentEvent?.type).toBe("season_intro");
    const firstEventId = save.currentEvent!.id;
    const blocked = generateNextEvents(save);
    expect(blocked.currentEvent?.id).toBe(firstEventId);
    save = resolveEvent(save, firstEventId);
    expect(save.currentEvent?.type).toBe("average_crowd_report");
  });

  it("stores transfer budget decisions from event cards", () => {
    let save = createNewGame(setup);
    save = generateNextEvents(save);
    while (save.currentEvent && save.currentEvent.type !== "transfer_budget") {
      save = resolveEvent(save, save.currentEvent.id);
    }
    expect(save.currentEvent?.type).toBe("transfer_budget");
    save = resolveEvent(save, save.currentEvent!.id, { mode: "strict" });
    expect(save.transferBudget?.mode).toBe("strict");
    expect(save.transferBudget?.amount).toBeGreaterThanOrEqual(0);
    expect(save.currentEvent?.title).toBe("Transfer budget confirmed");
  });

  it("expires transfer budgets outside transfer windows", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    club.finances.balance = 500_000;
    save.week = 5;
    save.currentRound = 4;
    save.currentEvent = undefined;
    save.eventQueue = [];
    save.transferBudget = { mode: "strict", amount: 125_000 };

    save = generateNextEvents(save);

    expect(save.transferBudget).toBeUndefined();
    expect(save.currentEvent?.type).not.toBe("manager_frustrated");
    expect(save.eventQueue.some((event) => event.type === "manager_frustrated")).toBe(false);
  });

  it("queues a detailed season summary before the next season intro", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    club.record = { played: 38, won: 30, drawn: 4, lost: 4, gf: 92, ga: 31, points: 94 };
    save = finishSeason(save);
    const history = save.history[0];
    expect(history.outcome).toBe("promoted");
    expect(history.prizeMoney).toBeGreaterThan(0);
    expect(history.nextDivisionName).not.toBe(history.divisionName);
    expect(history.won).toBe(30);
    expect(history.seasonImpact?.boardConfidenceAfter).toBeGreaterThan(history.seasonImpact?.boardConfidenceBefore ?? 0);
    expect(history.seasonImpact?.managerTrustAfter).toBeGreaterThan(history.seasonImpact?.managerTrustBefore ?? 0);
    expect(history.seasonImpact?.reputationAfter).toBeGreaterThan(history.seasonImpact?.reputationBefore ?? 0);
    expect(save.divisions.every((division) => division.clubIds.length === 20)).toBe(true);
    expect(save.week).toBe(1);
    save = generateNextEvents(save);
    expect(save.currentEvent?.type).toBe("season_summary");
    expect(save.currentEvent?.seasonHistory?.season).toBe(history.season);
    expect(save.currentEvent?.body).toContain("Season award");
    expect(save.currentEvent?.note).toContain("Season impact");
    expect(save.currentEvent?.note).toContain("board confidence");
    save = resolveEvent(save, save.currentEvent!.id);
    expect(save.currentEvent?.type).toBe("season_intro");
  });

  it("ends the career when the balance crosses the debt limit", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    club.finances.debtLimit = -100_000;
    club.finances.balance = -100_001;
    save = checkDebtAndBankruptcy(save);
    expect(save.gameOver).toContain("debt limit");
    expect(save.gameOver).toContain("Balance");
    expect(save.gameOver).toContain("over limit by");
  });

  it("explains debt headroom before bankruptcy", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    club.finances.debtLimit = -1_000_000;
    club.finances.balance = -250_000;
    save.week = 5;
    save.currentRound = 4;
    save.currentEvent = undefined;
    save.eventQueue = [];

    save = generateNextEvents(save);
    const bankWarning = [save.currentEvent, ...save.eventQueue].find((event) => event?.type === "bank_warning");

    expect(bankWarning?.body).toContain("Balance is");
    expect(bankWarning?.body).toContain("debt limit");
    expect(bankWarning?.note).toContain("Debt headroom remaining");
  });

  it("applies facility upgrades and downgrades without refunding cash", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    club.finances.balance = 1_000_000;
    const startingBalance = club.finances.balance;
    const startingTraining = club.trainingLevel;
    const startingYouth = club.youthLevel;
    const startingUpkeep = club.finances.upkeep;

    save = upgradeTraining(save, 2);
    save = upgradeYouthAcademy(save, 1);
    const upgradedClub = save.clubs[save.userClubId];
    expect(upgradedClub.trainingLevel).toBe(startingTraining + 2);
    expect(upgradedClub.youthLevel).toBe(startingYouth + 1);
    expect(upgradedClub.finances.upkeep).toBeGreaterThan(startingUpkeep);
    expect(upgradedClub.finances.balance).toBeLessThan(startingBalance);

    const balanceAfterUpgrades = upgradedClub.finances.balance;
    const upkeepAfterUpgrades = upgradedClub.finances.upkeep;
    save = downgradeTraining(save, 2);
    save = downgradeYouthAcademy(save, 1);
    const downgradedClub = save.clubs[save.userClubId];
    expect(downgradedClub.trainingLevel).toBe(startingTraining);
    expect(downgradedClub.youthLevel).toBe(startingYouth);
    expect(downgradedClub.finances.balance).toBe(balanceAfterUpgrades);
    expect(downgradedClub.finances.upkeep).toBeLessThan(upkeepAfterUpgrades);
    expect(downgradedClub.finances.upkeep).toBeGreaterThanOrEqual(0);
  });

  it("allows emergency manager replacement but blocks repeated manager churn", () => {
    let save = createNewGame(setup);
    save = confirmFireManager(save);
    expect(save.clubs[save.userClubId].managerId).toBeUndefined();
    const lockedUntil = save.managerActionLockUntilWeek;
    expect(lockedUntil).toBe(save.week + 4);

    const candidate = save.managerCandidates[0];
    const expectedWage = calculateRecommendedManagerWage(candidate, 7);
    save = submitManagerHireOffer(save, candidate.id, { wage: expectedWage, years: 2, compensationFee: candidate.compensationFee ?? 0 });
    const hiredManagerId = save.clubs[save.userClubId].managerId;
    expect(hiredManagerId).toBe(candidate.id);
    expect(save.managerActionLockUntilWeek).toBe(lockedUntil);

    const nextCandidate = save.managerCandidates[0];
    const beforeBalance = save.clubs[save.userClubId].finances.balance;
    save = submitManagerHireOffer(save, nextCandidate.id, { wage: calculateRecommendedManagerWage(nextCandidate, 7), years: 2, compensationFee: nextCandidate.compensationFee ?? 0 });
    expect(save.clubs[save.userClubId].managerId).toBe(hiredManagerId);
    expect(save.clubs[save.userClubId].finances.balance).toBe(beforeBalance);
    save = confirmFireManager(save);
    expect(save.clubs[save.userClubId].managerId).toBe(hiredManagerId);
  });

  it("records relegation and moves the club to the lower division", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const oldDivision = save.divisions.find((division) => division.id === club.divisionId)!;
    const targetDivision = save.divisions.find((division) => division.level === 2)!;
    const fillerId = targetDivision.clubIds[0];
    oldDivision.clubIds = oldDivision.clubIds.filter((id) => id !== club.id);
    targetDivision.clubIds = targetDivision.clubIds.filter((id) => id !== fillerId);
    oldDivision.clubIds.push(fillerId);
    save.clubs[fillerId].divisionId = oldDivision.id;
    targetDivision.clubIds.push(club.id);
    club.divisionId = targetDivision.id;
    club.reputation = 55;
    targetDivision.clubIds.forEach((clubId, index) => {
      const targetClub = save.clubs[clubId];
      targetClub.record = clubId === club.id
        ? { played: 38, won: 2, drawn: 3, lost: 33, gf: 21, ga: 91, points: 9 }
        : { played: 38, won: 18 + (index % 5), drawn: 8, lost: 12, gf: 65 + index, ga: 45, points: 62 + index };
    });

    save = finishSeason(save);
    const history = save.history[0];
    const updatedClub = save.clubs[save.userClubId];
    const lowerDivision = save.divisions.find((division) => division.level === 3)!;
    expect(history.outcome).toBe("relegated");
    expect(history.nextDivisionName).toBe(lowerDivision.name);
    expect(updatedClub.divisionId).toBe(lowerDivision.id);
    expect(updatedClub.reputation).toBe(51);
    expect(lowerDivision.clubIds).toContain(updatedClub.id);
    expect(save.divisions.every((division) => division.clubIds.length === 20)).toBe(true);
  });

  it("simulates matches through preview and result events", () => {
    let save = createNewGame(setup);
    save = generateNextEvents(save);
    let guard = 0;
    while (save.currentEvent && save.currentEvent.type !== "match_preview" && guard < 12) {
      save = resolveEvent(save, save.currentEvent.id, save.currentEvent.type === "transfer_budget" ? { mode: "normal" } : undefined);
      guard += 1;
    }
    expect(save.currentEvent?.type).toBe("match_preview");
    save = resolveEvent(save, save.currentEvent!.id, { action: "see" });
    expect(save.currentEvent?.type).toBe("match_result");
    expect(save.lastMatch?.result).toBeDefined();
    expect(save.liveMatch).toBeUndefined();
    expect(save.currentEvent?.note).toContain("Impact: board confidence");
    expect(save.currentEvent?.note).toContain("manager trust");
    expect(save.currentEvent?.note).toContain("stadium condition");
  });

  it("creates live playback state for play match without double simulation", () => {
    let save = createNewGame(setup);
    save = generateNextEvents(save);
    let guard = 0;
    while (save.currentEvent && save.currentEvent.type !== "match_preview" && guard < 12) {
      save = resolveEvent(save, save.currentEvent.id, save.currentEvent.type === "transfer_budget" ? { mode: "normal" } : undefined);
      guard += 1;
    }
    const roundBefore = save.currentRound;
    save = resolveEvent(save, save.currentEvent!.id, { action: "play" });
    expect(save.currentEvent?.type).toBe("match_result");
    expect(save.liveMatch?.fixtureId).toBe(save.lastMatch?.id);
    expect(save.currentRound).toBe(roundBefore + 1);
  });

  it("plays domestic cup ties without changing league points", () => {
    let save = createNewGame(setup);
    const clubId = save.userClubId;
    save.week = cupRoundWeeks[0];
    save.currentRound = cupRoundWeeks[0] - 1;
    const leaguePlayedBefore = save.clubs[clubId].record.played;
    save = generateNextEvents(save);
    let guard = 0;
    while (save.currentEvent && guard < 16) {
      const fixture = save.currentEvent.fixtureId ? save.fixtures.find((item) => item.id === save.currentEvent!.fixtureId) : undefined;
      if (save.currentEvent.type === "match_preview" && fixture?.competition === "cup") break;
      const decision = save.currentEvent.type === "contract_offer" || save.currentEvent.type === "incoming_bid" ? { action: "reject" } : undefined;
      save = resolveEvent(save, save.currentEvent.id, decision);
      guard += 1;
    }
    const cupFixture = save.currentEvent?.fixtureId ? save.fixtures.find((item) => item.id === save.currentEvent!.fixtureId) : undefined;
    expect(save.currentEvent?.type).toBe("match_preview");
    expect(cupFixture?.competition).toBe("cup");
    save = resolveEvent(save, save.currentEvent!.id, { action: "see" });
    expect(save.currentEvent?.type).toBe("match_result");
    expect(save.lastMatch?.competition).toBe("cup");
    expect(save.cup.results).toHaveLength(1);
    expect(save.clubs[clubId].record.played).toBe(leaguePlayedBefore);
    expect(latestFinancialSnapshot(save).income.prizeMoney).toBeGreaterThan(0);
  });

  it("negotiates paid transfers and includes fees in financial snapshots", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    save.week = 2;
    save.currentEvent = {
      id: "contract_offer_test_buy",
      type: "contract_offer",
      title: "Manager target identified",
      body: "Test target",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: Object.values(save.players).find((player) => player.clubId !== club.id && player.value < club.finances.balance)!.id,
      managerId: club.managerId,
      proposal: undefined,
    };
    const player = save.players[save.currentEvent.playerId!];
    save.currentEvent.proposal = {
      id: "proposal_test_buy",
      type: "buy",
      week: save.week,
      title: "Buy player",
      rationale: "Manager target",
      playerId: player.id,
      fromClubId: player.clubId,
      toClubId: club.id,
      fee: Math.min(50_000, player.value),
      wageDelta: player.wage,
      expiresWeek: save.week + 2,
      requestedWage: player.wage,
      requestedYears: 3,
    };
    save.eventQueue.push({
      id: "financial_report_test",
      type: "financial_report",
      title: "Financial report",
      body: "Report",
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
    });
    save = resolveEvent(save, save.currentEvent.id, { action: "offer", terms: { fee: save.currentEvent.proposal.fee, wage: player.wage, years: 3 } });
    expect(save.clubs[save.userClubId].playerIds).toContain(player.id);
    const report = save.eventQueue.find((event) => event.type === "financial_report") ?? save.currentEvent;
    expect(report?.financialSnapshot?.expenses.feesOut).toBeGreaterThan(0);
  });

  it("completes loan-in deals and returns the player at season end", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const player = Object.values(save.players).find((item) => item.clubId !== club.id && item.value > club.finances.balance * 0.5)!;
    const parentClubId = player.clubId!;
    save.week = 2;
    save.transferBudget = { mode: "normal", amount: club.finances.balance };
    save.currentEvent = {
      id: "loan_in_event",
      type: "contract_offer",
      title: "Manager suggests loan signing",
      body: "Loan target",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: club.managerId,
      proposal: {
        id: "proposal_loan_in",
        type: "loan",
        loanDirection: "in",
        week: save.week,
        title: "Loan player",
        rationale: "Depth",
        playerId: player.id,
        fromClubId: parentClubId,
        toClubId: club.id,
        fee: 10_000,
        wageDelta: 500,
        expiresWeek: save.week + 2,
        requestedWage: 500,
        requestedYears: 1,
      },
    };
    save = resolveEvent(save, save.currentEvent.id, { action: "offer", terms: { fee: 10_000, wage: 500, years: 1 } });
    expect(save.clubs[save.userClubId].playerIds).toContain(player.id);
    expect(save.players[player.id].loan?.direction).toBe("in");
    expect(latestFinancialSnapshot(save).expenses.feesOut).toBeGreaterThan(0);
    save = returnSeasonLoans(save);
    expect(save.clubs[save.userClubId].playerIds).not.toContain(player.id);
    expect(save.clubs[parentClubId].playerIds).toContain(player.id);
    expect(save.players[player.id].loan).toBeUndefined();
  });

  it("accepts outgoing loans and restores the player to the parent club", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const destination = save.divisions.find((item) => item.id === club.divisionId)!.clubIds.map((id) => save.clubs[id]).find((item) => item.id !== club.id)!;
    const player = club.playerIds.map((id) => save.players[id]).sort((a, b) => a.rating - b.rating)[0];
    save.week = 2;
    save.currentEvent = {
      id: "loan_out_event",
      type: "contract_offer",
      title: "Loan offer received",
      body: "Loan out",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: club.managerId,
      proposal: {
        id: "proposal_loan_out",
        type: "loan",
        loanDirection: "out",
        week: save.week,
        title: "Loan out player",
        rationale: "Development",
        playerId: player.id,
        fromClubId: club.id,
        toClubId: destination.id,
        fee: 8_000,
        wageDelta: -400,
        expiresWeek: save.week + 2,
        requestedWage: 400,
        requestedYears: 1,
      },
    };
    save = resolveEvent(save, save.currentEvent.id, { action: "offer", terms: { fee: 8_000, wage: 400, years: 1 } });
    expect(save.clubs[save.userClubId].playerIds).not.toContain(player.id);
    expect(save.clubs[destination.id].playerIds).toContain(player.id);
    expect(save.players[player.id].loan?.direction).toBe("out");
    expect(latestFinancialSnapshot(save).income.feesIn).toBeGreaterThan(0);
    save = returnSeasonLoans(save);
    expect(save.clubs[save.userClubId].playerIds).toContain(player.id);
    expect(save.players[player.id].loan).toBeUndefined();
  });

  it("walking away from a transfer target creates a clear target-dropped response", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const player = Object.values(save.players).find((item) => item.clubId !== club.id && item.value < club.finances.balance)!;
    save.week = 2;
    save.currentEvent = {
      id: "contract_offer_walkaway",
      type: "contract_offer",
      title: "Manager target identified",
      body: "External target",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: club.managerId,
      proposal: {
        id: "proposal_walkaway",
        type: "buy",
        week: save.week,
        title: "Buy player",
        rationale: "Manager target",
        playerId: player.id,
        fromClubId: player.clubId,
        toClubId: club.id,
        fee: Math.min(50_000, player.value),
        wageDelta: player.wage,
        expiresWeek: save.week + 2,
        requestedWage: player.wage,
        requestedYears: 3,
      },
    };
    save = resolveEvent(save, save.currentEvent.id, { action: "reject" });
    expect(save.currentEvent?.title).toBe("Transfer target dropped");
    expect(save.currentEvent?.body).toContain("Manager trust -4");
  });

  it("incoming bids include the bidding club in the staged sale", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    const bidder = save.divisions.find((item) => item.id === club.divisionId)!.clubIds.map((id) => save.clubs[id]).find((item) => item.id !== club.id)!;
    const player = save.players[club.playerIds[0]];
    save.currentEvent = {
      id: "incoming_bid_test",
      type: "incoming_bid",
      title: "Bid received",
      body: "Bid",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: club.managerId,
      proposal: {
        id: "proposal_bidder",
        type: "sell",
        week: save.week,
        title: "Sell player",
        rationale: "Bid",
        playerId: player.id,
        fromClubId: club.id,
        toClubId: bidder.id,
        fee: 25_000,
        wageDelta: -player.wage,
        expiresWeek: save.week + 2,
      },
    };
    save = resolveEvent(save, save.currentEvent.id, { action: "accept" });
    expect(save.currentEvent?.type).toBe("sale_ready");
    expect(save.currentEvent?.pendingDeal?.buyerClubId).toBe(bidder.id);
    expect(save.currentEvent?.body).toContain(bidder.name);
  });

  it("adds an updated financial report when a transfer happens after the original report", () => {
    let save = createNewGame(setup);
    const club = save.clubs[save.userClubId];
    save.week = 2;
    save.seenEventKeys.push(`financial_report_s${save.season}_w${save.week}`);
    const player = Object.values(save.players).find((item) => item.clubId !== club.id && item.value < club.finances.balance)!;
    save.currentEvent = {
      id: "contract_offer_after_report",
      type: "contract_offer",
      title: "Manager target identified",
      body: "Test target",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: club.managerId,
      proposal: {
        id: "proposal_after_report",
        type: "buy",
        week: save.week,
        title: "Buy player",
        rationale: "Manager target",
        playerId: player.id,
        fromClubId: player.clubId,
        toClubId: club.id,
        fee: Math.min(50_000, player.value),
        wageDelta: player.wage,
        expiresWeek: save.week + 2,
        requestedWage: player.wage,
        requestedYears: 3,
      },
    };
    save = resolveEvent(save, save.currentEvent.id, { action: "offer", terms: { fee: save.currentEvent.proposal!.fee, wage: player.wage, years: 3 } });
    const updatedReport = save.eventQueue.find((event) => event.type === "financial_report");
    expect(save.currentEvent?.type).toBe("contract_response");
    expect(updatedReport?.financialSnapshot?.expenses.feesOut).toBeGreaterThan(0);
    expect(updatedReport?.note).toContain("Balance movement");
    expect(updatedReport?.body).toContain("Balance moved from");
  });

  it("uses one latest financial snapshot for summary surfaces", () => {
    let save = createNewGame(setup);
    save = advanceToNextMatch(save);
    save = generateNextEvents(save);
    while (save.currentEvent && save.currentEvent.type !== "financial_report") {
      save = resolveEvent(save, save.currentEvent.id, save.currentEvent.type === "transfer_budget" ? { mode: "normal" } : undefined);
    }
    expect(save.currentEvent?.type).toBe("financial_report");
    const latest = latestFinancialSnapshot(save);
    expect(latest.profit).toBe(save.currentEvent!.financialSnapshot!.profit);
    expect(latest.totalIncome - latest.totalExpenses).toBe(latest.profit);
    expect(latest.balanceAfter - latest.balanceBefore).toBe(latest.profit);
    expect(save.currentEvent?.body).toContain("Balance moved from");
    expect(save.currentEvent?.note).toContain("Income");
  });

  it("runs many seasons without crashing", () => {
    let save = createNewGame(setup);
    for (let i = 0; i < 100; i += 1) {
      save = advanceToNextMatch(save);
      if (i % 15 === 0) save = upgradeStand(save, "north");
      expect(save.clubs[save.userClubId].finances.balance).not.toBeNaN();
      if (save.gameOver) break;
    }
    expect(save.week).toBeGreaterThan(0);
  }, 20_000);

  it("runs a full event-queue season with stable finances, squad and relationships", () => {
    let save = createNewGame({ ...setup, seed: 20260529 });
    for (let step = 0; step < 560 && save.history.length < 1; step += 1) {
      save = generateNextEvents(save);
      let guard = 0;
      while (save.currentEvent && guard < 90) {
        save = resolveBalancedEvent(save);
        guard += 1;
      }
      expect(guard).toBeLessThan(90);
      if (step % 30 === 0) save = upgradeStand(save, "north");
      const club = save.clubs[save.userClubId];
      const squad = club.playerIds.map((id) => save.players[id]).filter(Boolean);
      const latest = latestFinancialSnapshot(save);
      expect(club.finances.balance).not.toBeNaN();
      expect(club.finances.weeklyWages).not.toBeNaN();
      expect(latest.totalIncome - latest.totalExpenses).toBe(latest.profit);
      expect(club.boardConfidence).toBeGreaterThanOrEqual(5);
      expect(club.boardConfidence).toBeLessThanOrEqual(99);
      expect(club.managerTrust).toBeGreaterThanOrEqual(0);
      expect(club.managerTrust).toBeLessThanOrEqual(99);
      expect(squad.length).toBeGreaterThanOrEqual(11);
      expect(squad.length).toBeLessThanOrEqual(32);
      expect(save.clubs[save.userClubId].finances.balance).toBeGreaterThan(save.clubs[save.userClubId].finances.debtLimit);
      if (save.gameOver) break;
    }
    expect(save.gameOver).toBeUndefined();
    expect(save.history.length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("keeps the continue event cadence active without flooding manager proposals", () => {
    let save = createNewGame({ ...setup, seed: 20260615 });
    const counts = new Map<string, number>();
    let decisions = 0;
    let proposals = 0;
    let periods = 0;

    for (let step = 0; step < 520 && save.history.length < 1; step += 1) {
      save = generateNextEvents(save);
      if (save.currentEvent) periods += 1;
      let guard = 0;
      while (save.currentEvent && guard < 90) {
        const type = save.currentEvent.type;
        counts.set(type, (counts.get(type) ?? 0) + 1);
        if (save.currentEvent.requiresDecision) decisions += 1;
        if (type === "contract_offer" || type === "incoming_bid") proposals += 1;
        save = resolveBalancedEvent(save);
        guard += 1;
      }
      expect(guard).toBeLessThan(90);
    }

    expect(save.history.length).toBeGreaterThanOrEqual(1);
    expect(counts.get("match_preview")).toBeGreaterThanOrEqual(38);
    expect(counts.get("financial_report")).toBeGreaterThanOrEqual(36);
    expect(decisions).toBeGreaterThanOrEqual(45);
    expect(proposals).toBeGreaterThanOrEqual(6);
    expect(proposals).toBeLessThanOrEqual(15);
    expect(periods).toBeGreaterThanOrEqual(38);
    expect(periods).toBeLessThanOrEqual(48);
  }, 30_000);

  it("plays multiple human-style seasons through the continue loop", () => {
    let save = createNewGame({ ...setup, seed: 20260622 });
    const counts = new Map<string, number>();
    let decisions = 0;
    let facilityActions = 0;
    let investmentCursor = 0;
    const startingTraining = save.clubs[save.userClubId].trainingLevel;
    const startingYouth = save.clubs[save.userClubId].youthLevel;

    for (let step = 0; step < 1200 && save.history.length < 2; step += 1) {
      save = generateNextEvents(save);
      let guard = 0;
      while (save.currentEvent && guard < 100) {
        const type = save.currentEvent.type;
        counts.set(type, (counts.get(type) ?? 0) + 1);
        if (save.currentEvent.requiresDecision) decisions += 1;
        save = resolveHumanStyleEvent(save);
        guard += 1;
      }
      expect(guard).toBeLessThan(100);

      const club = save.clubs[save.userClubId];
      if (!save.currentEvent && !save.gameOver && step % 22 === 0 && club.finances.balance > 750_000) {
        if (investmentCursor % 3 === 0) save = upgradeTraining(save, 1);
        else if (investmentCursor % 3 === 1) save = upgradeYouthAcademy(save, 1);
        else save = upgradeStand(save, "north");
        investmentCursor += 1;
        facilityActions += 1;
      }

      const latest = latestFinancialSnapshot(save);
      const squad = save.clubs[save.userClubId].playerIds.map((id) => save.players[id]).filter(Boolean);
      expect(latest.totalIncome - latest.totalExpenses).toBe(latest.profit);
      expect(save.clubs[save.userClubId].finances.balance).not.toBeNaN();
      expect(save.clubs[save.userClubId].finances.weeklyWages).not.toBeNaN();
      expect(save.clubs[save.userClubId].managerTrust).toBeGreaterThanOrEqual(0);
      expect(save.clubs[save.userClubId].managerTrust).toBeLessThanOrEqual(99);
      expect(save.clubs[save.userClubId].boardConfidence).toBeGreaterThanOrEqual(5);
      expect(save.clubs[save.userClubId].boardConfidence).toBeLessThanOrEqual(99);
      expect(squad.length).toBeGreaterThanOrEqual(11);
      expect(squad.length).toBeLessThanOrEqual(36);
      if (save.gameOver) break;
    }

    const club = save.clubs[save.userClubId];
    expect(save.gameOver).toBeUndefined();
    expect(save.history.length).toBeGreaterThanOrEqual(2);
    expect(counts.get("season_summary")).toBeGreaterThanOrEqual(1);
    expect(counts.get("match_preview")).toBeGreaterThanOrEqual(76);
    expect(decisions).toBeGreaterThanOrEqual(90);
    expect(facilityActions).toBeGreaterThanOrEqual(1);
    expect(club.trainingLevel + club.youthLevel).toBeGreaterThan(startingTraining + startingYouth);
    expect(club.finances.balance).toBeGreaterThan(club.finances.debtLimit);
    expect(save.divisions.every((division) => division.clubIds.length === 20)).toBe(true);
  }, 40_000);

  it("runs many direct engine seasons with stable balances and squads", () => {
    let save = createNewGame({ ...setup, seed: 20260601 });
    for (let i = 0; i < 260; i += 1) {
      save = advanceToNextMatch(save);
      if (i % 30 === 0) save = upgradeStand(save, "north");
      const club = save.clubs[save.userClubId];
      const squad = club.playerIds.map((id) => save.players[id]).filter(Boolean);
      expect(club.finances.balance).not.toBeNaN();
      expect(club.finances.weeklyWages).not.toBeNaN();
      expect(squad.length).toBeGreaterThanOrEqual(11);
      expect(squad.length).toBeLessThanOrEqual(36);
      expect(club.boardConfidence).toBeGreaterThanOrEqual(5);
      expect(club.managerTrust).toBeGreaterThanOrEqual(0);
      if (save.gameOver) break;
    }
    expect(save.gameOver).toBeUndefined();
    expect(save.history.length).toBeGreaterThanOrEqual(5);
  }, 30_000);
});
