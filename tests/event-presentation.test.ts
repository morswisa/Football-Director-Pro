import { describe, expect, it } from "vitest";
import { buildEventPresentation, eventCategory, eventToneClasses } from "../src/components/event-presentation";
import { createNewGame } from "../src/game/engine";
import type { GameEvent } from "../src/game/types";

const setup = {
  chairmanName: "Alex Morgan",
  clubName: "Sunnyvale FC",
  stadiumName: "Greenfield Stadium",
  primaryColor: "#159947",
  secondaryColor: "#f2f7f1",
  seed: 42,
};

function event(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: "event_a",
    type: "club_update",
    title: "Club update",
    body: "Board update.",
    requiresDecision: false,
    createdSeason: 0,
    createdWeek: 1,
    ...overrides,
  };
}

describe("event presentation module", () => {
  it("groups Continue events into player-facing categories", () => {
    expect(eventCategory("match_preview")).toBe("Match day");
    expect(eventCategory("financial_report")).toBe("Club finance");
    expect(eventCategory("incoming_bid")).toBe("Squad business");
    expect(eventCategory("manager_contract_decision")).toBe("Manager office");
    expect(eventCategory("youth_contract")).toBe("Academy");
    expect(eventCategory("season_summary")).toBe("Season desk");
    expect(eventCategory("hall_of_fame")).toBe("Club legacy");
  });

  it("builds the modal shell labels from the active event and queue", () => {
    const save = createNewGame(setup);
    save.currentEvent = event({ type: "match_preview", requiresDecision: true, fixtureId: save.fixtures[0].id, createdWeek: 4 });
    save.eventQueue = [event({ id: "queued_event" })];

    const presentation = buildEventPresentation(save)!;

    expect(presentation.statusLabel).toBe("Decision required");
    expect(presentation.category).toBe("Match day");
    expect(presentation.queueLabel).toBe("1 queued");
    expect(presentation.periodLabel).toContain("Period 4");
  });

  it("keeps noisy note rules outside the React modal", () => {
    const save = createNewGame(setup);
    save.currentEvent = event({ note: "Show this context." });
    expect(buildEventPresentation(save)?.showEventNote).toBe(true);

    save.currentEvent = event({
      type: "season_summary",
      note: "Season summary note is handled by the season panel.",
      seasonHistory: {
        season: 0,
        divisionName: "Foundation League",
        position: 1,
        points: 90,
        balance: 1_000_000,
        trophies: [],
      },
    });
    expect(buildEventPresentation(save)?.showEventNote).toBe(false);

    save.currentEvent = event({
      type: "contract_offer",
      note: "Contract proposal note is handled by the controls.",
      proposal: {
        id: "proposal_a",
        type: "contract",
        week: 4,
        title: "Contract",
        rationale: "Squad stability.",
        playerId: save.clubs[save.userClubId].playerIds[0],
        fee: 0,
        wageDelta: 100,
        expiresWeek: 5,
      },
    });
    expect(buildEventPresentation(save)?.showEventNote).toBe(false);
  });

  it("maps variants to stable tone class names", () => {
    expect(eventToneClasses("positive").accent).toContain("emerald");
    expect(eventToneClasses("negative").accent).toContain("red");
    expect(eventToneClasses("neutral").accent).toContain("surface-muted");
  });
});
