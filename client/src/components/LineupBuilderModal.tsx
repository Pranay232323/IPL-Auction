import React, { useMemo, useState } from 'react';
import {
  X,
  Crown,
  Star,
  Zap,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Users,
  Shield,
  Award,
} from 'lucide-react';
import { SquadBoughtPlayer, TeamAnalysisRank, TeamCode } from '../types';
import { formatLakhs, getFranchiseMeta, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { evaluateTeamPotential } from '../utils/teamPotentialEvaluator';

interface LineupBuilderModalProps {
  open: boolean;
  onClose: () => void;
  team: TeamAnalysisRank;
  onSaveLineup: (updatedTeam: TeamAnalysisRank) => void;
}

export const LineupBuilderModal: React.FC<LineupBuilderModalProps> = ({
  open,
  onClose,
  team,
  onSaveLineup,
}) => {
  const fullSquad = useMemo(() => {
    return team.fullSquad && team.fullSquad.length > 0
      ? team.fullSquad
      : team.bestPlayingXI && team.bestPlayingXI.length > 0
        ? team.bestPlayingXI
        : [];
  }, [team]);

  // Current Playing XI (ordered 1 to 11)
  const [playingXI, setPlayingXI] = useState<SquadBoughtPlayer[]>(() => {
    return team.bestPlayingXI && team.bestPlayingXI.length > 0
      ? [...team.bestPlayingXI]
      : fullSquad.slice(0, 11);
  });

  // Impact Player
  const [impactPlayer, setImpactPlayer] = useState<SquadBoughtPlayer | null>(() => {
    return team.impactPlayer || null;
  });

  // Captain & Vice-Captain
  const [captainId, setCaptainId] = useState<number | null>(() => {
    return team.captain?.id || playingXI[0]?.id || null;
  });
  const [viceCaptainId, setViceCaptainId] = useState<number | null>(() => {
    return team.viceCaptain?.id || playingXI[1]?.id || null;
  });

  const franchise = getFranchiseMeta(team.teamCode);
  const primaryColor = franchise?.primaryColor || '#F59E0B';

  // Available Bench Players (excluding those in Playing XI and impact player)
  const xiIds = useMemo(() => new Set(playingXI.map((p) => p.id)), [playingXI]);
  const benchPlayers = useMemo(() => {
    return fullSquad.filter((p) => !xiIds.has(p.id) && p.id !== impactPlayer?.id);
  }, [fullSquad, xiIds, impactPlayer]);

  // Constraints & Counts
  const overseasCount = playingXI.filter((p) => p.isOverseas).length;
  const wkCount = playingXI.filter((p) => p.role === 'WK').length;
  const bowlingOptions = playingXI.filter(
    (p) => p.role === 'BOWL' || (p.role === 'AR' && p.bowlingRating >= 60)
  ).length;

  const isOverseasValid = overseasCount <= 4;
  const isWkValid = wkCount >= 1;
  const isSizeValid = playingXI.length === 11 || (fullSquad.length < 11 && playingXI.length === fullSquad.length);
  const isBowlersValid = bowlingOptions >= 5 || playingXI.length < 11;
  const isReady = isOverseasValid && isWkValid && isSizeValid;

  const captainPlayer = playingXI.find((p) => p.id === captainId) || playingXI[0] || null;
  const viceCaptainPlayer =
    playingXI.find((p) => p.id === viceCaptainId && p.id !== captainId) ||
    playingXI.find((p) => p.id !== captainPlayer?.id) ||
    null;

  // Live Team Potential Preview
  const previewPotential = useMemo(() => {
    return evaluateTeamPotential(
      team.teamCode,
      team.teamName,
      playingXI,
      impactPlayer,
      captainPlayer,
      viceCaptainPlayer,
      fullSquad
    );
  }, [team.teamCode, team.teamName, playingXI, impactPlayer, captainPlayer, viceCaptainPlayer, fullSquad]);

  if (!open) return null;

  // Actions
  const handleRemoveFromXI = (player: SquadBoughtPlayer) => {
    setPlayingXI((prev) => prev.filter((p) => p.id !== player.id));
    if (captainId === player.id) setCaptainId(null);
    if (viceCaptainId === player.id) setViceCaptainId(null);
  };

  const handleAddToXI = (player: SquadBoughtPlayer) => {
    if (playingXI.length >= 11) return;
    setPlayingXI((prev) => [...prev, player]);
  };

  const handleSelectImpact = (player: SquadBoughtPlayer) => {
    if (impactPlayer?.id === player.id) {
      setImpactPlayer(null);
    } else {
      setImpactPlayer(player);
    }
  };

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    setPlayingXI((prev) => {
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= playingXI.length - 1) return;
    setPlayingXI((prev) => {
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const handleAutoOptimize = () => {
    // Reset to optimal 11
    const sorted = [...fullSquad].sort((a, b) => b.overallRating - a.overallRating);
    const xi: SquadBoughtPlayer[] = [];
    const usedIds = new Set<number>();
    let osCount = 0;

    const tryAdd = (p: SquadBoughtPlayer) => {
      if (usedIds.has(p.id)) return false;
      if (p.isOverseas && osCount >= 4) return false;
      xi.push(p);
      usedIds.add(p.id);
      if (p.isOverseas) osCount++;
      return true;
    };

    // 1 WK
    const topWk = sorted.find((p) => p.role === 'WK');
    if (topWk) tryAdd(topWk);

    // 5 Bowlers / ARs
    const bowlers = sorted.filter(
      (p) => p.role === 'BOWL' || (p.role === 'AR' && p.bowlingRating >= 60)
    );
    let addedB = 0;
    for (const b of bowlers) {
      if (addedB >= 5 || xi.length >= 11) break;
      if (tryAdd(b)) addedB++;
    }

    // Remaining top batters / stars
    for (const p of sorted) {
      if (xi.length >= 11) break;
      tryAdd(p);
    }

    // Authentic batting order sort
    xi.sort((a, b) => {
      const roleWeight = (p: SquadBoughtPlayer) =>
        p.role === 'BAT' || p.role === 'WK' ? 1 : p.role === 'AR' ? 2 : 3;
      const d = roleWeight(a) - roleWeight(b);
      if (d !== 0) return d;
      return b.battingRating - a.battingRating;
    });

    setPlayingXI(xi);

    // Impact Sub: best remaining player
    const remaining = sorted.filter((p) => !usedIds.has(p.id));
    let impact: SquadBoughtPlayer | null = null;
    for (const r of remaining) {
      if (r.isOverseas && osCount >= 4) continue;
      impact = r;
      break;
    }
    setImpactPlayer(impact);

    // Captain selection
    const KNOWN_CAPTAIN_MASTERS = [
      'ms dhoni', 'rohit sharma', 'virat kohli', 'pat cummins', 'hardik pandya',
      'shreyas iyer', 'ruturaj gaikwad', 'kl rahul', 'sanju samson', 'rishabh pant',
    ];
    let cap = xi.find((p) => KNOWN_CAPTAIN_MASTERS.some((m) => p.name.toLowerCase().includes(m))) || xi[0];
    setCaptainId(cap?.id || null);

    let vc = xi.find((p) => p.id !== cap?.id) || null;
    setViceCaptainId(vc?.id || null);
  };

  const handleSave = () => {
    const updated: TeamAnalysisRank = {
      ...team,
      overallScore: previewPotential.overallScore,
      grade: previewPotential.grade,
      categories: previewPotential.categories,
      punditVerdict: previewPotential.punditVerdict,
      strengths: previewPotential.strengths,
      weaknesses: previewPotential.weaknesses,
      bestPlayingXI: playingXI,
      impactPlayer,
      captain: captainPlayer,
      viceCaptain: viceCaptainPlayer,
      fullSquad,
    };
    onSaveLineup(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-5 backdrop-blur-md">
      <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-stadium-950 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-900/95 px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-13 shrink-0 items-center justify-center rounded-xl text-sm font-black text-stadium-950 shadow"
              style={{ backgroundColor: primaryColor }}
            >
              {team.teamCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-white sm:text-lg">
                  {team.teamName} — Playing XI & Strategy Room
                </h2>
                <span className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                  Interactive Builder
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Craft your match-day Starting XI, assign Captain & Vice-Captain, and pick your Impact Sub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoOptimize}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Auto-Optimize</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Validation & Potential Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-900/60 px-5 py-2.5 sm:px-7">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold ${
                isSizeValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <span>Squad:</span>
              <strong>{playingXI.length} / 11</strong>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold ${
                isOverseasValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <span>Overseas:</span>
              <strong>{overseasCount} / 4 ✈️</strong>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold ${
                isWkValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <span>Wicketkeeper:</span>
              <strong>{wkCount >= 1 ? '1+ Selected 🧤' : 'Missing WK ⚠️'}</strong>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold ${
                isBowlersValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span>Bowlers:</span>
              <strong>{bowlingOptions} Options 🎯</strong>
            </div>
          </div>

          {/* Real-time AI Potential Score Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <span className="text-[10px] uppercase text-slate-400">Projected Potential:</span>
              <div className="font-mono text-sm font-black text-amber-300">
                {previewPotential.overallScore} / 100 ({previewPotential.grade})
              </div>
            </div>

            <button
              type="button"
              disabled={!isReady}
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-2 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm Playing XI</span>
            </button>
          </div>
        </div>

        {/* Builder Content Area */}
        <div className="grid flex-1 overflow-hidden lg:grid-cols-12">
          {/* LEFT 7 COLS: Current Playing XI (Batting Order #1 to #11) */}
          <div className="flex flex-col overflow-hidden border-b border-white/10 lg:col-span-7 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-white/10 bg-stadium-900/40 px-5 py-2.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                <Shield className="h-4 w-4 text-amber-400" />
                <span>Starting Playing XI ({playingXI.length}/11)</span>
              </div>
              <span className="text-[11px] text-slate-400">Use arrows to adjust batting order</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {playingXI.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-xs text-slate-400">
                  No players in Playing XI yet. Pick players from your squad on the right!
                </div>
              ) : (
                playingXI.map((p, idx) => {
                  const isCap = p.id === captainId;
                  const isVc = p.id === viceCaptainId && !isCap;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between rounded-2xl border p-2.5 transition ${
                        isCap
                          ? 'border-amber-400/60 bg-amber-500/10'
                          : isVc
                            ? 'border-sky-400/50 bg-sky-500/10'
                            : 'border-white/10 bg-stadium-900/90'
                      }`}
                    >
                      {/* Left: Index + Reorder Buttons + Headshot */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="text-slate-500 hover:text-white disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs font-black text-slate-400">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === playingXI.length - 1}
                            className="text-slate-500 hover:text-white disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>

                        <PlayerHeadshot player={p} teamCode={team.teamCode} size="sm" />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${roleBadgeClasses(
                                p.role
                              )}`}
                            >
                              {p.role}
                            </span>
                            <span className="truncate font-black text-white text-xs sm:text-sm">
                              {p.name}
                            </span>
                            {p.isOverseas && <span className="text-xs">✈️</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-bold text-amber-300">{p.overallRating} OVR</span>
                            <span>•</span>
                            <span>{formatLakhs(p.soldPriceLakhs)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Leadership (C / VC) Toggles & Remove Action */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCap) setCaptainId(null);
                            else {
                              setCaptainId(p.id);
                              if (viceCaptainId === p.id) setViceCaptainId(null);
                            }
                          }}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold transition ${
                            isCap
                              ? 'bg-amber-400 text-stadium-950 shadow'
                              : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                          title="Assign as Captain"
                        >
                          <Crown className="h-3 w-3" />
                          <span>{isCap ? 'Captain (C)' : 'Make C'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isVc) setViceCaptainId(null);
                            else {
                              setViceCaptainId(p.id);
                              if (captainId === p.id) setCaptainId(null);
                            }
                          }}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold transition ${
                            isVc
                              ? 'bg-sky-400 text-stadium-950 shadow'
                              : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                          title="Assign as Vice-Captain"
                        >
                          <Star className="h-3 w-3" />
                          <span>{isVc ? 'VC' : 'Make VC'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromXI(p)}
                          className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20"
                          title="Move to Bench"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Impact Player Slot at bottom of column */}
            <div className="border-t border-white/10 bg-stadium-950/80 p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-300">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span>Designated Impact Player (#12 Sub)</span>
                </span>
                {impactPlayer && (
                  <button
                    type="button"
                    onClick={() => setImpactPlayer(null)}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Remove Sub
                  </button>
                )}
              </div>

              {impactPlayer ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-purple-500/40 bg-purple-500/15 p-2.5">
                  <div className="flex items-center gap-2.5">
                    <PlayerHeadshot player={impactPlayer} teamCode={team.teamCode} size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{impactPlayer.name}</span>
                        <span
                          className={`rounded border px-1 py-0.2 text-[9px] font-bold ${roleBadgeClasses(
                            impactPlayer.role
                          )}`}
                        >
                          {impactPlayer.role}
                        </span>
                        {impactPlayer.isOverseas && <span className="text-xs">✈️</span>}
                      </div>
                      <div className="text-[10px] text-purple-200">
                        {impactPlayer.overallRating} OVR • {formatLakhs(impactPlayer.soldPriceLakhs)}
                      </div>
                    </div>
                  </div>
                  <span className="rounded bg-purple-500 px-2 py-0.5 text-[10px] font-black text-stadium-950">
                    MATCH SUB
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-slate-400">
                  No impact player assigned. Click <strong>"Make Impact Sub"</strong> on any bench
                  player to your right.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: Available Bench Reserves Squad */}
          <div className="flex flex-col overflow-hidden lg:col-span-5 bg-stadium-900/30">
            <div className="flex items-center justify-between border-b border-white/10 bg-stadium-900/40 px-5 py-2.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                <Users className="h-4 w-4 text-sky-400" />
                <span>Squad Reserves ({benchPlayers.length} Available)</span>
              </div>
              <span className="text-[11px] text-slate-400">Click to add to Playing XI</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {benchPlayers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-slate-400">
                  All drafted squad members are currently in your Playing XI or Impact Sub!
                </div>
              ) : (
                benchPlayers.map((bp) => (
                  <div
                    key={bp.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-stadium-900/90 p-2.5 text-xs transition hover:border-white/20"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerHeadshot player={bp} teamCode={team.teamCode} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${roleBadgeClasses(
                              bp.role
                            )}`}
                          >
                            {bp.role}
                          </span>
                          <span className="truncate font-black text-white">{bp.name}</span>
                          {bp.isOverseas && <span className="text-xs">✈️</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {bp.overallRating} OVR • {formatLakhs(bp.soldPriceLakhs)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectImpact(bp)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                          impactPlayer?.id === bp.id
                            ? 'bg-purple-500 text-stadium-950 font-black'
                            : 'border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                        }`}
                        title="Set as Impact Player"
                      >
                        ⚡ Impact
                      </button>

                      <button
                        type="button"
                        disabled={playingXI.length >= 11}
                        onClick={() => handleAddToXI(bp)}
                        className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-extrabold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        + Add to XI
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
