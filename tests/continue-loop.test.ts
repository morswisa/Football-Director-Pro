import { describe, expect, it } from "vitest";
import {
  activateNextContinueEvent,
  enqueueContinueEvent,
  isContinueEventKnown,
  markContinueEventHandled,
  normalizeContinueLoopState,
  prioritizeEventsQueuedAfter,
} from "../src/game/continue-loop";
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

function event(id: string): GameEvent {
  return {
    id,
    type: "club_update",
    title: id,
    body: "Continue loop test event.",
    requiresDecision: false,
    createdSeason: 0,
    createdWeek: 1,
  };
}

describe("continue loop module", () => {
  it("normalizes transient continue-loop state", () => {
    const save = createNewGame(setup);
    save.eventQueue = undefined as unknown as typeof save.eventQueue;
    save.seenEventKeys = undefined as unknown as typeof save.seenEventKeys;
    save.pendingDeals = undefined as unknown as typeof save.pendingDeals;
    save.managerCandidates = undefined as unknown as typeof save.managerCandidates;
    save.managerActionLockUntilWeek = undefined;
    save.cup = undefined as unknown as typeof save.cup;

    normalizeContinueLoopState(save);

    expect(save.eventQueue).toEqual([]);
    expect(save.seenEventKeys).toEqual([]);
    expect(save.pendingDeals).toEqual([]);
    expect(save.managerCandidates).toEqual([]);
    expect(save.managerActionLockUntilWeek).toBe(0);
    expect(save.cup.name).toBe("Chairman's Cup");
  });

  it("dedupes queued, current, and handled events", () => {
    const save = createNewGame(setup);
    const first = event("event_a");
    enqueueContinueEvent(save, first);
    enqueueContinueEvent(save, first);
    expect(save.eventQueue).toHaveLength(1);

    activateNextContinueEvent(save);
    enqueueContinueEvent(save, first);
    expect(save.eventQueue).toHaveLength(0);
    expect(isContinueEventKnown(save, first.id)).toBe(true);

    markContinueEventHandled(save, first.id);
    save.currentEvent = undefined;
    enqueueContinueEvent(save, first);
    expect(save.eventQueue).toHaveLength(0);
  });

  it("prioritizes follow-up events queued while resolving a decision", () => {
    const save = createNewGame(setup);
    enqueueContinueEvent(save, event("existing_a"));
    enqueueContinueEvent(save, event("existing_b"));
    const queueLengthBeforeResolution = save.eventQueue.length;
    enqueueContinueEvent(save, event("follow_up"));

    prioritizeEventsQueuedAfter(save, queueLengthBeforeResolution);

    expect(save.eventQueue.map((item) => item.id)).toEqual(["follow_up", "existing_a", "existing_b"]);
  });
});
