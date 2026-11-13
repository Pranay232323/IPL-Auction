// Advanced T20 Cricket Match & IPL Tournament Simulation Engine

import { PlayerRole, SquadBoughtPlayer, TeamAnalysisRank, TeamCode } from '../types';
import { formatLakhs, getFranchiseMeta } from './format';

export interface BatterScorecard {
  id: number;
  name: string;
  role: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissal?: string;
  isImpactSub?: boolean;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface BowlerScorecard {
  id: number;
  name: string;
  role: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface BallCommentary {
  overNumber: number;
  ballInOver: number;
  batterName: string;
  bowlerName: string;
  runs: number;
  isWicket: boolean;
  isFour: boolean;
  isSix: boolean;
  text: string;
  currentScore: string;
}

export interface InningsSimulation {
  battingTeamCode: TeamCode;
  bowlingTeamCode: TeamCode;
  totalRuns: number;
  totalWickets: number;
  oversCompleted: number; // e.g. 19.4 -> 19 overs 4 balls
  batters: BatterScorecard[];
  bowlers: BowlerScorecard[];
  fallOfWickets: { wicketNumber: number; score: number; over: string; batterName: string }[];
  keyCommentary: BallCommentary[];
}

export interface MatchSimulationResult {
  matchId: string;
  title: string;
  venue: string;
  teamA: TeamAnalysisRank;
  teamB: TeamAnalysisRank;
  tossWinner: TeamCode;
  tossDecision: 'BAT' | 'BOWL';
  innings1: InningsSimulation;
  innings2: InningsSimulation;
  winnerTeamCode: TeamCode;
  winMargin: string;
  playerOfTheMatch: {
    player: SquadBoughtPlayer;
    teamCode: TeamCode;
    summary: string;
  };
}

export interface TournamentPointsRow {
  teamCode: TeamCode;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  netRunRate: number;
  form: ('W' | 'L')[];
}

export interface TournamentSimulationResult {
  pointsTable: TournamentPointsRow[];
  leagueMatches: MatchSimulationResult[];
  playoffs: {
    qualifier1: MatchSimulationResult;
    eliminator: MatchSimulationResult;
    qualifier2: MatchSimulationResult;
    grandFinal: MatchSimulationResult;
  };
  champion: TeamAnalysisRank;
  runnerUp: TeamAnalysisRank;
  awards: {
    orangeCap: { player: SquadBoughtPlayer; teamCode: TeamCode; runs: number; innings: number };
    purpleCap: { player: SquadBoughtPlayer; teamCode: TeamCode; wickets: number; economy: number };
    mvp: { player: SquadBoughtPlayer; teamCode: TeamCode; score: number; summary: string };
  };
}

const VENUES = [
  'Wankhede Stadium, Mumbai',
  'M. A. Chidambaram Stadium, Chennai',
  'M. Chinnaswamy Stadium, Bengaluru',
  'Eden Gardens, Kolkata',
  'Narendra Modi Stadium, Ahmedabad',
  'Arun Jaitley Stadium, Delhi',
  'Sawai Mansingh Stadium, Jaipur',
  'Rajiv Gandhi International Cricket Stadium, Hyderabad',
  'Maharaja Yadavindra Singh Stadium, Mullanpur',
  'BRSABV Ekana Cricket Stadium, Lucknow',
];

export function getRandomVenue(): string {
  return VENUES[Math.floor(Math.random() * VENUES.length)];
}

export function createSquadPlayer(params: {
  id: number;
  name: string;
  role: PlayerRole;
  battingRating: number;
  bowlingRating: number;
  isOverseas?: boolean;
  teamCode: TeamCode;
  soldPriceLakhs?: number;
}): SquadBoughtPlayer {
  const overall = Math.round((params.battingRating + params.bowlingRating) / 2);
  return {
    id: params.id,
    name: params.name,
    country: params.isOverseas ? 'Overseas' : 'India',
    isOverseas: !!params.isOverseas,
    isCapped: true,
    role: params.role,
    battingStyle: 'RHB',
    bowlingStyle: params.role === 'BOWL' || params.role === 'AR' ? 'Right-arm fast-medium' : 'None',
    speciality: `${params.role} specialist`,
    basePriceLakhs: 150,
    auctionSet: 'M1',
    setOrder: 1,
    overallRating: overall,
    battingRating: params.battingRating,
    bowlingRating: params.bowlingRating,
    fieldingRating: 80,
    powerplayRating: 82,
    deathRating: 84,
    iplMatches: 45,
    iplRuns: params.role !== 'BOWL' ? 1200 : 85,
    iplStrikeRate: 138.5,
    iplWickets: params.role === 'BOWL' || params.role === 'AR' ? 42 : 0,
    iplEconomy: 8.1,
    previousTeam: params.teamCode,
    marquee: false,
    soldPriceLakhs: params.soldPriceLakhs || 800,
  };
}

export const FALLBACK_PLAYER: SquadBoughtPlayer = createSquadPlayer({
  id: 99999,
  name: 'IPL Impact Star',
  role: 'BAT',
  battingRating: 90,
  bowlingRating: 30,
  teamCode: 'CSK',
  soldPriceLakhs: 1400,
});

// Default balanced franchise squads if a room has empty/partial teams or fewer than 4 teams
const DEFAULT_FRANCHISE_LINEUPS: Record<TeamCode, { name: string; role: PlayerRole; bat: number; bowl: number; overseas?: boolean }[]> = {
  CSK: [
    { name: 'Ruturaj Gaikwad', role: 'BAT', bat: 92, bowl: 20 },
    { name: 'Devon Conway', role: 'BAT', bat: 89, bowl: 15, overseas: true },
    { name: 'Shivam Dube', role: 'AR', bat: 91, bowl: 72 },
    { name: 'Ravindra Jadeja', role: 'AR', bat: 85, bowl: 90 },
    { name: 'MS Dhoni', role: 'WK', bat: 88, bowl: 10 },
    { name: 'Sameer Rizvi', role: 'BAT', bat: 83, bowl: 20 },
    { name: 'Mitchell Santner', role: 'AR', bat: 75, bowl: 88, overseas: true },
    { name: 'Deepak Chahar', role: 'BOWL', bat: 68, bowl: 88 },
    { name: 'Shardul Thakur', role: 'AR', bat: 74, bowl: 85 },
    { name: 'Tushar Deshpande', role: 'BOWL', bat: 20, bowl: 85 },
    { name: 'Matheesha Pathirana', role: 'BOWL', bat: 15, bowl: 94, overseas: true },
  ],
  MI: [
    { name: 'Rohit Sharma', role: 'BAT', bat: 92, bowl: 20 },
    { name: 'Ishan Kishan', role: 'WK', bat: 90, bowl: 10 },
    { name: 'Suryakumar Yadav', role: 'BAT', bat: 97, bowl: 20 },
    { name: 'Tilak Varma', role: 'BAT', bat: 91, bowl: 40 },
    { name: 'Hardik Pandya', role: 'AR', bat: 90, bowl: 86 },
    { name: 'Tim David', role: 'BAT', bat: 88, bowl: 20, overseas: true },
    { name: 'Nehal Wadhera', role: 'BAT', bat: 82, bowl: 30 },
    { name: 'Gerald Coetzee', role: 'BOWL', bat: 45, bowl: 88, overseas: true },
    { name: 'Piyush Chawla', role: 'BOWL', bat: 30, bowl: 85 },
    { name: 'Jasprit Bumrah', role: 'BOWL', bat: 24, bowl: 99 },
    { name: 'Nuwan Thushara', role: 'BOWL', bat: 15, bowl: 86, overseas: true },
  ],
  RCB: [
    { name: 'Virat Kohli', role: 'BAT', bat: 98, bowl: 25 },
    { name: 'Faf du Plessis', role: 'BAT', bat: 90, bowl: 20, overseas: true },
    { name: 'Rajat Patidar', role: 'BAT', bat: 89, bowl: 15 },
    { name: 'Glenn Maxwell', role: 'AR', bat: 92, bowl: 82, overseas: true },
    { name: 'Cameron Green', role: 'AR', bat: 88, bowl: 84, overseas: true },
    { name: 'Dinesh Karthik', role: 'WK', bat: 88, bowl: 10 },
    { name: 'Mahipal Lomror', role: 'AR', bat: 81, bowl: 65 },
    { name: 'Karn Sharma', role: 'BOWL', bat: 30, bowl: 83 },
    { name: 'Lockie Ferguson', role: 'BOWL', bat: 20, bowl: 88, overseas: true },
    { name: 'Mohammed Siraj', role: 'BOWL', bat: 18, bowl: 91 },
    { name: 'Yash Dayal', role: 'BOWL', bat: 15, bowl: 84 },
  ],
  KKR: [
    { name: 'Phil Salt', role: 'WK', bat: 91, bowl: 10, overseas: true },
    { name: 'Sunil Narine', role: 'AR', bat: 85, bowl: 95, overseas: true },
    { name: 'Venkatesh Iyer', role: 'AR', bat: 88, bowl: 70 },
    { name: 'Shreyas Iyer', role: 'BAT', bat: 91, bowl: 20 },
    { name: 'Rinku Singh', role: 'BAT', bat: 91, bowl: 15 },
    { name: 'Andre Russell', role: 'AR', bat: 91, bowl: 84, overseas: true },
    { name: 'Ramandeep Singh', role: 'AR', bat: 81, bowl: 72 },
    { name: 'Mitchell Starc', role: 'BOWL', bat: 35, bowl: 93, overseas: true },
    { name: 'Harshit Rana', role: 'BOWL', bat: 25, bowl: 88 },
    { name: 'Vaibhav Arora', role: 'BOWL', bat: 15, bowl: 84 },
    { name: 'Varun Chakaravarthy', role: 'BOWL', bat: 15, bowl: 92 },
  ],
  RR: [
    { name: 'Yashasvi Jaiswal', role: 'BAT', bat: 95, bowl: 20 },
    { name: 'Jos Buttler', role: 'WK', bat: 95, bowl: 10, overseas: true },
    { name: 'Sanju Samson', role: 'WK', bat: 92, bowl: 10 },
    { name: 'Riyan Parag', role: 'AR', bat: 91, bowl: 74 },
    { name: 'Shimron Hetmyer', role: 'BAT', bat: 88, bowl: 15, overseas: true },
    { name: 'Dhruv Jurel', role: 'WK', bat: 86, bowl: 10 },
    { name: 'Ravichandran Ashwin', role: 'AR', bat: 72, bowl: 89 },
    { name: 'Trent Boult', role: 'BOWL', bat: 20, bowl: 92, overseas: true },
    { name: 'Avesh Khan', role: 'BOWL', bat: 18, bowl: 87 },
    { name: 'Sandeep Sharma', role: 'BOWL', bat: 15, bowl: 88 },
    { name: 'Yuzvendra Chahal', role: 'BOWL', bat: 12, bowl: 93 },
  ],
  SRH: [
    { name: 'Travis Head', role: 'BAT', bat: 95, bowl: 45, overseas: true },
    { name: 'Abhishek Sharma', role: 'AR', bat: 92, bowl: 75 },
    { name: 'Rahul Tripathi', role: 'BAT', bat: 86, bowl: 15 },
    { name: 'Heinrich Klaasen', role: 'WK', bat: 96, bowl: 10, overseas: true },
    { name: 'Nitish Kumar Reddy', role: 'AR', bat: 87, bowl: 80 },
    { name: 'Abdul Samad', role: 'BAT', bat: 83, bowl: 30 },
    { name: 'Shahbaz Ahmed', role: 'AR', bat: 78, bowl: 82 },
    { name: 'Pat Cummins', role: 'AR', bat: 68, bowl: 92, overseas: true },
    { name: 'Bhuvneshwar Kumar', role: 'BOWL', bat: 30, bowl: 89 },
    { name: 'Jaydev Unadkat', role: 'BOWL', bat: 25, bowl: 84 },
    { name: 'T Natarajan', role: 'BOWL', bat: 12, bowl: 90 },
  ],
  DC: [
    { name: 'David Warner', role: 'BAT', bat: 90, bowl: 15, overseas: true },
    { name: 'Jake Fraser-McGurk', role: 'BAT', bat: 91, bowl: 20, overseas: true },
    { name: 'Abishek Porel', role: 'WK', bat: 84, bowl: 10 },
    { name: 'Rishabh Pant', role: 'WK', bat: 93, bowl: 10 },
    { name: 'Tristan Stubbs', role: 'BAT', bat: 90, bowl: 50, overseas: true },
    { name: 'Axar Patel', role: 'AR', bat: 85, bowl: 91 },
    { name: 'Lalit Yadav', role: 'AR', bat: 76, bowl: 78 },
    { name: 'Kuldeep Yadav', role: 'BOWL', bat: 20, bowl: 94 },
    { name: 'Mukesh Kumar', role: 'BOWL', bat: 15, bowl: 87 },
    { name: 'Khaleel Ahmed', role: 'BOWL', bat: 15, bowl: 88 },
    { name: 'Ishant Sharma', role: 'BOWL', bat: 14, bowl: 84 },
  ],
  PBKS: [
    { name: 'Shikhar Dhawan', role: 'BAT', bat: 88, bowl: 15 },
    { name: 'Jonny Bairstow', role: 'WK', bat: 89, bowl: 10, overseas: true },
    { name: 'Prabhsimran Singh', role: 'WK', bat: 85, bowl: 10 },
    { name: 'Rilee Rossouw', role: 'BAT', bat: 86, bowl: 15, overseas: true },
    { name: 'Jitesh Sharma', role: 'WK', bat: 86, bowl: 10 },
    { name: 'Sam Curran', role: 'AR', bat: 84, bowl: 88, overseas: true },
    { name: 'Shashank Singh', role: 'BAT', bat: 87, bowl: 30 },
    { name: 'Ashutosh Sharma', role: 'BAT', bat: 86, bowl: 25 },
    { name: 'Harpreet Brar', role: 'AR', bat: 72, bowl: 85 },
    { name: 'Kagiso Rabada', role: 'BOWL', bat: 35, bowl: 92, overseas: true },
    { name: 'Arshdeep Singh', role: 'BOWL', bat: 20, bowl: 93 },
  ],
  GT: [
    { name: 'Shubman Gill', role: 'BAT', bat: 95, bowl: 15 },
    { name: 'Wriddhiman Saha', role: 'WK', bat: 84, bowl: 10 },
    { name: 'Sai Sudharsan', role: 'BAT', bat: 90, bowl: 15 },
    { name: 'David Miller', role: 'BAT', bat: 89, bowl: 10, overseas: true },
    { name: 'Azmatullah Omarzai', role: 'AR', bat: 82, bowl: 84, overseas: true },
    { name: 'Rahul Tewatia', role: 'AR', bat: 85, bowl: 76 },
    { name: 'Rashid Khan', role: 'AR', bat: 72, bowl: 97, overseas: true },
    { name: 'Mohit Sharma', role: 'BOWL', bat: 20, bowl: 88 },
    { name: 'Noor Ahmad', role: 'BOWL', bat: 15, bowl: 89, overseas: true },
    { name: 'Mohammed Shami', role: 'BOWL', bat: 22, bowl: 93 },
    { name: 'Spencer Johnson', role: 'BOWL', bat: 15, bowl: 87, overseas: true },
  ],
  LSG: [
    { name: 'KL Rahul', role: 'WK', bat: 93, bowl: 10 },
    { name: 'Quinton de Kock', role: 'WK', bat: 90, bowl: 10, overseas: true },
    { name: 'Devdutt Padikkal', role: 'BAT', bat: 85, bowl: 15 },
    { name: 'Marcus Stoinis', role: 'AR', bat: 91, bowl: 82, overseas: true },
    { name: 'Nicholas Pooran', role: 'WK', bat: 95, bowl: 10, overseas: true },
    { name: 'Ayush Badoni', role: 'BAT', bat: 84, bowl: 40 },
    { name: 'Krunal Pandya', role: 'AR', bat: 80, bowl: 86 },
    { name: 'Ravi Bishnoi', role: 'BOWL', bat: 18, bowl: 91 },
    { name: 'Naveen-ul-Haq', role: 'BOWL', bat: 16, bowl: 88, overseas: true },
    { name: 'Mayank Yadav', role: 'BOWL', bat: 15, bowl: 92 },
    { name: 'Mohsin Khan', role: 'BOWL', bat: 15, bowl: 87 },
  ],
};

function createDefaultTeamAnalysis(teamCode: TeamCode, rank: number, xi: SquadBoughtPlayer[]): TeamAnalysisRank {
  const meta = getFranchiseMeta(teamCode);
  return {
    rank,
    teamCode,
    teamName: meta?.name || `${teamCode} Franchise`,
    primaryColor: meta?.primaryColor || '#FACC15',
    secondaryColor: meta?.secondaryColor || '#1E40AF',
    ownerName: `${meta?.shortName || teamCode} AI`,
    isBot: true,
    overallScore: 88,
    grade: 'A',
    winProbabilityPct: 15,
    playoffQualification: true,
    squadSize: xi.length,
    overseasCount: xi.filter((p) => p.isOverseas).length,
    purseSpentLakhs: 8200,
    purseRemainingLakhs: 1800,
    roleCounts: {
      WK: xi.filter((p) => p.role === 'WK').length,
      BAT: xi.filter((p) => p.role === 'BAT').length,
      AR: xi.filter((p) => p.role === 'AR').length,
      BOWL: xi.filter((p) => p.role === 'BOWL').length,
    },
    cappedCount: xi.filter((p) => p.isCapped).length,
    uncappedCount: xi.filter((p) => !p.isCapped).length,
    categories: {
      batting: 88,
      paceBowling: 87,
      spinAttack: 86,
      allRoundBalance: 88,
      deathAndFinishing: 86,
      squadDepth: 85,
      valueEfficiency: 87,
    },
    bestPlayingXI: xi,
    impactPlayer: null,
    mvpPlayer: xi[0] || null,
    mostExpensiveBuy: xi[0] || null,
    bestValueSteal: xi[xi.length - 1] || null,
    strengths: ['Balanced Standard Squad'],
    weaknesses: [],
    punditVerdict: 'Solid, competitive roster equipped for all phases of T20 play.',
  };
}

/**
 * Guarantees a team always has 11 players and at least 5 bowlers for simulation.
 * If user hasn't drafted 11 players yet, fills missing slots from authentic franchise template.
 */
export function ensureCompleteTeam(team: TeamAnalysisRank): TeamAnalysisRank {
  if (!team) {
    const defaultXI = DEFAULT_FRANCHISE_LINEUPS.CSK.map((d, idx) =>
      createSquadPlayer({
        id: 80000 + idx,
        name: d.name,
        role: d.role,
        battingRating: d.bat,
        bowlingRating: d.bowl,
        isOverseas: d.overseas,
        teamCode: 'CSK',
      })
    );
    return createDefaultTeamAnalysis('CSK', 1, defaultXI);
  }

  const existingXI = [...(team.bestPlayingXI || [])];
  const defaults = DEFAULT_FRANCHISE_LINEUPS[team.teamCode] || DEFAULT_FRANCHISE_LINEUPS.CSK;

  // Fill up to 11 if incomplete
  if (existingXI.length < 11) {
    for (let i = existingXI.length; i < 11; i++) {
      const def = defaults[i] || defaults[i % defaults.length];
      existingXI.push(
        createSquadPlayer({
          id: 80000 + i * 10 + (team.teamCode.charCodeAt(0) % 100),
          name: def.name,
          role: def.role,
          battingRating: def.bat,
          bowlingRating: def.bowl,
          isOverseas: def.overseas,
          teamCode: team.teamCode,
        })
      );
    }
  }

  // Ensure at least 5 bowlers exist in the 11
  const bowlerCount = existingXI.filter((p) => p.role === 'BOWL' || p.role === 'AR').length;
  if (bowlerCount < 5) {
    const needed = 5 - bowlerCount;
    let replaced = 0;
    for (let i = existingXI.length - 1; i >= 0 && replaced < needed; i--) {
      if (existingXI[i].role === 'BAT') {
        const defBowler = defaults.find((d) => d.role === 'BOWL') || {
          name: 'Franchise Pacer',
          role: 'BOWL' as PlayerRole,
          bat: 20,
          bowl: 85,
        };
        existingXI[i] = createSquadPlayer({
          id: 85000 + i,
          name: defBowler.name,
          role: 'BOWL',
          battingRating: defBowler.bat,
          bowlingRating: defBowler.bowl,
          teamCode: team.teamCode,
        });
        replaced++;
      }
    }
  }

  return {
    ...team,
    bestPlayingXI: existingXI,
  };
}

/**
 * Guarantees at least 4 distinct teams exist for IPL Playoffs.
 */
export function ensureFourTeams(teams: TeamAnalysisRank[]): TeamAnalysisRank[] {
  const normalized = (teams || []).map(ensureCompleteTeam);
  if (normalized.length >= 4) return normalized;

  const allFranchises: TeamCode[] = ['CSK', 'MI', 'RCB', 'KKR', 'RR', 'SRH', 'DC', 'PBKS', 'GT', 'LSG'];
  const existingCodes = new Set(normalized.map((t) => t.teamCode));

  for (const code of allFranchises) {
    if (normalized.length >= 4) break;
    if (!existingCodes.has(code)) {
      const defaults = DEFAULT_FRANCHISE_LINEUPS[code];
      const xi = defaults.map((d, idx) =>
        createSquadPlayer({
          id: 70000 + idx * 10 + (code.charCodeAt(0) % 50),
          name: d.name,
          role: d.role,
          battingRating: d.bat,
          bowlingRating: d.bowl,
          isOverseas: d.overseas,
          teamCode: code,
        })
      );

      normalized.push(createDefaultTeamAnalysis(code, normalized.length + 1, xi));
      existingCodes.add(code);
    }
  }

  return normalized;
}

// -----------------------------------------------------------------------------
// CORE T20 INNINGS SIMULATOR
// -----------------------------------------------------------------------------
export function simulateInnings(
  rawBattingTeam: TeamAnalysisRank,
  rawBowlingTeam: TeamAnalysisRank,
  target?: number // if set, chase ends once totalRuns >= target
): InningsSimulation {
  const battingTeam = ensureCompleteTeam(rawBattingTeam);
  const bowlingTeam = ensureCompleteTeam(rawBowlingTeam);

  const xi = [...battingTeam.bestPlayingXI];
  const impactSub = battingTeam.impactPlayer;

  const batCapId = rawBattingTeam.captain?.id || battingTeam.captain?.id || xi[0]?.id;
  const batVcId = rawBattingTeam.viceCaptain?.id || battingTeam.viceCaptain?.id;

  // Initialize batters
  const batters: BatterScorecard[] = xi.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
    isImpactSub: false,
    isCaptain: p.id === batCapId,
    isViceCaptain: p.id === batVcId,
  }));

  // Identify eligible bowlers from bowling team (AR & BOWL prioritized)
  let eligibleBowlers = bowlingTeam.bestPlayingXI
    .filter((p) => p.role === 'BOWL' || p.role === 'AR');

  // If fewer than 5 bowlers, pull part-timers from other roles
  if (eligibleBowlers.length < 5) {
    const partTimers = bowlingTeam.bestPlayingXI
      .filter((p) => !eligibleBowlers.some((b) => b.id === p.id) && p.role !== 'WK');
    eligibleBowlers.push(...partTimers);
  }

  // Final safety check: if still fewer than 5, pull anyone
  if (eligibleBowlers.length < 5) {
    eligibleBowlers = [...bowlingTeam.bestPlayingXI.slice(0, 5)];
  }

  const bwlCapId = rawBowlingTeam.captain?.id || bowlingTeam.captain?.id || eligibleBowlers[0]?.id;
  const bwlVcId = rawBowlingTeam.viceCaptain?.id || bowlingTeam.viceCaptain?.id;

  const bowlers: BowlerScorecard[] = eligibleBowlers.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    overs: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
    isCaptain: p.id === bwlCapId,
    isViceCaptain: p.id === bwlVcId,
  }));

  let totalRuns = 0;
  let wicketsFallen = 0;
  let strikerIdx = 0;
  let nonStrikerIdx = 1;
  let nextBatterIdx = 2;
  let impactSubUsed = false;

  const fallOfWickets: { wicketNumber: number; score: number; over: string; batterName: string }[] = [];
  const keyCommentary: BallCommentary[] = [];

  let currentOver = 0;
  let currentBallInOver = 0;

  for (let over = 0; over < 20; over++) {
    currentOver = over;
    if (wicketsFallen >= 10 || (target && totalRuns >= target) || strikerIdx >= batters.length) break;

    // Pick bowler for this over (rotate, max 4 overs per bowler)
    let availableBowlers = bowlers.filter((b) => b.overs < 4);
    if (availableBowlers.length === 0) {
      availableBowlers = [...bowlers].sort((a, b) => a.overs - b.overs);
    }
    if (availableBowlers.length === 0) break;

    const isPowerplay = over < 6;
    const isDeath = over >= 15;
    const bowler = availableBowlers[over % availableBowlers.length];

    let runsThisOver = 0;

    for (let ball = 1; ball <= 6; ball++) {
      currentBallInOver = ball;
      if (wicketsFallen >= 10 || (target && totalRuns >= target) || strikerIdx >= batters.length) break;

      const striker = batters[strikerIdx];
      if (!striker || striker.isOut) break;

      const strikerPlayer = xi.find((p) => p.id === striker.id);
      const bowlerPlayer = eligibleBowlers.find((p) => p.id === bowler.id);

      const batRating = strikerPlayer?.battingRating || 75;
      const bwlRating = bowlerPlayer?.bowlingRating || 75;

      const aggression = isDeath ? 1.45 : isPowerplay ? 1.25 : 1.0;
      const ratingDiff = (batRating - bwlRating) / 30;
      const roll = Math.random() + ratingDiff * 0.12;

      let runs = 0;
      let isWicket = false;
      let isFour = false;
      let isSix = false;
      let commText = '';

      const wicketChance = (0.045 + (isDeath ? 0.04 : 0) - ratingDiff * 0.02) * (1 / aggression);

      if (roll < wicketChance && roll > 0) {
        // WICKET
        isWicket = true;
        wicketsFallen++;
        striker.isOut = true;
        striker.balls++;

        const dismissalTypes = ['b', 'c', 'c & b', 'lbw', 'st'];
        const dType = dismissalTypes[Math.floor(Math.random() * dismissalTypes.length)];
        striker.dismissal = `${dType} ${bowler.name}`;
        bowler.wickets++;

        fallOfWickets.push({
          wicketNumber: wicketsFallen,
          score: totalRuns,
          over: `${over}.${ball}`,
          batterName: striker.name,
        });

        commText = `WICKET! ${striker.name} (${striker.runs} off ${striker.balls}) ${striker.dismissal}! Stunning delivery from ${bowler.name}!`;

        if (!impactSubUsed && impactSub && wicketsFallen === 4 && over < 12) {
          impactSubUsed = true;
          batters.push({
            id: impactSub.id,
            name: `${impactSub.name} (Impact)`,
            role: impactSub.role,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            isImpactSub: true,
          });
          strikerIdx = batters.length - 1;
        } else if (nextBatterIdx < batters.length) {
          strikerIdx = nextBatterIdx;
          nextBatterIdx++;
        } else {
          // All out
          break;
        }
      } else {
        // RUNS SCORED
        striker.balls++;
        const boundaryRoll = Math.random() * aggression;

        if (boundaryRoll > 0.88) {
          runs = 6;
          isSix = true;
          striker.sixes++;
          commText = `SIX! ${striker.name} launches ${bowler.name} deep into the stands! What a monstrous strike!`;
        } else if (boundaryRoll > 0.72) {
          runs = 4;
          isFour = true;
          striker.fours++;
          commText = `FOUR! Beautifully timed drive through the covers by ${striker.name}!`;
        } else if (boundaryRoll > 0.50) {
          runs = 2;
        } else if (boundaryRoll > 0.25) {
          runs = 1;
        } else {
          runs = 0;
        }

        striker.runs += runs;
        totalRuns += runs;
        runsThisOver += runs;
        bowler.runsConceded += runs;

        // Rotate strike on singles
        if (runs % 2 === 1 && nonStrikerIdx < batters.length && !batters[nonStrikerIdx]?.isOut) {
          const temp = strikerIdx;
          strikerIdx = nonStrikerIdx;
          nonStrikerIdx = temp;
        }
      }

      if (isWicket || isFour || isSix || (target && target - totalRuns <= 6)) {
        keyCommentary.push({
          overNumber: over + 1,
          ballInOver: ball,
          batterName: striker.name,
          bowlerName: bowler.name,
          runs,
          isWicket,
          isFour,
          isSix,
          text: commText,
          currentScore: `${totalRuns}/${wicketsFallen}`,
        });
      }
    }

    bowler.overs++;
    if (runsThisOver === 0) bowler.maidens++;

    // End of over: switch ends
    if (nonStrikerIdx < batters.length && !batters[nonStrikerIdx]?.isOut) {
      const temp = strikerIdx;
      strikerIdx = nonStrikerIdx;
      nonStrikerIdx = temp;
    }
  }

  batters.forEach((b) => {
    b.strikeRate = b.balls > 0 ? parseFloat(((b.runs / b.balls) * 100).toFixed(1)) : 0;
  });
  bowlers.forEach((b) => {
    b.economy = b.overs > 0 ? parseFloat((b.runsConceded / b.overs).toFixed(2)) : 0;
  });

  const oversCompleted = parseFloat(
    `${currentOver}.${currentBallInOver === 6 ? 0 : currentBallInOver}`
  );

  return {
    battingTeamCode: battingTeam.teamCode,
    bowlingTeamCode: bowlingTeam.teamCode,
    totalRuns,
    totalWickets: wicketsFallen,
    oversCompleted,
    batters,
    bowlers,
    fallOfWickets,
    keyCommentary: keyCommentary.slice(-18),
  };
}

