import { PlayerRecord } from '../types/domain.js';
import { CAPPED_PLAYERS, CompactPlayerTuple } from './iplPlayersCapped.js';
import { UNCAPPED_AND_EXTENDED_PLAYERS } from './iplPlayersUncapped.js';

/**
 * Official IPL Mega Auction Set Progression Order:
 * Marquee Sets first, then alternating Capped & Uncapped role sets so teams
 * can draft balanced squads across Batters, All-Rounders, Wicketkeepers,
 * Fast Bowlers, and Spinners throughout the auction.
 */
export const AUCTION_SET_SEQUENCE: string[] = [
  'M1',
  'M2',
  // Cycle 1: Capped Core
  'BA1',
  'AL1',
  'WK1',
  'FA1',
  'SP1',
  // Cycle 1: Uncapped Core Stars
  'UBA1',
  'UAL1',
  'UWK1',
  'UFA1',
  'USP1',
  // Cycle 2: Capped Depth
  'BA2',
  'AL2',
  'WK2',
  'FA2',
  'SP2',
  // Cycle 2: Uncapped Depth
  'UBA2',
  'UAL2',
  'UWK2',
  'UFA2',
  'USP2',
  // Cycle 3
  'BA3',
  'AL3',
  'WK3',
  'FA3',
  'SP3',
  'UBA3',
  'UAL3',
  'UWK3',
  'UFA3',
  'USP3',
  // Cycle 4+ Accelerated Pool
  'BA4',
  'AL4',
  'WK4',
  'FA4',
  'SP4',
  'UBA4',
  'UAL4',
  'UFA4',
  'BA5',
  'AL5',
  'FA5',
  'UBA5',
  'UAL5',
  'AL6',
  'FA6',
];

export const AUCTION_SET_LABELS: Record<string, string> = {
  M1: 'Marquee Set 1',
  M2: 'Marquee Set 2',
  BA1: 'Capped Batters 1',
  BA2: 'Capped Batters 2',
  BA3: 'Capped Batters 3',
  BA4: 'Capped Batters 4',
  BA5: 'Capped Batters 5',
  AL1: 'Capped All-Rounders 1',
  AL2: 'Capped All-Rounders 2',
  AL3: 'Capped All-Rounders 3',
  AL4: 'Capped All-Rounders 4',
  AL5: 'Capped All-Rounders 5',
  AL6: 'Capped All-Rounders 6',
  WK1: 'Capped Wicketkeepers 1',
  WK2: 'Capped Wicketkeepers 2',
  WK3: 'Capped Wicketkeepers 3',
  WK4: 'Capped Wicketkeepers 4',
  FA1: 'Capped Fast Bowlers 1',
  FA2: 'Capped Fast Bowlers 2',
  FA3: 'Capped Fast Bowlers 3',
  FA4: 'Capped Fast Bowlers 4',
  FA5: 'Capped Fast Bowlers 5',
  FA6: 'Capped Fast Bowlers 6',
  SP1: 'Capped Spinners 1',
  SP2: 'Capped Spinners 2',
  SP3: 'Capped Spinners 3',
  SP4: 'Capped Spinners 4',
  UBA1: 'Uncapped Batters 1',
  UBA2: 'Uncapped Batters 2',
  UBA3: 'Uncapped Batters 3',
  UBA4: 'Uncapped Batters 4',
  UBA5: 'Uncapped Batters 5',
  UAL1: 'Uncapped All-Rounders 1',
  UAL2: 'Uncapped All-Rounders 2',
  UAL3: 'Uncapped All-Rounders 3',
  UAL4: 'Uncapped All-Rounders 4',
  UAL5: 'Uncapped All-Rounders 5',
  UWK1: 'Uncapped Wicketkeepers 1',
  UWK2: 'Uncapped Wicketkeepers 2',
  UWK3: 'Uncapped Wicketkeepers 3',
  UFA1: 'Uncapped Fast Bowlers 1',
  UFA2: 'Uncapped Fast Bowlers 2',
  UFA3: 'Uncapped Fast Bowlers 3',
  UFA4: 'Uncapped Fast Bowlers 4',
  USP1: 'Uncapped Spinners 1',
  USP2: 'Uncapped Spinners 2',
  USP3: 'Uncapped Spinners 3',
};

function deterministicHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildPlayerRecord(tuple: CompactPlayerTuple, id: number): PlayerRecord {
  const [
    name,
    country,
    isCapped,
    role,
    batStyle,
    bowlStyle,
    speciality,
    basePriceLakhs,
    auctionSet,
    overall,
    batRating,
    bowlRating,
    ppRating,
    deathRating,
    prevTeam,
  ] = tuple;

  const h = deterministicHash(name);
  const isOverseas = country === 'India' ? 0 : 1;
  const setIdx = AUCTION_SET_SEQUENCE.indexOf(auctionSet);
  const setOrder = setIdx >= 0 ? setIdx + 1 : 99;
  const marquee = auctionSet === 'M1' || auctionSet === 'M2' ? 1 : 0;

  const fieldingRating = Math.min(
    96,
    Math.max(72, Math.round(overall * 0.92 + (h % 9) - 3))
  );

  // Realistic career IPL / T20 stats derived from ratings & capped experience
  const baseMatches = isCapped
    ? Math.max(18, Math.round((overall - 68) * 5.2 + (h % 45)))
    : Math.max(6, Math.round((overall - 68) * 2.1 + (h % 18)));

  let iplRuns = 0;
  let iplStrikeRate = 118.0;
  if (role === 'BAT' || role === 'WK') {
    iplRuns = Math.round(baseMatches * (19 + (batRating - 70) * 0.65));
    iplStrikeRate = Number((126 + (batRating - 72) * 1.15 + ((h % 14) - 6) * 0.6).toFixed(1));
  } else if (role === 'AR') {
    iplRuns = Math.round(baseMatches * (13 + Math.max(0, batRating - 65) * 0.48));
    iplStrikeRate = Number((128 + Math.max(0, batRating - 70) * 1.2 + ((h % 12) - 5) * 0.5).toFixed(1));
  } else {
    iplRuns = Math.round(baseMatches * (2.2 + Math.max(0, batRating - 20) * 0.14));
    iplStrikeRate = Number((105 + (h % 25)).toFixed(1));
  }

  let iplWickets = 0;
  let iplEconomy = 0;
  if (role === 'BOWL') {
    iplWickets = Math.round(baseMatches * (0.95 + (bowlRating - 74) * 0.022));
    iplEconomy = Number(
      Math.max(6.45, Math.min(9.65, 9.45 - (bowlRating - 74) * 0.095 + ((h % 9) - 4) * 0.05)).toFixed(2)
    );
  } else if (role === 'AR' && bowlStyle !== 'None') {
    iplWickets = Math.round(baseMatches * (0.55 + Math.max(0, bowlRating - 65) * 0.018));
    iplEconomy = Number(
      Math.max(6.85, Math.min(9.85, 9.55 - Math.max(0, bowlRating - 68) * 0.08 + ((h % 7) - 3) * 0.05)).toFixed(2)
    );
  }

  return {
    id,
    name: name.trim(),
    country,
    is_overseas: isOverseas,
    is_capped: isCapped,
    role,
    batting_style: batStyle,
    bowling_style: bowlStyle,
    speciality,
    base_price_lakhs: basePriceLakhs,
    auction_set: auctionSet,
    set_order: setOrder,
    overall_rating: overall,
    batting_rating: batRating,
    bowling_rating: bowlRating,
    fielding_rating: fieldingRating,
    powerplay_rating: ppRating,
    death_rating: deathRating,
    ipl_matches: baseMatches,
    ipl_runs: iplRuns,
    ipl_strike_rate: iplStrikeRate,
    ipl_wickets: iplWickets,
    ipl_economy: iplEconomy,
    previous_team: prevTeam,
    marquee,
  };
}

export function getFullPlayerCatalog(): PlayerRecord[] {
  const combined: CompactPlayerTuple[] = [
    ...CAPPED_PLAYERS,
    ...UNCAPPED_AND_EXTENDED_PLAYERS,
  ];
  const seen = new Set<string>();
  const uniqueTuples: CompactPlayerTuple[] = [];

  for (const item of combined) {
    const key = item[0].trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTuples.push(item);
    }
  }

  // Sort by official set sequence, then by overall rating descending within set
  uniqueTuples.sort((a, b) => {
    const orderA = AUCTION_SET_SEQUENCE.indexOf(a[8]);
    const orderB = AUCTION_SET_SEQUENCE.indexOf(b[8]);
    const normA = orderA === -1 ? 999 : orderA;
    const normB = orderB === -1 ? 999 : orderB;
    if (normA !== normB) return normA - normB;
    return b[9] - a[9];
  });

  return uniqueTuples.map((tuple, idx) => buildPlayerRecord(tuple, idx + 1));
}
