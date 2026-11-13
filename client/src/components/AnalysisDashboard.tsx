import React, { useState } from 'react';
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
} from 'lucide-react';
import { RoomAnalysisReport, TeamAnalysisRank } from '../types';
import { formatLakhs, roleBadgeClasses } from '../utils/format';
import { SquadPosterModal } from './SquadPosterModal';
import { TournamentSimulatorModal } from './TournamentSimulatorModal';

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

  const toggleRank = (rank: number) => {
    setExpandedRanks((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });
  };

  const champ = report.predictedChampion;
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

      {/* Predicted Champion Hero Banner */}
      {champ && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-stadium-900 to-stadium-950 p-5 shadow-2xl sm:p-7">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>#1 Predicted Best Team & Title Favourite</span>
              </div>

              <h1 className="text-2xl font-black text-white sm:text-4xl">
                🏆 {champ.teamName}{' '}
                <span className="text-amber-300">({champ.teamCode})</span>
              </h1>

              <p className="text-sm leading-relaxed text-slate-200">{h.headlineSummary}</p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Predicted Top 4 Playoffs:
                </span>
                {report.playoffTeams.map((tc, i) => (
                  <span
                    key={tc}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-extrabold text-emerald-300"
                  >
                    #{i + 1} {tc}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-white/15 bg-stadium-950/90 p-4 text-center lg:col-span-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">AI Score</div>
                <div className="tabular-nums mt-1 text-2xl font-black text-amber-300">
                  {champ.overallScore}
                </div>
                <div className="text-[10px] text-slate-500">out of 100</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Tier</div>
                <div className="mt-1 text-2xl font-black text-emerald-400">
                  {champ.grade}
                </div>
                <div className="text-[10px] text-slate-500">Squad Grade</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Win Odds</div>
                <div className="tabular-nums mt-1 text-2xl font-black text-sky-300">
                  {champ.winProbabilityPct}%
                </div>
                <div className="text-[10px] text-slate-500">Title Prob.</div>
              </div>
              <div className="sm:col-span-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTournamentOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110"
                >
                  <Swords className="h-4 w-4" />
                  <span>Simulate Season & Playoffs 🏆</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auction Superlatives Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4">
          <div className="text-[11px] font-bold uppercase text-slate-400">
            Total Auction Spend
          </div>
          <div className="tabular-nums mt-1 text-xl font-black text-amber-300">
            {formatLakhs(h.totalSpentLakhs)}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {h.totalPlayersSold} Sold • {h.totalPlayersUnsold} Unsold
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-400">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span>Most Expensive Buy</span>
          </div>
          {h.mostExpensiveOverall ? (
            <>
              <div className="mt-1 truncate text-base font-extrabold text-white">
                {h.mostExpensiveOverall.playerName}
              </div>
              <div className="mt-0.5 text-xs font-bold text-emerald-400">
                {h.mostExpensiveOverall.teamCode} •{' '}
                {formatLakhs(h.mostExpensiveOverall.priceLakhs)}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-500">No players sold yet</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Biggest Value Steal</span>
          </div>
          {h.biggestValueOverall ? (
            <>
              <div className="mt-1 truncate text-base font-extrabold text-white">
                {h.biggestValueOverall.playerName} ({h.biggestValueOverall.overallRating} OVR)
              </div>
              <div className="mt-0.5 text-xs font-bold text-sky-300">
                {h.biggestValueOverall.teamCode} •{' '}
                {formatLakhs(h.biggestValueOverall.priceLakhs)}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-slate-500">No players sold yet</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-400">
            <Award className="h-3.5 w-3.5 text-purple-400" />
            <span>Analytics Engine</span>
          </div>
          <div className="mt-1 text-sm font-extrabold text-white">
            7-Factor XI Solver
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            Max 4 Overseas XI + Impact Sub
          </div>
        </div>
      </div>

      {/* Rank-Wise #1 to #10 Franchise Breakdown */}
      <div className="space-y-3.5">
        {report.rankings.map((team) => {
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
              className={`overflow-hidden rounded-2xl border transition ${
                team.rank === 1
                  ? 'border-amber-400/50 bg-stadium-900 shadow-lg shadow-amber-500/10'
                  : team.playoffQualification
                    ? 'border-emerald-500/30 bg-stadium-900/95'
                    : 'border-white/10 bg-stadium-900/85'
              }`}
            >
              {/* Summary Row */}
              <button
                type="button"
                onClick={() => toggleRank(team.rank)}
                className="flex w-full flex-col justify-between gap-3 p-4 text-left sm:flex-row sm:items-center sm:px-6"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-stadium-950 font-mono text-sm font-black text-amber-300 border border-white/10">
                    {medal}
                  </div>
                  <div
                    className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-black text-stadium-950 shadow"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.teamCode}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-white">
                        {team.teamName}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-black ${gradeBadgeColor(
                          team.grade
                        )}`}
                      >
                        {team.grade}
                      </span>
                      {team.playoffQualification && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          Playoff Qualifier
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      Owner: <strong className="text-slate-200">{team.ownerName}</strong> • Squad:{' '}
                      <strong className="text-white">{team.squadSize}</strong> ({team.overseasCount}{' '}
                      OS, {team.cappedCount} Capped, {team.uncappedCount} Uncapped) • Spent:{' '}
                      <strong className="text-amber-300">
                        {formatLakhs(team.purseSpentLakhs)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="text-right">
                    <div className="tabular-nums text-xl font-black text-white">
                      {team.overallScore}{' '}
                      <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </div>
                    <div className="tabular-nums text-xs font-semibold text-sky-300">
                      Win Prob: {team.winProbabilityPct}%
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Analytical Breakdown */}
              {isOpen && (
                <div className="border-t border-white/10 bg-stadium-950/75 p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex-1 rounded-xl border border-white/10 bg-stadium-900 px-4 py-3 text-xs leading-relaxed text-slate-200">
                      <strong className="text-amber-300">Pundit Verdict:</strong>{' '}
                      {team.punditVerdict}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPosterTeam(team)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-2.5 text-xs font-black text-amber-300 transition hover:bg-amber-500/30 shadow-md shadow-amber-500/10"
                    >
                      <Download className="h-4 w-4" />
                      <span>HD Squad Poster & Export</span>
                    </button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12">
                    {/* Left 5 Cols: 7 Category Bars + SWOT */}
                    <div className="space-y-4 lg:col-span-5">
                      <div className="rounded-xl border border-white/10 bg-stadium-900 p-3.5">
                        <h4 className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-300">
                          7-Dimension Squad Ratings
                        </h4>
                        <div className="space-y-2">
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
                                <span className="text-slate-300">{cat.label}</span>
                                <span className="tabular-nums font-mono font-bold text-white">
                                  {cat.val}/100
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
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
                            className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>{s}</span>
                          </div>
                        ))}
                        {team.weaknesses.map((w, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right 7 Cols: Predicted Best Playing XI + Impact Sub */}
                    <div className="lg:col-span-7">
                      <div className="rounded-xl border border-white/10 bg-stadium-900 p-3.5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                            Predicted Optimal Playing XI (Max 4 Overseas)
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            WK:{team.roleCounts.WK} • BAT:{team.roleCounts.BAT} • AR:
                            {team.roleCounts.AR} • BOWL:{team.roleCounts.BOWL}
                          </span>
                        </div>

                        {team.bestPlayingXI.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-500">
                            No players drafted.
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {team.bestPlayingXI.map((p, idx) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-white/10 bg-stadium-950 px-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] font-bold text-slate-500">
                                    #{idx + 1}
                                  </span>
                                  <span
                                    className={`rounded border px-1 py-0.2 text-[9px] font-bold ${roleBadgeClasses(
                                      p.role
                                    )}`}
                                  >
                                    {p.role}
                                  </span>
                                  <span className="truncate font-bold text-white">
                                    {p.name}
                                  </span>
                                  {p.isOverseas && <span className="text-[10px]">✈️</span>}
                                </div>
                                <div className="shrink-0 text-right font-mono text-[11px]">
                                  <span className="font-bold text-amber-300">
                                    {p.overallRating}
                                  </span>
                                  <span className="ml-1.5 text-slate-400">
                                    {formatLakhs(p.soldPriceLakhs)}
                                  </span>
                                </div>
                              </div>
                            ))}

                            {team.impactPlayer && (
                              <div className="flex items-center justify-between rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-2 text-xs sm:col-span-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-purple-400 px-1.5 py-0.5 text-[9px] font-black text-stadium-950">
                                    IMPACT SUB #12
                                  </span>
                                  <span className="font-bold text-white">
                                    {team.impactPlayer.name} ({team.impactPlayer.role})
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-purple-200">
                                  {team.impactPlayer.overallRating} OVR •{' '}
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

      {posterTeam && (
        <SquadPosterModal
          open={Boolean(posterTeam)}
          onClose={() => setPosterTeam(null)}
          teamCode={posterTeam.teamCode}
          teamName={posterTeam.teamName}
          ownerName={posterTeam.ownerName}
          purseRemainingLakhs={12000 - posterTeam.purseSpentLakhs}
          totalPurseLakhs={12000}
          squad={posterTeam.bestPlayingXI}
          analysis={posterTeam}
        />
      )}

      {tournamentOpen && (
        <TournamentSimulatorModal
          open={tournamentOpen}
          onClose={() => setTournamentOpen(false)}
          teams={report.rankings}
        />
      )}
    </div>
  );
};
