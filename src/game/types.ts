export type Position = "G" | "D" | "M" | "F";
export type ManagerStyle = "Attacking" | "Balanced" | "Defensive";
export type Personality = "Winner" | "Builder" | "Pragmatist" | "Maverick" | "Mentor";
export type ProposalType = "buy" | "sell" | "contract" | "loan";
export type FixtureStatus = "scheduled" | "played";
export type CompetitionType = "league" | "cup";
export type LoanDirection = "in" | "out";
export type ManagerStatus = "free_agent" | "contracted";
export type GameEventType =
  | "club_update"
  | "contract_offer"
  | "contract_response"
  | "transfer_budget"
  | "financial_report"
  | "bank_warning"
  | "manager_frustrated"
  | "manager_contract_decision"
  | "manager_retirement_hint"
  | "transfer_window_open"
  | "incoming_bid"
  | "sale_ready"
  | "sale_confirmed"
  | "youth_contract"
  | "youth_promoted"
  | "hall_of_fame"
  | "average_crowd_report"
  | "season_intro"
  | "season_summary"
  | "match_preview"
  | "match_result";
export type TransferBudgetMode = "max" | "generous" | "normal" | "cautious" | "strict" | "zero";

export interface ClubSetupInput {
  chairmanName: string;
  clubName: string;
  stadiumName: string;
  primaryColor: string;
  secondaryColor: string;
  seed?: number;
}

export interface Division {
  id: string;
  name: string;
  level: number;
  clubIds: string[];
}

export interface LeagueRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface Club {
  id: string;
  name: string;
  divisionId: string;
  reputation: number;
  playerIds: string[];
  managerId?: string;
  primaryColor: string;
  secondaryColor: string;
  boardConfidence: number;
  managerTrust: number;
  finances: FinanceState;
  stadium: Stadium;
  trainingLevel: number;
  youthLevel: number;
  record: LeagueRecord;
}

export interface Player {
  id: string;
  clubId?: string;
  name: string;
  position: Position;
  age: number;
  rating: number;
  potential: number;
  wage: number;
  value: number;
  contractYears: number;
  form: number;
  fitness: number;
  morale: number;
  personality: Personality;
  loan?: LoanInfo;
  seasonStats: PlayerStats;
  careerStats: PlayerStats;
}

export interface LoanInfo {
  direction: LoanDirection;
  parentClubId: string;
  temporaryClubId: string;
  expiresSeason: number;
  wageShare: number;
}

export interface PlayerStats {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
}

export interface Manager {
  id: string;
  name: string;
  age: number;
  style: ManagerStyle;
  personality: Personality;
  training: number;
  tactics: number;
  transferTaste: number;
  youthPreference: number;
  contractYears: number;
  wage: number;
  reputation: number;
  status: ManagerStatus;
  clubId?: string;
  compensationFee?: number;
}

export interface FinanceState {
  balance: number;
  weeklyWages: number;
  sponsorship: number;
  ticketIncome: number;
  merchIncome: number;
  upkeep: number;
  debtLimit: number;
  lastWeekProfit: number;
  transactions: FinanceTransaction[];
}

export interface FinanceTransaction {
  id: string;
  week: number;
  label: string;
  amount: number;
}

export interface Stadium {
  name: string;
  capacity: number;
  condition: number;
  stands: StadiumStand[];
  facilityLevel: number;
}

export interface StadiumStand {
  id: string;
  name: string;
  level: number;
  capacity: number;
}

export interface Fixture {
  id: string;
  round: number;
  homeClubId: string;
  awayClubId: string;
  status: FixtureStatus;
  competition?: CompetitionType;
  cupRound?: number;
  result?: MatchResult;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  possessionHome: number;
  homeShots: number;
  awayShots: number;
  homeOnTarget: number;
  awayOnTarget: number;
  events: MatchEvent[];
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow" | "red" | "injury" | "chance" | "save";
  clubId: string;
  playerName: string;
  description: string;
}

