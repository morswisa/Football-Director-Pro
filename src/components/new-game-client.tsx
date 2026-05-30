"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Shield } from "lucide-react";
import { AppFrame } from "./app-frame";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useGameStore } from "@/store/game-store";

export function NewGameClient() {
  const router = useRouter();
  const create = useGameStore((state) => state.create);
  const [clubName, setClubName] = useState("Sunnyvale FC");
  const [chairmanName, setChairmanName] = useState("Alex Morgan");
  const [stadiumName, setStadiumName] = useState("Greenfield Stadium");
  const [primaryColor, setPrimaryColor] = useState("#159947");
  const [secondaryColor, setSecondaryColor] = useState("#f2f7f1");

  async function submit() {
    await create({ clubName, chairmanName, stadiumName, primaryColor, secondaryColor });
    router.push("/game");
  }

  return (
    <AppFrame>
      <div className="flex items-center gap-3 border-b border-emerald-950/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139)] px-4 py-4 text-white">
        <button aria-label="Back" onClick={() => router.push("/")} className="rounded-full bg-white/12 p-2 hover:bg-white/20">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Create Your Club</h1>
          <p className="text-xs text-white/70">Foundation League, season 2030/31</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Card className="flex items-center gap-3 border-primary/20 bg-[linear-gradient(135deg,_#ecf8ef,_#eef4ff)]">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(180deg,_#1aa24f,_#0f8139)] text-white shadow-[0_12px_22px_rgba(21,153,71,0.2)]">
            <Shield size={30} />
          </div>
          <div>
            <p className="text-sm font-bold">Your club starts here</p>
            <p className="text-xs leading-5 text-neutral-600">Choose the identity you will carry through the career.</p>
          </div>
        </Card>
        <Card className="space-y-3">
          <label className="block text-sm font-semibold">
            Club name
            <input value={clubName} onChange={(event) => setClubName(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-semibold">
            Chairman
            <input value={chairmanName} onChange={(event) => setChairmanName(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-semibold">
            Stadium
            <input value={stadiumName} onChange={(event) => setStadiumName(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none focus:border-primary" />
          </label>
        </Card>
        <Card className="bg-[linear-gradient(180deg,_#ffffff,_#f9fbf9)]">
          <p className="mb-3 text-sm font-semibold">Kit colors</p>
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Primary color" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-12 w-full rounded-lg border border-line bg-white p-1" />
            <input aria-label="Secondary color" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="h-12 w-full rounded-lg border border-line bg-white p-1" />
          </div>
          <div className="mt-4 flex gap-3">
            {[primaryColor, "#222222", "#f0c419"].map((color) => (
              <div key={color} className="h-16 flex-1 rounded-lg border border-white shadow-[inset_0_0_0_1px_rgba(23,33,27,0.08),0_8px_18px_rgba(23,33,27,0.08)]" style={{ background: `linear-gradient(90deg, ${color} 0 68%, ${secondaryColor} 68%)` }} />
            ))}
          </div>
        </Card>
      </div>
      <div className="border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button className="w-full" onClick={submit} disabled={!clubName.trim() || !chairmanName.trim()}>
          <BadgeCheck size={18} /> Continue
        </Button>
      </div>
    </AppFrame>
  );
}
