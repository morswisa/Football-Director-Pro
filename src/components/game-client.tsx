"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, CalendarDays, Copy, Download, Dumbbell, FileJson, Landmark, ListOrdered, Play, Save, Settings, ShieldCheck, Sprout, Trash2, Trophy, Type, Upload, UserCog, UsersRound, Volume2, Wallet } from "lucide-react";
import { AppFrame } from "./app-frame";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";
import { Card, StatCard } from "./ui/card";
import { calculateSaleImpact, evaluateManager, generateManagerHireOffer, latestFinancialSnapshot, leagueTable, managerActionLocked } from "@/game/engine";
import { calculateManagerCompensation, calculateRecommendedManagerWage, managerRating } from "@/game/economy";
import { cupRoundName, monthForWeek, nextUpgradeCost, seasonLabel } from "@/game/calendar";
import type { ContractTerms, FinancialSnapshot, GameEventType, GameSave, MatchResult, Player, Position, SeasonHistory, TransferBudgetMode } from "@/game/types";
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

function eventCategory(type: GameEventType) {
  if (["match_preview", "match_result"].includes(type)) return "Match day";
  if (["financial_report", "bank_warning", "transfer_budget"].includes(type)) return "Club finance";
  if (["contract_offer", "contract_response", "incoming_bid", "sale_ready", "sale_confirmed"].includes(type)) return "Squad business";
  if (["manager_frustrated", "manager_retirement_hint", "manager_contract_decision"].includes(type)) return "Manager office";
  if (["youth_contract", "youth_promoted"].includes(type)) return "Academy";
  if (["season_intro", "season_summary", "transfer_window_open", "average_crowd_report"].includes(type)) return "Season desk";
  if (type === "hall_of_fame") return "Club legacy";
  return "Club update";
}

function eventToneClasses(variant?: "positive" | "negative" | "neutral") {
  if (variant === "negative") {
    return {
      header: "bg-[linear-gradient(135deg,_#331116,_#9f1d32)] text-white",
      chip: "bg-white/14 text-white ring-white/20",
      accent: "bg-red-50 text-danger ring-red-100",
    };
  }
  if (variant === "positive") {
    return {
      header: "bg-[linear-gradient(135deg,_#10241b,_#108842_60%,_#2bbf64)] text-white",
      chip: "bg-white/14 text-white ring-white/20",
      accent: "bg-emerald-50 text-primary ring-emerald-100",
    };
  }
  return {
    header: "bg-[linear-gradient(135deg,_#10241b,_#155f3a_58%,_#295e9c)] text-white",
    chip: "bg-white/14 text-white ring-white/20",
    accent: "bg-surface-muted text-neutral-700 ring-line",
  };
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

function ImpactBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950", className)}>
      {children}
    </div>
  );
}

function DecisionActionRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 border-t border-line bg-white pt-3", className)}>
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

