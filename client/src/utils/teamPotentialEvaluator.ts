// Holistic AI Cricket Potential & Lineup Evaluator

import { SquadBoughtPlayer, TeamAnalysisRank, TeamCode } from '../types';

export interface EvaluatedTeamPotential {
  overallScore: number;
  grade: 'S+' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  categories: {
    batting: number;
    paceBowling: number;
    spinAttack: number;
    allRoundBalance: number;
    deathAndFinishing: number;
    squadDepth: number;
    valueEfficiency: number;
  };
  punditVerdict: string;
  strengths: string[];
  weaknesses: string[];
}

const KNOWN_CAPTAIN_MASTERS = [
  'ms dhoni',
  'rohit sharma',
  'virat kohli',
  'pat cummins',
  'hardik pandya',
  'shreyas iyer',
  'ruturaj gaikwad',
  'kl rahul',
  'sanju samson',
  'rishabh pant',
  'shubman gill',
  'sam curran',
  'aiden markram',
  'faf du plessis',
];

function isSpin(p: SquadBoughtPlayer): boolean {
  const s = (p.bowlingStyle || '').toLowerCase();
  return s.includes('spin') || s.includes('legbreak') || s.includes('offbreak') || s.includes('orthodox');
}

function isPace(p: SquadBoughtPlayer): boolean {
  const s = (p.bowlingStyle || '').toLowerCase();
  return s.includes('fast') || s.includes('medium');
}

function canBowl(p: SquadBoughtPlayer): boolean {
  return p.role === 'BOWL' || (p.role === 'AR' && p.bowlingRating >= 60);
}

function clamp(val: number, min = 20, max = 99): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function getGrade(score: number): 'S+' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S+';
  if (score >= 85) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 68) return 'B';
  if (score >= 58) return 'C';
  return 'D';
}

/**
 * Holistically evaluates a franchise's custom Playing XI, Impact Sub, Captain and Vice-Captain.
 */
