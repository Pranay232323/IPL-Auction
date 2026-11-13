import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Star,
  Check,
  AlertCircle,
  Shield,
  Coins,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../api/http';
import { RetentionCandidateDTO, TeamCode } from '../types';
import { formatLakhs } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';

interface RetentionSelectionModalProps {
  roomCode: string;
  teamCode: TeamCode;
  teamName: string;
  primaryColor: string;
  secondaryColor?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const CAPPED_SLABS = [1800, 1400, 1100, 1800, 1400]; // 18Cr, 14Cr, 11Cr, 18Cr, 14Cr
const UNCAPPED_SLAB = 400; // 4Cr
const MAX_TOTAL_RETENTIONS = 5;
const MAX_UNCAPPED_RETENTIONS = 2;

export const RetentionSelectionModal: React.FC<RetentionSelectionModalProps> = ({
  roomCode,
  teamCode,
  teamName,
  primaryColor,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<RetentionCandidateDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    apiRequest<{
      candidates: RetentionCandidateDTO[];
      rtmCardsRemaining: number;
      retentionsCount: number;
      purseRemainingLakhs: number;
      initialPurseLakhs: number;
    }>(`/api/rooms/${roomCode}/retention-candidates?teamCode=${teamCode}`)
      .then((res) => {
        setCandidates(res.candidates);
        const preSelected = new Set(
          res.candidates.filter((c) => c.isRetained).map((c) => c.id)
        );
        setSelectedIds(preSelected);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load candidates.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, roomCode, teamCode]);

  const selectedPlayers = useMemo(() => {
    return candidates.filter((c) => selectedIds.has(c.id));
  }, [candidates, selectedIds]);

  const allocation = useMemo(() => {
    const capped = selectedPlayers.filter((p) => p.isCapped);
    const uncapped = selectedPlayers.filter((p) => !p.isCapped);

    // Sort capped by overallRating / marquee DESC
    capped.sort((a, b) => {
      if (b.marquee !== a.marquee) return (b.marquee ? 1 : 0) - (a.marquee ? 1 : 0);
      return b.overallRating - a.overallRating;
    });

    const items: { player: RetentionCandidateDTO; costLakhs: number; slabLabel: string }[] = [];
    let totalCost = 0;

    capped.forEach((p, idx) => {
      const cost = CAPPED_SLABS[idx] ?? 1400;
      items.push({
        player: p,
        costLakhs: cost,
        slabLabel: `Capped Slot #${idx + 1} (${formatLakhs(cost)})`,
      });
      totalCost += cost;
    });

    uncapped.forEach((p, idx) => {
      const cost = UNCAPPED_SLAB;
      items.push({
        player: p,
        costLakhs: cost,
        slabLabel: `Uncapped Slot #${idx + 1} (${formatLakhs(cost)})`,
      });
      totalCost += cost;
    });

    const rtmCards = Math.max(0, 6 - items.length);
    const purseRemaining = 12000 - totalCost;

    return {
      items,
      cappedCount: capped.length,
      uncappedCount: uncapped.length,
      totalCost,
      purseRemaining,
      rtmCards,
    };
  }, [selectedPlayers]);

  const togglePlayer = (id: number) => {
    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_TOTAL_RETENTIONS) {
          setError(`Maximum ${MAX_TOTAL_RETENTIONS} retentions allowed per franchise.`);
          return prev;
        }
        const player = candidates.find((c) => c.id === id);
        if (player && !player.isCapped) {
          const currentUncapped = Array.from(next).filter(
            (pId) => !candidates.find((c) => c.id === pId)?.isCapped
          ).length;
          if (currentUncapped >= MAX_UNCAPPED_RETENTIONS) {
            setError(`Maximum ${MAX_UNCAPPED_RETENTIONS} uncapped retentions allowed.`);
            return prev;
          }
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async (idsToSave: number[]) => {
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/rooms/${roomCode}/retentions`, {
        method: 'POST',
        body: JSON.stringify({
          teamCode,
          playerIds: idsToSave,
        }),
      });
      onSaveSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save retentions.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-stadium-950 shadow-2xl">
        {/* Header accent strip */}
        <div className="h-2 w-full" style={{ backgroundColor: primaryColor }} />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <FranchiseLogo teamCode={teamCode} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{teamName} Pre-Auction Retentions</h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  BCCI 2025 Rules
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Retain up to 5 players from your former roster. Slabs: ₹18 Cr, ₹14 Cr, ₹11 Cr
                (Capped) • ₹4 Cr (Uncapped). Remaining slots turn into RTM cards!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Calculation Bar */}
        <div className="grid grid-cols-2 gap-3 border-b border-white/10 bg-stadium-900/90 px-6 py-3 sm:grid-cols-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Retained
              </div>
              <div className="text-sm font-black text-white">
                {selectedIds.size} / 5{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({allocation.cappedCount} Cap, {allocation.uncappedCount} Uncap)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Purse Remaining
              </div>
              <div className="text-sm font-black text-emerald-400">
                {formatLakhs(allocation.purseRemaining)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Deduction Slabs
              </div>
              <div className="text-sm font-black text-rose-300">
                −{formatLakhs(allocation.totalCost)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Live RTM Cards
              </div>
              <div className="text-sm font-black text-sky-300">
                {allocation.rtmCards} RTM Cards
              </div>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="flex items-center gap-2 bg-rose-500/20 px-6 py-2.5 text-xs font-bold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body: Candidates List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-400">
              Loading franchise candidates...
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Shield className="h-12 w-12 text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-300">
                No previous players seeded for {teamCode}
              </p>
              <p className="text-xs text-slate-500">
                You will enter the Mega Auction with a clean slate ₹120.00 Cr purse and 6 RTM cards!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Slabs Allocation Preview */}
              {allocation.items.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    Calculated BCCI Retention Deductions:
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allocation.items.map((item) => (
                      <span
                        key={item.player.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-stadium-950 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <strong>{item.player.name}</strong>
                        <span className="text-amber-300">({formatLakhs(item.costLakhs)})</span>
                        <span className="text-[10px] text-slate-400">[{item.slabLabel}]</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidate Grid */}
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {candidates.map((player) => {
                  const isSelected = selectedIds.has(player.id);
                  const allocated = allocation.items.find((it) => it.player.id === player.id);

                  return (
                    <div
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
                          : 'border-white/10 bg-stadium-900/70 hover:border-white/30 hover:bg-stadium-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <PlayerHeadshot
                              player={player}
                              teamCode={teamCode}
                              size="xs"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-white">{player.name}</span>
                                {player.marquee && (
                                  <span className="rounded bg-amber-500/30 px-1 py-0.2 text-[9px] font-black uppercase text-amber-300">
                                    Marquee
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="font-bold text-sky-300">{player.role}</span>
                                <span>•</span>
                                <span>{player.country}</span>
                                <span>•</span>
                                <span
                                  className={
                                    player.isCapped ? 'text-amber-300' : 'text-emerald-300'
                                  }
                                >
                                  {player.isCapped ? 'Capped' : 'Uncapped'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              isSelected
                                ? 'border-amber-400 bg-amber-500 text-stadium-950'
                                : 'border-white/20 bg-stadium-950'
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Ratings & IPL Stats */}
                        <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/5 bg-stadium-950/80 p-2 text-center text-[10px]">
                          <div>
                            <div className="text-slate-400">Rating</div>
                            <div className="font-extrabold text-amber-300">
                              {player.overallRating}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">Matches</div>
                            <div className="font-extrabold text-white">
                              {player.iplMatches || '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400">
                              {player.role === 'BOWL' ? 'Wkts' : 'Runs'}
                            </div>
                            <div className="font-extrabold text-white">
                              {player.role === 'BOWL'
                                ? player.iplWickets || '—'
                                : player.iplRuns || '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Deduction Tag */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">
                          Base: {formatLakhs(player.basePriceLakhs)}
                        </span>
                        {allocated ? (
                          <span className="font-extrabold text-amber-300">
                            Retention: {formatLakhs(allocated.costLakhs)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Click to retain</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-stadium-950 px-6 py-4">
          <button
            onClick={() => handleSave([])}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear All (Clean Slate ₹120 Cr + 6 RTMs)</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(Array.from(selectedIds))}
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>
                {saving
                  ? 'Saving Retentions...'
                  : `Confirm ${selectedIds.size} Retention${
                      selectedIds.size === 1 ? '' : 's'
                    } (${formatLakhs(allocation.totalCost)})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

