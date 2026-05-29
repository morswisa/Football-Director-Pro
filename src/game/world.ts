import { clubPrefixes, clubSuffixes, divisionNames, firstNames, lastNames, managerStyles, personalities, positions, starterAchievements } from "./data";
import { calculateRecommendedManagerWage, calculateRecommendedPlayerWage, managerRating } from "./economy";
import { normalizeSeed, pickOne, randomInt } from "./random";
import type { Club, ClubSetupInput, Division, GameSave, LeagueRecord, Manager, Player, Stadium } from "./types";

function emptyRecord(): LeagueRecord {
  return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
}

function id(prefix: string, value: number) {
  return `${prefix}_${value.toString(36)}`;
}

function makeName(seed: number): [string, number] {
  const [first, s1] = pickOne(seed, firstNames);
  const [last, s2] = pickOne(s1, lastNames);
  return [`${first} ${last}`, s2];
}

function generatePlayer(seed: number, clubId: string | undefined, position: Player["position"], level: number, index: number): [Player, number] {
  const [name, s1] = makeName(seed);
  const [age, s2] = randomInt(s1, 18, 34);
  const base = 86 - level * 7;
  const [ratingRoll, s3] = randomInt(s2, -7, 7);
  const rating = Math.max(28, Math.min(94, base + ratingRoll));
  const [potentialRoll, s4] = randomInt(s3, 0, 12);
  const [personality, s5] = pickOne(s4, personalities);
  const value = Math.max(30_000, rating * rating * (36 - age) * 18);
  const wage = calculateRecommendedPlayerWage({ rating, age, potential: Math.min(99, rating + potentialRoll) } as Player, level);
  return [
    {
      id: id("player", s5 + index),
      clubId,
      name,
      position,
      age,
      rating,
      potential: Math.min(99, rating + potentialRoll),
      wage,
      value,
      contractYears: Math.max(1, 5 - Math.floor(age / 10)),
      form: 62,
      fitness: 94,
      morale: 68,
      personality,
      seasonStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
      careerStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
    },
    s5,
  ];
}

function generateManager(seed: number, level: number, index: number): [Manager, number] {
  const [name, s1] = makeName(seed);
  const [style, s2] = pickOne(s1, managerStyles);
  const [personality, s3] = pickOne(s2, personalities);
  const base = 82 - level * 6;
  const [training, s4] = randomInt(s3, base - 10, base + 12);
  const [tactics, s5] = randomInt(s4, base - 10, base + 12);
  const [transferTaste, s7] = randomInt(s5, base - 10, base + 12);
  const [youthPreference, s8] = randomInt(s7, 35, 95);
  const [age, s10] = randomInt(s8, 36, 64);
  const managerCore = {
    training: Math.max(20, Math.min(99, training)),
    tactics: Math.max(20, Math.min(99, tactics)),
    transferTaste: Math.max(20, Math.min(99, transferTaste)),
    youthPreference: Math.max(20, Math.min(99, youthPreference)),
  };
  const reputation = managerRating({ ...managerCore, reputation: 0, personality } as Manager);
  const manager = {
    id: id("manager", s10 + index),
    name,
    age,
    style,
    personality,
    ...managerCore,
    contractYears: 2,
    reputation,
    status: "contracted" as const,
  };
  return [
    {
      ...manager,
      wage: calculateRecommendedManagerWage({ ...manager, wage: 0 } as Manager, level),
    },
    s10,
  ];
}

function createStadium(name: string, level: number): Stadium {
  const standCapacity = Math.max(450, 2_300 - level * 220);
  return {
    name,
    capacity: standCapacity * 4,
    condition: 78,
    facilityLevel: Math.max(1, 8 - level),
    stands: [
      { id: "north", name: "North Stand", level: 1, capacity: standCapacity },
      { id: "south", name: "South Stand", level: 1, capacity: standCapacity },
      { id: "east", name: "East Stand", level: 1, capacity: standCapacity },
      { id: "west", name: "West Stand", level: 1, capacity: standCapacity },
    ],
  };
}

function uniqueClubName(prefix: string, preferredSuffix: string, usedNames: Set<string>) {
  const preferred = `${prefix} ${preferredSuffix}`;
  if (!usedNames.has(preferred)) {
    usedNames.add(preferred);
    return preferred;
  }
  for (const suffix of clubSuffixes) {
    const name = `${prefix} ${suffix}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  for (const alternatePrefix of clubPrefixes) {
    for (const suffix of clubSuffixes) {
      const name = `${alternatePrefix} ${suffix}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  }
  usedNames.add(preferred);
  return preferred;
}

function initialSponsorship(level: number, reputation: number) {
  const baseByLevel: Record<number, number> = {
    1: 42_000_000,
    2: 10_000_000,
    3: 4_500_000,
    4: 2_600_000,
    5: 1_800_000,
    6: 1_250_000,
    7: 950_000,
  };
  return Math.round((baseByLevel[level] ?? baseByLevel[7]) * (0.82 + reputation / 220));
}

