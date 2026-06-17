"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, CalendarDays, ChevronLeft, ChevronRight, Copy, Download, Dumbbell, FileJson, Landmark, ListOrdered, Play, Save, Settings, Sprout, Trash2, Trophy, Type, Upload, UserCog, UsersRound, Volume2, Wallet } from "lucide-react";
import { AppFrame } from "./app-frame";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { buildEventPresentation } from "./event-presentation";
import { PersonAvatar } from "./person-avatar";
import { calculateSaleImpact, evaluateManager, generateManagerHireOffer, latestFinancialSnapshot, leagueTable, managerActionLocked } from "@/game/engine";
import { calculateManagerCompensation, calculateRecommendedManagerWage, managerRating } from "@/game/economy";
import { cupRoundName, monthForWeek, nextUpgradeCost, seasonLabel } from "@/game/calendar";
import type { ContractTerms, FinancialSnapshot, GameSave, MatchResult, Player, Position, SeasonHistory, TransferBudgetMode } from "@/game/types";
import { cn, formatMoney, ordinal, pct } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";

type Tab = "home" | "standings" | "squad" | "manager" | "finances" | "stadium" | "history" | "settings";
type SquadSort = "position" | "name" | "rating";
type FacilityKind = "youth" | "training";
type FinancePanel = "summary" | "expenses" | "income";
type HistoryPanel = "seasons" | "trophies" | "achievements";

const tabs: Tab[] = ["home", "standings", "squad", "manager", "finances", "stadium", "history", "settings"];

function normalizeTab(tab?: string): Tab {
  return tabs.includes(tab as Tab) ? tab as Tab : "home";
}

function clampPage(page: number, totalPages: number) {
  return Math.max(0, Math.min(Math.max(0, totalPages - 1), page));
}

function usePagedItems<T>(save: GameSave, key: string, items: T[], pageSize: number, preferredIndex?: number) {
  const updateUiState = useGameStore((state) => state.updateUiState);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const preferredPage = preferredIndex === undefined ? 0 : Math.floor(preferredIndex / pageSize);
  const page = clampPage(save.ui?.pages?.[key] ?? preferredPage, totalPages);
  const setPage = (nextPage: number) => {
    void updateUiState({ pages: { [key]: clampPage(nextPage, totalPages) } });
  };
  return {
    page,
    totalPages,
    start: page * pageSize,
    pageItems: items.slice(page * pageSize, page * pageSize + pageSize),
    setPage,
  };
}

function useUiPanel<T extends string>(save: GameSave, key: string, fallback: T) {
  const updateUiState = useGameStore((state) => state.updateUiState);
  const panel = (save.ui?.panels?.[key] as T | undefined) ?? fallback;
  const setPanel = (nextPanel: T) => {
    void updateUiState({ panels: { [key]: nextPanel }, pages: { [key]: 0 } });
  };
  return [panel, setPanel] as const;
}

function shortCopy(text?: string, max = 150, sentenceCount = 2) {
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/u).slice(0, sentenceCount).join(" ").trim();
  const source = sentence || text.trim();
  return source.length > max ? `${source.slice(0, max - 1).trim()}...` : source;
}

function moodLabel(value: number) {
  if (value >= 75) return "Strong";
  if (value >= 55) return "Steady";
  if (value >= 40) return "Uneasy";
  return "Fragile";
}

function OneScreen({ children, footer, className }: { children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-2 overflow-hidden", className)}>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {footer ? <div className="shrink-0 rounded-xl border border-line/80 bg-white px-3 py-2 shadow-[0_-12px_26px_rgba(16,36,27,0.08)]">{footer}</div> : null}
    </div>
  );
}

