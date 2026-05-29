import { clubPrefixes, clubSuffixes, firstNames, lastNames, personalities, starterAchievements } from "./data";
import { cupPrize, cupRoundName, cupRoundWeeks, isTransferWindow, monthForWeek, nextUpgradeCost, seasonPrize } from "./calendar";
import { calculateManagerCompensation, calculateRecommendedManagerWage, calculateRecommendedPlayerWage, managerRating } from "./economy";
import { chance, pickOne, randomFloat, randomInt } from "./random";
import { createNewGame as createWorldGame, generateManagerCandidates, generateSeasonFixtures, resetClubRecords } from "./world";
import type {
  Club,
  ContractTerms,
  FinancialSnapshot,
  Fixture,
  GameEvent,
  GameSave,
  LeagueRecord,
  Manager,
  MatchEvent,
  MatchResult,
  PendingDeal,
  Player,
  TransferBudgetMode,
  TransferProposal,
} from "./types";

export const createNewGame = createWorldGame;
export { calculateManagerCompensation, calculateRecommendedManagerWage, calculateRecommendedPlayerWage, managerRating };

function clone(save: GameSave): GameSave {
  return structuredClone(save);
}

function withUpdate(save: GameSave) {
  save.updatedAt = new Date().toISOString();
  return save;
}

function userClub(save: GameSave) {
  const club = save.clubs[save.userClubId];
  club.managerTrust ??= 66;
  return club;
}

function playersForClub(save: GameSave, club: Club) {
  return club.playerIds.map((id) => save.players[id]).filter(Boolean);
}

function createDepthPlayer(save: GameSave, club: Club, position: Player["position"]) {
  const level = save.divisions.find((division) => division.id === club.divisionId)?.level ?? 7;
  const [first, s1] = pickOne(save.rngState, firstNames);
  const [last, s2] = pickOne(s1, lastNames);
  const [ratingRoll, s3] = randomInt(s2, -4, 7);
  const [age, s4] = randomInt(s3, 18, 31);
  const [personality, s5] = pickOne(s4, personalities);
  save.rngState = s5;
  const rating = Math.max(24, Math.min(88, 82 - level * 7 + ratingRoll));
  const potential = Math.min(95, rating + (age <= 22 ? 9 : 3));
  const id = `depth_${save.season}_${club.id}_${position}_${s5}`;
  const player: Player = {
    id,
    clubId: club.id,
    name: `${first} ${last}`,
    position,
    age,
    rating,
    potential,
    wage: calculateRecommendedPlayerWage({ rating, age, potential } as Player, level, "reserve"),
    value: Math.max(20_000, rating * rating * (36 - age) * 14),
    contractYears: 2,
    form: 58,
    fitness: 94,
    morale: 62,
    personality,
    seasonStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
    careerStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
  };
  save.players[id] = player;
  club.playerIds.push(id);
  return player;
}

function ensureClubSquadDepth(save: GameSave, club: Club) {
  const minimumByPosition: Record<Player["position"], number> = { G: 2, D: 5, M: 5, F: 4 };
  (Object.keys(minimumByPosition) as Player["position"][]).forEach((position) => {
    let count = playersForClub(save, club).filter((player) => player.position === position).length;
    while (count < minimumByPosition[position]) {
      createDepthPlayer(save, club, position);
      count += 1;
    }
  });
  while (playersForClub(save, club).length < 18) {
    createDepthPlayer(save, club, ["D", "M", "F"][playersForClub(save, club).length % 3] as Player["position"]);
  }
  if (club.id === save.userClubId) refreshUserWageBill(save);
}

function ensureAllSquadDepth(save: GameSave) {
  Object.values(save.clubs).forEach((club) => ensureClubSquadDepth(save, club));
}

function playerWeeklyCostForClub(player: Player, clubId: string) {
  if (player.loan && player.loan.temporaryClubId === clubId) return player.loan.wageShare;
  return player.wage;
}

function refreshUserWageBill(save: GameSave) {
  const club = userClub(save);
  const manager = getManager(save, club);
  club.finances.weeklyWages = playersForClub(save, club).reduce((sum, player) => sum + playerWeeklyCostForClub(player, club.id), 0) + (manager?.wage ?? 0);
}

function getManager(save: GameSave, club: Club) {
  return club.managerId ? save.managers[club.managerId] : undefined;
}

function ensureEventState(save: GameSave) {
  save.eventQueue ??= [];
  save.seenEventKeys ??= [];
  save.pendingDeals ??= [];
  save.managerCandidates ??= [];
  save.managerActionLockUntilWeek ??= 0;
  save.cup ??= { name: "Chairman's Cup", round: 1, maxRounds: 5, eliminated: false, won: false, results: [] };
  save.cup.name ??= "Chairman's Cup";
  save.cup.round = Math.max(1, save.cup.round ?? 1);
  save.cup.maxRounds = Math.max(5, save.cup.maxRounds ?? 5);
  save.cup.results ??= [];
  save.cup.eliminated ??= false;
  save.cup.won ??= false;
  return save;
}

function currentDivisionLevel(save: GameSave) {
  return save.divisions.find((division) => division.id === userClub(save).divisionId)?.level ?? 7;
}

function sponsorshipForLevel(level: number, reputation: number) {
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

function debtLimitForLevel(level: number) {
  const limits: Record<number, number> = {
    1: -32_000_000,
    2: -12_000_000,
    3: -5_500_000,
    4: -3_200_000,
    5: -2_300_000,
    6: -1_800_000,
    7: -1_500_000,
  };
  return limits[level] ?? limits[7];
}

function ticketPriceForLevel(level: number) {
  const prices: Record<number, number> = {
    1: 32,
    2: 27,
    3: 22,
    4: 18,
    5: 15,
    6: 12,
    7: 9,
  };
  return prices[level] ?? prices[7];
}

function applyClubSeasonEconomy(save: GameSave) {
  const club = userClub(save);
  const level = currentDivisionLevel(save);
  club.finances.sponsorship = sponsorshipForLevel(level, club.reputation);
  club.finances.debtLimit = debtLimitForLevel(level);
  club.finances.upkeep = Math.max(8_000, Math.round(club.finances.upkeep * 0.94 + club.stadium.capacity * 0.18 + (club.trainingLevel + club.youthLevel) * 55));
  refreshUserWageBill(save);
}

function adjustRelationshipAfterMatch(save: GameSave, fixture: Fixture, result: MatchResult) {
  const club = userClub(save);
  const userHome = fixture.homeClubId === club.id;
  const goalsFor = userHome ? result.homeGoals : result.awayGoals;
  const goalsAgainst = userHome ? result.awayGoals : result.homeGoals;
  const delta = goalsFor > goalsAgainst ? 2 : goalsFor === goalsAgainst ? 0 : -2;
  club.boardConfidence = Math.max(5, Math.min(99, club.boardConfidence + delta + (club.finances.balance < 0 ? -1 : 0)));
  club.managerTrust = Math.max(0, Math.min(99, club.managerTrust + (delta > 0 ? 1 : delta < 0 ? -1 : 0)));
  club.stadium.condition = Math.max(35, club.stadium.condition - (fixture.competition === "cup" ? 2 : 1));
}

function relationshipSnapshot(save: GameSave) {
  const club = userClub(save);
  return {
    boardConfidence: club.boardConfidence,
    managerTrust: club.managerTrust,
    stadiumCondition: club.stadium.condition,
  };
}

function signedDelta(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

function signedMoney(value: number) {
  const formatted = Math.abs(value).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function matchImpactNote(before: ReturnType<typeof relationshipSnapshot>, after: ReturnType<typeof relationshipSnapshot>) {
  const boardDelta = after.boardConfidence - before.boardConfidence;
  const trustDelta = after.managerTrust - before.managerTrust;
  const stadiumDelta = after.stadiumCondition - before.stadiumCondition;
  return `Impact: board confidence ${signedDelta(boardDelta)} (${before.boardConfidence}% -> ${after.boardConfidence}%), manager trust ${signedDelta(trustDelta)} (${before.managerTrust}% -> ${after.managerTrust}%), stadium condition ${signedDelta(stadiumDelta)} (${before.stadiumCondition}% -> ${after.stadiumCondition}%).`;
}

function seasonImpactNote(history: GameSave["history"][number]) {
  const impact = history.seasonImpact;
  if (!impact) return undefined;
  const balanceDelta = impact.balanceAfter - impact.balanceBefore;
  const boardDelta = impact.boardConfidenceAfter - impact.boardConfidenceBefore;
  const trustDelta = impact.managerTrustAfter - impact.managerTrustBefore;
  const reputationDelta = impact.reputationAfter - impact.reputationBefore;
  return `Season impact: balance ${signedMoney(balanceDelta)}, board confidence ${signedDelta(boardDelta)} (${impact.boardConfidenceBefore}% -> ${impact.boardConfidenceAfter}%), manager trust ${signedDelta(trustDelta)} (${impact.managerTrustBefore}% -> ${impact.managerTrustAfter}%), club reputation ${signedDelta(reputationDelta)} (${impact.reputationBefore} -> ${impact.reputationAfter}).`;
}

function isCupWeek(save: GameSave) {
  ensureEventState(save);
  return cupRoundWeeks[save.cup.round - 1] === save.week && !save.cup.eliminated && !save.cup.won;
}

function findCupFixture(save: GameSave, round = save.cup.round) {
  return save.fixtures.find((fixture) => fixture.competition === "cup" && fixture.cupRound === round && fixture.id.startsWith(`cup_${save.season}_`));
}

function createCupFixture(save: GameSave) {
  ensureEventState(save);
  const existing = findCupFixture(save);
  if (existing) return existing;
  const club = userClub(save);
  const currentLevel = currentDivisionLevel(save);
  const minimumLevel = Math.max(1, currentLevel - save.cup.round + 1);
  const candidateIds = save.divisions
    .filter((division) => division.level >= minimumLevel)
    .flatMap((division) => division.clubIds)
    .filter((clubId) => clubId !== club.id);
  const fallbackIds = Object.keys(save.clubs).filter((clubId) => clubId !== club.id);
  const pool = candidateIds.length ? candidateIds : fallbackIds;
  const [opponentId, s1] = pickOne(save.rngState + save.cup.round * 997, pool);
  const [homeRoll, s2] = randomInt(s1, 0, 100);
  save.rngState = s2;
  const userHome = save.cup.round === save.cup.maxRounds ? homeRoll >= 50 : homeRoll >= 42;
  const fixture: Fixture = {
    id: `cup_${save.season}_${save.cup.round}`,
    round: 800 + save.cup.round,
    homeClubId: userHome ? club.id : opponentId,
    awayClubId: userHome ? opponentId : club.id,
    status: "scheduled",
    competition: "cup",
    cupRound: save.cup.round,
  };
  save.fixtures.push(fixture);
  return fixture;
}

function normalizeManager(manager: Manager, status: Manager["status"], clubId?: string) {
  manager.status ??= status;
  manager.clubId ??= clubId;
  manager.youthPreference = Math.max(20, Math.min(99, manager.youthPreference ?? manager.reputation ?? 50));
  manager.transferTaste = Math.max(20, Math.min(99, manager.transferTaste ?? manager.reputation ?? 50));
  manager.reputation = managerRating(manager);
  manager.wage = Math.max(100, manager.wage ?? 1_000);
  manager.contractYears = manager.contractYears == null ? 2 : Math.max(0, manager.contractYears);
  if (manager.status === "contracted") manager.compensationFee = calculateManagerCompensation(manager);
  return manager;
}

function ensureManagerState(save: GameSave) {
  const club = userClub(save);
  if (club.managerId && save.managers[club.managerId]) normalizeManager(save.managers[club.managerId], "contracted", club.id);
  save.managerCandidates = (save.managerCandidates ?? []).map((manager, index) => normalizeManager(manager, manager.status ?? (index % 2 === 0 ? "free_agent" : "contracted"), manager.status === "contracted" ? manager.clubId ?? `external_club_${index}` : undefined));
  return save;
}

function ensureUniqueDisplayNames(save: GameSave) {
  const renameClubNaturally = (club: Club, usedNames: Set<string>) => {
    if (!usedNames.has(club.name)) {
      usedNames.add(club.name);
      return;
    }
    const parts = club.name.replace(/ \d+$/u, "").split(" ");
    const originalPrefix = parts[0] || "Crownford";
    const originalSuffix = parts.slice(1).join(" ") || "FC";
    for (const suffix of clubSuffixes) {
      const candidate = `${originalPrefix} ${suffix}`;
      if (!usedNames.has(candidate)) {
        club.name = candidate;
        usedNames.add(candidate);
        return;
      }
    }
    for (const prefix of clubPrefixes) {
      for (const suffix of clubSuffixes) {
        const candidate = `${prefix} ${suffix}`;
        if (!usedNames.has(candidate)) {
          club.name = candidate;
          usedNames.add(candidate);
          return;
        }
      }
    }
    club.name = `${originalPrefix} ${originalSuffix}`;
    usedNames.add(club.name);
  };

  save.divisions.forEach((division) => {
    const usedPrefixes = new Set<string>();
    division.clubIds.forEach((clubId) => {
      const club = save.clubs[clubId];
      if (!club) return;
      const parts = club.name.split(" ");
      const suffix = parts.slice(1).join(" ") || "FC";
      let prefix = parts[0];
      if (usedPrefixes.has(prefix)) {
        prefix = clubPrefixes.find((candidate) => !usedPrefixes.has(candidate)) ?? `${prefix} ${usedPrefixes.size + 1}`;
        club.name = `${prefix} ${suffix}`;
      }
      usedPrefixes.add(prefix);
    });
  });
  const usedClubNames = new Set<string>();
  Object.values(save.clubs).forEach((club) => renameClubNaturally(club, usedClubNames));
  Object.values(save.clubs).forEach((club) => {
    const playerCounts = new Map<string, number>();
    club.playerIds.forEach((playerId) => {
      const player = save.players[playerId];
      if (!player) return;
      const baseName = player.name.replace(/ \d+$/u, "");
      const count = playerCounts.get(baseName) ?? 0;
      playerCounts.set(baseName, count + 1);
      if (count > 0) player.name = `${baseName} ${count + 1}`;
    });
  });
  return save;
}

export function normalizeGameState(input: GameSave) {
  const save = clone(input);
  ensureEventState(save);
  ensureManagerState(save);
  ensureUniqueDisplayNames(save);
  ensureAllSquadDepth(save);
  return withUpdate(save);
}

function eventSeen(save: GameSave, key: string) {
  return save.seenEventKeys.includes(key) || save.eventQueue.some((event) => event.id === key) || save.currentEvent?.id === key;
}

function markEventSeen(save: GameSave, eventId: string) {
  if (!save.seenEventKeys.includes(eventId)) save.seenEventKeys.push(eventId);
  save.seenEventKeys = save.seenEventKeys.slice(-260);
}

function popNextEvent(save: GameSave) {
  save.currentEvent = save.eventQueue.shift();
  return save;
}

function enqueue(save: GameSave, event: GameEvent) {
  if (!eventSeen(save, event.id)) save.eventQueue.push(event);
}

function transferBudgetAmount(save: GameSave, mode: TransferBudgetMode) {
  const club = userClub(save);
  const balance = Math.max(0, club.finances.balance);
  const overdraft = Math.abs(club.finances.debtLimit);
  if (mode === "max") return Math.round(balance + overdraft * 0.5);
  if (mode === "generous") return Math.round(balance + overdraft * 0.25);
  if (mode === "normal") return Math.round(balance);
  if (mode === "cautious") return Math.round(balance * 0.5);
  if (mode === "strict") return Math.round(balance * 0.25);
  return 0;
}

function buildFinancialLines(save: GameSave, matchdayIncome = 0, includeTransactions = true): Pick<FinancialSnapshot, "expenses" | "income" | "totalExpenses" | "totalIncome" | "profit"> & { weeklyWages: number; merchandise: number } {
  const club = userClub(save);
  const weekTransactions = includeTransactions ? club.finances.transactions.filter((tx) => tx.week === save.week) : [];
  const feesOut = weekTransactions.filter((tx) => tx.label.toLowerCase().includes("transfer fee paid") || tx.label.toLowerCase().includes("loan fee paid")).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const feesIn = weekTransactions.filter((tx) => tx.label.toLowerCase().includes("transfer fee received") || tx.label.toLowerCase().includes("loan fee received")).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const managerCosts = weekTransactions.filter((tx) => tx.label.toLowerCase().includes("manager")).reduce((sum, tx) => sum + Math.abs(Math.min(0, tx.amount)), 0);
  const prizeMoney = weekTransactions.filter((tx) => tx.label.toLowerCase().includes("season award") || tx.label.toLowerCase().includes("cup prize")).reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);
  const cupMatchdayIncome = weekTransactions.filter((tx) => tx.label.toLowerCase().includes("cup matchday income")).reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);
  const leagueMatchdayIncome = weekTransactions.filter((tx) => tx.label.toLowerCase().includes("league matchday income")).reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);
  const ticketSales = Math.max(0, matchdayIncome + leagueMatchdayIncome + cupMatchdayIncome);
  const sponsorship = Math.round(club.finances.sponsorship / 38);
  const merchandise = Math.round(club.reputation * 85 + club.record.won * 120);
  const squad = playersForClub(save, club);
  const manager = getManager(save, club);
  const wages = Math.max(0, squad.reduce((sum, player) => sum + playerWeeklyCostForClub(player, club.id), 0) + (manager?.wage ?? 0));
  const upkeep = club.finances.upkeep + Math.round((100 - club.stadium.condition) * 75);
  const stadiumRunning = Math.round(upkeep * 0.34);
  const youthAcademy = Math.round(club.youthLevel * 72);
  const trainingFacilities = Math.round(club.trainingLevel * 78);
  const infrastructure = Math.max(0, upkeep - stadiumRunning - youthAcademy - trainingFacilities) + managerCosts;
  const expenses = { wages, stadiumRunning, youthAcademy, trainingFacilities, infrastructure, feesOut };
  const income = {
    feesIn,
    ticketSales,
    foodDrink: Math.round(ticketSales * 0.13),
    merchandise,
    vip: ticketSales > 0 ? Math.round(club.stadium.facilityLevel * 850) : 0,
    prizeMoney,
    sponsorship,
    tv: Math.round(club.reputation * 130),
  };
  const totalExpenses = Object.values(expenses).reduce((sum, value) => sum + value, 0);
  const totalIncome = Object.values(income).reduce((sum, value) => sum + value, 0);
  const profit = totalIncome - totalExpenses;
  return { expenses, income, totalExpenses, totalIncome, profit, weeklyWages: wages, merchandise };
}

