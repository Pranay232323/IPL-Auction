import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Share2,
  Check,
  Trophy,
  Sparkles,
  Users,
  Layers,
  Crown,
  ShieldAlert,
} from 'lucide-react';
import { PlayerDTO, TeamAnalysisRank, TeamCode } from '../types';
import {
  copySquadSummaryText,
  downloadFullSquadPosterPng,
  downloadPlayingXIPosterPng,
  generateSquadCsv,
  SquadPlayerItem,
  SquadPosterOptions,
} from '../utils/exportSquad';
import { formatLakhs, getFranchiseMeta, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';

interface SquadPosterModalProps {
  open: boolean;
  onClose: () => void;
  teamCode: TeamCode;
  teamName: string;
  ownerName: string;
  purseRemainingLakhs: number;
  totalPurseLakhs: number;
  squad: SquadPlayerItem[];
  analysis?: TeamAnalysisRank;
}

export const SquadPosterModal: React.FC<SquadPosterModalProps> = ({
  open,
  onClose,
  teamCode,
  teamName,
  ownerName,
  purseRemainingLakhs,
  totalPurseLakhs,
  squad: initialSquad,
  analysis,
}) => {
  const [posterMode, setPosterMode] = useState<'full' | 'xi'>('full');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  // Use fullSquad if available from analysis report, otherwise fall back to initialSquad
  const allSquad: SquadPlayerItem[] =
    analysis?.fullSquad && analysis.fullSquad.length > 0
      ? analysis.fullSquad
      : initialSquad && initialSquad.length > 0
        ? initialSquad
        : analysis?.bestPlayingXI || [];

  const franchise = getFranchiseMeta(teamCode);
  const primaryColor = franchise?.primaryColor || '#F59E0B';
  const totalSpent = allSquad.reduce((sum, p) => sum + (p.soldPriceLakhs || 0), 0);
  const overseasCount = allSquad.filter((p) => p.isOverseas).length;

  const xi = analysis?.bestPlayingXI || allSquad.slice(0, 11);
  const impactPlayer = analysis?.impactPlayer || null;
  const captain = analysis?.captain || xi[0] || null;
  const viceCaptain = analysis?.viceCaptain || (xi[1]?.id !== captain?.id ? xi[1] : xi[2]) || null;

  const options: SquadPosterOptions = {
    teamCode,
    teamName,
    ownerName,
    purseRemainingLakhs,
    totalPurseLakhs,
    squad: allSquad,
    analysis,
    captainId: captain?.id,
    viceCaptainId: viceCaptain?.id,
  };

  const handleDownloadFullSquad = async () => {
    setDownloading(true);
    try {
      await downloadFullSquadPosterPng(options);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPlayingXI = async () => {
    setDownloading(true);
    try {
      await downloadPlayingXIPosterPng(options);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    const success = await copySquadSummaryText(
      teamCode,
      teamName,
      ownerName,
      allSquad,
      analysis,
      posterMode
    );
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExportCsv = () => {
    generateSquadCsv(teamCode, teamName, allSquad);
  };

  const roles: { role: 'WK' | 'BAT' | 'AR' | 'BOWL'; label: string; icon: string; color: string }[] = [
    { role: 'WK', label: 'Wicketkeepers', icon: '🧤', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
    { role: 'BAT', label: 'Batters', icon: '🏏', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    { role: 'AR', label: 'All-Rounders', icon: '⚡', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { role: 'BOWL', label: 'Bowlers', icon: '🎯', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-5 backdrop-blur-md">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-stadium-950 shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-900/90 px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-black text-stadium-950 shadow"
              style={{ backgroundColor: primaryColor }}
            >
              {teamCode}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-white sm:text-lg">
                  {teamName}
                </h2>
                <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-300">
                  IPL 2026 Official
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Franchise GM: <strong className="text-white">{ownerName}</strong> • {allSquad.length}{' '}
                Players in Squad ({overseasCount} Overseas)
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setPosterMode('full')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  posterMode === 'full'
                    ? 'bg-amber-500 text-stadium-950 shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Full 25-Squad Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPosterMode('xi')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  posterMode === 'xi'
                    ? 'bg-amber-500 text-stadium-950 shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Playing XI + Impact</span>
              </button>
            </div>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title="Copy formatted squad text"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title="Download squad spreadsheet (.csv)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={onClose}
              className="ml-1 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dual Download Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-900/60 px-5 py-2.5 sm:px-7">
          <div className="text-xs text-slate-300">
            <span className="text-amber-300 font-bold">2 Official HD Download Options:</span> Pick
            Full Squad Poster or Match-Day Playing XI Card below:
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFullSquad}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-black text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? 'Rendering...' : 'Download Full 25-Squad (PNG)'}</span>
            </button>

            <button
              onClick={handleDownloadPlayingXI}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-1.5 text-xs font-black text-stadium-950 shadow-md shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? 'Rendering...' : 'Download Playing XI + Impact (PNG)'}</span>
            </button>
          </div>
        </div>

        {/* Visual Poster Card Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-stadium-900 via-stadium-950 to-stadium-950 p-6 shadow-2xl">
            {/* Top Glowing Strip */}
            <div
              className="absolute inset-x-0 top-0 h-2 shadow-lg"
              style={{ backgroundColor: primaryColor }}
            />

            {/* Franchise Banner */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stadium-950/90 border border-white/20 p-1.5 shadow-lg">
                  <FranchiseLogo teamCode={teamCode} size="lg" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider text-white sm:text-2xl">
                    {teamName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span className="text-amber-300">
                      {posterMode === 'full'
                        ? 'OFFICIAL 25-MEMBER SQUAD ROSTER'
                        : 'MATCH-DAY PLAYING XI & IMPACT SUB'}
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">GM: {ownerName.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {analysis && (
                <div className="rounded-2xl border border-white/10 bg-stadium-900/90 px-4 py-2 text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-400">AI Potential</div>
                  <div className="text-base font-black text-amber-300">
                    Rank #{analysis.rank} • {analysis.grade}
                  </div>
                  <div className="text-[10px] font-bold text-sky-300">
                    {analysis.winProbabilityPct}% Win Odds
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Strip */}
            <div className="mb-6 grid grid-cols-2 gap-2.5 text-center text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Spent</span>
                <strong className="mt-0.5 block text-base font-black text-amber-300">
                  {formatLakhs(totalSpent)}
                </strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Purse Left</span>
                <strong className="mt-0.5 block text-base font-black text-emerald-400">
                  {formatLakhs(purseRemainingLakhs)}
                </strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Squad Size</span>
                <strong className="mt-0.5 block text-base font-black text-white">
                  {allSquad.length} / 25
                </strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Overseas</span>
                <strong className="mt-0.5 block text-base font-black text-sky-300">
                  {overseasCount} / 8
                </strong>
              </div>
            </div>

            {/* PREVIEW VIEW 1: FULL 25-MEMBER SQUAD CATEGORIZED BY ROLE */}
            {posterMode === 'full' && (
              <div className="space-y-5">
                {roles.map((sec) => {
                  const list = allSquad.filter((p) => p.role === sec.role);
                  if (list.length === 0) return null;

                  return (
                    <div key={sec.role} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className={`text-xs font-black uppercase tracking-wider ${sec.color.split(' ')[0]}`}>
                          {sec.icon} {sec.label} ({list.length})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Avg: {Math.round(list.reduce((s, p) => s + p.overallRating, 0) / list.length)} OVR
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {list.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-stadium-900/80 px-3 py-2 text-xs transition hover:border-white/20"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerHeadshot player={p} teamCode={teamCode} size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-black text-white">
                                    {p.name}
                                  </span>
                                  {p.isOverseas && <span className="text-xs">✈️</span>}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span className="font-extrabold text-amber-300">
                                    {p.overallRating} OVR
                                  </span>
                                  <span>•</span>
                                  <span>{p.isCapped ? 'Capped' : 'Uncapped'}</span>
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 font-mono text-xs font-black text-amber-300">
                              {formatLakhs(p.soldPriceLakhs)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PREVIEW VIEW 2: PLAYING XI + IMPACT PLAYER */}
            {posterMode === 'xi' && (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-extrabold uppercase tracking-wider text-amber-400">
                      ⚡ Official Match-Day Starting XI (Max 4 Overseas)
                    </span>
                    <span className="text-[11px] text-slate-400">1 to 11 Batting Order</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {xi.map((p, idx) => {
                      const isCap = p.id === captain?.id;
                      const isVc = p.id === viceCaptain?.id && !isCap;

                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                            isCap
                              ? 'border-amber-400/60 bg-amber-500/10'
                              : isVc
                                ? 'border-sky-400/50 bg-sky-500/10'
                                : 'border-white/10 bg-stadium-900/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-black text-slate-500">
                              #{idx + 1}
                            </span>
                            <PlayerHeadshot player={p} teamCode={teamCode} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[9px] font-black border ${roleBadgeClasses(
                                    p.role
                                  )}`}
                                >
                                  {p.role}
                                </span>
                                <span className="truncate font-black text-white">{p.name}</span>
                                {isCap && (
                                  <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-black text-stadium-950">
                                    C 👑
                                  </span>
                                )}
                                {isVc && (
                                  <span className="rounded bg-sky-400 px-1.5 py-0.2 text-[9px] font-black text-stadium-950">
                                    VC 🎖️
                                  </span>
                                )}
                                {p.isOverseas && <span className="text-xs">✈️</span>}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Rating: <strong className="text-amber-300">{p.overallRating}</strong>
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-xs font-black text-amber-300">
                            {formatLakhs(p.soldPriceLakhs)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Impact Player Banner (WELL SEPARATED) */}
                {impactPlayer && (
                  <div className="rounded-2xl border-2 border-purple-500/50 bg-purple-500/15 p-4 shadow-lg shadow-purple-500/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-purple-500 px-2.5 py-1 text-xs font-black text-stadium-950">
                          ⚡ IMPACT SUB #12
                        </span>
                        <PlayerHeadshot player={impactPlayer} teamCode={teamCode} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">
                              {impactPlayer.name}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${roleBadgeClasses(
                                impactPlayer.role
                              )}`}
                            >
                              {impactPlayer.role}
                            </span>
                            {impactPlayer.isOverseas && <span>✈️</span>}
                          </div>
                          <p className="text-xs text-purple-200">
                            Strategic substitution to boost team balance mid-match
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-black text-amber-300">
                          {formatLakhs(impactPlayer.soldPriceLakhs)}
                        </div>
                        <div className="text-[11px] font-bold text-purple-200">
                          {impactPlayer.overallRating} OVR
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