function PersonAvatar({ name, seedKey, kind = "player", variant = "thumb", className }: { name: string; seedKey?: string; kind?: "player" | "manager"; variant?: "thumb" | "portrait"; className?: string }) {
  const seed = avatarSeed(seedKey ?? name);
  const reactId = useId().replaceAll(":", "");
  const id = `avatar-${reactId}-${seed}`;
  const isPortrait = variant === "portrait";
  const viewHeight = isPortrait ? 130 : 100;
  const skin = avatarPick(seed, ["#f1b889", "#d9966b", "#bd7855", "#95573e", "#e3a06f", "#c9865f"], 1);
  const skinLight = avatarPick(seed, ["#ffd0a6", "#efb280", "#da8d62", "#b36c4b", "#f4bf91"], 2);
  const skinMid = avatarPick(seed, ["#c87952", "#aa6044", "#87503b", "#70402f", "#b66e4b"], 3);
  const skinShadow = avatarPick(seed, ["#7b3e30", "#633328", "#553025", "#8b4a35", "#49281f"], 4);
  const hair = avatarPick(seed, ["#15100e", "#241711", "#352113", "#101827", "#4b2f1e", "#5c3a21"], 5);
  const hairLight = avatarPick(seed, ["#5a351f", "#7a4b28", "#8a5d35", "#2d3a50", "#6b4327"], 6);
  const shirt = kind === "manager" ? avatarPick(seed, ["#16221b", "#24313a", "#303946", "#123d2a"], 7) : avatarPick(seed, ["#138947", "#0f6f6e", "#2455b8", "#5527a8", "#1f3e8a", "#8f1734"], 7);
  const accent = avatarPick(seed, ["#f8fafc", "#f5c542", "#2fe37f", "#8dc5ff", "#f97835", "#d8e1ef"], 8);
  const bgHue = avatarRange(seed, 145, 250, 9);
  const faceShape = avatarPick(seed, ["blade", "square", "narrow", "heavy"], 10);
  const hairStyle = avatarPick(seed, ["undercut", "swept", "textured", "spikes", "tight", "fringe"], 11);
  const eyeY = avatarRange(seed, 43, 46, 12);
  const browTilt = avatarRange(seed, -3, 3, 13);
  const noseX = avatarRange(seed, 54, 59, 14);
  const mouthY = avatarRange(seed, 64, 67, 15);
  const headTilt = avatarRange(seed, -4, 4, 16);
  const eyeStyle = avatarPick(seed, ["focused", "narrow", "round", "heavy", "wide"], 17);
  const browStyle = avatarPick(seed, ["straight", "arched", "low", "split", "severe"], 18);
  const noseStyle = avatarPick(seed, ["straight", "hook", "wide", "sharp", "flat"], 19);
  const mouthStyle = avatarPick(seed, ["flat", "pressed", "smirk", "downturn", "soft"], 20);
  const cheekStyle = avatarPick(seed, ["blade", "soft", "hollow", "high"], 21);
  const hairlineStyle = avatarPick(seed, ["low", "widow", "receding", "broken", "straight"], 22);
  const facialHairStyle = kind === "manager"
    ? avatarPick(seed, ["stubble", "beard", "moustache", "goatee", "clean"], 23)
    : avatarPick(seed, ["clean", "stubble", "moustache", "goatee"], 23);
  const portraitArchetype = avatarPick(seed, ["athletic", "angular", "veteran", "lean", "broad"], 24);
  const lightAngle = avatarPick(seed, ["left", "front", "right"], 25);
  const hairTexture = avatarPick(seed, ["chunky", "wispy", "crop", "wet", "brush"], 26);
  const jawStyle = avatarPick(seed, ["chiselled", "soft-square", "pointed", "wide"], 27);
  const earStyle = avatarPick(seed, ["low", "sharp", "round"], 28);
  const highlightBias = avatarPick(seed, ["temple", "cheek", "nose", "jaw"], 29);
  const hairVolume = avatarPick(seed, ["flat", "crest", "messy", "slick"], 30);
  const expressionAsymmetry = avatarPick(seed, ["left", "right", "center"], 31);
  const facePlaneStyle = avatarPick(seed, ["hard-left", "hard-right", "center-ridge", "soft-mask"], 32);
  const eyeSpread = avatarRange(seed, -2, 3, 33);
  const hairDepth = avatarPick(seed, ["temple-fade", "forelock", "crown", "taper"], 34);
  const underEyeDepth = avatarPick(seed, ["clean", "tired", "sharp", "heavy"], 35);
  const mirror = seed % 2 === 0;
  const hasStubble = facialHairStyle === "stubble" || facialHairStyle === "beard" || facialHairStyle === "goatee";
  const hasBeard = facialHairStyle === "beard";
  const hasMoustache = facialHairStyle === "moustache" || facialHairStyle === "goatee" || facialHairStyle === "beard";
  const hasGlasses = kind === "manager" && seed % 6 === 0;
  const hasScar = seed % 17 === 0;
  const hasAgeLines = kind === "manager" || portraitArchetype === "veteran" || seed % 11 === 0;
  const hasSideburns = hairStyle === "undercut" || hairStyle === "tight" || seed % 5 === 0;
  const faceInk = "#2d1712";
  const baseFacePath = faceShape === "square"
    ? "M34 38 C36 25 50 18 65 24 C75 29 78 43 74 57 L69 68 L59 77 L45 76 L36 66 C31 57 30 45 34 38 Z"
    : faceShape === "narrow"
      ? "M39 36 C41 22 55 18 67 27 C77 35 75 51 69 65 C63 79 48 80 40 68 C34 59 34 45 39 36 Z"
      : faceShape === "heavy"
        ? "M33 39 C34 25 52 17 68 26 C78 34 78 52 70 66 L60 78 L43 75 L34 64 C29 54 29 44 33 39 Z"
        : "M36 37 C39 24 53 18 66 25 C76 32 76 50 69 64 C63 76 49 80 39 69 C32 58 32 45 36 37 Z";
  const archetypeFacePath = portraitArchetype === "angular"
    ? "M38 34 C42 22 56 17 68 24 L76 37 L72 56 L64 71 L51 80 L39 68 L34 52 Z"
    : portraitArchetype === "veteran"
      ? "M34 38 C35 25 51 18 67 25 C79 34 78 53 70 67 L60 78 L45 77 L35 65 C30 55 30 45 34 38 Z"
      : portraitArchetype === "lean"
        ? "M40 34 C43 21 56 18 67 28 C76 37 74 53 68 66 C62 80 49 82 41 68 C35 58 35 44 40 34 Z"
        : portraitArchetype === "broad"
          ? "M32 39 C34 25 52 17 69 25 C79 33 80 51 72 66 L61 78 L43 76 L34 65 C29 55 28 45 32 39 Z"
          : baseFacePath;
  const jawPlanePath = jawStyle === "wide"
    ? "M37 61 C45 73 59 75 70 61 L65 74 L52 81 L39 73 Z"
    : jawStyle === "pointed"
      ? "M40 61 C45 72 52 80 62 67 C59 76 51 82 44 73 Z"
      : jawStyle === "soft-square"
        ? "M36 62 C43 72 58 76 68 64 L62 76 L47 78 L38 70 Z"
        : "M37 60 L49 76 L63 70 L69 59 L63 76 L49 80 L39 69 Z";
  const leftEarPath = earStyle === "sharp"
    ? "M31 49 C23 47 24 63 35 64 C30 59 31 54 31 49 Z"
    : earStyle === "round"
      ? "M32 49 C25 49 25 62 34 64 C31 60 31 54 32 49 Z"
      : "M31 51 C25 52 26 62 34 62 C31 58 31 54 31 51 Z";
  const rightEarPath = earStyle === "sharp"
    ? "M70 47 C78 46 79 61 68 64 C73 58 72 52 70 47 Z"
    : earStyle === "round"
      ? "M69 48 C77 49 77 61 68 64 C71 59 72 53 69 48 Z"
      : "M69 50 C76 51 76 61 68 62 C72 58 72 54 69 50 Z";
  const hairPath = hairStyle === "undercut"
    ? "M32 39 C35 22 52 16 70 25 L76 35 C62 30 49 32 35 43 Z"
    : hairStyle === "swept"
      ? "M30 41 C34 20 60 12 77 29 C62 24 52 35 34 45 Z"
      : hairStyle === "textured"
        ? "M31 41 C31 27 38 20 45 22 C49 15 60 16 65 24 C71 22 77 30 75 41 C60 32 46 35 31 41 Z"
        : hairStyle === "tight"
          ? "M36 36 C40 24 57 20 70 29 C59 26 47 29 36 38 Z"
          : hairStyle === "fringe"
            ? "M31 39 C33 23 49 16 66 22 C74 26 78 33 75 42 C63 34 55 45 43 39 C39 48 34 48 31 39 Z"
            : "M30 42 C32 26 39 20 46 22 L50 13 L57 25 L66 17 L75 32 C61 28 47 35 30 42 Z";
  const archetypeHairPath = portraitArchetype === "angular"
    ? "M30 42 C32 24 43 16 55 18 C62 14 74 22 79 33 C65 29 55 33 45 38 C39 42 34 45 30 42 Z"
    : portraitArchetype === "veteran"
      ? "M34 38 C38 25 52 20 66 26 C72 29 76 34 75 42 C61 33 48 35 36 42 Z"
      : portraitArchetype === "lean"
        ? "M34 40 C35 24 51 15 66 23 C76 29 78 37 73 45 C61 35 49 36 36 44 Z"
        : portraitArchetype === "broad"
          ? "M30 42 C32 25 47 15 66 20 C77 24 82 33 78 43 C62 32 47 33 31 45 Z"
          : hairPath;
  const hairVolumePath = hairVolume === "crest"
    ? "M39 31 C43 18 55 12 67 19 C72 22 76 28 78 36 C68 26 57 27 48 32 Z"
    : hairVolume === "messy"
      ? "M34 38 L42 23 L48 34 L55 16 L61 33 L72 22 L77 39 C62 31 48 35 34 38 Z"
      : hairVolume === "slick"
        ? "M34 38 C44 24 60 22 76 35 C61 31 48 34 36 42 Z"
        : "M35 37 C44 29 59 28 73 37 C58 34 47 35 35 41 Z";
  const hairShadowPath = hairVolume === "slick"
    ? "M35 39 C49 33 63 33 76 41 L72 48 C60 39 48 39 36 45 Z"
    : "M33 40 C45 34 60 34 76 42 C61 37 48 39 35 47 Z";
  const eyeLeft = 46 - Math.max(eyeSpread, 0) + Math.min(eyeSpread, 0);
  const eyeRight = 64 + Math.max(eyeSpread, 0) - Math.min(eyeSpread, 0);
  const leftEyePath = eyeStyle === "round"
    ? `M${eyeLeft - 5} ${eyeY} Q${eyeLeft - 1} ${eyeY - 4} ${eyeLeft + 6} ${eyeY} Q${eyeLeft - 1} ${eyeY + 2} ${eyeLeft - 5} ${eyeY}`
    : eyeStyle === "wide"
      ? `M${eyeLeft - 7} ${eyeY} Q${eyeLeft - 1} ${eyeY - 3} ${eyeLeft + 7} ${eyeY - 0.5}`
      : eyeStyle === "heavy"
        ? `M${eyeLeft - 6} ${eyeY - 1} Q${eyeLeft - 1} ${eyeY + 2} ${eyeLeft + 6} ${eyeY - 1}`
        : eyeStyle === "narrow"
          ? `M${eyeLeft - 6} ${eyeY + 1} Q${eyeLeft - 1} ${eyeY - 1} ${eyeLeft + 6} ${eyeY + 0.5}`
          : `M${eyeLeft - 5} ${eyeY} Q${eyeLeft - 1} ${eyeY - 2.5} ${eyeLeft + 5} ${eyeY}`;
  const rightEyePath = eyeStyle === "round"
    ? `M${eyeRight - 5} ${eyeY + 1} Q${eyeRight} ${eyeY - 3} ${eyeRight + 6} ${eyeY + 1} Q${eyeRight} ${eyeY + 3} ${eyeRight - 5} ${eyeY + 1}`
    : eyeStyle === "wide"
      ? `M${eyeRight - 7} ${eyeY + 1} Q${eyeRight} ${eyeY - 2} ${eyeRight + 7} ${eyeY + 0.5}`
      : eyeStyle === "heavy"
        ? `M${eyeRight - 6} ${eyeY} Q${eyeRight} ${eyeY + 3} ${eyeRight + 6} ${eyeY}`
        : eyeStyle === "narrow"
          ? `M${eyeRight - 6} ${eyeY + 2} Q${eyeRight} ${eyeY} ${eyeRight + 6} ${eyeY + 1.5}`
          : `M${eyeRight - 5} ${eyeY + 1} Q${eyeRight} ${eyeY - 1.5} ${eyeRight + 5} ${eyeY + 1}`;
  const leftBrowPath = browStyle === "arched"
    ? `M${eyeLeft - 8} ${eyeY - 7 + browTilt} Q${eyeLeft - 1} ${eyeY - 13} ${eyeLeft + 8} ${eyeY - 8}`
    : browStyle === "low"
      ? `M${eyeLeft - 8} ${eyeY - 5 + browTilt} Q${eyeLeft - 1} ${eyeY - 7} ${eyeLeft + 8} ${eyeY - 5}`
      : browStyle === "split"
        ? `M${eyeLeft - 8} ${eyeY - 8 + browTilt} L${eyeLeft - 1} ${eyeY - 10} M${eyeLeft + 2} ${eyeY - 9} L${eyeLeft + 8} ${eyeY - 7}`
        : browStyle === "severe"
          ? `M${eyeLeft - 8} ${eyeY - 9 + browTilt} L${eyeLeft + 8} ${eyeY - 5}`
          : `M${eyeLeft - 7} ${eyeY - 7 + browTilt} Q${eyeLeft - 1} ${eyeY - 10} ${eyeLeft + 6} ${eyeY - 7}`;
  const rightBrowPath = browStyle === "arched"
    ? `M${eyeRight - 8} ${eyeY - 6 - browTilt} Q${eyeRight} ${eyeY - 12} ${eyeRight + 8} ${eyeY - 6}`
    : browStyle === "low"
      ? `M${eyeRight - 8} ${eyeY - 4 - browTilt} Q${eyeRight} ${eyeY - 6} ${eyeRight + 8} ${eyeY - 4}`
      : browStyle === "split"
        ? `M${eyeRight - 8} ${eyeY - 7 - browTilt} L${eyeRight - 1} ${eyeY - 9} M${eyeRight + 2} ${eyeY - 8} L${eyeRight + 8} ${eyeY - 6}`
        : browStyle === "severe"
          ? `M${eyeRight - 8} ${eyeY - 5 - browTilt} L${eyeRight + 8} ${eyeY - 9}`
          : `M${eyeRight - 6} ${eyeY - 6 - browTilt} Q${eyeRight} ${eyeY - 9} ${eyeRight + 6} ${eyeY - 5}`;
  const nosePath = noseStyle === "hook"
    ? `M${noseX - 1} 43 C${noseX + 5} 50 ${noseX + 2} 57 ${noseX + 8} 61`
    : noseStyle === "wide"
      ? `M${noseX - 2} 43 C${noseX + 1} 51 ${noseX - 5} 57 ${noseX + 3} 61`
      : noseStyle === "sharp"
        ? `M${noseX + 1} 43 L${noseX - 3} 58 L${noseX + 5} 60`
        : noseStyle === "flat"
          ? `M${noseX - 2} 44 C${noseX + 1} 51 ${noseX - 1} 56 ${noseX + 4} 59`
          : `M${noseX} 43 C${noseX + 3} 50 ${noseX - 3} 56 ${noseX + 4} 60`;
  const nostrilPath = noseStyle === "wide"
    ? `M${noseX - 4} 61 C${noseX - 1} 63 ${noseX + 5} 63 ${noseX + 9} 60`
    : `M${noseX - 1} 60 C${noseX + 2} 62 ${noseX + 5} 62 ${noseX + 7} 60`;
  const mouthPath = mouthStyle === "smirk"
    ? `M43 ${mouthY + 1} C50 ${mouthY + 4} 59 ${mouthY + 1} 66 ${mouthY - 3}`
    : mouthStyle === "downturn"
      ? `M44 ${mouthY - 1} C51 ${mouthY - 3} 59 ${mouthY - 2} 65 ${mouthY + 2}`
      : mouthStyle === "pressed"
        ? `M44 ${mouthY} L64 ${mouthY - 1}`
        : mouthStyle === "soft"
          ? `M45 ${mouthY} C51 ${mouthY + 3} 59 ${mouthY + 3} 65 ${mouthY - 1}`
          : `M44 ${mouthY} C50 ${mouthY + 2} 58 ${mouthY + 1} 64 ${mouthY - 2}`;
  const lowerLipPath = mouthStyle === "pressed"
    ? `M48 ${mouthY + 3} C53 ${mouthY + 4} 59 ${mouthY + 4} 63 ${mouthY + 2}`
    : `M48 ${mouthY + 4} C53 ${mouthY + 6} 59 ${mouthY + 5} 63 ${mouthY + 2}`;
  const cheekPath = cheekStyle === "high"
    ? "M39 55 C45 50 51 50 58 54"
    : cheekStyle === "hollow"
      ? "M38 58 C45 64 56 63 64 56"
      : cheekStyle === "soft"
        ? "M40 57 C47 60 56 59 63 56"
        : "M38 56 L58 53 L67 59";
  const hairlinePath = hairlineStyle === "widow"
    ? "M38 37 C45 29 50 39 56 31 C62 28 68 31 74 38"
    : hairlineStyle === "receding"
      ? "M36 36 C43 28 49 33 56 28 C64 27 70 32 75 39"
      : hairlineStyle === "broken"
        ? "M34 38 C39 31 45 35 49 30 C53 36 58 29 64 31 C69 33 72 36 75 41"
        : hairlineStyle === "straight"
          ? "M34 37 C45 31 62 31 75 38"
          : "M34 39 C44 26 62 26 75 39";
  const hairStrands = hairTexture === "wet"
    ? [
      "M38 34 C43 25 50 25 56 30",
      "M46 29 C51 20 59 22 64 30",
      "M57 31 C63 26 70 29 73 36",
    ]
    : hairTexture === "wispy"
      ? [
        "M34 38 C39 29 43 25 47 22",
        "M43 31 C48 24 52 20 57 18",
        "M58 29 C66 25 72 28 77 34",
      ]
      : hairTexture === "crop"
        ? [
          "M37 34 L47 27",
          "M47 30 L57 25",
          "M58 30 L70 28",
        ]
        : hairTexture === "brush"
          ? [
            "M35 39 C43 29 54 25 66 26",
            "M41 33 C51 25 62 23 74 31",
            "M49 29 C58 23 68 24 76 35",
          ]
          : [
            "M35 37 L45 25 L50 34",
            "M47 30 L56 19 L60 34",
            "M60 31 L72 24 L71 38",
          ];
  const jerseyStripe = seed % 3 === 0;
  const portraitTransform = mirror ? "translate(100 0) scale(-1 1)" : undefined;
  const portraitZoom = isPortrait ? "translate(-5 -7) scale(1.1)" : "";
  const archetypeTransform = portraitArchetype === "broad"
    ? "translate(-2 -1) scale(1.08 0.99)"
    : portraitArchetype === "lean"
      ? "translate(3 0) scale(0.94 1.06)"
      : portraitArchetype === "angular"
        ? "translate(1 -1) scale(1.02 1.02)"
        : portraitArchetype === "veteran"
          ? "translate(-1 1) scale(1.04 1)"
          : "translate(0 0) scale(1 1)";
  const keyLightPath = lightAngle === "right"
    ? "M55 29 C70 35 73 54 63 70 C67 57 66 41 55 29 Z"
    : lightAngle === "front"
      ? "M43 34 C50 28 60 29 66 39 C60 36 50 36 43 44 Z"
      : "M38 38 C41 30 50 26 61 27 C51 30 44 38 42 51 C40 59 42 66 47 72 C38 67 34 51 38 38 Z";
  const faceShadowPath = lightAngle === "right"
    ? "M36 42 C39 60 48 72 63 75 C48 81 35 70 32 55 C30 48 31 43 36 42 Z"
    : "M60 28 C74 34 78 52 69 67 C64 74 58 77 49 76 C61 70 67 58 66 45 C66 37 64 32 60 28 Z";
  const templeShadowPath = portraitArchetype === "lean"
    ? "M37 38 C35 47 36 60 42 70 C35 63 32 49 37 38 Z"
    : portraitArchetype === "broad"
      ? "M33 42 C34 57 42 70 55 76 C43 76 33 66 31 54 Z"
      : portraitArchetype === "angular"
        ? "M35 42 L43 68 L52 79 L39 68 L33 52 Z"
        : "M36 43 C36 57 43 69 53 76 C42 74 34 62 34 50 Z";
  const cheekShadowPath = lightAngle === "right"
    ? "M36 50 C43 54 47 62 47 72 C39 68 34 60 33 51 Z"
    : "M62 49 C70 53 72 61 68 69 C63 66 59 58 58 52 Z";
  const hardFacePlanePath = facePlaneStyle === "hard-left"
    ? "M34 38 C39 48 42 61 50 76 C39 72 33 61 32 49 Z"
    : facePlaneStyle === "hard-right"
      ? "M61 30 C72 38 75 55 66 70 C68 55 68 41 61 30 Z"
      : facePlaneStyle === "center-ridge"
        ? `M${noseX - 4} 39 C${noseX - 8} 50 ${noseX - 7} 61 ${noseX - 1} 72 C${noseX + 2} 62 ${noseX + 2} 49 ${noseX - 4} 39 Z`
        : "M39 45 C48 41 61 42 69 49 C61 47 51 48 41 53 Z";
  const foreheadPlanePath = highlightBias === "temple"
    ? "M39 36 C46 27 61 27 70 36 C61 34 49 35 39 41 Z"
    : "M43 35 C51 31 60 32 67 38 C59 38 50 38 43 43 Z";
  const underEyePlanePath = underEyeDepth === "clean"
    ? ""
    : underEyeDepth === "tired"
      ? `M${eyeLeft - 7} ${eyeY + 6} C${eyeLeft + 1} ${eyeY + 10} ${eyeLeft + 8} ${eyeY + 8} ${eyeLeft + 12} ${eyeY + 5} M${eyeRight - 8} ${eyeY + 7} C${eyeRight} ${eyeY + 11} ${eyeRight + 8} ${eyeY + 9} ${eyeRight + 12} ${eyeY + 6}`
      : underEyeDepth === "heavy"
        ? `M${eyeLeft - 7} ${eyeY + 4} C${eyeLeft} ${eyeY + 9} ${eyeLeft + 7} ${eyeY + 8} ${eyeLeft + 12} ${eyeY + 4} M${eyeRight - 9} ${eyeY + 5} C${eyeRight} ${eyeY + 10} ${eyeRight + 8} ${eyeY + 9} ${eyeRight + 12} ${eyeY + 5}`
        : `M${eyeLeft - 6} ${eyeY + 5} L${eyeLeft + 10} ${eyeY + 4} M${eyeRight - 7} ${eyeY + 6} L${eyeRight + 10} ${eyeY + 5}`;
  const castShadowPath = lightAngle === "right"
    ? `M${noseX - 2} 52 C${noseX - 8} 57 ${noseX - 8} 63 ${noseX - 1} 67`
    : `M${noseX + 4} 51 C${noseX + 11} 57 ${noseX + 10} 63 ${noseX + 3} 67`;
  const highlightPlanePath = highlightBias === "nose"
    ? `M${noseX - 1} 42 C${noseX + 2} 49 ${noseX} 55 ${noseX + 4} 59`
    : highlightBias === "jaw"
      ? "M45 70 C51 77 61 75 67 66"
      : highlightBias === "cheek"
        ? lightAngle === "right" ? "M55 48 C63 45 69 49 71 56" : "M39 47 C47 44 53 47 57 53"
        : "M39 38 C44 31 52 28 61 29";
  const eyeSocketPath = browStyle === "severe"
    ? "M38 42 C47 36 60 36 70 41 C61 45 48 47 38 42 Z"
    : "M39 43 C48 39 61 39 70 43 C61 47 49 48 39 43 Z";
  const neckTendonPath = kind === "manager"
    ? "M44 75 C45 87 41 97 34 111 M60 72 C59 88 64 99 72 113"
    : "M43 74 C46 88 43 101 38 116 M61 72 C59 89 64 101 69 116";
  const browShadowPath = browStyle === "severe"
    ? "M37 38 C46 32 62 32 72 39 L70 44 C60 40 48 40 39 44 Z"
    : "M38 39 C47 35 62 35 71 40 L69 45 C60 42 49 42 40 45 Z";
  const chinPlanePath = jawStyle === "pointed"
    ? "M47 72 C52 76 59 74 63 69 C61 78 50 81 44 73 Z"
    : "M42 70 C49 77 61 77 67 68 C65 77 50 82 40 72 Z";
  const sideburnPath = hasSideburns
    ? hairStyle === "tight"
      ? "M35 38 C33 47 34 54 37 59 L40 45 Z M70 37 C72 46 71 54 67 59 L64 44 Z"
      : "M34 39 C32 49 34 58 38 63 L41 43 Z M71 39 C74 49 72 58 67 63 L64 43 Z"
    : "";
  const skinMarkPaths = [
    `M${eyeLeft - 5} ${eyeY + 5} C${eyeLeft - 1} ${eyeY + 7} ${eyeLeft + 5} ${eyeY + 6} ${eyeLeft + 8} ${eyeY + 4}`,
    `M${eyeRight - 6} ${eyeY + 6} C${eyeRight - 1} ${eyeY + 8} ${eyeRight + 6} ${eyeY + 7} ${eyeRight + 8} ${eyeY + 5}`,
    "M43 37 C47 35 51 35 55 37",
  ];
  const asymmetricMouthPath = expressionAsymmetry === "left"
    ? `M43 ${mouthY + 1} C50 ${mouthY + 3} 58 ${mouthY + 1} 65 ${mouthY - 1}`
    : expressionAsymmetry === "right"
      ? `M44 ${mouthY - 1} C51 ${mouthY + 1} 59 ${mouthY + 3} 66 ${mouthY + 1}`
      : mouthPath;
  const mouthPlanePath = mouthStyle === "pressed"
    ? `M45 ${mouthY + 1} C51 ${mouthY + 4} 59 ${mouthY + 4} 65 ${mouthY} L63 ${mouthY + 6} C55 ${mouthY + 8} 48 ${mouthY + 6} 45 ${mouthY + 1} Z`
    : `M44 ${mouthY - 1} C51 ${mouthY + 5} 60 ${mouthY + 4} 67 ${mouthY - 2} C62 ${mouthY + 8} 49 ${mouthY + 9} 44 ${mouthY - 1} Z`;
  const hairDepthPaths = hairDepth === "forelock"
    ? ["M42 26 C48 18 58 18 66 25", "M37 39 C45 31 53 30 61 35", "M49 28 C54 22 63 23 71 31"]
    : hairDepth === "crown"
      ? ["M37 34 C45 20 61 17 75 31", "M41 29 C51 23 62 23 73 30", "M34 42 C46 36 61 36 76 44"]
      : hairDepth === "taper"
        ? ["M34 39 C39 31 48 29 57 31", "M58 31 C66 31 72 35 75 43", "M35 45 C43 40 54 39 68 44"]
        : ["M34 39 C38 33 43 31 50 32", "M67 37 C70 43 69 51 66 58", "M35 45 C39 49 40 55 38 62"];
  const shoulderPath = isPortrait ? "M-5 130 C8 103 32 91 51 93 C70 90 96 104 106 130 Z" : "M10 100 C15 78 86 77 92 100 Z";
  const collarPath = isPortrait ? "M30 93 L50 124 L72 93 L65 130 L36 130 Z" : "M34 82 L50 98 L68 82 L63 101 L38 101 Z";
  const neckShadowPath = isPortrait ? "M38 72 L36 96 C43 107 60 108 66 95 L62 69 Z" : "M39 71 L38 85 C42 93 58 94 64 85 L62 69 Z";
  const neckLightPath = isPortrait ? "M43 69 L42 92 C48 100 59 99 63 88 L60 68 Z" : "M43 69 L43 83 C49 88 58 87 62 80 L60 68 Z";
  const archetypeShoulderPath = isPortrait
    ? portraitArchetype === "broad"
      ? "M-10 130 C6 101 30 88 52 91 C74 88 101 103 112 130 Z"
      : portraitArchetype === "lean"
        ? "M2 130 C14 106 34 94 51 96 C68 94 88 106 99 130 Z"
        : portraitArchetype === "veteran"
          ? "M-6 130 C8 104 34 92 51 93 C69 91 94 105 106 130 Z"
          : shoulderPath
    : portraitArchetype === "broad"
      ? "M5 100 C12 77 88 76 96 100 Z"
      : portraitArchetype === "lean"
        ? "M15 100 C20 82 80 81 88 100 Z"
        : shoulderPath;
  const archetypeCollarPath = isPortrait
    ? portraitArchetype === "lean"
      ? "M34 94 L50 126 L68 94 L63 130 L39 130 Z"
      : portraitArchetype === "broad"
        ? "M25 93 L50 122 L77 93 L69 130 L32 130 Z"
        : collarPath
    : collarPath;
  const shirtPanelPaths = isPortrait
    ? [
      portraitArchetype === "broad" ? "M20 106 C34 98 43 99 50 116" : "M24 106 C36 99 44 100 50 116",
      portraitArchetype === "lean" ? "M75 108 C65 101 57 101 51 118" : "M78 106 C65 98 57 99 51 116",
    ]
    : ["M28 86 C39 82 46 86 50 97", "M72 86 C61 82 54 86 50 97"];
  return (
    <div
      className={cn("shrink-0 overflow-hidden rounded-lg border border-white/70 bg-white shadow-card", className)}
      aria-label={`${name} portrait`}
    >
      <svg viewBox={`0 0 100 ${viewHeight}`} role="img" className="h-full w-full">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${bgHue} 45% 18%)`} />
            <stop offset="62%" stopColor={`hsl(${(bgHue + 26) % 360} 48% 28%)`} />
            <stop offset="100%" stopColor={`hsl(${(bgHue + 58) % 360} 42% 14%)`} />
          </linearGradient>
          <linearGradient id={`${id}-skin`} x1="0.2" x2="0.9" y1="0.05" y2="1">
            <stop offset="0%" stopColor={skinLight} />
            <stop offset="54%" stopColor={skin} />
            <stop offset="100%" stopColor={skinShadow} />
          </linearGradient>
          <linearGradient id={`${id}-hair`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={hairLight} />
            <stop offset="42%" stopColor={hair} />
            <stop offset="100%" stopColor="#070707" />
          </linearGradient>
          <linearGradient id={`${id}-shirt`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.92" />
            <stop offset="22%" stopColor={shirt} />
            <stop offset="100%" stopColor="#08140f" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <rect width="100" height={viewHeight} rx="0" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
        <rect width="100" height={viewHeight} fill={`url(#${id}-bg)`} />
        <path d={isPortrait ? "M-18 126 L98 -8" : "M-14 92 L88 -8"} stroke="rgba(255,255,255,0.09)" strokeWidth="8" />
        <path d={isPortrait ? "M72 -6 C102 24 104 76 83 128" : "M77 -6 C98 18 97 52 84 77"} stroke="rgba(255,255,255,0.1)" strokeWidth={isPortrait ? "11" : "9"} fill="none" />
        <path d={archetypeShoulderPath} fill={`url(#${id}-shirt)`} />
        {shirtPanelPaths.map((path) => (
          <path key={path} d={path} stroke="rgba(255,255,255,0.16)" strokeWidth={isPortrait ? "2.4" : "1.8"} strokeLinecap="round" fill="none" />
        ))}
        {jerseyStripe ? (
          <>
            <path d={isPortrait ? "M29 93 L39 130" : "M33 83 L42 100"} stroke={accent} strokeWidth={isPortrait ? "6" : "5"} opacity="0.75" />
            <path d={isPortrait ? "M72 93 L61 130" : "M67 82 L58 100"} stroke={accent} strokeWidth={isPortrait ? "6" : "5"} opacity="0.62" />
          </>
        ) : null}
        <path d={archetypeCollarPath} fill={kind === "manager" ? "#f8fafc" : "#111827"} opacity="0.9" />
        {isPortrait ? <path d="M39 101 L50 119 L62 101" stroke={kind === "manager" ? "#d9e2e9" : accent} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.9" /> : null}
        <path d={neckShadowPath} fill={skinShadow} />
        <path d={neckLightPath} fill={skin} />
        <g transform={portraitTransform}>
          <g transform={`${portraitZoom} rotate(${headTilt} 53 50) ${archetypeTransform}`}>
            <path d={leftEarPath} fill={skinMid} />
            <path d={rightEarPath} fill={skinShadow} opacity="0.9" />
            <path d="M33 55 C29 55 29 60 33 60 M70 54 C73 55 73 59 69 60" stroke={skinShadow} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.38" />
            <path d={archetypeFacePath} fill={`url(#${id}-skin)`} />
            <path d={faceShadowPath} fill={skinShadow} opacity="0.34" />
            <path d={templeShadowPath} fill={faceInk} opacity="0.11" />
            <path d={cheekShadowPath} fill={skinShadow} opacity="0.24" />
            <path d={hardFacePlanePath} fill={facePlaneStyle === "soft-mask" ? skinLight : faceInk} opacity={facePlaneStyle === "soft-mask" ? "0.13" : "0.1"} />
            <path d={foreheadPlanePath} fill={skinLight} opacity="0.2" />
            <path d={keyLightPath} fill={skinLight} opacity={lightAngle === "front" ? "0.32" : "0.46"} />
            <path d={highlightPlanePath} stroke={skinLight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.42" />
            <path d={browShadowPath} fill={faceInk} opacity="0.12" />
            <path d={eyeSocketPath} fill="#2a1510" opacity="0.11" />
            <path d={jawPlanePath} fill={skinShadow} opacity="0.22" />
            <path d={chinPlanePath} fill={skinMid} opacity="0.2" />
            <path d="M42 58 C47 61 54 61 60 58 C58 64 47 65 42 58 Z" fill={skinMid} opacity="0.22" />
            <path d={archetypeHairPath} fill={`url(#${id}-hair)`} />
            <path d={hairVolumePath} fill={`url(#${id}-hair)`} opacity="0.96" />
            <path d={hairShadowPath} fill="#050505" opacity="0.24" />
            {hairDepthPaths.map((path, index) => (
              <path key={path} d={path} stroke={index === 0 ? hairLight : hair} strokeWidth={index === 2 ? "3.4" : "2.4"} strokeLinecap="round" fill="none" opacity={index === 0 ? "0.42" : "0.36"} />
            ))}
            {sideburnPath ? <path d={sideburnPath} fill={hair} opacity="0.82" /> : null}
            <path d="M35 33 C44 18 63 17 75 32 C59 27 49 29 35 38 Z" fill={hairLight} opacity="0.38" />
            <path d={hairlinePath} stroke={hairLight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.42" />
            {hairStrands.map((path, index) => (
              <path key={path} d={path} stroke={index === 1 ? hairLight : hair} strokeWidth={hairTexture === "crop" ? "2.1" : "2.5"} strokeLinecap="round" fill="none" opacity={index === 1 ? "0.44" : "0.62"} />
            ))}
            {hairStyle === "spikes" || hairStyle === "textured" || hairStyle === "fringe" ? (
              <>
                <path d="M42 26 L48 12 L52 29 Z" fill={hair} />
                <path d="M54 24 L64 12 L63 31 Z" fill={hair} />
                <path d="M36 35 L25 26 L40 29 Z" fill={hair} />
                <path d="M67 28 L78 24 L72 38 Z" fill={hair} />
              </>
            ) : null}
            <path d={leftBrowPath} stroke={hair} strokeWidth={browStyle === "split" ? "2.7" : "3.2"} strokeLinecap="round" fill="none" />
            <path d={rightBrowPath} stroke={hair} strokeWidth={browStyle === "split" ? "2.7" : "3.2"} strokeLinecap="round" fill="none" />
            <path d={leftEyePath} stroke="#0f172a" strokeWidth={eyeStyle === "round" ? "2" : "2.5"} strokeLinecap="round" fill="none" />
            <path d={rightEyePath} stroke="#0f172a" strokeWidth={eyeStyle === "round" ? "2" : "2.5"} strokeLinecap="round" fill="none" />
            <circle cx={eyeLeft + (eyeStyle === "wide" ? 1 : 2)} cy={eyeY + (eyeStyle === "heavy" ? 1 : 0)} r={eyeStyle === "round" ? "1.35" : "1.1"} fill="#111827" />
            <circle cx={eyeRight + (eyeStyle === "wide" ? 1 : 2)} cy={eyeY + (eyeStyle === "heavy" ? 2 : 1)} r={eyeStyle === "round" ? "1.3" : "1.05"} fill="#111827" />
            {hasGlasses ? (
              <>
                <path d={`M${eyeLeft - 8} ${eyeY - 7} h16 v13 h-16 Z`} fill="none" stroke="#111827" strokeWidth="1.8" />
                <path d={`M${eyeRight - 8} ${eyeY - 6} h16 v13 h-16 Z`} fill="none" stroke="#111827" strokeWidth="1.8" />
                <path d={`M${eyeLeft + 8} ${eyeY - 1} L${eyeRight - 8} ${eyeY}`} stroke="#111827" strokeWidth="1.8" />
              </>
            ) : null}
            {hasScar ? <path d={`M${eyeRight + 5} ${eyeY + 4} L${eyeRight + 12} ${eyeY + 13}`} stroke="#f3d0ba" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" /> : null}
            {hasAgeLines ? skinMarkPaths.map((path) => (
              <path key={path} d={path} stroke={faceInk} strokeWidth="1.05" strokeLinecap="round" fill="none" opacity="0.18" />
            )) : null}
            {underEyePlanePath ? <path d={underEyePlanePath} stroke={faceInk} strokeWidth={underEyeDepth === "heavy" ? "1.8" : "1.25"} strokeLinecap="round" fill="none" opacity={underEyeDepth === "heavy" ? "0.2" : "0.16"} /> : null}
            <path d={cheekPath} stroke={skinLight} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity={cheekStyle === "hollow" ? "0.26" : "0.34"} />
            <path d="M39 51 C44 49 49 50 52 53" stroke={skinShadow} strokeWidth="1.15" strokeLinecap="round" fill="none" opacity="0.24" />
            <path d="M58 53 C63 50 68 51 71 55" stroke={skinShadow} strokeWidth="1.15" strokeLinecap="round" fill="none" opacity="0.24" />
            <path d={nosePath} stroke={skinShadow} strokeWidth={noseStyle === "sharp" ? "2" : "2.5"} strokeLinecap="round" fill="none" opacity="0.6" />
            <path d={castShadowPath} stroke={faceInk} strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d={`M${noseX + 1} 45 C${noseX + 5} 51 ${noseX + 2} 57 ${noseX + 7} 60`} stroke={skinLight} strokeWidth="1.25" strokeLinecap="round" fill="none" opacity="0.34" />
            <path d={nostrilPath} stroke={skinShadow} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.42" />
            {hasMoustache ? <path d={`M43 ${mouthY - 3} C49 ${mouthY - 7} 57 ${mouthY - 6} 66 ${mouthY - 4}`} stroke={hair} strokeWidth={facialHairStyle === "moustache" ? "3" : "2.4"} strokeLinecap="round" fill="none" opacity="0.5" /> : null}
            <path d={mouthPlanePath} fill={skinShadow} opacity="0.1" />
            <path d={asymmetricMouthPath} stroke="#5f271f" strokeWidth={mouthStyle === "pressed" ? "2" : "2.4"} strokeLinecap="round" fill="none" />
            <path d={lowerLipPath} stroke={skinShadow} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.35" />
            {hasStubble ? (
              <>
                <path d={facialHairStyle === "goatee" ? "M49 67 C53 76 61 76 65 66 C63 80 50 81 46 69 Z" : "M39 59 C45 75 62 77 69 61 C66 80 44 82 37 66 Z"} fill={hair} opacity={hasBeard ? "0.42" : "0.22"} />
                <path d={facialHairStyle === "goatee" ? "M49 72 C54 75 60 75 64 70" : "M43 66 C50 70 59 70 66 64"} stroke={hair} strokeWidth="1.6" strokeLinecap="round" opacity="0.26" />
                <path d="M42 63 C48 66 58 66 66 61 M43 68 C50 72 60 72 67 66" stroke={hair} strokeWidth="0.9" strokeLinecap="round" opacity={hasBeard ? "0.35" : "0.18"} />
              </>
            ) : null}
            <path d="M37 68 C44 78 59 80 67 65" stroke={skinShadow} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.42" />
            <path d="M36 40 C33 51 35 63 42 72 M69 39 C75 51 72 65 63 73" stroke={faceInk} strokeWidth="1.35" strokeLinecap="round" fill="none" opacity="0.18" />
            <path d="M40 75 C47 82 59 82 65 73" stroke="#1f130f" strokeWidth="1.2" strokeLinecap="round" opacity="0.18" />
            <path d={neckTendonPath} stroke={skinShadow} strokeWidth="1.35" strokeLinecap="round" fill="none" opacity={isPortrait ? "0.28" : "0"} />
          </g>
        </g>
        {isPortrait ? (
          <>
            <path d="M5 120 C27 112 70 113 96 123" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
            <path d="M16 129 C26 105 38 97 50 98" stroke="rgba(0,0,0,0.18)" strokeWidth="8" fill="none" />
          </>
        ) : null}
        </g>
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
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-emerald-900/10 bg-[linear-gradient(135deg,_#10241b,_#0f8139_58%,_#1aa24f)] p-0 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-18 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.28)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.16)_58%_60%,transparent_60%)]" />
        <div className="relative p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-white/65">Chairman&apos;s desk</p>
              <h2 className="mt-1 text-3xl font-black">{current.position ? ordinal(current.position) : "-"}</h2>
              <p className="mt-0.5 truncate text-sm font-bold text-white/85">{divisionName}</p>
              <p className="mt-1 text-xs text-white/65">Board {current.club.boardConfidence}% · Trust {current.club.managerTrust}% · Cup {cupStatus(save)}</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-right text-emerald-950 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Balance</p>
              <p data-testid="dashboard-balance" className="text-lg font-black">{formatMoney(current.club.finances.balance)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 rounded-2xl border border-white/15 bg-emerald-950/28 text-center text-xs backdrop-blur">
            <div className="border-r border-white/10 px-2 py-3">
              <span className="text-white/60">P</span>
              <b className="block text-base">{current.club.record.played}</b>
            </div>
            <div className="border-r border-white/10 px-2 py-3">
              <span className="text-white/60">W-D-L</span>
              <b className="block text-base">{current.club.record.won}-{current.club.record.drawn}-{current.club.record.lost}</b>
            </div>
            <div className="border-r border-white/10 px-2 py-3">
              <span className="text-white/60">GD</span>
              <b className="block text-base">{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</b>
            </div>
            <div className="px-2 py-3">
              <span className="text-white/60">Pts</span>
              <b className="block text-base">{current.club.record.points}</b>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10">
              <span className="text-white/60">Roster</span>
              <b className="block text-base">{squadRating || "-"}</b>
            </div>
            <div className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10">
              <span className="text-white/60">Manager</span>
              <b className="block text-base">{currentManagerRating || "-"}</b>
            </div>
            <div className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10">
              <span className="text-white/60">Latest</span>
              <b data-testid="dashboard-latest-report" className={cn("block text-base", latestFinance.profit >= 0 ? "text-emerald-100" : "text-red-100")}>{formatMoney(latestFinance.profit)}</b>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <p className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10"><span className="text-white/60">Completed seasons</span><b className="block text-sm">{completedSeasons}</b></p>
            <p className="rounded-lg bg-white/12 px-3 py-2 ring-1 ring-white/10"><span className="text-white/60">Trophies</span><b className="block text-sm">{trophyCount}</b></p>
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden border-emerald-100 bg-[linear-gradient(180deg,_#ffffff,_#f6fbf7)] p-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-primary">Next up</p>
            <p className="truncate text-xl font-black">{nextOpponent ? `${nextOpponent.name}` : "Season complete"}</p>
            <p className="text-sm text-neutral-500">{current.nextFixture ? current.nextFixture.homeClubId === current.club.id ? "Home" : "Away" : latestSeason ? `Last season: ${latestSeason.outcome ?? "completed"}` : "Awaiting schedule"}</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-primary"><CalendarDays size={22} /></span>
        </div>
        <div className="border-t border-line bg-white px-4 py-3">
          <Button className="w-full" onClick={() => {
            if (!save.currentEvent && !current.manager) {
              setTab("manager");
              return;
            }
            continueGame();
          }} disabled={Boolean(save.gameOver)}>
            {save.currentEvent ? "Open Decision" : !current.manager ? "Hire Manager" : "Continue"}
          </Button>
        </div>
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
      <Card className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-neutral-500">Recent form</p>
            <p className="text-sm font-bold">{formRecord.W}W · {formRecord.D}D · {formRecord.L}L</p>
          </div>
          <button type="button" onClick={() => setTab("history")} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-black text-neutral-600">History</button>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {(lastTen.length ? lastTen : ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]).map((result, index) => (
            <span key={`${result}_${index}`} className={cn("grid h-8 min-w-0 place-items-center rounded-lg text-[11px] font-black text-white shadow-[0_6px_14px_rgba(23,33,27,0.08)]", result === "W" ? "bg-primary" : result === "D" ? "bg-warning" : result === "L" ? "bg-danger" : "bg-neutral-300")}>{result}</span>
          ))}
        </div>
      </Card>
      {save.lastMatch?.result ? (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-[linear-gradient(135deg,_#ffffff,_#f3faf5)] text-center">
            <div className="p-4">
              <p className="text-[10px] font-black uppercase text-neutral-500">Home</p>
              <p className="mt-1 text-sm font-black leading-tight">{save.clubs[save.lastMatch.homeClubId].name}</p>
            </div>
            <div className="px-3 py-4">
              <p className="rounded-2xl bg-emerald-950 px-4 py-3 text-2xl font-black text-white">{save.lastMatch.result.homeGoals}-{save.lastMatch.result.awayGoals}</p>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-black uppercase text-neutral-500">Away</p>
              <p className="mt-1 text-sm font-black leading-tight">{save.clubs[save.lastMatch.awayClubId].name}</p>
            </div>
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="text-xs font-black uppercase text-neutral-500">Last result</p>
          </div>
          <div className="space-y-2 px-4 pb-4">
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
            <div className="flex items-center gap-3">
              <PersonAvatar name={player.name} seedKey={player.id} className="h-12 w-12 shrink-0 rounded-lg text-[10px] ring-2 ring-white" />
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
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      {current.manager ? (
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,_#10241b,_#0f8139)] p-4 text-white">
            <div className="flex items-center gap-3">
              <PersonAvatar name={current.manager.name} seedKey={current.manager.id} kind="manager" variant="portrait" className="h-28 w-24 rounded-2xl text-xl shadow-[0_12px_24px_rgba(0,0,0,0.22)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-normal text-white/65">Current manager</p>
                <h2 className="truncate text-xl font-black">{current.manager.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/13 px-2 py-1 text-[10px] font-bold text-white ring-1 ring-white/15">{current.manager.style}</span>
                  <span className="rounded-full bg-white/13 px-2 py-1 text-[10px] font-bold text-white ring-1 ring-white/15">{current.manager.personality}</span>
                </div>
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-center text-primary shadow-[0_12px_24px_rgba(0,0,0,0.16)]">
                <span className="text-lg font-black leading-none">{managerRating(current.manager)}</span>
                <span className="text-[9px] font-black uppercase leading-none text-neutral-500">Rate</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-surface-muted px-3 py-3">
                <p className="font-black uppercase text-neutral-500">Wage</p>
                <b className="mt-1 block text-sm text-foreground">{formatWeeklyWage(current.manager.wage)}</b>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-3">
                <p className="font-black uppercase text-neutral-500">Contract</p>
                <b className="mt-1 block text-sm text-foreground">{current.manager.contractYears} years left</b>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-3">
                <p className="font-black uppercase text-neutral-500">Fire cost</p>
                <b className="mt-1 block text-sm text-danger">{formatMoney(fireCost)}</b>
              </div>
              <div className="rounded-xl bg-surface-muted px-3 py-3">
                <p className="font-black uppercase text-neutral-500">Status</p>
                <b className="mt-1 block text-sm text-foreground">Appointed</b>
              </div>
            </div>
            <div className="space-y-2">
              {managerAttributes.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[74px_1fr_30px] items-center gap-2">
                  <span className="text-xs font-bold text-neutral-600">{label}</span>
                  <div className="h-2 rounded-full bg-surface-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-right text-xs font-black">{value}</span>
                </div>
              ))}
            </div>
            <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm leading-5 text-emerald-950">{evaluateManager(save)}</p>
            {lockMessage ? <p className="rounded-xl bg-surface-muted px-3 py-3 text-xs leading-5 text-neutral-500">{lockMessage}</p> : null}
            <Button variant="danger" className="w-full" disabled={locked} onClick={() => setFireOpen(true)}>Fire Manager</Button>
          </div>
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
        {save.managerCandidates.map((manager) => {
          const expectedWage = calculateRecommendedManagerWage(manager, divisionLevel);
          const compensation = manager.status === "contracted" ? manager.compensationFee ?? calculateManagerCompensation(manager) : 0;
          return (
            <Card key={manager.id} className="space-y-3 p-3">
              <div className="flex items-start gap-3">
                <PersonAvatar name={manager.name} seedKey={manager.id} kind="manager" className="h-14 w-14 shrink-0 rounded-xl text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black">{manager.name}</p>
                      <p className="truncate text-xs text-neutral-500">{manager.style} · {manager.personality}</p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-primary px-2.5 py-1.5 text-xs font-black text-white">{managerRating(manager)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase", manager.status === "contracted" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
                      {manager.status === "contracted" ? "Under Contract" : "Free Agent"}
                    </span>
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-black uppercase text-neutral-600">Expected {formatWeeklyWage(expectedWage)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-surface-muted px-3 py-2">
                  <p className="font-black uppercase text-neutral-500">Training</p>
                  <b className="mt-0.5 block">{manager.training}</b>
                </div>
                <div className="rounded-xl bg-surface-muted px-3 py-2">
                  <p className="font-black uppercase text-neutral-500">Tactics</p>
                  <b className="mt-0.5 block">{manager.tactics}</b>
                </div>
                <div className="rounded-xl bg-surface-muted px-3 py-2">
                  <p className="font-black uppercase text-neutral-500">Transfers</p>
                  <b className="mt-0.5 block">{manager.transferTaste}</b>
                </div>
                <div className="rounded-xl bg-surface-muted px-3 py-2">
                  <p className="font-black uppercase text-neutral-500">Youth</p>
                  <b className="mt-0.5 block">{manager.youthPreference}</b>
                </div>
              </div>
              {manager.status === "contracted" ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-black uppercase">Club compensation</p>
                  <b className="mt-1 block text-sm">{formatMoney(compensation)}</b>
                </div>
              ) : null}
              <Button className="w-full" disabled={!canNegotiate} onClick={() => setHireId(manager.id)}>Negotiate</Button>
            </Card>
          );
        })}
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
  const summaryItems = [
    { label: "Report income", value: formatMoney(latestFinance.totalIncome), testId: "finance-summary-income", tone: "positive" },
    { label: "Report expenses", value: formatMoney(latestFinance.totalExpenses), testId: "finance-summary-expenses", tone: "negative" },
    { label: "Report result", value: formatMoney(latestFinance.profit), testId: "finance-summary-result", tone: latestFinance.profit >= 0 ? "positive" : "negative" },
    { label: "Weekly wages", value: formatMoney(finance.weeklyWages) },
    { label: "Opening balance", value: formatMoney(latestFinance.balanceBefore), testId: "finance-summary-opening" },
    { label: "Closing balance", value: formatMoney(latestFinance.balanceAfter), testId: "finance-summary-closing" },
    { label: "Sponsorship", value: formatMoney(finance.sponsorship), detail: "annual" },
    { label: "Board", value: pct(current.club.boardConfidence), detail: "confidence" },
  ];
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <StatCard label="Balance" value={formatMoney(finance.balance)} detail={`Debt limit ${formatMoney(finance.debtLimit)}`} />
      <Card className="space-y-3">
        <div className="rounded-xl bg-surface-muted px-3 py-3">
          <p className="text-[10px] font-black uppercase text-neutral-500">Report period</p>
          <b data-testid="finance-summary-period" className="mt-1 block text-base">{latestFinance.month} · Period {latestFinance.week}</b>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {summaryItems.map((item) => (
            <div key={item.label} className="min-h-[74px] rounded-xl border border-line/80 bg-white px-3 py-3 shadow-[0_8px_18px_rgba(23,33,27,0.04)]">
              <p className="text-[10px] font-black uppercase text-neutral-500">{item.label}</p>
              <b
                data-testid={item.testId}
                className={cn(
                  "mt-1 block text-base",
                  item.tone === "positive" && "text-primary",
                  item.tone === "negative" && "text-danger",
                )}
              >
                {item.value}
              </b>
              {item.detail ? <p className="mt-1 text-[10px] font-semibold uppercase text-neutral-400">{item.detail}</p> : null}
            </div>
          ))}
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
  const repairGain = 100 - current.club.stadium.condition;
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,_#10241b,_#0f8139)] p-4 text-white">
          <p className="text-[10px] font-black uppercase text-white/65">Stadium</p>
          <h2 className="mt-1 truncate text-xl font-black">{current.club.stadium.name}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/13 px-3 py-3 ring-1 ring-white/15">
              <p className="text-[10px] font-black uppercase text-white/65">Capacity</p>
              <b data-testid="stadium-capacity" className="mt-1 block text-lg">{current.club.stadium.capacity.toLocaleString()}</b>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3 text-emerald-950 shadow-[0_12px_24px_rgba(0,0,0,0.13)]">
              <p className="text-[10px] font-black uppercase text-neutral-500">Condition</p>
              <b data-testid="stadium-condition" className={cn("mt-1 block text-lg", current.club.stadium.condition < 55 ? "text-danger" : "text-primary")}>{pct(current.club.stadium.condition)}</b>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[linear-gradient(140deg,_#174b2e,_#1d8b48_42%,_#e8efe9_43%,_#29533b_100%)] p-4 shadow-inner">
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
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface-muted px-3 py-3">
              <p className="font-black uppercase text-neutral-500">Bank balance</p>
              <b className="mt-1 block text-sm">{formatMoney(current.club.finances.balance)}</b>
            </div>
            <div className="rounded-xl bg-surface-muted px-3 py-3">
              <p className="font-black uppercase text-neutral-500">Repair need</p>
              <b className="mt-1 block text-sm">{repairGain > 0 ? `+${repairGain}%` : "None"}</b>
            </div>
          </div>
        </div>
      </Card>
      {current.club.stadium.stands.map((stand) => (
        <Card key={stand.id} className="space-y-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-black">{stand.name}</p>
              <p className="text-xs text-neutral-500">Level {stand.level} · {stand.capacity.toLocaleString()} seats</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">+850 seats</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-surface-muted px-3 py-2">
              <p className="font-black uppercase text-neutral-500">Cost</p>
              <b className="mt-1 block">{formatMoney(stand.level * 180_000)}</b>
            </div>
            <div className="rounded-xl bg-surface-muted px-3 py-2">
              <p className="font-black uppercase text-neutral-500">New cap.</p>
              <b className="mt-1 block">{(stand.capacity + 850).toLocaleString()}</b>
            </div>
            <div className="rounded-xl bg-surface-muted px-3 py-2">
              <p className="font-black uppercase text-neutral-500">Level</p>
              <b className="mt-1 block">{stand.level + 1}</b>
            </div>
          </div>
          <Button className="w-full" onClick={() => upgrade(stand.id)}>Upgrade</Button>
        </Card>
      ))}
      <Card className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black">Repair to 100%</p>
            <p className="text-xs text-neutral-500">Improves condition by {repairGain}% and reduces stadium-risk pressure.</p>
          </div>
          <b className="shrink-0 text-danger">{formatMoney(repairCost)}</b>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-surface-muted px-3 py-2">
            <p className="font-black uppercase text-neutral-500">Current</p>
            <b className="mt-1 block">{pct(current.club.stadium.condition)}</b>
          </div>
          <div className="rounded-xl bg-surface-muted px-3 py-2">
            <p className="font-black uppercase text-neutral-500">After repair</p>
            <b className="mt-1 block">100%</b>
          </div>
        </div>
        <Button variant="secondary" className="w-full" onClick={repair} disabled={repairCost <= 0}>Repair Stadium</Button>
      </Card>
    </div>
  );
}

function HistoryTab({ save, setTab }: { save: GameSave; setTab: (tab: Tab) => void }) {
  const current = useCurrent(save)!;
  const goalDifference = current.club.record.gf - current.club.record.ga;
  const trophies = save.history.flatMap((item) => item.trophies.map((trophy) => `${item.season}: ${trophy}`));
  const unlockedAchievements = save.achievements.filter((achievement) => achievement.unlockedAt).length;
  const latestSeason = save.history.at(-1);
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,_#10241b,_#0f8139)] p-4 text-white">
          <p className="text-[10px] font-black uppercase text-white/65">Club legacy</p>
          <h2 className="mt-1 text-xl font-black">History</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/13 px-2 py-3 ring-1 ring-white/15">
              <b className="block text-lg">{save.history.length}</b>
              <span className="text-[10px] font-black uppercase text-white/65">Seasons</span>
            </div>
            <div className="rounded-2xl bg-white/13 px-2 py-3 ring-1 ring-white/15">
              <b className="block text-lg">{trophies.length}</b>
              <span className="text-[10px] font-black uppercase text-white/65">Trophies</span>
            </div>
            <div className="rounded-2xl bg-white px-2 py-3 text-emerald-950 shadow-[0_12px_24px_rgba(0,0,0,0.13)]">
              <b className="block text-lg text-primary">{unlockedAchievements}/{save.achievements.length}</b>
              <span className="text-[10px] font-black uppercase text-neutral-500">Achieved</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 text-xs">
          <div className="rounded-xl bg-surface-muted px-3 py-3">
            <p className="font-black uppercase text-neutral-500">Latest outcome</p>
            <b className="mt-1 block text-sm">{latestSeason ? latestSeason.outcome ?? "stayed" : "In progress"}</b>
          </div>
          <div className="rounded-xl bg-surface-muted px-3 py-3">
            <p className="font-black uppercase text-neutral-500">Cup status</p>
            <b className="mt-1 block text-sm">{cupStatus(save)}</b>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Current Season</h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">{save.divisions.find((division) => division.id === current.club.divisionId)?.name ?? "League"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-xs font-black uppercase text-neutral-500">Position</p><b className="mt-1 block text-lg">{current.position ? ordinal(current.position) : "-"}</b></div>
          <div className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-xs font-black uppercase text-neutral-500">Played</p><b className="mt-1 block text-lg">{current.club.record.played}</b></div>
          <div className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-xs font-black uppercase text-neutral-500">Record</p><b className="mt-1 block text-lg">{current.club.record.won}-{current.club.record.drawn}-{current.club.record.lost}</b></div>
          <div className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-xs font-black uppercase text-neutral-500">GD / Pts</p><b className="mt-1 block text-lg">{goalDifference > 0 ? `+${goalDifference}` : goalDifference} / {current.club.record.points}</b></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            <h2 className="text-lg font-black">Trophy Cabinet</h2>
          </div>
          {trophies.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-neutral-500">No trophies or promotions recorded.</p>
          ) : (
            <div className="grid gap-2">
              {trophies.map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                  <Trophy size={15} className="shrink-0 text-primary" />
                  <b>{label}</b>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{save.cup.name}</h2>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-black uppercase text-neutral-600">{cupStatus(save)}</span>
          </div>
          <div className="space-y-2">
            {save.cup.results.length === 0 ? <p className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-neutral-500">The first cup tie has not been played yet.</p> : save.cup.results.map((result) => (
              <div key={`${result.season}_${result.round}`} className="rounded-xl bg-surface-muted px-3 py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <b>{result.roundName}</b>
                  <b className={result.won ? "text-primary" : "text-danger"}>{result.won ? "Won" : "Lost"}</b>
                </div>
                <p className="mt-1 text-xs text-neutral-500">vs {result.opponentName} · {result.goalsFor}-{result.goalsAgainst} · Prize {formatMoney(result.prize)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-lg font-black">Season History</h3>
        {save.history.length === 0 ? <p className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-neutral-500">Finish a season to create history.</p> : save.history.map((item) => (
          <div key={item.season} className="rounded-xl border border-line bg-white p-3 text-sm shadow-[0_8px_18px_rgba(23,33,27,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <b className="text-base">{item.season}/{String(item.season + 1).slice(2)}</b>
                <p className="text-xs text-neutral-500">{item.divisionName}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase", item.outcome === "promoted" ? "bg-primary text-white" : item.outcome === "relegated" ? "bg-red-100 text-danger" : "bg-surface-muted text-neutral-600")}>{item.outcome ?? "stayed"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-surface-muted px-3 py-2"><p className="font-black uppercase text-neutral-500">Finish</p><b className="mt-1 block">{ordinal(item.position)}</b></div>
              <div className="rounded-xl bg-surface-muted px-3 py-2"><p className="font-black uppercase text-neutral-500">Record</p><b className="mt-1 block">{item.won ?? 0}-{item.drawn ?? 0}-{item.lost ?? 0}</b></div>
              <div className="rounded-xl bg-surface-muted px-3 py-2"><p className="font-black uppercase text-neutral-500">Award</p><b className="mt-1 block">{formatMoney(item.prizeMoney ?? 0)}</b></div>
              <div className="rounded-xl bg-surface-muted px-3 py-2"><p className="font-black uppercase text-neutral-500">Balance</p><b className="mt-1 block">{formatMoney(item.balance)}</b></div>
            </div>
            <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs text-neutral-600">Next: {item.nextDivisionName ?? item.divisionName} · {item.cupSummary ?? "No cup record"}</p>
            {item.seasonImpact ? (
              <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
                Season impact: Board {formatSignedPoints(item.seasonImpact.boardConfidenceAfter - item.seasonImpact.boardConfidenceBefore)} pts · Trust {formatSignedPoints(item.seasonImpact.managerTrustAfter - item.seasonImpact.managerTrustBefore)} pts · Reputation {formatSignedPoints(item.seasonImpact.reputationAfter - item.seasonImpact.reputationBefore)} pts
              </p>
            ) : null}
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-lg font-black">Hall of Fame</h3>
        {save.hallOfFame.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-neutral-500">Club legends will appear after long service.</p>
        ) : (
          <div className="grid gap-2">
            {save.hallOfFame.map((name) => (
              <div key={name} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950">{name}</div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black">Achievements</h3>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">{unlockedAchievements}/{save.achievements.length} unlocked</span>
        </div>
        <div className="grid gap-2">
          {save.achievements.map((achievement) => (
            <div key={achievement.id} data-testid={`achievement-${achievement.id}`} className={cn("rounded-xl border px-3 py-3 text-sm", achievement.unlockedAt ? "border-emerald-100 bg-emerald-50" : "border-line bg-surface-muted")}>
              <div className="flex items-start gap-3">
                <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", achievement.unlockedAt ? "bg-primary text-white" : "bg-white text-neutral-400")}>
                  <Award size={17} />
                </div>
                <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-black">{achievement.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", achievement.unlockedAt ? "bg-primary text-white" : "bg-white text-neutral-500")}>{achievement.unlockedAt ? "Unlocked" : "Locked"}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{achievement.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-white">
                      <div data-testid={`achievement-progress-${achievement.id}`} className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (achievement.progress / Math.max(1, achievement.target)) * 100)}%` }} />
                    </div>
                    <b className="w-10 text-right text-[10px] text-neutral-500">{Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.target)) * 100))}%</b>
                  </div>
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
    const ok = await importFromJson(importText);
    setImportStatus(ok ? "Imported into Slot 1." : "Import failed. Paste a valid Football Director Pro save.");
    if (ok) setImportText("");
  };
  return (
    <div className="space-y-4">
      <PageBack setTab={setTab} />
      <Card className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,_#10241b,_#0f8139)] p-4 text-white">
          <p className="text-[10px] font-black uppercase text-white/65">Local career</p>
          <h2 className="mt-1 text-xl font-black">Settings</h2>
          <p className="mt-2 text-sm text-white/72">Save, restore, and tune the offline chairman experience.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/13 px-2 py-3 ring-1 ring-white/15">
              <b className="block truncate text-sm">{current.club.name}</b>
              <span className="text-[10px] font-black uppercase text-white/65">Club</span>
            </div>
            <div className="rounded-2xl bg-white/13 px-2 py-3 ring-1 ring-white/15">
              <b className="block text-sm">{save.settings.textSize}</b>
              <span className="text-[10px] font-black uppercase text-white/65">Text</span>
            </div>
            <div className="rounded-2xl bg-white px-2 py-3 text-emerald-950 shadow-[0_12px_24px_rgba(0,0,0,0.13)]">
              <b className="block text-sm text-primary">{save.settings.sound ? "On" : "Off"}</b>
              <span className="text-[10px] font-black uppercase text-neutral-500">Sound</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <Button className="w-full" onClick={persist}><Save size={16} /> Manual Save</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Type size={18} className="text-primary" />
          <h3 className="text-lg font-black">Accessibility</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={save.settings.textSize === "normal" ? "primary" : "secondary"} onClick={() => updateSettings({ textSize: "normal" })}>Normal Text</Button>
          <Button variant={save.settings.textSize === "large" ? "primary" : "secondary"} onClick={() => updateSettings({ textSize: "large" })}>Large Text</Button>
        </div>
        <Button variant={save.settings.sound ? "primary" : "secondary"} className="w-full" onClick={() => updateSettings({ sound: !save.settings.sound })}>
          <Volume2 size={16} /> Sound {save.settings.sound ? "On" : "Off"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileJson size={18} className="text-primary" />
              <h3 className="text-lg font-black">Export Save</h3>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Back up or share this local career.</p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-black uppercase text-neutral-600">{exportSizeKb}KB</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={copyExport}><Copy size={16} /> Copy JSON</Button>
          <Button variant="secondary" onClick={downloadExport}><Download size={16} /> Download</Button>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase text-neutral-500">Save preview</p>
          <textarea readOnly value={exportedSave} className="h-28 w-full resize-none rounded-xl border border-line bg-surface-muted p-3 font-mono text-[10px] leading-4 text-neutral-600" />
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-primary" />
          <h3 className="text-lg font-black">Import Save</h3>
        </div>
        <p className="rounded-xl bg-surface-muted px-3 py-3 text-xs leading-5 text-neutral-600">Pastes over Slot 1 after validation. Invalid saves are rejected.</p>
        <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste exported save JSON here" className="h-32 w-full resize-none rounded-xl border border-line bg-white p-3 font-mono text-[10px] leading-4 outline-none focus:border-primary" />
        <Button className="w-full" onClick={submitImport} disabled={!importText.trim()}>Import Into Slot 1</Button>
      </Card>

      <Card className="space-y-3 border-red-100 bg-red-50/50">
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-danger" />
          <h3 className="text-lg font-black text-danger">Reset Career</h3>
        </div>
        <p className="rounded-xl bg-white px-3 py-3 text-xs leading-5 text-neutral-600">Deletes the local Slot 1 save from this browser.</p>
        {confirmReset ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button onClick={resetCareer}>Confirm Reset</Button>
          </div>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setConfirmReset(true)}>Reset Local Career</Button>
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
        <span className="block">{likelyAccepted ? "The player and manager should react well to these terms." : "A weak offer could irritate the player and disappoint the manager."}</span>
      </ImpactBox>
      <DecisionActionRow>
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
      <div className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-emerald-950 text-white shadow-[0_18px_36px_rgba(16,36,27,0.18)]">
        <div className="relative p-3">
          <div className="pointer-events-none absolute inset-0 opacity-16 [background:linear-gradient(120deg,transparent_0_38%,rgba(255,255,255,0.35)_38%_41%,transparent_41%_62%,rgba(255,255,255,0.16)_62%_64%,transparent_64%)]" />
          <div className="relative grid grid-cols-[7rem_1fr] items-stretch gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-emerald-900/60 shadow-[0_14px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/20">
              <PersonAvatar name={player.name} seedKey={player.id} variant="portrait" className="h-36 w-full rounded-none border-0 text-base shadow-none" />
              <span className={cn("absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-sm font-black text-white shadow-[0_8px_14px_rgba(0,0,0,0.22)]", positionClass(player.position))}>{displayPosition(player.position)}</span>
              <span className="absolute bottom-2 right-2 rounded-xl bg-white px-2.5 py-1 text-base font-black text-emerald-950 shadow-[0_8px_14px_rgba(0,0,0,0.18)]">{player.rating}</span>
            </div>
            <div className="min-w-0 py-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/58">{context}</p>
              <p className="mt-1 text-2xl font-black leading-none">{player.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Age</span><b>{player.age}</b></p>
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Contract</span><b>{player.contractYears}y</b></p>
              </div>
              <p className="mt-2 rounded-xl bg-white/10 px-2.5 py-2 text-xs ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Weekly wage</span><b>{formatWeeklyWage(player.wage)}</b></p>
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
          <div className="relative grid grid-cols-[7rem_1fr] items-stretch gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-emerald-900/60 shadow-[0_14px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/20">
              <PersonAvatar name={manager.name} seedKey={manager.id} kind="manager" variant="portrait" className="h-36 w-full rounded-none border-0 text-base shadow-none" />
              <span className="absolute bottom-2 right-2 rounded-xl bg-white px-2.5 py-1 text-base font-black text-emerald-950 shadow-[0_8px_14px_rgba(0,0,0,0.18)]">{managerRating(manager)}</span>
            </div>
            <div className="min-w-0 py-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/58">Manager office</p>
              <p className="mt-1 text-2xl font-black leading-none">{manager.name}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-black uppercase text-white/82 ring-1 ring-white/10">{manager.style}</span>
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-black uppercase text-white/82 ring-1 ring-white/10">{manager.personality}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Age</span><b>{manager.age}</b></p>
                <p className="rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/10"><span className="block text-[9px] font-black uppercase text-white/50">Trust</span><b>{current.club.managerTrust ?? 66}%</b></p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 bg-white text-center text-xs text-neutral-900">
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Rating</small>{managerRating(manager)}</span>
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Trust</small>{current.club.managerTrust ?? 66}%</span>
          <span className="px-2 py-2 font-black"><small className="block text-[9px] text-neutral-500">Wage</small>{formatWeeklyWage(manager.wage)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,_#ffffff,_#f3faf5)] shadow-[0_10px_24px_rgba(16,36,27,0.06)]">
      <div className="flex items-center gap-3 p-3">
        <BrandMark className="h-16 w-16 shrink-0 rounded-2xl shadow-[0_10px_22px_rgba(16,36,27,0.12)]" />
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
    <div className="mt-4 space-y-4 text-sm">
      <div className={cn("overflow-hidden rounded-2xl border shadow-[0_10px_24px_rgba(16,36,27,0.06)]", positive ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50")}>
        <div className="flex items-center justify-between gap-3 border-b border-white/70 px-4 py-3">
          <span className="text-xs font-black uppercase text-neutral-500">Report period</span>
          <b data-testid={`${testIdPrefix}-period`} className="text-xs">{snapshot.month} · Period {snapshot.week}</b>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs font-black uppercase text-neutral-500">{positive ? "Period profit" : "Period loss"}</p>
          <b data-testid={`${testIdPrefix}-result`} className={cn("mt-1 block text-4xl font-black", positive ? "text-primary" : "text-danger")}>{formatMoney(snapshot.profit)}</b>
          <p className="mt-1 text-xs text-neutral-600">Balance moved from {formatMoney(snapshot.balanceBefore)} to {formatMoney(snapshot.balanceAfter)}.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Opening balance <b data-testid={`${testIdPrefix}-opening`} className="block">{formatMoney(snapshot.balanceBefore)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Closing balance <b data-testid={`${testIdPrefix}-closing`} className="block">{formatMoney(snapshot.balanceAfter)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Total income <b data-testid={`${testIdPrefix}-income`} className="block text-primary">{formatMoney(snapshot.totalIncome)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Total expenses <b data-testid={`${testIdPrefix}-expenses`} className="block text-danger">{formatMoney(snapshot.totalExpenses)}</b></p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="mb-2 text-xs font-black uppercase text-neutral-500">Expenses</p>
        <div className="space-y-1.5">
          {expenses.map(([label, amount]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
              <span className="text-xs text-neutral-600">{label}</span>
              <b className="shrink-0 text-sm text-danger">-{formatMoney(amount as number)}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="mb-2 text-xs font-black uppercase text-neutral-500">Income</p>
        <div className="space-y-1.5">
          {income.map(([label, amount]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
              <span className="text-xs text-neutral-600">{label}</span>
              <b className="shrink-0 text-sm text-primary">{formatMoney(amount as number)}</b>
            </div>
          ))}
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
    <div className="mt-4 space-y-3">
      {modes.map((item) => (
        <button key={item.mode} onClick={() => setMode(item.mode)} className={cn("w-full rounded-lg border px-3 py-3 text-left", mode === item.mode ? "border-primary bg-emerald-50" : "border-line bg-white")}>
          <div className="flex items-center justify-between gap-3">
            <b>{item.label}</b>
            <b>{formatMoney(amountFor(item.factor))}</b>
          </div>
          <p className="text-xs text-neutral-500">{item.detail}</p>
          <p className="mt-1 text-xs font-bold text-neutral-500">
            {item.mode === "max" || item.mode === "generous" ? "The manager will welcome this." : item.mode === "strict" || item.mode === "zero" ? "The manager may feel restricted." : "A workable middle ground."}
          </p>
        </button>
      ))}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <p className="rounded-lg bg-surface-muted px-3 py-2">Money <b className="block">{formatMoney(current.club.finances.balance)}</b></p>
        <p className="rounded-lg bg-surface-muted px-3 py-2">Wage bill <b className="block">{formatMoney(current.club.finances.weeklyWages)}</b></p>
      </div>
      <ImpactBox>
        <b className="block">Selected budget impact</b>
        Transfer budget {formatMoney(selectedBudgetAmount)}. The manager reaction depends on how much room this gives him in the market.
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
        <span>Extend: weekly wage bill {formatSignedMoney(wageBillDelta)}/w, and the manager should feel backed.</span>
        <span className="block">Let him leave: the board will expect a replacement before the club continues.</span>
      </ImpactBox>
      <DecisionActionRow>
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
        The manager has put this player forward. Walking away or missing the deal may frustrate him; completing it should be well received.
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
      <DecisionActionRow>
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
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">The manager is comfortable letting him leave temporarily. The player returns at season end.</p>
        <ImpactBox>
          <b className="block">Accept loan impact</b>
          Fee income {formatMoney(expectedFee)}; weekly wage bill drops by {formatMoney(requestedWage)}/w while the player is away.
        </ImpactBox>
        <DecisionActionRow>
          <Button onClick={() => resolve({ action: "offer", terms: { fee: expectedFee, wage: requestedWage, years: 1 } })}>Accept Loan</Button>
          <Button variant="secondary" onClick={() => resolve({ action: "reject" })}>Reject</Button>
        </DecisionActionRow>
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
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">The manager wants short-term cover here. Weak terms or walking away may frustrate him.</p>
      <ImpactBox>
        <b className="block">Selected loan impact</b>
        Upfront loan fee {formatMoney(fee)}; weekly wage bill would rise by {formatMoney(wage)}/w to {formatMoney(selectedWageBill)}/w if the loan is completed.
      </ImpactBox>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Loan fee</p>
        <div className="grid grid-cols-3 gap-2">
          {feeOptions.map((option) => (
            <button key={option} onClick={() => setFee(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", fee === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatMoney(option)}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-neutral-500">Weekly contribution</p>
        <div className="grid grid-cols-3 gap-2">
          {wageOptions.map((option) => (
            <button key={option} onClick={() => setWage(option)} className={cn("rounded-lg border px-2 py-2 text-xs font-bold", wage === option ? "border-primary bg-primary text-white shadow-[0_8px_18px_rgba(21,153,71,0.18)]" : "border-line bg-white")}>{formatWeeklyWage(option)}</button>
          ))}
        </div>
      </div>
      <DecisionActionRow>
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
    const timer = window.setTimeout(() => setMinute((value) => Math.min(90, value + 1)), 90);
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle_at_top,_#135f36,_#071510_70%)] p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="live-match-title" className="max-h-full w-full max-w-md overflow-hidden rounded-[1.4rem] border border-white/15 bg-white shadow-[0_28px_70px_rgba(0,0,0,0.36)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,_#10241b,_#0f8139_62%,_#1aa24f)] px-4 py-4 text-white">
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
        <div className="max-h-[calc(100svh-10rem)] overflow-y-auto p-4">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,_#0e8f43,_#0b6f35)] p-4 text-white shadow-[0_12px_30px_rgba(16,36,27,0.14)]">
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

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <p className="rounded-xl bg-surface-muted px-2 py-3"><b>{result.possessionHome}%</b><span className="block text-[10px] font-bold uppercase text-neutral-500">Possession</span></p>
            <p className="rounded-xl bg-surface-muted px-2 py-3"><b>{visibleHomeShots}-{visibleAwayShots}</b><span className="block text-[10px] font-bold uppercase text-neutral-500">Shots</span></p>
            <p className="rounded-xl bg-surface-muted px-2 py-3"><b>{visibleHomeOnTarget}-{visibleAwayOnTarget}</b><span className="block text-[10px] font-bold uppercase text-neutral-500">On target</span></p>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f5faf6)] p-3">
            <p className="mb-2 text-xs font-black uppercase text-neutral-500">Match feed</p>
            <div className="space-y-2">
              {visibleEvents.length === 0 ? <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-neutral-500">No major events yet.</p> : visibleEvents.slice(-6).map((matchEvent, index) => (
                <div key={`${matchEvent.minute}-${index}`} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm", matchEvent.type === "goal" ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100" : "bg-surface-muted")}>
                  <PersonAvatar name={matchEvent.playerName} className="h-8 w-8 shrink-0 rounded-md text-[10px]" />
                  <p className="min-w-0"><b>{matchEvent.minute}&apos;</b> {matchEvent.description}</p>
                </div>
              ))}
              {minute >= 90 ? <p className="rounded-xl bg-emerald-950 px-3 py-2 text-sm font-bold text-white">90&apos; Final whistle.</p> : null}
            </div>
          </div>
          {minute >= 90 ? <Button className="mt-5 w-full shadow-card" onClick={() => finishLiveMatch()}>Continue</Button> : null}
        </div>
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
    <div className="mt-4 space-y-4">
      <div className={cn(
        "overflow-hidden rounded-2xl border shadow-[0_14px_30px_rgba(16,36,27,0.08)]",
        outcomeTone === "positive" && "border-emerald-100 bg-[linear-gradient(135deg,_#ecfdf5,_#ffffff)]",
        outcomeTone === "negative" && "border-red-100 bg-[linear-gradient(135deg,_#fff1f2,_#ffffff)]",
        outcomeTone === "neutral" && "border-line bg-[linear-gradient(135deg,_#f5faf6,_#ffffff)]",
      )}>
        <div className={cn(
          "flex items-center gap-3 px-4 py-4",
          outcomeTone === "positive" && "bg-emerald-950 text-white",
          outcomeTone === "negative" && "bg-red-950 text-white",
          outcomeTone === "neutral" && "bg-[linear-gradient(135deg,_#10241b,_#155f3a)] text-white",
        )}>
          <span className={cn(
            "grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-black shadow-[0_10px_24px_rgba(0,0,0,0.18)]",
            outcomeTone === "positive" && "text-primary",
            outcomeTone === "negative" && "text-danger",
            outcomeTone === "neutral" && "text-emerald-950",
          )}>{ordinal(history.position)}</span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-white/70">{history.divisionName}</p>
            <p className="text-xl font-black leading-tight">{outcomeLabel}</p>
            <p className="mt-1 text-xs text-white/70">Next league: {history.nextDivisionName ?? history.divisionName}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-white/40 bg-white text-center text-xs">
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">Pts</small>{history.points}</span>
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">W-D-L</small>{history.won ?? 0}-{history.drawn ?? 0}-{history.lost ?? 0}</span>
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">GD</small>{goalDifference > 0 ? `+${goalDifference}` : goalDifference}</span>
          <span className="px-2 py-3 font-black"><small className="block text-[10px] text-neutral-500">Played</small>{history.played ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <EventMetricTile label="Season award" value={formatMoney(history.prizeMoney ?? 0)} tone={(history.prizeMoney ?? 0) > 0 ? "positive" : "neutral"} />
        <EventMetricTile label="Closing balance" value={formatMoney(history.balance)} tone={history.balance < 0 ? "negative" : "neutral"} />
        <EventMetricTile label="Outcome" value={outcomeLabel} tone={outcomeTone} />
        <EventMetricTile label="Next league" value={history.nextDivisionName ?? history.divisionName} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f6fbf7)]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-950 text-white"><Trophy size={19} /></span>
          <div>
            <p className="text-xs font-black uppercase text-primary">Cup run</p>
            <p className="text-sm font-bold text-neutral-700">{history.cupSummary ?? "No cup record."}</p>
          </div>
        </div>
        {history.trophies.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {history.trophies.map((trophy) => (
              <span key={trophy} className="rounded-full bg-primary px-3 py-1.5 text-xs font-black text-white">{trophy}</span>
            ))}
          </div>
        ) : null}
      </div>

      {impact ? (
        <div className="rounded-2xl border border-line bg-white p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-500">Season impact</p>
          <div className="grid grid-cols-2 gap-2">
            <EventMetricTile label="Balance" value={formatSignedMoney(impact.balanceAfter - impact.balanceBefore)} tone={impact.balanceAfter >= impact.balanceBefore ? "positive" : "negative"} />
            <EventMetricTile label="Board" value={`${formatSignedPoints(impact.boardConfidenceAfter - impact.boardConfidenceBefore)} (${impact.boardConfidenceBefore}% to ${impact.boardConfidenceAfter}%)`} tone={impact.boardConfidenceAfter >= impact.boardConfidenceBefore ? "positive" : "negative"} />
            <EventMetricTile label="Trust" value={`${formatSignedPoints(impact.managerTrustAfter - impact.managerTrustBefore)} (${impact.managerTrustBefore}% to ${impact.managerTrustAfter}%)`} tone={impact.managerTrustAfter >= impact.managerTrustBefore ? "positive" : "negative"} />
            <EventMetricTile label="Reputation" value={`${formatSignedPoints(impact.reputationAfter - impact.reputationBefore)} (${impact.reputationBefore} to ${impact.reputationAfter})`} tone={impact.reputationAfter >= impact.reputationBefore ? "positive" : "negative"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EventMetricTile({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: "neutral" | "positive" | "negative" | "dark" }) {
  return (
    <p className={cn(
      "min-w-0 rounded-xl px-3 py-3 text-xs",
      tone === "positive" && "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100",
      tone === "negative" && "bg-red-50 text-red-950 ring-1 ring-red-100",
      tone === "dark" && "bg-emerald-950 text-white",
      tone === "neutral" && "bg-surface-muted text-neutral-700",
    )}>
      <span className={cn("block text-[10px] font-black uppercase", tone === "dark" ? "text-white/65" : "text-neutral-500")}>{label}</span>
      <b className="mt-1 block break-words text-sm leading-tight">{value}</b>
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
          <EventMetricTile label="Trust" value={`${current.club.managerTrust}%`} tone={current.club.managerTrust < 50 ? "negative" : "neutral"} />
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
        <EventMetricTile label="Trust" value={`${current.club.managerTrust}%`} tone={current.club.managerTrust < 50 ? "negative" : "neutral"} />
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
  const tone = eventToneClasses(event.variant);
  const statusLabel = event.requiresDecision ? "Decision required" : event.type === "match_preview" ? "Match choice" : "Club update";
  const periodLabel = `${seasonLabel(save.season)} · ${monthForWeek(event.createdWeek || save.week)} · Period ${event.createdWeek || save.week}`;
  const queueLabel = save.eventQueue.length > 0 ? `${save.eventQueue.length} queued` : "Current item";
  const showEventNote = Boolean(event.note && event.type !== "season_summary");

  if (result && save.liveMatch && !save.liveMatch.finished) return <LiveMatchModal save={save} result={result} />;

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-[radial-gradient(circle_at_top,_rgba(15,129,57,0.24),_rgba(16,36,27,0.7))] p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="event-title" className="max-h-[calc(100svh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[1.35rem] border border-white/40 bg-white shadow-[0_28px_70px_rgba(16,36,27,0.32)]">
        <div className={cn("relative overflow-hidden px-5 py-4", tone.header)}>
          <div className="pointer-events-none absolute inset-0 opacity-20 [background:linear-gradient(120deg,transparent_0_42%,rgba(255,255,255,0.35)_42%_44%,transparent_44%_58%,rgba(255,255,255,0.18)_58%_60%,transparent_60%)]" />
          <div className="relative flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1", tone.chip)}>{statusLabel}</span>
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1", tone.chip)}>{eventCategory(event.type)}</span>
            <span className="ml-auto rounded-full bg-black/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/85 ring-1 ring-white/15">{queueLabel}</span>
          </div>
          <h2 id="event-title" className="relative mt-3 text-2xl font-black leading-tight">{event.title}</h2>
          <p className="relative mt-1 text-xs font-semibold text-white/75">{periodLabel}</p>
        </div>

        <div className="p-5">
          <EventEntityHeader save={save} />
          <div className={cn("mt-4 rounded-2xl px-3 py-3 text-sm leading-6 ring-1", tone.accent)}>
            {event.body}
          </div>
          {showEventNote ? <p className="mt-3 rounded-2xl border border-line bg-surface-muted px-3 py-3 text-xs leading-5 text-neutral-600"><b className="block text-neutral-800">Context</b>{event.note}</p> : null}
          <SpecialEventPanel save={save} />

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
                The manager {saleImpact.starter ? "will want the squad protected if this player leaves" : "is open to the sale if the fee is right"}.
                <span className="block">{saleImpact.summary}</span>
                <span className="block">Rejecting keeps the squad intact, but may close this market opportunity.</span>
              </ImpactBox>
            );
          })() : (
            <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-neutral-600">The manager&apos;s reaction depends on whether the fee matches the player&apos;s role in the squad.</p>
          )}
          <DecisionActionRow className="mt-5">
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
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(180deg,_#ffffff,_#f3faf5)] shadow-[0_10px_24px_rgba(16,36,27,0.06)]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center">
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Home</p>
                  <p className="mt-1 text-sm font-black leading-tight">{save.clubs[save.lastMatch.homeClubId].name}</p>
                </div>
                <div className="px-3 py-4">
                  <p className="rounded-2xl bg-emerald-950 px-4 py-3 text-3xl font-black text-white">{result.homeGoals}-{result.awayGoals}</p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Away</p>
                  <p className="mt-1 text-sm font-black leading-tight">{save.clubs[save.lastMatch.awayClubId].name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-line bg-white text-center text-xs">
                <p className="px-2 py-2"><b className="block text-sm">{result.possessionHome}%</b><span className="text-neutral-500">Possession</span></p>
                <p className="px-2 py-2"><b className="block text-sm">{result.homeShots}-{result.awayShots}</b><span className="text-neutral-500">Shots</span></p>
                <p className="px-2 py-2"><b className="block text-sm">{result.homeOnTarget}-{result.awayOnTarget}</b><span className="text-neutral-500">On target</span></p>
              </div>
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
          <div className="mt-5 border-t border-line pt-3">
            <Button className="w-full shadow-card" onClick={() => resolve({ action: "continue" })}>Continue</Button>
          </div>
        ) : null}
        {nextFixture && event.type === "match_preview" ? <p className="mt-3 text-center text-xs text-neutral-500">{save.clubs[nextFixture.homeClubId].name} vs {save.clubs[nextFixture.awayClubId].name}</p> : null}
        </div>
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
  const contentRef = useRef<HTMLDivElement>(null);
  const setActiveTab = (nextTab: Tab) => {
    clearMessage();
    setTab(nextTab);
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0 });
    });
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
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-4 pb-5">
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
