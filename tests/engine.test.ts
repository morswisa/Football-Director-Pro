import { describe, expect, it } from "vitest";
import {
  advanceToNextMatch,
  approveTransferProposal,
  createNewGame,
  fireManager,
  generateNextEvents,
  hireManager,
  leagueTable,
  resolveEvent,
  upgradeStand,
} from "../src/game/engine";

const setup = {
  chairmanName: "Alex Morgan",
  clubName: "Sunnyvale FC",
  stadiumName: "Greenfield Stadium",
  primaryColor: "#159947",
  secondaryColor: "#f2f7f1",
  seed: 42,
};

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
    const candidate = save.managerCandidates[0];
    save = fireManager(save);
    expect(save.clubs[save.userClubId].managerId).toBeUndefined();
    save = hireManager(save, save.managerCandidates[0].id);
    expect(save.clubs[save.userClubId].managerId).toBeDefined();
    expect(candidate.name).toBeTruthy();
  });

  it("generates manager-led proposals without manual scouting", () => {
    let save = createNewGame(setup);
    for (let i = 0; i < 4 && !save.activeProposal; i += 1) save = advanceToNextMatch(save);
    expect(save.activeProposal?.title).toBeTruthy();
    const before = save.clubs[save.userClubId].finances.balance;
    save = approveTransferProposal(save);
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
    save = resolveEvent(save, save.currentEvent!.id, { action: "sim" });
    expect(save.currentEvent?.type).toBe("match_result");
    expect(save.lastMatch?.result).toBeDefined();
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

  it("runs many seasons without crashing", () => {
    let save = createNewGame(setup);
    for (let i = 0; i < 100; i += 1) {
      save = advanceToNextMatch(save);
      if (save.activeProposal) save = approveTransferProposal(save);
      if (i % 15 === 0) save = upgradeStand(save, "north");
      expect(save.clubs[save.userClubId].finances.balance).not.toBeNaN();
      if (save.gameOver) break;
    }
    expect(save.week).toBeGreaterThan(0);
  }, 20_000);
});
