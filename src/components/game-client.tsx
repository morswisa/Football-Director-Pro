"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, CalendarDays, Dumbbell, Landmark, ListOrdered, Play, Settings, ShieldCheck, Sprout, Trophy, UserCog, UsersRound, Wallet } from "lucide-react";
import { AppFrame } from "./app-frame";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";
import { Card, StatCard } from "./ui/card";
import { calculateSaleImpact, evaluateManager, generateManagerHireOffer, latestFinancialSnapshot, leagueTable, managerActionLocked } from "@/game/engine";
import { calculateManagerCompensation, calculateRecommendedManagerWage, managerRating } from "@/game/economy";
import { cupRoundName, monthForWeek, nextUpgradeCost, seasonLabel } from "@/game/calendar";
import type { ContractTerms, FinancialSnapshot, GameSave, MatchResult, Player, Position, SeasonHistory, TransferBudgetMode } from "@/game/types";
import { cn, formatMoney, ordinal, pct } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";

type Tab = "home" | "standings" | "squad" | "manager" | "finances" | "stadium" | "history" | "settings";
type SquadSort = "position" | "name" | "rating";
type FacilityKind = "youth" | "training";

function useCurrent(save?: GameSave) {
  return useMemo(() => {
    if (!save) return undefined;
    const club = save.clubs[save.userClubId];
    const manager = club.managerId ? save.managers[club.managerId] : undefined;
    const players = club.playerIds.map((id) => save.players[id]).filter(Boolean).sort((a, b) => b.rating - a.rating);
    const table = leagueTable(save);
    const position = table.findIndex((item) => item.id === club.id) + 1;
    const nextFixture = save.fixtures.find((fixture) => (fixture.competition ?? "league") === "league" && fixture.round === save.currentRound && (fixture.homeClubId === club.id || fixture.awayClubId === club.id));
    return { club, manager, players, table, position, nextFixture };
  }, [save]);
}

function cupStatus(save: GameSave) {
  if (save.cup.won) return "Winners";
  if (save.cup.eliminated) {
    const last = save.cup.results.at(-1);
    return last ? `Out ${last.roundName}` : "Out";
  }
  return cupRoundName(save.cup.round);
}

function Header({ save, tab, setTab }: { save: GameSave; tab: Tab; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  return (
    <header className="relative overflow-hidden border-b border-emerald-950/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_56%,_#1aa24f)] px-4 py-4 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.26)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.18)_58%_60%,transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <BrandMark className="h-12 w-12 rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.2)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{current.club.name}</p>
          <p className="text-xs text-white/75">{seasonLabel(save.season)} Season · {monthForWeek(save.week)} · Period {save.week}</p>
        </div>
        <button aria-label="History" onClick={() => setTab(tab === "history" ? "home" : "history")} className="rounded-full bg-white/12 p-2 text-white ring-1 ring-white/15 hover:bg-white/20">
          <Trophy size={20} />
        </button>
        <button aria-label="Settings" onClick={() => setTab(tab === "settings" ? "home" : "settings")} className="rounded-full bg-white/12 p-2 text-white ring-1 ring-white/15 hover:bg-white/20">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}

function positionClass(position: Position | string) {
  if (position === "G" || position === "GK") return "bg-sky-600";
  if (position === "D" || ["RB", "CB", "LB"].includes(position)) return "bg-emerald-700";
  if (position === "M" || position === "CM") return "bg-amber-500";
  return "bg-rose-600";
}

function displayPosition(position: Position | string) {
  if (position === "GK") return "G";
  if (["RB", "CB", "LB"].includes(position)) return "D";
  if (position === "CM") return "M";
  if (["RW", "ST", "LW"].includes(position)) return "F";
  return position;
}

function positionOrder(position: Position | string) {
  const normalized = displayPosition(position);
  if (normalized === "G") return 0;
  if (normalized === "D") return 1;
  if (normalized === "M") return 2;
  return 3;
}

function formatWeeklyWage(value: number) {
  return `${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Math.round(value))}/w`;
}

function uniqueMoneyOptions(base: number, multipliers: number[], nearest = 50) {
  const safeBase = Number.isFinite(base) && base > 0 ? base : nearest * 5;
  const options = Array.from(new Set(multipliers.map((multiplier) => Math.max(nearest, Math.round((safeBase * multiplier) / nearest) * nearest)))).sort((a, b) => a - b);
  if (options.length >= 3) return options;
  const center = Math.max(nearest, Math.round(safeBase / nearest) * nearest);
  return [center, center + nearest, center + nearest * 2, center + nearest * 3, center + nearest * 4];
}

function contractYearOptions(requestedYears: number) {
  return Array.from(new Set([1, 2, 3, 4, 5, requestedYears].filter((years) => years >= 1 && years <= 5))).sort((a, b) => a - b);
}

function formatSignedMoney(value: number) {
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return `-${formatMoney(Math.abs(value))}`;
  return formatMoney(0);
}

function formatSignedPoints(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

function transferBudgetTrustDelta(mode: TransferBudgetMode) {
  if (mode === "max" || mode === "generous") return 4;
  if (mode === "strict") return -5;
  if (mode === "zero") return -8;
  return 0;
}

function ImpactBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950", className)}>
      {children}
    </div>
  );
}

function DebtImpactBox({ balance, debtLimit }: { balance: number; debtLimit: number }) {
  const headroom = balance - debtLimit;
  const overLimit = headroom < 0;
  return (
    <ImpactBox className={overLimit ? "border-red-100 bg-red-50 text-red-950" : undefined}>
      <b className="block">{overLimit ? "Debt-limit risk" : "Debt headroom after cost"}</b>
      <span>Balance after: {formatMoney(balance)}</span>
      <span className="block">Debt limit: {formatMoney(debtLimit)}</span>
      <span className="block">
        {overLimit ? `Over limit by ${formatMoney(Math.abs(headroom))}. Confirming can end the career.` : `Headroom remaining ${formatMoney(headroom)}.`}
      </span>
    </ImpactBox>
  );
}

