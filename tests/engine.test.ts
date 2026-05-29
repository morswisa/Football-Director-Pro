import { describe, expect, it } from "vitest";
import {
  advanceToNextMatch,
  calculateManagerCompensation,
  calculateRecommendedManagerWage,
  calculateRecommendedPlayerWage,
  confirmFireManager,
  createNewGame,
  finishSeason,
  generateNextEvents,
  leagueTable,
  latestFinancialSnapshot,
  normalizeGameState,
  resolveEvent,
  returnSeasonLoans,
  submitManagerHireOffer,
  upgradeStand,
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

describe("game engine", () => {
  it("creates a deterministic world", () => {
    const a = createNewGame(setup);
    const b = createNewGame(setup);
    expect(a.userClubId).toBe(b.userClubId);
    expect(Object.keys(a.clubs)).toHaveLength(140);
    expect(a.fixtures.length).toBeGreaterThan(300);
    expect(a.clubs[a.userClubId].name).toBe("Sunnyvale FC");
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
    expect(save.week).toBe(1);
    save = generateNextEvents(save);
    expect(save.currentEvent?.type).toBe("season_summary");
    expect(save.currentEvent?.seasonHistory?.season).toBe(history.season);
    expect(save.currentEvent?.body).toContain("Season award");
    save = resolveEvent(save, save.currentEvent!.id);
    expect(save.currentEvent?.type).toBe("season_intro");
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
