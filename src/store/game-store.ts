"use client";

import { create } from "zustand";
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
} from "@/game/engine";
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

export const useGameStore = create<GameStore>((set, get) => ({
  hydrated: false,
  async create(input) {
    const save = normalizeGameState(createNewGame(input));
    await persistSave(save);
    set({ save, hydrated: true, message: "Club created and saved." });
  },
  async load(slotId = "slot-1") {
    const loaded = await loadGame(slotId);
    const save = loaded ? normalizeGameState(loaded) : undefined;
    if (save) await persistSave(save);
    set({ save, hydrated: true, message: save ? "Save loaded." : "No local save found." });
  },
  async persist() {
    await persistSave(get().save);
  },
  async advance() {
    const current = get().save;
    if (!current) return;
    const save = advanceToNextMatch(current);
    await persistSave(save);
    set({ save, message: save.lastMatch ? "Match day complete." : "Season advanced." });
  },
  async continueGame() {
    const current = get().save;
    if (!current) return;
    const save = generateNextEvents(current);
    await persistSave(save);
    set({ save });
  },
  async finishLiveMatch() {
    const current = get().save;
    if (!current?.liveMatch) return;
    const save: GameSave = {
      ...current,
      liveMatch: { ...current.liveMatch, currentMinute: 90, finished: true },
      updatedAt: new Date().toISOString(),
    };
    await persistSave(save);
    set({ save });
  },
  async resolveCurrentEvent(decision) {
    const current = get().save;
    if (!current?.currentEvent) return;
    const save = resolveEvent(current, current.currentEvent.id, decision);
    await persistSave(save);
    set({ save });
  },
  async hire(managerId, terms) {
    const current = get().save;
    if (!current) return;
    const beforeManager = current.clubs[current.userClubId].managerId;
    const save = submitManagerHireOffer(current, managerId, terms);
    await persistSave(save);
    set({ save, message: save.clubs[save.userClubId].managerId !== beforeManager ? "Manager hired." : "Manager offer was not accepted." });
  },
  async fire() {
    const current = get().save;
    if (!current) return;
    const save = confirmFireManager(current);
    await persistSave(save);
    set({ save, message: "Manager dismissed. New candidates are available." });
  },
  async upgradeStand(standId) {
    const current = get().save;
    if (!current) return;
    const before = current.clubs[current.userClubId].finances.balance;
    const save = upgradeStand(current, standId);
    await persistSave(save);
    set({ save, message: save.clubs[save.userClubId].finances.balance === before ? "Not enough funds." : "Stand upgraded." });
  },
  async repair() {
    const current = get().save;
    if (!current) return;
    const save = repairStadium(current);
    await persistSave(save);
    set({ save, message: "Stadium repaired if funds were available." });
  },
  async upgradeTraining(levels = 1) {
    const current = get().save;
    if (!current) return;
    const save = upgradeTraining(current, levels);
    await persistSave(save);
    set({ save, message: "Training investment processed." });
  },
  async upgradeYouth(levels = 1) {
    const current = get().save;
    if (!current) return;
    const save = upgradeYouthAcademy(current, levels);
    await persistSave(save);
    set({ save, message: "Youth academy investment processed." });
  },
  async downgradeTraining(levels = 1) {
    const current = get().save;
    if (!current) return;
    const save = downgradeTraining(current, levels);
    await persistSave(save);
    set({ save, message: "Training upkeep reduced." });
  },
  async downgradeYouth(levels = 1) {
    const current = get().save;
    if (!current) return;
    const save = downgradeYouthAcademy(current, levels);
    await persistSave(save);
    set({ save, message: "Youth academy upkeep reduced." });
  },
  async importFromJson(json) {
    try {
      const imported = await importSave(json, "slot-1");
      const save = normalizeGameState(imported);
      await persistSave(save);
      set({ save, hydrated: true, message: "Save imported." });
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
    if (!current) return;
    const save: GameSave = {
      ...current,
      settings: { ...current.settings, ...settings },
      updatedAt: new Date().toISOString(),
    };
    await persistSave(save);
    set({ save, message: "Settings updated." });
  },
  clearMessage() {
    set({ message: undefined });
  },
}));
