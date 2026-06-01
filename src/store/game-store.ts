"use client";

import { create } from "zustand";
import { createCareer, importCareer, loadCareer, runCareerCommand } from "@/game/career-commands";
import { deleteSave, importSave, loadGame, saveGame } from "@/game/persistence";
import type { ClubSetupInput, GameSave, TransferBudgetMode } from "@/game/types";
import type { ContractTerms } from "@/game/types";

interface GameStore {
  save?: GameSave;
  hydrated: boolean;
  message?: string;
  create: (input: ClubSetupInput) => Promise<void>;
  load: (slotId?: string) => Promise<void>;
  persist: () => Promise<void>;
  advance: () => Promise<void>;
  continueGame: () => Promise<void>;
  finishLiveMatch: () => Promise<void>;
  resolveCurrentEvent: (decision?: { action?: string; terms?: ContractTerms; mode?: TransferBudgetMode }) => Promise<void>;
  hire: (managerId: string, terms: ContractTerms) => Promise<void>;
  fire: () => Promise<void>;
  upgradeStand: (standId: string) => Promise<void>;
  repair: () => Promise<void>;
  upgradeTraining: (levels?: number) => Promise<void>;
  upgradeYouth: (levels?: number) => Promise<void>;
  downgradeTraining: (levels?: number) => Promise<void>;
  downgradeYouth: (levels?: number) => Promise<void>;
  importFromJson: (json: string) => Promise<boolean>;
  resetCareer: () => Promise<void>;
  updateSettings: (settings: Partial<GameSave["settings"]>) => Promise<void>;
  clearMessage: () => void;
}

async function persistSave(save?: GameSave) {
  if (save) await saveGame(save.slotId, save);
}

async function commitCareerResult(result: { save: GameSave; message?: string } | undefined, set: (state: Partial<GameStore>) => void) {
  if (!result) return;
  await persistSave(result.save);
  set({ save: result.save, message: result.message });
}

export const useGameStore = create<GameStore>((set, get) => ({
  hydrated: false,
  async create(input) {
    const result = createCareer(input);
    await persistSave(result.save);
    set({ save: result.save, hydrated: true, message: result.message });
  },
  async load(slotId = "slot-1") {
    const loaded = await loadGame(slotId);
    const result = loadCareer(loaded);
    if (result) await persistSave(result.save);
    set({ save: result?.save, hydrated: true, message: result?.message ?? "No local save found." });
  },
  async persist() {
    await persistSave(get().save);
  },
  async advance() {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "advance" }), set);
  },
  async continueGame() {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "continue" }), set);
  },
  async finishLiveMatch() {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "finish_live_match" }), set);
  },
  async resolveCurrentEvent(decision) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "resolve_current_event", decision }), set);
  },
  async hire(managerId, terms) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "hire_manager", managerId, terms }), set);
  },
  async fire() {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "fire_manager" }), set);
  },
  async upgradeStand(standId) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "upgrade_stand", standId }), set);
  },
  async repair() {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "repair_stadium" }), set);
  },
  async upgradeTraining(levels = 1) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "upgrade_training", levels }), set);
  },
  async upgradeYouth(levels = 1) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "upgrade_youth", levels }), set);
  },
  async downgradeTraining(levels = 1) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "downgrade_training", levels }), set);
  },
  async downgradeYouth(levels = 1) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "downgrade_youth", levels }), set);
  },
  async importFromJson(json) {
    try {
      const imported = await importSave(json, "slot-1");
      const result = importCareer(imported);
      await persistSave(result.save);
      set({ save: result.save, hydrated: true, message: result.message });
      return true;
    } catch {
      set({ message: "Import failed. Check the save JSON." });
      return false;
    }
  },
  async resetCareer() {
    await deleteSave("slot-1");
    set({ save: undefined, hydrated: true, message: "Local career reset." });
  },
  async updateSettings(settings) {
    const current = get().save;
    if (current) await commitCareerResult(runCareerCommand(current, { type: "update_settings", settings }), set);
  },
  clearMessage() {
    set({ message: undefined });
  },
}));