export function evaluateTeamPotential(
  teamCode: TeamCode,
  teamName: string,
  xi: SquadBoughtPlayer[],
  impactPlayer: SquadBoughtPlayer | null,
  captain: SquadBoughtPlayer | null,
  viceCaptain: SquadBoughtPlayer | null,
  fullSquad: SquadBoughtPlayer[] = []
): EvaluatedTeamPotential {
  const activeSquad = fullSquad.length > 0 ? fullSquad : xi;

  // 1. Batting Firepower & Order Balance
  const topOrder = xi.slice(0, 3);
  const middleOrder = xi.slice(3, 7);
  const tail = xi.slice(7);

  const topAvg =
    topOrder.length > 0
      ? topOrder.reduce((s, p) => s + p.battingRating * 0.7 + p.powerplayRating * 0.3, 0) / topOrder.length
      : 30;

  const midAvg =
    middleOrder.length > 0
      ? middleOrder.reduce((s, p) => s + p.battingRating * 0.65 + p.deathRating * 0.35, 0) / middleOrder.length
      : 30;

  const tailDepthBonus = tail.filter((p) => p.battingRating >= 50).length * 3;
  const hasLHB = xi.some((p) => p.battingStyle === 'LHB');
  const batting = clamp(topAvg * 0.5 + midAvg * 0.45 + tailDepthBonus + (hasLHB ? 3 : 0));

  // 2. Pace Bowling Battery
  const pacers = xi.filter((p) => canBowl(p) && isPace(p));
  const topPacers = [...pacers].sort((a, b) => b.bowlingRating - a.bowlingRating).slice(0, 3);
  const paceAvg =
    topPacers.length > 0
      ? topPacers.reduce((s, p) => s + p.bowlingRating * 0.6 + p.deathRating * 0.4, 0) / topPacers.length
      : 30;
  const paceBowling = clamp(paceAvg * (topPacers.length >= 2 ? 1.04 : 0.82));

  // 3. Spin Attack Choke
  const spinners = xi.filter((p) => canBowl(p) && isSpin(p));
  const topSpinners = [...spinners].sort((a, b) => b.bowlingRating - a.bowlingRating).slice(0, 2);
  const spinAvg =
    topSpinners.length > 0
      ? topSpinners.reduce((s, p) => s + p.bowlingRating * 0.8 + p.powerplayRating * 0.2, 0) / topSpinners.length
      : 32;
  const spinAttack = clamp(spinAvg * (topSpinners.length >= 1 ? 1.02 : 0.88));

  // 4. All-Round & Tactical Balance
  const allRounders = xi.filter((p) => p.role === 'AR');
  const totalBowlers = xi.filter(canBowl).length;
  const wks = xi.filter((p) => p.role === 'WK');
  const allRoundBalance = clamp(
    52 +
      Math.min(3, allRounders.length) * 8 +
      Math.min(6, totalBowlers) * 4 +
      (wks.length >= 1 ? 8 : -25)
  );

  // 5. Death Overs & Finishing
  const deathBatters = [...xi].sort((a, b) => b.deathRating - a.deathRating).slice(0, 3);
  const deathBowlers = [...xi.filter(canBowl)].sort((a, b) => b.deathRating - a.deathRating).slice(0, 2);
  const deathBatAvg = deathBatters.length > 0 ? deathBatters.reduce((s, p) => s + p.deathRating, 0) / deathBatters.length : 30;
  const deathBwlAvg = deathBowlers.length > 0 ? deathBowlers.reduce((s, p) => s + p.deathRating, 0) / deathBowlers.length : 30;
  const deathAndFinishing = clamp(deathBatAvg * 0.5 + deathBwlAvg * 0.5);

  // 6. Leadership & Captaincy Impact
  let captainBonus = 0;
  if (captain) {
    const isMasterCap = KNOWN_CAPTAIN_MASTERS.some((m) =>
      captain.name.toLowerCase().includes(m)
    );
    captainBonus += isMasterCap ? 5.5 : Math.max(1, (captain.overallRating - 80) * 0.2);
  }
  if (viceCaptain) {
    captainBonus += 2.0;
  }

  // 7. Squad Depth & Impact Sub Strategy
  let depthScore = 65;
  if (impactPlayer) {
    depthScore += (impactPlayer.overallRating - 75) * 0.35;
  }
  if (activeSquad.length >= 18) {
    depthScore += Math.min(15, (activeSquad.length - 18) * 1.5);
  }
  const squadDepth = clamp(depthScore);

  // 8. Value Efficiency (Default baseline)
  const valueEfficiency = 85;

  // Weighted Overall Rating
  let rawScore =
    batting * 0.21 +
    paceBowling * 0.17 +
    spinAttack * 0.14 +
    allRoundBalance * 0.16 +
    deathAndFinishing * 0.14 +
    squadDepth * 0.08 +
    valueEfficiency * 0.06 +
    captainBonus;

  // Penalties
  if (wks.length === 0) rawScore -= 8;
  if (totalBowlers < 5) rawScore -= (5 - totalBowlers) * 5;
  const overseasCount = xi.filter((p) => p.isOverseas).length;
  if (overseasCount > 4) rawScore -= (overseasCount - 4) * 12;

  const overallScore = Number(Math.max(25, Math.min(99, rawScore)).toFixed(1));
  const grade = getGrade(overallScore);

  // Strengths & Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (batting >= 85) strengths.push('Formidable top-order batting firepower');
  if (paceBowling >= 85) strengths.push('Elite express pace and swing battery');
  if (spinAttack >= 84) strengths.push('Suffocating middle-overs spin choke');
  if (allRounders.length >= 2) strengths.push('Dynamic multi-dimensional all-round depth');
  if (deathAndFinishing >= 86) strengths.push('Clutch death-overs finishing & yorker precision');
  if (captain && KNOWN_CAPTAIN_MASTERS.some((m) => captain.name.toLowerCase().includes(m))) {
    strengths.push(`Championship leadership under Captain ${captain.name}`);
  }

  if (strengths.length === 0) strengths.push('Balanced and versatile squad setup');

  if (wks.length === 0) weaknesses.push('No recognized wicketkeeper in Playing XI');
  if (totalBowlers < 5) weaknesses.push('Fewer than 5 regular bowling options');
  if (paceBowling < 75) weaknesses.push('Vulnerable to heavy batting attacks in death overs');
  if (spinAttack < 74) weaknesses.push('Limited spin variety on turning wickets');
  if (weaknesses.length === 0) weaknesses.push('Well-rounded across all phases of T20 cricket');

  const capName = captain ? `under Captain ${captain.name}` : '';
  const punditVerdict = `${teamName} assembled a ${grade}-grade lineup ${capName}. ${strengths[0]}. Strong contender for the championship title.`;

  return {
    overallScore,
    grade,
    categories: {
      batting,
      paceBowling,
      spinAttack,
      allRoundBalance,
      deathAndFinishing,
      squadDepth,
      valueEfficiency,
    },
    punditVerdict,
    strengths,
    weaknesses,
  };
}

/**
 * Re-ranks all teams based on updated potential scores and recalculates softmax win probabilities.
 */
export function recomputeRankingsWithNewPotentials(teams: TeamAnalysisRank[]): TeamAnalysisRank[] {
  const sorted = [...teams].sort((a, b) => b.overallScore - a.overallScore);

  const expWeights = sorted.map((e) => Math.exp((e.overallScore - 70) / 7.5));
  const weightSum = expWeights.reduce((a, b) => a + b, 0) || 1;

  return sorted.map((team, idx) => ({
    ...team,
    rank: idx + 1,
    winProbabilityPct: Number(((expWeights[idx] / weightSum) * 100).toFixed(1)),
    playoffQualification: idx < 4 && team.squadSize > 0,
  }));
}
