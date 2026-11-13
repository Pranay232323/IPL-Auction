import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award,
  Flame,
  ArrowLeft,
  RefreshCw,
  Share2,
  Download,
  Swords,
  Crown,
  Users,
  Shield,
  Zap,
} from 'lucide-react';
import { RoomAnalysisReport, TeamAnalysisRank } from '../types';
import { formatLakhs, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { SquadPosterModal } from './SquadPosterModal';
import { TournamentSimulatorModal } from './TournamentSimulatorModal';
import { LineupBuilderModal } from './LineupBuilderModal';
import { recomputeRankingsWithNewPotentials } from '../utils/teamPotentialEvaluator';

interface AnalysisDashboardProps {
  report: RoomAnalysisReport;
  isModalPreview?: boolean;
  onClosePreview?: () => void;
  onRefresh?: () => void;
}

function gradeBadgeColor(grade: TeamAnalysisRank['grade']): string {
  switch (grade) {
    case 'S+':
      return 'bg-amber-400 text-stadium-950 border-amber-300';
    case 'A+':
    case 'A':
      return 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50';
    case 'B+':
    case 'B':
      return 'bg-sky-500/25 text-sky-300 border-sky-400/50';
    default:
      return 'bg-rose-500/25 text-rose-300 border-rose-400/50';
  }
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  report,
  isModalPreview = false,
  onClosePreview,
  onRefresh,
}) => {
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(
    () => new Set([1, 2])
  );
  const [posterTeam, setPosterTeam] = useState<TeamAnalysisRank | null>(null);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [lineupTeam, setLineupTeam] = useState<TeamAnalysisRank | null>(null);
  const [activeRankings, setActiveRankings] = useState<TeamAnalysisRank[]>(() => report.rankings);

  useEffect(() => {
    setActiveRankings(report.rankings);
  }, [report.rankings]);

  const toggleRank = (rank: number) => {
    setExpandedRanks((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });
  };

  const champ = activeRankings[0] || report.predictedChampion;
  const h = report.auctionHighlights;

  return (
    <div className="space-y-6">
      {/* Top Navigation / Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-stadium-900/95 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white sm:text-base">
              {isModalPreview
                ? 'Live Mid-Auction AI Team Ranking Preview'
                : 'Official Post-Auction Team Analysis & Predicted Rankings'}
            </h2>
            <p className="text-xs text-slate-400">
              Ranked #1 to #{report.rankings.length} by Optimal Playing XI, Role Balance, Bowling Coverage & Value ROI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTournamentOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/25 to-amber-500/15 px-3.5 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-500/30 shadow-md shadow-amber-500/10"
          >
            <Swords className="h-4 w-4" />
            <span>Simulate Tournament</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
              <span>Recalculate</span>
            </button>
          )}
          {onClosePreview && (
            <button
              onClick={onClosePreview}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-stadium-950 hover:bg-amber-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Auction</span>
            </button>
          )}
        </div>
      </div>

      {/* Predicted Champion Hero Banner - Broadcast Studio Presentation */}
      {champ && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-[#080d1e] to-[#040711] p-6 shadow-2xl sm:p-8">
          {/* Top Championship Glowing Ribbon */}
          <div
            className="absolute inset-x-0 top-0 h-1.5 shadow-lg"
            style={{ backgroundColor: champ.primaryColor || '#F59E0B' }}
          />

          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/30 to-amber-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>IPL 2026 Title Favourite & #1 Predicted Champion</span>
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                  Playoff Qualifier #1
                </span>
              </div>

              {/* Champion Team Title + Official Crest - Television Studio Presentation */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-stadium-950/90 border-2 border-amber-400/50 p-2 shadow-xl">
                  <FranchiseLogo teamCode={champ.teamCode} size="lg" />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                    {champ.teamName} <span className="text-amber-400">({champ.teamCode})</span>
                  </h1>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Franchise GM: <span className="text-white font-extrabold">{champ.ownerName}</span> • Squad:{' '}
                    <span className="text-amber-300 font-extrabold">{champ.squadSize} Players</span> ({champ.overseasCount} Overseas)
                  </p>
                </div>
              </div>

              {/* Chief Analyst Verdict Box */}
              <div className="rounded-2xl border border-white/10 bg-stadium-950/80 p-4 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Award className="h-4 w-4" />
                  <span>Broadcaster Squad Verdict</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                  {h.headlineSummary || champ.punditVerdict}
                </p>
              </div>

              {/* Top 4 Playoff Qualifiers Ribbon */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Predicted Top 4 Qualifiers:
                </span>
                {report.playoffTeams.map((tc, i) => (
                  <div
                    key={tc}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300"
                  >
                    <FranchiseLogo teamCode={tc} size="xs" />
                    <span>#{i + 1} {tc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Telemetry Column */}
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-white/15 bg-gradient-to-b from-stadium-900/90 to-stadium-950/95 p-5 text-center shadow-xl lg:col-span-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Score</div>
                  <div className="tabular-nums font-display mt-1 text-3xl font-black text-amber-300">
                    {champ.overallScore}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">out of 100</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tier</div>
                  <div className="font-display mt-1 text-3xl font-black text-emerald-400">
                    {champ.grade}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">Squad Grade</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Win Odds</div>
                  <div className="tabular-nums font-display mt-1 text-3xl font-black text-sky-300">
                    {champ.winProbabilityPct}%
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">Title Odds</div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTournamentOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-3 text-xs font-black uppercase tracking-wider text-stadium-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 active:scale-[0.99]"
                >
                  <Swords className="h-4 w-4" />
                  <span>Simulate Season & Playoffs 🏆</span>
                </button>
                <p className="text-[10px] font-semibold text-slate-400">
                  Full 14-Match League Stage + Qualifier 1 + Eliminator + Grand Final
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auction Superlatives Strip - Modern Sports Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sports-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Total Auction Spend
            </span>
            <span className="rounded-lg bg-amber-500/15 p-1.5 text-amber-400">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <div className="tabular-nums font-display mt-2 text-2xl font-black text-amber-300">
            {formatLakhs(h.totalSpentLakhs)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span className="font-bold text-emerald-400">{h.totalPlayersSold} Sold</span>
            <span>•</span>
            <span>{h.totalPlayersUnsold} Unsold</span>
          </div>
        </div>

        <div className="sports-card p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span>Record Buy</span>
            </span>
            <span className="rounded-lg bg-orange-500/15 p-1.5 text-orange-400">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          {h.mostExpensiveOverall ? (
            <div className="mt-2 flex items-center gap-3">
              <FranchiseLogo teamCode={h.mostExpensiveOverall.teamCode} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-display text-base font-black text-white">
                  {h.mostExpensiveOverall.playerName}
                </div>
                <div className="text-xs font-black text-emerald-400">
                  {h.mostExpensiveOverall.teamCode} • {formatLakhs(h.mostExpensiveOverall.priceLakhs)}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">No players sold yet</div>
          )}
        </div>

        <div className="sports-card p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Biggest Value Steal</span>
            </span>
            <span className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          {h.biggestValueOverall ? (
            <div className="mt-2 flex items-center gap-3">
              <FranchiseLogo teamCode={h.biggestValueOverall.teamCode} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-display text-base font-black text-white">
                  {h.biggestValueOverall.playerName} ({h.biggestValueOverall.overallRating} OVR)
                </div>
                <div className="text-xs font-black text-sky-300">
                  {h.biggestValueOverall.teamCode} • {formatLakhs(h.biggestValueOverall.priceLakhs)}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">No players sold yet</div>
          )}
        </div>

        <div className="sports-card p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              <span>Analytics Solver</span>
            </span>
            <span className="rounded-lg bg-purple-500/15 p-1.5 text-purple-400">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <div className="font-display mt-2 text-base font-black text-white">
            7-Factor XI Solver
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Optimal 11 + Impact Sub + Max 4 OS
          </div>
        </div>
      </div>

      {/* Rank-Wise #1 to #10 Franchise Breakdown */}
      <div className="space-y-3.5">
        {activeRankings.map((team) => {
          const isOpen = expandedRanks.has(team.rank);
          const medal =
            team.rank === 1
              ? '🥇 #1'
              : team.rank === 2
                ? '🥈 #2'
                : team.rank === 3
                  ? '🥉 #3'
                  : `#${team.rank}`;

          return (
            <div
              key={team.teamCode}
              className={`overflow-hidden rounded-3xl border transition-all duration-200 ${team.rank === 1
                  ? 'border-amber-400/60 bg-gradient-to-b from-[#131d36] to-[#070b18] shadow-xl shadow-amber-500/10'
                  : team.playoffQualification
                    ? 'border-emerald-500/40 bg-gradient-to-b from-[#0f1a30] to-[#070b18]'
                    : 'border-white/10 bg-gradient-to-b from-[#0d1424] to-[#050812]'
                }`}
            >
              {/* Top Accent Strip */}
              <div
                className="h-1 w-full"
                style={{ backgroundColor: team.primaryColor || '#3B82F6' }}
              />

              {/* Summary Row */}
              <button
                type="button"
                onClick={() => toggleRank(team.rank)}
                className="flex w-full flex-col justify-between gap-4 p-4 text-left transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:px-6"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-2xl bg-stadium-950/90 font-display text-base font-black text-amber-300 border border-white/15 shadow-inner">
                    {medal}
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stadium-950/90 border border-white/15 p-1.5 shadow-sm">
                    <FranchiseLogo teamCode={team.teamCode} size="md" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
                        {team.teamName}
                      </span>
                      <span
                        className={`rounded-lg border px-2.5 py-0.5 text-xs font-black ${gradeBadgeColor(
                          team.grade
                        )}`}
                      >
                        {team.grade}
                      </span>
                      {team.playoffQualification && (
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                          Playoff Qualifier
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>Owner: <strong className="text-white">{team.ownerName}</strong></span>
                      <span>•</span>
                      <span>Squad: <strong className="text-white">{team.squadSize}</strong> ({team.overseasCount} OS, {team.cappedCount} Capped)</span>
                      <span>•</span>
                      <span>Spent: <strong className="text-amber-300 font-mono">{formatLakhs(team.purseSpentLakhs)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 sm:justify-end shrink-0">
                  <div className="text-right">
                    <div className="tabular-nums font-display text-2xl font-black text-white">
                      {team.overallScore}{' '}
                      <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </div>
                    <div className="tabular-nums text-xs font-bold text-sky-300">
                      Win Prob: {team.winProbabilityPct}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300">
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-amber-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Analytical Breakdown */}
              {isOpen && (
                <div className="border-t border-white/10 bg-stadium-950/80 p-4 sm:p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 rounded-2xl border border-white/10 bg-stadium-900/90 px-4 py-3 text-xs leading-relaxed text-slate-200">
                      <strong className="text-amber-300 uppercase tracking-wider">🎙️ Broadcaster Tactical Verdict:</strong>{' '}
                      {team.punditVerdict}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setLineupTeam(team)}
                        className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/25 to-amber-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/30 shadow-md shadow-amber-500/10 active:scale-[0.98]"
                      >
                        <Crown className="h-4 w-4" />
                        <span>Customise Lineup & Captains 👑</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPosterTeam(team)}
                        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-200 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                      >
                        <Download className="h-4 w-4" />
                        <span>HD Squad Poster & Export 📊</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12">
                    {/* Left 5 Cols: 7 Category Bars + SWOT */}
                    <div className="space-y-4 lg:col-span-5">
                      <div className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4 shadow-sm">
                        <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-300">
                          7-Dimension Squad Ratings
                        </h4>
                        <div className="space-y-2.5">
                          {[
                            { label: 'Batting Power', val: team.categories.batting, c: 'bg-sky-400' },
                            { label: 'Pace & Swing', val: team.categories.paceBowling, c: 'bg-purple-400' },
                            { label: 'Spin Attack', val: team.categories.spinAttack, c: 'bg-emerald-400' },
                            { label: 'All-Round Balance', val: team.categories.allRoundBalance, c: 'bg-amber-400' },
                            { label: 'Death & Finishing', val: team.categories.deathAndFinishing, c: 'bg-orange-400' },
                            { label: 'Squad Depth', val: team.categories.squadDepth, c: 'bg-cyan-400' },
                            { label: 'Moneyball ROI', val: team.categories.valueEfficiency, c: 'bg-pink-400' },
                          ].map((cat) => (
                            <div key={cat.label}>
                              <div className="flex justify-between text-xs">
                                <span className="font-medium text-slate-300">{cat.label}</span>
                                <span className="tabular-nums font-mono font-black text-white">
                                  {cat.val}/100
                                </span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className={`h-full rounded-full ${cat.c}`}
                                  style={{ width: `${cat.val}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="space-y-2">
                        {team.strengths.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                            <span>{s}</span>
                          </div>
                        ))}
                        {team.weaknesses.map((w, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200"
                          >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right 7 Cols: Predicted Best Playing XI + Impact Sub with Headshots */}
                    <div className="lg:col-span-7">
                      <div className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4 shadow-sm">
                        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                          <h4 className="font-display text-sm font-black uppercase tracking-wider text-amber-300">
                            ⚡ Predicted Match-Day Playing XI (Max 4 Overseas)
                          </h4>
                          <span className="text-xs font-semibold text-slate-400">
                            WK:{team.roleCounts.WK} • BAT:{team.roleCounts.BAT} • AR:
                            {team.roleCounts.AR} • BOWL:{team.roleCounts.BOWL}
                          </span>
                        </div>

                        {team.bestPlayingXI.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-500">
                            No players drafted in squad yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              {team.bestPlayingXI.map((p, idx) => {
                                const isCap = p.id === team.captain?.id;
                                const isVc = p.id === team.viceCaptain?.id && !isCap;

                                return (
                                  <div
                                    key={p.id}
                                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${isCap
                                        ? 'border-amber-400/60 bg-amber-500/15'
                                        : isVc
                                          ? 'border-sky-400/50 bg-sky-500/15'
                                          : 'border-white/10 bg-stadium-950/80 hover:border-white/20'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className="font-mono text-[11px] font-black text-slate-500 shrink-0">
                                        #{idx + 1}
                                      </span>
                                      <div className="shrink-0">
                                        <PlayerHeadshot player={p} teamCode={team.teamCode} size="xs" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black border leading-none ${roleBadgeClasses(
                                              p.role
                                            )}`}
                                          >
                                            {p.role}
                                          </span>
                                          <span className="truncate font-black text-white text-xs">
                                            {p.name}
                                          </span>
                                          {isCap && (
                                            <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-stadium-950 leading-none shadow-sm">
                                              C 👑
                                            </span>
                                          )}
                                          {isVc && (
                                            <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-sky-400 px-1.5 py-0.5 text-[9px] font-black text-stadium-950 leading-none shadow-sm">
                                              VC 🎖️
                                            </span>
                                          )}
                                          {p.isOverseas && <span className="shrink-0 text-[10px]">✈️</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                          Rating: <span className="text-amber-300 font-bold">{p.overallRating}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right font-mono text-xs font-black text-amber-300 ml-2">
                                      {formatLakhs(p.soldPriceLakhs)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Separated Impact Sub Banner */}
                            {team.impactPlayer && (
                              <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-purple-500/50 bg-purple-500/20 p-2.5 text-xs shadow-md">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="rounded-lg bg-purple-500 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                                    ⚡ IMPACT SUB #12
                                  </span>
                                  <PlayerHeadshot player={team.impactPlayer} teamCode={team.teamCode} size="xs" />
                                  <div className="min-w-0">
                                    <span className="truncate font-black text-white">
                                      {team.impactPlayer.name} [{team.impactPlayer.role}]
                                    </span>
                                    <span className="ml-1.5 text-[10px] font-bold text-purple-200">
                                      {team.impactPlayer.overallRating} OVR
                                    </span>
                                  </div>
                                </div>
                                <span className="shrink-0 font-mono text-xs font-black text-amber-300">
                                  {formatLakhs(team.impactPlayer.soldPriceLakhs)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lineupTeam && (
        <LineupBuilderModal
          open={Boolean(lineupTeam)}
          onClose={() => setLineupTeam(null)}
          team={lineupTeam}
          onSaveLineup={(updatedTeam) => {
            const nextRankings = activeRankings.map((t) =>
              t.teamCode === updatedTeam.teamCode ? updatedTeam : t
            );
            const reRanked = recomputeRankingsWithNewPotentials(nextRankings);
            setActiveRankings(reRanked);
            setLineupTeam(null);
          }}
        />
      )}

      {posterTeam && (
        <SquadPosterModal
          open={Boolean(posterTeam)}
          onClose={() => setPosterTeam(null)}
          teamCode={posterTeam.teamCode}
          teamName={posterTeam.teamName}
          ownerName={posterTeam.ownerName}
          purseRemainingLakhs={12000 - posterTeam.purseSpentLakhs}
          totalPurseLakhs={12000}
          squad={
            posterTeam.fullSquad && posterTeam.fullSquad.length > 0
              ? posterTeam.fullSquad
              : posterTeam.bestPlayingXI
          }
          analysis={posterTeam}
        />
      )}

      {tournamentOpen && (
        <TournamentSimulatorModal
          open={tournamentOpen}
          onClose={() => setTournamentOpen(false)}
          teams={activeRankings}
        />
      )}
    </div>
  );
};
