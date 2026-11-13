import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { getDb } from '../db/connection.js';
import {
  formatCurrencyLakhs,
  IPL_FRANCHISES,
  mapPlayerToDTO,
  PlayerDTO,
  PlayerRecord,
  TeamCode,
} from '../types/domain.js';

export interface SquadBoughtPlayer extends PlayerDTO {
  soldPriceLakhs: number;
}

export interface CategoryBreakdown {
  batting: number;
  paceBowling: number;
  spinAttack: number;
  allRoundBalance: number;
  deathAndFinishing: number;
  squadDepth: number;
  valueEfficiency: number;
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
  categories: CategoryBreakdown;
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

function isSpinBowler(p: PlayerDTO): boolean {
  const s = p.bowlingStyle.toLowerCase();
  return (
    s.includes('spin') ||
    s.includes('legbreak') ||
    s.includes('offbreak') ||
    s.includes('orthodox')
  );
}

function isPaceBowler(p: PlayerDTO): boolean {
  const s = p.bowlingStyle.toLowerCase();
  return s.includes('fast') || s.includes('medium');
}

function canBowlRegularly(p: PlayerDTO): boolean {
  return p.role === 'BOWL' || (p.role === 'AR' && p.bowlingRating >= 62);
}

/**
 * Estimate fair IPL auction value in Lakhs based on overall rating, marquee status & Indian scarcity
 */
export function estimateFairValueLakhs(p: PlayerDTO): number {
  let val = 30;
  if (p.overallRating >= 95) val = 1850;
  else if (p.overallRating >= 92) val = 1450;
  else if (p.overallRating >= 89) val = 1050;
  else if (p.overallRating >= 86) val = 725;
  else if (p.overallRating >= 83) val = 450;
  else if (p.overallRating >= 80) val = 240;
  else if (p.overallRating >= 77) val = 110;
  else val = 45;

  // Indian capped stars command a 20% scarcity premium in IPL auctions
  if (!p.isOverseas && p.isCapped) {
    val = Math.round(val * 1.2);
  }
  if (p.role === 'AR' || p.role === 'WK') {
    val = Math.round(val * 1.08);
  }
  return Math.max(p.basePriceLakhs, val);
}

function evaluateLineupScore(xi: SquadBoughtPlayer[]): number {
  if (xi.length === 0) return 0;
  let score = xi.reduce((acc, p) => acc + p.overallRating, 0);

  const wks = xi.filter((p) => p.role === 'WK').length;
  const bowlers = xi.filter(canBowlRegularly).length;
  const spinners = xi.filter((p) => canBowlRegularly(p) && isSpinBowler(p)).length;
  const pacers = xi.filter((p) => canBowlRegularly(p) && isPaceBowler(p)).length;

  if (wks >= 1) score += 28;
  else score -= 45;

  if (bowlers >= 5) score += 30;
  else score -= (5 - bowlers) * 18;

  if (bowlers >= 6) score += 10;
  if (spinners >= 1) score += 12;
  if (pacers >= 2) score += 15;

  return score;
}

function solveBestPlayingXI(squad: SquadBoughtPlayer[]): {
  xi: SquadBoughtPlayer[];
  impact: SquadBoughtPlayer | null;
} {
  if (squad.length === 0) {
    return { xi: [], impact: null };
  }

  const sorted = [...squad].sort((a, b) => {
    // Slight preference to Indian players at identical rating to preserve 4 overseas slots
    const diff = b.overallRating - a.overallRating;
    if (diff !== 0) return diff;
    return Number(a.isOverseas) - Number(b.isOverseas);
  });

  const targetCount = Math.min(11, sorted.length);
  const selectedIds = new Set<number>();
  const xi: SquadBoughtPlayer[] = [];
  let overseasUsed = 0;

  const tryAdd = (p: SquadBoughtPlayer): boolean => {
    if (selectedIds.has(p.id)) return false;
    if (p.isOverseas && overseasUsed >= 4) return false;
    selectedIds.add(p.id);
    xi.push(p);
    if (p.isOverseas) overseasUsed++;
    return true;
  };

  // Step 1: Secure best Wicketkeeper
  const wks = sorted.filter((p) => p.role === 'WK');
  if (wks.length > 0) {
    tryAdd(wks[0]);
  }

  // Step 2: Secure core bowling attack (up to 4 top bowlers/bowling ARs first)
  const bowlers = sorted.filter(canBowlRegularly);
  for (const b of bowlers) {
    if (xi.filter(canBowlRegularly).length >= Math.min(4, targetCount - 1)) break;
    tryAdd(b);
  }

  // Step 3: Fill remaining slots up to targetCount with highest overall rated eligible players
  for (const p of sorted) {
    if (xi.length >= targetCount) break;
    tryAdd(p);
  }

  // If still short (e.g. only overseas left and 4 overseas cap reached), leave XI legal at <=4 overseas
  // Step 4: 1-for-1 Swap Hill-Climbing optimization
  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard++;
    const bench = sorted.filter((p) => !selectedIds.has(p.id));
    const currentVal = evaluateLineupScore(xi);

    for (let i = 0; i < xi.length; i++) {
      for (const candidate of bench) {
        const nextOverseas =
          overseasUsed - (xi[i].isOverseas ? 1 : 0) + (candidate.isOverseas ? 1 : 0);
        if (nextOverseas > 4) continue;

        const trial = [...xi];
        trial[i] = candidate;
        if (evaluateLineupScore(trial) > currentVal + 0.5) {
          selectedIds.delete(xi[i].id);
          selectedIds.add(candidate.id);
          xi[i] = candidate;
          overseasUsed = nextOverseas;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // Order Playing XI into authentic batting lineup (#1-#11)
  xi.sort((a, b) => {
    const roleWeight = (p: SquadBoughtPlayer): number => {
      if (p.role === 'BAT' || p.role === 'WK') {
        return p.powerplayRating >= p.deathRating ? 1 : 2;
      }
      if (p.role === 'AR') return 3;
      return 4;
    };
    const rwDiff = roleWeight(a) - roleWeight(b);
    if (rwDiff !== 0) return rwDiff;
    return b.battingRating - a.battingRating;
  });

  // Select #12 Impact Player
  const remainingBench = sorted.filter((p) => !selectedIds.has(p.id));
  let impact: SquadBoughtPlayer | null = null;
  for (const b of remainingBench) {
    if (b.isOverseas && overseasUsed >= 4) continue;
    impact = b;
    break;
  }

  return { xi, impact };
}

function clampScore(n: number): number {
  return Math.max(15, Math.min(99, Math.round(n)));
}

function computeGrade(score: number): 'S+' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S+';
  if (score >= 85) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 68) return 'B';
  if (score >= 58) return 'C';
  return 'D';
}

export async function generateRoomAnalysis(
  roomId: string,
  forceRefresh = false
): Promise<RoomAnalysisReport> {
  const db = getDb();

  if (!forceRefresh) {
    const cached = db
      .prepare('SELECT rankings_json, summary_json, generated_at FROM analysis_reports WHERE room_id = ?')
      .get(roomId) as
      | { rankings_json: string; summary_json: string; generated_at: string }
      | undefined;

    if (cached) {
      const rankings = JSON.parse(cached.rankings_json) as TeamAnalysisRank[];
      const summary = JSON.parse(cached.summary_json);
      return {
        roomId,
        generatedAt: cached.generated_at,
        ...summary,
        rankings,
      };
    }
  }

  const room = db
    .prepare('SELECT * FROM rooms WHERE id = ?')
    .get(roomId) as
    | {
        id: string;
        initial_purse_lakhs: number;
        min_squad_size: number;
        max_squad_size: number;
      }
    | undefined;

  if (!room) {
    throw new Error('Room not found');
  }

  const teamRows = db
    .prepare('SELECT * FROM room_teams WHERE room_id = ? ORDER BY team_code ASC')
    .all(roomId) as {
    team_code: TeamCode;
    user_id: string | null;
    owner_name: string | null;
    is_bot: number;
    purse_remaining_lakhs: number;
    squad_count: number;
    overseas_count: number;
  }[];

  const soldRows = db
    .prepare(
      `SELECT l.sold_to_team, l.sold_price_lakhs, p.*
       FROM auction_lots l
       JOIN players p ON p.id = l.player_id
       WHERE l.room_id = ? AND l.status = 'SOLD'
       ORDER BY l.sold_price_lakhs DESC`
    )
    .all(roomId) as (PlayerRecord & { sold_to_team: TeamCode; sold_price_lakhs: number })[];

  const unsoldCountRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM auction_lots WHERE room_id = ? AND status = 'UNSOLD'`)
    .get(roomId) as { cnt: number };

  const byTeam = new Map<TeamCode, SquadBoughtPlayer[]>();
  for (const row of soldRows) {
    const dto: SquadBoughtPlayer = {
      ...mapPlayerToDTO(row),
      soldPriceLakhs: row.sold_price_lakhs,
    };
    const arr = byTeam.get(row.sold_to_team) || [];
    arr.push(dto);
    byTeam.set(row.sold_to_team, arr);
  }

  // Participating franchises: claimed by human/bot OR acquired >=1 player
  const activeTeamRows = teamRows.filter(
    (t) => t.user_id !== null || t.is_bot === 1 || (byTeam.get(t.team_code)?.length || 0) > 0
  );
  const teamsToEvaluate = activeTeamRows.length > 0 ? activeTeamRows : teamRows;

  const maxSquadInRoom = Math.max(
    1,
    ...teamsToEvaluate.map((t) => byTeam.get(t.team_code)?.length || 0)
  );
  const fullMegaScale = maxSquadInRoom >= 15;

  const rawEvaluations: Omit<TeamAnalysisRank, 'rank' | 'winProbabilityPct' | 'playoffQualification'>[] =
    teamsToEvaluate.map((tRow) => {
      const meta = IPL_FRANCHISES.find((f) => f.code === tRow.team_code)!;
      const squad = byTeam.get(tRow.team_code) || [];
      const { xi, impact } = solveBestPlayingXI(squad);

      const roleCounts = {
        WK: squad.filter((p) => p.role === 'WK').length,
        BAT: squad.filter((p) => p.role === 'BAT').length,
        AR: squad.filter((p) => p.role === 'AR').length,
        BOWL: squad.filter((p) => p.role === 'BOWL').length,
      };

      const cappedCount = squad.filter((p) => p.isCapped).length;
      const uncappedCount = squad.length - cappedCount;
      const purseSpentLakhs = room.initial_purse_lakhs - tRow.purse_remaining_lakhs;

      // 1. Batting Firepower
      const topBatters = [...xi]
        .sort((a, b) => b.battingRating - a.battingRating)
        .slice(0, 6);
      const avgBat =
        topBatters.length > 0
          ? topBatters.reduce((s, p) => s + p.battingRating * 0.7 + p.powerplayRating * 0.3, 0) /
            Math.max(5, topBatters.length)
          : 25;
      const hasLeftHandTop = topBatters.some((p) => p.battingStyle === 'LHB');
      const batting = clampScore(avgBat + (hasLeftHandTop ? 4 : 0));

      // 2. Pace Bowling
      const paceUnit = xi
        .filter((p) => canBowlRegularly(p) && isPaceBowler(p))
        .sort((a, b) => b.bowlingRating - a.bowlingRating)
        .slice(0, 3);
      const paceBowling = clampScore(
        paceUnit.length > 0
          ? (paceUnit.reduce(
              (s, p) => s + p.bowlingRating * 0.65 + p.powerplayRating * 0.35,
              0
            ) /
              Math.max(2, paceUnit.length)) *
              (paceUnit.length >= 2 ? 1.02 : 0.8)
          : 30
      );

      // 3. Spin Attack
      const spinUnit = xi
        .filter((p) => canBowlRegularly(p) && isSpinBowler(p))
        .sort((a, b) => b.bowlingRating - a.bowlingRating)
        .slice(0, 2);
      const spinAttack = clampScore(
        spinUnit.length > 0
          ? (spinUnit.reduce((s, p) => s + p.bowlingRating, 0) / spinUnit.length) *
              (spinUnit.length >= 2 ? 1.03 : 0.92)
          : 32
      );

      // 4. All-Round & Tactical Balance
      const allRounders = xi.filter((p) => p.role === 'AR');
      const totalBowlingOptions = xi.filter(canBowlRegularly).length;
      const hasWK = xi.some((p) => p.role === 'WK');
      const allRoundBalance = clampScore(
        52 +
          Math.min(3, allRounders.length) * 9 +
          Math.min(6, totalBowlingOptions) * 4 +
          (hasWK ? 8 : -20)
      );

      // 5. Death & Finishing
      const finishers = [...xi].sort((a, b) => b.deathRating - a.deathRating).slice(0, 4);
      const deathAndFinishing = clampScore(
        finishers.length > 0
          ? finishers.reduce((s, p) => s + p.deathRating, 0) / finishers.length
          : 30
      );

      // 6. Squad Depth & Compliance
      let squadDepthRaw = 50;
      if (fullMegaScale) {
        if (squad.length >= room.min_squad_size) {
          squadDepthRaw = 80 + Math.min(18, (squad.length - room.min_squad_size) * 2.5);
        } else {
          squadDepthRaw = Math.max(25, 75 - (room.min_squad_size - squad.length) * 6);
        }
      } else {
        const ratio = squad.length / Math.max(1, maxSquadInRoom);
        squadDepthRaw = 55 + ratio * 35;
      }
      if (roleCounts.WK >= 2) squadDepthRaw += 4;
      if (roleCounts.WK === 0) squadDepthRaw -= 18;
      if (impact) squadDepthRaw += 4;
      const squadDepth = clampScore(squadDepthRaw);

      // 7. Value Efficiency
      let totalFairVal = 0;
      let bestSteal: SquadBoughtPlayer | null = null;
      let bestSurplus = -Infinity;

      for (const p of squad) {
        const fair = estimateFairValueLakhs(p);
        totalFairVal += fair;
        const surplus = fair - p.soldPriceLakhs;
        if (surplus > bestSurplus) {
          bestSurplus = surplus;
          bestSteal = p;
        }
      }

      const roiRatio = purseSpentLakhs > 0 ? totalFairVal / purseSpentLakhs : 0.6;
      const valueEfficiency = clampScore(65 + (roiRatio - 1) * 28);

      // Weighted Overall Score
      let overallRaw =
        batting * 0.22 +
        paceBowling * 0.17 +
        spinAttack * 0.14 +
        allRoundBalance * 0.16 +
        deathAndFinishing * 0.13 +
        squadDepth * 0.1 +
        valueEfficiency * 0.08;

      if (squad.length === 0) {
        overallRaw = 15;
      } else if (!hasWK) {
        overallRaw -= 8;
      }
      if (fullMegaScale && squad.length < room.min_squad_size) {
        overallRaw -= Math.min(18, (room.min_squad_size - squad.length) * 2.5);
      }

      const overallScore = Number(Math.max(15, Math.min(98.5, overallRaw)).toFixed(1));
      const grade = computeGrade(overallScore);

      const mvpPlayer =
        squad.length > 0
          ? [...squad].sort((a, b) => b.overallRating - a.overallRating)[0]
          : null;
      const mostExpensiveBuy =
        squad.length > 0
          ? [...squad].sort((a, b) => b.soldPriceLakhs - a.soldPriceLakhs)[0]
          : null;

      // Strengths & Weaknesses
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (batting >= 86) strengths.push('Explosive Top & Middle-Order Batting Powerhouse');
      if (paceBowling >= 85) strengths.push('Lethal New-Ball & Express Pace Battery');
      if (spinAttack >= 85) strengths.push('Match-Winning Subcontinent Spin Choke');
      if (allRounders.length >= 2 && allRoundBalance >= 84)
        strengths.push('Deep Multi-Dimensional All-Round Core');
      if (deathAndFinishing >= 86) strengths.push('Elite Death-Overs Finishing & Yorker Execution');
      if (valueEfficiency >= 80 && bestSteal)
        strengths.push(`Smart Moneyball Value (${bestSteal.name} at ${formatCurrencyLakhs(bestSteal.soldPriceLakhs)})`);
      if (strengths.length === 0 && squad.length > 0) {
        strengths.push(`Led by ${mvpPlayer?.name || 'solid core'} with ${formatCurrencyLakhs(tRow.purse_remaining_lakhs)} purse flexibility`);
      }

      if (!hasWK) weaknesses.push('Missing a Specialist Wicketkeeper (Critical Squad Gap)');
      if (totalBowlingOptions < 5 && squad.length >= 6)
        weaknesses.push(`Short on 5th/6th Bowling Coverage (${totalBowlingOptions} frontline options in XI)`);
      if (spinUnit.length === 0 && squad.length >= 5)
        weaknesses.push('No Specialist Spinner for Turning Surfaces');
      if (paceUnit.length < 2 && squad.length >= 5)
        weaknesses.push('Thin Fast-Bowling Depth');
      if (fullMegaScale && squad.length < room.min_squad_size)
        weaknesses.push(`Below IPL Minimum 18-Player Squad Rule (${squad.length}/${room.min_squad_size})`);
      if (tRow.purse_remaining_lakhs > 3500 && squad.length > 0)
        weaknesses.push(`Left ${formatCurrencyLakhs(tRow.purse_remaining_lakhs)} Unspent on the Table`);
      if (weaknesses.length === 0) {
        weaknesses.push('Well-rounded roster with minimal tactical vulnerabilities');
      }

      const punditVerdict =
        squad.length === 0
          ? `${meta.name} did not acquire any players in this auction session.`
          : `${meta.name} assembled a ${grade}-tier squad (${squad.length} players, ${tRow.overseas_count} overseas) headlined by ${mvpPlayer?.name} (${mvpPlayer?.overallRating} OVR). ${strengths[0]}. ${
              weaknesses[0].startsWith('Well-rounded')
                ? 'Strong contender for the IPL trophy.'
                : `Watch out for: ${weaknesses[0]}.`
            }`;

      return {
        teamCode: tRow.team_code,
        teamName: meta.name,
        primaryColor: meta.primaryColor,
        secondaryColor: meta.secondaryColor,
        ownerName: tRow.owner_name || (tRow.is_bot ? `AI GM (${tRow.team_code})` : 'Unclaimed'),
        isBot: Boolean(tRow.is_bot),
        overallScore,
        grade,
        squadSize: squad.length,
        overseasCount: tRow.overseas_count,
        purseSpentLakhs,
        purseRemainingLakhs: tRow.purse_remaining_lakhs,
        roleCounts,
        cappedCount,
        uncappedCount,
        categories: {
          batting,
          paceBowling,
          spinAttack,
          allRoundBalance,
          deathAndFinishing,
          squadDepth,
          valueEfficiency,
        },
        bestPlayingXI: xi,
        impactPlayer: impact,
        mvpPlayer,
        mostExpensiveBuy,
        bestValueSteal: bestSteal,
        strengths,
        weaknesses,
        punditVerdict,
      };
    });

  // Sort by overallScore DESC, tie-break by MVP rating then purse remaining
  rawEvaluations.sort((a, b) => {
    if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
    const mvpDiff = (b.mvpPlayer?.overallRating || 0) - (a.mvpPlayer?.overallRating || 0);
    if (mvpDiff !== 0) return mvpDiff;
    return b.purseRemainingLakhs - a.purseRemainingLakhs;
  });

  // Softmax win probabilities so all 10 teams sum cleanly to 100.0%
  const expWeights = rawEvaluations.map((e) =>
    e.squadSize > 0 ? Math.exp((e.overallScore - 70) / 7.5) : 0.01
  );
  const weightSum = expWeights.reduce((a, b) => a + b, 0) || 1;

  const rankings: TeamAnalysisRank[] = rawEvaluations.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    winProbabilityPct: Number(((expWeights[idx] / weightSum) * 100).toFixed(1)),
    playoffQualification: idx < 4 && item.squadSize > 0,
  }));

  const totalSpentLakhs = soldRows.reduce((s, r) => s + r.sold_price_lakhs, 0);
  const topSold = soldRows[0] || null;

  let biggestStealRow: (PlayerRecord & { sold_to_team: TeamCode; sold_price_lakhs: number }) | null =
    null;
  let bestOverallSurplus = -Infinity;
  for (const r of soldRows) {
    const dto = mapPlayerToDTO(r);
    const surplus = estimateFairValueLakhs(dto) - r.sold_price_lakhs;
    if (surplus > bestOverallSurplus) {
      bestOverallSurplus = surplus;
      biggestStealRow = r;
    }
  }

  const champ = rankings[0] && rankings[0].squadSize > 0 ? rankings[0] : null;
  let headlineSummary = champ
    ? `${champ.teamName} (${champ.ownerName}) emerges as the #1 Predicted Champion with an overall score of ${champ.overallScore}/100 (${champ.grade}) and a ${champ.winProbabilityPct}% title probability!`
    : 'Auction completed with no players sold.';

  let aiCommentarySource: 'deterministic-cricket-engine' | 'hybrid-llm-enhanced' =
    'deterministic-cricket-engine';

  // Optional OpenAI enhancement if key is configured
  if (env.openAiApiKey && champ) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const prompt = `Summarize this IPL Auction result in 2 punchy broadcast sentences. #1 team: ${champ.teamName} (${champ.overallScore}/100, MVP: ${champ.mvpPlayer?.name}). Top 4: ${rankings
        .slice(0, 4)
        .map((r) => r.teamCode)
        .join(', ')}. Top buy: ${topSold?.name || 'N/A'} (${formatCurrencyLakhs(topSold?.sold_price_lakhs || 0)}).`;
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.openAiApiKey}`,
        },
        body: JSON.stringify({
          model: env.openAiModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const json = (await resp.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          headlineSummary = content;
          aiCommentarySource = 'hybrid-llm-enhanced';
        }
      }
    } catch {
      // Gracefully keep deterministic cricket engine headline
    }
  }

  const summaryPayload = {
    predictedChampion: champ
      ? {
          teamCode: champ.teamCode,
          teamName: champ.teamName,
          ownerName: champ.ownerName,
          overallScore: champ.overallScore,
          grade: champ.grade,
          winProbabilityPct: champ.winProbabilityPct,
        }
      : null,
    playoffTeams: rankings.filter((r) => r.playoffQualification).map((r) => r.teamCode),
    auctionHighlights: {
      totalPlayersSold: soldRows.length,
      totalPlayersUnsold: unsoldCountRow.cnt,
      totalSpentLakhs,
      mostExpensiveOverall: topSold
        ? {
            playerName: topSold.name,
            teamCode: topSold.sold_to_team,
            priceLakhs: topSold.sold_price_lakhs,
            role: topSold.role,
          }
        : null,
      biggestValueOverall: biggestStealRow
        ? {
            playerName: biggestStealRow.name,
            teamCode: biggestStealRow.sold_to_team,
            priceLakhs: biggestStealRow.sold_price_lakhs,
            overallRating: biggestStealRow.overall_rating,
          }
        : null,
      aiCommentarySource,
      headlineSummary,
    },
  };

  const generatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO analysis_reports (id, room_id, rankings_json, summary_json, generated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(room_id) DO UPDATE SET
       rankings_json = excluded.rankings_json,
       summary_json = excluded.summary_json,
       generated_at = excluded.generated_at`
  ).run(
    uuidv4(),
    roomId,
    JSON.stringify(rankings),
    JSON.stringify(summaryPayload),
    generatedAt
  );

  return {
    roomId,
    generatedAt,
    ...summaryPayload,
    rankings,
  };
}
