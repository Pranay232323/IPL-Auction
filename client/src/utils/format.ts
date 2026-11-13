import { FRANCHISES, PlayerRole, TeamCode } from '../types';

export function formatLakhs(lakhs: number | null | undefined): string {
  if (lakhs === null || lakhs === undefined) return '—';
  if (lakhs >= 100) {
    return `₹${(lakhs / 100).toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

export function formatLakhsCompact(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return Number.isInteger(cr) ? `₹${cr} Cr` : `₹${cr.toFixed(2)} Cr`;
  }
  return `₹${lakhs}L`;
}

export function getFranchiseMeta(code: TeamCode | null | undefined) {
  if (!code) return null;
  return FRANCHISES.find((f) => f.code === code) || null;
}

export function formatLakhsForSpeech(lakhs: number | null | undefined): string {
  if (!lakhs || lakhs <= 0) return 'zero';
  if (lakhs >= 100) {
    const cr = Math.floor(lakhs / 100);
    const remLakhs = lakhs % 100;
    if (remLakhs === 0) {
      return `${cr} Crore${cr > 1 ? 's' : ''}`;
    }
    return `${cr} Crore ${remLakhs} Lakhs`;
  }
  return `${lakhs} Lakhs`;
}

export function roleFullLabel(role: PlayerRole): string {
  switch (role) {
    case 'WK':
      return 'Wicketkeeper';
    case 'BAT':
      return 'Batter';
    case 'AR':
      return 'All-Rounder';
    case 'BOWL':
      return 'Bowler';
  }
}

export function roleBadgeClasses(role: PlayerRole): string {
  switch (role) {
    case 'WK':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'BAT':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    case 'AR':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'BOWL':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  }
}
