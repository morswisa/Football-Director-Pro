import type { GameEvent, GameSave } from "./types";

export function normalizeContinueLoopState(save: GameSave) {
  save.eventQueue ??= [];
  save.seenEventKeys ??= [];
  save.pendingDeals ??= [];
  save.managerCandidates ??= [];
  save.managerActionLockUntilWeek ??= 0;
  save.cup ??= { name: "Chairman's Cup", round: 1, maxRounds: 5, eliminated: false, won: false, results: [] };
  save.cup.name ??= "Chairman's Cup";
  save.cup.round = Math.max(1, save.cup.round ?? 1);
  save.cup.maxRounds = Math.max(5, save.cup.maxRounds ?? 5);
  save.cup.results ??= [];
  save.cup.eliminated ??= false;
  save.cup.won ??= false;
  return save;
}

export function isContinueEventKnown(save: GameSave, eventId: string) {
  return save.seenEventKeys.includes(eventId) || save.eventQueue.some((event) => event.id === eventId) || save.currentEvent?.id === eventId;
}

export function markContinueEventHandled(save: GameSave, eventId: string) {
  if (!save.seenEventKeys.includes(eventId)) save.seenEventKeys.push(eventId);
  save.seenEventKeys = save.seenEventKeys.slice(-260);
}

export function activateNextContinueEvent(save: GameSave) {
  save.currentEvent = save.eventQueue.shift();
  return save;
}

export function enqueueContinueEvent(save: GameSave, event: GameEvent) {
  if (!isContinueEventKnown(save, event.id)) save.eventQueue.push(event);
}

export function prioritizeEventsQueuedAfter(save: GameSave, queueLengthBeforeResolution: number) {
  const newlyQueuedEvents = save.eventQueue.slice(queueLengthBeforeResolution);
  if (newlyQueuedEvents.length > 0) {
    save.eventQueue = [...newlyQueuedEvents, ...save.eventQueue.slice(0, queueLengthBeforeResolution)];
  }
}
