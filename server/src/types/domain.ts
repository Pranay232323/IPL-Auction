export type PlayerRole = 'WK' | 'BAT' | 'AR' | 'BOWL';

export type RoomStatus = 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type RoomVisibility = 'PUBLIC' | 'PRIVATE';

export type LotStatus = 'UPCOMING' | 'ON_BLOCK' | 'SOLD' | 'UNSOLD';

export type TeamCode =
  | 'CSK'
  | 'MI'
  | 'RCB'
  | 'KKR'
  | 'SRH'
  | 'RR'
  | 'DC'
  | 'PBKS'
  | 'GT'
  | 'LSG';

export type BotStrategy = 'BALANCED' | 'AGGRESSIVE' | 'MONEYBALL' | 'STAR_HUNTER';

export interface FranchiseMeta {
  code: TeamCode;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
}

export const IPL_FRANCHISES: FranchiseMeta[] = [
  {
    code: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'Chennai',
    city: 'Chennai',
    primaryColor: '#FACC15',
    secondaryColor: '#1D4ED8',
    tagline: 'Whistle Podu',
  },
  {
    code: 'MI',
    name: 'Mumbai Indians',
    shortName: 'Mumbai',
    city: 'Mumbai',
    primaryColor: '#0284C7',
    secondaryColor: '#F59E0B',
    tagline: 'Duniya Hila Denge',
  },
  {
    code: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'Bengaluru',
    city: 'Bengaluru',
    primaryColor: '#DC2626',
    secondaryColor: '#D97706',
    tagline: 'Play Bold',
  },
  {
    code: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'Kolkata',
    city: 'Kolkata',
    primaryColor: '#9333EA',
    secondaryColor: '#EAB308',
    tagline: 'Korbo Lorbo Jeetbo',
  },
  {
    code: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'Hyderabad',
    city: 'Hyderabad',
    primaryColor: '#F97316',
    secondaryColor: '#FBBF24',
    tagline: 'Play With Fire',
  },
  {
    code: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'Rajasthan',
    city: 'Jaipur',
    primaryColor: '#EC4899',
    secondaryColor: '#2563EB',
    tagline: 'Halla Bol',
  },
  {
    code: 'DC',
    name: 'Delhi Capitals',
    shortName: 'Delhi',
    city: 'New Delhi',
    primaryColor: '#2563EB',
    secondaryColor: '#EF4444',
    tagline: 'Roar Macha',
  },
  {
    code: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'Punjab',
    city: 'Mullanpur',
    primaryColor: '#E11D48',
    secondaryColor: '#CBD5E1',
    tagline: 'Sadda Punjab',
  },
  {
    code: 'GT',
    name: 'Gujarat Titans',
    shortName: 'Gujarat',
    city: 'Ahmedabad',
    primaryColor: '#38BDF8',
    secondaryColor: '#CA8A04',
    tagline: 'Aava De',
  },
  {
    code: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'Lucknow',
    city: 'Lucknow',
    primaryColor: '#06B6D4',
    secondaryColor: '#F97316',
    tagline: 'Gazab Andaz',
  },
];

export const VALID_TEAM_CODES = new Set<string>(IPL_FRANCHISES.map((f) => f.code));

export const AUCTION_CONSTANTS = {
  DEFAULT_PURSE_LAKHS: 12000, // ₹120.00 Cr = 12,000 Lakhs
  MAX_SQUAD_SIZE: 25,
  MIN_SQUAD_SIZE: 18,
  MAX_OVERSEAS: 8,
  MAX_PLAYING_XI_OVERSEAS: 4,
  MIN_BASE_PRICE_LAKHS: 30, // ₹30 Lakhs
  DEFAULT_TIMER_SECONDS: 15,
};

/**
 * Official IPL Mega Auction Bid Slab Increment Rules:
 * - Below ₹1.00 Cr (< 100L): +5 Lakhs
 * - ₹1.00 Cr to < ₹2.00 Cr (100L - 199L): +10 Lakhs
 * - ₹2.00 Cr to < ₹5.00 Cr (200L - 499L): +20 Lakhs
 * - ₹5.00 Cr and above (>= 500L): +25 Lakhs
 */