function buildFinancialSnapshot(save: GameSave): FinancialSnapshot {
  const club = userClub(save);
  const lines = buildFinancialLines(save);
  const balanceAfter = club.finances.balance;
  return {
    week: save.week,
    month: monthForWeek(save.week),
    balanceBefore: balanceAfter - lines.profit,
    balanceAfter,
    expenses: lines.expenses,
    income: lines.income,
    totalExpenses: lines.totalExpenses,
    totalIncome: lines.totalIncome,
    profit: lines.profit,
  };
}

function financialReportBody(snapshot: FinancialSnapshot) {
  return `The club ${snapshot.profit >= 0 ? "made a profit" : "made a loss"} in ${snapshot.month}. Balance moved from ${snapshot.balanceBefore.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} to ${snapshot.balanceAfter.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`;
}

function financialReportNote(snapshot: FinancialSnapshot) {
  return `Balance movement: ${signedMoney(snapshot.profit)} this period. Income ${snapshot.totalIncome.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}; expenses ${snapshot.totalExpenses.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`;
}

function debtHeadroom(club: Club) {
  return club.finances.balance - club.finances.debtLimit;
}

function bankWarningBody(club: Club) {
  return `${club.name} is currently overdrawn. Balance is ${club.finances.balance.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}; debt limit is ${club.finances.debtLimit.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`;
}

function bankWarningNote(club: Club) {
  const headroom = debtHeadroom(club);
  return headroom >= 0
    ? `Debt headroom remaining: ${headroom.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}. If the balance falls below the debt limit, the board ends the career.`
    : `Debt limit exceeded by ${Math.abs(headroom).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`;
}

export function latestFinancialSnapshot(input: GameSave) {
  const save = clone(input);
  ensureEventState(save);
  return save.financialSnapshot ?? buildFinancialSnapshot(save);
}

function refreshQueuedFinancialReports(save: GameSave) {
  const snapshot = buildFinancialSnapshot(save);
  save.financialSnapshot = snapshot;
  if (save.currentEvent?.type === "financial_report") save.currentEvent = { ...save.currentEvent, financialSnapshot: snapshot, body: financialReportBody(snapshot), note: financialReportNote(snapshot) };
  save.eventQueue = save.eventQueue.map((event) => event.type === "financial_report" && event.createdSeason === save.season && event.createdWeek === save.week ? { ...event, financialSnapshot: snapshot, body: financialReportBody(snapshot), note: financialReportNote(snapshot), variant: snapshot.profit >= 0 ? "positive" : "negative" } : event);
}

function ensureFinancialReportAfterTransfer(save: GameSave) {
  refreshQueuedFinancialReports(save);
  const hasCurrentWeekReport = save.currentEvent?.type === "financial_report" && save.currentEvent.createdSeason === save.season && save.currentEvent.createdWeek === save.week
    || save.eventQueue.some((event) => event.type === "financial_report" && event.createdSeason === save.season && event.createdWeek === save.week);
  if (hasCurrentWeekReport) return;
  const snapshot = save.financialSnapshot ?? buildFinancialSnapshot(save);
  enqueue(save, {
    id: `financial_report_transfer_update_${save.season}_${save.week}_${save.seenEventKeys.length}`,
    type: "financial_report",
    title: "Financial report",
    body: financialReportBody(snapshot),
    note: financialReportNote(snapshot),
    requiresDecision: false,
    createdSeason: save.season,
    createdWeek: save.week,
    financialSnapshot: snapshot,
    variant: snapshot.profit >= 0 ? "positive" : "negative",
  });
}

function ensureFinancialReportAfterCup(save: GameSave) {
  refreshQueuedFinancialReports(save);
  const hasCurrentWeekReport = save.currentEvent?.type === "financial_report" && save.currentEvent.createdSeason === save.season && save.currentEvent.createdWeek === save.week
    || save.eventQueue.some((event) => event.type === "financial_report" && event.createdSeason === save.season && event.createdWeek === save.week);
  if (hasCurrentWeekReport) return;
  const snapshot = save.financialSnapshot ?? buildFinancialSnapshot(save);
  enqueue(save, {
    id: `financial_report_cup_update_${save.season}_${save.week}_${save.seenEventKeys.length}`,
    type: "financial_report",
    title: "Financial report",
    body: financialReportBody(snapshot),
    note: financialReportNote(snapshot),
    requiresDecision: false,
    createdSeason: save.season,
    createdWeek: save.week,
    financialSnapshot: snapshot,
    variant: snapshot.profit >= 0 ? "positive" : "negative",
  });
}