// -----------------------------------------------------------------------------
// HEAD-TO-HEAD MATCH SIMULATOR
// -----------------------------------------------------------------------------
export function simulateMatch(
  rawTeamA: TeamAnalysisRank,
  rawTeamB: TeamAnalysisRank,
  options?: { venue?: string; title?: string }
): MatchSimulationResult {
  const teamA = ensureCompleteTeam(rawTeamA);
  const teamB = ensureCompleteTeam(rawTeamB);

  const matchId = `match_${teamA.teamCode}_vs_${teamB.teamCode}_${Date.now()}`;
  const venue = options?.venue || getRandomVenue();
  const title = options?.title || `${teamA.teamName} vs ${teamB.teamName}`;

  // Coin Toss
  const tossWinner = Math.random() > 0.5 ? teamA.teamCode : teamB.teamCode;
  const tossDecision: 'BAT' | 'BOWL' = Math.random() > 0.4 ? 'BOWL' : 'BAT';

  let firstBattingTeam: TeamAnalysisRank;
  let secondBattingTeam: TeamAnalysisRank;

  if (
    (tossWinner === teamA.teamCode && tossDecision === 'BAT') ||
    (tossWinner === teamB.teamCode && tossDecision === 'BOWL')
  ) {
    firstBattingTeam = teamA;
    secondBattingTeam = teamB;
  } else {
    firstBattingTeam = teamB;
    secondBattingTeam = teamA;
  }

  // Innings 1
  const innings1 = simulateInnings(firstBattingTeam, secondBattingTeam);

  // Innings 2 (Chasing innings 1 total + 1)
  const target = innings1.totalRuns + 1;
  const innings2 = simulateInnings(secondBattingTeam, firstBattingTeam, target);

  let winnerTeamCode: TeamCode;
  let winMargin: string;

  if (innings2.totalRuns >= target) {
    winnerTeamCode = secondBattingTeam.teamCode;
    const wicketsRemaining = 10 - innings2.totalWickets;
    winMargin = `${secondBattingTeam.teamName} won by ${wicketsRemaining} wicket${wicketsRemaining > 1 ? 's' : ''}`;
  } else if (innings2.totalRuns < innings1.totalRuns) {
    winnerTeamCode = firstBattingTeam.teamCode;
    const runsMargin = innings1.totalRuns - innings2.totalRuns;
    winMargin = `${firstBattingTeam.teamName} won by ${runsMargin} run${runsMargin > 1 ? 's' : ''}`;
  } else {
    // Super Over Tie
    winnerTeamCode = Math.random() > 0.5 ? firstBattingTeam.teamCode : secondBattingTeam.teamCode;
    winMargin = `${winnerTeamCode} won via Super Over thriller!`;
  }

  // Determine Player of the Match
  const winningTeam = winnerTeamCode === teamA.teamCode ? teamA : teamB;
  const winInnings = winnerTeamCode === firstBattingTeam.teamCode ? innings1 : innings2;
  const winBowlInnings = winnerTeamCode === firstBattingTeam.teamCode ? innings2 : innings1;

  const topBatter = [...winInnings.batters].sort((a, b) => b.runs - a.runs)[0];
  const topBowler = [...winBowlInnings.bowlers].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)[0];

  let pomPlayer: SquadBoughtPlayer = winningTeam.bestPlayingXI[0] || FALLBACK_PLAYER;
  let pomSummary = 'Match-defining all-round performance';

  if (topBowler && topBowler.wickets >= 3) {
    pomPlayer = winningTeam.bestPlayingXI.find((p) => p.name === topBowler.name) || winningTeam.bestPlayingXI[0] || FALLBACK_PLAYER;
    pomSummary = `${topBowler.wickets} wickets for ${topBowler.runsConceded} runs (${topBowler.economy} econ)`;
  } else if (topBatter && topBatter.runs >= 40) {
    pomPlayer = winningTeam.bestPlayingXI.find((p) => p.name === topBatter.name) || winningTeam.bestPlayingXI[0] || FALLBACK_PLAYER;
    pomSummary = `${topBatter.runs} runs off ${topBatter.balls} balls (${topBatter.sixes} sixes, ${topBatter.fours} fours)`;
  }

  return {
    matchId,
    title,
    venue,
    teamA,
    teamB,
    tossWinner,
    tossDecision,
    innings1,
    innings2,
    winnerTeamCode,
    winMargin,
    playerOfTheMatch: {
      player: pomPlayer,
      teamCode: winnerTeamCode,
      summary: pomSummary,
    },
  };
}