export interface TransferProposal {
  id: string;
  type: ProposalType;
  week: number;
  title: string;
  rationale: string;
  playerId: string;
  fromClubId?: string;
  toClubId?: string;
  fee: number;
  wageDelta: number;
  expiresWeek: number;
  loanDirection?: LoanDirection;
  requestedWage?: number;
  requestedYears?: number;
}

export interface ContractTerms {
  wage: number;
  years: number;
  fee?: number;
  compensationFee?: number;
}

export interface TransferBudget {
  mode: TransferBudgetMode;
  amount: number;
}

export interface PendingDeal {
  id: string;
  type: "sale";
  playerId: string;
  fee: number;
  buyerClubId?: string;
  stage: "ready" | "confirmed";
}

export interface FinancialSnapshot {
  week: number;
  month: string;
  expenses: {
    wages: number;
    stadiumRunning: number;
    youthAcademy: number;
    trainingFacilities: number;
    infrastructure: number;
    feesOut: number;
  };
  income: {
    feesIn: number;
    ticketSales: number;
    foodDrink: number;
    merchandise: number;
    vip: number;
    prizeMoney: number;
    sponsorship: number;
    tv: number;
  };
  totalIncome: number;
  totalExpenses: number;
  profit: number;
}

export interface LiveMatchState {
  fixtureId: string;
  currentMinute: number;
  revealedEventCount: number;
  finished: boolean;
}

export interface CupRoundResult {
  season: number;
  round: number;
  roundName: string;
  opponentClubId: string;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  won: boolean;
  prize: number;
}

export interface CupState {
  name: string;
  round: number;
  maxRounds: number;
  eliminated: boolean;
  won: boolean;
  results: CupRoundResult[];
}

export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  body: string;
  requiresDecision: boolean;
  createdSeason: number;
  createdWeek: number;
  playerId?: string;
  managerId?: string;
  fixtureId?: string;
  proposal?: TransferProposal;
  pendingDeal?: PendingDeal;
  financialSnapshot?: FinancialSnapshot;
  seasonHistory?: SeasonHistory;
  note?: string;
  variant?: "positive" | "negative" | "neutral";
}

export interface SeasonHistory {
  season: number;
  divisionName: string;
  divisionLevel?: number;
  position: number;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points: number;
  balance: number;
  prizeMoney?: number;
  outcome?: "promoted" | "relegated" | "stayed";
  nextDivisionName?: string;
  cupSummary?: string;
  seasonImpact?: {
    balanceBefore: number;
    balanceAfter: number;
    boardConfidenceBefore: number;
    boardConfidenceAfter: number;
    managerTrustBefore: number;
    managerTrustAfter: number;
    reputationBefore: number;
    reputationAfter: number;
  };
  trophies: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: number;
  progress: number;
  target: number;
}

export interface GameSettings {
  sound: boolean;
  textSize: "normal" | "large";
}

export interface GameSave {
  version: 1;
  id: string;
  slotId: string;
  createdAt: string;
  updatedAt: string;
  seed: number;
  rngState: number;
  chairmanName: string;
  season: number;
  week: number;
  userClubId: string;
  divisions: Division[];
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  managers: Record<string, Manager>;
  managerCandidates: Manager[];
  fixtures: Fixture[];
  currentRound: number;
  lastMatch?: Fixture;
  eventQueue: GameEvent[];
  currentEvent?: GameEvent;
  seenEventKeys: string[];
  transferBudget?: TransferBudget;
  pendingDeals: PendingDeal[];
  managerActionLockUntilWeek?: number;
  managerRetirementIntent?: boolean;
  financialSnapshot?: FinancialSnapshot;
  liveMatch?: LiveMatchState;
  cup: CupState;
  history: SeasonHistory[];
  achievements: Achievement[];
  hallOfFame: string[];
  settings: GameSettings;
  gameOver?: string;
}

export interface SaveSlot {
  slotId: string;
  updatedAt: string;
  clubName: string;
  season: number;
  week: number;
  balance: number;
  save: GameSave;
}