export function calculateTeamStrength(club: Club, squad: Player[], manager?: Manager) {
  const best = [...squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  const playerStrength = best.reduce((sum, player) => sum + player.rating * (player.fitness / 100) * (0.85 + player.form / 500), 0) / 11;
  const managerBoost = manager ? (manager.tactics + manager.training + manager.reputation) / 30 : 7;
  const morale = best.reduce((sum, player) => sum + player.morale, 0) / Math.max(1, best.length) / 10;
  return playerStrength + managerBoost + morale + club.trainingLevel * 0.8;
}

function addRecord(record: LeagueRecord, gf: number, ga: number) {
  record.played += 1;
  record.gf += gf;
  record.ga += ga;
  if (gf > ga) {
    record.won += 1;
    record.points += 3;
  } else if (gf === ga) {
    record.drawn += 1;
    record.points += 1;
  } else {
    record.lost += 1;
  }
}

function scorer(seed: number, save: GameSave, club: Club): [Player, number] {
  ensureClubSquadDepth(save, club);
  const attackers = playersForClub(save, club).filter((player) => ["F", "M"].includes(player.position));
  return pickOne(seed, attackers.length > 0 ? attackers : playersForClub(save, club));
}

export function generateMatchEvents(save: GameSave, fixture: Fixture, result: MatchResult, seed: number): [MatchEvent[], number] {
  const events: MatchEvent[] = [];
  let state = seed;
  const home = save.clubs[fixture.homeClubId];
  const away = save.clubs[fixture.awayClubId];
  for (let i = 0; i < result.homeGoals; i += 1) {
    const [minute, s1] = randomInt(state, 4, 89);
    const [player, s2] = scorer(s1, save, home);
    player.seasonStats.goals += 1;
    player.careerStats.goals += 1;
    events.push({ minute, type: "goal", clubId: home.id, playerName: player.name, description: `${player.name} scores for ${home.name}.` });
    state = s2;
  }
  for (let i = 0; i < result.awayGoals; i += 1) {
    const [minute, s1] = randomInt(state, 4, 89);
    const [player, s2] = scorer(s1, save, away);
    player.seasonStats.goals += 1;
    player.careerStats.goals += 1;
    events.push({ minute, type: "goal", clubId: away.id, playerName: player.name, description: `${player.name} scores for ${away.name}.` });
    state = s2;
  }
  const [cardChance, s3] = chance(state, 0.36);
  state = s3;
  if (cardChance) {
    const [club, s4] = pickOne(state, [home, away]);
    const [player, s5] = pickOne(s4, playersForClub(save, club));
    const [minute, s6] = randomInt(s5, 15, 84);
    player.seasonStats.yellowCards += 1;
    events.push({ minute, type: "yellow", clubId: club.id, playerName: player.name, description: `${player.name} is booked.` });
    state = s6;
  }
  return [events.sort((a, b) => a.minute - b.minute), state];
}

export function simulateMatch(fixture: Fixture, save: GameSave): [MatchResult, number] {
  let state = save.rngState;
  const home = save.clubs[fixture.homeClubId];
  const away = save.clubs[fixture.awayClubId];
  const homeStrength = calculateTeamStrength(home, playersForClub(save, home), getManager(save, home)) + 4;
  const awayStrength = calculateTeamStrength(away, playersForClub(save, away), getManager(save, away));
  const [noiseA, s1] = randomFloat(state);
  const [noiseB, s2] = randomFloat(s1);
  state = s2;
  const homeExpected = Math.max(0.2, (homeStrength / awayStrength) * 1.25 + noiseA * 0.8);
  const awayExpected = Math.max(0.2, (awayStrength / homeStrength) * 0.95 + noiseB * 0.8);
  const [homeRoll, s3] = randomInt(state, 0, 100);
  const [awayRoll, s4] = randomInt(s3, 0, 100);
  state = s4;
  const homeGoals = Math.min(6, Math.floor(homeExpected) + (homeRoll > 58 ? 1 : 0) + (homeRoll > 86 ? 1 : 0));
  const awayGoals = Math.min(6, Math.floor(awayExpected) + (awayRoll > 62 ? 1 : 0) + (awayRoll > 88 ? 1 : 0));
  const possessionHome = Math.max(35, Math.min(65, Math.round(50 + (homeStrength - awayStrength) / 3)));
  const result: MatchResult = {
    homeGoals,
    awayGoals,
    possessionHome,
    homeShots: Math.max(homeGoals, Math.round(homeExpected * 5 + homeRoll / 20)),
    awayShots: Math.max(awayGoals, Math.round(awayExpected * 5 + awayRoll / 20)),
    homeOnTarget: Math.max(homeGoals, Math.round(homeExpected * 2 + homeRoll / 35)),
    awayOnTarget: Math.max(awayGoals, Math.round(awayExpected * 2 + awayRoll / 35)),
    events: [],
  };
  const [events, next] = generateMatchEvents(save, fixture, result, state);
  result.events = events;
  return [result, next];
}

export function applyMatchResult(save: GameSave, fixture: Fixture, result: MatchResult) {
  const home = save.clubs[fixture.homeClubId];
  const away = save.clubs[fixture.awayClubId];
  if (fixture.competition === "cup") {
    applyCupMatchResult(save, fixture, result);
    return;
  }
  addRecord(home.record, result.homeGoals, result.awayGoals);
  addRecord(away.record, result.awayGoals, result.homeGoals);
  for (const club of [home, away]) {
    playersForClub(save, club).sort((a, b) => b.rating - a.rating).slice(0, 11).forEach((player) => {
      player.seasonStats.apps += 1;
      player.careerStats.apps += 1;
      player.fitness = Math.max(45, player.fitness - 6);
      player.form = Math.max(20, Math.min(99, player.form + (club === home ? result.homeGoals - result.awayGoals : result.awayGoals - result.homeGoals)));
    });
  }
}

function applyCupMatchResult(save: GameSave, fixture: Fixture, result: MatchResult) {
  const home = save.clubs[fixture.homeClubId];
  const away = save.clubs[fixture.awayClubId];
  for (const club of [home, away]) {
    playersForClub(save, club).sort((a, b) => b.rating - a.rating).slice(0, 11).forEach((player) => {
      player.seasonStats.apps += 1;
      player.careerStats.apps += 1;
      player.fitness = Math.max(42, player.fitness - 7);
      const goalsFor = club.id === fixture.homeClubId ? result.homeGoals : result.awayGoals;
      const goalsAgainst = club.id === fixture.homeClubId ? result.awayGoals : result.homeGoals;
      player.form = Math.max(20, Math.min(99, player.form + goalsFor - goalsAgainst));
    });
  }
}

function forceCupWinner(save: GameSave, fixture: Fixture, result: MatchResult) {
  if (result.homeGoals !== result.awayGoals) return result;
  const [homeWins, s1] = chance(save.rngState + (fixture.cupRound ?? 1) * 193, 0.5);
  save.rngState = s1;
  const winnerId = homeWins ? fixture.homeClubId : fixture.awayClubId;
  const winningClub = save.clubs[winnerId];
  const [winner, s2] = scorer(save.rngState, save, winningClub);
  save.rngState = s2;
  if (homeWins) {
    result.homeGoals += 1;
    result.homeShots = Math.max(result.homeShots, result.homeGoals);
    result.homeOnTarget = Math.max(result.homeOnTarget, result.homeGoals);
  } else {
    result.awayGoals += 1;
    result.awayShots = Math.max(result.awayShots, result.awayGoals);
    result.awayOnTarget = Math.max(result.awayOnTarget, result.awayGoals);
  }
  result.events.push({
    minute: 90,
    type: "goal",
    clubId: winnerId,
    playerName: winner.name,
    description: `${winner.name} settles the cup tie for ${winningClub.name}.`,
  });
  result.events.sort((a, b) => a.minute - b.minute);
  return result;
}

function advanceCupMatch(input: GameSave, fixtureId: string) {
  const save = clone(input);
  ensureEventState(save);
  const fixture = save.fixtures.find((item) => item.id === fixtureId && item.status === "scheduled" && item.competition === "cup");
  if (!fixture) return withUpdate(save);
  ensureClubSquadDepth(save, save.clubs[fixture.homeClubId]);
  ensureClubSquadDepth(save, save.clubs[fixture.awayClubId]);
  const [rawResult, next] = simulateMatch(fixture, save);
  save.rngState = next;
  const result = forceCupWinner(save, fixture, rawResult);
  fixture.status = "played";
  fixture.result = result;
  applyMatchResult(save, fixture, result);
  const club = userClub(save);
  const userHome = fixture.homeClubId === club.id;
  const goalsFor = userHome ? result.homeGoals : result.awayGoals;
  const goalsAgainst = userHome ? result.awayGoals : result.homeGoals;
  const won = goalsFor > goalsAgainst;
  const round = fixture.cupRound ?? save.cup.round;
  const opponentId = userHome ? fixture.awayClubId : fixture.homeClubId;
  const prize = cupPrize(round, won);
  adjustRelationshipAfterMatch(save, fixture, result);
  const matchdayIncome = userHome ? Math.round(calculateMatchdayIncome(save, fixture) * 0.72) : 0;
  if (matchdayIncome > 0) {
    club.finances.balance += matchdayIncome;
    club.finances.ticketIncome += matchdayIncome;
    club.finances.transactions.unshift({ id: `tx_cup_matchday_${save.season}_${round}`, week: save.week, label: `Cup matchday income: ${cupRoundName(round)}`, amount: matchdayIncome });
  }
  club.finances.balance += prize;
  club.finances.transactions.unshift({ id: `tx_cup_prize_${save.season}_${round}`, week: save.week, label: `Cup prize: ${cupRoundName(round)}`, amount: prize });
  save.cup.results.push({
    season: save.season,
    round,
    roundName: cupRoundName(round),
    opponentClubId: opponentId,
    opponentName: save.clubs[opponentId]?.name ?? "Opponent",
    goalsFor,
    goalsAgainst,
    won,
    prize,
  });
  if (won && round >= save.cup.maxRounds) {
    save.cup.won = true;
    save.hallOfFame.unshift(`${save.season} ${save.cup.name} winners`);
  } else if (won) {
    save.cup.round = round + 1;
  } else {
    save.cup.eliminated = true;
  }
  save.lastMatch = structuredClone(fixture);
  ensureFinancialReportAfterCup(save);
  return withUpdate(updateAchievements(save));
}

export function calculateMatchdayIncome(save: GameSave, fixture: Fixture) {
  const club = userClub(save);
  if (fixture.homeClubId !== club.id) return 0;
  const ticketPrice = ticketPriceForLevel(currentDivisionLevel(save));
  const attendance = Math.round(club.stadium.capacity * Math.min(0.98, 0.45 + club.reputation / 170));
  return attendance * ticketPrice + club.stadium.facilityLevel * ticketPrice * 65;
}

export function processWeeklyFinances(input: GameSave, matchdayIncome = 0) {
  const save = clone(input);
  const club = userClub(save);
  const lines = buildFinancialLines(save, matchdayIncome, false);
  const profit = lines.profit;
  club.finances.weeklyWages = lines.weeklyWages;
  club.finances.ticketIncome += matchdayIncome;
  club.finances.merchIncome += lines.merchandise;
  club.finances.balance += profit;
  club.finances.lastWeekProfit = profit;
  if (matchdayIncome > 0) club.finances.transactions.unshift({ id: `tx_matchday_${save.week}_${club.finances.transactions.length}`, week: save.week, label: "League matchday income", amount: matchdayIncome });
  club.finances.transactions.unshift({ id: `tx_${save.week}_${club.finances.transactions.length}`, week: save.week, label: "Weekly operations", amount: profit });
  club.finances.transactions = club.finances.transactions.slice(0, 24);
  return checkDebtAndBankruptcy(save);
}

export function checkDebtAndBankruptcy(input: GameSave) {
  const save = clone(input);
  const club = userClub(save);
  if (club.finances.balance < club.finances.debtLimit) {
    save.gameOver = `The board has removed you after the club exceeded its debt limit. Balance ${club.finances.balance.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}; debt limit ${club.finances.debtLimit.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}; over limit by ${Math.abs(debtHeadroom(club)).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`;
  }
  return withUpdate(save);
}

export function advanceToNextMatch(input: GameSave) {
  if (input.gameOver) return input;
  let save = clone(input);
  ensureEventState(save);
  const roundFixtures = save.fixtures.filter((fixture) => (fixture.competition ?? "league") === "league" && fixture.round === save.currentRound && fixture.status === "scheduled");
  let userFixture: Fixture | undefined;
  for (const fixture of roundFixtures) {
    ensureClubSquadDepth(save, save.clubs[fixture.homeClubId]);
    ensureClubSquadDepth(save, save.clubs[fixture.awayClubId]);
    const [result, next] = simulateMatch(fixture, save);
    save.rngState = next;
    fixture.status = "played";
    fixture.result = result;
    applyMatchResult(save, fixture, result);
    if (fixture.homeClubId === save.userClubId || fixture.awayClubId === save.userClubId) userFixture = structuredClone(fixture);
  }
  const income = userFixture ? calculateMatchdayIncome(save, userFixture) : 0;
  if (userFixture?.result) adjustRelationshipAfterMatch(save, userFixture, userFixture.result);
  save = processWeeklyFinances(save, income);
  save = updateFormFitnessMorale(save);
  save = updateAchievements(save);
  save.lastMatch = userFixture;
  save.week += 1;
  save.currentRound += 1;
  const maxLeagueRound = Math.max(...save.fixtures.filter((fixture) => (fixture.competition ?? "league") === "league").map((fixture) => fixture.round));
  if (save.currentRound > maxLeagueRound) save = finishSeason(save);
  return withUpdate(save);
}

function proposalToEvent(save: GameSave, proposal: TransferProposal): GameEvent | undefined {
  const player = save.players[proposal.playerId];
  const club = userClub(save);
  const manager = getManager(save, club);
  if (!player || !manager) return undefined;
  if (proposal.type === "sell") {
    const bidder = proposal.toClubId ? save.clubs[proposal.toClubId] : undefined;
    return {
      id: `incoming_bid_${proposal.id}`,
      type: "incoming_bid",
      title: `${player.position} bid received`,
      body: `${bidder?.name ?? "Another club"} has bid ${proposal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} for ${player.name}, your ${player.position} rated ${player.rating}, age ${player.age}.`,
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: manager.id,
      proposal,
      note: `${manager.name} ${player.age > 30 || player.contractYears <= 1 ? "would be prepared to let him leave" : "wants you to decide whether the fee is enough"}. Accepting improves manager trust by 1; rejecting reduces it by 2.`,
    };
  }
  if (proposal.type === "buy") {
    const requestedWage = Math.round(player.wage * 1.2);
    const requestedYears = Math.min(5, Math.max(2, 34 - player.age));
    const sellingClub = proposal.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
    return {
      id: `contract_offer_${proposal.id}`,
      type: "contract_offer",
      title: `Manager target identified`,
      body: `${manager.name} wants to negotiate for transfer target ${player.name} from ${sellingClub?.name ?? "another club"}. He is a ${player.position}, rating ${player.rating}, age ${player.age}. The selling club expects around ${proposal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}, and the player is looking for about ${requestedWage.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} per week.`,
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: manager.id,
      proposal: { ...proposal, requestedWage, requestedYears },
      note: "This is an external transfer target, not a current squad contract. Walking away reduces manager trust by 4; completing the signing improves it by 4.",
    };
  }
  if (proposal.type === "loan") {
    const sourceClub = proposal.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
    const destinationClub = proposal.toClubId ? save.clubs[proposal.toClubId] : undefined;
    const loanIn = proposal.loanDirection !== "out";
    return {
      id: `contract_offer_${proposal.id}`,
      type: "contract_offer",
      title: loanIn ? "Manager suggests loan signing" : "Loan offer received",
      body: loanIn
        ? `${manager.name} wants to loan ${player.name} from ${sourceClub?.name ?? "another club"} until the end of the season. The deal needs a ${proposal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} loan fee and a weekly wage contribution around ${(proposal.requestedWage ?? proposal.wageDelta).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`
        : `${destinationClub?.name ?? "Another club"} wants to loan ${player.name} until the end of the season. They would pay a ${proposal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} loan fee and cover ${(proposal.requestedWage ?? Math.abs(proposal.wageDelta)).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} of his weekly wages.`,
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: player.id,
      managerId: manager.id,
      proposal: { ...proposal, requestedWage: proposal.requestedWage ?? Math.abs(proposal.wageDelta), requestedYears: 1 },
      note: loanIn
        ? "Loan signings add short-term squad depth without a permanent transfer fee. Completing the loan improves manager trust by 2; walking away reduces it by 2."
        : "Loaning out a squad player can reduce wage pressure and improve development. Accepting improves manager trust by 1; rejecting reduces it by 1.",
    };
  }
  return {
    id: `contract_offer_${proposal.id}`,
    type: "contract_offer",
    title: `Manager suggests new deal`,
    body: `${manager.name} feels ${player.name} should be offered a new contract.`,
    requiresDecision: true,
    createdSeason: save.season,
    createdWeek: save.week,
    playerId: player.id,
    managerId: manager.id,
    proposal,
    note: `${manager.name} considers him ${player.rating >= 70 ? "an important first-team player" : "a useful squad option"} and wants the situation settled.`,
  };
}

function queueProposalIfAvailable(save: GameSave) {
  const transferWindow = isTransferWindow(save.week);
  const contractReviewWeek = save.week % 6 === 0;
  if (!transferWindow && !contractReviewWeek) return;
  const proposal = generateManagerTransferProposal(save);
  if (!proposal) return;
  const event = proposalToEvent(save, proposal);
  if (event) enqueue(save, event);
}

function nextUserFixture(save: GameSave) {
  return save.fixtures.find((fixture) => (fixture.competition ?? "league") === "league" && fixture.round === save.currentRound && fixture.status === "scheduled" && (fixture.homeClubId === save.userClubId || fixture.awayClubId === save.userClubId));
}

function ordinalLabel(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function pushStandardEvents(save: GameSave) {
  const club = userClub(save);
  const manager = getManager(save, club);
  const fixture = nextUserFixture(save);
  const seasonKey = `s${save.season}`;
  const weekKey = `s${save.season}_w${save.week}`;
  const transferWindowOpen = isTransferWindow(save.week);
  if (!transferWindowOpen) save.transferBudget = undefined;
  const lastHistory = save.history[0];
  if (lastHistory && !eventSeen(save, `season_summary_${lastHistory.season}`)) {
    const outcomeCopy =
      lastHistory.outcome === "promoted"
        ? `Promotion secured. Next season: ${lastHistory.nextDivisionName ?? "a higher division"}.`
        : lastHistory.outcome === "relegated"
          ? `Relegated. Next season: ${lastHistory.nextDivisionName ?? "a lower division"}.`
          : `Stayed in ${lastHistory.nextDivisionName ?? lastHistory.divisionName}.`;
    enqueue(save, {
      id: `season_summary_${lastHistory.season}`,
      type: "season_summary",
      title: `${lastHistory.season}/${String(lastHistory.season + 1).slice(2)} season review`,
      body: `${lastHistory.divisionName}: finished ${ordinalLabel(lastHistory.position)} with ${lastHistory.points} points. ${outcomeCopy} Season award: ${lastHistory.prizeMoney?.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }) ?? "£0"}.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      seasonHistory: lastHistory,
      note: seasonImpactNote(lastHistory),
      variant: lastHistory.outcome === "relegated" ? "negative" : lastHistory.outcome === "promoted" || lastHistory.trophies.length ? "positive" : "neutral",
    });
  }
  if (save.week === 1) {
    enqueue(save, {
      id: `season_intro_${seasonKey}`,
      type: "season_intro",
      title: `${save.season}/${String(save.season + 1).slice(2)} League Path`,
      body: `Your club starts this season in ${save.divisions.find((division) => division.id === club.divisionId)?.name ?? "the league"} and enters the ${save.cup.name}. The target is simple: build the club without losing control of the finances.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      managerId: manager?.id,
    });
    if (manager && manager.contractYears <= 0) {
      const expectedWage = calculateRecommendedManagerWage(manager, currentDivisionLevel(save));
      enqueue(save, {
        id: `manager_contract_decision_${seasonKey}_${manager.id}`,
        type: "manager_contract_decision",
        title: "Manager contract expired",
        body: `${manager.name}'s contract has expired. Offer a new deal or let him leave before the season continues.`,
        requiresDecision: true,
        createdSeason: save.season,
        createdWeek: save.week,
        managerId: manager.id,
        note: `Expected wage: ${expectedWage.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} per week. Letting him leave means the club must hire a replacement.`,
      });
    }
    enqueue(save, {
      id: `average_crowd_report_${seasonKey}`,
      type: "average_crowd_report",
      title: "Crowd outlook",
      body: `${club.stadium.name} can hold ${club.stadium.capacity.toLocaleString()} supporters. Better results, facilities and reputation will lift matchday income over time.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
    });
  }
  const windowLabel = monthForWeek(save.week);
  if (transferWindowOpen && !eventSeen(save, `transfer_window_open_${seasonKey}_${windowLabel}`)) {
    enqueue(save, {
      id: `transfer_window_open_${seasonKey}_${windowLabel}`,
      type: "transfer_window_open",
      title: "Transfer window open",
      body: `${windowLabel} is an open transfer month. The manager can now bring you player targets and clubs can bid for your squad.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      managerId: manager?.id,
    });
    enqueue(save, {
      id: `transfer_budget_${seasonKey}_${windowLabel}`,
      type: "transfer_budget",
      title: "Set transfer budget",
      body: "The manager wants to know how much room he has for the current transfer window.",
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      managerId: manager?.id,
      note: "A tight budget protects the club but may frustrate the manager if the squad needs work.",
    });
  }
  queueProposalIfAvailable(save);
  if (isCupWeek(save)) {
    const cupFixture = createCupFixture(save);
    const opponent = save.clubs[cupFixture.homeClubId === club.id ? cupFixture.awayClubId : cupFixture.homeClubId];
    enqueue(save, {
      id: `cup_draw_${save.season}_${save.cup.round}`,
      type: "club_update",
      title: `${save.cup.name} draw`,
      body: `${club.name} will face ${opponent.name} in the ${cupRoundName(save.cup.round)}. Winning pays ${cupPrize(save.cup.round, true).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}; losing still pays ${cupPrize(save.cup.round, false).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      fixtureId: cupFixture.id,
      managerId: manager?.id,
    });
    enqueue(save, {
      id: `match_preview_${cupFixture.id}`,
      type: "match_preview",
      title: `${save.cup.name}: ${cupRoundName(save.cup.round)}`,
      body: `${cupFixture.homeClubId === club.id ? "Home" : "Away"} cup tie against ${opponent.name} in ${monthForWeek(save.week)}.`,
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      fixtureId: cupFixture.id,
      managerId: manager?.id,
      note: "Cup matches do not affect league points, but prize money and a cup run can change the season.",
    });
  }
  const snapshot = buildFinancialSnapshot(save);
  save.financialSnapshot = snapshot;
  enqueue(save, {
    id: `financial_report_${weekKey}`,
    type: "financial_report",
    title: "Financial report",
    body: financialReportBody(snapshot),
    note: financialReportNote(snapshot),
    requiresDecision: false,
    createdSeason: save.season,
    createdWeek: save.week,
    financialSnapshot: snapshot,
    variant: snapshot.profit >= 0 ? "positive" : "negative",
  });
  if (club.finances.balance < 0) {
    enqueue(save, {
      id: `bank_warning_${weekKey}`,
      type: "bank_warning",
      title: "Bank balance in the red",
      body: bankWarningBody(club),
      note: bankWarningNote(club),
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      variant: "negative",
    });
  }
  if (manager && (club.finances.balance < 0 || (transferWindowOpen && (save.transferBudget?.mode === "strict" || save.transferBudget?.mode === "zero")))) {
    enqueue(save, {
      id: `manager_frustrated_${weekKey}`,
      type: "manager_frustrated",
      title: "Manager frustrated",
      body: `${manager.name} is concerned that the budget is making it difficult to improve the squad.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      managerId: manager.id,
      variant: "negative",
    });
  }
  if (manager && manager.contractYears <= 1 && save.week >= 28 && !save.managerRetirementIntent) {
    save.managerRetirementIntent = true;
    enqueue(save, {
      id: `manager_retirement_hint_${seasonKey}`,
      type: "manager_retirement_hint",
      title: "Manager future uncertain",
      body: `${manager.name} has hinted that he may step away when his contract expires.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      managerId: manager.id,
    });
  }
  const academyPlayer = playersForClub(save, club).find((player) => player.id.startsWith("youth_") && player.age <= 18);
  if (academyPlayer) {
    enqueue(save, {
      id: `youth_contract_${seasonKey}_${academyPlayer.id}`,
      type: "youth_contract",
      title: "Youth contract decision",
      body: `${academyPlayer.name}'s academy terms are ready to be reviewed. Decide whether he gets a professional contract or leaves the club.`,
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      playerId: academyPlayer.id,
      managerId: manager?.id,
      note: manager ? `${manager.name} sees ${academyPlayer.potential >= 75 ? "real promise" : "some depth value"} in this player.` : undefined,
    });
  }
  if (fixture) {
    const opponent = save.clubs[fixture.homeClubId === club.id ? fixture.awayClubId : fixture.homeClubId];
    enqueue(save, {
      id: `match_preview_${fixture.id}`,
      type: "match_preview",
      title: `${club.name} vs ${opponent.name}`,
      body: `${fixture.homeClubId === club.id ? "Home" : "Away"} fixture in ${monthForWeek(save.week)}.`,
      requiresDecision: true,
      createdSeason: save.season,
      createdWeek: save.week,
      fixtureId: fixture.id,
      managerId: manager?.id,
    });
  }
}

export function generateNextEvents(input: GameSave) {
  const save = clone(input);
  ensureEventState(save);
  ensureManagerState(save);
  ensureUniqueDisplayNames(save);
  if (save.gameOver || save.currentEvent) return withUpdate(save);
  if (!userClub(save).managerId) return withUpdate(save);
  if (save.eventQueue.length === 0) pushStandardEvents(save);
  popNextEvent(save);
  return withUpdate(save);
}

export function advanceAfterQueueEmpty(input: GameSave) {
  const save = clone(input);
  ensureEventState(save);
  if (save.currentEvent || save.eventQueue.length > 0) return withUpdate(save);
  return generateNextEvents(save);
}

export function resolveEvent(input: GameSave, eventId: string, decision?: { action?: string; terms?: ContractTerms; mode?: TransferBudgetMode }) {
  let save = clone(input);
  ensureEventState(save);
  ensureManagerState(save);
  ensureUniqueDisplayNames(save);
  const event = save.currentEvent;
  if (!event || event.id !== eventId) return withUpdate(save);
  const club = userClub(save);
  const manager = getManager(save, club);
  const player = event.playerId ? save.players[event.playerId] : undefined;
  const action = decision?.action ?? "continue";

  if (event.type === "transfer_budget") {
    const mode = decision?.mode ?? "normal";
    save.transferBudget = { mode, amount: transferBudgetAmount(save, mode) };
    club.managerTrust = Math.max(0, Math.min(99, club.managerTrust + (mode === "max" || mode === "generous" ? 4 : mode === "zero" ? -8 : mode === "strict" ? -5 : 0)));
    save.currentEvent = {
      id: `transfer_budget_confirmed_${save.season}_${save.week}_${mode}`,
      type: "club_update",
      title: "Transfer budget confirmed",
      body: `${manager?.name ?? "The manager"} now has a ${mode} transfer budget of ${save.transferBudget.amount.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} for ${monthForWeek(save.week)}.`,
      requiresDecision: false,
      createdSeason: save.season,
      createdWeek: save.week,
      managerId: manager?.id,
      variant: mode === "strict" || mode === "zero" ? "negative" : "positive",
    };
    markEventSeen(save, event.id);
    return withUpdate(updateAchievements(save));
  } else if (event.type === "contract_offer" && event.proposal && player) {
    const proposal = event.proposal;
    if (proposal.type === "loan") {
      const loanIn = proposal.loanDirection !== "out";
      if (action === "reject") {
        club.managerTrust = Math.max(0, club.managerTrust - (loanIn ? 2 : 1));
        enqueue(save, {
          id: `contract_response_loan_rejected_${proposal.id}`,
          type: "contract_response",
          title: loanIn ? "Loan target dropped" : "Loan offer rejected",
          body: loanIn
            ? `You walked away from a loan deal for ${player.name}. Manager trust -2.`
            : `You rejected the loan offer for ${player.name}. Manager trust -1.`,
          requiresDecision: false,
          createdSeason: save.season,
          createdWeek: save.week,
          playerId: player.id,
          managerId: manager?.id,
          variant: "negative",
        });
      } else if (loanIn) {
        const offeredFee = decision?.terms?.fee ?? proposal.fee;
        const wageShare = decision?.terms?.wage ?? proposal.requestedWage ?? proposal.wageDelta;
        const source = proposal.fromClubId ? save.clubs[proposal.fromClubId] : undefined;
        const parentAccepts = offeredFee >= proposal.fee * 0.9 && wageShare >= (proposal.requestedWage ?? proposal.wageDelta) * 0.85;
        if (!parentAccepts) {
          club.managerTrust = Math.max(0, club.managerTrust - 1);
          enqueue(save, {
            id: `contract_response_loan_refused_${proposal.id}`,
            type: "contract_response",
            title: "Loan terms refused",
            body: `${source?.name ?? "The parent club"} rejected the loan package for ${player.name}. Manager trust -1.`,
            requiresDecision: false,
            createdSeason: save.season,
            createdWeek: save.week,
            playerId: player.id,
            managerId: manager?.id,
            variant: "negative",
          });
        } else if (club.finances.balance >= offeredFee && (!save.transferBudget || save.transferBudget.amount >= offeredFee)) {
          if (source) source.playerIds = source.playerIds.filter((id) => id !== player.id);
          if (!club.playerIds.includes(player.id)) club.playerIds.push(player.id);
          player.clubId = club.id;
          player.loan = { direction: "in", parentClubId: proposal.fromClubId ?? "", temporaryClubId: club.id, expiresSeason: save.season, wageShare };
          refreshUserWageBill(save);
          club.finances.balance -= offeredFee;
          club.finances.transactions.unshift({ id: `tx_loan_paid_${proposal.id}`, week: save.week, label: `Loan fee paid: ${player.name}`, amount: -offeredFee });
          club.managerTrust = Math.min(99, club.managerTrust + 2);
          enqueue(save, {
            id: `contract_response_loan_signed_${proposal.id}`,
            type: "contract_response",
            title: "Loan signing completed",
            body: `${player.name} has joined on loan from ${source?.name ?? "his parent club"} until the end of the season. Loan fee ${offeredFee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}; weekly contribution ${wageShare.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}. Manager trust +2.`,
            requiresDecision: false,
            createdSeason: save.season,
            createdWeek: save.week,
            playerId: player.id,
            managerId: manager?.id,
            variant: "positive",
          });
          ensureFinancialReportAfterTransfer(save);
        } else {
          club.managerTrust = Math.max(0, club.managerTrust - 3);
          enqueue(save, {
            id: `contract_response_loan_blocked_${proposal.id}`,
            type: "contract_response",
            title: "Loan blocked",
            body: `${player.name}'s loan could not be completed within the available budget. Manager trust -3.`,
            requiresDecision: false,
            createdSeason: save.season,
            createdWeek: save.week,
            playerId: player.id,
            managerId: manager?.id,
            variant: "negative",
          });
        }
      } else {
        const destination = proposal.toClubId ? save.clubs[proposal.toClubId] : undefined;
        const wageCovered = proposal.requestedWage ?? Math.abs(proposal.wageDelta);
        club.playerIds = club.playerIds.filter((id) => id !== player.id);
        if (destination && !destination.playerIds.includes(player.id)) destination.playerIds.push(player.id);
        player.clubId = destination?.id;
        player.loan = { direction: "out", parentClubId: club.id, temporaryClubId: destination?.id ?? "", expiresSeason: save.season, wageShare: wageCovered };
        refreshUserWageBill(save);
        player.morale = Math.min(99, player.morale + 5);
        club.finances.balance += proposal.fee;
        club.finances.transactions.unshift({ id: `tx_loan_received_${proposal.id}`, week: save.week, label: `Loan fee received: ${player.name}`, amount: proposal.fee });
        club.managerTrust = Math.min(99, club.managerTrust + 1);
        enqueue(save, {
          id: `contract_response_loan_out_${proposal.id}`,
          type: "contract_response",
          title: "Loan agreed",
          body: `${player.name} has joined ${destination?.name ?? "another club"} on loan until the end of the season. The club receives ${proposal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} and saves ${wageCovered.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} per week. Manager trust +1.`,
          requiresDecision: false,
          createdSeason: save.season,
          createdWeek: save.week,
          playerId: player.id,
          managerId: manager?.id,
          variant: "positive",
        });
        ensureFinancialReportAfterTransfer(save);
      }
    } else if (action === "reject" && proposal.type === "buy") {
      club.managerTrust = Math.max(0, club.managerTrust - 4);
      enqueue(save, {
        id: `contract_response_target_dropped_${proposal.id}`,
        type: "contract_response",
        title: "Transfer target dropped",
        body: `You walked away from ${player.name}, the ${player.position} rated ${player.rating} from ${proposal.fromClubId ? save.clubs[proposal.fromClubId]?.name ?? "another club" : "another club"}. Manager trust -4.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: player.id,
        managerId: manager?.id,
        variant: "negative",
      });
    } else if (action === "reject") {
      club.managerTrust = Math.max(0, club.managerTrust - 4);
      player.morale = Math.max(10, player.morale - 5);
      enqueue(save, {
        id: `contract_response_rejected_${proposal.id}`,
        type: "contract_response",
        title: "Squad contract request rejected",
        body: `${player.name}, your ${player.position} rated ${player.rating}, was told the club will not offer new terms right now. Manager trust -4; player morale -5.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: player.id,
        managerId: manager?.id,
        variant: "negative",
      });
    } else if (proposal.type === "buy") {
      const offeredFee = decision?.terms?.fee ?? proposal.fee;
      const requestedWage = proposal.requestedWage ?? player.wage * 1.2;
      const requestedYears = proposal.requestedYears ?? 3;
      const wage = decision?.terms?.wage ?? requestedWage;
      const years = decision?.terms?.years ?? requestedYears;
      const clubAccepts = offeredFee >= proposal.fee * 0.95;
      const clubWillRenegotiate = offeredFee >= proposal.fee * 0.8;
      const playerAccepts = wage >= requestedWage * 0.95 && years >= Math.max(1, requestedYears - 1);
      if (!clubAccepts) {
        club.managerTrust = Math.max(0, club.managerTrust - 2);
        if (clubWillRenegotiate) {
          enqueue(save, {
            ...event,
            id: `contract_offer_retry_${proposal.id}_${save.seenEventKeys.length}`,
            body: `${save.clubs[proposal.fromClubId ?? ""]?.name ?? "The selling club"} rejected the opening offer for ${player.name}, but they are willing to hear one improved bid.`,
            note: "The manager thinks the target is still possible if the fee improves. Manager trust -2 for the rejected opening offer.",
          });
        } else {
          enqueue(save, {
            id: `contract_response_club_refused_${proposal.id}`,
            type: "contract_response",
            title: "Club refuses to negotiate",
            body: `${save.clubs[proposal.fromClubId ?? ""]?.name ?? "The selling club"} rejected the bid and ended talks for ${player.name}. Manager trust -2.`,
            requiresDecision: false,
            createdSeason: save.season,
            createdWeek: save.week,
            playerId: player.id,
            managerId: manager?.id,
            variant: "negative",
          });
        }
      } else if (!playerAccepts) {
        player.morale = Math.max(10, player.morale - 3);
        club.managerTrust = Math.max(0, club.managerTrust - 2);
        enqueue(save, {
          id: `contract_response_player_refused_${proposal.id}`,
          type: "contract_response",
          title: "Player rejects terms",
          body: `${player.name}'s club accepted the fee, but the player rejected the contract offer. Manager trust -2; player morale -3.`,
          requiresDecision: false,
          createdSeason: save.season,
          createdWeek: save.week,
          playerId: player.id,
          managerId: manager?.id,
          variant: "negative",
        });
      } else if (club.finances.balance >= offeredFee && (!save.transferBudget || save.transferBudget.amount >= offeredFee)) {
        if (proposal.fromClubId) save.clubs[proposal.fromClubId].playerIds = save.clubs[proposal.fromClubId].playerIds.filter((id) => id !== player.id);
        club.playerIds.push(player.id);
        player.clubId = club.id;
        player.wage = wage;
        player.contractYears = years;
        refreshUserWageBill(save);
        club.finances.balance -= offeredFee;
        club.finances.transactions.unshift({ id: `tx_transfer_paid_${proposal.id}`, week: save.week, label: `Transfer fee paid: ${player.name}`, amount: -offeredFee });
        club.managerTrust = Math.min(99, club.managerTrust + 4);
        enqueue(save, {
          id: `contract_response_signed_${proposal.id}`,
          type: "contract_response",
          title: "Signing completed",
          body: `${player.name} has joined ${club.name} for ${offeredFee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} and signed a ${years}-year contract worth ${wage.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} per week. Manager trust +4.`,
          requiresDecision: false,
          createdSeason: save.season,
          createdWeek: save.week,
          playerId: player.id,
          managerId: manager?.id,
          variant: "positive",
        });
        ensureFinancialReportAfterTransfer(save);
      } else {
        club.managerTrust = Math.max(0, club.managerTrust - 5);
        enqueue(save, {
          id: `contract_response_failed_${proposal.id}`,
          type: "contract_response",
          title: "Deal blocked",
          body: `${player.name}'s transfer could not be completed within the available budget. Manager trust -5.`,
          requiresDecision: false,
          createdSeason: save.season,
          createdWeek: save.week,
          playerId: player.id,
          managerId: manager?.id,
          variant: "negative",
        });
      }
    } else {
      const requestedWage = proposal.requestedWage ?? player.wage + proposal.wageDelta;
      const requestedYears = proposal.requestedYears ?? 3;
      const wage = decision?.terms?.wage ?? requestedWage;
      const years = decision?.terms?.years ?? requestedYears;
      const accepted = wage >= requestedWage * 0.95 && years >= Math.max(1, requestedYears - 1);
      if (accepted) {
        player.wage = wage;
        player.contractYears = years;
        refreshUserWageBill(save);
        player.morale = Math.min(99, player.morale + 9);
        club.managerTrust = Math.min(99, club.managerTrust + 3);
      } else {
        player.morale = Math.max(10, player.morale - 8);
        club.managerTrust = Math.max(0, club.managerTrust - 3);
      }
      enqueue(save, {
        id: `contract_response_${accepted ? "accepted" : "turned_down"}_${proposal.id}`,
        type: "contract_response",
        title: accepted ? "Contract accepted" : "Contract turned down",
        body: accepted ? `${player.name} has signed a ${years}-year deal worth ${wage.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} per week. Manager trust +3; player morale improved.` : `${player.name} turned down the offer and wants terms closer to his expectations. Manager trust -3; player morale -8.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: player.id,
        managerId: manager?.id,
        variant: accepted ? "positive" : "negative",
      });
    }
  } else if (event.type === "incoming_bid" && event.proposal && player) {
    if (action === "accept") {
      const pendingDeal: PendingDeal = { id: `sale_${event.proposal.id}`, type: "sale", playerId: player.id, fee: event.proposal.fee, buyerClubId: event.proposal.toClubId, stage: "ready" };
      save.pendingDeals.push(pendingDeal);
      club.managerTrust = Math.min(99, club.managerTrust + 1);
      const bidder = event.proposal.toClubId ? save.clubs[event.proposal.toClubId] : undefined;
      enqueue(save, {
        id: `sale_ready_${pendingDeal.id}`,
        type: "sale_ready",
        title: `${player.position} sale ready`,
        body: `${bidder?.name ?? "The bidding club"} is ready to buy ${player.name}, your ${player.position} rated ${player.rating}, for ${event.proposal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}. Manager trust +1 for accepting the bid.`,
        requiresDecision: true,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: player.id,
        managerId: manager?.id,
        pendingDeal,
      });
    } else {
      club.managerTrust = Math.max(0, club.managerTrust - 2);
      const bidder = event.proposal.toClubId ? save.clubs[event.proposal.toClubId] : undefined;
      enqueue(save, {
        id: `sale_rejected_${event.proposal.id}`,
        type: "contract_response",
        title: "Bid rejected",
        body: `You rejected ${bidder?.name ?? "the bidding club"}'s offer for ${player.name}, your ${player.position} rated ${player.rating}. Manager trust -2.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: player.id,
        managerId: manager?.id,
        variant: "negative",
      });
    }
  } else if (event.type === "sale_ready" && event.pendingDeal) {
    const deal = event.pendingDeal;
    const soldPlayer = save.players[deal.playerId];
    if (soldPlayer && action !== "reject") {
      const buyingClub = deal.buyerClubId ? save.clubs[deal.buyerClubId] : undefined;
      club.playerIds = club.playerIds.filter((id) => id !== soldPlayer.id);
      if (buyingClub && !buyingClub.playerIds.includes(soldPlayer.id)) buyingClub.playerIds.push(soldPlayer.id);
      soldPlayer.clubId = buyingClub?.id;
      soldPlayer.loan = undefined;
      refreshUserWageBill(save);
      club.finances.balance += deal.fee;
      club.finances.transactions.unshift({ id: `tx_transfer_received_${deal.id}`, week: save.week, label: `Transfer fee received: ${soldPlayer.name}`, amount: deal.fee });
      enqueue(save, {
        id: `sale_confirmed_${deal.id}`,
        type: "sale_confirmed",
        title: "Player sale confirmed",
        body: `${soldPlayer.name} has been sold to ${buyingClub?.name ?? "the buying club"} for ${deal.fee.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: soldPlayer.id,
        managerId: manager?.id,
        variant: "positive",
      });
      ensureFinancialReportAfterTransfer(save);
      if (soldPlayer.careerStats.apps >= 80 || soldPlayer.rating >= 76) {
        save.hallOfFame.push(soldPlayer.name);
        enqueue(save, {
          id: `hall_of_fame_${soldPlayer.id}_${save.season}`,
          type: "hall_of_fame",
          title: "Hall of Fame",
          body: `${soldPlayer.name} has been added to the club's Hall of Fame after his service to ${club.name}.`,
          requiresDecision: false,
          createdSeason: save.season,
          createdWeek: save.week,
          playerId: soldPlayer.id,
          variant: "positive",
        });
      }
    }
    save.pendingDeals = save.pendingDeals.filter((item) => item.id !== deal.id);
  } else if (event.type === "youth_contract" && player) {
    if (action === "offer") {
      player.contractYears = 2;
      player.wage = Math.max(player.wage, Math.round(player.rating * 95));
      refreshUserWageBill(save);
      player.morale = Math.min(99, player.morale + 8);
      enqueue(save, {
        id: `youth_promoted_${player.id}_${save.season}`,
        type: "youth_promoted",
        title: "Youth player promoted",
        body: `${player.name} has signed professional terms and joined the first-team squad.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        playerId: player.id,
        managerId: manager?.id,
        variant: "positive",
      });
    } else {
      club.playerIds = club.playerIds.filter((id) => id !== player.id);
      delete save.players[player.id];
      refreshUserWageBill(save);
    }
  } else if (event.type === "manager_contract_decision") {
    let followUp: GameEvent | undefined;
    if (manager && action !== "release") {
      const expectedWage = calculateRecommendedManagerWage(manager, currentDivisionLevel(save));
      const years = Math.max(1, Math.min(3, decision?.terms?.years ?? 2));
      const wage = Math.max(Math.round(expectedWage * 0.9), decision?.terms?.wage ?? expectedWage);
      manager.contractYears = years;
      manager.wage = wage;
      manager.compensationFee = calculateManagerCompensation(manager);
      club.managerTrust = Math.min(99, club.managerTrust + 4);
      save.managerRetirementIntent = false;
      refreshUserWageBill(save);
      followUp = {
        id: `manager_contract_extended_${manager.id}_${save.season}`,
        type: "club_update",
        title: "Manager contract extended",
        body: `${manager.name} has signed a ${years}-year deal worth ${wage.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })} per week.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        managerId: manager.id,
        variant: "positive",
      };
    } else if (manager) {
      delete save.managers[manager.id];
      club.managerId = undefined;
      club.managerTrust = 50;
      club.boardConfidence = Math.max(25, club.boardConfidence - 4);
      save.managerRetirementIntent = false;
      const [candidates, next] = generateManagerCandidates(save.rngState, currentDivisionLevel(save));
      save.rngState = next;
      save.managerCandidates = candidates;
      refreshUserWageBill(save);
      followUp = {
        id: `manager_left_${manager.id}_${save.season}`,
        type: "club_update",
        title: "Manager leaves club",
        body: `${manager.name} has left after his contract expired. The club must appoint a manager before continuing.`,
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        variant: "negative",
      };
    }
    save.currentEvent = followUp;
    markEventSeen(save, event.id);
    return withUpdate(updateAchievements(save));
  } else if (event.type === "match_preview") {
    const playLive = action === "play";
    const previewFixture = event.fixtureId ? save.fixtures.find((fixture) => fixture.id === event.fixtureId) : undefined;
    const relationshipBefore = relationshipSnapshot(save);
    save.currentEvent = undefined;
    markEventSeen(save, event.id);
    save = previewFixture?.competition === "cup" ? advanceCupMatch(save, previewFixture.id) : advanceToNextMatch(save);
    ensureEventState(save);
    ensureManagerState(save);
    if (save.lastMatch?.result) {
      const isCup = save.lastMatch.competition === "cup";
      const relationshipAfter = relationshipSnapshot(save);
      save.currentEvent = {
        id: `match_result_${save.lastMatch.id}`,
        type: "match_result",
        title: isCup ? `${save.cup.name} result` : "Match result",
        body: `${save.clubs[save.lastMatch.homeClubId].name} ${save.lastMatch.result.homeGoals} - ${save.lastMatch.result.awayGoals} ${save.clubs[save.lastMatch.awayClubId].name}${isCup ? ` · ${cupRoundName(save.lastMatch.cupRound ?? save.cup.round)}` : ""}`,
        note: matchImpactNote(relationshipBefore, relationshipAfter),
        requiresDecision: false,
        createdSeason: save.season,
        createdWeek: save.week,
        fixtureId: save.lastMatch.id,
        variant: isCup ? (save.cup.results.at(-1)?.won ? "positive" : "negative") : "neutral",
      };
      save.liveMatch = playLive ? { fixtureId: save.lastMatch.id, currentMinute: 0, revealedEventCount: 0, finished: false } : undefined;
    }
    return withUpdate(save);
  }

  save.currentEvent = undefined;
  if (event.type === "match_result") save.liveMatch = undefined;
  markEventSeen(save, event.id);
  if (!userClub(save).managerId) return withUpdate(updateAchievements(save));
  popNextEvent(save);
  return withUpdate(updateAchievements(save));
}