function createClub(seed: number, name: string, divisionId: string, level: number, colors: [string, string], index: number): [Club, Player[], Manager, number] {
  let state = seed;
  const players: Player[] = [];
  for (let i = 0; i < positions.length; i += 1) {
    const [player, next] = generatePlayer(state, id("club", index), positions[i], level, index * 100 + i);
    players.push(player);
    state = next;
  }
  const [manager, next] = generateManager(state, level, index);
  state = next;
  const weeklyWages = players.reduce((sum, player) => sum + player.wage, 0) + manager.wage;
  const clubId = id("club", index);
  const reputation = Math.max(20, 95 - level * 9);
  const club: Club = {
    id: clubId,
    name,
    divisionId,
    reputation,
    playerIds: players.map((player) => player.id),
    managerId: manager.id,
    primaryColor: colors[0],
    secondaryColor: colors[1],
    boardConfidence: 72,
    managerTrust: 66,
    finances: {
      balance: Math.max(450_000, 5_500_000 - level * 650_000),
      weeklyWages,
      sponsorship: initialSponsorship(level, reputation),
      ticketIncome: 0,
      merchIncome: 0,
      upkeep: Math.max(12_000, 70_000 - level * 6_000),
      debtLimit: -1_500_000,
      lastWeekProfit: 0,
      transactions: [],
    },
    stadium: createStadium(`${name.replace(/ (FC|United|Town|City|Athletic|Rovers|Albion|County)$/u, "")} Park`, level),
    trainingLevel: Math.max(18, 72 - level * 7),
    youthLevel: Math.max(16, 68 - level * 7),
    record: emptyRecord(),
  };
  const fixedPlayers = players.map((player) => ({ ...player, clubId }));
  return [club, fixedPlayers, { ...manager, status: "contracted", clubId }, state];
}

export function generateSeasonFixtures(division: Division): import("./types").Fixture[] {
  const clubIds = division.clubIds.length % 2 === 0 ? [...division.clubIds] : [...division.clubIds, "__bye__"];
  const fixtures: import("./types").Fixture[] = [];
  let rotation = [...clubIds];
  const rounds = rotation.length - 1;
  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < rotation.length / 2; i += 1) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];
      if (a === "__bye__" || b === "__bye__") continue;
      const firstHome = round % 2 === 0 ? a : b;
      const firstAway = round % 2 === 0 ? b : a;
      fixtures.push({
        id: `fx_${division.id}_${round}_${i}_h`,
        round,
        homeClubId: firstHome,
        awayClubId: firstAway,
        status: "scheduled",
      });
      fixtures.push({
        id: `fx_${division.id}_${round}_${i}_a`,
        round: round + rounds,
        homeClubId: firstAway,
        awayClubId: firstHome,
        status: "scheduled",
      });
    }
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }
  return fixtures.sort((a, b) => a.round - b.round);
}

export function generateManagerCandidates(seed: number, level = 7): [Manager[], number] {
  const candidates: Manager[] = [];
  let state = seed;
  for (let i = 0; i < 6; i += 1) {
    const [manager, next] = generateManager(state + i * 311, level, 5_000 + i);
    const status = i % 2 === 0 ? "free_agent" : "contracted";
    const candidate = { ...manager, status, clubId: status === "contracted" ? `external_club_${i}` : undefined, contractYears: 2 + (i % 2) } as Manager;
    candidates.push({ ...candidate, compensationFee: status === "contracted" ? Math.round(candidate.wage * 4.33 * candidate.contractYears * 12) : 0 });
    state = next;
  }
  return [candidates.sort((a, b) => b.reputation - a.reputation), state];
}

export function createNewGame(input: ClubSetupInput): GameSave {
  let state = normalizeSeed(input.seed ?? Date.now());
  const divisions: Division[] = [];
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  const managers: Record<string, Manager> = {};
  let clubIndex = 1;
  const usedClubNames = new Set<string>([input.clubName]);

  for (let level = 1; level <= 7; level += 1) {
    const divisionId = `division_${level}`;
    const division: Division = { id: divisionId, name: divisionNames[level - 1], level, clubIds: [] };
    const prefixOrder = clubPrefixes.map((_, index) => clubPrefixes[(index + level * 3) % clubPrefixes.length]);
    for (let i = 0; i < 20; i += 1) {
      const prefix = prefixOrder[i % prefixOrder.length];
      const [suffix, s2] = pickOne(state, clubSuffixes);
      state = s2;
      const name = level === 7 && i === 0 ? input.clubName : uniqueClubName(prefix, suffix, usedClubNames);
      const colors: [string, string] = level === 7 && i === 0 ? [input.primaryColor, input.secondaryColor] : ["#159947", "#f2f7f1"];
      const [club, clubPlayers, manager, next] = createClub(state, name, divisionId, level, colors, clubIndex);
      const userClubId = id("club", clubIndex);
      const finalClub = level === 7 && i === 0 ? { ...club, id: userClubId, stadium: { ...club.stadium, name: input.stadiumName } } : club;
      clubs[finalClub.id] = finalClub;
      clubPlayers.forEach((player) => {
        const fixed = { ...player, clubId: finalClub.id };
        players[fixed.id] = fixed;
      });
      managers[manager.id] = manager;
      division.clubIds.push(finalClub.id);
      state = next;
      clubIndex += 1;
    }
    divisions.push(division);
  }

  const userClubId = divisions[6].clubIds[0];
  const [managerCandidates, next] = generateManagerCandidates(state, 7);
  const now = new Date().toISOString();
  return {
    version: 1,
    id: `save_${state}`,
    slotId: "slot-1",
    createdAt: now,
    updatedAt: now,
    seed: normalizeSeed(input.seed ?? Date.now()),
    rngState: next,
    chairmanName: input.chairmanName,
    season: 2030,
    week: 1,
    userClubId,
    divisions,
    clubs,
    players,
    managers,
    managerCandidates,
    fixtures: generateSeasonFixtures(divisions[6]),
    currentRound: 0,
    eventQueue: [],
    seenEventKeys: [],
    pendingDeals: [],
    cup: { name: "Chairman's Cup", round: 1, maxRounds: 5, eliminated: false, won: false, results: [] },
    history: [],
    achievements: structuredClone(starterAchievements),
    hallOfFame: [],
    settings: { sound: true, textSize: "normal" },
  };
}

export function resetClubRecords(save: GameSave) {
  Object.values(save.clubs).forEach((club) => {
    club.record = emptyRecord();
  });
}
