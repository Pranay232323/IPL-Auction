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

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  avatarColor: string;
}

export interface FranchiseMeta {
  code: TeamCode;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
}

export const FRANCHISES: FranchiseMeta[] = [
  { code: 'CSK', name: 'Chennai Super Kings', shortName: 'Chennai', city: 'Chennai', primaryColor: '#FACC15', secondaryColor: '#1D4ED8', tagline: 'Whistle Podu' },
  { code: 'MI', name: 'Mumbai Indians', shortName: 'Mumbai', city: 'Mumbai', primaryColor: '#0284C7', secondaryColor: '#F59E0B', tagline: 'Duniya Hila Denge' },
  { code: 'RCB', name: 'Royal Challengers Bengaluru', shortName: 'Bengaluru', city: 'Bengaluru', primaryColor: '#DC2626', secondaryColor: '#D97706', tagline: 'Play Bold' },
  { code: 'KKR', name: 'Kolkata Knight Riders', shortName: 'Kolkata', city: 'Kolkata', primaryColor: '#9333EA', secondaryColor: '#EAB308', tagline: 'Korbo Lorbo Jeetbo' },
  { code: 'SRH', name: 'Sunrisers Hyderabad', shortName: 'Hyderabad', city: 'Hyderabad', primaryColor: '#F97316', secondaryColor: '#FBBF24', tagline: 'Play With Fire' },
  { code: 'RR', name: 'Rajasthan Royals', shortName: 'Rajasthan', city: 'Jaipur', primaryColor: '#EC4899', secondaryColor: '#2563EB', tagline: 'Halla Bol' },
  { code: 'DC', name: 'Delhi Capitals', shortName: 'Delhi', city: 'New Delhi', primaryColor: '#2563EB', secondaryColor: '#EF4444', tagline: 'Roar Macha' },
  { code: 'PBKS', name: 'Punjab Kings', shortName: 'Punjab', city: 'Mullanpur', primaryColor: '#E11D48', secondaryColor: '#CBD5E1', tagline: 'Sadda Punjab' },
  { code: 'GT', name: 'Gujarat Titans', shortName: 'Gujarat', city: 'Ahmedabad', primaryColor: '#38BDF8', secondaryColor: '#CA8A04', tagline: 'Aava De' },
  { code: 'LSG', name: 'Lucknow Super Giants', shortName: 'Lucknow', city: 'Lucknow', primaryColor: '#06B6D4', secondaryColor: '#F97316', tagline: 'Gazab Andaz' },
];

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

export interface RoomTeamState {
  teamCode: TeamCode;
  teamName: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  userId: string | null;
  ownerName: string | null;
  isBot: boolean;
  botStrategy: string | null;
  purseRemainingLakhs: number;
  squadCount: number;
  overseasCount: number;
  rtmCardsRemaining: number;
  retentionsCount: number;
  isReady: boolean;
  isConnected: boolean;
  roleBreakdown: {
    WK: number;
    BAT: number;
    AR: number;
    BOWL: number;
  };
}

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

export interface ActiveLotState {
  lotId: string;
  lotNumber: number;
  totalLots: number;
  setName: string;
  setLabel: string;
  status: LotStatus;
  basePriceLakhs: number;
  currentBidLakhs: number | null;
  currentBidderTeam: TeamCode | null;
  nextMinBidLakhs: number;
  soldToTeam: TeamCode | null;
  soldPriceLakhs: number | null;
  isRetention?: boolean;
  isRtmBuy?: boolean;
  player: PlayerDTO;
}

export interface RetentionCandidateDTO extends PlayerDTO {
  isRetained: boolean;
  retentionCostLakhs?: number;
}