export function leagueTable(save: GameSave, divisionId = userClub(save).divisionId) {
  const division = save.divisions.find((item) => item.id === divisionId);
  if (!division) return [];
  return division.clubIds
    .map((id) => save.clubs[id])
    .sort((a, b) => b.record.points - a.record.points || b.record.gf - b.record.ga - (a.record.gf - a.record.ga) || b.record.gf - a.record.gf);
}

export function finishSeason(input: GameSave) {
  const save = clone(input);
  const club = userClub(save);
  const balanceBefore = club.finances.balance;
  const boardConfidenceBefore = club.boardConfidence;
  const managerTrustBefore = club.managerTrust;
  const reputationBefore = club.reputation;
  const table = leagueTable(save);
  const position = table.findIndex((item) => item.id === club.id) + 1;
  const currentDivision = save.divisions.find((d) => d.id === club.divisionId);
  const divisionLevel = currentDivision?.level ?? 7;
  const prize = seasonPrize(divisionLevel, position);
  club.finances.balance += prize;
  club.finances.transactions.unshift({ id: `tx_prize_${save.season}`, week: save.week, label: `Season award: ${position}${position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th"}`, amount: prize });
  const promoted = position <= 3 && currentDivision?.level !== 1;
  const relegated = position >= 18 && divisionLevel !== 7;
  const promotionDivision = promoted ? save.divisions.find((d) => d.level === divisionLevel - 1) : undefined;
  const relegationDivision = relegated ? save.divisions.find((d) => d.level === divisionLevel + 1) : undefined;
  const nextDivisionName = promotionDivision?.name ?? relegationDivision?.name ?? currentDivision?.name ?? "League";
  const cupSummary = save.cup?.won
    ? `Won ${save.cup.name}`
    : save.cup?.results.length
      ? `${save.cup.eliminated ? "Reached" : "Still active in"} ${save.cup.results.at(-1)?.roundName ?? save.cup.name}`
      : `No ${save.cup.name} ties played`;
  const trophies = [...(promoted ? ["Promotion"] : []), ...(save.cup?.won ? [save.cup.name] : [])];
  club.boardConfidence = Math.max(5, Math.min(99, club.boardConfidence + (promoted ? 12 : relegated ? -14 : position <= 8 ? 4 : position >= 16 ? -6 : 0) + (club.finances.balance > 0 ? 2 : -4)));
  club.managerTrust = Math.max(0, Math.min(99, club.managerTrust + (position <= 6 ? 3 : position >= 16 ? -4 : 0)));
  if (promoted) {
    const nextDivision = promotionDivision;
    if (currentDivision && nextDivision) {
      const replacementId = nextDivision.clubIds.at(-1);
      currentDivision.clubIds = currentDivision.clubIds.filter((id) => id !== club.id);
      if (replacementId) {
        nextDivision.clubIds = nextDivision.clubIds.filter((id) => id !== replacementId);
        currentDivision.clubIds.push(replacementId);
        save.clubs[replacementId].divisionId = currentDivision.id;
        save.clubs[replacementId].reputation = Math.max(15, save.clubs[replacementId].reputation - 2);
      }
      nextDivision.clubIds.push(club.id);
      club.divisionId = nextDivision.id;
      club.reputation += 4;
    }
  }
  if (relegated) {
    const nextDivision = relegationDivision;
    if (currentDivision && nextDivision) {
      const replacementId = nextDivision.clubIds[0];
      currentDivision.clubIds = currentDivision.clubIds.filter((id) => id !== club.id);
      if (replacementId) {
        nextDivision.clubIds = nextDivision.clubIds.filter((id) => id !== replacementId);
        currentDivision.clubIds.push(replacementId);
        save.clubs[replacementId].divisionId = currentDivision.id;
        save.clubs[replacementId].reputation = Math.min(95, save.clubs[replacementId].reputation + 2);
      }
      nextDivision.clubIds.push(club.id);
      club.divisionId = nextDivision.id;
      club.reputation = Math.max(15, club.reputation - 4);
    }
  }
  save.history.unshift({
    season: save.season,
    divisionName: currentDivision?.name ?? "League",
    divisionLevel,
    position,
    played: club.record.played,
    won: club.record.won,
    drawn: club.record.drawn,
    lost: club.record.lost,
    goalsFor: club.record.gf,
    goalsAgainst: club.record.ga,
    points: club.record.points,
    balance: club.finances.balance,
    prizeMoney: prize,
    outcome: promoted ? "promoted" : relegated ? "relegated" : "stayed",
    nextDivisionName,
    cupSummary,
    seasonImpact: {
      balanceBefore,
      balanceAfter: club.finances.balance,
      boardConfidenceBefore,
      boardConfidenceAfter: club.boardConfidence,
      managerTrustBefore,
      managerTrustAfter: club.managerTrust,
      reputationBefore,
      reputationAfter: club.reputation,
    },
    trophies,
  });
  return startNextSeason(save);
}

