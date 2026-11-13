import React, { useMemo, useState, useEffect } from 'react';
import {
  Trophy,
  X,
  Play,
  RotateCcw,
  Swords,
  Medal,
  Award,
  Flame,
  Download,
  Share2,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Users,
  Crown,
  Star,
  Shield,
  Zap,
} from 'lucide-react';
import { SquadBoughtPlayer, TeamAnalysisRank, TeamCode } from '../types';
import {
  BatterScorecard,
  BowlerScorecard,
  InningsSimulation,
  MatchSimulationResult,
  simulateFullTournament,
  simulateMatch,
  TournamentSimulationResult,
} from '../utils/cricketSimulator';
import { fireTeamConfetti } from '../utils/confetti';
import { formatLakhs, getFranchiseMeta, roleBadgeClasses } from '../utils/format';
import { SquadPosterModal } from './SquadPosterModal';
import { LineupBuilderModal } from './LineupBuilderModal';
import { recomputeRankingsWithNewPotentials } from '../utils/teamPotentialEvaluator';
import { FranchiseLogo } from '../utils/franchiseAssets';

interface TournamentSimulatorModalProps {
  open: boolean;
  onClose: () => void;
  teams: TeamAnalysisRank[];
}

export const TournamentSimulatorModal: React.FC<TournamentSimulatorModalProps> = ({
  open,
  onClose,
  teams,
}) => {
  const [activeTab, setActiveTab] = useState<'lineups' | 'tournament' | 'match' | 'awards'>('tournament');
  const [simTeams, setSimTeams] = useState<TeamAnalysisRank[]>(() => teams);
  const [editingTeam, setEditingTeam] = useState<TeamAnalysisRank | null>(null);

  // Full Tournament State
  const [tournament, setTournament] = useState<TournamentSimulationResult>(() => {
    try {
      return simulateFullTournament(teams);
    } catch {
      return simulateFullTournament([]);
    }
  });
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync tournament when modal opens or teams change
  useEffect(() => {
    if (open) {
      setSimTeams(teams);
      try {
        setTournament(simulateFullTournament(teams));
      } catch (err) {
        console.error('Tournament simulation error:', err);
      }
    }
  }, [open, teams]);

  // Exhibition Match State
  const [teamACode, setTeamACode] = useState<TeamCode>(teams[0]?.teamCode || 'CSK');
  const [teamBCode, setTeamBCode] = useState<TeamCode>(teams[1]?.teamCode || 'MI');
  const [exhibitionMatch, setExhibitionMatch] = useState<MatchSimulationResult | null>(() => {
    if (teams.length >= 2) {
      return simulateMatch(teams[0], teams[1]);
    }
    return null;
  });
  const [activeInningsTab, setActiveInningsTab] = useState<1 | 2>(1);

  // Champion Squad Poster State
  const [posterOpen, setPosterOpen] = useState(false);

  if (!open || teams.length === 0) return null;

  const handleResimulateTournament = (overrideTeams?: TeamAnalysisRank[]) => {
    const targetTeams = overrideTeams || simTeams;
    setIsSimulating(true);
    setTimeout(() => {
      const res = simulateFullTournament(targetTeams);
      setTournament(res);
      setIsSimulating(false);
      fireTeamConfetti(res.champion.primaryColor, res.champion.secondaryColor);
    }, 250);
  };

  const handleSaveTeamLineup = (updatedTeam: TeamAnalysisRank) => {
    const nextTeams = simTeams.map((t) => (t.teamCode === updatedTeam.teamCode ? updatedTeam : t));
    const reRanked = recomputeRankingsWithNewPotentials(nextTeams);
    setSimTeams(reRanked);
    setEditingTeam(null);
    handleResimulateTournament(reRanked);
  };

  const handleRunExhibitionMatch = () => {
    const tA = teams.find((t) => t.teamCode === teamACode) || teams[0];
    const tB = teams.find((t) => t.teamCode === teamBCode) || teams[1];
    const m = simulateMatch(tA, tB);
    setExhibitionMatch(m);
    setActiveInningsTab(1);
    const winnerMeta = getFranchiseMeta(m.winnerTeamCode);
    fireTeamConfetti(winnerMeta?.primaryColor, winnerMeta?.secondaryColor);
  };

  const champMeta = getFranchiseMeta(tournament.champion.teamCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 backdrop-blur-md sm:p-5">
      <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-stadium-900 shadow-2xl">
        {/* Modal Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-950 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-stadium-950 shadow-lg shadow-amber-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white sm:text-lg">
                IPL Season Tournament & Match Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Ball-by-ball simulated league stage, playoff knockout bracket & head-to-head matches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleResimulateTournament()}
              disabled={isSimulating}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Re-Simulate Season</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-stadium-950/60 px-4 py-2 sm:px-6">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('lineups')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'lineups'
                  ? 'bg-amber-500 text-stadium-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Crown className="h-3.5 w-3.5" />
              <span>Lineup & Strategy Room 🏏</span>
            </button>

            <button
              onClick={() => setActiveTab('tournament')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'tournament'
                  ? 'bg-amber-500 text-stadium-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Standings & Playoffs</span>
            </button>

            <button
              onClick={() => setActiveTab('match')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'match'
                  ? 'bg-amber-500 text-stadium-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Swords className="h-3.5 w-3.5" />
              <span>Exhibition Match Center</span>
            </button>

            <button
              onClick={() => setActiveTab('awards')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'awards'
                  ? 'bg-amber-500 text-stadium-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Medal className="h-3.5 w-3.5" />
              <span>Season Awards</span>
            </button>
          </div>

          {/* Quick Champion Badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">CHAMPION:</span>
            <span
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-black text-stadium-950 shadow"
              style={{ backgroundColor: champMeta?.primaryColor || '#F59E0B' }}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>{tournament.champion.teamName}</span>
            </span>
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 0: TACTICAL LINEUP & STRATEGY ROOM */}
          {activeTab === 'lineups' && (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-stadium-900 to-stadium-950 p-5 shadow-xl sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-stadium-950">
                      Tactical Masterclass
                    </span>
                    <span className="text-xs text-slate-300">IPL 2026 Season Preparation</span>
                  </div>
                  <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    Franchise Playing XIs, Captains & Impact Subs
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-300 max-w-2xl">
                    Fine-tune your team's match-day lineup: customize 1-to-11 batting order, designate your Captain (👑 C) and Vice-Captain (🎖️ VC), and pick your match Impact Sub (⚡). AI re-evaluates overall potential dynamically!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleResimulateTournament();
                    setActiveTab('tournament');
                  }}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-3 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110"
                >
                  <Swords className="h-4 w-4" />
                  <span>Simulate Season With These Lineups 🏆</span>
                </button>
              </div>

              {/* Grid of all 10 Franchises */}
              <div className="grid gap-4 md:grid-cols-2">
                {simTeams.map((team) => {
                  const franchiseMeta = getFranchiseMeta(team.teamCode);
                  const cap = team.captain || team.bestPlayingXI[0] || null;
                  const vc = team.viceCaptain || (team.bestPlayingXI[1]?.id !== cap?.id ? team.bestPlayingXI[1] : team.bestPlayingXI[2]) || null;
                  const imp = team.impactPlayer;
                  const osCount = team.bestPlayingXI.filter((p) => p.isOverseas).length;

                  return (
                    <div
                      key={team.teamCode}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-stadium-950 p-4 transition hover:border-amber-400/30 shadow-lg"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-3">
                            <FranchiseLogo teamCode={team.teamCode} size="sm" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-white">{team.teamName}</h4>
                                <span className="rounded bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.2 text-[9px] font-black text-amber-300">
                                  {team.grade} ({team.overallScore} OVR)
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                GM: <strong className="text-slate-200">{team.ownerName}</strong> • {team.squadSize} Players
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingTeam(team)}
                            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-300 transition hover:bg-amber-500/25"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            <span>Customise Lineup</span>
                          </button>
                        </div>

                        {/* Leadership & Impact Badges */}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2">
                            <div className="text-[9px] font-extrabold uppercase text-amber-400">
                              Captain (C) 👑
                            </div>
                            <div className="mt-0.5 truncate font-black text-white text-xs">
                              {cap ? cap.name : 'Not set'}
                            </div>
                          </div>

                          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2">
                            <div className="text-[9px] font-extrabold uppercase text-sky-400">
                              Vice-Captain (VC) 🎖️
                            </div>
                            <div className="mt-0.5 truncate font-black text-white text-xs">
                              {vc ? vc.name : 'Not set'}
                            </div>
                          </div>

                          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-2">
                            <div className="text-[9px] font-extrabold uppercase text-purple-400">
                              Impact Sub ⚡
                            </div>
                            <div className="mt-0.5 truncate font-black text-white text-xs">
                              {imp ? imp.name : 'None'}
                            </div>
                          </div>
                        </div>

                        {/* Starting XI Batting Order Summary */}
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-400">Starting Playing XI:</span>
                            <span className="text-slate-500">
                              {osCount}/4 Overseas ✈️
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {team.bestPlayingXI.map((p, idx) => (
                              <span
                                key={p.id}
                                className="flex items-center gap-1 rounded-md border border-white/10 bg-stadium-900 px-1.5 py-0.5 text-[10px] text-slate-200"
                              >
                                <span className="font-mono text-slate-500 text-[9px]">#{idx + 1}</span>
                                <span className="font-bold text-white">{p.name.split(' ').pop()}</span>
                                {p.id === cap?.id && <span className="text-amber-400 text-[8px]">👑</span>}
                                {p.id === vc?.id && <span className="text-sky-400 text-[8px]">🎖️</span>}
                                {p.isOverseas && <span className="text-[9px]">✈️</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: TOURNAMENT STANDINGS & PLAYOFFS */}
          {activeTab === 'tournament' && (
            <div className="space-y-6">
              {/* Champion Trophy Celebration Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-stadium-950 to-amber-500/10 p-5 shadow-xl sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-stadium-950 shadow-xl"
                      style={{ backgroundColor: champMeta?.primaryColor || '#F59E0B' }}
                    >
                      {tournament.champion.teamCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-stadium-950">
                          IPL 2026 CHAMPIONS
                        </span>
                        <span className="text-xs text-slate-300">
                          Runner-Up: {tournament.runnerUp.teamName}
                        </span>
                      </div>
                      <h3 className="mt-1 text-2xl font-black tracking-wide text-white sm:text-3xl">
                        {tournament.champion.teamName}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-300">
                        Franchise GM: <strong>{tournament.champion.ownerName}</strong> • Grand Final
                        Victory: {tournament.playoffs.grandFinal.winMargin}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setPosterOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Champion Poster (PNG)</span>
                  </button>
                </div>
              </div>

              {/* Playoffs Bracket (Q1, Eliminator, Q2, Final) */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      IPL Playoffs Knockout Stage
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">Top 4 League Teams Advance</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Qualifier 1 */}
                  <PlayoffMatchCard
                    title="QUALIFIER 1"
                    match={tournament.playoffs.qualifier1}
                    note="Winner -> Final, Loser -> Q2"
                  />
                  {/* Eliminator */}
                  <PlayoffMatchCard
                    title="ELIMINATOR"
                    match={tournament.playoffs.eliminator}
                    note="Winner -> Q2, Loser Knocked Out"
                  />
                  {/* Qualifier 2 */}
                  <PlayoffMatchCard
                    title="QUALIFIER 2"
                    match={tournament.playoffs.qualifier2}
                    note="Winner -> Final"
                  />
                  {/* Grand Final */}
                  <PlayoffMatchCard
                    title="IPL GRAND FINAL 🏆"
                    match={tournament.playoffs.grandFinal}
                    isFinal
                  />
                </div>
              </div>

              {/* Official Points Table */}
              <div className="rounded-2xl border border-white/10 bg-stadium-950 overflow-hidden shadow-xl">
                <div className="border-b border-white/10 bg-stadium-900 px-4 py-3 sm:px-6">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    League Stage Points Table (45 Matches Played)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Rank 1–4 qualify for IPL Playoffs • Sorted by Points, then Net Run Rate (NRR)
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-stadium-900/60 text-[11px] font-bold uppercase text-slate-400">
                      <tr>
                        <th className="py-2.5 pl-4 pr-2">#</th>
                        <th className="px-3 py-2.5">Team</th>
                        <th className="px-2 py-2.5 text-center">P</th>
                        <th className="px-2 py-2.5 text-center">W</th>
                        <th className="px-2 py-2.5 text-center">L</th>
                        <th className="px-3 py-2.5 text-center font-bold text-amber-300">PTS</th>
                        <th className="px-3 py-2.5 text-right font-mono">NRR</th>
                        <th className="py-2.5 pl-3 pr-4 text-center">Recent Form</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {tournament.pointsTable.map((row, idx) => {
                        const isPlayoffs = idx < 4;
                        const meta = getFranchiseMeta(row.teamCode);

                        return (
                          <tr
                            key={row.teamCode}
                            className={`transition hover:bg-white/5 ${
                              isPlayoffs ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="flex h-6 w-8 shrink-0 items-center justify-center rounded text-[10px] font-black text-stadium-950"
                                  style={{ backgroundColor: meta?.primaryColor || '#F59E0B' }}
                                >
                                  {row.teamCode}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">{row.teamName}</span>
                                    {isPlayoffs && (
                                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-300">
                                        Q
                                      </span>
                                    )}
                                    {(() => {
                                      const teamObj = simTeams.find((t) => t.teamCode === row.teamCode);
                                      if (!teamObj) return null;
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => setEditingTeam(teamObj)}
                                          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.2 text-[9px] font-bold text-slate-400 transition hover:bg-amber-500/20 hover:text-amber-300"
                                          title="Customize Lineup & Captains"
                                        >
                                          Lineup 🏏
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-300">{row.played}</td>
                            <td className="px-2 py-2.5 text-center font-bold text-emerald-400">
                              {row.won}
                            </td>
                            <td className="px-2 py-2.5 text-center text-rose-400">{row.lost}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-sm font-black text-amber-300">
                              {row.points}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-mono text-xs font-bold ${
                                row.netRunRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {row.netRunRate >= 0 ? `+${row.netRunRate}` : row.netRunRate}
                            </td>
                            <td className="py-2.5 pl-3 pr-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {row.form.map((f, i) => (
                                  <span
                                    key={i}
                                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                                      f === 'W'
                                        ? 'bg-emerald-500 text-stadium-950'
                                        : 'bg-rose-500/20 text-rose-300'
                                    }`}
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXHIBITION MATCH CENTER */}
          {activeTab === 'match' && (
            <div className="space-y-6">
              {/* Match Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-stadium-950 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Team A:</span>
                    <select
                      value={teamACode}
                      onChange={(e) => setTeamACode(e.target.value as TeamCode)}
                      className="rounded-xl border border-white/15 bg-stadium-900 px-3 py-1.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                    >
                      {teams.map((t) => (
                        <option key={t.teamCode} value={t.teamCode}>
                          {t.teamName} ({t.teamCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="font-mono text-sm font-black text-amber-400">VS</span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Team B:</span>
                    <select
                      value={teamBCode}
                      onChange={(e) => setTeamBCode(e.target.value as TeamCode)}
                      className="rounded-xl border border-white/15 bg-stadium-900 px-3 py-1.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                    >
                      {teams.map((t) => (
                        <option key={t.teamCode} value={t.teamCode}>
                          {t.teamName} ({t.teamCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleRunExhibitionMatch}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                >
                  <Play className="h-4 w-4" />
                  <span>Simulate 20-Over Match</span>
                </button>
              </div>

              {/* Match Result Card */}
              {exhibitionMatch && (
                <div className="space-y-4">
                  {/* Match Header Strip */}
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-stadium-950 via-stadium-900 to-stadium-950 p-5 shadow-xl text-center">
                    <p className="text-xs font-semibold text-slate-400">{exhibitionMatch.venue}</p>
                    <div className="my-2 flex items-center justify-center gap-6">
                      {/* Team 1 Score */}
                      <div className="text-right">
                        <div className="text-lg font-black text-white sm:text-2xl">
                          {exhibitionMatch.innings1.battingTeamCode}
                        </div>
                        <div className="font-mono text-xl font-black text-amber-300 sm:text-3xl">
                          {exhibitionMatch.innings1.totalRuns}/
                          {exhibitionMatch.innings1.totalWickets}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {exhibitionMatch.innings1.oversCompleted} ov
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                          T20
                        </span>
                        <span className="my-1 text-slate-600 font-mono">VS</span>
                      </div>

                      {/* Team 2 Score */}
                      <div className="text-left">
                        <div className="text-lg font-black text-white sm:text-2xl">
                          {exhibitionMatch.innings2.battingTeamCode}
                        </div>
                        <div className="font-mono text-xl font-black text-amber-300 sm:text-3xl">
                          {exhibitionMatch.innings2.totalRuns}/
                          {exhibitionMatch.innings2.totalWickets}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {exhibitionMatch.innings2.oversCompleted} ov
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-black text-emerald-300">
                      🏆 {exhibitionMatch.winMargin}
                    </div>

                    {/* Player of the Match */}
                    <div className="mt-2 text-xs text-slate-300">
                      ⭐ <strong>Player of the Match:</strong>{' '}
                      {exhibitionMatch.playerOfTheMatch.player.name} (
                      {exhibitionMatch.playerOfTheMatch.teamCode}) —{' '}
                      <span className="text-amber-300">
                        {exhibitionMatch.playerOfTheMatch.summary}
                      </span>
                    </div>
                  </div>

                  {/* Innings Scorecard Switcher */}
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <button
                      onClick={() => setActiveInningsTab(1)}
                      className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                        activeInningsTab === 1
                          ? 'bg-amber-500 text-stadium-950 font-black'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      1st Innings ({exhibitionMatch.innings1.battingTeamCode})
                    </button>
                    <button
                      onClick={() => setActiveInningsTab(2)}
                      className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                        activeInningsTab === 2
                          ? 'bg-amber-500 text-stadium-950 font-black'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      2nd Innings ({exhibitionMatch.innings2.battingTeamCode})
                    </button>
                  </div>

                  {/* Detailed Scorecard Table */}
                  <ScorecardTable
                    innings={
                      activeInningsTab === 1 ? exhibitionMatch.innings1 : exhibitionMatch.innings2
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEASON AWARDS (ORANGE CAP, PURPLE CAP, MVP) */}
          {activeTab === 'awards' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Orange Cap */}
                <div className="relative overflow-hidden rounded-2xl border border-orange-500/40 bg-gradient-to-b from-orange-500/20 via-stadium-950 to-stadium-950 p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-stadium-950">
                      ORANGE CAP
                    </span>
                    <Flame className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="font-mono text-3xl font-black text-orange-400">
                    {tournament.awards.orangeCap.runs}
                    <span className="text-xs font-normal text-slate-400 ml-1">RUNS</span>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-white">
                    {tournament.awards.orangeCap.player.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tournament.awards.orangeCap.teamCode} •{' '}
                    {tournament.awards.orangeCap.innings} Innings Batted
                  </div>
                </div>

                {/* Purple Cap */}
                <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-500/20 via-stadium-950 to-stadium-950 p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded bg-purple-400 px-2 py-0.5 text-[10px] font-black uppercase text-stadium-950">
                      PURPLE CAP
                    </span>
                    <Award className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="font-mono text-3xl font-black text-purple-300">
                    {tournament.awards.purpleCap.wickets}
                    <span className="text-xs font-normal text-slate-400 ml-1">WICKETS</span>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-white">
                    {tournament.awards.purpleCap.player.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tournament.awards.purpleCap.teamCode} •{' '}
                    {tournament.awards.purpleCap.economy} Econ Rate
                  </div>
                </div>

                {/* Tournament MVP */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/20 via-stadium-950 to-stadium-950 p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-stadium-950">
                      TOURNAMENT MVP
                    </span>
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="font-mono text-3xl font-black text-amber-300">
                    {tournament.awards.mvp.score}
                    <span className="text-xs font-normal text-slate-400 ml-1">PTS</span>
                  </div>
                  <div className="mt-2 text-base font-extrabold text-white">
                    {tournament.awards.mvp.player.name}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-1">
                    {tournament.awards.mvp.summary}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Champion Squad Poster Modal */}
      {posterOpen && (
        <SquadPosterModal
          open={posterOpen}
          onClose={() => setPosterOpen(false)}
          teamCode={tournament.champion.teamCode}
          teamName={tournament.champion.teamName}
          ownerName={tournament.champion.ownerName}
          purseRemainingLakhs={12000 - tournament.champion.purseSpentLakhs}
          totalPurseLakhs={12000}
          squad={
            tournament.champion.fullSquad && tournament.champion.fullSquad.length > 0
              ? tournament.champion.fullSquad
              : tournament.champion.bestPlayingXI
          }
          analysis={tournament.champion}
        />
      )}

      {/* Interactive Lineup & Captains Builder Modal */}
      {editingTeam && (
        <LineupBuilderModal
          open={Boolean(editingTeam)}
          onClose={() => setEditingTeam(null)}
          team={editingTeam}
          onSaveLineup={handleSaveTeamLineup}
        />
      )}
    </div>
  );
};

// Playoff Match Card Helper
function PlayoffMatchCard({
  title,
  match,
  note,
  isFinal,
}: {
  title: string;
  match: MatchSimulationResult;
  note?: string;
  isFinal?: boolean;
}) {
  const winnerCode = match.winnerTeamCode;

  return (
    <div
      className={`rounded-xl border p-3.5 transition ${
        isFinal
          ? 'border-amber-400/50 bg-gradient-to-b from-amber-500/20 to-stadium-950 shadow-lg'
          : 'border-white/10 bg-stadium-950'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`text-[10px] font-black uppercase tracking-wider ${
            isFinal ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          {title}
        </span>
        {isFinal && <Trophy className="h-3 w-3 text-amber-400" />}
      </div>

      <div className="space-y-1.5">
        <div
          className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
            winnerCode === match.innings1.battingTeamCode
              ? 'bg-amber-500/20 font-black text-amber-300'
              : 'text-slate-300'
          }`}
        >
          <span>{match.innings1.battingTeamCode}</span>
          <span className="font-mono">
            {match.innings1.totalRuns}/{match.innings1.totalWickets} ({match.innings1.oversCompleted})
          </span>
        </div>

        <div
          className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
            winnerCode === match.innings2.battingTeamCode
              ? 'bg-amber-500/20 font-black text-amber-300'
              : 'text-slate-300'
          }`}
        >
          <span>{match.innings2.battingTeamCode}</span>
          <span className="font-mono">
            {match.innings2.totalRuns}/{match.innings2.totalWickets} ({match.innings2.oversCompleted})
          </span>
        </div>
      </div>

      <div className="mt-2 text-[10px] font-bold text-emerald-400 truncate">
        {match.winMargin}
      </div>
      {note && <div className="text-[9px] text-slate-500 mt-0.5">{note}</div>}
    </div>
  );
}

// Full Scorecard Table Helper
function ScorecardTable({ innings }: { innings: InningsSimulation }) {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-stadium-950 p-4">
      {/* Batting Card */}
      <div>
        <h5 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-300">
          Batting Card — {innings.battingTeamCode} ({innings.totalRuns}/{innings.totalWickets})
        </h5>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-1.5">Batter</th>
                <th className="py-1.5">Dismissal</th>
                <th className="py-1.5 text-right">R</th>
                <th className="py-1.5 text-right">B</th>
                <th className="py-1.5 text-right">4s</th>
                <th className="py-1.5 text-right">6s</th>
                <th className="py-1.5 text-right font-mono">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {innings.batters
                .filter((b: BatterScorecard) => b.balls > 0 || b.isOut)
                .map((b: BatterScorecard) => (
                  <tr key={b.id}>
                    <td className="py-2">
                      <span className="font-bold text-white">{b.name}</span>
                      {b.isCaptain && (
                        <span className="ml-1 rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black text-stadium-950">
                          (C) 👑
                        </span>
                      )}
                      {b.isViceCaptain && (
                        <span className="ml-1 rounded bg-sky-400 px-1 py-0.2 text-[8px] font-black text-stadium-950">
                          (VC) 🎖️
                        </span>
                      )}
                      <span className="ml-1 text-[9px] text-slate-500">[{b.role}]</span>
                      {b.isImpactSub && (
                        <span className="ml-1 rounded bg-purple-400 px-1 text-[8px] font-black text-stadium-950">
                          SUB
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-[11px] text-slate-400">
                      {b.isOut ? b.dismissal : 'not out'}
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-amber-300">{b.runs}</td>
                    <td className="py-2 text-right font-mono text-slate-400">{b.balls}</td>
                    <td className="py-2 text-right font-mono text-slate-300">{b.fours}</td>
                    <td className="py-2 text-right font-mono text-sky-400 font-bold">{b.sixes}</td>
                    <td className="py-2 text-right font-mono text-slate-400">{b.strikeRate}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bowling Card */}
      <div className="border-t border-white/10 pt-3">
        <h5 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-300">
          Bowling Card — {innings.bowlingTeamCode}
        </h5>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-1.5">Bowler</th>
                <th className="py-1.5 text-right">O</th>
                <th className="py-1.5 text-right">M</th>
                <th className="py-1.5 text-right">R</th>
                <th className="py-1.5 text-right font-bold text-emerald-400">W</th>
                <th className="py-1.5 text-right font-mono">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {innings.bowlers
                .filter((bw: BowlerScorecard) => bw.overs > 0)
                .map((bw: BowlerScorecard) => (
                  <tr key={bw.id}>
                    <td className="py-2 font-bold text-white">
                      <span>{bw.name}</span>
                      {bw.isCaptain && (
                        <span className="ml-1 rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black text-stadium-950">
                          (C) 👑
                        </span>
                      )}
                      {bw.isViceCaptain && (
                        <span className="ml-1 rounded bg-sky-400 px-1 py-0.2 text-[8px] font-black text-stadium-950">
                          (VC) 🎖️
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-300">{bw.overs}</td>
                    <td className="py-2 text-right font-mono text-slate-400">{bw.maidens}</td>
                    <td className="py-2 text-right font-mono text-slate-300">{bw.runsConceded}</td>
                    <td className="py-2 text-right font-mono font-bold text-emerald-400">
                      {bw.wickets}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">{bw.economy}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fall of Wickets */}
      {innings.fallOfWickets.length > 0 && (
        <div className="border-t border-white/10 pt-2 text-xs text-slate-400">
          <strong className="text-white">Fall of Wickets:</strong>{' '}
          {innings.fallOfWickets.map((f: { score: number; wicketNumber: number; batterName: string; over: string }, i: number) => (
            <span key={i} className="mr-2">
              {f.score}/{f.wicketNumber} ({f.batterName}, {f.over} ov)
              {i < innings.fallOfWickets.length - 1 ? ',' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
