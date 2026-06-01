import { z } from "zod";

const transferProposalSchema = z.object({
  id: z.string(),
  type: z.enum(["buy", "sell", "contract", "loan"]),
  week: z.number(),
  title: z.string(),
  rationale: z.string(),
  playerId: z.string(),
  fromClubId: z.string().optional(),
  toClubId: z.string().optional(),
  fee: z.number(),
  wageDelta: z.number(),
  expiresWeek: z.number(),
  loanDirection: z.enum(["in", "out"]).optional(),
  requestedWage: z.number().optional(),
  requestedYears: z.number().optional(),
}).passthrough();

const pendingDealSchema = z.object({
  id: z.string(),
  type: z.literal("sale"),
  playerId: z.string(),
  fee: z.number(),
  buyerClubId: z.string().optional(),
  stage: z.enum(["ready", "confirmed"]),
}).passthrough();

const financialSnapshotSchema = z.object({
  week: z.number(),
  month: z.string(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  expenses: z.object({
    wages: z.number(),
    stadiumRunning: z.number(),
    youthAcademy: z.number(),
    trainingFacilities: z.number(),
    infrastructure: z.number(),
    feesOut: z.number(),
  }).passthrough(),
  income: z.object({
    feesIn: z.number(),
    ticketSales: z.number(),
    foodDrink: z.number(),
    merchandise: z.number(),
    vip: z.number(),
    prizeMoney: z.number(),
    sponsorship: z.number(),
    tv: z.number(),
  }).passthrough(),
  totalIncome: z.number(),
  totalExpenses: z.number(),
  profit: z.number(),
}).passthrough();

const seasonHistorySchema = z.object({
  season: z.number(),
  divisionName: z.string(),
  divisionLevel: z.number().optional(),
  position: z.number(),
  played: z.number().optional(),
  won: z.number().optional(),
  drawn: z.number().optional(),
  lost: z.number().optional(),
  goalsFor: z.number().optional(),
  goalsAgainst: z.number().optional(),
  points: z.number(),
  balance: z.number(),
  prizeMoney: z.number().optional(),
  outcome: z.enum(["promoted", "relegated", "stayed"]).optional(),
  nextDivisionName: z.string().optional(),
  cupSummary: z.string().optional(),
  seasonImpact: z.object({
    balanceBefore: z.number(),
    balanceAfter: z.number(),
    boardConfidenceBefore: z.number(),
    boardConfidenceAfter: z.number(),
    managerTrustBefore: z.number(),
    managerTrustAfter: z.number(),
    reputationBefore: z.number(),
    reputationAfter: z.number(),
  }).passthrough().optional(),
  trophies: z.array(z.string()),
}).passthrough();

export const gameEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "club_update",
    "contract_offer",
    "contract_response",
    "transfer_budget",
    "financial_report",
    "bank_warning",
    "manager_frustrated",
    "manager_contract_decision",
    "manager_retirement_hint",
    "transfer_window_open",
    "incoming_bid",
    "sale_ready",
    "sale_confirmed",
    "youth_contract",
    "youth_promoted",
    "hall_of_fame",
    "average_crowd_report",
    "season_intro",
    "season_summary",
    "match_preview",
    "match_result",
  ]),
  title: z.string(),
  body: z.string(),
  requiresDecision: z.boolean(),
  createdSeason: z.number(),
  createdWeek: z.number(),
  playerId: z.string().optional(),
  managerId: z.string().optional(),
  fixtureId: z.string().optional(),
  proposal: transferProposalSchema.optional(),
  pendingDeal: pendingDealSchema.optional(),
  financialSnapshot: financialSnapshotSchema.optional(),
  seasonHistory: seasonHistorySchema.optional(),
  note: z.string().optional(),
  variant: z.enum(["positive", "negative", "neutral"]).optional(),
}).passthrough().superRefine((event, ctx) => {
  if ((event.type === "contract_offer" || event.type === "incoming_bid") && !event.proposal) {
    ctx.addIssue({ code: "custom", path: ["proposal"], message: `${event.type} events require a transfer proposal.` });
  }
  if (event.type === "sale_ready" && !event.pendingDeal) {
    ctx.addIssue({ code: "custom", path: ["pendingDeal"], message: "sale_ready events require a pending deal." });
  }
  if (event.type === "financial_report" && !event.financialSnapshot) {
    ctx.addIssue({ code: "custom", path: ["financialSnapshot"], message: "financial_report events require a financial snapshot." });
  }
  if (event.type === "season_summary" && !event.seasonHistory) {
    ctx.addIssue({ code: "custom", path: ["seasonHistory"], message: "season_summary events require season history." });
  }
  if ((event.type === "match_preview" || event.type === "match_result") && !event.fixtureId) {
    ctx.addIssue({ code: "custom", path: ["fixtureId"], message: `${event.type} events require a fixture id.` });
  }
});

export const gameSaveSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  slotId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  seed: z.number(),
  rngState: z.number(),
  chairmanName: z.string(),
  season: z.number(),
  week: z.number(),
  userClubId: z.string(),
  divisions: z.array(z.any()),
  clubs: z.record(z.string(), z.any()),
  players: z.record(z.string(), z.any()),
  managers: z.record(z.string(), z.any()),
  managerCandidates: z.array(z.any()),
  fixtures: z.array(z.any()),
  currentRound: z.number(),
  lastMatch: z.any().optional(),
  eventQueue: z.array(gameEventSchema).default([]),
  currentEvent: gameEventSchema.optional(),
  seenEventKeys: z.array(z.string()).default([]),
  transferBudget: z.any().optional(),
  pendingDeals: z.array(z.any()).default([]),
  managerActionLockUntilWeek: z.number().optional(),
  managerRetirementIntent: z.boolean().optional(),
  financialSnapshot: z.any().optional(),
  liveMatch: z.any().optional(),
  cup: z.any().optional(),
  history: z.array(z.any()),
  achievements: z.array(z.any()),
  hallOfFame: z.array(z.string()),
  settings: z.object({
    sound: z.boolean(),
    textSize: z.enum(["normal", "large"]),
  }),
  gameOver: z.string().optional(),
});