export function startNextSeason(input: GameSave) {
  let save = clone(input);
  save = returnSeasonLoans(save);
  save.season += 1;
  save.week = 1;
  save.currentRound = 0;
  save.lastMatch = undefined;
  save.managerActionLockUntilWeek = 0;
  save.managerRetirementIntent = false;
  resetClubRecords(save);
  save = ageManagers(save);
  save = agePlayers(save);
  save = developPlayers(save);
  save = retirePlayers(save);
  save = generateYouthIntake(save);
  ensureAllSquadDepth(save);
  save.cup = { name: "Chairman's Cup", round: 1, maxRounds: 5, eliminated: false, won: false, results: [] };
  applyClubSeasonEconomy(save);
  const division = save.divisions.find((item) => item.id === userClub(save).divisionId);
  save.fixtures = division ? generateSeasonFixtures(division, save.season) : [];
  return withUpdate(updateAchievements(save));
}

export function returnSeasonLoans(input: GameSave) {
  const save = clone(input);
  Object.values(save.players).forEach((player) => {
    if (!player.loan || player.loan.expiresSeason > save.season) return;
    const temporaryClub = save.clubs[player.loan.temporaryClubId];
    const parentClub = save.clubs[player.loan.parentClubId];
    if (temporaryClub) temporaryClub.playerIds = temporaryClub.playerIds.filter((id) => id !== player.id);
    if (parentClub && !parentClub.playerIds.includes(player.id)) parentClub.playerIds.push(player.id);
    player.clubId = parentClub?.id;
    player.loan = undefined;
  });
  refreshUserWageBill(save);
  return save;
}

