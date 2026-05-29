import type { Manager, Player } from "./types";

const playerBaseByLevel: Record<number, number> = {
  7: 400,
  6: 750,
  5: 1_400,
  4: 2_500,
  3: 5_000,
  2: 14_000,
  1: 38_000,
};

const managerBaseByLevel: Record<number, number> = {
  7: 1_000,
  6: 1_800,
  5: 3_500,
  4: 6_000,
  3: 11_000,
  2: 24_000,
  1: 55_000,
};

export type SquadRole = "first_team" | "squad" | "reserve";

export function roundToNearest(value: number, nearest: number) {
  return Math.max(nearest, Math.round(value / nearest) * nearest);
}

export function managerRating(manager: Pick<Manager, "training" | "tactics" | "transferTaste" | "youthPreference">) {
  return Math.round((manager.training + manager.tactics + manager.transferTaste + manager.youthPreference) / 4);
}

export function calculateRecommendedPlayerWage(player: Player, divisionLevel: number, role: SquadRole = "squad") {
  const base = playerBaseByLevel[divisionLevel] ?? playerBaseByLevel[7];
  const ratingMultiplier = (player.rating / 50) ** 2.15;
  const ageMultiplier = player.age <= 20 ? 0.65 : player.age <= 24 ? 0.9 : player.age <= 29 ? 1 : player.age <= 33 ? 0.85 : 0.6;
  const roleMultiplier = role === "first_team" ? 1.15 : role === "reserve" ? 0.65 : 1;
  const potentialMultiplier = player.potential - player.rating >= 12 ? 1.12 : 1;
  return roundToNearest(base * ratingMultiplier * ageMultiplier * roleMultiplier * potentialMultiplier, 50);
}

export function calculateRecommendedManagerWage(manager: Pick<Manager, "training" | "tactics" | "transferTaste" | "youthPreference" | "reputation" | "personality">, divisionLevel: number) {
  const base = managerBaseByLevel[divisionLevel] ?? managerBaseByLevel[7];
  const ratingMultiplier = (managerRating(manager) / 50) ** 2;
  const reputationMultiplier = 0.85 + manager.reputation / 100;
  const stylePremium = manager.personality === "Winner" ? 1.12 : manager.personality === "Builder" || manager.personality === "Mentor" ? 1.05 : manager.personality === "Pragmatist" ? 1 : 0.95;
  return roundToNearest(base * ratingMultiplier * reputationMultiplier * stylePremium, 100);
}

export function calculateManagerCompensation(manager: Pick<Manager, "wage" | "contractYears">) {
  const remainingMonths = Math.max(0, manager.contractYears * 12);
  return Math.round(manager.wage * 4.33 * remainingMonths);
}