// -----------------------------------------------------------------------------
// COMPLETE IPL TOURNAMENT SIMULATOR
// -----------------------------------------------------------------------------
export function simulateFullTournament(rawTeams: TeamAnalysisRank[]): TournamentSimulationResult {
  // Guarantee at least 4 complete teams for playoffs and awards
  const teams = ensureFourTeams(rawTeams);
  const pointsMap = new Map<TeamCode, TournamentPointsRow>();

  teams.forEach((t) => {
    pointsMap.set(t.teamCode, {
      teamCode: t.teamCode,
      teamName: t.teamName,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0,
      netRunRate: 0,
      form: [],
    });
  });

  const leagueMatches: MatchSimulationResult[] = [];

  // Round Robin
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const match = simulateMatch(teams[i], teams[j], {
        title: `Match #${leagueMatches.length + 1}: ${teams[i].teamCode} vs ${teams[j].teamCode}`,
      });
      leagueMatches.push(match);

      const rowA = pointsMap.get(teams[i].teamCode)!;
      const rowB = pointsMap.get(teams[j].teamCode)!;

      rowA.played++;
      rowB.played++;

      if (match.winnerTeamCode === teams[i].teamCode) {
        rowA.won++;
        rowA.points += 2;
        rowA.form.push('W');
        rowB.lost++;
        rowB.form.push('L');
      } else {
        rowB.won++;
        rowB.points += 2;
        rowB.form.push('W');
        rowA.lost++;
        rowA.form.push('L');
      }

      const inA = match.innings1.battingTeamCode === teams[i].teamCode ? match.innings1 : match.innings2;
      const inB = match.innings1.battingTeamCode === teams[j].teamCode ? match.innings1 : match.innings2;

      rowA.runsFor += inA.totalRuns;
      rowA.oversFor += 20;
      rowA.runsAgainst += inB.totalRuns;
      rowA.oversAgainst += 20;

      rowB.runsFor += inB.totalRuns;
      rowB.oversFor += 20;
      rowB.runsAgainst += inA.totalRuns;
      rowB.oversAgainst += 20;
    }
  }

  // Calculate NRR & sort points table
  const pointsTable = Array.from(pointsMap.values()).map((row) => {
    const runRateFor = row.runsFor / Math.max(1, row.oversFor);
    const runRateAgainst = row.runsAgainst / Math.max(1, row.oversAgainst);
    const nrr = parseFloat((runRateFor - runRateAgainst).toFixed(3));
    return {
      ...row,
      netRunRate: nrr,
      form: row.form.slice(-5),
    };
  });

  // Sort by Points DESC, then NetRunRate DESC
  pointsTable.sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);

  // Top 4 Teams Qualify for IPL Playoffs
  const team1 = teams.find((t) => t.teamCode === pointsTable[0]?.teamCode) || teams[0];
  const team2 = teams.find((t) => t.teamCode === pointsTable[1]?.teamCode) || teams[1] || teams[0];
  const team3 = teams.find((t) => t.teamCode === pointsTable[2]?.teamCode) || teams[2] || teams[0];
  const team4 = teams.find((t) => t.teamCode === pointsTable[3]?.teamCode) || teams[3] || teams[1] || teams[0];

  // 1. Qualifier 1 (#1 vs #2)
  const q1 = simulateMatch(team1, team2, {
    title: 'IPL Qualifier 1 (#1 vs #2)',
    venue: 'Narendra Modi Stadium, Ahmedabad',
  });
  const q1Winner = q1.winnerTeamCode === team1.teamCode ? team1 : team2;
  const q1Loser = q1.winnerTeamCode === team1.teamCode ? team2 : team1;

  // 2. Eliminator (#3 vs #4)
  const elim = simulateMatch(team3, team4, {
    title: 'IPL Eliminator (#3 vs #4)',
    venue: 'Eden Gardens, Kolkata',
  });
  const elimWinner = elim.winnerTeamCode === team3.teamCode ? team3 : team4;

  // 3. Qualifier 2 (Q1 Loser vs Eliminator Winner)
  const q2 = simulateMatch(q1Loser, elimWinner, {
    title: 'IPL Qualifier 2 (Q1 Loser vs Eliminator Winner)',
    venue: 'M. A. Chidambaram Stadium, Chennai',
  });
  const q2Winner = q2.winnerTeamCode === q1Loser.teamCode ? q1Loser : elimWinner;

  // 4. Grand Final (Q1 Winner vs Q2 Winner)
  const grandFinal = simulateMatch(q1Winner, q2Winner, {
    title: 'IPL GRAND FINAL 2026 🏆',
    venue: 'Wankhede Stadium, Mumbai',
  });
  const champion = grandFinal.winnerTeamCode === q1Winner.teamCode ? q1Winner : q2Winner;
  const runnerUp = grandFinal.winnerTeamCode === q1Winner.teamCode ? q2Winner : q1Winner;

  // Calculate Season Awards (Orange Cap & Purple Cap)
  const playerRunsMap = new Map<string, { player: SquadBoughtPlayer; teamCode: TeamCode; runs: number; innings: number }>();
  const playerWicketsMap = new Map<string, { player: SquadBoughtPlayer; teamCode: TeamCode; wickets: number; runs: number; overs: number }>();

  const allPlayedMatches = [...leagueMatches, q1, elim, q2, grandFinal];

  allPlayedMatches.forEach((m) => {
    [m.innings1, m.innings2].forEach((inng) => {
      const battingTeam = teams.find((t) => t.teamCode === inng.battingTeamCode);
      const bowlingTeam = teams.find((t) => t.teamCode === inng.bowlingTeamCode);

      inng.batters.forEach((b) => {
        if (!b.name || b.runs === 0) return;
        const pObj = battingTeam?.bestPlayingXI.find((p) => p.name === b.name) ||
          createSquadPlayer({
            id: b.id || 60000,
            name: b.name,
            role: (b.role as PlayerRole) || 'BAT',
            battingRating: 85,
            bowlingRating: 20,
            teamCode: inng.battingTeamCode,
          });

        const curr = playerRunsMap.get(b.name) || { player: pObj, teamCode: inng.battingTeamCode, runs: 0, innings: 0 };
        curr.runs += b.runs;
        curr.innings++;
        playerRunsMap.set(b.name, curr);
      });

      inng.bowlers.forEach((bw) => {
        if (!bw.name || bw.overs === 0) return;
        const pObj = bowlingTeam?.bestPlayingXI.find((p) => p.name === bw.name) ||
          createSquadPlayer({
            id: bw.id || 65000,
            name: bw.name,
            role: 'BOWL',
            battingRating: 20,
            bowlingRating: 85,
            teamCode: inng.bowlingTeamCode,
          });

        const curr = playerWicketsMap.get(bw.name) || { player: pObj, teamCode: inng.bowlingTeamCode, wickets: 0, runs: 0, overs: 0 };
        curr.wickets += bw.wickets;
        curr.runs += bw.runsConceded;
        curr.overs += bw.overs;
        playerWicketsMap.set(bw.name, curr);
      });
    });
  });

  const sortedRuns = Array.from(playerRunsMap.values()).sort((a, b) => b.runs - a.runs);
  const sortedWickets = Array.from(playerWicketsMap.values()).sort((a, b) => b.wickets - a.wickets);

  const defaultTopBatter = champion.bestPlayingXI[0] || FALLBACK_PLAYER;
  const defaultTopBowler = champion.bestPlayingXI.find((p) => p.role === 'BOWL') || champion.bestPlayingXI[existingFirstBowlerIdx(champion)] || FALLBACK_PLAYER;

  const orangeCap = sortedRuns[0] || {
    player: defaultTopBatter,
    teamCode: champion.teamCode,
    runs: 540,
    innings: 14,
  };

  const topWkt = sortedWickets[0];
  const purpleCap = topWkt
    ? {
        player: topWkt.player,
        teamCode: topWkt.teamCode,
        wickets: topWkt.wickets,
        economy: parseFloat((topWkt.runs / Math.max(1, topWkt.overs)).toFixed(2)),
      }
    : {
        player: defaultTopBowler,
        teamCode: champion.teamCode,
        wickets: 23,
        economy: 7.45,
      };

  const mvp = {
    player: orangeCap.player || defaultTopBatter,
    teamCode: orangeCap.teamCode || champion.teamCode,
    score: 920,
    summary: `${orangeCap.runs} runs in ${orangeCap.innings} matches with tournament-best match impact`,
  };

  return {
    pointsTable,
    leagueMatches,
    playoffs: {
      qualifier1: q1,
      eliminator: elim,
      qualifier2: q2,
      grandFinal,
    },
    champion,
    runnerUp,
    awards: {
      orangeCap,
      purpleCap,
      mvp,
    },
  };
}

function existingFirstBowlerIdx(team: TeamAnalysisRank): number {
  const idx = team.bestPlayingXI.findIndex((p) => p.role === 'BOWL' || p.role === 'AR');
  return idx >= 0 ? idx : 0;
}