export function agePlayers(input: GameSave) {
  const save = clone(input);
  Object.values(save.players).forEach((player) => {
    player.age += 1;
    player.contractYears = Math.max(0, player.contractYears - 1);
    if (player.age > 30) player.rating = Math.max(20, player.rating - 1);
  });
  return save;
}

export function ageManagers(input: GameSave) {
  const save = clone(input);
  Object.values(save.managers).forEach((manager) => {
    manager.age += 1;
    if (manager.status === "contracted") {
      manager.contractYears = Math.max(0, manager.contractYears - 1);
      manager.compensationFee = calculateManagerCompensation(manager);
    }
  });
  save.managerCandidates = (save.managerCandidates ?? []).map((manager) => {
    const aged = { ...manager, age: manager.age + 1 };
    if (aged.status === "contracted") {
      aged.contractYears = Math.max(0, aged.contractYears - 1);
      aged.compensationFee = calculateManagerCompensation(aged);
    }
    return aged;
  });
  return save;
}

export function developPlayers(input: GameSave) {
  const save = clone(input);
  const club = userClub(save);
  playersForClub(save, club).forEach((player) => {
    if (player.age <= 24 && player.rating < player.potential) {
      player.rating = Math.min(player.potential, player.rating + Math.max(1, Math.round(club.trainingLevel / 4)));
      player.value = Math.round(player.value * 1.08);
    }
  });
  return save;
}

