"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CalendarDays, ListOrdered, Play, Trophy } from "lucide-react";
import { AppFrame } from "./app-frame";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";
import { Card, StatCard } from "./ui/card";
import { evaluateManager, leagueTable } from "@/game/engine";
import { monthForWeek, nextUpgradeCost, seasonLabel } from "@/game/calendar";
import type { ContractTerms, FinancialSnapshot, GameSave, Player, Position, TransferBudgetMode } from "@/game/types";
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
    const nextFixture = save.fixtures.find((fixture) => fixture.round === save.currentRound && (fixture.homeClubId === club.id || fixture.awayClubId === club.id));
    return { club, manager, players, table, position, nextFixture };
  }, [save]);
}

function Header({ save, tab, setTab }: { save: GameSave; tab: Tab; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  return (
    <header className="border-b border-line bg-white px-4 py-4">
      <div className="flex items-center gap-3">
        <BrandMark className="h-12 w-12 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{current.club.name}</p>
          <p className="text-xs text-neutral-500">{seasonLabel(save.season)} Season · {monthForWeek(save.week)}</p>
        </div>
        <button aria-label="History" onClick={() => setTab(tab === "history" ? "home" : "history")} className="rounded-full p-2 hover:bg-surface-muted">
          <Trophy size={20} />
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
    <Button variant="secondary" className="mb-3 w-full" onClick={() => setTab("home")}>Back to Dashboard</Button>
  );
}

function HomeTab({ save, continueGame, openFacility, setTab }: { save: GameSave; continueGame: () => void; openFacility: (facility: FacilityKind) => void; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const nextOpponent = current.nextFixture ? save.clubs[current.nextFixture.homeClubId === current.club.id ? current.nextFixture.awayClubId : current.nextFixture.homeClubId] : undefined;
  const blocked = Boolean(save.currentEvent || !current.manager || save.gameOver);
  const squadRating = Math.round(current.players.slice(0, 11).reduce((sum, player) => sum + player.rating, 0) / Math.max(1, current.players.slice(0, 11).length));
  const managerRating = current.manager ? Math.round((current.manager.training + current.manager.tactics + current.manager.manManagement + current.manager.transferTaste) / 4) : 0;
  const trophies = save.history.flatMap((item) => item.trophies).length;
  const achievements = save.achievements.filter((achievement) => achievement.unlockedAt).length;
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
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="League position" value={current.position ? ordinal(current.position) : "-"} detail={save.divisions.find((division) => division.id === current.club.divisionId)?.name} />
        <StatCard label="Balance" value={formatMoney(current.club.finances.balance)} detail={`Last period ${formatMoney(current.club.finances.lastWeekProfit)}`} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="League" value={current.position ? ordinal(current.position) : "-"} onClick={() => setTab("standings")} />
        <MiniMetric label="Squad" value={squadRating || "-"} onClick={() => setTab("squad")} />
        <MiniMetric label="Manager" value={managerRating || "-"} onClick={() => setTab("manager")} />
        <MiniMetric label="Training" value={current.club.trainingLevel} onClick={() => openFacility("training")} />
        <MiniMetric label="Youth" value={current.club.youthLevel} onClick={() => openFacility("youth")} />
        <MiniMetric label="Finances" value={formatMoney(current.club.finances.balance)} onClick={() => setTab("finances")} />
        <MiniMetric label="Fans" value={`${current.club.boardConfidence}%`} />
        <MiniMetric label="Stadium" value={current.club.stadium.condition} onClick={() => setTab("stadium")} />
        <MiniMetric label="History" value={`${trophies}/${achievements}`} onClick={() => setTab("history")} />
      </div>
      <Card className="flex items-center justify-between gap-2 p-3">
        <span className="text-xs font-bold uppercase text-neutral-500">Last 10</span>
        <div className="flex flex-1 justify-end gap-1">
          {(lastTen.length ? lastTen : ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]).map((result, index) => (
            <span key={`${result}_${index}`} className={cn("grid h-7 w-7 place-items-center rounded-md text-xs font-black text-white", result === "W" ? "bg-primary" : result === "D" ? "bg-warning" : result === "L" ? "bg-danger" : "bg-neutral-300")}>{result}</span>
          ))}
        </div>
      </Card>
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">Next match</p>
            <p className="text-lg font-bold">{nextOpponent ? `${nextOpponent.name}` : "Season complete"}</p>
            <p className="text-sm text-neutral-500">{current.nextFixture?.homeClubId === current.club.id ? "Home" : "Away"}</p>
          </div>
          <CalendarDays className="text-primary" />
        </div>
        <Button className="w-full" onClick={continueGame} disabled={Boolean(save.gameOver)}>
          {blocked ? "Continue Decision" : "Continue"}
        </Button>
      </Card>
      {save.lastMatch?.result ? (
        <Card>
          <p className="text-xs font-semibold uppercase text-neutral-500">Last result</p>
          <p className="mt-1 text-xl font-bold">
            {save.clubs[save.lastMatch.homeClubId].name} {save.lastMatch.result.homeGoals} - {save.lastMatch.result.awayGoals} {save.clubs[save.lastMatch.awayClubId].name}
          </p>
          <div className="mt-3 space-y-2">
            {save.lastMatch.result.events.slice(0, 5).map((event, index) => (
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

function MiniMetric({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("rounded-lg border border-line bg-white px-2 py-3 text-left shadow-card", onClick && "transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary")}>
      <p className="truncate text-[10px] font-bold uppercase text-neutral-500">{label}</p>
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
      <Card className="p-0">
        <div className="grid grid-cols-[36px_1fr_34px_34px_34px_40px] gap-2 border-b border-line px-3 py-2 text-xs font-bold text-neutral-500">
          <span>#</span>
          <span>Club</span>
          <span className="text-right">P</span>
          <span className="text-right">GD</span>
          <span className="text-right">W</span>
          <span className="text-right">Pts</span>
        </div>
        {current.table.map((club, index) => {
          const goalDifference = club.record.gf - club.record.ga;
          const isUser = club.id === current.club.id;
          return (
            <div
              key={club.id}
              className={cn(
                "grid grid-cols-[36px_1fr_34px_34px_34px_40px] gap-2 border-b border-line px-3 py-3 text-sm last:border-b-0",
                isUser && "bg-emerald-50 font-bold text-primary",
              )}
            >
              <span>{index + 1}</span>
              <span className="truncate">{club.name}</span>
              <span className="text-right">{club.record.played}</span>
              <span className="text-right">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</span>
              <span className="text-right">{club.record.won}</span>
              <span className="text-right">{club.record.points}</span>
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
  return (
    <div className="space-y-3">
      <PageBack setTab={setTab} />
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-neutral-500">
        <button onClick={() => setSort("position")} className={cn("rounded-md px-2 py-1 text-xs font-bold", sort === "position" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Pos</button>
        <button onClick={() => setSort("name")} className={cn("col-span-2 rounded-md px-2 py-1 text-left text-xs font-bold", sort === "name" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Player</button>
        <button onClick={() => setSort("rating")} className={cn("rounded-md px-2 py-1 text-xs font-bold", sort === "rating" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Rate</button>
      </div>
      {players.map((player) => (
        <Card key={player.id} className="grid grid-cols-4 items-center gap-2 p-3">
          <span className={cn("rounded-md px-2 py-1 text-center text-xs font-bold text-white", positionClass(player.position))}>{displayPosition(player.position)}</span>
          <div className="col-span-2 min-w-0">
            <div className="flex items-center gap-2">
              <PersonAvatar name={player.name} seedKey={player.id} className="h-8 w-8 rounded-md text-[10px]" />
              <p className="truncate text-sm font-bold">{player.name}</p>
            </div>
            <p className="text-xs text-neutral-500">Age {player.age} · {player.contractYears}y · {formatMoney(player.wage)}/w</p>
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
              <p className="text-sm text-neutral-500">{current.manager.contractYears} years left</p>
            </div>
          </div>
          {[
            ["Training", current.manager.training],
            ["Man Management", current.manager.manManagement],
            ["Tactics", current.manager.tactics],
            ["Transfer Taste", current.manager.transferTaste],
            ["Wage Discipline", current.manager.wageDiscipline],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-32 text-sm text-neutral-600">{label}</span>
              <div className="h-2 flex-1 rounded-full bg-surface-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-bold">{value}</span>
            </div>
          ))}
          <p className="rounded-md bg-surface-muted px-3 py-2 text-sm">{evaluateManager(save)}</p>
          <Button variant="danger" className="w-full" onClick={fire}>Fire Manager</Button>
        </Card>
      ) : (
        <Card>
          <p className="font-bold">No manager appointed</p>
          <p className="text-sm text-neutral-500">Hire a manager to run the squad and propose transfers.</p>
        </Card>
      )}
      <div className="space-y-3">
        <h3 className="text-sm font-bold">Available Managers</h3>
        {save.managerCandidates.map((manager) => (
          <Card key={manager.id} className="space-y-3 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{manager.name}</p>
                <p className="text-xs text-neutral-500">{manager.style} · {manager.personality}</p>
              </div>
              <p className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">{manager.reputation}</p>
            </div>
            <Button className="w-full" onClick={() => hire(manager.id)}>Hire</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FinancesTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const finance = current.club.finances;
  const income = finance.sponsorship + finance.ticketIncome + finance.merchIncome;
  const expenses = finance.weeklyWages * Math.max(1, save.week) + finance.upkeep * Math.max(1, save.week);
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <StatCard label="Balance" value={formatMoney(finance.balance)} detail={`Debt limit ${formatMoney(finance.debtLimit)}`} />
      <Card>
        <div className="grid grid-cols-[110px_1fr] gap-y-3 text-sm">
          <span className="text-neutral-500">Income</span><b className="text-primary">{formatMoney(income)}</b>
          <span className="text-neutral-500">Expenses</span><b className="text-danger">{formatMoney(expenses)}</b>
          <span className="text-neutral-500">Weekly wages</span><b>{formatMoney(finance.weeklyWages)}</b>
          <span className="text-neutral-500">Sponsorship</span><b>{formatMoney(finance.sponsorship)}</b>
          <span className="text-neutral-500">Board confidence</span><b>{pct(current.club.boardConfidence)}</b>
        </div>
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
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card>
        <h2 className="text-lg font-bold">{current.club.stadium.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p className="rounded-md bg-surface-muted px-3 py-2">Capacity <b>{current.club.stadium.capacity.toLocaleString()}</b></p>
          <p className="rounded-md bg-surface-muted px-3 py-2">Condition <b>{pct(current.club.stadium.condition)}</b></p>
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
          </div>
          <Button onClick={() => upgrade(stand.id)}>Upgrade</Button>
        </Card>
      ))}
      <Button variant="secondary" className="w-full" onClick={repair}>Repair Stadium</Button>
    </div>
  );
}

function HistoryTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card>
        <h2 className="text-lg font-bold">Trophy Cabinet</h2>
        <p className="mt-2 text-sm text-neutral-500">{save.history.flatMap((item) => item.trophies).length || "No"} trophies or promotions recorded.</p>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold">Season History</h3>
        {save.history.length === 0 ? <p className="text-sm text-neutral-500">Finish a season to create history.</p> : save.history.map((item) => (
          <div key={item.season} className="border-t border-line py-2 text-sm first:border-t-0">
            <b>{item.season}</b> · {item.divisionName} · {item.position}th · {item.points} pts · {formatMoney(item.balance)}
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
            <div key={achievement.id} className="flex items-center gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm">
              <Award size={16} className={achievement.unlockedAt ? "text-primary" : "text-neutral-400"} />
              <div>
                <p className="font-bold">{achievement.title}</p>
                <p className="text-xs text-neutral-500">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsTab({ save }: { save: GameSave }) {
  const persist = useGameStore((state) => state.persist);
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="mt-1 text-sm text-neutral-500">Local/offline career save.</p>
        <Button className="mt-4 w-full" onClick={persist}>Manual Save</Button>
      </Card>
      <Card>
        <h3 className="text-sm font-bold">Export Save</h3>
        <textarea readOnly value={JSON.stringify(save, null, 2)} className="mt-3 h-48 w-full resize-none rounded-lg border border-line bg-surface-muted p-3 font-mono text-[10px]" />
      </Card>
    </div>
  );
}

function ContractOfferControls({ player, requestedWage, requestedYears, approve }: { player: Player; requestedWage: number; requestedYears: number; approve: (terms: ContractTerms) => void }) {
  const wageOptions = [0.9, 1, 1.08, 1.16, 1.25].map((multiplier) => Math.round(requestedWage * multiplier));
  const yearOptions = Array.from(new Set([1, 2, requestedYears, 4, 5].filter((years) => years >= 1 && years <= 5)));
  const [wage, setWage] = useState(requestedWage);
  const [years, setYears] = useState(requestedYears);

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage offer</p>
        <div className="grid grid-cols-5 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>
              {formatMoney(option)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-5 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>
              {option}y
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">
        {player.name} wants {formatMoney(requestedWage)}/w for {requestedYears} years.
      </p>
      <Button className="w-full" onClick={() => approve({ wage, years })}>Submit Offer</Button>
    </div>
  );
}

function DecisionModal({ save, setTab, suppressed = false }: { save: GameSave; setTab: (tab: Tab) => void; suppressed?: boolean }) {
  const current = useCurrent(save)!;
  const approve = useGameStore((state) => state.approveProposal);
  const reject = useGameStore((state) => state.rejectProposal);
  const hire = useGameStore((state) => state.hire);

  if (suppressed) return null;

  if (save.gameOver) {
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
        <div className="w-full rounded-xl bg-white p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase text-danger">Career stopped</p>
          <h2 className="mt-1 text-xl font-bold">Board Decision</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{save.gameOver}</p>
        </div>
      </div>
    );
  }

  if (save.activeProposal) {
    const player = save.players[save.activeProposal.playerId];
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
        <div role="dialog" aria-modal="true" aria-labelledby="decision-title" className="w-full rounded-xl bg-white p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase text-primary">Decision required</p>
          <h2 id="decision-title" className="mt-1 text-xl font-bold">{save.activeProposal.title}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{save.activeProposal.rationale}</p>
          {player ? (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <p className="rounded-lg bg-surface-muted px-2 py-3"><b className={cn("mx-auto block w-8 rounded-md py-1 text-white", positionClass(player.position))}>{displayPosition(player.position)}</b><span className="block text-xs text-neutral-500">Position</span></p>
              <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{player.rating}</b><span className="block text-xs text-neutral-500">Rating</span></p>
              <p className="rounded-lg bg-surface-muted px-2 py-3"><b>{player.age}</b><span className="block text-xs text-neutral-500">Age</span></p>
            </div>
          ) : null}
          {save.activeProposal.type === "contract" && player ? (
            <ContractOfferControls player={player} requestedWage={save.activeProposal.requestedWage ?? player.wage + save.activeProposal.wageDelta} requestedYears={save.activeProposal.requestedYears ?? 3} approve={approve} />
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p className="rounded-lg bg-surface-muted px-3 py-3">Fee <b className="block">{formatMoney(save.activeProposal.fee)}</b></p>
                <p className="rounded-lg bg-surface-muted px-3 py-3">Wages <b className="block">{formatMoney(save.activeProposal.wageDelta)}</b></p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button onClick={() => approve()}>Approve</Button>
                <Button variant="secondary" onClick={reject}>Reject</Button>
              </div>
            </>
          )}
          {save.activeProposal.type === "contract" ? <Button variant="secondary" className="mt-3 w-full" onClick={reject}>Reject Request</Button> : null}
          <p className="mt-3 text-center text-xs text-neutral-500">You must answer before the season can continue.</p>
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
                  <p className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">{manager.reputation}</p>
                </div>
                <Button className="mt-3 w-full" onClick={() => hire(manager.id)}>Hire</Button>
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
  const manager = event?.managerId ? save.managers[event.managerId] : current.manager;
  if (player) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
        <PersonAvatar name={player.name} seedKey={player.id} className="h-16 w-16 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{player.name}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <span className={cn("rounded-md px-2 py-1 font-black text-white", positionClass(player.position))}>{displayPosition(player.position)}</span>
            <span className="rounded-md bg-white px-2 py-1 font-black">{player.rating}/100</span>
            <span className="rounded-md bg-white px-2 py-1 font-black">Age {player.age}</span>
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
          <p className="text-xs text-neutral-500">Age {manager.age} · Rating {Math.round((manager.training + manager.tactics + manager.manManagement + manager.transferTaste) / 4)} · Trust {current.club.managerTrust ?? 66}%</p>
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

function FinancialRows({ snapshot }: { snapshot?: FinancialSnapshot }) {
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
        <b className={snapshot.profit >= 0 ? "text-primary" : "text-danger"}>{formatMoney(snapshot.profit)}</b>
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
  return (
    <div className="mt-4 space-y-3">
      {modes.map((item) => (
        <button key={item.mode} onClick={() => setMode(item.mode)} className={cn("w-full rounded-lg border px-3 py-3 text-left", mode === item.mode ? "border-primary bg-emerald-50" : "border-line bg-white")}>
          <div className="flex items-center justify-between gap-3">
            <b>{item.label}</b>
            <b>{formatMoney(amountFor(item.factor))}</b>
          </div>
          <p className="text-xs text-neutral-500">{item.detail}</p>
        </button>
      ))}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Money <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Wage bill <b className="block">{formatMoney(current.club.finances.weeklyWages)}</b></p>
      </div>
      <Button className="w-full" onClick={() => resolve({ mode })}>Set Transfer Budget</Button>
    </div>
  );
}

function BuyNegotiationControls({ save, player, proposal }: { save: GameSave; player: Player; proposal: NonNullable<GameSave["currentEvent"]>["proposal"] }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const expectedFee = proposal?.fee ?? player.value;
  const requestedWage = proposal?.requestedWage ?? Math.round(player.wage * 1.2);
  const requestedYears = proposal?.requestedYears ?? 3;
  const feeOptions = [0.8, 0.9, 0.95, 1, 1.1].map((multiplier) => Math.round(expectedFee * multiplier));
  const wageOptions = [0.85, 0.95, 1, 1.1, 1.2].map((multiplier) => Math.round(requestedWage * multiplier));
  const yearOptions = Array.from(new Set([1, 2, requestedYears, 4, 5].filter((years) => years >= 1 && years <= 5)));
  const [fee, setFee] = useState(expectedFee);
  const [wage, setWage] = useState(requestedWage);
  const [years, setYears] = useState(requestedYears);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Expected fee <b className="block">{formatMoney(expectedFee)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Player wants <b className="block">{formatMoney(requestedWage)}/w</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Bank balance <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Transfer budget <b className="block">{formatMoney(save.transferBudget?.amount ?? current.club.finances.balance)}</b></p>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Fee to club</p>
        <div className="grid grid-cols-5 gap-2">
          {feeOptions.map((option) => (
            <button key={option} onClick={() => setFee(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", fee === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{formatMoney(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage</p>
        <div className="grid grid-cols-5 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{formatMoney(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-5 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{option}y</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => resolve({ action: "offer", terms: { fee, wage, years } })}>Submit Offer</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Walk Away</Button>
      </div>
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
  const firstTeam = [...current.players].sort((a, b) => positionOrder(a.position) - positionOrder(b.position) || b.rating - a.rating).slice(0, 11);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="event-title" className="max-h-full w-full overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
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

        {event.type === "financial_report" ? <FinancialRows snapshot={event.financialSnapshot} /> : null}
        {event.type === "transfer_budget" ? <TransferBudgetControls save={save} /> : null}

        {event.type === "contract_offer" && player && proposal?.type !== "buy" ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-lg bg-surface-muted px-3 py-2">Current wage <b className="block">{formatMoney(player.wage)}/w</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Current deal <b className="block">{player.contractYears}y left</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Wage bill <b className="block">{formatMoney(current.club.finances.weeklyWages)}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Recommended <b className="block">{formatMoney(Math.round(current.club.finances.balance * 0.08))}</b></p>
            </div>
            <ContractOfferControls player={player} requestedWage={requestedWage} requestedYears={requestedYears} approve={(terms) => resolve({ action: "offer", terms })} />
            <Button variant="secondary" className="mt-3 w-full" onClick={() => resolve({ action: "reject" })}>Reject</Button>
          </>
        ) : null}

        {event.type === "contract_offer" && proposal?.type === "buy" ? (
          player ? <BuyNegotiationControls save={save} player={player} proposal={proposal} /> : null
        ) : null}

        {event.type === "incoming_bid" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={() => resolve({ action: "accept" })}>Accept Bid</Button>
            <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Reject Bid</Button>
          </div>
        ) : null}

        {event.type === "sale_ready" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={() => resolve({ action: "confirm" })}>Confirm Sale</Button>
            <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Cancel</Button>
          </div>
        ) : null}

        {event.type === "youth_contract" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={() => resolve({ action: "offer" })}>Offer Contract</Button>
            <Button variant="secondary" onClick={() => resolve({ action: "release" })}>Release</Button>
          </div>
        ) : null}

        {event.type === "match_preview" ? (
          <>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {firstTeam.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg bg-surface-muted p-2 text-center">
                  <PersonAvatar name={item.name} seedKey={item.id} className="mx-auto mb-1 h-9 w-9 rounded-md text-[10px]" />
                  <span className={cn("mx-auto block w-7 rounded-md py-1 text-xs font-bold text-white", positionClass(item.position))}>{displayPosition(item.position)}</span>
                  <p className="mt-1 truncate text-[10px] font-bold">{item.name.split(" ").at(-1)}</p>
                  <p className="text-[10px] text-neutral-500">{item.rating}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => resolve({ action: "sim" })}>Sim Match</Button>
              <Button onClick={() => resolve({ action: "sim" })}><Play size={16} /> Play Match</Button>
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
              {result.events.slice(0, 4).map((matchEvent, index) => (
                <div key={`${matchEvent.minute}-${index}`} className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <PersonAvatar name={matchEvent.playerName} className="h-8 w-8 rounded-md text-[10px]" />
                  <p>{matchEvent.minute}&apos; {matchEvent.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {!["transfer_budget", "contract_offer", "incoming_bid", "sale_ready", "youth_contract", "match_preview"].includes(event.type) ? (
          <Button className="mt-5 w-full" onClick={() => resolve({ action: "continue" })}>Continue</Button>
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
          <p className="rounded-lg bg-surface-muted px-3 py-3">Current upkeep <b className="block">{formatMoney(current.club.finances.upkeep)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Cost to upgrade <b className="block">{formatMoney(upgradeCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">New weekly cost <b className="block">{formatMoney(newWeeklyCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Reduced weekly cost <b className="block">{formatMoney(reducedWeeklyCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-3">Bank balance <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((option) => (
            <button key={option} onClick={() => setLevels(option)} className={cn("rounded-lg border py-2 text-xs font-black", levels === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>+{option}</button>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-5 text-neutral-600">
          Lowering a level does not refund money, but it reduces weekly upkeep by {formatMoney(upkeepDecrease)}.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
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
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <BrandMark className="mx-auto h-24 w-24" />
            <p className="mt-4 font-bold">Loading career...</p>
          </div>
        </div>
      </AppFrame>
    );
  }

  if (!save) {
    return (
      <AppFrame>
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <BrandMark className="mx-auto h-24 w-24" />
            <h1 className="mt-4 text-xl font-bold">No career found</h1>
            <p className="mt-2 text-sm text-neutral-500">Create a club to begin.</p>
            <Button className="mt-5 w-full" onClick={() => router.push("/new-game")}>New Game</Button>
          </div>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <div className="relative flex min-h-0 flex-1 flex-col">
      <Header save={save} tab={tab} setTab={setTab} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-5">
        {tab === "home" && <HomeTab save={save} continueGame={continueGame} openFacility={setFacilityModal} setTab={setTab} />}
        {tab === "standings" && <StandingsTab save={save} setTab={setTab} />}
        {tab === "squad" && <SquadTab save={save} setTab={setTab} />}
        {tab === "manager" && <ManagerTab save={save} setTab={setTab} />}
        {tab === "finances" && <FinancesTab save={save} setTab={setTab} />}
        {tab === "stadium" && <StadiumTab save={save} setTab={setTab} />}
        {tab === "history" && <HistoryTab save={save} setTab={setTab} />}
        {tab === "settings" && <SettingsTab save={save} />}
      </div>
      {message ? <div className="mx-4 mb-2 rounded-lg bg-emerald-950 px-3 py-2 text-center text-xs font-semibold text-white">{message}</div> : null}
      <FacilityModal save={save} facility={facilityModal} close={() => setFacilityModal(undefined)} />
      <EventModal save={save} />
      <DecisionModal save={save} setTab={setTab} suppressed={Boolean(save.currentEvent)} />
      </div>
    </AppFrame>
  );
}
