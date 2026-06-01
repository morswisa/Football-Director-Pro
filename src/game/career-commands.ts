import {
  advanceToNextMatch,
  confirmFireManager,
  createNewGame,
  downgradeTraining,
  downgradeYouthAcademy,
  generateNextEvents,
  normalizeGameState,
  repairStadium,
  resolveEvent,
  submitManagerHireOffer,
  upgradeStand,
  upgradeTraining,
  upgradeYouthAcademy,
} from "./engine";
import type { ClubSetupInput, ContractTerms, GameSave, TransferBudgetMode } from "./types";

export type CareerCommand =
  | { type: "advance" }
  | { type: "continue" }
  | { type: "finish_live_match" }
  | { type: "resolve_current_event"; decision?: { action?: string; terms?: ContractTerms; mode?: TransferBudgetMode } }
  | { type: "hire_manager"; managerId: string; terms: ContractTerms }
  | { type: "fire_manager" }
  | { type: "upgrade_stand"; standId: string }
  | { type: "repair_stadium" }
  | { type: "upgrade_training"; levels?: number }
  | { type: "upgrade_youth"; levels?: number }
  | { type: "downgrade_training"; levels?: number }
  | { type: "downgrade_youth"; levels?: number }
  | { type: "update_settings"; settings: Partial<GameSave["settings"]> };

export interface CareerCommandResult {
  save: GameSave;
  message?: string;
}

export function createCareer(input: ClubSetupInput): CareerCommandResult {
  return {
    save: normalizeGameState(createNewGame(input)),
    message: "Club created and saved.",
  };
}

export function loadCareer(loaded?: GameSave): CareerCommandResult | undefined {
  if (!loaded) return undefined;
  return {
    save: normalizeGameState(loaded),
    message: "Save loaded.",
  };
}

export function importCareer(imported: GameSave): CareerCommandResult {
  return {
    save: normalizeGameState(imported),
    message: "Save imported.",
  };
}

export function runCareerCommand(current: GameSave, command: CareerCommand): CareerCommandResult | undefined {
  switch (command.type) {
    case "advance": {
      const save = advanceToNextMatch(current);
      return { save, message: save.lastMatch ? "Match day complete." : "Season advanced." };
    }
    case "continue":
      return { save: generateNextEvents(current) };
    case "finish_live_match":
      if (!current.liveMatch) return undefined;
      return {
        save: {
          ...current,
          liveMatch: { ...current.liveMatch, currentMinute: 90, finished: true },
          updatedAt: new Date().toISOString(),
        },
      };
    case "resolve_current_event":
      if (!current.currentEvent) return undefined;
      return { save: resolveEvent(current, current.currentEvent.id, command.decision) };
    case "hire_manager": {
      const beforeManager = current.clubs[current.userClubId].managerId;
      const save = submitManagerHireOffer(current, command.managerId, command.terms);
      return {
        save,
        message: save.clubs[save.userClubId].managerId !== beforeManager ? "Manager hired." : "Manager offer was not accepted.",
      };
    }
    case "fire_manager":
      return { save: confirmFireManager(current), message: "Manager dismissed. New candidates are available." };
    case "upgrade_stand": {
      const before = current.clubs[current.userClubId].finances.balance;
      const save = upgradeStand(current, command.standId);
      return { save, message: save.clubs[save.userClubId].finances.balance === before ? "Not enough funds." : "Stand upgraded." };
    }
    case "repair_stadium":
      return { save: repairStadium(current), message: "Stadium repaired if funds were available." };
    case "upgrade_training":
      return { save: upgradeTraining(current, command.levels ?? 1), message: "Training investment processed." };
    case "upgrade_youth":
      return { save: upgradeYouthAcademy(current, command.levels ?? 1), message: "Youth academy investment processed." };
    case "downgrade_training":
      return { save: downgradeTraining(current, command.levels ?? 1), message: "Training upkeep reduced." };
    case "downgrade_youth":
      return { save: downgradeYouthAcademy(current, command.levels ?? 1), message: "Youth academy upkeep reduced." };
    case "update_settings":
      return {
        save: {
          ...current,
          settings: { ...current.settings, ...command.settings },
          updatedAt: new Date().toISOString(),
        },
        message: "Settings updated.",
      };
  }
}