export function updateFormFitnessMorale(input: GameSave) {
  const save = clone(input);
  Object.values(save.players).forEach((player) => {
    player.fitness = Math.min(100, player.fitness + 9);
    player.morale = Math.max(15, Math.min(99, player.morale + (player.form > 65 ? 1 : -1)));
  });
  return save;
}

export function retirePlayers(input: GameSave) {
  const save = clone(input);
  Object.values(save.players).forEach((player) => {
    if (player.age >= 37 && player.clubId) {
      const club = save.clubs[player.clubId];
      club.playerIds = club.playerIds.filter((id) => id !== player.id);
      delete save.players[player.id];
    }
  });
  return save;
}

export function generateManagerTransferProposal(save: GameSave): TransferProposal | undefined {
  const club = userClub(save);
  const manager = getManager(save, club);
  if (!manager) return undefined;
  let state = save.rngState;
  const [kindRoll, s1] = randomInt(state, 1, 100);
  state = s1;
  const windowOpen = isTransferWindow(save.week);
  if (windowOpen && kindRoll <= 40) {
    const ownRatings = playersForClub(save, club).map((p) => p.rating);
    const targetRating = Math.max(...ownRatings) - 2;
    const candidates = Object.values(save.players).filter((player) => player.clubId !== club.id && player.rating >= targetRating - 10 && player.value <= club.finances.balance * 0.75);
    if (candidates.length === 0) return undefined;
    const [player, s2] = pickOne(state, candidates);
    save.rngState = s2;
    return {
      id: `proposal_${save.week}_${player.id}`,
      type: "buy",
      week: save.week,
      title: `Sign ${player.name}`,
      rationale: `${manager.name} wants a ${player.position} who fits his ${manager.style.toLowerCase()} approach.`,
      playerId: player.id,
      fromClubId: player.clubId,
      toClubId: club.id,
      fee: Math.round(player.value * 1.08),
      wageDelta: player.wage,
      expiresWeek: save.week + 2,
    };
  }
  if (windowOpen && kindRoll <= 66) {
    const saleCandidates = playersForClub(save, club).filter((player) => player.age > 29 || player.contractYears <= 1).sort((a, b) => b.value - a.value);
    const player = saleCandidates[0];
    if (!player) return undefined;
    const division = save.divisions.find((item) => item.id === club.divisionId);
    const possibleBidders = (division?.clubIds ?? []).map((id) => save.clubs[id]).filter((item) => item && item.id !== club.id);
    const [bidder, s2] = pickOne(state, possibleBidders.length > 0 ? possibleBidders : Object.values(save.clubs).filter((item) => item.id !== club.id));
    save.rngState = s2;
    return {
      id: `proposal_${save.week}_${player.id}`,
      type: "sell",
      week: save.week,
      title: `Sell ${player.name}`,
      rationale: `${manager.name} believes this is the right time to cash in and refresh the squad.`,
      playerId: player.id,
      fromClubId: club.id,
      toClubId: bidder.id,
      fee: Math.round(player.value * 0.92),
      wageDelta: -player.wage,
      expiresWeek: save.week + 2,
    };
  }
  if (windowOpen && kindRoll <= 88) {
    if (kindRoll <= 80) {
      const ownRatings = playersForClub(save, club).map((p) => p.rating);
      const targetRating = Math.max(...ownRatings) - 6;
      const candidates = Object.values(save.players).filter((player) => player.clubId && player.clubId !== club.id && !player.loan && player.rating >= targetRating - 8 && player.value > club.finances.balance * 0.55);
      if (candidates.length > 0) {
        const [player, s2] = pickOne(state, candidates);
        save.rngState = s2;
        const wageShare = Math.max(100, Math.round(player.wage * 0.55));
        return {
          id: `proposal_${save.week}_loan_in_${player.id}`,
          type: "loan",
          loanDirection: "in",
          week: save.week,
          title: `Loan ${player.name}`,
          rationale: `${manager.name} wants short-term depth without paying a permanent transfer fee.`,
          playerId: player.id,
          fromClubId: player.clubId,
          toClubId: club.id,
          fee: Math.round(player.value * 0.035),
          wageDelta: wageShare,
          expiresWeek: save.week + 2,
          requestedWage: wageShare,
          requestedYears: 1,
        };
      }
    }
    const loanOutCandidates = playersForClub(save, club)
      .filter((player) => !player.loan && (player.age <= 23 || player.rating < 55))
      .sort((a, b) => a.rating - b.rating || a.age - b.age);
    const player = loanOutCandidates[0];
    if (player) {
      const sameDivision = save.divisions.find((division) => division.id === club.divisionId);
      const bidderIds = (sameDivision?.clubIds ?? []).filter((id) => id !== club.id);
      const [bidderId, s2] = pickOne(state, bidderIds.length ? bidderIds : Object.keys(save.clubs).filter((id) => id !== club.id));
      save.rngState = s2;
      const wageCovered = Math.max(50, Math.round(player.wage * 0.75));
      return {
        id: `proposal_${save.week}_loan_out_${player.id}`,
        type: "loan",
        loanDirection: "out",
        week: save.week,
        title: `Loan out ${player.name}`,
        rationale: `${manager.name} thinks regular football elsewhere would help ${player.name}.`,
        playerId: player.id,
        fromClubId: club.id,
        toClubId: bidderId,
        fee: Math.round(player.value * 0.025),
        wageDelta: -wageCovered,
        expiresWeek: save.week + 2,
        requestedWage: wageCovered,
        requestedYears: 1,
      };
    }
  }
  const renewals = playersForClub(save, club).filter((player) => player.contractYears <= 1 || player.morale < 55).sort((a, b) => b.rating - a.rating);
  const player = renewals[0];
  if (!player) return undefined;
  const requestedWage = Math.round(calculateRecommendedPlayerWage(player, currentDivisionLevel(save), player.rating >= 70 ? "first_team" : "squad") * (player.morale < 55 ? 1.18 : 1.08));
  const requestedYears = Math.min(5, Math.max(2, 35 - player.age));
  return {
    id: `proposal_${save.week}_${player.id}`,
    type: "contract",
    week: save.week,
    title: `Renew ${player.name}`,
    rationale: `${manager.name} says ${player.name} wants a new deal and expects a serious offer.`,
    playerId: player.id,
    fromClubId: club.id,
    fee: 0,
    wageDelta: requestedWage - player.wage,
    expiresWeek: save.week + 2,
    requestedWage,
    requestedYears,
  };
}

