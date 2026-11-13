import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Share2,
  Check,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { PlayerDTO, TeamAnalysisRank, TeamCode } from '../types';
import {
  copySquadSummaryText,
  downloadSquadPosterPng,
  generateSquadCsv,
  SquadPlayerItem,
  SquadPosterOptions,
} from '../utils/exportSquad';
import { formatLakhs, getFranchiseMeta, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo, FranchiseJersey } from '../utils/franchiseAssets';
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
  squad,
  analysis,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const franchise = getFranchiseMeta(teamCode);
  const primaryColor = franchise?.primaryColor || '#F59E0B';
  const totalSpent = squad.reduce((sum, p) => sum + (p.soldPriceLakhs || 0), 0);
  const overseasCount = squad.filter((p) => p.isOverseas).length;
  const xi = analysis?.bestPlayingXI || squad.slice(0, 11);
  const bench = squad.filter((p) => !xi.some((x) => x.id === p.id));

  const options: SquadPosterOptions = {
    teamCode,
    teamName,
    ownerName,
    purseRemainingLakhs,
    totalPurseLakhs,
    squad,
    analysis,
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      await downloadSquadPosterPng(options);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    const success = await copySquadSummaryText(teamCode, teamName, ownerName, squad, analysis);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExportCsv = () => {
    generateSquadCsv(teamCode, teamName, squad);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-stadium-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-950 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-10 items-center justify-center rounded-lg text-xs font-black text-stadium-950"
              style={{ backgroundColor: primaryColor }}
            >
              {teamCode}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white sm:text-base">
                {teamName} — Official Squad Poster & Export
              </h2>
              <p className="text-xs text-slate-400">GM: {ownerName} • {squad.length} Players Drafted</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title="Copy formatted squad text to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Share Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title="Download squad spreadsheet (.csv)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-stadium-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? 'Rendering...' : 'Download HD Poster (PNG)'}</span>
            </button>

            <button
              onClick={onClose}
              className="ml-1 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Poster Visual Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-stadium-950 p-5 shadow-2xl">
            {/* Top Accent Strip */}
            <div
              className="absolute inset-x-0 top-0 h-2"
              style={{ backgroundColor: primaryColor }}
            />

            {/* Team Banner */}
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FranchiseLogo teamCode={teamCode} size="lg" />
                  <FranchiseJersey teamCode={teamCode} size="md" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    {teamName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    FRANCHISE GM: {ownerName.toUpperCase()}
                  </p>
                </div>
              </div>

              {analysis && (
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">AI PREDICTION</div>
                  <div className="text-base font-black text-amber-300">
                    Rank #{analysis.rank} • {analysis.grade}
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    {analysis.winProbabilityPct}% Win Chance
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                <span className="text-[10px] font-bold text-slate-400">TOTAL SPENT</span>
                <strong className="block text-sm font-black text-amber-300">
                  {formatLakhs(totalSpent)}
                </strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                <span className="text-[10px] font-bold text-slate-400">SQUAD SIZE</span>
                <strong className="block text-sm font-black text-white">
                  {squad.length} / 25
                </strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                <span className="text-[10px] font-bold text-slate-400">OVERSEAS</span>
                <strong className="block text-sm font-black text-purple-300">
                  {overseasCount} / 8
                </strong>
              </div>
            </div>

            {/* Playing XI List */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-amber-400">
                  ⚡ Optimal Playing XI Lineup
                </span>
                <span className="text-[10px] text-slate-400">Max 4 Overseas strictly enforced</span>
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2">
                {xi.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-stadium-900/80 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                      <PlayerHeadshot player={p} teamCode={teamCode} size="xs" />
                      <span
                        className={`rounded px-1 py-0.2 text-[9px] font-bold border ${roleBadgeClasses(
                          p.role
                        )}`}
                      >
                        {p.role}
                      </span>
                      <span className="truncate font-bold text-white">{p.name}</span>
                      {p.isOverseas && <span className="text-[10px]">✈️</span>}
                    </div>
                    <span className="font-mono text-[11px] font-bold text-amber-300">
                      {formatLakhs(p.soldPriceLakhs)}
                    </span>
                  </div>
                ))}
              </div>

              {analysis?.impactPlayer && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-purple-400 px-1 py-0.2 text-[9px] font-black text-stadium-950">
                      IMPACT SUB #12
                    </span>
                    <PlayerHeadshot player={analysis.impactPlayer} teamCode={teamCode} size="xs" />
                    <span className="font-bold text-white">
                      {analysis.impactPlayer.name} ({analysis.impactPlayer.role})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-purple-200">
                    {formatLakhs(analysis.impactPlayer.soldPriceLakhs)}
                  </span>
                </div>
              )}
            </div>

            {/* Bench Summary */}
            <div>
              <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Bench Squad ({bench.length} Reserves)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bench.map((bp) => (
                  <span
                    key={bp.id}
                    className="rounded-md border border-white/10 bg-stadium-900 px-2 py-1 text-[11px] text-slate-300"
                  >
                    {bp.name} <span className="text-[9px] text-slate-500">({bp.role})</span> •{' '}
                    <span className="font-mono text-amber-400 text-[10px]">
                      {formatLakhs(bp.soldPriceLakhs)}
                    </span>
                  </span>
                ))}
                {bench.length === 0 && (
                  <span className="text-xs text-slate-500">No bench reserves drafted.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
