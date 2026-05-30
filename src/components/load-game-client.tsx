"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, FolderOpen, Save, Trophy, Wallet } from "lucide-react";
import { AppFrame } from "./app-frame";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { listSaves } from "@/game/persistence";
import type { SaveSlot } from "@/game/types";
import { formatMoney } from "@/lib/utils";
import { monthForWeek, seasonLabel } from "@/game/calendar";
import { useGameStore } from "@/store/game-store";

export function LoadGameClient() {
  const router = useRouter();
  const load = useGameStore((state) => state.load);
  const [saves, setSaves] = useState<SaveSlot[]>([]);

  useEffect(() => {
    listSaves().then(setSaves).catch(() => setSaves([]));
  }, []);

  async function open(slotId: string) {
    await load(slotId);
    router.push("/game");
  }

  return (
    <AppFrame>
      <div className="relative overflow-hidden border-b border-emerald-950/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_62%,_#1aa24f)] px-4 pb-5 pt-4 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_40%,rgba(255,255,255,0.25)_40%_42%,transparent_42%_58%,rgba(255,255,255,0.14)_58%_60%,transparent_60%)]" />
        <div className="relative flex items-center gap-3">
        <button aria-label="Back" onClick={() => router.push("/")} className="rounded-full bg-white/12 p-2 hover:bg-white/20">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black">Load Game</h1>
          <p className="text-xs text-white/70">{saves.length ? `${saves.length} local career${saves.length === 1 ? "" : "s"}` : "Local career archive"}</p>
        </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {saves.length === 0 ? (
          <Card className="relative overflow-hidden border-emerald-100 bg-[linear-gradient(180deg,_#ffffff,_#f4fbf6)] p-0 text-center">
            <div className="mx-auto mt-8 grid h-20 w-20 place-items-center rounded-3xl bg-emerald-50 text-primary shadow-[0_14px_30px_rgba(21,153,71,0.12)]">
              <Save size={34} />
            </div>
            <div className="px-6 py-6">
              <p className="text-xl font-black">No local saves yet</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-neutral-500">Create a club and your chairman file will appear here for quick loading.</p>
              <Button className="mt-5 w-full" onClick={() => router.push("/new-game")}>
                <FolderOpen size={18} /> Create Club
              </Button>
            </div>
          </Card>
        ) : (
          saves.map((slot) => (
            <Card key={slot.slotId} className="overflow-hidden p-0">
              <div className="bg-[linear-gradient(135deg,_#10241b,_#0f8139)] px-4 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black">{slot.clubName}</p>
                    <p className="mt-1 text-xs text-white/70">{seasonLabel(slot.season)} · {monthForWeek(slot.week)}</p>
                  </div>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/12 text-white">
                    <Trophy size={22} />
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 px-4 py-3 text-xs">
                <p className="rounded-xl bg-surface-muted px-3 py-3"><CalendarDays size={15} className="mb-2 text-primary" /><span className="font-black uppercase text-neutral-500">Period</span><b className="block text-sm">{slot.save.week}</b></p>
                <p className="rounded-xl bg-surface-muted px-3 py-3"><Wallet size={15} className="mb-2 text-primary" /><span className="font-black uppercase text-neutral-500">Balance</span><b className="block text-sm">{formatMoney(slot.balance)}</b></p>
              </div>
              <div className="border-t border-line bg-white px-4 py-3">
                <Button className="w-full" onClick={() => open(slot.slotId)}>Open Save</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </AppFrame>
  );
}