function avatarSeed(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function avatarPick<T>(seed: number, values: T[], offset = 0) {
  return values[Math.abs(seed + offset * 2654435761) % values.length];
}

function avatarRange(seed: number, min: number, max: number, offset = 0) {
  return min + (Math.abs(seed + offset * 1103515245) % (max - min + 1));
}

function PersonAvatar({ name, seedKey, kind = "player", className }: { name: string; seedKey?: string; kind?: "player" | "manager"; className?: string }) {
  const seed = avatarSeed(seedKey ?? name);
  const skin = avatarPick(seed, ["#f3c7a1", "#d99b6d", "#b97855", "#8f563f", "#f0b98c", "#c9875d"], 1);
  const hair = avatarPick(seed, ["#251b16", "#47301d", "#6b4327", "#111827", "#7a4f2d", "#d6a553", "#5d4037"], 2);
  const shirt = kind === "manager" ? avatarPick(seed, ["#17211b", "#263238", "#374151", "#14532d"], 3) : avatarPick(seed, ["#159947", "#0f766e", "#2563eb", "#dc3d43", "#dba827", "#7c3aed"], 3);
  const bgHue = avatarRange(seed, 100, 180, 4);
  const faceShape = avatarPick(seed, ["round", "long", "square"], 5);
  const hairStyle = avatarPick(seed, ["short", "side", "curly", "buzz", "swept"], 6);
  const mouth = avatarPick(seed, ["M38 61 Q50 68 62 61", "M39 62 Q50 60 61 62", "M39 60 Q50 65 61 60"], 7);
  const eyeY = avatarRange(seed, 42, 45, 8);
  const browTilt = avatarRange(seed, -2, 2, 9);
  const noseX = avatarRange(seed, 49, 51, 10);
  const hasBeard = kind === "manager" || seed % 5 === 0;
  const hasGlasses = seed % 7 === 0 || (kind === "manager" && seed % 3 === 0);
  const facePath = faceShape === "long" ? "M30 42 C30 24 70 24 70 42 L67 61 C64 76 36 76 33 61 Z" : faceShape === "square" ? "M29 41 C29 25 71 25 71 41 L68 65 C63 76 37 76 32 65 Z" : "M28 43 C28 25 72 25 72 43 C72 65 63 77 50 77 C37 77 28 65 28 43 Z";
  const hairPath = hairStyle === "short" ? "M28 42 C29 20 71 20 72 42 C63 34 41 35 28 42 Z" : hairStyle === "side" ? "M27 42 C28 23 66 18 73 39 C58 32 47 34 29 45 Z" : hairStyle === "curly" ? "M27 41 C27 25 34 22 39 24 C43 18 53 18 57 24 C64 20 72 27 72 42 C59 35 42 35 27 41 Z" : hairStyle === "buzz" ? "M30 38 C33 24 67 24 70 38 C57 32 43 32 30 38 Z" : "M27 43 C31 21 70 19 74 40 C57 28 45 31 27 43 Z";
  return (
    <div
      className={cn("shrink-0 overflow-hidden rounded-lg border border-white/70 bg-white shadow-card", className)}
      aria-label={`${name} portrait`}
    >
      <svg viewBox="0 0 100 100" role="img" className="h-full w-full">
        <defs>
          <linearGradient id={`avatar-bg-${seed}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${bgHue} 54% 38%)`} />
            <stop offset="100%" stopColor={`hsl(${(bgHue + 42) % 360} 58% 56%)`} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#avatar-bg-${seed})`} />
        <circle cx="16" cy="18" r="18" fill="rgba(255,255,255,0.16)" />
        <path d="M18 100 C22 82 78 82 82 100 Z" fill={shirt} />
        {kind === "manager" ? <path d="M34 84 L50 96 L66 84 L60 100 L40 100 Z" fill="#f8fafc" opacity="0.95" /> : null}
        <path d={facePath} fill={skin} />
        {hasBeard ? <path d="M33 58 C39 75 61 75 67 58 C65 76 36 80 33 58 Z" fill={hair} opacity="0.38" /> : null}
        <path d={hairPath} fill={hair} />
        <path d={`M35 ${eyeY - 6 + browTilt} Q41 ${eyeY - 9} 46 ${eyeY - 6}`} stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d={`M54 ${eyeY - 6 - browTilt} Q60 ${eyeY - 9} 65 ${eyeY - 6}`} stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="40" cy={eyeY} r="3" fill="#17211b" />
        <circle cx="60" cy={eyeY} r="3" fill="#17211b" />
        {hasGlasses ? (
          <>
            <circle cx="40" cy={eyeY} r="8" fill="none" stroke="#17211b" strokeWidth="2" />
            <circle cx="60" cy={eyeY} r="8" fill="none" stroke="#17211b" strokeWidth="2" />
            <path d={`M48 ${eyeY} L52 ${eyeY}`} stroke="#17211b" strokeWidth="2" />
          </>
        ) : null}
        <path d={`M${noseX} 46 Q47 54 51 57`} stroke="#7c3f2b" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.42" />
        <path d={mouth} stroke="#6b2f25" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M31 47 C27 47 27 57 33 58" stroke={skin} strokeWidth="5" strokeLinecap="round" />
        <path d="M69 47 C73 47 73 57 67 58" stroke={skin} strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function PageBack({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <button
      type="button"
      aria-label="Back to Dashboard"
      onClick={() => setTab("home")}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line/90 bg-white px-3 py-2 text-xs font-black uppercase text-neutral-600 shadow-[0_8px_18px_rgba(23,33,27,0.05)] transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <ArrowLeft size={15} />
      Dashboard
    </button>
  );
}

function HomeTab({ save, continueGame, openFacility, setTab }: { save: GameSave; continueGame: () => void; openFacility: (facility: FacilityKind) => void; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const nextOpponent = current.nextFixture ? save.clubs[current.nextFixture.homeClubId === current.club.id ? current.nextFixture.awayClubId : current.nextFixture.homeClubId] : undefined;
  const squadRating = Math.round(current.players.slice(0, 11).reduce((sum, player) => sum + player.rating, 0) / Math.max(1, current.players.slice(0, 11).length));
  const currentManagerRating = current.manager ? managerRating(current.manager) : 0;
  const latestFinance = latestFinancialSnapshot(save);
  const divisionName = save.divisions.find((division) => division.id === current.club.divisionId)?.name;
  const lastTen = save.fixtures
    .filter((fixture) => fixture.result && (fixture.homeClubId === current.club.id || fixture.awayClubId === current.club.id))
    .slice(-10)
    .map((fixture) => {
      const result = fixture.result!;
      const userHome = fixture.homeClubId === current.club.id;
      const goalsFor = userHome ? result.homeGoals : result.awayGoals;
      const goalsAgainst = userHome ? result.awayGoals : result.homeGoals;
      return goalsFor > goalsAgainst ? "W" : goalsFor === goalsAgainst ? "D" : "L";
    });
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-emerald-900/10 bg-[linear-gradient(135deg,_#ffffff_0%,_#f5fbf6_52%,_#edf4ff_100%)] p-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,_#159947,_#2563eb,_#dba827)]" />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-primary">Chairman&apos;s desk</p>
              <h2 className="mt-1 text-2xl font-black">{current.position ? ordinal(current.position) : "-"}</h2>
              <p className="mt-0.5 truncate text-sm font-bold text-neutral-700">{divisionName}</p>
              <p className="mt-1 text-xs text-neutral-500">Board {current.club.boardConfidence}% · Trust {current.club.managerTrust}% · Cup {cupStatus(save)}</p>
            </div>
            <div className="rounded-xl bg-club-navy px-3 py-2 text-right text-white shadow-[0_12px_24px_rgba(16,36,27,0.18)]">
              <p className="text-[10px] font-bold uppercase text-white/65">Balance</p>
              <p data-testid="dashboard-balance" className="text-lg font-black">{formatMoney(current.club.finances.balance)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-emerald-950/5">
              <span className="text-neutral-500">Roster</span>
              <b className="block text-base">{squadRating || "-"}</b>
            </div>
            <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-emerald-950/5">
              <span className="text-neutral-500">Manager</span>
              <b className="block text-base">{currentManagerRating || "-"}</b>
            </div>
            <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-emerald-950/5">
              <span className="text-neutral-500">Latest</span>
              <b data-testid="dashboard-latest-report" className={cn("block text-base", latestFinance.profit >= 0 ? "text-primary" : "text-danger")}>{formatMoney(latestFinance.profit)}</b>
            </div>
          </div>
        </div>
      </Card>
      <Card className="space-y-3 border-emerald-100 bg-[linear-gradient(180deg,_#ffffff,_#f6fbf7)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Next match</p>
            <p className="text-lg font-bold">{nextOpponent ? `${nextOpponent.name}` : "Season complete"}</p>
            <p className="text-sm text-neutral-500">{current.nextFixture?.homeClubId === current.club.id ? "Home" : "Away"}</p>
          </div>
          <CalendarDays className="text-primary" />
        </div>
        <Button className="w-full" onClick={() => {
          if (!save.currentEvent && !current.manager) {
            setTab("manager");
            return;
          }
          continueGame();
        }} disabled={Boolean(save.gameOver)}>
          {save.currentEvent ? "Open Decision" : !current.manager ? "Hire Manager" : "Continue"}
        </Button>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric icon={<ListOrdered size={15} />} label="League" value={current.position ? ordinal(current.position) : "-"} onClick={() => setTab("standings")} accent="emerald" />
        <MiniMetric icon={<UsersRound size={15} />} label="Roster" value={squadRating || "-"} onClick={() => setTab("squad")} accent="blue" />
        <MiniMetric icon={<UserCog size={15} />} label="Manager" value={currentManagerRating || "-"} onClick={() => setTab("manager")} accent="emerald" />
        <MiniMetric icon={<Dumbbell size={15} />} label="Training" value={current.club.trainingLevel} onClick={() => openFacility("training")} accent="amber" />
        <MiniMetric icon={<Sprout size={15} />} label="Youth" value={current.club.youthLevel} onClick={() => openFacility("youth")} accent="emerald" />
        <MiniMetric icon={<Wallet size={15} />} label="Finances" value={formatMoney(current.club.finances.balance)} onClick={() => setTab("finances")} accent="blue" />
        <MiniMetric icon={<ShieldCheck size={15} />} label="Board" value={`${current.club.boardConfidence}%`} accent="amber" />
        <MiniMetric icon={<Landmark size={15} />} label="Stadium" value={current.club.stadium.condition} onClick={() => setTab("stadium")} accent="emerald" />
        <MiniMetric icon={<Trophy size={15} />} label="Record" value={`${current.club.record.won}-${current.club.record.drawn}-${current.club.record.lost}`} onClick={() => setTab("history")} accent="blue" />
        <MiniMetric icon={<Award size={15} />} label="Cup" value={cupStatus(save)} onClick={() => setTab("history")} accent="amber" />
      </div>
      <Card className="flex items-center justify-between gap-2 p-3">
        <span className="shrink-0 whitespace-nowrap text-xs font-bold uppercase text-neutral-500">Last 10</span>
        <div className="grid min-w-0 flex-1 grid-cols-10 gap-1">
          {(lastTen.length ? lastTen : ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]).map((result, index) => (
            <span key={`${result}_${index}`} className={cn("grid h-6 min-w-0 place-items-center rounded-md text-[10px] font-black text-white", result === "W" ? "bg-primary" : result === "D" ? "bg-warning" : result === "L" ? "bg-danger" : "bg-neutral-300")}>{result}</span>
          ))}
        </div>
      </Card>
      {save.lastMatch?.result ? (
        <Card>
          <p className="text-xs font-semibold uppercase text-neutral-500">Last result</p>
          <p className="mt-1 text-xl font-bold">
            {save.clubs[save.lastMatch.homeClubId].name} {save.lastMatch.result.homeGoals} - {save.lastMatch.result.awayGoals} {save.clubs[save.lastMatch.awayClubId].name}
          </p>
          <div className="mt-3 space-y-2">
            {save.lastMatch.result.events.length === 0 ? (
              <div className="rounded-md bg-surface-muted px-3 py-2 text-sm text-neutral-600">No major match events recorded.</div>
            ) : save.lastMatch.result.events.slice(0, 5).map((event, index) => (
              <div key={`${event.minute}_${index}`} className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm">
                <PersonAvatar name={event.playerName} className="h-8 w-8 rounded-md text-[10px]" />
                <p>{event.minute}&apos; {event.description}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {save.gameOver ? <Card className="border-danger text-danger">{save.gameOver}</Card> : null}
    </div>
  );
}

function MiniMetric({ icon, label, value, onClick, accent = "emerald" }: { icon?: ReactNode; label: string; value: string | number; onClick?: () => void; accent?: "emerald" | "blue" | "amber" }) {
  const accentClass = accent === "blue" ? "text-club-blue bg-blue-50" : accent === "amber" ? "text-amber-700 bg-amber-50" : "text-primary bg-emerald-50";
  return (
    <button onClick={onClick} className={cn("min-h-[70px] rounded-lg border border-line/90 bg-[linear-gradient(180deg,_#ffffff,_#f9fbf9)] px-2 py-3 text-left shadow-[0_8px_18px_rgba(23,33,27,0.05)]", onClick && "transition hover:-translate-y-0.5 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary")}>
      <span className={cn("mb-2 grid h-6 w-6 place-items-center rounded-md", accentClass)}>{icon}</span>
      <p className="truncate text-[10px] font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </button>
  );
}

function StandingsTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Standings</p>
            <h2 className="text-lg font-bold">{save.divisions.find((division) => division.id === current.club.divisionId)?.name}</h2>
          </div>
          <ListOrdered className="text-primary" />
        </div>
      </Card>
      <Card className="space-y-2 p-2">
        {current.table.map((club, index) => {
          const goalDifference = club.record.gf - club.record.ga;
          const isUser = club.id === current.club.id;
          return (
            <div
              key={club.id}
              className={cn(
                "grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm",
                isUser ? "border-emerald-200 bg-emerald-50 font-bold text-primary shadow-[0_8px_18px_rgba(21,153,71,0.08)]" : "bg-white",
              )}
            >
              <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-surface-muted font-black", isUser && "bg-primary text-white")}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-black">{club.name}</p>
                <p className={cn("mt-1 text-xs text-neutral-500", isUser && "text-primary/75")}>
                  P {club.record.played} · W-D-L {club.record.won}-{club.record.drawn}-{club.record.lost} · GD {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
                </p>
              </div>
              <div className={cn("min-w-12 rounded-lg bg-surface-muted px-2 py-1 text-right", isUser && "bg-white text-primary")}>
                <span className="block text-[10px] font-black uppercase text-neutral-500">Pts</span>
                <span className="text-base font-black">{club.record.points}</span>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function SquadTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const [sort, setSort] = useState<SquadSort>("position");
  const players = useMemo(() => {
    return [...current.players].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating || positionOrder(a.position) - positionOrder(b.position) || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name) || positionOrder(a.position) - positionOrder(b.position) || b.rating - a.rating;
      return positionOrder(a.position) - positionOrder(b.position) || b.rating - a.rating || a.name.localeCompare(b.name);
    });
  }, [current.players, sort]);
  const averageRating = Math.round(players.reduce((sum, player) => sum + player.rating, 0) / Math.max(1, players.length));
  return (
    <div className="space-y-3">
      <PageBack setTab={setTab} />
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-neutral-500">Roster</p>
          <h2 className="text-lg font-bold">{players.length} players</h2>
        </div>
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-bold">Avg {averageRating}</p>
      </Card>
      <div className="sticky top-0 z-10 grid grid-cols-[48px_1fr_56px] gap-2 bg-background pb-2 text-center text-xs font-semibold text-neutral-500">
        <button onClick={() => setSort("position")} className={cn("rounded-md px-2 py-1 text-xs font-bold", sort === "position" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Pos</button>
        <button onClick={() => setSort("name")} className={cn("rounded-md px-2 py-1 text-left text-xs font-bold", sort === "name" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Player</button>
        <button onClick={() => setSort("rating")} className={cn("rounded-md px-2 py-1 text-xs font-bold", sort === "rating" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Rate</button>
      </div>
      {players.map((player) => (
        <Card key={player.id} className="grid grid-cols-[48px_1fr_48px] items-center gap-3 p-3">
          <span className={cn("grid h-9 w-9 place-items-center rounded-md text-center text-xs font-black text-white", positionClass(player.position))}>{displayPosition(player.position)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PersonAvatar name={player.name} seedKey={player.id} className="h-9 w-9 shrink-0 rounded-md text-[10px]" />
              <p className="truncate text-sm font-bold">{player.name}</p>
            </div>
            <p className="truncate text-xs text-neutral-500">
              Age {player.age} · {player.loan ? `Loan ${player.loan.direction === "in" ? "in" : "out"} · ${formatWeeklyWage(player.loan.wageShare)}` : `${player.contractYears}y · ${formatWeeklyWage(player.wage)}`}
            </p>
            <p className="truncate text-xs text-neutral-500">Morale {player.morale}% · Form {player.form}% · Fit {player.fitness}%</p>
          </div>
          <span className={cn("justify-self-end rounded-md px-2 py-1 text-xs font-bold text-white", player.rating >= 70 ? "bg-primary" : player.rating >= 55 ? "bg-warning" : "bg-neutral-500")}>{player.rating}</span>
        </Card>
      ))}
    </div>
  );
}

function ManagerTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const hire = useGameStore((state) => state.hire);
  const fire = useGameStore((state) => state.fire);
  const [fireOpen, setFireOpen] = useState(false);
  const [hireId, setHireId] = useState<string>();
  const locked = managerActionLocked(save);
  const canNegotiate = !locked || !current.club.managerId;
  const lockMessage = locked
    ? current.club.managerId
      ? `Manager changes are locked until period ${save.managerActionLockUntilWeek}.`
      : `Emergency replacement is available. Further changes are locked until period ${save.managerActionLockUntilWeek}.`
    : undefined;
  const divisionLevel = save.divisions.find((division) => division.id === current.club.divisionId)?.level ?? 7;
  const fireCost = current.manager ? calculateManagerCompensation(current.manager) : 0;
  const balanceAfterFire = current.club.finances.balance - fireCost;
  const hireOffer = hireId ? generateManagerHireOffer(save, hireId) : undefined;
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      {current.manager ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <PersonAvatar name={current.manager.name} seedKey={current.manager.id} kind="manager" className="h-20 w-20 text-xl" />
            <div>
              <h2 className="text-lg font-bold">{current.manager.name}</h2>
              <p className="text-sm text-neutral-500">{current.manager.style} · {current.manager.personality}</p>
              <p className="text-sm text-neutral-500">{formatWeeklyWage(current.manager.wage)} · {current.manager.contractYears} years left</p>
            </div>
          </div>
          {[
            ["Training", current.manager.training],
            ["Tactics", current.manager.tactics],
            ["Transfers", current.manager.transferTaste],
            ["Youth", current.manager.youthPreference],
            ["Reputation", current.manager.reputation],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-32 text-sm text-neutral-600">{label}</span>
              <div className="h-2 flex-1 rounded-full bg-surface-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-bold">{value}</span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="rounded-lg bg-surface-muted px-3 py-2">Rating <b className="block">{managerRating(current.manager)}</b></p>
            <p className="rounded-lg bg-surface-muted px-3 py-2">Fire cost <b className="block">{formatMoney(fireCost)}</b></p>
          </div>
          <p className="rounded-md bg-surface-muted px-3 py-2 text-sm">{evaluateManager(save)}</p>
          {lockMessage ? <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-neutral-500">{lockMessage}</p> : null}
          <Button variant="danger" className="w-full" disabled={locked} onClick={() => setFireOpen(true)}>Fire Manager</Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <p className="font-bold">No manager appointed</p>
          <p className="text-sm text-neutral-500">Hire a manager to run the squad and propose transfers.</p>
          {lockMessage ? <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-neutral-500">{lockMessage}</p> : null}
        </Card>
      )}
      <div className="space-y-3">
        <h3 className="text-sm font-bold">Available Managers</h3>
        {save.managerCandidates.map((manager) => (
          <Card key={manager.id} className="space-y-3 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={manager.name} seedKey={manager.id} kind="manager" className="h-12 w-12 shrink-0 text-sm" />
                <div className="min-w-0">
                <p className="font-bold">{manager.name}</p>
                <p className="text-xs text-neutral-500">{manager.style} · {manager.personality}</p>
                <p className="text-xs text-neutral-500">{manager.status === "contracted" ? "Under Contract" : "Free Agent"} · Expected {formatWeeklyWage(calculateRecommendedManagerWage(manager, divisionLevel))}</p>
                </div>
              </div>
              <p className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">{managerRating(manager)}</p>
            </div>
            {manager.status === "contracted" ? <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Club compensation: <b>{formatMoney(manager.compensationFee ?? calculateManagerCompensation(manager))}</b></p> : null}
            <Button className="w-full" disabled={!canNegotiate} onClick={() => setHireId(manager.id)}>Negotiate</Button>
          </Card>
        ))}
      </div>
      {fireOpen && current.manager ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-emerald-950/55 p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="fire-manager-title" className="w-full rounded-xl bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase text-danger">Confirm dismissal</p>
            <h2 id="fire-manager-title" className="mt-1 text-xl font-bold">{current.manager.name}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between rounded-lg bg-surface-muted px-3 py-2"><span>Weekly wage</span><b>{formatMoney(current.manager.wage)}</b></p>
              <p className="flex justify-between rounded-lg bg-surface-muted px-3 py-2"><span>Contract left</span><b>{current.manager.contractYears * 12} months</b></p>
              <p className="flex justify-between rounded-lg bg-surface-muted px-3 py-2"><span>Compensation</span><b className="text-danger">{formatMoney(fireCost)}</b></p>
              <p className="flex justify-between rounded-lg bg-surface-muted px-3 py-2"><span>Balance after</span><b>{formatMoney(balanceAfterFire)}</b></p>
            </div>
            <div className="mt-3">
              <DebtImpactBox balance={balanceAfterFire} debtLimit={current.club.finances.debtLimit} />
            </div>
            <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
              <Button variant="danger" onClick={async () => { await fire(); setFireOpen(false); }}>Confirm</Button>
              <Button variant="secondary" onClick={() => setFireOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      ) : null}
      {hireOffer ? (
        <ManagerHireModal save={save} managerId={hireOffer.candidate.id} close={() => setHireId(undefined)} submit={async (terms) => { await hire(hireOffer.candidate.id, terms); setHireId(undefined); }} />
      ) : null}
    </div>
  );
}

function ManagerHireModal({ save, managerId, close, submit }: { save: GameSave; managerId: string; close: () => void; submit: (terms: ContractTerms) => Promise<void> }) {
  const offer = generateManagerHireOffer(save, managerId);
  const current = useCurrent(save)!;
  const [wage, setWage] = useState(offer?.expectedWage ?? 1_000);
  const [years, setYears] = useState(2);
  if (!offer) return null;
  const candidate = offer.candidate;
  const wageOptions = uniqueMoneyOptions(offer.expectedWage, [0.8, 0.9, 1, 1.1, 1.2], 50);
  const yearOptions = [1, 2, 3, 4, 5];
  const immediateCost = offer.outgoingCompensation + offer.candidateCompensation;
  const balanceAfterCost = current.club.finances.balance - immediateCost;
  const wageBillAfterHire = current.club.finances.weeklyWages - (current.manager?.wage ?? 0) + wage;
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-emerald-950/55 p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="hire-manager-title" className="max-h-full w-full overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-semibold uppercase text-primary">Manager negotiation</p>
        <div className="mt-2 flex items-center gap-3">
          <PersonAvatar name={candidate.name} seedKey={candidate.id} kind="manager" className="h-16 w-16 text-base" />
          <div>
            <h2 id="hire-manager-title" className="text-xl font-black">{candidate.name}</h2>
            <p className="text-xs text-neutral-500">{candidate.status === "contracted" ? "Under Contract" : "Free Agent"} · Rating {managerRating(candidate)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-lg bg-surface-muted px-3 py-2">Expected wage <b className="block">{formatWeeklyWage(offer.expectedWage)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Immediate cost <b className="block">{formatMoney(immediateCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">New club fee <b className="block">{formatMoney(offer.candidateCompensation)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Current manager payoff <b className="block">{formatMoney(offer.outgoingCompensation)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Balance after cost <b className="block">{formatMoney(balanceAfterCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">New wage bill <b className="block">{formatMoney(wageBillAfterHire)}/w</b></p>
        </div>
        <div className="mt-3">
          <DebtImpactBox balance={balanceAfterCost} debtLimit={current.club.finances.debtLimit} />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage</p>
          <div className="grid grid-cols-5 gap-2">
            {wageOptions.map((option) => (
              <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
          <div className="grid grid-cols-5 gap-2">
            {yearOptions.map((option) => (
              <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{option}y</button>
            ))}
          </div>
        </div>
        <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
          <Button onClick={() => submit({ wage, years, compensationFee: offer.candidateCompensation })}>Submit Offer</Button>
          <Button variant="secondary" onClick={close}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function FinancesTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const finance = current.club.finances;
  const latestFinance = latestFinancialSnapshot(save);
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <StatCard label="Balance" value={formatMoney(finance.balance)} detail={`Debt limit ${formatMoney(finance.debtLimit)}`} />
      <Card>
        <div className="grid grid-cols-[110px_1fr] gap-y-3 text-sm">
          <span className="text-neutral-500">Report period</span><b data-testid="finance-summary-period">{latestFinance.month} · Period {latestFinance.week}</b>
          <span className="text-neutral-500">Report income</span><b data-testid="finance-summary-income" className="text-primary">{formatMoney(latestFinance.totalIncome)}</b>
          <span className="text-neutral-500">Report expenses</span><b data-testid="finance-summary-expenses" className="text-danger">{formatMoney(latestFinance.totalExpenses)}</b>
          <span className="text-neutral-500">Report result</span><b data-testid="finance-summary-result" className={latestFinance.profit >= 0 ? "text-primary" : "text-danger"}>{formatMoney(latestFinance.profit)}</b>
          <span className="text-neutral-500">Opening balance</span><b data-testid="finance-summary-opening">{formatMoney(latestFinance.balanceBefore)}</b>
          <span className="text-neutral-500">Closing balance</span><b data-testid="finance-summary-closing">{formatMoney(latestFinance.balanceAfter)}</b>
          <span className="text-neutral-500">Weekly wages</span><b>{formatMoney(finance.weeklyWages)}</b>
          <span className="text-neutral-500">Annual sponsorship</span><b>{formatMoney(finance.sponsorship)}</b>
          <span className="text-neutral-500">Board confidence</span><b>{pct(current.club.boardConfidence)}</b>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Latest report breakdown</h3>
        <FinancialRows snapshot={latestFinance} testIdPrefix="finance-breakdown" />
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Recent transactions</h3>
        {finance.transactions.length === 0 ? <p className="text-sm text-neutral-500">No transactions yet.</p> : finance.transactions.map((tx) => (
          <div key={tx.id} className="flex justify-between border-t border-line py-2 text-sm first:border-t-0">
            <span>{tx.label}</span>
            <b className={tx.amount >= 0 ? "text-primary" : "text-danger"}>{formatMoney(tx.amount)}</b>
          </div>
        ))}
      </Card>
    </div>
  );
}

function StadiumTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const upgrade = useGameStore((state) => state.upgradeStand);
  const repair = useGameStore((state) => state.repair);
  const repairCost = Math.round((100 - current.club.stadium.condition) * 4_500);
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card>
        <h2 className="text-lg font-bold">{current.club.stadium.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p className="rounded-md bg-surface-muted px-3 py-2">Capacity <b data-testid="stadium-capacity">{current.club.stadium.capacity.toLocaleString()}</b></p>
          <p className="rounded-md bg-surface-muted px-3 py-2">Condition <b data-testid="stadium-condition">{pct(current.club.stadium.condition)}</b></p>
        </div>
        <div className="mt-4 aspect-[16/9] rounded-lg bg-[linear-gradient(140deg,_#1b6e37,_#58b76f_45%,_#e8efe9_46%,_#18542f)] p-4">
          <div className="h-full rounded border-4 border-white/70 bg-emerald-700/80" />
        </div>
      </Card>
      {current.club.stadium.stands.map((stand) => (
        <Card key={stand.id} className="flex items-center justify-between gap-3 p-3">
          <div>
            <p className="font-bold">{stand.name}</p>
            <p className="text-xs text-neutral-500">Level {stand.level} · {stand.capacity.toLocaleString()} seats</p>
            <p className="text-xs text-neutral-500">Upgrade: {formatMoney(stand.level * 180_000)} · +850 seats</p>
          </div>
          <Button onClick={() => upgrade(stand.id)}>Upgrade</Button>
        </Card>
      ))}
      <Card className="space-y-3 p-3">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-neutral-500">Repair to 100%</span>
          <b>{formatMoney(repairCost)}</b>
        </div>
        <Button variant="secondary" className="w-full" onClick={repair} disabled={repairCost <= 0}>Repair Stadium</Button>
      </Card>
    </div>
  );
}

function HistoryTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const goalDifference = current.club.record.gf - current.club.record.ga;
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card>
        <h2 className="text-lg font-bold">Current Season</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <p className="rounded-lg bg-surface-muted px-3 py-2">Position <b className="block">{current.position ? ordinal(current.position) : "-"}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Played <b className="block">{current.club.record.played}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Record <b className="block">{current.club.record.won}-{current.club.record.drawn}-{current.club.record.lost}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">GD / Pts <b className="block">{goalDifference > 0 ? `+${goalDifference}` : goalDifference} / {current.club.record.points}</b></p>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Trophy Cabinet</h2>
        {save.history.flatMap((item) => item.trophies).length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No trophies or promotions recorded.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {save.history.flatMap((item) => item.trophies.map((trophy) => `${item.season}: ${trophy}`)).map((label) => (
              <span key={label} className="rounded-md bg-primary px-2 py-1 text-xs font-black text-white">{label}</span>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-bold">{save.cup.name}</h2>
        <p className="mt-1 text-sm text-neutral-500">{cupStatus(save)}</p>
        <div className="mt-3 space-y-2">
          {save.cup.results.length === 0 ? <p className="text-sm text-neutral-500">The first cup tie has not been played yet.</p> : save.cup.results.map((result) => (
            <div key={`${result.season}_${result.round}`} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <b>{result.roundName}</b>
                <b className={result.won ? "text-primary" : "text-danger"}>{result.won ? "Won" : "Lost"}</b>
              </div>
              <p className="text-xs text-neutral-500">vs {result.opponentName} · {result.goalsFor}-{result.goalsAgainst} · Prize {formatMoney(result.prize)}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Season History</h3>
        {save.history.length === 0 ? <p className="text-sm text-neutral-500">Finish a season to create history.</p> : save.history.map((item) => (
          <div key={item.season} className="border-t border-line py-3 text-sm first:border-t-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <b>{item.season}/{String(item.season + 1).slice(2)}</b>
                <p className="text-xs text-neutral-500">{item.divisionName}</p>
              </div>
              <span className={cn("rounded-md px-2 py-1 text-[10px] font-black uppercase", item.outcome === "promoted" ? "bg-primary text-white" : item.outcome === "relegated" ? "bg-red-100 text-danger" : "bg-surface-muted text-neutral-600")}>{item.outcome ?? "stayed"}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-md bg-surface-muted px-2 py-1">Finish <b className="block">{ordinal(item.position)}</b></p>
              <p className="rounded-md bg-surface-muted px-2 py-1">Record <b className="block">{item.won ?? 0}-{item.drawn ?? 0}-{item.lost ?? 0}</b></p>
              <p className="rounded-md bg-surface-muted px-2 py-1">Award <b className="block">{formatMoney(item.prizeMoney ?? 0)}</b></p>
              <p className="rounded-md bg-surface-muted px-2 py-1">Balance <b className="block">{formatMoney(item.balance)}</b></p>
            </div>
            <p className="mt-2 text-xs text-neutral-500">Next: {item.nextDivisionName ?? item.divisionName} · {item.cupSummary ?? "No cup record"}</p>
            {item.seasonImpact ? (
              <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-950">
                Season impact: Board {formatSignedPoints(item.seasonImpact.boardConfidenceAfter - item.seasonImpact.boardConfidenceBefore)} pts · Trust {formatSignedPoints(item.seasonImpact.managerTrustAfter - item.seasonImpact.managerTrustBefore)} pts · Reputation {formatSignedPoints(item.seasonImpact.reputationAfter - item.seasonImpact.reputationBefore)} pts
              </p>
            ) : null}
          </div>
        ))}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Hall of Fame</h3>
        {save.hallOfFame.length === 0 ? <p className="text-sm text-neutral-500">Club legends will appear after long service.</p> : save.hallOfFame.map((name) => <p key={name} className="py-1 text-sm">{name}</p>)}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Achievements</h3>
        <div className="space-y-2">
          {save.achievements.map((achievement) => (
            <div key={achievement.id} data-testid={`achievement-${achievement.id}`} className="flex items-center gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm">
              <Award size={16} className={achievement.unlockedAt ? "text-primary" : "text-neutral-400"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{achievement.title}</p>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-black", achievement.unlockedAt ? "bg-primary text-white" : "bg-white text-neutral-500")}>{achievement.unlockedAt ? "Unlocked" : "Locked"}</span>
                </div>
                <p className="text-xs text-neutral-500">{achievement.description}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white">
                  <div data-testid={`achievement-progress-${achievement.id}`} className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (achievement.progress / Math.max(1, achievement.target)) * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const persist = useGameStore((state) => state.persist);
  const importFromJson = useGameStore((state) => state.importFromJson);
  const resetCareer = useGameStore((state) => state.resetCareer);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const exportedSave = useMemo(() => JSON.stringify(save, null, 2), [save]);
  const copyExport = async () => {
    await navigator.clipboard?.writeText(exportedSave);
    setImportStatus("Save JSON copied.");
  };
  const downloadExport = () => {
    const blob = new Blob([exportedSave], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${save.clubs[save.userClubId].name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${save.season}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setImportStatus("Save file downloaded.");
  };
  const submitImport = async () => {
    const ok = await importFromJson(importText);
    setImportStatus(ok ? "Imported into Slot 1." : "Import failed. Paste a valid Football Director Pro save.");
    if (ok) setImportText("");
  };
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="mt-1 text-sm text-neutral-500">Local/offline career save.</p>
        <Button className="mt-4 w-full" onClick={persist}>Manual Save</Button>
      </Card>
      <Card>
        <h3 className="text-sm font-bold">Accessibility</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant={save.settings.textSize === "normal" ? "primary" : "secondary"} onClick={() => updateSettings({ textSize: "normal" })}>Normal Text</Button>
          <Button variant={save.settings.textSize === "large" ? "primary" : "secondary"} onClick={() => updateSettings({ textSize: "large" })}>Large Text</Button>
        </div>
        <Button variant={save.settings.sound ? "primary" : "secondary"} className="mt-3 w-full" onClick={() => updateSettings({ sound: !save.settings.sound })}>
          Sound {save.settings.sound ? "On" : "Off"}
        </Button>
      </Card>
      <Card>
        <h3 className="text-sm font-bold">Export Save</h3>
        <p className="mt-1 text-xs text-neutral-500">Use this to back up or share the current local career.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={copyExport}>Copy JSON</Button>
          <Button variant="secondary" onClick={downloadExport}>Download</Button>
        </div>
        <textarea readOnly value={exportedSave} className="mt-3 h-40 w-full resize-none rounded-lg border border-line bg-surface-muted p-3 font-mono text-[10px]" />
      </Card>
      <Card>
        <h3 className="text-sm font-bold">Import Save</h3>
        <p className="mt-1 text-xs text-neutral-500">Pastes over Slot 1 after validation. Invalid saves are rejected.</p>
        <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste exported save JSON here" className="mt-3 h-32 w-full resize-none rounded-lg border border-line bg-white p-3 font-mono text-[10px] outline-none focus:border-primary" />
        <Button className="mt-3 w-full" onClick={submitImport} disabled={!importText.trim()}>Import Into Slot 1</Button>
      </Card>
      <Card>
        <h3 className="text-sm font-bold text-danger">Reset Career</h3>
        <p className="mt-1 text-xs text-neutral-500">Deletes the local Slot 1 save from this browser.</p>
        {confirmReset ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button onClick={resetCareer}>Confirm Reset</Button>
          </div>
        ) : (
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setConfirmReset(true)}>Reset Local Career</Button>
        )}
      </Card>
      {importStatus ? <p className="rounded-lg bg-emerald-950 px-3 py-2 text-center text-xs font-semibold text-white">{importStatus}</p> : null}
    </div>
  );
}

function ContractOfferControls({ player, requestedWage, requestedYears, currentWageBill, approve, reject }: { player: Player; requestedWage: number; requestedYears: number; currentWageBill: number; approve: (terms: ContractTerms) => void; reject: () => void }) {
  const wageOptions = uniqueMoneyOptions(requestedWage, [0.85, 0.95, 1, 1.1, 1.2], 50);
  const yearOptions = contractYearOptions(requestedYears);
  const [wage, setWage] = useState(requestedWage);
  const [years, setYears] = useState(requestedYears);
  const likelyAccepted = wage >= requestedWage * 0.95 && years >= Math.max(1, requestedYears - 1);
  const wageBillDelta = wage - player.wage;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage offer</p>
        <div className="grid grid-cols-3 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", wage === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>
              {formatWeeklyWage(option)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-5 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>
              {option}y
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">
        {player.name} wants {formatWeeklyWage(requestedWage)} for {requestedYears} years.
      </p>
      <ImpactBox>
        <b className="block">Selected offer impact</b>
        <span>Likely response: {likelyAccepted ? "accept" : "reject"}.</span>
        <span className="block">Weekly wage bill: {formatSignedMoney(wageBillDelta)}/w, from {formatMoney(currentWageBill)}/w to {formatMoney(currentWageBill + wageBillDelta)}/w.</span>
        <span className="block">{likelyAccepted ? "Manager trust +3; player morale improves." : "Manager trust -3; player morale -8 if the offer is turned down."}</span>
      </ImpactBox>
      <div className="grid grid-cols-2 gap-3 border-t border-line bg-white pt-3">
        <Button onClick={() => approve({ wage, years })}>Submit Offer</Button>
        <Button variant="secondary" onClick={reject}>Reject</Button>
      </div>
    </div>
  );
}

function DecisionModal({ save, setTab, suppressed = false }: { save: GameSave; setTab: (tab: Tab) => void; suppressed?: boolean }) {
  const current = useCurrent(save)!;

  if (suppressed) return null;

  if (save.gameOver) {
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
        <div role="dialog" aria-modal="true" aria-labelledby="game-over-title" className="w-full rounded-xl bg-white p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase text-danger">Career stopped</p>
          <h2 id="game-over-title" className="mt-1 text-xl font-bold">Board Decision</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{save.gameOver}</p>
        </div>
      </div>
    );
  }

  if (!current.manager) {
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
        <div role="dialog" aria-modal="true" aria-labelledby="manager-decision-title" className="max-h-full w-full overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase text-primary">Decision required</p>
          <h2 id="manager-decision-title" className="mt-1 text-xl font-bold">Hire a Manager</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">The club cannot continue without a manager to run the squad and propose transfers.</p>
          <div className="mt-4 space-y-3">
            {save.managerCandidates.slice(0, 3).map((manager) => (
              <div key={manager.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{manager.name}</p>
                    <p className="text-xs text-neutral-500">{manager.style} · {manager.personality}</p>
                  </div>
                  <p className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">{managerRating(manager)}</p>
                </div>
                <Button className="mt-3 w-full" onClick={() => setTab("manager")}>Negotiate</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setTab("manager")}>View All Candidates</Button>
        </div>
      </div>
    );
  }

  return null;
}

function EventEntityHeader({ save }: { save: GameSave }) {
  const event = save.currentEvent;
  const current = useCurrent(save)!;
  const player = event?.playerId ? save.players[event.playerId] : undefined;
  const managerSubjectTypes = new Set(["manager_frustrated", "manager_retirement_hint", "manager_contract_decision", "transfer_budget"]);
  const manager = event?.managerId && managerSubjectTypes.has(event.type) ? save.managers[event.managerId] : undefined;
  const sourceClub = event?.proposal?.fromClubId ? save.clubs[event.proposal.fromClubId] : undefined;
  const targetClub = event?.proposal?.toClubId ? save.clubs[event.proposal.toClubId] : undefined;
  if (player) {
    const context = event?.proposal?.type === "buy"
      ? `Transfer target from ${sourceClub?.name ?? "another club"}`
      : event?.proposal?.type === "loan"
        ? event.proposal.loanDirection === "out"
          ? `Current squad player · Loan club: ${targetClub?.name ?? "unknown club"}`
          : `Loan target from ${sourceClub?.name ?? "another club"}`
      : event?.proposal?.type === "sell"
        ? `Current squad player · Bidder: ${targetClub?.name ?? "unknown club"}`
        : player.clubId === current.club.id
          ? "Current squad player"
          : `External player from ${sourceClub?.name ?? "another club"}`;
    return (
      <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
        <PersonAvatar name={player.name} seedKey={player.id} className="h-16 w-16 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{player.name}</p>
          <p className="truncate text-[11px] font-semibold uppercase text-neutral-500">{context}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <span className={cn("rounded-md px-2 py-1 font-black text-white", positionClass(player.position))}><small className="block text-[9px] opacity-80">Pos</small>{displayPosition(player.position)}</span>
            <span className="rounded-md bg-white px-2 py-1 font-black"><small className="block text-[9px] text-neutral-500">Rating</small>{player.rating}/100</span>
            <span className="rounded-md bg-white px-2 py-1 font-black"><small className="block text-[9px] text-neutral-500">Age</small>{player.age}</span>
          </div>
        </div>
      </div>
    );
  }
  if (manager) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
        <PersonAvatar name={manager.name} seedKey={manager.id} kind="manager" className="h-16 w-16 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{manager.name}</p>
          <p className="text-xs text-neutral-500">Age {manager.age} · Rating {managerRating(manager)} · Trust {current.club.managerTrust ?? 66}%</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
      <BrandMark className="h-16 w-16 shrink-0 rounded-lg" />
      <div>
        <p className="text-base font-black">{current.club.name}</p>
        <p className="text-xs text-neutral-500">Balance {formatMoney(current.club.finances.balance)}</p>
      </div>
    </div>
  );
}

function FinancialRows({ snapshot, testIdPrefix = "financial" }: { snapshot?: FinancialSnapshot; testIdPrefix?: string }) {
  if (!snapshot) return null;
  const expenses = [
    ["Player and manager wages", snapshot.expenses.wages],
    ["Stadium running costs", snapshot.expenses.stadiumRunning],
    ["Youth academy", snapshot.expenses.youthAcademy],
    ["Training facilities", snapshot.expenses.trainingFacilities],
    ["Infrastructure spending", snapshot.expenses.infrastructure],
    ["Fees out", snapshot.expenses.feesOut],
  ];
  const income = [
    ["Fees in", snapshot.income.feesIn],
    ["Ticket sales", snapshot.income.ticketSales],
    ["Food and drink", snapshot.income.foodDrink],
    ["Merchandise", snapshot.income.merchandise],
    ["VIP", snapshot.income.vip],
    ["Prize money", snapshot.income.prizeMoney],
    ["Sponsorship", snapshot.income.sponsorship],
    ["TV", snapshot.income.tv],
  ];
  return (
    <div className="mt-4 space-y-3 text-sm">
      <div className="flex justify-between rounded-lg bg-surface-muted px-3 py-2 text-xs">
        <span className="font-bold uppercase text-neutral-500">Report period</span>
        <b data-testid={`${testIdPrefix}-period`}>{snapshot.month} · Period {snapshot.week}</b>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Opening balance <b data-testid={`${testIdPrefix}-opening`} className="block">{formatMoney(snapshot.balanceBefore)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Closing balance <b data-testid={`${testIdPrefix}-closing`} className="block">{formatMoney(snapshot.balanceAfter)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Total income <b data-testid={`${testIdPrefix}-income`} className="block text-primary">{formatMoney(snapshot.totalIncome)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Total expenses <b data-testid={`${testIdPrefix}-expenses`} className="block text-danger">{formatMoney(snapshot.totalExpenses)}</b></p>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Expenses</p>
        {expenses.map(([label, amount]) => (
          <div key={label} className="flex justify-between border-t border-line py-1.5 first:border-t-0">
            <span>{label}</span>
            <b className="text-danger">-{formatMoney(amount as number)}</b>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Income</p>
        {income.map(([label, amount]) => (
          <div key={label} className="flex justify-between border-t border-line py-1.5 first:border-t-0">
            <span>{label}</span>
            <b className="text-primary">{formatMoney(amount as number)}</b>
          </div>
        ))}
      </div>
      <div className="flex justify-between rounded-lg bg-surface-muted px-3 py-3">
        <span className="font-bold">{snapshot.profit >= 0 ? "Profit" : "Loss"}</span>
        <b data-testid={`${testIdPrefix}-result`} className={snapshot.profit >= 0 ? "text-primary" : "text-danger"}>{formatMoney(snapshot.profit)}</b>
      </div>
    </div>
  );
}

function TransferBudgetControls({ save }: { save: GameSave }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const modes: { mode: TransferBudgetMode; label: string; detail: string; factor: number | "max" | "generous" }[] = [
    { mode: "max", label: "Max", detail: "Bank balance plus 50% overdraft", factor: "max" },
    { mode: "generous", label: "Generous", detail: "Bank balance plus 25% overdraft", factor: "generous" },
    { mode: "normal", label: "Normal", detail: "Full bank balance", factor: 1 },
    { mode: "cautious", label: "Cautious", detail: "50% bank balance", factor: 0.5 },
    { mode: "strict", label: "Strict", detail: "25% bank balance", factor: 0.25 },
    { mode: "zero", label: "Zero", detail: "No money available", factor: 0 },
  ];
  const [mode, setMode] = useState<TransferBudgetMode>("normal");
  const balance = Math.max(0, current.club.finances.balance);
  const overdraft = Math.abs(current.club.finances.debtLimit);
  function amountFor(factor: (typeof modes)[number]["factor"]) {
    if (factor === "max") return balance + overdraft * 0.5;
    if (factor === "generous") return balance + overdraft * 0.25;
    return balance * factor;
  }
  const selectedMode = modes.find((item) => item.mode === mode) ?? modes[2];
  const selectedBudgetAmount = amountFor(selectedMode.factor);
  const selectedTrustDelta = transferBudgetTrustDelta(mode);
  return (
    <div className="mt-4 space-y-3">
      {modes.map((item) => (
        <button key={item.mode} onClick={() => setMode(item.mode)} className={cn("w-full rounded-lg border px-3 py-3 text-left", mode === item.mode ? "border-primary bg-emerald-50" : "border-line bg-white")}>
          <div className="flex items-center justify-between gap-3">
            <b>{item.label}</b>
            <b>{formatMoney(amountFor(item.factor))}</b>
          </div>
          <p className="text-xs text-neutral-500">{item.detail}</p>
          <p className={cn("mt-1 text-xs font-bold", transferBudgetTrustDelta(item.mode) > 0 ? "text-primary" : transferBudgetTrustDelta(item.mode) < 0 ? "text-danger" : "text-neutral-500")}>
            Manager trust {formatSignedPoints(transferBudgetTrustDelta(item.mode))}
          </p>
        </button>
      ))}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Money <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Wage bill <b className="block">{formatMoney(current.club.finances.weeklyWages)}</b></p>
      </div>
      <ImpactBox>
        <b className="block">Selected budget impact</b>
        Transfer budget {formatMoney(selectedBudgetAmount)}; manager trust {formatSignedPoints(selectedTrustDelta)}.
      </ImpactBox>
      <Button className="sticky bottom-0 w-full shadow-card" onClick={() => resolve({ mode })}>Set Transfer Budget</Button>
    </div>
  );
}

function ManagerContractControls({ save }: { save: GameSave }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const manager = current.manager;
  const divisionLevel = save.divisions.find((division) => division.id === current.club.divisionId)?.level ?? 7;
  const expectedWage = manager ? calculateRecommendedManagerWage(manager, divisionLevel) : 1_000;
  const [wage, setWage] = useState(expectedWage);
  const [years, setYears] = useState(2);
  const wageOptions = uniqueMoneyOptions(expectedWage, [0.9, 1, 1.1, 1.2, 1.35], 100);
  const yearOptions = [1, 2, 3];
  if (!manager) return null;
  const currentWageBill = current.club.finances.weeklyWages;
  const newWageBill = currentWageBill - manager.wage + wage;
  const wageBillDelta = newWageBill - currentWageBill;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Current wage <b className="block">{formatWeeklyWage(manager.wage)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Expected wage <b className="block">{formatWeeklyWage(expectedWage)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Current wage bill <b className="block">{formatMoney(currentWageBill)}/w</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">New wage bill <b className="block">{formatMoney(newWageBill)}/w</b></p>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage</p>
        <div className="grid grid-cols-5 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>
              {formatWeeklyWage(option)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-3 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>
              {option}y
            </button>
          ))}
        </div>
      </div>
      <ImpactBox>
        <b className="block">Decision impact</b>
        <span>Extend: manager trust +4; weekly wage bill {formatSignedMoney(wageBillDelta)}/w.</span>
        <span className="block">Let him leave: manager trust resets to 50, board confidence -4, and the club must hire a replacement before continuing.</span>
      </ImpactBox>
      <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-white pt-2">
        <Button onClick={() => resolve({ action: "extend", terms: { wage, years } })}>Extend Contract</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "release" })}>Let Him Leave</Button>
      </div>
    </div>
  );
}

function BuyNegotiationControls({ save, player, proposal }: { save: GameSave; player: Player; proposal: NonNullable<GameSave["currentEvent"]>["proposal"] }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const expectedFee = proposal?.fee ?? player.value;
  const requestedWage = proposal?.requestedWage ?? Math.round(player.wage * 1.2);
  const requestedYears = proposal?.requestedYears ?? 3;
  const feeOptions = uniqueMoneyOptions(expectedFee, [0.8, 0.9, 0.95, 1, 1.1], 100);
  const wageOptions = uniqueMoneyOptions(requestedWage, [0.85, 0.95, 1, 1.1, 1.2], 50);
  const yearOptions = contractYearOptions(requestedYears);
  const [fee, setFee] = useState(expectedFee);
  const [wage, setWage] = useState(requestedWage);
  const [years, setYears] = useState(requestedYears);
  const sellingClub = proposal?.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
  const selectedWageBill = current.club.finances.weeklyWages + wage;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Selling club <b className="block truncate">{sellingClub?.name ?? "Unknown"}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Target identity <b className="block">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Expected fee <b className="block">{formatMoney(expectedFee)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Player wants <b className="block">{formatWeeklyWage(requestedWage)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Bank balance <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Transfer budget <b className="block">{formatMoney(save.transferBudget?.amount ?? current.club.finances.balance)}</b></p>
      </div>
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">
        Trust impact: walk away -4, low fee rejected -2, player rejects -2, deal blocked -5, completed signing +4.
      </p>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Fee to club</p>
        <div className="grid grid-cols-3 gap-2">
          {feeOptions.map((option) => (
            <button key={option} onClick={() => setFee(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", fee === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatMoney(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage</p>
        <div className="grid grid-cols-3 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", wage === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-5 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{option}y</button>
          ))}
        </div>
      </div>
      <ImpactBox>
        <b className="block">Selected offer impact</b>
        Upfront fee {formatMoney(fee)}; weekly wage bill would rise by {formatMoney(wage)}/w to {formatMoney(selectedWageBill)}/w if the signing is completed.
      </ImpactBox>
      <div className="grid grid-cols-2 gap-3 border-t border-line bg-white pt-3">
        <Button onClick={() => resolve({ action: "offer", terms: { fee, wage, years } })}>Submit Offer</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Walk Away</Button>
      </div>
    </div>
  );
}

function LoanNegotiationControls({ save, player, proposal }: { save: GameSave; player: Player; proposal: NonNullable<GameSave["currentEvent"]>["proposal"] }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const loanIn = proposal?.loanDirection !== "out";
  const expectedFee = proposal?.fee ?? Math.round(player.value * 0.03);
  const requestedWage = proposal?.requestedWage ?? Math.abs(proposal?.wageDelta ?? Math.round(player.wage * 0.5));
  const feeOptions = uniqueMoneyOptions(expectedFee, [0.8, 0.9, 1, 1.1, 1.2], 100);
  const wageOptions = uniqueMoneyOptions(requestedWage, [0.75, 0.85, 1, 1.15, 1.3], 50);
  const [fee, setFee] = useState(expectedFee);
  const [wage, setWage] = useState(requestedWage);
  const sourceClub = proposal?.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
  const destinationClub = proposal?.toClubId ? save.clubs[proposal.toClubId] : undefined;
  const selectedWageBill = current.club.finances.weeklyWages + wage;

  if (!loanIn) {
    return (
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-lg bg-surface-muted px-3 py-2">Loan club <b className="block truncate">{destinationClub?.name ?? "Unknown"}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Player <b className="block">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Loan fee in <b className="block">{formatMoney(expectedFee)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Weekly wage covered <b className="block">{formatWeeklyWage(requestedWage)}</b></p>
        </div>
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">Trust impact: accept loan +1, reject loan -1. The player returns at season end.</p>
        <ImpactBox>
          <b className="block">Accept loan impact</b>
          Fee income {formatMoney(expectedFee)}; weekly wage bill drops by {formatMoney(requestedWage)}/w while the player is away.
        </ImpactBox>
        <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-white pt-2">
          <Button onClick={() => resolve({ action: "offer", terms: { fee: expectedFee, wage: requestedWage, years: 1 } })}>Accept Loan</Button>
          <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Reject</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Parent club <b className="block truncate">{sourceClub?.name ?? "Unknown"}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Target <b className="block">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Expected loan fee <b className="block">{formatMoney(expectedFee)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Wage contribution <b className="block">{formatWeeklyWage(requestedWage)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Bank balance <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Transfer budget <b className="block">{formatMoney(save.transferBudget?.amount ?? current.club.finances.balance)}</b></p>
      </div>
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">Trust impact: completed loan +2, weak terms refused -1, blocked by budget -3, walk away -2.</p>
      <ImpactBox>
        <b className="block">Selected loan impact</b>
        Upfront loan fee {formatMoney(fee)}; weekly wage bill would rise by {formatMoney(wage)}/w to {formatMoney(selectedWageBill)}/w if the loan is completed.
      </ImpactBox>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Loan fee</p>
        <div className="grid grid-cols-5 gap-2">
          {feeOptions.map((option) => (
            <button key={option} onClick={() => setFee(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", fee === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{formatMoney(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly contribution</p>
        <div className="grid grid-cols-5 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-white pt-2">
        <Button onClick={() => resolve({ action: "offer", terms: { fee, wage, years: 1 } })}>Submit Loan</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Walk Away</Button>
      </div>
    </div>
  );
}

function LiveMatchModal({ save, result }: { save: GameSave; result: MatchResult }) {
  const finishLiveMatch = useGameStore((state) => state.finishLiveMatch);
  const fixture = save.lastMatch!;
  const home = save.clubs[fixture.homeClubId];
  const away = save.clubs[fixture.awayClubId];
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    if (minute >= 90) return;
    const timer = window.setTimeout(() => setMinute((value) => Math.min(90, value + 1)), 90);
    return () => window.clearTimeout(timer);
  }, [minute]);
  const visibleEvents = result.events.filter((event) => event.minute <= minute);
  const homeGoals = visibleEvents.filter((event) => event.type === "goal" && event.clubId === home.id).length;
  const awayGoals = visibleEvents.filter((event) => event.type === "goal" && event.clubId === away.id).length;
  const progress = minute / 90;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="live-match-title" className="max-h-full w-full overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-semibold uppercase text-primary">Live match</p>
        <h2 id="live-match-title" className="mt-1 text-xl font-black">{home.name} {homeGoals} - {awayGoals} {away.name}</h2>
        <p className="mt-1 text-xs text-neutral-500">Match is in progress. Finish the match to return to club controls.</p>
        <div className="mt-4 rounded-xl bg-surface-muted p-4 text-center">
          <p data-testid="live-minute" className="text-4xl font-black">{minute}&apos;</p>
          <div className="mt-3 h-2 rounded-full bg-white">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{result.possessionHome}%</b><span className="block text-xs text-neutral-500">Possession</span></p>
          <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{Math.round(result.homeShots * progress)}-{Math.round(result.awayShots * progress)}</b><span className="block text-xs text-neutral-500">Shots</span></p>
          <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{Math.round(result.homeOnTarget * progress)}-{Math.round(result.awayOnTarget * progress)}</b><span className="block text-xs text-neutral-500">On target</span></p>
        </div>
        <div className="mt-4 space-y-2">
          {visibleEvents.length === 0 ? <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-neutral-500">The match is settling into rhythm.</p> : visibleEvents.map((matchEvent, index) => (
            <div key={`${matchEvent.minute}-${index}`} className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
              <PersonAvatar name={matchEvent.playerName} className="h-8 w-8 rounded-md text-[10px]" />
              <p>{matchEvent.minute}&apos; {matchEvent.description}</p>
            </div>
          ))}
          {minute >= 90 ? <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-bold">90&apos; Final whistle.</p> : null}
        </div>
        {minute >= 90 ? <Button className="sticky bottom-0 mt-5 w-full shadow-card" onClick={() => finishLiveMatch()}>Continue</Button> : null}
      </div>
    </div>
  );
}

function SeasonSummaryPanel({ history }: { history: SeasonHistory }) {
  const goalDifference = (history.goalsFor ?? 0) - (history.goalsAgainst ?? 0);
  const outcomeLabel = history.outcome === "promoted" ? "Promoted" : history.outcome === "relegated" ? "Relegated" : "Stayed";
  const impact = history.seasonImpact;
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Finish <b className="block">{ordinal(history.position)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Points <b className="block">{history.points}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Record <b className="block">{history.won ?? 0}-{history.drawn ?? 0}-{history.lost ?? 0}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Goal diff <b className="block">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Season award <b className="block">{formatMoney(history.prizeMoney ?? 0)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Balance <b className="block">{formatMoney(history.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Outcome <b className={cn("block", history.outcome === "promoted" ? "text-primary" : history.outcome === "relegated" ? "text-danger" : "")}>{outcomeLabel}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Next league <b className="block truncate">{history.nextDivisionName ?? history.divisionName}</b></p>
      </div>
      <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">
        <b className="block text-neutral-800">Cup</b>
        {history.cupSummary ?? "No cup record."}
      </div>
      {impact ? (
        <ImpactBox>
          <b className="block">Season impact</b>
          <span>Balance {formatSignedMoney(impact.balanceAfter - impact.balanceBefore)}</span>
          <span className="block">Board {formatSignedPoints(impact.boardConfidenceAfter - impact.boardConfidenceBefore)} ({impact.boardConfidenceBefore}% to {impact.boardConfidenceAfter}%)</span>
          <span className="block">Manager trust {formatSignedPoints(impact.managerTrustAfter - impact.managerTrustBefore)} ({impact.managerTrustBefore}% to {impact.managerTrustAfter}%)</span>
          <span className="block">Club reputation {formatSignedPoints(impact.reputationAfter - impact.reputationBefore)} ({impact.reputationBefore} to {impact.reputationAfter})</span>
        </ImpactBox>
      ) : null}
      {history.trophies.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {history.trophies.map((trophy) => (
            <span key={trophy} className="rounded-md bg-primary px-2 py-1 text-xs font-black text-white">{trophy}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EventModal({ save }: { save: GameSave }) {
  const event = save.currentEvent;
  const current = useCurrent(save)!;
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  if (!event) return null;
  const player = event.playerId ? save.players[event.playerId] : undefined;
  const proposal = event.proposal;
  const requestedWage = player && proposal ? proposal.requestedWage ?? player.wage + proposal.wageDelta : 0;
  const requestedYears = proposal?.requestedYears ?? 3;
  const result = event.type === "match_result" && save.lastMatch?.result ? save.lastMatch.result : undefined;
  const nextFixture = event.fixtureId ? save.fixtures.find((fixture) => fixture.id === event.fixtureId) : undefined;

  if (result && save.liveMatch && !save.liveMatch.finished) return <LiveMatchModal save={save} result={result} />;

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="event-title" className="max-h-[calc(100svh-2rem)] w-full overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <p className={cn("text-xs font-semibold uppercase", event.variant === "negative" ? "text-danger" : "text-primary")}>{event.requiresDecision ? "Decision required" : "Club update"}</p>
        <h2 id="event-title" className="mt-1 text-xl font-black">{event.title}</h2>
        <div className="mt-4">
          <EventEntityHeader save={save} />
        </div>
        <p className="mt-4 text-sm leading-6 text-neutral-700">{event.body}</p>
        {event.note ? <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-5 text-neutral-600">{event.note}</p> : null}

        {event.type === "season_intro" ? (
          <div className="mt-4 space-y-2">
            {save.divisions.map((division) => (
              <div key={division.id} className={cn("rounded-lg border px-3 py-2 text-sm", division.id === current.club.divisionId ? "border-primary bg-emerald-50 font-bold text-primary" : "border-line")}>
                Level {division.level}: {division.name}
              </div>
            ))}
          </div>
        ) : null}

        {event.type === "season_summary" && event.seasonHistory ? (
          <SeasonSummaryPanel history={event.seasonHistory} />
        ) : null}

        {event.type === "financial_report" ? <FinancialRows snapshot={event.financialSnapshot} testIdPrefix="event-finance" /> : null}
        {event.type === "transfer_budget" ? <TransferBudgetControls save={save} /> : null}
        {event.type === "manager_contract_decision" ? <ManagerContractControls save={save} /> : null}

        {event.type === "contract_offer" && player && proposal?.type === "contract" ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-lg bg-surface-muted px-3 py-2">Current wage <b className="block">{formatMoney(player.wage)}/w</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Current deal <b className="block">{player.contractYears}y left</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Wage bill <b className="block">{formatMoney(current.club.finances.weeklyWages)}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Recommended <b className="block">{formatMoney(Math.round(current.club.finances.balance * 0.08))}</b></p>
            </div>
            <ContractOfferControls player={player} requestedWage={requestedWage} requestedYears={requestedYears} currentWageBill={current.club.finances.weeklyWages} approve={(terms) => resolve({ action: "offer", terms })} reject={() => resolve({ action: "reject" })} />
          </>
        ) : null}

        {event.type === "contract_offer" && proposal?.type === "buy" ? (
          player ? <BuyNegotiationControls save={save} player={player} proposal={proposal} /> : null
        ) : null}

        {event.type === "contract_offer" && proposal?.type === "loan" ? (
          player ? <LoanNegotiationControls save={save} player={player} proposal={proposal} /> : null
        ) : null}

        {event.type === "incoming_bid" ? (
          <>
          {player && proposal ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-lg bg-surface-muted px-3 py-2">Bidding club <b className="block truncate">{proposal.toClubId ? save.clubs[proposal.toClubId]?.name ?? "Unknown" : "Unknown"}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Squad identity <b className="block">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Current wage <b className="block">{formatWeeklyWage(player.wage)}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Contract left <b className="block">{player.contractYears}y</b></p>
            </div>
          ) : null}
          {player && proposal ? (() => {
            const saleImpact = calculateSaleImpact(save, player, proposal.fee);
            return (
              <ImpactBox className="mt-3">
                <b className="block">Sale decision impact</b>
                Accept bid: manager trust +1. Confirming later would move board confidence {formatSignedPoints(saleImpact.boardDelta)} and squad morale {formatSignedPoints(saleImpact.moraleDelta)}.
                <span className="block">{saleImpact.summary}</span>
                <span className="block">Reject bid: manager trust -2.</span>
              </ImpactBox>
            );
          })() : (
            <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">Trust impact: accept bid +1, reject bid -2.</p>
          )}
          <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
            <Button onClick={() => resolve({ action: "accept" })}>Accept Bid</Button>
            <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Reject Bid</Button>
          </div>
          </>
        ) : null}

        {event.type === "sale_ready" ? (
          <>
            {event.pendingDeal && player ? (
              (() => {
                const saleImpact = calculateSaleImpact(save, player, event.pendingDeal.fee);
                return (
                  <ImpactBox className="mt-4">
                    <b className="block">Confirm sale impact</b>
                    Balance {formatSignedMoney(event.pendingDeal.fee)}; weekly wage bill drops by {formatMoney(player.wage)}/w.
                    <span className="block">Board confidence {formatSignedPoints(saleImpact.boardDelta)}; squad morale {formatSignedPoints(saleImpact.moraleDelta)}.</span>
                    <span className="block">{saleImpact.summary}</span>
                    <span className="block">Manager trust already changed when the bid was accepted; cancelling makes no immediate finance change.</span>
                  </ImpactBox>
                );
              })()
            ) : null}
            <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
              <Button onClick={() => resolve({ action: "confirm" })}>Confirm Sale</Button>
              <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Cancel</Button>
            </div>
          </>
        ) : null}

        {event.type === "youth_contract" ? (
          <>
            {player ? (
              <ImpactBox className="mt-4">
                <b className="block">Youth decision impact</b>
                Offer contract: weekly wage bill rises by about {formatWeeklyWage(Math.max(player.wage, Math.round(player.rating * 95)))} and player morale improves. Release: no wage cost, player leaves the club.
              </ImpactBox>
            ) : null}
            <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
              <Button onClick={() => resolve({ action: "offer" })}>Offer Contract</Button>
              <Button variant="secondary" onClick={() => resolve({ action: "release" })}>Release</Button>
            </div>
          </>
        ) : null}

        {event.type === "match_preview" ? (
          <>
            {nextFixture?.competition === "cup" ? (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-primary">
                {save.cup.name} · {cupRoundName(nextFixture.cupRound ?? save.cup.round)}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-surface-muted px-3 py-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Home</p>
                <p className="mt-1 text-base font-black">{nextFixture ? save.clubs[nextFixture.homeClubId].name : current.club.name}</p>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Away</p>
                <p className="mt-1 text-base font-black">{nextFixture ? save.clubs[nextFixture.awayClubId].name : "Opponent"}</p>
              </div>
            </div>
            <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
              <Button variant="secondary" onClick={() => resolve({ action: "see" })}>See Match</Button>
              <Button onClick={() => resolve({ action: "play" })}><Play size={16} /> Play Match</Button>
            </div>
          </>
        ) : null}

        {result && save.lastMatch ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{result.possessionHome}%</b><span className="block text-xs text-neutral-500">Possession</span></p>
              <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{result.homeShots}-{result.awayShots}</b><span className="block text-xs text-neutral-500">Shots</span></p>
              <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{result.homeOnTarget}-{result.awayOnTarget}</b><span className="block text-xs text-neutral-500">On target</span></p>
            </div>
            <div className="mt-4 space-y-2">
              {result.events.length === 0 ? (
                <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-neutral-600">No major match events recorded.</div>
              ) : result.events.slice(0, 4).map((matchEvent, index) => (
                <div key={`${matchEvent.minute}-${index}`} className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <PersonAvatar name={matchEvent.playerName} className="h-8 w-8 rounded-md text-[10px]" />
                  <p>{matchEvent.minute}&apos; {matchEvent.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {!["transfer_budget", "manager_contract_decision", "contract_offer", "incoming_bid", "sale_ready", "youth_contract", "match_preview"].includes(event.type) ? (
          <Button className="mt-5 w-full shadow-card" onClick={() => resolve({ action: "continue" })}>Continue</Button>
        ) : null}
        {nextFixture && event.type === "match_preview" ? <p className="mt-3 text-center text-xs text-neutral-500">{save.clubs[nextFixture.homeClubId].name} vs {save.clubs[nextFixture.awayClubId].name}</p> : null}
      </div>
    </div>
  );
}

function FacilityModal({ save, facility, close }: { save: GameSave; facility?: FacilityKind; close: () => void }) {
  const current = useCurrent(save)!;
  const upgradeTraining = useGameStore((state) => state.upgradeTraining);
  const upgradeYouth = useGameStore((state) => state.upgradeYouth);
  const downgradeTraining = useGameStore((state) => state.downgradeTraining);
  const downgradeYouth = useGameStore((state) => state.downgradeYouth);
  const [levels, setLevels] = useState(1);
  if (!facility) return null;

  const isTraining = facility === "training";
  const title = isTraining ? "Training Ground" : "Youth Academy";
  const level = isTraining ? current.club.trainingLevel : current.club.youthLevel;
  const base = isTraining ? 14_000 : 13_000;
  const divisor = isTraining ? 850 : 900;
  const targetLevels = Math.min(levels, 99 - level);
  const lowerLevels = Math.min(levels, level - 1);
  const targetLevel = level + targetLevels;
  const reducedLevel = level - lowerLevels;
  const currentFacilityWeeklyCost = Math.round(level * (isTraining ? 78 : 72));
  const upgradeCost = Array.from({ length: targetLevels }).reduce<number>((sum, _, index) => sum + nextUpgradeCost(level + index, base), 0);
  const upkeepIncrease = Math.round(upgradeCost / divisor);
  const downgradeCostBase = Array.from({ length: lowerLevels }).reduce<number>((sum, _, index) => sum + nextUpgradeCost(level - 1 - index, base), 0);
  const upkeepDecrease = Math.round(downgradeCostBase / divisor);
  const newWeeklyCost = current.club.finances.upkeep + upkeepIncrease;
  const reducedWeeklyCost = Math.max(0, current.club.finances.upkeep - upkeepDecrease);

  async function upgrade() {
    if (isTraining) await upgradeTraining(levels);
    else await upgradeYouth(levels);
  }

  async function downgrade() {
    if (isTraining) await downgradeTraining(levels);
    else await downgradeYouth(levels);
  }

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="facility-title" className="w-full rounded-xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-semibold uppercase text-primary">Facility management</p>
        <h2 id="facility-title" className="mt-1 text-xl font-bold">{title}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <p className="rounded-lg bg-surface-muted px-3 py-3">Current level <b className="block text-2xl">{level}/99</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Selected change <b className="block">+{targetLevels} / -{lowerLevels}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Facility weekly cost <b className="block">{formatMoney(currentFacilityWeeklyCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Target level <b className="block">{targetLevel}/99</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Cost to upgrade <b className="block">{formatMoney(upgradeCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">New club upkeep <b className="block">{formatMoney(newWeeklyCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Reduced level <b className="block">{reducedLevel}/99</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Reduced club upkeep <b className="block">{formatMoney(reducedWeeklyCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Bank balance <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((option) => (
            <button key={option} onClick={() => setLevels(option)} className={cn("rounded-lg border py-2 text-xs font-black", levels === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{option} level{option > 1 ? "s" : ""}</button>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-5 text-neutral-600">
          Lowering a level does not refund money, but it reduces weekly upkeep by {formatMoney(upkeepDecrease)}.
        </p>
        <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 bg-white pt-2">
          <Button onClick={upgrade} disabled={level >= 99 || current.club.finances.balance < upgradeCost}>Upgrade +{levels}</Button>
          <Button variant="secondary" onClick={downgrade} disabled={level <= 1}>Lower -{levels}</Button>
        </div>
        <Button variant="ghost" className="mt-3 w-full" onClick={close}>Close</Button>
      </div>
    </div>
  );
}

export function GameClient() {
  const router = useRouter();
  const save = useGameStore((state) => state.save);
  const hydrated = useGameStore((state) => state.hydrated);
  const load = useGameStore((state) => state.load);
  const continueGame = useGameStore((state) => state.continueGame);
  const message = useGameStore((state) => state.message);
  const clearMessage = useGameStore((state) => state.clearMessage);
  const [tab, setTab] = useState<Tab>("home");
  const [facilityModal, setFacilityModal] = useState<FacilityKind | undefined>();
  const setActiveTab = (nextTab: Tab) => {
    clearMessage();
    setTab(nextTab);
  };

  useEffect(() => {
    if (!hydrated) void load();
  }, [hydrated, load]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(clearMessage, 2400);
    return () => window.clearTimeout(timeout);
  }, [message, clearMessage]);

  if (!hydrated) {
    return (
      <AppFrame>
        <div className="grid flex-1 place-items-center bg-[linear-gradient(180deg,_#ffffff,_#f4f8f4)] p-6 text-center">
          <div>
            <BrandMark className="mx-auto h-24 w-24 shadow-[0_16px_34px_rgba(16,36,27,0.14)]" />
            <p className="mt-4 font-bold">Loading career...</p>
          </div>
        </div>
      </AppFrame>
    );
  }

  if (!save) {
    return (
      <AppFrame>
        <div className="flex flex-1 flex-col justify-center bg-[linear-gradient(180deg,_#ffffff,_#f4f8f4)] p-6 text-center">
          <div className="relative mx-auto w-full max-w-xs rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-[0_18px_46px_rgba(16,36,27,0.08)]">
            <div className="pointer-events-none absolute inset-x-8 top-5 h-16 rounded-[1.5rem] bg-[linear-gradient(135deg,_#edf8ef,_#edf4ff)]" />
            <BrandMark className="relative mx-auto h-24 w-24 shadow-[0_16px_34px_rgba(16,36,27,0.16)]" />
            <h1 className="mt-5 text-xl font-black">No career found</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">Create a club and start the chairman loop.</p>
            <Button className="mt-5 w-full" onClick={() => router.push("/new-game")}>New Game</Button>
          </div>
        </div>
      </AppFrame>
    );
  }

  const showMessage = Boolean(message && !save.currentEvent && !facilityModal);

  if (save.liveMatch && save.lastMatch?.result && !save.liveMatch.finished) {
    return (
      <AppFrame>
        <div className={cn("relative flex min-h-0 flex-1 flex-col", save.settings.textSize === "large" && "fdp-large-text")}>
          <LiveMatchModal save={save} result={save.lastMatch.result} />
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <div className={cn("relative flex min-h-0 flex-1 flex-col", save.settings.textSize === "large" && "fdp-large-text")}>
      <Header save={save} tab={tab} setTab={setActiveTab} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-5">
        {showMessage ? <div role="status" className="mb-3 rounded-full border border-emerald-900/10 bg-emerald-950 px-3 py-2 text-center text-xs font-semibold text-white shadow-[0_10px_22px_rgba(16,36,27,0.18)]">{message}</div> : null}
        {tab === "home" && <HomeTab save={save} continueGame={continueGame} openFacility={setFacilityModal} setTab={setActiveTab} />}
        {tab === "standings" && <StandingsTab save={save} setTab={setActiveTab} />}
        {tab === "squad" && <SquadTab save={save} setTab={setActiveTab} />}
        {tab === "manager" && <ManagerTab save={save} setTab={setActiveTab} />}
        {tab === "finances" && <FinancesTab save={save} setTab={setActiveTab} />}
        {tab === "stadium" && <StadiumTab save={save} setTab={setActiveTab} />}
        {tab === "history" && <HistoryTab save={save} setTab={setActiveTab} />}
        {tab === "settings" && <SettingsTab save={save} setTab={setActiveTab} />}
      </div>
      <FacilityModal save={save} facility={facilityModal} close={() => setFacilityModal(undefined)} />
      <EventModal save={save} />
      <DecisionModal save={save} setTab={setActiveTab} suppressed={Boolean(save.currentEvent) || tab === "manager"} />
      </div>
    </AppFrame>
  );
}