export function generateManagerHireOffer(input: GameSave, managerId: string) {
  const save = clone(input);
  ensureEventState(save);
  ensureManagerState(save);
  const candidate = save.managerCandidates.find((manager) => manager.id === managerId);
  if (!candidate) return undefined;
  const club = userClub(save);
  const expectedWage = calculateRecommendedManagerWage(candidate, currentDivisionLevel(save));
  const outgoing = club.managerId ? save.managers[club.managerId] : undefined;
  const outgoingCompensation = outgoing ? calculateManagerCompensation(outgoing) : 0;
  const candidateCompensation = candidate.status === "contracted" ? candidate.compensationFee ?? calculateManagerCompensation(candidate) : 0;
  return { candidate, expectedWage, outgoingCompensation, candidateCompensation, totalImmediateCost: outgoingCompensation + candidateCompensation };
}

export function managerActionLocked(save: GameSave) {
  return Boolean(save.managerActionLockUntilWeek && save.week < save.managerActionLockUntilWeek);
}

export function submitManagerHireOffer(input: GameSave, managerId: string, terms: ContractTerms) {
  const save = clone(input);
  ensureEventState(save);
  ensureManagerState(save);
  const candidate = save.managerCandidates.find((manager) => manager.id === managerId);
  if (!candidate) return save;
  const club = userClub(save);
  if (managerActionLocked(save) && club.managerId) return save;
  const offer = generateManagerHireOffer(save, managerId);
  if (!offer) return save;
  const acceptsWage = candidate.status === "contracted" ? terms.wage >= offer.expectedWage : terms.wage >= offer.expectedWage * 0.9;
  const compensationPaid = candidate.status !== "contracted" || (terms.compensationFee ?? 0) >= offer.candidateCompensation;
  if (!acceptsWage || !compensationPaid) {
    club.boardConfidence = Math.max(20, club.boardConfidence - 1);
    return withUpdate(save);
  }
  if (club.managerId) {
    const outgoing = save.managers[club.managerId];
    if (outgoing) {
      const compensation = calculateManagerCompensation(outgoing);
      club.finances.balance -= compensation;
      club.finances.transactions.unshift({ id: `tx_manager_fire_${save.week}_${outgoing.id}`, week: save.week, label: `Manager compensation: ${outgoing.name}`, amount: -compensation });
      delete save.managers[outgoing.id];
    }
  }
  if (offer.candidateCompensation > 0) {
    club.finances.balance -= offer.candidateCompensation;
    club.finances.transactions.unshift({ id: `tx_manager_hire_${save.week}_${candidate.id}`, week: save.week, label: `Manager club compensation: ${candidate.name}`, amount: -offer.candidateCompensation });
  }
  const hired: Manager = { ...candidate, wage: terms.wage, contractYears: terms.years, status: "contracted", clubId: club.id, compensationFee: undefined };
  save.managers[candidate.id] = hired;
  club.managerId = candidate.id;
  club.managerTrust = 66;
  club.boardConfidence = Math.max(25, club.boardConfidence - (offer.outgoingCompensation > 0 ? 2 : 0));
  save.managerCandidates = save.managerCandidates.filter((manager) => manager.id !== managerId);
  save.managerActionLockUntilWeek = save.week + 4;
  return checkDebtAndBankruptcy(withUpdate(save));
}

export function confirmFireManager(input: GameSave) {
  const save = clone(input);
  ensureEventState(save);
  ensureManagerState(save);
  if (managerActionLocked(save)) return save;
  const club = userClub(save);
  if (club.managerId) {
    const manager = save.managers[club.managerId];
    if (manager) {
      const compensation = calculateManagerCompensation(manager);
      club.finances.balance -= compensation;
      club.finances.transactions.unshift({ id: `tx_manager_fire_${save.week}_${manager.id}`, week: save.week, label: `Manager compensation: ${manager.name}`, amount: -compensation });
      delete save.managers[club.managerId];
    }
  }
  club.managerId = undefined;
  club.boardConfidence = Math.max(25, club.boardConfidence - 8);
  club.managerTrust = 50;
  save.managerActionLockUntilWeek = save.week + 4;
  const [candidates, next] = generateManagerCandidates(save.rngState, currentDivisionLevel(save));
  save.rngState = next;
  save.managerCandidates = candidates;
  return checkDebtAndBankruptcy(withUpdate(save));
}

export const hireManager = submitManagerHireOffer;
export const fireManager = confirmFireManager;

export function evaluateManager(save: GameSave) {
  const club = userClub(save);
  const manager = getManager(save, club);
  if (!manager) return "No manager appointed.";
  const position = leagueTable(save).findIndex((item) => item.id === club.id) + 1;
  if (position <= 3) return `${manager.name} has the club ahead of expectations.`;
  if (position >= 15) return `${manager.name} is under pressure from the board.`;
  return `${manager.name} is meeting expectations.`;
}

export function upgradeStand(input: GameSave, standId: string) {
  const save = clone(input);
  const club = userClub(save);
  const stand = club.stadium.stands.find((item) => item.id === standId);
  if (!stand) return save;
  const cost = stand.level * 180_000;
  if (club.finances.balance < cost) return save;
  club.finances.balance -= cost;
  stand.level += 1;
  stand.capacity += 850;
  club.stadium.capacity = club.stadium.stands.reduce((sum, item) => sum + item.capacity, 0);
  save.achievements.find((a) => a.id === "stadium_upgrade")!.progress = 1;
  return withUpdate(updateAchievements(save));
}

export function repairStadium(input: GameSave) {
  const save = clone(input);
  const club = userClub(save);
  const cost = Math.round((100 - club.stadium.condition) * 4_500);
  if (club.finances.balance < cost) return save;
  club.finances.balance -= cost;
  club.stadium.condition = 100;
  return withUpdate(save);
}

export function upgradeTraining(input: GameSave, levels = 1) {
  const save = clone(input);
  const club = userClub(save);
  for (let i = 0; i < levels; i += 1) {
    const cost = nextUpgradeCost(club.trainingLevel, 14_000);
    if (club.trainingLevel >= 99 || club.finances.balance < cost) break;
    club.finances.balance -= cost;
    club.trainingLevel += 1;
    club.finances.upkeep += Math.round(cost / 850);
  }
  return withUpdate(save);
}

export function downgradeTraining(input: GameSave, levels = 1) {
  const save = clone(input);
  const club = userClub(save);
  for (let i = 0; i < levels; i += 1) {
    if (club.trainingLevel <= 1) break;
    const previousCost = nextUpgradeCost(club.trainingLevel - 1, 14_000);
    club.trainingLevel -= 1;
    club.finances.upkeep = Math.max(0, club.finances.upkeep - Math.round(previousCost / 850));
  }
  return withUpdate(save);
}

export function upgradeYouthAcademy(input: GameSave, levels = 1) {
  const save = clone(input);
  const club = userClub(save);
  for (let i = 0; i < levels; i += 1) {
    const cost = nextUpgradeCost(club.youthLevel, 13_000);
    if (club.youthLevel >= 99 || club.finances.balance < cost) break;
    club.finances.balance -= cost;
    club.youthLevel += 1;
    club.finances.upkeep += Math.round(cost / 900);
  }
  return withUpdate(save);
}

export function downgradeYouthAcademy(input: GameSave, levels = 1) {
  const save = clone(input);
  const club = userClub(save);
  for (let i = 0; i < levels; i += 1) {
    if (club.youthLevel <= 1) break;
    const previousCost = nextUpgradeCost(club.youthLevel - 1, 13_000);
    club.youthLevel -= 1;
    club.finances.upkeep = Math.max(0, club.finances.upkeep - Math.round(previousCost / 900));
  }
  return withUpdate(save);
}

export function generateYouthIntake(input: GameSave) {
  const save = clone(input);
  const club = userClub(save);
  for (let i = 0; i < Math.max(1, Math.floor(club.youthLevel / 28)); i += 1) {
    const id = `youth_${save.season}_${i}_${save.rngState}`;
    save.players[id] = {
      id,
      clubId: club.id,
      name: `Academy Prospect ${i + 1}`,
      position: i % 2 === 0 ? "M" : "F",
      age: 17,
      rating: Math.min(76, 30 + Math.round(club.youthLevel * 0.45)),
      potential: Math.min(96, 48 + Math.round(club.youthLevel * 0.5)),
      wage: 350,
      value: 25_000 + club.youthLevel * 8_000,
      contractYears: 2,
      form: 55,
      fitness: 96,
      morale: 72,
      personality: "Mentor",
      seasonStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
      careerStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 },
    };
    club.playerIds.push(id);
  }
  return save;
}

export function promoteYouthPlayer(input: GameSave, playerId: string) {
  const save = clone(input);
  const player = save.players[playerId];
  if (player) player.morale = Math.min(99, player.morale + 8);
  const achievement = save.achievements.find((item) => item.id === "youth_debut");
  if (achievement) achievement.progress = 1;
  return withUpdate(updateAchievements(save));
}

export function recordSeasonHistory(save: GameSave) {
  return save.history;
}

export function updateHallOfFame(input: GameSave) {
  const save = clone(input);
  const club = userClub(save);
  const legends = playersForClub(save, club)
    .filter((player) => player.careerStats.apps >= 50 || player.careerStats.goals >= 25)
    .map((player) => player.name);
  save.hallOfFame = Array.from(new Set([...save.hallOfFame, ...legends])).slice(0, 20);
  return save;
}

export function updateAchievements(input: GameSave) {
  const save = clone(input);
  if (save.achievements.length === 0) save.achievements = structuredClone(starterAchievements);
  const club = userClub(save);
  const firstWin = save.achievements.find((item) => item.id === "first_win");
  if (firstWin && club.record.won > 0) firstWin.progress = 1;
  const profit = save.achievements.find((item) => item.id === "profit_month");
  if (profit && club.finances.lastWeekProfit > 0) profit.progress = 1;
  const promotion = save.achievements.find((item) => item.id === "promotion");
  if (promotion && save.history.some((item) => item.trophies.includes("Promotion"))) promotion.progress = 1;
  const cup = save.achievements.find((item) => item.id === "cup_run");
  if (cup && (save.cup?.won || save.history.some((item) => item.trophies.includes("Chairman's Cup")))) cup.progress = 1;
  save.achievements.forEach((achievement) => {
    if (!achievement.unlockedAt && achievement.progress >= achievement.target) achievement.unlockedAt = save.week + save.season * 100;
  });
  return updateHallOfFame(save);
}