function CompactPageTitle({ eyebrow, title, action }: { eyebrow: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line/80 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(23,33,27,0.04)]">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase text-primary">{eyebrow}</p>
        <h2 className="truncate text-base font-black leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function PagerBar({ page, totalPages, setPage, label }: { page: number; totalPages: number; setPage: (page: number) => void; label?: string }) {
  return (
    <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
      <Button variant="secondary" className="min-h-10 px-0" disabled={page <= 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></Button>
      <p className="text-center text-xs font-black uppercase text-neutral-500">{label ?? "Page"} {page + 1}/{totalPages}</p>
      <Button variant="secondary" className="min-h-10 px-0" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></Button>
    </div>
  );
}

function SegmentTabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1">
      {options.map((option) => (
        <button key={option.value} type="button" onClick={() => onChange(option.value)} className={cn("rounded-lg px-2 py-2 text-[10px] font-black uppercase", value === option.value ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

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

function cupHistoryLabel(save: GameSave) {
  const last = save.cup.results.at(-1);
  if (!last) return cupStatus(save);
  return `${last.roundName} ${last.won ? "won" : "lost"}`;
}

function Header({ save }: { save: GameSave }) {
  const current = useCurrent(save)!;
  return (
    <header className="relative shrink-0 overflow-hidden border-b border-emerald-950/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_56%,_#1aa24f)] px-4 py-3 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.26)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.18)_58%_60%,transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <BrandMark className="h-10 w-10 rounded-2xl shadow-[0_12px_28px_rgba(0,0,0,0.2)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{current.club.name}</p>
          <p className="text-xs text-white/75">{seasonLabel(save.season)} Season · {monthForWeek(save.week)} · Period {save.week}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-right text-emerald-950">
          <p className="text-[9px] font-black uppercase text-neutral-500">Balance</p>
          <b className="block text-sm">{formatMoney(current.club.finances.balance)}</b>
        </div>
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

function ImpactBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950", className)}>
      {children}
    </div>
  );
}

function DecisionActionRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid shrink-0 grid-cols-2 gap-3 border-t border-line bg-white pt-3", className)}>
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
  const goalDifference = current.club.record.gf - current.club.record.ga;
  const completedSeasons = save.history.length;
  const trophyCount = save.history.reduce((sum, item) => sum + item.trophies.length, 0);
  const latestSeason = save.history[0];
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
  const formRecord = {
    W: lastTen.filter((item) => item === "W").length,
    D: lastTen.filter((item) => item === "D").length,
    L: lastTen.filter((item) => item === "L").length,
  };
  const lastResult = save.lastMatch?.result;
  const continueLabel = !current.manager ? "Hire Manager" : "Continue";
  const continueAction = () => {
    if (!save.currentEvent && !current.manager) {
      setTab("manager");
      return;
    }
    continueGame();
  };
  return (
    <OneScreen footer={<Button className="w-full" onClick={continueAction} disabled={Boolean(save.gameOver)}>{continueLabel}</Button>}>
      <div className="grid h-full grid-rows-[auto_auto_1fr_auto] gap-2 overflow-hidden">
        <Card className="relative overflow-hidden border-emerald-900/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_58%,_#1aa24f)] p-3 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.28)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.16)_58%_60%,transparent_60%)]" />
          <div className="relative grid grid-cols-[1fr_auto] gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-white/65">Chairman&apos;s desk</p>
              <div className="mt-1 flex items-end gap-2">
                <h2 className="text-3xl font-black leading-none">{current.position ? ordinal(current.position) : "-"}</h2>
                <p className="min-w-0 truncate pb-1 text-sm font-bold text-white/82">{divisionName}</p>
              </div>
              <p className="mt-2 text-xs text-white/65">Board {moodLabel(current.club.boardConfidence)} · Manager {moodLabel(current.club.managerTrust)} · Cup {cupStatus(save)}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-right text-emerald-950 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Balance</p>
              <p data-testid="dashboard-balance" className="text-lg font-black">{formatMoney(current.club.finances.balance)}</p>
              <p className="text-[10px] font-bold uppercase text-neutral-500">This period</p>
              <p data-testid="dashboard-latest-report" className={cn("text-xs font-black", latestFinance.profit >= 0 ? "text-primary" : "text-danger")}>{formatMoney(latestFinance.profit)}</p>
            </div>
          </div>
          <div className="relative mt-3 grid grid-cols-4 rounded-xl border border-white/15 bg-emerald-950/28 text-center text-xs backdrop-blur">
            <span className="border-r border-white/10 px-2 py-2"><small className="block text-white/60">P</small><b>{current.club.record.played}</b></span>
            <span className="border-r border-white/10 px-2 py-2"><small className="block text-white/60">W-D-L</small><b>{current.club.record.won}-{current.club.record.drawn}-{current.club.record.lost}</b></span>
            <span className="border-r border-white/10 px-2 py-2"><small className="block text-white/60">GD</small><b>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</b></span>
            <span className="px-2 py-2"><small className="block text-white/60">Pts</small><b>{current.club.record.points}</b></span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card className="min-h-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-primary">Next match</p>
                <p className="mt-1 truncate text-base font-black">{nextOpponent ? nextOpponent.name : "Season complete"}</p>
                <p className="text-xs text-neutral-500">{current.nextFixture ? current.nextFixture.homeClubId === current.club.id ? "Home" : "Away" : latestSeason ? `Last: ${latestSeason.outcome ?? "done"}` : "Awaiting schedule"}</p>
              </div>
              <CalendarDays className="shrink-0 text-primary" size={20} />
            </div>
          </Card>
          <Card className="min-h-0 p-3">
            <p className="text-[10px] font-black uppercase text-neutral-500">Last result</p>
            {lastResult && save.lastMatch ? (
              <>
                <p className="mt-1 truncate text-xs font-bold">{save.clubs[save.lastMatch.homeClubId].name}</p>
                <p className="text-2xl font-black text-emerald-950">{lastResult.homeGoals}-{lastResult.awayGoals}</p>
                <p className="truncate text-xs font-bold">{save.clubs[save.lastMatch.awayClubId].name}</p>
              </>
            ) : (
              <p className="mt-3 text-sm font-bold text-neutral-500">No match yet</p>
            )}
          </Card>
        </div>

        <div className="grid min-h-0 grid-cols-5 gap-1.5 overflow-hidden">
          <MiniMetric icon={<ListOrdered size={14} />} label="League" value={current.position ? ordinal(current.position) : "-"} onClick={() => setTab("standings")} />
          <MiniMetric icon={<UsersRound size={14} />} label="Squad" value={squadRating || "-"} onClick={() => setTab("squad")} accent="blue" />
          <MiniMetric icon={<UserCog size={14} />} label="Manager" value={currentManagerRating || "-"} onClick={() => setTab("manager")} />
          <MiniMetric icon={<Wallet size={14} />} label="Finance" value={formatMoney(current.club.finances.balance)} onClick={() => setTab("finances")} accent="blue" />
          <MiniMetric icon={<Landmark size={14} />} label="Stadium" value={current.club.stadium.condition} onClick={() => setTab("stadium")} />
          <MiniMetric icon={<Dumbbell size={14} />} label="Training" value={current.club.trainingLevel} onClick={() => openFacility("training")} accent="amber" />
          <MiniMetric icon={<Sprout size={14} />} label="Youth" value={current.club.youthLevel} onClick={() => openFacility("youth")} />
          <MiniMetric icon={<Trophy size={14} />} label="History" value={completedSeasons} onClick={() => setTab("history")} accent="blue" />
          <MiniMetric icon={<Award size={14} />} label="Trophies" value={trophyCount} onClick={() => setTab("history")} accent="amber" />
          <MiniMetric icon={<Settings size={14} />} label="Settings" value={save.settings.sound ? "On" : "Off"} onClick={() => setTab("settings")} accent="blue" />
        </div>

        <Card className="p-2">
          <div className="mb-2 flex items-center justify-between text-xs">
            <p className="font-black uppercase text-neutral-500">Last 10</p>
            <p className="font-bold">{formRecord.W}W · {formRecord.D}D · {formRecord.L}L</p>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {(lastTen.length ? lastTen : ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]).map((result, index) => (
              <span key={`${result}_${index}`} className={cn("grid h-7 min-w-0 place-items-center rounded-md text-[10px] font-black text-white", result === "W" ? "bg-primary" : result === "D" ? "bg-warning" : result === "L" ? "bg-danger" : "bg-neutral-300")}>{result}</span>
            ))}
          </div>
        </Card>
        {save.gameOver ? <Card className="border-danger p-2 text-xs text-danger">{save.gameOver}</Card> : null}
      </div>
    </OneScreen>
  );
}

function MiniMetric({ icon, label, value, onClick, accent = "emerald" }: { icon?: ReactNode; label: string; value: string | number; onClick?: () => void; accent?: "emerald" | "blue" | "amber" }) {
  const accentClass = accent === "blue" ? "text-club-blue bg-blue-50" : accent === "amber" ? "text-amber-700 bg-amber-50" : "text-primary bg-emerald-50";
  return (
    <button onClick={onClick} className={cn("min-h-[54px] rounded-lg border border-line/90 bg-[linear-gradient(180deg,_#ffffff,_#f9fbf9)] px-1.5 py-2 text-left shadow-[0_8px_18px_rgba(23,33,27,0.05)]", onClick && "transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary")}>
      <span className={cn("mb-1 grid h-5 w-5 place-items-center rounded-md", accentClass)}>{icon}</span>
      <p className="truncate text-[8.5px] font-black uppercase leading-tight text-neutral-500">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black">{value}</p>
    </button>
  );
}

function StandingsTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const userIndex = current.table.findIndex((club) => club.id === current.club.id);
  const { page, totalPages, pageItems, start, setPage } = usePagedItems(save, "league", current.table, 8, userIndex);
  return (
    <OneScreen footer={<div className="grid grid-cols-[auto_1fr] gap-2"><PageBack setTab={setTab} /><PagerBar page={page} totalPages={totalPages} setPage={setPage} label="League" /></div>}>
      <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden">
        <CompactPageTitle eyebrow="Standings" title={save.divisions.find((division) => division.id === current.club.divisionId)?.name} action={<ListOrdered className="text-primary" size={20} />} />
        <Card className="grid min-h-0 grid-rows-8 gap-1.5 p-2">
        {pageItems.map((club, localIndex) => {
          const index = start + localIndex;
          const goalDifference = club.record.gf - club.record.ga;
          const isUser = club.id === current.club.id;
          return (
            <div
              key={club.id}
              className={cn(
                "grid min-h-0 grid-cols-[30px_1fr_auto] items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs",
                isUser ? "border-emerald-200 bg-emerald-50 font-bold text-primary shadow-[0_8px_18px_rgba(21,153,71,0.08)]" : "bg-white",
              )}
            >
              <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-surface-muted font-black", isUser && "bg-primary text-white")}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-black">{club.name}</p>
                <p className={cn("truncate text-[10px] text-neutral-500", isUser && "text-primary/75")}>
                  P {club.record.played} · W-D-L {club.record.won}-{club.record.drawn}-{club.record.lost} · GD {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
                </p>
              </div>
              <div className={cn("min-w-10 rounded-lg bg-surface-muted px-2 py-1 text-right", isUser && "bg-white text-primary")}>
                <span className="block text-[10px] font-black uppercase text-neutral-500">Pts</span>
                <span className="text-sm font-black">{club.record.points}</span>
              </div>
            </div>
          );
        })}
        </Card>
      </div>
    </OneScreen>
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
  const { page, totalPages, pageItems, setPage } = usePagedItems(save, `squad_${sort}`, players, 6);
  const averageRating = Math.round(players.reduce((sum, player) => sum + player.rating, 0) / Math.max(1, players.length));
  return (
    <OneScreen footer={<div className="grid grid-cols-[auto_1fr] gap-2"><PageBack setTab={setTab} /><PagerBar page={page} totalPages={totalPages} setPage={setPage} label="Squad" /></div>}>
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-2 overflow-hidden">
        <CompactPageTitle eyebrow="ROSTER" title={`${players.length} players`} action={<p className="rounded-lg bg-surface-muted px-3 py-2 text-xs font-black">Avg {averageRating}</p>} />
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1 text-center text-xs font-semibold text-neutral-500">
          <button onClick={() => { setSort("position"); setPage(0); }} className={cn("rounded-md px-2 py-2 text-xs font-bold", sort === "position" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Pos</button>
          <button onClick={() => { setSort("name"); setPage(0); }} className={cn("rounded-md px-2 py-2 text-xs font-bold", sort === "name" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Player</button>
          <button onClick={() => { setSort("rating"); setPage(0); }} className={cn("rounded-md px-2 py-2 text-xs font-bold", sort === "rating" ? "bg-primary text-white" : "bg-surface-muted text-neutral-600")}>Rate</button>
        </div>
        <div className="grid min-h-0 grid-rows-6 gap-1.5 overflow-hidden">
      {pageItems.map((player) => (
        <Card key={player.id} className="grid min-h-0 grid-cols-[38px_1fr_42px] items-center gap-2 p-2">
          <span className={cn("grid h-8 w-8 place-items-center rounded-md text-center text-xs font-black text-white", positionClass(player.position))}>{displayPosition(player.position)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PersonAvatar name={player.name} seedKey={player.id} className="h-9 w-9 shrink-0 rounded-lg text-[10px] ring-2 ring-white" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{player.name}</p>
                <p className="truncate text-[10px] text-neutral-500">Age {player.age} · {player.loan ? `Loan ${player.loan.direction === "in" ? "in" : "out"}` : `${player.contractYears}y`} · {formatWeeklyWage(player.loan ? player.loan.wageShare : player.wage)}</p>
                <p className="truncate text-[9px] font-semibold text-neutral-400">Morale {pct(player.morale)} · Form {pct(player.form)} · Fit {pct(player.fitness)}</p>
              </div>
            </div>
          </div>
          <span className={cn("justify-self-end rounded-md px-2 py-1 text-xs font-bold text-white", player.rating >= 70 ? "bg-primary" : player.rating >= 55 ? "bg-warning" : "bg-neutral-500")}>{player.rating}</span>
        </Card>
      ))}
        </div>
      </div>
    </OneScreen>
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
  const { page, totalPages, pageItems, setPage } = usePagedItems(save, "manager_candidates", save.managerCandidates, 3);
  const managerAttributes = current.manager
    ? [
        ["Training", current.manager.training],
        ["Tactics", current.manager.tactics],
        ["Transfers", current.manager.transferTaste],
        ["Youth", current.manager.youthPreference],
        ["Reputation", current.manager.reputation],
      ] as const
    : [];
  return (
    <OneScreen footer={<div className="grid grid-cols-[auto_1fr] gap-2"><PageBack setTab={setTab} /><PagerBar page={page} totalPages={totalPages} setPage={setPage} label="Managers" /></div>}>
      <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden">
      {current.manager ? (
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,_#10241b,_#0f8139)] p-3 text-white">
            <div className="flex items-center gap-3">
              <PersonAvatar name={current.manager.name} seedKey={current.manager.id} kind="manager" variant="portrait" className="h-20 w-16 rounded-xl text-base shadow-[0_12px_24px_rgba(0,0,0,0.22)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-normal text-white/65">Current manager</p>
                <h2 className="truncate text-lg font-black">{current.manager.name}</h2>
                <p className="truncate text-xs text-white/70">{current.manager.style} · {current.manager.personality}</p>
                <p className="mt-1 text-xs text-white/70">{formatWeeklyWage(current.manager.wage)} · {current.manager.contractYears}y · Fire {formatMoney(fireCost)}</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-center text-primary">
                <span className="text-base font-black leading-none">{managerRating(current.manager)}</span>
                <span className="text-[8px] font-black uppercase leading-none text-neutral-500">Rate</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5 p-2 text-center text-[10px]">
            {managerAttributes.map(([label, value]) => (
              <p key={label} className="rounded-lg bg-surface-muted px-1.5 py-2"><span className="block font-black uppercase text-neutral-500">{label.slice(0, 4)}</span><b>{value}</b></p>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-line p-2">
            <p className="min-w-0 truncate rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950">{shortCopy(evaluateManager(save), 90)}</p>
            <Button variant="danger" className="min-h-10 px-3" disabled={locked} onClick={() => setFireOpen(true)}>Fire Manager</Button>
          </div>
          {lockMessage ? <p className="px-3 pb-2 text-[10px] font-bold text-neutral-500">{lockMessage}</p> : null}
        </Card>
      ) : (
        <Card className="p-3">
          <p className="font-bold">No manager appointed</p>
          <p className="text-sm text-neutral-500">Hire a manager to continue.</p>
          {lockMessage ? <p className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-neutral-500">{lockMessage}</p> : null}
        </Card>
      )}
      <div className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
        <CompactPageTitle eyebrow="Available Managers" title={`${save.managerCandidates.length} candidates`} />
        <div className="grid min-h-0 grid-rows-3 gap-1.5 overflow-hidden">
        {pageItems.map((manager) => {
          const expectedWage = calculateRecommendedManagerWage(manager, divisionLevel);
          const compensation = manager.status === "contracted" ? manager.compensationFee ?? calculateManagerCompensation(manager) : 0;
          return (
            <Card key={manager.id} className="grid min-h-0 grid-cols-[44px_1fr_auto] items-center gap-2 p-2">
                <PersonAvatar name={manager.name} seedKey={manager.id} kind="manager" className="h-11 w-11 shrink-0 rounded-xl text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{manager.name}</p>
                  <p className="truncate text-[10px] text-neutral-500">{manager.style} · {manager.status === "contracted" ? `Fee ${formatMoney(compensation)}` : "Free Agent"}</p>
                  <p className="truncate text-[10px] font-bold text-neutral-600">Expected {formatWeeklyWage(expectedWage)} · T{manager.training} Ta{manager.tactics} Y{manager.youthPreference}</p>
                </div>
              <div className="grid gap-1">
                <span className="justify-self-end rounded-lg bg-primary px-2 py-1 text-xs font-black text-white">{managerRating(manager)}</span>
                <Button className="min-h-9 px-2 text-xs" disabled={!canNegotiate} onClick={() => setHireId(manager.id)}>Negotiate</Button>
              </div>
            </Card>
          );
        })}
      </div>
      </div>
      {fireOpen && current.manager ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-emerald-950/55 p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="fire-manager-title" className="w-full rounded-xl bg-white p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase text-danger">Confirm dismissal</p>
            <h2 id="fire-manager-title" className="mt-1 text-lg font-bold">{current.manager.name}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-lg bg-surface-muted px-3 py-2">Weekly wage <b className="block">{formatMoney(current.manager.wage)}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Contract left <b className="block">{current.manager.contractYears * 12} months</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Compensation <b className="block text-danger">{formatMoney(fireCost)}</b></p>
              <p className="rounded-lg bg-surface-muted px-3 py-2">Balance after <b className="block">{formatMoney(balanceAfterFire)}</b></p>
            </div>
            <div className="mt-3">
              <DebtImpactBox balance={balanceAfterFire} debtLimit={current.club.finances.debtLimit} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 bg-white">
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
    </OneScreen>
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
    <div className="absolute inset-0 z-40 grid place-items-center bg-emerald-950/55 p-2">
      <div role="dialog" aria-modal="true" aria-labelledby="hire-manager-title" className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl bg-white p-4 shadow-2xl">
        <p className="text-xs font-semibold uppercase text-primary">Manager negotiation</p>
        <div className="mt-2 flex items-center gap-3">
          <PersonAvatar name={candidate.name} seedKey={candidate.id} kind="manager" className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <h2 id="hire-manager-title" className="truncate text-lg font-black">{candidate.name}</h2>
            <p className="text-xs text-neutral-500">{candidate.status === "contracted" ? "Under Contract" : "Free Agent"} · Rating {managerRating(candidate)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-lg bg-surface-muted px-3 py-2">Expected wage <b className="block">{formatWeeklyWage(offer.expectedWage)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Immediate cost <b className="block">{formatMoney(immediateCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Balance after cost <b className="block">{formatMoney(balanceAfterCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">New wage bill <b className="block">{formatMoney(wageBillAfterHire)}/w</b></p>
        </div>
        <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-[10px] font-bold text-neutral-600">Candidate fee {formatMoney(offer.candidateCompensation)} · current manager payoff {formatMoney(offer.outgoingCompensation)}</p>
        <div className="mt-3">
          <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly wage</p>
          <div className="grid grid-cols-5 gap-2">
            {wageOptions.map((option) => (
              <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Contract length</p>
          <div className="grid grid-cols-5 gap-2">
            {yearOptions.map((option) => (
              <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{option}y</button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 bg-white">
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
  const [panel, setPanel] = useUiPanel<FinancePanel>(save, "finances", "summary");
  const expenses: [string, number][] = [
    ["Wages", latestFinance.expenses.wages],
    ["Stadium", latestFinance.expenses.stadiumRunning],
    ["Youth", latestFinance.expenses.youthAcademy],
    ["Training", latestFinance.expenses.trainingFacilities],
    ["Infrastructure", latestFinance.expenses.infrastructure],
    ["Fees out", latestFinance.expenses.feesOut],
  ];
  const income: [string, number][] = [
    ["Fees in", latestFinance.income.feesIn],
    ["Tickets", latestFinance.income.ticketSales],
    ["Food/drink", latestFinance.income.foodDrink],
    ["Merch", latestFinance.income.merchandise],
    ["VIP", latestFinance.income.vip],
    ["Prize", latestFinance.income.prizeMoney],
    ["Sponsor", latestFinance.income.sponsorship],
    ["TV", latestFinance.income.tv],
  ];
  const visibleLines = panel === "expenses" ? expenses : income;
  const recentTransactions = current.club.finances.transactions.slice(0, 3);
  return (
    <OneScreen footer={<PageBack setTab={setTab} />}>
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-2 overflow-hidden">
        <CompactPageTitle
          eyebrow="Finances"
          title="This period"
          action={<b data-testid="finance-summary-period" className="rounded-lg bg-surface-muted px-3 py-2 text-xs">{latestFinance.month} · Period {latestFinance.week}</b>}
        />
        <Card className="grid grid-cols-2 gap-2 p-2">
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Balance <b className="block text-base">{formatMoney(finance.balance)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Result <b data-testid="finance-summary-result" className={cn("block text-base", latestFinance.profit >= 0 ? "text-primary" : "text-danger")}>{formatMoney(latestFinance.profit)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Income <b data-testid="finance-summary-income" className="block text-base text-primary">{formatMoney(latestFinance.totalIncome)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Expenses <b data-testid="finance-summary-expenses" className="block text-base text-danger">{formatMoney(latestFinance.totalExpenses)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Opening <b data-testid="finance-summary-opening" className="block">{formatMoney(latestFinance.balanceBefore)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs">Closing <b data-testid="finance-summary-closing" className="block">{formatMoney(latestFinance.balanceAfter)}</b></p>
        </Card>
        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
          <SegmentTabs<FinancePanel> value={panel} onChange={setPanel} options={[{ value: "summary", label: "Summary" }, { value: "expenses", label: "Expenses" }, { value: "income", label: "Income" }]} />
          <Card className="min-h-0 p-3">
            <h3 className="mb-2 text-sm font-bold">Latest report breakdown</h3>
            {panel === "summary" ? (
              <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <p className="rounded-lg bg-surface-muted px-3 py-2">Weekly wages <b className="block">{formatMoney(finance.weeklyWages)}</b></p>
                  <p className="rounded-lg bg-surface-muted px-3 py-2">Debt limit <b className="block">{formatMoney(finance.debtLimit)}</b></p>
                </div>
                <div className="min-h-0 rounded-lg bg-surface-muted px-3 py-2">
                  <p className="mb-1 text-[10px] font-black uppercase text-neutral-500">Infrastructure spending</p>
                  <div className="grid grid-rows-3 gap-1 overflow-hidden">
                    {(recentTransactions.length ? recentTransactions : [{ id: "no_activity", label: "No recent ledger activity", amount: 0 }]).map((transaction) => (
                      <p key={transaction.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-[10px]">
                        <span className="truncate">{transaction.label}</span>
                        <b className={transaction.amount < 0 ? "text-danger" : "text-primary"}>{formatSignedMoney(transaction.amount)}</b>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-rows-6 gap-1">
                {visibleLines.slice(0, 6).map(([label, amount]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-xs">
                    <span>{label}</span>
                    <b className={panel === "expenses" ? "text-danger" : "text-primary"}>{panel === "expenses" ? "-" : ""}{formatMoney(amount as number)}</b>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </OneScreen>
  );
}

function StadiumTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const upgrade = useGameStore((state) => state.upgradeStand);
  const repair = useGameStore((state) => state.repair);
  const repairCost = Math.round((100 - current.club.stadium.condition) * 4_500);
  const repairGain = 100 - current.club.stadium.condition;
  const { page, totalPages, pageItems, setPage } = usePagedItems(save, "stadium_stands", current.club.stadium.stands, 1);
  const stand = pageItems[0];
  return (
    <OneScreen footer={<div className="grid grid-cols-[auto_1fr] gap-2"><PageBack setTab={setTab} /><PagerBar page={page} totalPages={totalPages} setPage={setPage} label="Stand" /></div>}>
      <div className="grid h-full grid-rows-[auto_auto_1fr_auto] gap-2 overflow-hidden">
        <CompactPageTitle eyebrow="Stadium" title={current.club.stadium.name} action={<Landmark className="text-primary" size={20} />} />
        <Card className="grid grid-cols-2 gap-2 p-2 text-xs">
          <p className="rounded-lg bg-surface-muted px-3 py-2">Capacity <b data-testid="stadium-capacity" className="block text-base">{current.club.stadium.capacity.toLocaleString()}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Condition <b data-testid="stadium-condition" className={cn("block text-base", current.club.stadium.condition < 55 ? "text-danger" : "text-primary")}>{pct(current.club.stadium.condition)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Balance <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Repair need <b className="block">{repairGain > 0 ? `+${repairGain}%` : "None"}</b></p>
        </Card>
        <Card className="grid min-h-0 grid-rows-[1fr_auto] gap-2 p-2">
          <div className="relative min-h-0 overflow-hidden rounded-xl bg-[linear-gradient(140deg,_#174b2e,_#1d8b48_42%,_#e8efe9_43%,_#29533b_100%)] p-4 shadow-inner">
            <div className="absolute inset-x-6 top-4 h-8 rounded-t-2xl border-x-[18px] border-t-[14px] border-emerald-950/35" />
            <div className="absolute inset-x-6 bottom-4 h-8 rounded-b-2xl border-x-[18px] border-b-[14px] border-emerald-950/35" />
            <div className="absolute inset-y-7 left-4 w-8 rounded-l-2xl border-y-[14px] border-l-[14px] border-emerald-950/35" />
            <div className="absolute inset-y-7 right-4 w-8 rounded-r-2xl border-y-[14px] border-r-[14px] border-emerald-950/35" />
            <div className="absolute inset-8 rounded-lg border-[3px] border-white/80 bg-[repeating-linear-gradient(90deg,_#16894a_0_22px,_#1a9c54_22px_44px)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)]">
              <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/80" />
              <div className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80" />
              <div className="absolute inset-y-8 left-0 w-10 border-y-2 border-r-2 border-white/80" />
              <div className="absolute inset-y-8 right-0 w-10 border-y-2 border-l-2 border-white/80" />
            </div>
          </div>
          {stand ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{stand.name}</p>
                <p className="text-xs text-neutral-500">Level {stand.level} · {stand.capacity.toLocaleString()} seats · +850 seats</p>
              </div>
              <Button className="min-h-10 px-3" onClick={() => upgrade(stand.id)}>Upgrade</Button>
            </div>
          ) : null}
        </Card>
        {stand ? (
          <Card className="grid grid-cols-4 gap-2 p-2 text-xs">
            <p className="rounded-lg bg-surface-muted px-2 py-2">Cost <b className="block">{formatMoney(stand.level * 180_000)}</b></p>
            <p className="rounded-lg bg-surface-muted px-2 py-2">New cap <b className="block">{(stand.capacity + 850).toLocaleString()}</b></p>
            <p className="rounded-lg bg-surface-muted px-2 py-2">Repair <b className="block text-danger">{formatMoney(repairCost)}</b></p>
            <Button variant="secondary" className="min-h-full px-2 text-xs" onClick={repair} disabled={repairCost <= 0}>Repair Stadium</Button>
          </Card>
        ) : null}
          </div>
    </OneScreen>
  );
}

function HistoryTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const goalDifference = current.club.record.gf - current.club.record.ga;
  const trophies = save.history.flatMap((item) => item.trophies.map((trophy) => `${item.season}: ${trophy}`));
  const unlockedAchievements = save.achievements.filter((achievement) => achievement.unlockedAt).length;
  const [panel, setPanel] = useUiPanel<HistoryPanel>(save, "history", "seasons");
  const seasonPages = usePagedItems(save, "history_seasons", save.history, 2);
  const trophyPages = usePagedItems(save, "history_trophies", trophies, 5);
  const achievementPages = usePagedItems(save, "history_achievements", save.achievements, 4);
  const activePager = panel === "seasons" ? seasonPages : panel === "trophies" ? trophyPages : achievementPages;
  return (
    <OneScreen footer={<div className="grid grid-cols-[auto_1fr] gap-2"><PageBack setTab={setTab} /><PagerBar page={activePager.page} totalPages={activePager.totalPages} setPage={activePager.setPage} label={panel} /></div>}>
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-2 overflow-hidden">
        <CompactPageTitle eyebrow="Club legacy" title="History" action={<b className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-primary">{unlockedAchievements}/{save.achievements.length}</b>} />
        <div className="grid grid-cols-3 gap-1.5">
          <p className="rounded-xl bg-white px-3 py-2 text-xs shadow-[0_8px_18px_rgba(23,33,27,0.04)]">Seasons <b className="block text-base">{save.history.length}</b></p>
          <p className="rounded-xl bg-white px-3 py-2 text-xs shadow-[0_8px_18px_rgba(23,33,27,0.04)]">Trophies <b className="block text-base">{trophies.length}</b></p>
          <p className="rounded-xl bg-white px-3 py-2 text-xs shadow-[0_8px_18px_rgba(23,33,27,0.04)]">Cup <b className="block truncate text-base">{cupHistoryLabel(save)}</b></p>
        </div>
        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
          <SegmentTabs<HistoryPanel> value={panel} onChange={setPanel} options={[{ value: "seasons", label: "Seasons" }, { value: "trophies", label: "Trophies" }, { value: "achievements", label: "Achieved" }]} />
          <Card className="min-h-0 p-3">
            {panel === "seasons" ? (
              <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden">
                <div>
                  <h3 className="text-sm font-black">Current Season</h3>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
                    <p className="rounded-lg bg-surface-muted px-2 py-2">Pos <b className="block">{current.position ? ordinal(current.position) : "-"}</b></p>
                    <p className="rounded-lg bg-surface-muted px-2 py-2">Played <b className="block">{current.club.record.played}</b></p>
                    <p className="rounded-lg bg-surface-muted px-2 py-2">Record <b className="block">{current.club.record.won}-{current.club.record.drawn}-{current.club.record.lost}</b></p>
                    <p className="rounded-lg bg-surface-muted px-2 py-2">GD/Pts <b className="block">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}/{current.club.record.points}</b></p>
                  </div>
                </div>
                <div className="grid min-h-0 grid-rows-2 gap-1.5 overflow-hidden">
                  {seasonPages.pageItems.length === 0 ? <p className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-neutral-500">Season History starts after the first completed season.</p> : seasonPages.pageItems.map((item) => (
                    <div key={item.season} className="rounded-xl border border-line bg-white p-2 text-xs shadow-[0_8px_18px_rgba(23,33,27,0.04)]">
                      <div className="flex items-center justify-between gap-2">
                        <b>{item.season}/{String(item.season + 1).slice(2)}</b>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", item.outcome === "promoted" ? "bg-primary text-white" : item.outcome === "relegated" ? "bg-red-100 text-danger" : "bg-surface-muted text-neutral-600")}>{item.outcome ?? "stayed"}</span>
                      </div>
                      <p className="truncate text-neutral-500">{item.divisionName} · {ordinal(item.position)} · {item.points} pts</p>
                      <p className="mt-1 truncate text-neutral-500">Award {formatMoney(item.prizeMoney ?? 0)} · Balance {formatMoney(item.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {panel === "trophies" ? (
              <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden">
                <h3 className="text-sm font-black">Trophy Cabinet</h3>
                <div className="grid min-h-0 grid-rows-5 gap-1.5 overflow-hidden">
                  {trophyPages.pageItems.length === 0 ? <p className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-neutral-500">No trophies or promotions recorded.</p> : trophyPages.pageItems.map((label) => (
                    <div key={label} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                      <Trophy size={15} className="shrink-0 text-primary" />
                      <b className="truncate">{label}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {panel === "achievements" ? (
              <div className="grid h-full grid-rows-[auto_1fr] gap-2 overflow-hidden">
                <h3 className="text-sm font-black">Achievements</h3>
                <div className="grid min-h-0 grid-rows-4 gap-1.5 overflow-hidden">
                  {achievementPages.pageItems.map((achievement) => (
                    <div key={achievement.id} data-testid={`achievement-${achievement.id}`} className={cn("rounded-xl border px-3 py-2 text-xs", achievement.unlockedAt ? "border-emerald-100 bg-emerald-50" : "border-line bg-surface-muted")}>
                      <div className="flex items-center justify-between gap-2">
                        <b className="truncate">{achievement.title}</b>
                        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black uppercase", achievement.unlockedAt ? "bg-primary text-white" : "bg-white text-neutral-500")}>{achievement.unlockedAt ? "Unlocked" : "Locked"}</span>
                      </div>
                      <p className="mt-1 truncate text-neutral-500">{achievement.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-white">
                          <div data-testid={`achievement-progress-${achievement.id}`} className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (achievement.progress / Math.max(1, achievement.target)) * 100)}%` }} />
                        </div>
                        <b className="w-8 text-right text-[10px] text-neutral-500">{Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.target)) * 100))}%</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </OneScreen>
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
  const [dataModal, setDataModal] = useState<"export" | "import" | undefined>();
  const exportedSave = useMemo(() => JSON.stringify(save, null, 2), [save]);
  const current = useCurrent(save)!;
  const exportSizeKb = Math.max(1, Math.round(new Blob([exportedSave]).size / 1024));
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
    const json = importText;
    setDataModal(undefined);
    const ok = await importFromJson(json);
    setImportStatus(ok ? "Imported into Slot 1." : "Import failed. Paste a valid Football Director Pro save.");
    if (ok) setImportText("");
    else setDataModal("import");
  };
  return (
    <OneScreen footer={<PageBack setTab={setTab} />}>
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-2 overflow-hidden">
        <CompactPageTitle eyebrow="Local career" title="Settings" action={<b className="rounded-lg bg-surface-muted px-3 py-2 text-xs">{exportSizeKb}KB</b>} />
        <Card className="grid grid-cols-3 gap-2 p-2 text-center text-xs">
          <p className="rounded-xl bg-surface-muted px-2 py-3"><b className="block truncate text-sm">{current.club.name}</b><span className="text-[10px] font-black uppercase text-neutral-500">Club</span></p>
          <p className="rounded-xl bg-surface-muted px-2 py-3"><b className="block text-sm">{save.settings.textSize}</b><span className="text-[10px] font-black uppercase text-neutral-500">Text</span></p>
          <p className="rounded-xl bg-surface-muted px-2 py-3"><b className="block text-sm text-primary">{save.settings.sound ? "On" : "Off"}</b><span className="text-[10px] font-black uppercase text-neutral-500">Sound</span></p>
        </Card>
        <div className="grid min-h-0 grid-rows-[auto_auto_auto_1fr] gap-2 overflow-hidden">
          <Card className="grid grid-cols-2 gap-2 p-3">
            <Button onClick={persist}><Save size={16} /> Manual Save</Button>
            <Button variant={save.settings.sound ? "primary" : "secondary"} onClick={() => updateSettings({ sound: !save.settings.sound })}><Volume2 size={16} /> Sound</Button>
          </Card>
          <Card className="grid grid-cols-2 gap-2 p-3">
            <Button variant={save.settings.textSize === "normal" ? "primary" : "secondary"} onClick={() => updateSettings({ textSize: "normal" })}><Type size={16} /> Normal</Button>
            <Button variant={save.settings.textSize === "large" ? "primary" : "secondary"} onClick={() => updateSettings({ textSize: "large" })}>Large Text</Button>
          </Card>
          <Card className="grid grid-cols-2 gap-2 p-3">
            <Button onClick={() => setDataModal("export")}><FileJson size={16} /> Export Save</Button>
            <Button variant="secondary" onClick={() => setDataModal("import")}><Upload size={16} /> Import Save</Button>
          </Card>
          <Card className="border-red-100 bg-red-50/50 p-3">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-danger" />
              <h3 className="text-sm font-black text-danger">Reset Career</h3>
            </div>
            {confirmReset ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
                <Button onClick={resetCareer}>Confirm Reset</Button>
              </div>
            ) : (
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setConfirmReset(true)}>Reset Local Career</Button>
            )}
            {importStatus && !dataModal ? <p className="mt-2 rounded-lg bg-emerald-950 px-3 py-2 text-center text-xs font-semibold text-white">{importStatus}</p> : null}
          </Card>
        </div>
      </div>
      {dataModal ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-emerald-950/55 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="save-data-title" className="w-full rounded-xl bg-white p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase text-primary">{dataModal === "export" ? "Export Save" : "Import Save"}</p>
            <h2 id="save-data-title" className="mt-1 text-lg font-black">{dataModal === "export" ? "Save JSON" : "Restore Slot 1"}</h2>
            {dataModal === "export" ? (
              <>
                <textarea readOnly value={exportedSave} className="mt-3 h-20 w-full resize-none rounded-xl border border-line bg-surface-muted p-3 font-mono text-[10px] leading-4 text-neutral-600" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button onClick={copyExport}><Copy size={16} /> Copy</Button>
                  <Button variant="secondary" onClick={downloadExport}><Download size={16} /> File</Button>
                  <Button variant="secondary" onClick={() => setDataModal(undefined)}>Close</Button>
                </div>
              </>
            ) : (
              <>
                <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste exported save JSON here" className="mt-3 h-24 w-full resize-none rounded-xl border border-line bg-white p-3 font-mono text-[10px] leading-4 outline-none focus:border-primary" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={submitImport} disabled={!importText.trim()}>Import Into Slot 1</Button>
                  <Button variant="secondary" onClick={() => setDataModal(undefined)}>Cancel</Button>
                </div>
                {importStatus ? <p className="mt-2 rounded-lg bg-emerald-950 px-3 py-2 text-center text-xs font-semibold text-white">{importStatus}</p> : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </OneScreen>
  );
}

function ContractOfferControls({ player, requestedWage, requestedYears, approve, reject }: { player: Player; requestedWage: number; requestedYears: number; approve: (terms: ContractTerms) => void; reject: () => void }) {
  const wageOptions = uniqueMoneyOptions(requestedWage, [0.85, 0.95, 1, 1.1, 1.2], 50);
  const yearOptions = contractYearOptions(requestedYears);
  const [wage, setWage] = useState(requestedWage);
  const [years, setYears] = useState(requestedYears);
  const likelyAccepted = wage >= requestedWage * 0.95 && years >= Math.max(1, requestedYears - 1);
  const wageBillDelta = wage - player.wage;

  return (
    <div className="mt-3 space-y-2">
      <div>
        <p className="mb-1 text-xs font-bold uppercase text-neutral-500">Weekly wage offer</p>
        <div className="grid grid-cols-5 gap-1.5">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>
              {formatWeeklyWage(option)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-5 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>
              {option}y
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">
        Wants {formatWeeklyWage(requestedWage)} for {requestedYears}y. Wage bill {formatSignedMoney(wageBillDelta)}/w. {likelyAccepted ? "The terms look credible." : "The offer may feel light."}
      </p>
      <DecisionActionRow className="mt-2">
        <Button onClick={() => approve({ wage, years })}>Submit Offer</Button>
        <Button variant="secondary" onClick={reject}>Reject</Button>
      </DecisionActionRow>
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
        <div role="dialog" aria-modal="true" aria-labelledby="manager-decision-title" className="w-full overflow-hidden rounded-xl bg-white p-4 shadow-2xl">
          <p className="text-xs font-semibold uppercase text-primary">Decision required</p>
          <h2 id="manager-decision-title" className="mt-1 text-lg font-bold">Hire a Manager</h2>
          <p className="mt-2 text-sm leading-5 text-neutral-600">The club cannot continue without a manager.</p>
          <div className="mt-3 grid gap-2">
            {save.managerCandidates.slice(0, 3).map((manager) => (
              <div key={manager.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{manager.name}</p>
                    <p className="text-xs text-neutral-500">{manager.style} · {manager.personality}</p>
                  </div>
                  <p className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">{managerRating(manager)}</p>
                </div>
                <Button className="mt-2 w-full" onClick={() => setTab("manager")}>Negotiate</Button>
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
      <div className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-emerald-950 text-white shadow-[0_18px_36px_rgba(16,36,27,0.18)]">
        <div className="relative p-3">
          <div className="pointer-events-none absolute inset-0 opacity-16 [background:linear-gradient(120deg,transparent_0_38%,rgba(255,255,255,0.35)_38%_41%,transparent_41%_62%,rgba(255,255,255,0.16)_62%_64%,transparent_64%)]" />
          <div className="relative grid grid-cols-[5rem_1fr] items-stretch gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-emerald-900/60 shadow-[0_14px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/20">
              <PersonAvatar name={player.name} seedKey={player.id} variant="portrait" className="h-24 w-full rounded-none border-0 text-base shadow-none" />
              <span className={cn("absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-sm font-black text-white shadow-[0_8px_14px_rgba(0,0,0,0.22)]", positionClass(player.position))}>{displayPosition(player.position)}</span>
              <span className="absolute bottom-2 right-2 rounded-xl bg-white px-2.5 py-1 text-base font-black text-emerald-950 shadow-[0_8px_14px_rgba(0,0,0,0.18)]">{player.rating}</span>
            </div>
            <div className="min-w-0 py-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/58">{context}</p>
              <p className="mt-1 truncate text-xl font-black leading-none">{player.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Age</span><b>{player.age}</b></p>
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Contract</span><b>{player.contractYears}y</b></p>
              </div>
              <p className="mt-1 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Weekly wage</span><b>{formatWeeklyWage(player.wage)}</b></p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 bg-white text-center text-xs text-neutral-900">
          <span className={cn("px-2 py-2 font-black text-white", positionClass(player.position))}><small className="block text-[9px] opacity-80">Pos</small>{displayPosition(player.position)}</span>
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Rating</small>{player.rating}/100</span>
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Age</small>{player.age}</span>
        </div>
      </div>
    );
  }
  if (manager) {
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-emerald-950 text-white shadow-[0_18px_36px_rgba(16,36,27,0.18)]">
        <div className="relative p-3">
          <div className="pointer-events-none absolute inset-0 opacity-16 [background:linear-gradient(120deg,transparent_0_38%,rgba(255,255,255,0.35)_38%_41%,transparent_41%_62%,rgba(255,255,255,0.16)_62%_64%,transparent_64%)]" />
          <div className="relative grid grid-cols-[5rem_1fr] items-stretch gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-emerald-900/60 shadow-[0_14px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/20">
              <PersonAvatar name={manager.name} seedKey={manager.id} kind="manager" variant="portrait" className="h-24 w-full rounded-none border-0 text-base shadow-none" />
              <span className="absolute bottom-2 right-2 rounded-xl bg-white px-2.5 py-1 text-base font-black text-emerald-950 shadow-[0_8px_14px_rgba(0,0,0,0.18)]">{managerRating(manager)}</span>
            </div>
            <div className="min-w-0 py-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/58">Manager office</p>
              <p className="mt-1 truncate text-xl font-black leading-none">{manager.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-black uppercase text-white/82 ring-1 ring-white/10">{manager.style}</span>
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-black uppercase text-white/82 ring-1 ring-white/10">{manager.personality}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Age</span><b>{manager.age}</b></p>
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Mood</span><b>{moodLabel(current.club.managerTrust ?? 66)}</b></p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 bg-white text-center text-xs text-neutral-900">
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Rating</small>{managerRating(manager)}</span>
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Mood</small>{moodLabel(current.club.managerTrust ?? 66)}</span>
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Wage</small>{formatWeeklyWage(manager.wage)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,_#ffffff,_#f3faf5)] shadow-[0_10px_24px_rgba(16,36,27,0.06)]">
      <div className="flex items-center gap-3 p-3">
        <BrandMark className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_10px_22px_rgba(16,36,27,0.12)]" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase text-primary">Chairman desk</p>
          <p className="truncate text-lg font-black leading-tight">{current.club.name}</p>
          <p className="mt-1 text-xs text-neutral-500">{seasonLabel(save.season)} · {monthForWeek(save.week)} · Period {save.week}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-line bg-white text-center text-xs">
        <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Balance</small>{formatMoney(current.club.finances.balance)}</span>
        <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Board</small>{current.club.boardConfidence}%</span>
        <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Rep</small>{current.club.reputation}</span>
      </div>
    </div>
  );
}

function FinancialRows({ snapshot, testIdPrefix = "financial" }: { snapshot?: FinancialSnapshot; testIdPrefix?: string }) {
  if (!snapshot) return null;
  const positive = snapshot.profit >= 0;
  const prioritizedRows = (rows: [string, number][], priorityLabels: string[], limit: number) => {
    const nonZero = rows.filter(([, amount]) => Number(amount) !== 0);
    const priority = priorityLabels.map((label) => nonZero.find(([rowLabel]) => rowLabel === label)).filter(Boolean) as [string, number][];
    const rest = nonZero.filter(([label]) => !priorityLabels.includes(label));
    return [...priority, ...rest].slice(0, limit);
  };
  const expenses: [string, number][] = [
    ["Player and manager wages", snapshot.expenses.wages],
    ["Stadium running costs", snapshot.expenses.stadiumRunning],
    ["Youth academy", snapshot.expenses.youthAcademy],
    ["Training facilities", snapshot.expenses.trainingFacilities],
    ["Infrastructure spending", snapshot.expenses.infrastructure],
    ["Fees out", snapshot.expenses.feesOut],
  ];
  const income: [string, number][] = [
    ["Fees in", snapshot.income.feesIn],
    ["Ticket sales", snapshot.income.ticketSales],
    ["Food and drink", snapshot.income.foodDrink],
    ["Merchandise", snapshot.income.merchandise],
    ["VIP", snapshot.income.vip],
    ["Prize money", snapshot.income.prizeMoney],
    ["Sponsorship", snapshot.income.sponsorship],
    ["TV", snapshot.income.tv],
  ];
  const compactExpenses = prioritizedRows(expenses, ["Fees out", "Infrastructure spending"], 3);
  const compactIncome = prioritizedRows(income, ["Prize money", "Fees in", "Sponsorship"], 3);
  return (
    <div className="mt-2 grid gap-1.5 text-xs">
      <div className={cn("overflow-hidden rounded-xl border shadow-[0_8px_18px_rgba(16,36,27,0.05)]", positive ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50")}>
        <div className="flex items-center justify-between gap-2 border-b border-white/70 px-2.5 py-1.5">
          <span className="text-[10px] font-black uppercase text-neutral-500">Report period</span>
          <b data-testid={`${testIdPrefix}-period`} className="text-[11px]">{snapshot.month} · Period {snapshot.week}</b>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 px-2.5 py-2">
          <div>
            <p className="text-[10px] font-black uppercase text-neutral-500">{positive ? "Period profit" : "Period loss"}</p>
            <b data-testid={`${testIdPrefix}-result`} className={cn("block text-xl font-black leading-tight", positive ? "text-primary" : "text-danger")}>{formatMoney(snapshot.profit)}</b>
          </div>
          <p className="max-w-[9.4rem] text-right text-[9px] font-semibold leading-tight text-neutral-600">Balance movement<br />Balance moved from {formatMoney(snapshot.balanceBefore)} to {formatMoney(snapshot.balanceAfter)}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Opening <b data-testid={`${testIdPrefix}-opening`} className="block truncate text-[11px]">{formatMoney(snapshot.balanceBefore)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Closing <b data-testid={`${testIdPrefix}-closing`} className="block truncate text-[11px]">{formatMoney(snapshot.balanceAfter)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Income <b data-testid={`${testIdPrefix}-income`} className="block truncate text-[11px] text-primary">{formatMoney(snapshot.totalIncome)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Expenses <b data-testid={`${testIdPrefix}-expenses`} className="block truncate text-[11px] text-danger">{formatMoney(snapshot.totalExpenses)}</b></p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-line bg-white p-1.5">
          <p className="mb-1 text-[9px] font-black uppercase text-neutral-500">Expenses</p>
          <div className="grid gap-0.5">
            {compactExpenses.map(([label, amount]) => (
              <div key={label} className="flex items-center justify-between gap-1 rounded-md bg-surface-muted px-1.5 py-0.5">
                <span className="truncate text-[9px] text-neutral-600">{label}</span>
                <b className="shrink-0 text-[10px] text-danger">-{formatMoney(amount as number)}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-1.5">
          <p className="mb-1 text-[9px] font-black uppercase text-neutral-500">Income</p>
          <div className="grid gap-0.5">
            {compactIncome.map(([label, amount]) => (
              <div key={label} className="flex items-center justify-between gap-1 rounded-md bg-surface-muted px-1.5 py-0.5">
                <span className="truncate text-[9px] text-neutral-600">{label}</span>
                <b className="shrink-0 text-[10px] text-primary">{formatMoney(amount as number)}</b>
              </div>
            ))}
          </div>
        </div>
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
  return (
    <div className="mt-2 grid gap-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {modes.map((item) => (
          <button key={item.mode} onClick={() => setMode(item.mode)} className={cn("rounded-lg border px-2 py-1.5 text-left", mode === item.mode ? "border-primary bg-emerald-50" : "border-line bg-white")}>
            <b className="block text-[11px] leading-tight">{item.label}</b>
            <span className="block truncate text-[10px] font-bold text-neutral-500">{formatMoney(amountFor(item.factor))}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Money <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Wages <b className="block">{formatMoney(current.club.finances.weeklyWages)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1.5">Budget <b className="block">{formatMoney(selectedBudgetAmount)}</b></p>
      </div>
      <Button className="w-full shadow-card" onClick={() => resolve({ mode })}>Set Transfer Budget</Button>
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
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Current wage <b className="block">{formatWeeklyWage(manager.wage)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Expected wage <b className="block">{formatWeeklyWage(expectedWage)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">New wage bill <b className="block">{formatMoney(newWageBill)}/w</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Change <b className="block">{formatSignedMoney(wageBillDelta)}/w</b></p>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase text-neutral-500">Weekly wage</p>
        <div className="grid grid-cols-5 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-2 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>
              {formatWeeklyWage(option)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase text-neutral-500">Contract length</p>
        <div className="grid grid-cols-3 gap-2">
          {yearOptions.map((option) => (
            <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", years === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>
              {option}y
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">A stronger offer makes the club look committed. Letting him leave forces a replacement.</p>
      <DecisionActionRow className="mt-2">
        <Button onClick={() => resolve({ action: "extend", terms: { wage, years } })}>Extend Contract</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "release" })}>Let Him Leave</Button>
      </DecisionActionRow>
    </div>
  );
}

function BuyNegotiationControls({ save, player, proposal }: { save: GameSave; player: Player; proposal: NonNullable<GameSave["currentEvent"]>["proposal"] }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const expectedFee = proposal?.fee ?? player.value;
  const requestedWage = proposal?.requestedWage ?? Math.round(player.wage * 1.2);
  const requestedYears = proposal?.requestedYears ?? 3;
  const feeOptions = uniqueMoneyOptions(expectedFee, [0.9, 1, 1.1], 100).slice(0, 3);
  const wageOptions = uniqueMoneyOptions(requestedWage, [0.95, 1, 1.1], 50).slice(0, 3);
  const yearOptions = Array.from(new Set([Math.max(1, requestedYears - 1), requestedYears, Math.min(5, requestedYears + 1)])).sort((a, b) => a - b);
  const [fee, setFee] = useState(expectedFee);
  const [wage, setWage] = useState(requestedWage);
  const [years, setYears] = useState(requestedYears);
  const sellingClub = proposal?.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
  const selectedWageBill = current.club.finances.weeklyWages + wage;

  return (
    <div className="mt-2 grid gap-1.5">
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <p className="rounded-lg bg-surface-muted px-2 py-1">Selling club <b className="block truncate text-[11px]">{sellingClub?.name ?? "Unknown"}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1">Target identity <b className="block text-[11px]">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1">Expected fee <b className="block text-[11px]">{formatMoney(expectedFee)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1">Wage ask <b className="block text-[11px]">{formatWeeklyWage(requestedWage)}</b></p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase text-neutral-500">Fee</p>
          <div className="grid gap-1">
            {feeOptions.map((option) => (
              <button key={option} onClick={() => setFee(option)} className={cn("rounded-lg border px-1 py-1 text-[10px] font-bold", fee === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatMoney(option)}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase text-neutral-500">Wage</p>
          <div className="grid gap-1">
            {wageOptions.map((option) => (
              <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-1 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase text-neutral-500">Years</p>
          <div className="grid gap-1">
            {yearOptions.map((option) => (
              <button key={option} onClick={() => setYears(option)} className={cn("rounded-lg border px-1 py-1 text-[10px] font-bold", years === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{option}y</button>
            ))}
          </div>
        </div>
      </div>
      <p className="truncate rounded-lg bg-surface-muted px-2 py-1 text-[10px] text-neutral-600">Offer: {formatMoney(fee)} fee, {formatWeeklyWage(wage)}, {years}y. Wage bill {formatMoney(selectedWageBill)}/w.</p>
      <DecisionActionRow className="mt-1 gap-2 pt-1.5">
        <Button onClick={() => resolve({ action: "offer", terms: { fee, wage, years } })}>Submit Offer</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Walk Away</Button>
      </DecisionActionRow>
    </div>
  );
}

function LoanNegotiationControls({ save, player, proposal }: { save: GameSave; player: Player; proposal: NonNullable<GameSave["currentEvent"]>["proposal"] }) {
  const resolve = useGameStore((state) => state.resolveCurrentEvent);
  const current = useCurrent(save)!;
  const loanIn = proposal?.loanDirection !== "out";
  const expectedFee = proposal?.fee ?? Math.round(player.value * 0.03);
  const requestedWage = proposal?.requestedWage ?? Math.abs(proposal?.wageDelta ?? Math.round(player.wage * 0.5));
  const feeOptions = uniqueMoneyOptions(expectedFee, [0.9, 1, 1.1], 100).slice(0, 3);
  const wageOptions = uniqueMoneyOptions(requestedWage, [0.85, 1, 1.15], 50).slice(0, 3);
  const [fee, setFee] = useState(expectedFee);
  const [wage, setWage] = useState(requestedWage);
  const sourceClub = proposal?.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
  const destinationClub = proposal?.toClubId ? save.clubs[proposal.toClubId] : undefined;
  const selectedWageBill = current.club.finances.weeklyWages + wage;

  if (!loanIn) {
    return (
      <div className="mt-2 grid gap-1.5">
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <p className="rounded-lg bg-surface-muted px-2 py-1">Loan club <b className="block truncate text-[11px]">{destinationClub?.name ?? "Unknown"}</b></p>
          <p className="rounded-lg bg-surface-muted px-2 py-1">Player <b className="block text-[11px]">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
          <p className="rounded-lg bg-surface-muted px-2 py-1">Loan fee in <b className="block text-[11px]">{formatMoney(expectedFee)}</b></p>
          <p className="rounded-lg bg-surface-muted px-2 py-1">Weekly covered <b className="block text-[11px]">{formatWeeklyWage(requestedWage)}</b></p>
        </div>
        <p className="rounded-lg bg-surface-muted px-2 py-1 text-[10px] text-neutral-600">The manager is comfortable with a temporary move. Fee in {formatMoney(expectedFee)} and wage pressure falls.</p>
        <DecisionActionRow className="mt-1 gap-2 pt-1.5">
          <Button onClick={() => resolve({ action: "offer", terms: { fee: expectedFee, wage: requestedWage, years: 1 } })}>Accept Loan</Button>
          <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Reject</Button>
        </DecisionActionRow>
      </div>
    );
  }

  return (
    <div className="mt-2 grid gap-1.5">
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <p className="rounded-lg bg-surface-muted px-2 py-1">Parent club <b className="block truncate text-[11px]">{sourceClub?.name ?? "Unknown"}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1">Target <b className="block text-[11px]">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1">Expected loan fee <b className="block text-[11px]">{formatMoney(expectedFee)}</b></p>
        <p className="rounded-lg bg-surface-muted px-2 py-1">Wage contribution <b className="block text-[11px]">{formatWeeklyWage(requestedWage)}</b></p>
      </div>
      <div>
        <p className="mb-1 text-[9px] font-bold uppercase text-neutral-500">Loan fee</p>
        <div className="grid grid-cols-3 gap-1">
          {feeOptions.map((option) => (
            <button key={option} onClick={() => setFee(option)} className={cn("rounded-lg border px-1 py-1 text-[10px] font-bold", fee === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatMoney(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[9px] font-bold uppercase text-neutral-500">Weekly contribution</p>
        <div className="grid grid-cols-3 gap-1">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-1 py-1 text-[10px] font-bold", wage === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
          ))}
        </div>
      </div>
      <p className="truncate rounded-lg bg-surface-muted px-2 py-1 text-[10px] text-neutral-600">Selected: {formatMoney(fee)} fee and {formatWeeklyWage(wage)}. Wage bill {formatMoney(selectedWageBill)}/w.</p>
      <DecisionActionRow className="mt-1 gap-2 pt-1.5">
        <Button onClick={() => resolve({ action: "offer", terms: { fee, wage, years: 1 } })}>Submit Loan</Button>
        <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Walk Away</Button>
      </DecisionActionRow>
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
    const timer = window.setTimeout(() => setMinute((value) => Math.min(90, value + 1)), 135);
    return () => window.clearTimeout(timer);
  }, [minute]);
  const visibleEvents = result.events.filter((event) => event.minute <= minute);
  const homeGoals = visibleEvents.filter((event) => event.type === "goal" && event.clubId === home.id).length;
  const awayGoals = visibleEvents.filter((event) => event.type === "goal" && event.clubId === away.id).length;
  const progress = minute / 90;
  const visibleHomeShots = Math.round(result.homeShots * progress);
  const visibleAwayShots = Math.round(result.awayShots * progress);
  const visibleHomeOnTarget = Math.round(result.homeOnTarget * progress);
  const visibleAwayOnTarget = Math.round(result.awayOnTarget * progress);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle_at_top,_#135f36,_#071510_70%)] p-2">
      <div role="dialog" aria-modal="true" aria-labelledby="live-match-title" className="flex h-full max-h-full w-full max-w-md flex-col overflow-hidden rounded-[1.4rem] border border-white/15 bg-white shadow-[0_28px_70px_rgba(0,0,0,0.36)]">
        <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,_#10241b,_#0f8139_62%,_#1aa24f)] px-4 py-4 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.28)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.16)_58%_60%,transparent_60%)]" />
          <div className="relative flex items-center justify-between gap-3">
            <h2 id="live-match-title" className="rounded-full bg-white/14 px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-white/20">Live match</h2>
            <p data-testid="live-minute" className="rounded-full bg-emerald-950/60 px-3 py-1 text-sm font-black ring-1 ring-white/15">{minute}&apos;</p>
          </div>
          <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <p className="min-w-0 text-right text-sm font-black leading-tight">{home.name}</p>
            <p className="rounded-2xl bg-white px-4 py-3 text-3xl font-black text-emerald-950 shadow-[0_12px_26px_rgba(0,0,0,0.18)]">{homeGoals}-{awayGoals}</p>
            <p className="min-w-0 text-left text-sm font-black leading-tight">{away.name}</p>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto_auto] gap-3 p-3">
          <div className="relative min-h-0 overflow-hidden rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,_#0e8f43,_#0b6f35)] p-4 text-white shadow-[0_12px_30px_rgba(16,36,27,0.14)]">
            <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/35" />
            <div className="pointer-events-none absolute left-1/2 top-3 h-[calc(100%-1.5rem)] w-px bg-white/30" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
            <div className="relative">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/75">
                <span>Kickoff</span>
                <span>Final whistle</span>
              </div>
              <div className="mt-12 h-3 rounded-full bg-emerald-950/45 ring-1 ring-white/25">
                <div className="h-3 rounded-full bg-white transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <p className="rounded-xl bg-surface-muted px-2 py-3"><b>{result.possessionHome}%</b><span className="block text-[10px] font-bold uppercase text-neutral-500">Possession</span></p>
            <p className="rounded-xl bg-surface-muted px-2 py-3"><b>{visibleHomeShots}-{visibleAwayShots}</b><span className="block text-[10px] font-bold uppercase text-neutral-500">Shots</span></p>
            <p className="rounded-xl bg-surface-muted px-2 py-3"><b>{visibleHomeOnTarget}-{visibleAwayOnTarget}</b><span className="block text-[10px] font-bold uppercase text-neutral-500">On target</span></p>
          </div>

          <div className="rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f5faf6)] p-3">
            <p className="mb-2 text-xs font-black uppercase text-neutral-500">Match feed</p>
            <div className="space-y-2">
              {visibleEvents.length === 0 ? <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-neutral-500">No major events yet.</p> : visibleEvents.slice(-5).map((matchEvent, index) => (
                <div key={`${matchEvent.minute}-${index}`} className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm", matchEvent.type === "goal" ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100" : "bg-surface-muted")}>
                  <PersonAvatar name={matchEvent.playerName} className="h-7 w-7 shrink-0 rounded-md text-[10px]" />
                  <p className="min-w-0 truncate"><b>{matchEvent.minute}&apos;</b> {matchEvent.description}</p>
                </div>
              ))}
              {minute >= 90 ? <p className="rounded-xl bg-emerald-950 px-3 py-2 text-sm font-bold text-white">90&apos; Final whistle.</p> : null}
            </div>
          </div>
        </div>
        {minute >= 90 ? <div className="shrink-0 border-t border-line p-3"><Button className="w-full shadow-card" onClick={() => finishLiveMatch()}>Continue</Button></div> : null}
      </div>
    </div>
  );
}

function SeasonSummaryPanel({ history }: { history: SeasonHistory }) {
  const goalDifference = (history.goalsFor ?? 0) - (history.goalsAgainst ?? 0);
  const outcomeLabel = history.outcome === "promoted" ? "Promoted" : history.outcome === "relegated" ? "Relegated" : "Stayed";
  const outcomeTone = history.outcome === "promoted" ? "positive" : history.outcome === "relegated" ? "negative" : "neutral";
  const impact = history.seasonImpact;
  return (
    <div className="mt-2 grid gap-1.5">
      <div className={cn(
        "overflow-hidden rounded-xl border shadow-[0_10px_22px_rgba(16,36,27,0.08)]",
        outcomeTone === "positive" && "border-emerald-100 bg-[linear-gradient(135deg,_#ecfdf5,_#ffffff)]",
        outcomeTone === "negative" && "border-red-100 bg-[linear-gradient(135deg,_#fff1f2,_#ffffff)]",
        outcomeTone === "neutral" && "border-line bg-[linear-gradient(135deg,_#f5faf6,_#ffffff)]",
      )}>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2",
          outcomeTone === "positive" && "bg-emerald-950 text-white",
          outcomeTone === "negative" && "bg-red-950 text-white",
          outcomeTone === "neutral" && "bg-[linear-gradient(135deg,_#10241b,_#155f3a)] text-white",
        )}>
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg font-black", outcomeTone === "positive" && "text-primary", outcomeTone === "negative" && "text-danger", outcomeTone === "neutral" && "text-emerald-950")}>{ordinal(history.position)}</span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-white/70">{history.divisionName}</p>
            <p className="text-base font-black leading-tight">{outcomeLabel}</p>
            <p className="truncate text-[11px] text-white/70">Next: {history.nextDivisionName ?? history.divisionName}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-white/40 bg-white text-center text-[11px]">
          <span className="px-1.5 py-2 font-black"><small className="block text-[9px] text-neutral-500">Pts</small>{history.points}</span>
          <span className="px-1.5 py-2 font-black"><small className="block text-[9px] text-neutral-500">W-D-L</small>{history.won ?? 0}-{history.drawn ?? 0}-{history.lost ?? 0}</span>
          <span className="px-1.5 py-2 font-black"><small className="block text-[9px] text-neutral-500">GD</small>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</span>
          <span className="px-1.5 py-2 font-black"><small className="block text-[9px] text-neutral-500">P</small>{history.played ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <EventMetricTile label="Season award" value={formatMoney(history.prizeMoney ?? 0)} tone={(history.prizeMoney ?? 0) > 0 ? "positive" : "neutral"} />
        <EventMetricTile label="Closing balance" value={formatMoney(history.balance)} tone={history.balance < 0 ? "negative" : "neutral"} />
        <EventMetricTile label="Cup run" value={history.cupSummary ?? "No cup record."} />
        <EventMetricTile label="Next league" value={history.nextDivisionName ?? history.divisionName} />
      </div>

      {impact ? (
        <p className="rounded-xl border border-line bg-white px-3 py-1.5 text-[11px] leading-4 text-neutral-600">
          Season impact: balance {formatSignedMoney(impact.balanceAfter - impact.balanceBefore)}. Board mood {moodLabel(impact.boardConfidenceAfter)}. Manager mood {moodLabel(impact.managerTrustAfter)}.
        </p>
      ) : null}
    </div>
  );
}

function EventMetricTile({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: "neutral" | "positive" | "negative" | "dark" }) {
  return (
    <p className={cn(
      "min-w-0 rounded-xl px-3 py-2 text-xs",
      tone === "positive" && "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100",
      tone === "negative" && "bg-red-50 text-red-950 ring-1 ring-red-100",
      tone === "dark" && "bg-emerald-950 text-white",
      tone === "neutral" && "bg-surface-muted text-neutral-700",
    )}>
      <span className={cn("block text-[10px] font-black uppercase", tone === "dark" ? "text-white/65" : "text-neutral-500")}>{label}</span>
      <b className="mt-1 block truncate text-sm leading-tight">{value}</b>
    </p>
  );
}

function SpecialEventPanel({ save }: { save: GameSave }) {
  const event = save.currentEvent;
  const current = useCurrent(save)!;
  if (!event) return null;
  const player = event.playerId ? save.players[event.playerId] : undefined;
  const manager = event.managerId ? save.managers[event.managerId] : current.manager;
  const balance = current.club.finances.balance;
  const debtLimit = current.club.finances.debtLimit;
  const debtHeadroom = balance - debtLimit;
  const latestSnapshot = event.financialSnapshot ?? latestFinancialSnapshot(save);
  const avgRating = Math.round(current.players.reduce((sum, squadPlayer) => sum + squadPlayer.rating, 0) / Math.max(1, current.players.length));

  if (event.type === "bank_warning") {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-red-100 bg-[linear-gradient(180deg,_#fff7f7,_#ffffff)] shadow-[0_10px_24px_rgba(127,29,29,0.08)]">
        <div className="flex items-center gap-3 border-b border-red-100 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white"><Landmark size={20} /></span>
          <div>
            <p className="text-xs font-black uppercase text-red-700">Bank position</p>
            <p className="text-sm font-bold text-red-950">Debt limit is now the critical number.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          <EventMetricTile label="Balance" value={formatMoney(balance)} tone="negative" />
          <EventMetricTile label="Debt limit" value={formatMoney(debtLimit)} tone="negative" />
          <EventMetricTile label={debtHeadroom >= 0 ? "Headroom" : "Over limit"} value={formatMoney(Math.abs(debtHeadroom))} tone={debtHeadroom >= 0 ? "neutral" : "negative"} />
        </div>
      </div>
    );
  }

  if (event.type === "manager_frustrated" || event.type === "manager_retirement_hint") {
    const retirement = event.type === "manager_retirement_hint";
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f6fbf7)] shadow-[0_10px_24px_rgba(16,36,27,0.06)]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-white", retirement ? "bg-amber-500" : "bg-red-600")}><UserCog size={20} /></span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-primary">{retirement ? "Contract mood" : "Manager relationship"}</p>
            <p className="truncate text-sm font-bold">{manager?.name ?? "Manager"} · {manager ? managerRating(manager) : "-"} rating</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          <EventMetricTile label="Manager mood" value={moodLabel(current.club.managerTrust)} tone={current.club.managerTrust < 50 ? "negative" : "neutral"} />
          <EventMetricTile label={retirement ? "Contract" : "Budget"} value={retirement ? `${manager?.contractYears ?? 0}y` : save.transferBudget ? save.transferBudget.mode : "Unset"} />
          <EventMetricTile label={retirement ? "Wage" : "Balance"} value={retirement ? (manager ? formatWeeklyWage(manager.wage) : "-") : formatMoney(balance)} tone={!retirement && balance < 0 ? "negative" : "neutral"} />
        </div>
      </div>
    );
  }

  if (event.type === "hall_of_fame" && player) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-amber-100 bg-[linear-gradient(135deg,_#fff7dc,_#ffffff_68%)] shadow-[0_12px_28px_rgba(146,64,14,0.1)]">
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-white"><Trophy size={24} /></span>
          <div>
            <p className="text-xs font-black uppercase text-amber-700">Club legacy</p>
            <p className="text-lg font-black leading-tight">{player.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-amber-100 bg-white/65 text-center text-xs">
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">Apps</small>{player.careerStats.apps}</span>
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">Goals</small>{player.careerStats.goals}</span>
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">Rating</small>{player.rating}/100</span>
        </div>
      </div>
    );
  }

  if (event.type === "sale_confirmed" && player) {
    const buyer = player.clubId ? save.clubs[player.clubId] : undefined;
    return (
      <div className="mt-4 grid grid-cols-2 gap-2">
        <EventMetricTile label="Moved to" value={buyer?.name ?? "Buying club"} />
        <EventMetricTile label="Wage removed" value={formatWeeklyWage(player.wage)} tone="positive" />
        <EventMetricTile label="Position" value={displayPosition(player.position)} />
        <EventMetricTile label="Squad average" value={`${avgRating}/100`} />
      </div>
    );
  }

  if (event.type === "youth_promoted" && player) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,_#f0fdf4,_#ffffff)] shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
        <div className="flex items-center gap-3 border-b border-emerald-100 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white"><Sprout size={20} /></span>
          <div>
            <p className="text-xs font-black uppercase text-primary">Academy graduate</p>
            <p className="text-sm font-bold">First-team contract now active.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          <EventMetricTile label="Position" value={displayPosition(player.position)} />
          <EventMetricTile label="Rating" value={`${player.rating}/100`} />
          <EventMetricTile label="Wage" value={formatWeeklyWage(player.wage)} />
        </div>
      </div>
    );
  }

  if (event.type === "contract_response" && player) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        <EventMetricTile label="Player" value={player.name} />
        <EventMetricTile label="Morale" value={`${player.morale}%`} tone={player.morale < 55 ? "negative" : "neutral"} />
        <EventMetricTile label="Manager mood" value={moodLabel(current.club.managerTrust)} tone={current.club.managerTrust < 50 ? "negative" : "neutral"} />
      </div>
    );
  }

  if (event.type === "transfer_window_open" || event.type === "average_crowd_report") {
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        <EventMetricTile label="Balance" value={formatMoney(balance)} tone={balance < 0 ? "negative" : "neutral"} />
        <EventMetricTile label="Stadium" value={current.club.stadium.capacity.toLocaleString()} />
        <EventMetricTile label="Last result" value={latestSnapshot ? formatMoney(latestSnapshot.profit) : "No report"} tone={latestSnapshot && latestSnapshot.profit >= 0 ? "positive" : "negative"} />
      </div>
    );
  }

  return null;
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
  const presentation = buildEventPresentation(save)!;
  const hasInlineActions = ["transfer_budget", "manager_contract_decision", "contract_offer", "incoming_bid", "sale_ready", "youth_contract", "match_preview"].includes(event.type);

  if (result && save.liveMatch && !save.liveMatch.finished) return <LiveMatchModal save={save} result={result} />;

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-[radial-gradient(circle_at_top,_rgba(15,129,57,0.24),_rgba(16,36,27,0.7))] p-2 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="event-title" className="flex h-full max-h-full w-full max-w-md flex-col overflow-hidden rounded-[1.35rem] border border-white/40 bg-white shadow-[0_28px_70px_rgba(16,36,27,0.32)]">
        <div className={cn("relative shrink-0 overflow-hidden px-4 py-3", presentation.tone.header)}>
          <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.35)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.18)_58%_60%,transparent_60%)]" />
          <div className="relative flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1", presentation.tone.chip)}>{presentation.statusLabel}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1", presentation.tone.chip)}>{presentation.category}</span>
            <span className="ml-auto rounded-full bg-black/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/85 ring-1 ring-white/15">{presentation.queueLabel}</span>
          </div>
          <h2 id="event-title" className="relative mt-2 truncate text-xl font-black leading-tight">{event.title}</h2>
          <p className="relative mt-1 text-xs font-semibold text-white/75">{presentation.periodLabel}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          <EventEntityHeader save={save} />
          <div className={cn("mt-2 rounded-xl px-3 py-2 text-sm leading-5 ring-1", presentation.tone.accent)}>
            {shortCopy(event.body)}
          </div>
          {presentation.showEventNote ? <p className="mt-2 rounded-xl border border-line bg-surface-muted px-3 py-2 text-xs leading-4 text-neutral-600"><b className="block text-neutral-800">Context</b>{shortCopy(event.note, event.type === "match_result" ? 150 : 110, event.type === "match_result" ? 3 : 2)}</p> : null}
          <SpecialEventPanel save={save} />

        {event.type === "season_intro" ? (
          <div className="mt-2 grid gap-1.5">
            {save.divisions.map((division) => (
              <div key={division.id} className={cn("rounded-lg border px-3 py-1.5 text-xs", division.id === current.club.divisionId ? "border-primary bg-emerald-50 font-bold text-primary" : "border-line")}>
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
            <ContractOfferControls player={player} requestedWage={requestedWage} requestedYears={requestedYears} approve={(terms) => resolve({ action: "offer", terms })} reject={() => resolve({ action: "reject" })} />
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
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
              <p className="rounded-lg bg-surface-muted px-2 py-1.5">Bidding club <b className="block truncate">{proposal.toClubId ? save.clubs[proposal.toClubId]?.name ?? "Unknown" : "Unknown"}</b></p>
              <p className="rounded-lg bg-surface-muted px-2 py-1.5">Squad identity <b className="block">{displayPosition(player.position)} · {player.rating}/100 · Age {player.age}</b></p>
            </div>
          ) : null}
          {player && proposal ? (() => {
            const saleImpact = calculateSaleImpact(save, player, proposal.fee);
            return (
              <ImpactBox className="mt-2">
                <b className="block">Sale decision</b>
                Manager view: {saleImpact.starter ? "protect the squad if he leaves" : "open to a fair sale"}.
                <span className="block truncate">{saleImpact.summary}</span>
              </ImpactBox>
            );
          })() : (
            <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">The manager&apos;s reaction depends on role and fee.</p>
          )}
          <DecisionActionRow className="mt-2">
            <Button onClick={() => resolve({ action: "accept" })}>Accept Bid</Button>
            <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Reject Bid</Button>
          </DecisionActionRow>
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
                    <span className="block">{saleImpact.summary}</span>
                    <span className="block">Cancelling keeps the player and makes no immediate finance change.</span>
                  </ImpactBox>
                );
              })()
            ) : null}
            <DecisionActionRow className="mt-5">
              <Button onClick={() => resolve({ action: "confirm" })}>Confirm Sale</Button>
              <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Cancel</Button>
            </DecisionActionRow>
          </>
        ) : null}

        {event.type === "youth_contract" ? (
          <>
            {player ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <p className="rounded-lg bg-surface-muted px-3 py-2">Academy rating <b className="block">{player.rating}/100</b></p>
                  <p className="rounded-lg bg-surface-muted px-3 py-2">Potential <b className="block">{player.potential}/100</b></p>
                  <p className="rounded-lg bg-surface-muted px-3 py-2">Position <b className="block">{displayPosition(player.position)}</b></p>
                  <p className="rounded-lg bg-surface-muted px-3 py-2">Projected wage <b className="block">{formatWeeklyWage(Math.max(player.wage, Math.round(player.rating * 95)))}</b></p>
                </div>
                <ImpactBox className="mt-3">
                  <b className="block">Youth decision impact</b>
                  Offer contract: weekly wage bill rises and player morale improves. Release: no wage cost, player leaves the club.
                </ImpactBox>
              </>
            ) : null}
            <DecisionActionRow className="mt-5">
              <Button onClick={() => resolve({ action: "offer" })}>Offer Contract</Button>
              <Button variant="secondary" onClick={() => resolve({ action: "release" })}>Release</Button>
            </DecisionActionRow>
          </>
        ) : null}

        {event.type === "match_preview" ? (
          <>
            {nextFixture?.competition === "cup" ? (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-primary">
                {save.cup.name} · {cupRoundName(nextFixture.cupRound ?? save.cup.round)}
              </p>
            ) : null}
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f3faf5)] shadow-[0_10px_24px_rgba(16,36,27,0.06)]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch text-center">
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Home</p>
                  <p className="mt-2 text-base font-black leading-tight">{nextFixture ? save.clubs[nextFixture.homeClubId].name : current.club.name}</p>
                </div>
                <div className="grid place-items-center border-x border-line px-3">
                  <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-black uppercase text-white">vs</span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Away</p>
                  <p className="mt-2 text-base font-black leading-tight">{nextFixture ? save.clubs[nextFixture.awayClubId].name : "Opponent"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-line bg-white text-center text-xs">
                <p className="px-2 py-2"><span className="block font-black text-neutral-500">Venue</span><b>{nextFixture?.homeClubId === current.club.id ? "Home" : "Away"}</b></p>
                <p className="px-2 py-2"><span className="block font-black text-neutral-500">Month</span><b>{monthForWeek(event.createdWeek || save.week)}</b></p>
                <p className="px-2 py-2"><span className="block font-black text-neutral-500">Mode</span><b>No tactics</b></p>
              </div>
            </div>
            <DecisionActionRow className="mt-5">
              <Button variant="secondary" onClick={() => resolve({ action: "see" })}>See Match</Button>
              <Button onClick={() => resolve({ action: "play" })}><Play size={16} /> Play Match</Button>
            </DecisionActionRow>
          </>
        ) : null}

        {result && save.lastMatch ? (
          <>
            <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f3faf5)] shadow-[0_10px_24px_rgba(16,36,27,0.06)]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center">
                <div className="p-2.5">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Home</p>
                  <p className="mt-1 text-sm font-black leading-tight">{save.clubs[save.lastMatch.homeClubId].name}</p>
                </div>
                <div className="px-2 py-2.5">
                  <p className="rounded-2xl bg-emerald-950 px-3 py-2 text-2xl font-black text-white">{result.homeGoals}-{result.awayGoals}</p>
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Away</p>
                  <p className="mt-1 text-sm font-black leading-tight">{save.clubs[save.lastMatch.awayClubId].name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-line bg-white text-center text-[11px]">
                <p className="px-2 py-1.5"><b className="block text-xs">{result.possessionHome}%</b><span className="text-neutral-500">Possession</span></p>
                <p className="px-2 py-1.5"><b className="block text-xs">{result.homeShots}-{result.awayShots}</b><span className="text-neutral-500">Shots</span></p>
                <p className="px-2 py-1.5"><b className="block text-xs">{result.homeOnTarget}-{result.awayOnTarget}</b><span className="text-neutral-500">On target</span></p>
              </div>
            </div>
            <div className="mt-2 grid gap-1.5">
              {result.events.length === 0 ? (
                <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">No major match events recorded.</div>
              ) : result.events.slice(0, 3).map((matchEvent, index) => (
                <div key={`${matchEvent.minute}-${index}`} className="flex items-center gap-2 rounded-lg bg-surface-muted px-2 py-1 text-[11px] leading-tight">
                  <PersonAvatar name={matchEvent.playerName} className="h-6 w-6 rounded-md text-[9px]" />
                  <p className="truncate">{matchEvent.minute}&apos; {matchEvent.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {nextFixture && event.type === "match_preview" ? <p className="mt-3 text-center text-xs text-neutral-500">{save.clubs[nextFixture.homeClubId].name} vs {save.clubs[nextFixture.awayClubId].name}</p> : null}
        </div>
        {!hasInlineActions ? (
          <div className="shrink-0 border-t border-line bg-white p-2">
            <Button className="w-full shadow-card" onClick={() => resolve({ action: "continue" })}>Continue</Button>
          </div>
        ) : null}
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
  const bankAfterUpgrade = current.club.finances.balance - upgradeCost;

  async function upgrade() {
    if (isTraining) await upgradeTraining(levels);
    else await upgradeYouth(levels);
  }

  async function downgrade() {
    if (isTraining) await downgradeTraining(levels);
    else await downgradeYouth(levels);
  }

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-emerald-950/55 p-2">
      <div role="dialog" aria-modal="true" aria-labelledby="facility-title" className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl bg-white p-4 shadow-2xl">
        <p className="text-xs font-semibold uppercase text-primary">Facility management</p>
        <h2 id="facility-title" className="mt-1 text-lg font-bold">{title}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-lg bg-surface-muted px-3 py-2">Current level <b className="block text-xl">{level}/99</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Selected <b className="block text-xl">+{targetLevels} / -{lowerLevels}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Target level <b className="block">{targetLevel}/99</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Reduced level <b className="block">{reducedLevel}/99</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Upgrade cost <b className="block">{formatMoney(upgradeCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Bank after <b className={cn("block", bankAfterUpgrade < 0 && "text-danger")}>{formatMoney(bankAfterUpgrade)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Upkeep now <b className="block">{formatMoney(current.club.finances.upkeep)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Upkeep after <b className="block">{formatMoney(newWeeklyCost)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Weekly saving <b className="block">{formatMoney(upkeepDecrease)}</b></p>
          <p className="rounded-lg bg-surface-muted px-3 py-2">Facility cost <b className="block">{formatMoney(currentFacilityWeeklyCost)}</b></p>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((option) => (
            <button key={option} onClick={() => setLevels(option)} className={cn("rounded-lg border py-2 text-xs font-black", levels === option ? "border-primary bg-primary text-white" : "border-line bg-white")}>{option} level{option > 1 ? "s" : ""}</button>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-5 text-neutral-600">Lowering levels gives no refund. It only reduces weekly upkeep.</p>
        <div className="mt-auto grid grid-cols-2 gap-3 bg-white pt-3">
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
  const updateUiState = useGameStore((state) => state.updateUiState);
  const [facilityModal, setFacilityModal] = useState<FacilityKind | undefined>();
  const setActiveTab = (nextTab: Tab) => {
    clearMessage();
    void updateUiState({ activeTab: nextTab });
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
  const tab = normalizeTab(save.ui?.activeTab);

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
      <Header save={save} />
      {showMessage ? <div role="status" className="absolute inset-x-3 top-[4.6rem] z-20 rounded-full border border-emerald-900/10 bg-emerald-950 px-3 py-2 text-center text-xs font-semibold text-white shadow-[0_10px_22px_rgba(16,36,27,0.18)]">{message}</div> : null}
      <div className="min-h-0 flex-1 overflow-hidden p-3">
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