export function getNextMinimumBidLakhs(
  basePriceLakhs: number,
  currentBidLakhs: number | null,
  currentBidderTeam: string | null
): number {
  if (!currentBidderTeam || currentBidLakhs === null) {
    return basePriceLakhs;
  }
  if (currentBidLakhs < 100) {
    return currentBidLakhs + 5;
  }
  if (currentBidLakhs < 200) {
    return currentBidLakhs + 10;
  }
  if (currentBidLakhs < 500) {
    return currentBidLakhs + 20;
  }
  return currentBidLakhs + 25;
}

export function formatCurrencyLakhs(lakhs: number): string {
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    return `₹${crores.toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  password_hash: string | null;
  display_name: string;
  is_guest: number;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  avatarColor: string;
}

export interface PlayerRecord {
  id: number;
  name: string;
  country: string;
  is_overseas: number;
  is_capped: number;
  role: PlayerRole;
  batting_style: string;
  bowling_style: string;
  speciality: string;
  base_price_lakhs: number;
  auction_set: string;
  set_order: number;
  overall_rating: number;
  batting_rating: number;
  bowling_rating: number;
  fielding_rating: number;
  powerplay_rating: number;
  death_rating: number;
  ipl_matches: number;
  ipl_runs: number;
  ipl_strike_rate: number;
  ipl_wickets: number;
  ipl_economy: number;
  previous_team: string;
  marquee: number;
}

export interface PlayerDTO {
  id: number;
  name: string;
  country: string;
  isOverseas: boolean;
  isCapped: boolean;
  role: PlayerRole;
  battingStyle: string;
  bowlingStyle: string;
  speciality: string;
  basePriceLakhs: number;
  auctionSet: string;
  setOrder: number;
  overallRating: number;
  battingRating: number;
  bowlingRating: number;
  fieldingRating: number;
  powerplayRating: number;
  deathRating: number;
  iplMatches: number;
  iplRuns: number;
  iplStrikeRate: number;
  iplWickets: number;
  iplEconomy: number;
  previousTeam: string;
  marquee: boolean;
}

export function mapPlayerToDTO(row: PlayerRecord): PlayerDTO {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    isOverseas: Boolean(row.is_overseas),
    isCapped: Boolean(row.is_capped),
    role: row.role,
    battingStyle: row.batting_style,
    bowlingStyle: row.bowling_style,
    speciality: row.speciality,
    basePriceLakhs: row.base_price_lakhs,
    auctionSet: row.auction_set,
    setOrder: row.set_order,
    overallRating: row.overall_rating,
    battingRating: row.batting_rating,
    bowlingRating: row.bowling_rating,
    fieldingRating: row.fielding_rating,
    powerplayRating: row.powerplay_rating,
    deathRating: row.death_rating,
    iplMatches: row.ipl_matches,
    iplRuns: row.ipl_runs,
    iplStrikeRate: row.ipl_strike_rate,
    iplWickets: row.ipl_wickets,
    iplEconomy: row.ipl_economy,
    previousTeam: row.previous_team,
    marquee: Boolean(row.marquee),
  };
}

export const BCCI_RETENTION_SLABS_LAKHS = [1800, 1400, 1100, 1800, 1400]; // 18Cr, 14Cr, 11Cr, 18Cr, 14Cr
export const BCCI_UNCAPPED_RETENTION_LAKHS = 400; // 4Cr
export const BCCI_MAX_RETENTIONS = 5;
export const BCCI_MAX_UNCAPPED_RETENTIONS = 2;
export const BCCI_MAX_RTM_AND_RETENTIONS = 6;

export interface RTMPromptState {
  lotId: string;
  lotNumber: number;
  player: PlayerDTO;
  originalTeam: TeamCode;
  highestBidderTeam: TeamCode;
  currentBidLakhs: number;
  stage: 'DECISION_ORIGINAL' | 'FINAL_RAISE_WINNER' | 'FINAL_MATCH_ORIGINAL';
  finalRaisedBidLakhs?: number;
  timerEndsAt: number;
}

export interface TradeDTO {
  id: string;
  roomId: string;
  proposerTeam: TeamCode;
  receiverTeam: TeamCode;
  offeredPlayerIds: number[];
  offeredPlayers: PlayerDTO[];
  requestedPlayerIds: number[];
  requestedPlayers: PlayerDTO[];
  purseTransferLakhs: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

