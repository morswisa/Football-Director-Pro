"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
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
      <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-4">
        <button aria-label="Back" onClick={() => router.push("/")} className="rounded-full p-2 hover:bg-surface-muted">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Load Game</h1>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {saves.length === 0 ? (
          <Card className="text-center">
            <Save className="mx-auto mb-3 text-primary" size={28} />
            <p className="font-semibold">No local saves yet</p>
            <p className="mt-1 text-sm text-neutral-500">Create a club to start your first career.</p>
          </Card>
        ) : (
          saves.map((slot) => (
            <Card key={slot.slotId} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{slot.clubName}</p>
                  <p className="text-xs text-neutral-500">{seasonLabel(slot.season)} · {monthForWeek(slot.week)}</p>
                </div>
                <p className="font-mono text-sm font-bold text-primary">{formatMoney(slot.balance)}</p>
              </div>
              <Button className="w-full" onClick={() => open(slot.slotId)}>Open Save</Button>
            </Card>
          ))
        )}
      </div>
    </AppFrame>
  );
}
