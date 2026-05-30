"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, BadgeCheck, Building2, Palette, Shield, Shirt, UserRound } from "lucide-react";
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
      <div className="relative overflow-hidden border-b border-emerald-950/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_62%,_#1aa24f)] px-4 pb-5 pt-4 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_40%,rgba(255,255,255,0.25)_40%_42%,transparent_42%_58%,rgba(255,255,255,0.14)_58%_60%,transparent_60%)]" />
        <div className="relative flex items-center gap-3">
        <button aria-label="Back" onClick={() => router.push("/")} className="rounded-full bg-white/12 p-2 hover:bg-white/20">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black">Create Your Club</h1>
          <p className="text-xs text-white/70">Foundation League, season 2030/31</p>
        </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Card className="relative overflow-hidden border-emerald-900/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_58%,_#1aa24f)] p-0 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.25)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.14)_58%_60%,transparent_60%)]" />
          <div className="relative flex items-center gap-4 p-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.5rem] border border-white/20 shadow-[0_18px_34px_rgba(0,0,0,0.18)]" style={{ background: `linear-gradient(145deg, ${primaryColor}, #087532)` }}>
              <div className="grid h-16 w-16 place-items-center rounded-[1.1rem]" style={{ background: secondaryColor }}>
                <Shield size={38} color={primaryColor} strokeWidth={2.6} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-white/65">New chairman file</p>
              <h2 className="mt-1 truncate text-2xl font-black">{clubName || "Your Club"}</h2>
              <p className="mt-1 truncate text-sm text-white/75">{stadiumName || "Home stadium"}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-white/55">Foundation League entry</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <p className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10"><span className="text-white/60">Chairman</span><b className="block truncate">{chairmanName || "-"}</b></p>
                <p className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10"><span className="text-white/60">Season</span><b className="block">2030/31</b></p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="grid grid-cols-3 gap-2 p-3 text-xs">
          <div className="rounded-xl bg-emerald-50 px-3 py-3">
            <p className="font-black uppercase text-primary">League</p>
            <b className="mt-1 block text-sm">Level 7</b>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-3">
            <p className="font-black uppercase text-club-blue">Budget</p>
            <b className="mt-1 block text-sm">£950K</b>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-3">
            <p className="font-black uppercase text-amber-700">Cup</p>
            <b className="mt-1 block text-sm">Entry</b>
          </div>
        </Card>

        <Card className="space-y-3">
          <IdentityField icon={<Shield size={18} />} label="Club name" value={clubName} onChange={setClubName} />
          <IdentityField icon={<UserRound size={18} />} label="Chairman" value={chairmanName} onChange={setChairmanName} />
          <IdentityField icon={<Building2 size={18} />} label="Stadium" value={stadiumName} onChange={setStadiumName} />
        </Card>

        <Card className="bg-[linear-gradient(180deg,_#ffffff,_#f9fbf9)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">Kit colors</p>
              <p className="text-xs text-neutral-500">Badge and home kit identity</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-primary"><Palette size={18} /></span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-xl border border-line bg-white p-2 text-xs font-black uppercase text-neutral-500">
              Primary
              <input aria-label="Primary color" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-line bg-white p-1" />
            </label>
            <label className="rounded-xl border border-line bg-white p-2 text-xs font-black uppercase text-neutral-500">
              Secondary
              <input aria-label="Secondary color" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-line bg-white p-1" />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["Home", primaryColor], ["Away", "#222222"], ["Cup", "#f0c419"]].map(([label, color]) => (
              <div key={label} className="rounded-xl border border-line bg-white p-2 shadow-[0_8px_18px_rgba(23,33,27,0.06)]">
                <div className="grid h-16 place-items-center rounded-lg border border-white shadow-[inset_0_0_0_1px_rgba(23,33,27,0.08)]" style={{ background: `linear-gradient(90deg, ${color} 0 68%, ${secondaryColor} 68%)` }}>
                  <Shirt size={22} className="text-white drop-shadow" />
                </div>
                <p className="mt-2 text-center text-[10px] font-black uppercase text-neutral-500">{label}</p>
              </div>
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

function IdentityField({ icon, label, value, onChange }: { icon: ReactNode; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-xl border border-line bg-white p-3 text-sm font-black shadow-[0_8px_18px_rgba(23,33,27,0.04)]">
      <span className="mb-2 flex items-center gap-2 text-neutral-600">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-primary">{icon}</span>
        {label}
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-line bg-surface-muted px-3 py-3 text-base font-black text-foreground outline-none focus:border-primary focus:bg-white" />
    </label>
  );
}
