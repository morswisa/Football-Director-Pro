import { describe, expect, it } from "vitest";
import { createCareer, loadCareer, runCareerCommand } from "../src/game/career-commands";
import { calculateRecommendedManagerWage } from "../src/game/economy";
import { createNewGame } from "../src/game/engine";

const setup = {
  chairmanName: "Alex Morgan",
  clubName: "Sunnyvale FC",
  stadiumName: "Greenfield Stadium",
  primaryColor: "#159947",
  secondaryColor: "#f2f7f1",
  seed: 42,
};

describe("career command seam", () => {
  it("creates and loads normalized careers with store-facing messages", () => {
    const created = createCareer(setup);

    expect(created.save.clubs[created.save.userClubId].name).toBe("Sunnyvale FC");
    expect(created.save.version).toBe(1);
    expect(created.message).toBe("Club created and saved.");
    expect(loadCareer(created.save)?.message).toBe("Save loaded.");
    expect(loadCareer(undefined)).toBeUndefined();
  });

  it("runs Continue and event resolution without requiring Zustand", () => {
    const save = createNewGame(setup);
    const continued = runCareerCommand(save, { type: "continue" })!;

    expect(continued.save.currentEvent ?? continued.save.eventQueue[0]).toBeDefined();

    const eventSave = continued.save.currentEvent ? continued.save : runCareerCommand(continued.save, { type: "continue" })!.save;
    const resolved = runCareerCommand(eventSave, { type: "resolve_current_event", decision: { action: "continue" } });

    expect(resolved?.save.updatedAt).toBeDefined();
  });

  it("keeps manager hiring economics behind a command result", () => {
    const save = createNewGame(setup);
    const candidate = save.managerCandidates[0];
    const divisionLevel = save.divisions.find((division) => division.id === save.clubs[save.userClubId].divisionId)?.level ?? 7;
    const wage = calculateRecommendedManagerWage(candidate, divisionLevel);

    const result = runCareerCommand(save, {
      type: "hire_manager",
      managerId: candidate.id,
      terms: { wage, years: 2, compensationFee: candidate.compensationFee ?? 0 },
    })!;

    expect(result.save.clubs[result.save.userClubId].managerId).toBe(candidate.id);
    expect(result.message).toBe("Manager hired.");
  });

  it("preserves current tab, page, panel and event state through save/load normalization", () => {
    const save = createNewGame(setup);
    save.currentEvent = {
      id: "state_preservation_event",
      type: "season_intro",
      title: "League Path",
      body: "A saved decision is waiting.",
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
    };

    const updated = runCareerCommand(save, {
      type: "update_ui_state",
      ui: {
        activeTab: "squad",
        pages: { squad: 2, history_seasons: 1 },
        panels: { history: "trophies", finances: "income" },
      },
    })!;
    const loaded = loadCareer(JSON.parse(JSON.stringify(updated.save)))!;

    expect(loaded.save.ui.activeTab).toBe("squad");
    expect(loaded.save.ui.pages.squad).toBe(2);
    expect(loaded.save.ui.pages.history_seasons).toBe(1);
    expect(loaded.save.ui.panels.history).toBe("trophies");
    expect(loaded.save.currentEvent?.id).toBe("state_preservation_event");
    expect(loaded.save.currentEvent?.type).toBe("season_intro");
  });

  it("returns undefined for commands that are invalid in the current career state", () => {
    const save = createNewGame(setup);

    expect(runCareerCommand(save, { type: "finish_live_match" })).toBeUndefined();
    expect(runCareerCommand(save, { type: "resolve_current_event" })).toBeUndefined();
  });
});
