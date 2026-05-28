"use client";

import Dexie, { type Table } from "dexie";
import { gameSaveSchema } from "./schemas";
import type { GameSave, SaveSlot } from "./types";

interface SaveSlotRecord extends SaveSlot {
  slotId: string;
}

class FootballDirectorDb extends Dexie {
  saves!: Table<SaveSlotRecord, string>;

  constructor() {
    super("football-director-pro");
    this.version(1).stores({
      saves: "slotId, updatedAt, clubName",
    });
  }
}

let db: FootballDirectorDb | undefined;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("Local saves are only available in the browser.");
  }
  db ??= new FootballDirectorDb();
  return db;
}

export function migrateSave(raw: unknown): GameSave {
  const parsed = gameSaveSchema.parse(raw);
  return parsed as GameSave;
}

export async function saveGame(slotId: string, save: GameSave) {
  const club = save.clubs[save.userClubId];
  const record: SaveSlotRecord = {
    slotId,
    updatedAt: save.updatedAt,
    clubName: club.name,
    season: save.season,
    week: save.week,
    balance: club.finances.balance,
    save: { ...save, slotId },
  };
  await getDb().saves.put(record);
}

export async function loadGame(slotId: string) {
  const record = await getDb().saves.get(slotId);
  return record ? migrateSave(record.save) : undefined;
}

export async function listSaves() {
  return getDb().saves.orderBy("updatedAt").reverse().toArray();
}

export async function deleteSave(slotId: string) {
  await getDb().saves.delete(slotId);
}

export function exportSave(save: GameSave) {
  return JSON.stringify(save, null, 2);
}

export async function importSave(json: string, slotId = "slot-1") {
  const save = migrateSave(JSON.parse(json));
  save.slotId = slotId;
  save.updatedAt = new Date().toISOString();
  await saveGame(slotId, save);
  return save;
}