export interface BidEntryDTO {
  id: string;
  lotId: string;
  playerId: number;
  playerName: string;
  teamCode: TeamCode;
  amountLakhs: number;
  createdAt: string;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  userId: string | null;
  senderName: string;
  teamCode: TeamCode | null;
  messageType: 'USER' | 'SYSTEM' | 'REACTION';
  content: string;
  createdAt: string;
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

export interface RoomSnapshot {
  id: string;
  code: string;
  name: string;
  hostUserId: string;
  status: RoomStatus;
  visibility: RoomVisibility;
  initialPurseLakhs: number;
  maxSquadSize: number;
  minSquadSize: number;
  maxOverseas: number;
  timerSeconds: number;
  auctionRound: number;
  acceleratedMode: boolean;
  tradeWindowActive: boolean;
  tradeWindowEndsAt: number | null;
  serverNow: number;
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  passedTeams: TeamCode[];
  counts: {
    totalLots: number;
    upcoming: number;
    sold: number;
    unsold: number;
  };
  teams: RoomTeamState[];
  currentLot: ActiveLotState | null;
  rtmPrompt: RTMPromptState | null;
  recentBids: BidEntryDTO[];
  recentChat: ChatMessageDTO[];
  activeTrades?: TradeDTO[];
}

export interface RoomLotItem {
  lotId: string;
  lotNumber: number;
  setName: string;
  setLabel: string;
  status: LotStatus;
  basePriceLakhs: number;
  currentBidLakhs: number | null;
  currentBidderTeam: TeamCode | null;
  soldToTeam: TeamCode | null;
  soldPriceLakhs: number | null;
  isRetention?: boolean;
  isRtmBuy?: boolean;
  player: PlayerDTO;
}

export interface PublicRoomSummary {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  timerSeconds: number;
  humanCount: number;
  botCount: number;
  soldCount: number;
  totalPlayers: number;
  createdAt: string;
}

export interface SquadBoughtPlayer extends PlayerDTO {
  soldPriceLakhs: number;
}

export interface TeamAnalysisRank {
  rank: number;
  teamCode: TeamCode;
  teamName: string;
  primaryColor: string;
  secondaryColor: string;
  ownerName: string;
  isBot: boolean;
  overallScore: number;
  grade: 'S+' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  winProbabilityPct: number;
  playoffQualification: boolean;
  squadSize: number;
  overseasCount: number;
  purseSpentLakhs: number;
  purseRemainingLakhs: number;
  roleCounts: {
    WK: number;
    BAT: number;
    AR: number;
    BOWL: number;
  };
  cappedCount: number;
  uncappedCount: number;
  categories: {
    batting: number;
    paceBowling: number;
    spinAttack: number;
    allRoundBalance: number;
    deathAndFinishing: number;
    squadDepth: number;
    valueEfficiency: number;
  };
  bestPlayingXI: SquadBoughtPlayer[];
  impactPlayer: SquadBoughtPlayer | null;
  mvpPlayer: SquadBoughtPlayer | null;
  mostExpensiveBuy: SquadBoughtPlayer | null;
  bestValueSteal: SquadBoughtPlayer | null;
  strengths: string[];
  weaknesses: string[];
  punditVerdict: string;
}

export interface RoomAnalysisReport {
  roomId: string;
  generatedAt: string;
  predictedChampion: {
    teamCode: TeamCode;
    teamName: string;
    ownerName: string;
    overallScore: number;
    grade: string;
    winProbabilityPct: number;
  } | null;
  playoffTeams: TeamCode[];
  auctionHighlights: {
    totalPlayersSold: number;
    totalPlayersUnsold: number;
    totalSpentLakhs: number;
    mostExpensiveOverall: {
      playerName: string;
      teamCode: TeamCode;
      priceLakhs: number;
      role: string;
    } | null;
    biggestValueOverall: {
      playerName: string;
      teamCode: TeamCode;
      priceLakhs: number;
      overallRating: number;
    } | null;
    aiCommentarySource: 'deterministic-cricket-engine' | 'hybrid-llm-enhanced';
    headlineSummary: string;
  };
  rankings: TeamAnalysisRank[];
}

export interface VoiceConfigResponse {
  provider: 'livekit' | 'webrtc-mesh';
  livekitConfigured: boolean;
  livekitUrl: string | null;
  iceServers: RTCIceServer[];
  setupHint: string | null;
}

export interface VoicePeerMeta {
  socketId: string;
  userId: string;
  displayName: string;
  teamCode: TeamCode | null;
  muted: boolean;
}
