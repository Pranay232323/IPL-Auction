import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../api/http';
import { RoomLotItem, RoomSnapshot, TeamCode, TradeDTO } from '../types';
import { formatLakhs, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';

interface TradeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomSnapshot;
  currentUserId: string;
  onProposeTrade: (payload: {
    proposerTeam: TeamCode;
    receiverTeam: TeamCode;
    offeredPlayerIds: number[];
    requestedPlayerIds: number[];
    purseTransferLakhs: number;
  }) => Promise<void>;
  onRespondTrade: (tradeId: string, decision: 'ACCEPT' | 'REJECT') => Promise<void>;
  onCancelTrade: (tradeId: string) => Promise<void>;
  onConcludeWindow: () => Promise<void>;
}

export const TradeHubModal: React.FC<TradeHubModalProps> = ({
  isOpen,
  onClose,
  room,
  currentUserId,
  onProposeTrade,
  onRespondTrade,
  onCancelTrade,
  onConcludeWindow,
}) => {
  const [activeTab, setActiveTab] = useState<'PROPOSE' | 'OFFERS' | 'HISTORY'>('PROPOSE');
  const [selectedPartner, setSelectedPartner] = useState<TeamCode | null>(null);
  const [offeredPlayerIds, setOfferedPlayerIds] = useState<Set<number>>(new Set());
  const [requestedPlayerIds, setRequestedPlayerIds] = useState<Set<number>>(new Set());
  const [purseTransferLakhs, setPurseTransferLakhs] = useState<number>(0); // > 0 means I pay, < 0 means I receive
  const [allSoldLots, setAllSoldLots] = useState<RoomLotItem[]>([]);
  const [loadingSquads, setLoadingSquads] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  const isHost = room.hostUserId === currentUserId;
  const myTeam = room.teams.find((t) => t.userId === currentUserId);
  const partnerTeam = room.teams.find((t) => t.teamCode === selectedPartner);

  // Timer countdown
  useEffect(() => {
    if (!room.tradeWindowActive || !room.tradeWindowEndsAt) return;
    const interval = setInterval(() => {
      const ms = Math.max(0, (room.tradeWindowEndsAt || 0) - Date.now());
      setSecondsRemaining(Math.ceil(ms / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [room.tradeWindowActive, room.tradeWindowEndsAt]);

  // Fetch all sold lots to group squads
  useEffect(() => {
    if (!isOpen) return;
    setLoadingSquads(true);
    apiRequest<{ lots: RoomLotItem[] }>(`/api/rooms/${room.code}/lots?status=SOLD`)
      .then((res) => setAllSoldLots(res.lots || []))
      .catch(() => {})
      .finally(() => setLoadingSquads(false));
  }, [isOpen, room.code, room.counts.sold]);

  // Squad mapping by franchise
  const squadsByTeam = useMemo(() => {
    const map = new Map<TeamCode, RoomLotItem[]>();
    for (const lot of allSoldLots) {
      if (!lot.soldToTeam) continue;
      const list = map.get(lot.soldToTeam) || [];
      list.push(lot);
      map.set(lot.soldToTeam, list);
    }
    return map;
  }, [allSoldLots]);

  // Automatically select first available partner if none selected
  useEffect(() => {
    if (!selectedPartner && myTeam) {
      const other = room.teams.find((t) => t.teamCode !== myTeam.teamCode);
      if (other) setSelectedPartner(other.teamCode);
    }
  }, [myTeam, selectedPartner, room.teams]);

  const mySquad = useMemo(() => {
    if (!myTeam) return [];
    return squadsByTeam.get(myTeam.teamCode) || [];
  }, [myTeam, squadsByTeam]);

  const partnerSquad = useMemo(() => {
    if (!selectedPartner) return [];
    return squadsByTeam.get(selectedPartner) || [];
  }, [selectedPartner, squadsByTeam]);

  // Active trades involving current team or all room trades
  const trades = room.activeTrades || [];
  const pendingIncoming = trades.filter(
    (t) => t.status === 'PENDING' && t.receiverTeam === myTeam?.teamCode
  );
  const pendingOutgoing = trades.filter(
    (t) => t.status === 'PENDING' && t.proposerTeam === myTeam?.teamCode
  );
  const completedTrades = trades.filter((t) => t.status === 'ACCEPTED');

  // Trade validation computations
  const tradeValidation = useMemo(() => {
    if (!myTeam || !partnerTeam) {
      return { valid: false, error: 'Select your team and trade partner.' };
    }

    if (offeredPlayerIds.size === 0 && requestedPlayerIds.size === 0) {
      return { valid: false, error: 'Select at least 1 player to offer or request.' };
    }

    // Check purse
    if (purseTransferLakhs > 0 && myTeam.purseRemainingLakhs < purseTransferLakhs) {
      return {
        valid: false,
        error: `Insufficient purse funds. You have ${formatLakhs(myTeam.purseRemainingLakhs)}.`,
      };
    }
    if (purseTransferLakhs < 0 && partnerTeam.purseRemainingLakhs < -purseTransferLakhs) {
      return {
        valid: false,
        error: `${partnerTeam.teamCode} has insufficient purse (${formatLakhs(partnerTeam.purseRemainingLakhs)}).`,
      };
    }

    // Squad size limits
    const newMyCount = mySquad.length - offeredPlayerIds.size + requestedPlayerIds.size;
    const newPartnerCount = partnerSquad.length - requestedPlayerIds.size + offeredPlayerIds.size;

    if (newMyCount > room.maxSquadSize) {
      return {
        valid: false,
        error: `Your squad would exceed max size of ${room.maxSquadSize} (${newMyCount}).`,
      };
    }
    if (newPartnerCount > room.maxSquadSize) {
      return {
        valid: false,
        error: `${partnerTeam.teamCode} squad would exceed max size of ${room.maxSquadSize} (${newPartnerCount}).`,
      };
    }

    // Overseas limits
    const offeredOverseasCount = mySquad.filter(
      (s) => offeredPlayerIds.has(s.player.id) && s.player.isOverseas
    ).length;
    const requestedOverseasCount = partnerSquad.filter(
      (s) => requestedPlayerIds.has(s.player.id) && s.player.isOverseas
    ).length;

    const myCurrentOverseas = mySquad.filter((s) => s.player.isOverseas).length;
    const partnerCurrentOverseas = partnerSquad.filter((s) => s.player.isOverseas).length;

    const newMyOverseas = myCurrentOverseas - offeredOverseasCount + requestedOverseasCount;
    const newPartnerOverseas =
      partnerCurrentOverseas - requestedOverseasCount + offeredOverseasCount;

    if (newMyOverseas > room.maxOverseas) {
      return {
        valid: false,
        error: `Your overseas limit (${room.maxOverseas}) exceeded (${newMyOverseas}).`,
      };
    }
    if (newPartnerOverseas > room.maxOverseas) {
      return {
        valid: false,
        error: `${partnerTeam.teamCode} overseas limit (${room.maxOverseas}) exceeded (${newPartnerOverseas}).`,
      };
    }

    return {
      valid: true,
      error: null,
      newMyCount,
      newPartnerCount,
      newMyOverseas,
      newPartnerOverseas,
    };
  }, [
    myTeam,
    partnerTeam,
    offeredPlayerIds,
    requestedPlayerIds,
    purseTransferLakhs,
    mySquad,
    partnerSquad,
    room.maxSquadSize,
    room.maxOverseas,
  ]);

  const handleToggleOffered = (id: number) => {
    setOfferedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleRequested = (id: number) => {
    setRequestedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmitProposal = async () => {
    if (!myTeam || !selectedPartner || !tradeValidation.valid) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onProposeTrade({
        proposerTeam: myTeam.teamCode,
        receiverTeam: selectedPartner,
        offeredPlayerIds: Array.from(offeredPlayerIds),
        requestedPlayerIds: Array.from(requestedPlayerIds),
        purseTransferLakhs,
      });
      setSuccessMsg('Trade proposal submitted successfully!');
      setOfferedPlayerIds(new Set());
      setRequestedPlayerIds(new Set());
      setPurseTransferLakhs(0);
      setActiveTab('OFFERS');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit trade proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const timerMin = Math.floor(secondsRemaining / 60);
  const timerSec = secondsRemaining % 60;
  const timeFormatted = `${String(timerMin).padStart(2, '0')}:${String(timerSec).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <div className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-stadium-950 shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-stadium-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 shadow">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  Post-Auction Franchise Trade Hub
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-emerald-300">
                  {room.tradeWindowActive ? 'Window Open' : 'Window Closed'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Swap players or cash before final rankings & tournament simulation!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {room.tradeWindowActive && (
              <div
                className={`flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 font-mono text-sm font-black transition ${
                  secondsRemaining < 60
                    ? 'animate-pulse border-rose-500/50 bg-rose-500/20 text-rose-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{timeFormatted} remaining</span>
              </div>
            )}

            {isHost && room.tradeWindowActive && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Conclude the trade window now and lock all squads for tournament play?'
                    )
                  ) {
                    void onConcludeWindow();
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                title="Prematurely lock squads and end trading"
              >
                <span>Lock Squads & Conclude</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-stadium-900/40 px-6 py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('PROPOSE')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeTab === 'PROPOSE'
                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Trade Machine (Propose)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OFFERS')}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeTab === 'OFFERS'
                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Active Offers</span>
            {pendingIncoming.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                {pendingIncoming.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeTab === 'HISTORY'
                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Completed Trades ({completedTrades.length})</span>
          </button>
        </div>

        {/* Status Banners */}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-rose-500/15 px-6 py-2 text-xs font-bold text-rose-300">
            <ShieldAlert className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/15 px-6 py-2 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ================= TAB 1: PROPOSE TRADE ================= */}
          {activeTab === 'PROPOSE' && (
            <div className="space-y-5">
              {/* Partner Franchise Selector */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Select Franchise to Trade With:
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {room.teams
                    .filter((t) => t.teamCode !== myTeam?.teamCode)
                    .map((t) => {
                      const isSelected = selectedPartner === t.teamCode;
                      return (
                        <button
                          key={t.teamCode}
                          type="button"
                          onClick={() => {
                            setSelectedPartner(t.teamCode);
                            setRequestedPlayerIds(new Set());
                          }}
                          className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                            isSelected
                              ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/10'
                              : 'border-white/10 bg-stadium-900/70 hover:border-white/20'
                          }`}
                        >
                          <FranchiseLogo teamCode={t.teamCode} size="xs" />
                          <div className="text-left">
                            <div className="text-xs font-extrabold text-white">
                              {t.teamCode}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {t.ownerName || 'Bot'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Trade Machine Split Rosters */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Left: My Franchise Squad */}
                <div className="flex flex-col rounded-2xl border border-white/15 bg-stadium-900/90 p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      {myTeam && <FranchiseLogo teamCode={myTeam.teamCode} size="sm" />}
                      <div>
                        <div className="text-sm font-black text-white">
                          Your Squad ({myTeam?.teamCode || 'You'})
                        </div>
                        <div className="text-xs text-slate-400">
                          Purse: <strong className="text-amber-300">{formatLakhs(myTeam?.purseRemainingLakhs || 0)}</strong> • {mySquad.length}/25
                        </div>
                      </div>
                    </div>
                    <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-black text-amber-300">
                      {offeredPlayerIds.size} Offered
                    </span>
                  </div>

                  {/* Cash slider / buttons */}
                  <div className="mt-3 rounded-xl border border-white/5 bg-stadium-950 p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <span>Purse Cash Offered:</span>
                      </span>
                      <span className="font-mono text-amber-300">
                        {purseTransferLakhs > 0 ? `+${formatLakhs(purseTransferLakhs)}` : '₹0'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[0, 50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPurseTransferLakhs(amt)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                            purseTransferLakhs === amt
                              ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {amt === 0 ? 'None' : `+₹${amt >= 100 ? amt / 100 + 'Cr' : amt + 'L'}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player List */}
                  <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                    {loadingSquads ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Loading roster...
                      </div>
                    ) : mySquad.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No players drafted yet.
                      </div>
                    ) : (
                      mySquad.map((item) => {
                        const isChecked = offeredPlayerIds.has(item.player.id);
                        return (
                          <div
                            key={item.lotId}
                            onClick={() => handleToggleOffered(item.player.id)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition ${
                              isChecked
                                ? 'border-amber-400 bg-amber-500/15'
                                : 'border-white/10 bg-stadium-950/80 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-white/20 text-amber-500 focus:ring-0"
                              />
                              <PlayerHeadshot
                                player={item.player}
                                teamCode={myTeam?.teamCode}
                                size="xs"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-xs font-bold text-white truncate">
                                    {item.player.name}
                                  </span>
                                  {item.player.isOverseas && (
                                    <span className="text-[10px]">✈️</span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                                  <span
                                    className={`rounded border px-1 py-0.2 font-bold ${roleBadgeClasses(
                                      item.player.role
                                    )}`}
                                  >
                                    {item.player.role}
                                  </span>
                                  <span>OVR {item.player.overallRating}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[11px] font-bold text-emerald-400">
                                {formatLakhs(item.soldPriceLakhs)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Partner Franchise Squad */}
                <div className="flex flex-col rounded-2xl border border-white/15 bg-stadium-900/90 p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      {partnerTeam && (
                        <FranchiseLogo teamCode={partnerTeam.teamCode} size="sm" />
                      )}
                      <div>
                        <div className="text-sm font-black text-white">
                          Target Squad ({partnerTeam?.teamCode || 'Partner'})
                        </div>
                        <div className="text-xs text-slate-400">
                          Purse: <strong className="text-amber-300">{formatLakhs(partnerTeam?.purseRemainingLakhs || 0)}</strong> • {partnerSquad.length}/25
                        </div>
                      </div>
                    </div>
                    <span className="rounded-lg bg-sky-500/15 px-2 py-1 text-xs font-black text-sky-300">
                      {requestedPlayerIds.size} Requested
                    </span>
                  </div>

                  {/* Cash requested slider / buttons */}
                  <div className="mt-3 rounded-xl border border-white/5 bg-stadium-950 p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-sky-400" />
                        <span>Purse Cash Requested From Them:</span>
                      </span>
                      <span className="font-mono text-sky-300">
                        {purseTransferLakhs < 0
                          ? `+${formatLakhs(-purseTransferLakhs)}`
                          : '₹0'}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[0, -50, -100, -200, -500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPurseTransferLakhs(amt)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                            purseTransferLakhs === amt
                              ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {amt === 0
                            ? 'None'
                            : `+₹${-amt >= 100 ? -amt / 100 + 'Cr' : -amt + 'L'}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player List */}
                  <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                    {loadingSquads ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Loading roster...
                      </div>
                    ) : partnerSquad.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No players drafted yet.
                      </div>
                    ) : (
                      partnerSquad.map((item) => {
                        const isChecked = requestedPlayerIds.has(item.player.id);
                        return (
                          <div
                            key={item.lotId}
                            onClick={() => handleToggleRequested(item.player.id)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition ${
                              isChecked
                                ? 'border-sky-400 bg-sky-500/15'
                                : 'border-white/10 bg-stadium-950/80 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-white/20 text-sky-500 focus:ring-0"
                              />
                              <PlayerHeadshot
                                player={item.player}
                                teamCode={partnerTeam?.teamCode}
                                size="xs"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-xs font-bold text-white truncate">
                                    {item.player.name}
                                  </span>
                                  {item.player.isOverseas && (
                                    <span className="text-[10px]">✈️</span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                                  <span
                                    className={`rounded border px-1 py-0.2 font-bold ${roleBadgeClasses(
                                      item.player.role
                                    )}`}
                                  >
                                    {item.player.role}
                                  </span>
                                  <span>OVR {item.player.overallRating}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[11px] font-bold text-emerald-400">
                                {formatLakhs(item.soldPriceLakhs)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview Bar & Submit Button */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/15 bg-stadium-900 p-4">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {tradeValidation.valid ? (
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Valid Trade Proposal (Satisfies all IPL limits)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{tradeValidation.error}</span>
                    </div>
                  )}

                  {tradeValidation.valid && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <span>
                        Your Squad: <strong className="text-white">{tradeValidation.newMyCount}/25</strong> (OS: {tradeValidation.newMyOverseas}/8)
                      </span>
                      <span>•</span>
                      <span>
                        Partner Squad: <strong className="text-white">{tradeValidation.newPartnerCount}/25</strong> (OS: {tradeValidation.newPartnerOverseas}/8)
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!tradeValidation.valid || submitting}
                  onClick={handleSubmitProposal}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-2.5 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'Proposing...' : 'Submit Official Trade Proposal'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ACTIVE OFFERS ================= */}
          {activeTab === 'OFFERS' && (
            <div className="space-y-6">
              {/* Incoming Offers */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-white">
                  <span>📥 Incoming Offers Received</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                    {pendingIncoming.length}
                  </span>
                </h3>

                {pendingIncoming.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-slate-400">
                    No active proposals received yet. Propose a trade to kick off discussions!
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {pendingIncoming.map((trade) => (
                      <div
                        key={trade.id}
                        className="rounded-2xl border border-amber-500/30 bg-stadium-900/95 p-4 shadow-xl"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <FranchiseLogo teamCode={trade.proposerTeam} size="sm" />
                            <div>
                              <span className="text-xs font-black text-white">
                                {trade.proposerTeam}
                              </span>
                              <span className="text-xs text-slate-400"> offered trade to you</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onRespondTrade(trade.id, 'ACCEPT')}
                              className="rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-stadium-950 transition hover:bg-emerald-400"
                            >
                              Accept Trade
                            </button>
                            <button
                              type="button"
                              onClick={() => onRespondTrade(trade.id, 'REJECT')}
                              className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-1.5 text-xs font-black text-rose-300 transition hover:bg-rose-500/25"
                            >
                              Decline
                            </button>
                          </div>
                        </div>

                        {/* Trade Details Content */}
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/5 bg-stadium-950 p-3">
                            <div className="text-[10px] font-extrabold uppercase text-amber-300">
                              You Receive (From {trade.proposerTeam}):
                            </div>
                            <div className="mt-2 space-y-2">
                              {trade.offeredPlayers.map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <PlayerHeadshot player={p} teamCode={trade.proposerTeam} size="xs" />
                                  <div className="text-xs font-bold text-white">
                                    {p.name} ({p.role} • OVR {p.overallRating})
                                  </div>
                                </div>
                              ))}
                              {trade.purseTransferLakhs > 0 && (
                                <div className="text-xs font-black text-emerald-400">
                                  + ₹{formatLakhs(trade.purseTransferLakhs)} Purse Cash
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/5 bg-stadium-950 p-3">
                            <div className="text-[10px] font-extrabold uppercase text-sky-300">
                              You Give Up (To {trade.proposerTeam}):
                            </div>
                            <div className="mt-2 space-y-2">
                              {trade.requestedPlayers.map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <PlayerHeadshot player={p} teamCode={trade.receiverTeam} size="xs" />
                                  <div className="text-xs font-bold text-white">
                                    {p.name} ({p.role} • OVR {p.overallRating})
                                  </div>
                                </div>
                              ))}
                              {trade.purseTransferLakhs < 0 && (
                                <div className="text-xs font-black text-rose-400">
                                  - ₹{formatLakhs(-trade.purseTransferLakhs)} Purse Cash
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Proposals */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-white">
                  <span>📤 Sent Proposals (Awaiting Decision)</span>
                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-300">
                    {pendingOutgoing.length}
                  </span>
                </h3>

                {pendingOutgoing.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-slate-400">
                    No active proposals pending response.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {pendingOutgoing.map((trade) => (
                      <div
                        key={trade.id}
                        className="rounded-2xl border border-white/10 bg-stadium-900/90 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Proposed to</span>
                            <FranchiseLogo teamCode={trade.receiverTeam} size="xs" />
                            <span className="text-xs font-black text-white">
                              {trade.receiverTeam}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onCancelTrade(trade.id)}
                            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                          >
                            Withdraw Proposal
                          </button>
                        </div>

                        <div className="mt-3 text-xs text-slate-300">
                          <span>Offered: {trade.offeredPlayers.map((p) => p.name).join(', ') || 'None'}</span>
                          {trade.purseTransferLakhs > 0 && ` + ₹${formatLakhs(trade.purseTransferLakhs)}`}
                          <span className="mx-2">↔</span>
                          <span>Requested: {trade.requestedPlayers.map((p) => p.name).join(', ') || 'None'}</span>
                          {trade.purseTransferLakhs < 0 && ` + ₹${formatLakhs(-trade.purseTransferLakhs)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: TRADE HISTORY ================= */}
          {activeTab === 'HISTORY' && (
            <div>
              <h3 className="text-sm font-black text-white">
                Official Trade Transactions Newsfeed
              </h3>

              {completedTrades.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 py-12 text-center text-xs text-slate-400">
                  No trades finalized yet in this room.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {completedTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="rounded-2xl border border-emerald-500/30 bg-stadium-900/90 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <FranchiseLogo teamCode={trade.proposerTeam} size="sm" />
                        <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                        <FranchiseLogo teamCode={trade.receiverTeam} size="sm" />
                        <span className="text-xs font-black text-emerald-300">
                          TRADE COMPLETED
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                        <div className="rounded-xl bg-stadium-950 p-2.5">
                          <span className="font-extrabold text-amber-300">
                            {trade.proposerTeam} received:
                          </span>
                          <div className="mt-1 text-slate-200">
                            {trade.requestedPlayers.map((p) => p.name).join(', ') || 'None'}
                            {trade.purseTransferLakhs < 0 && ` + ₹${formatLakhs(-trade.purseTransferLakhs)}`}
                          </div>
                        </div>

                        <div className="rounded-xl bg-stadium-950 p-2.5">
                          <span className="font-extrabold text-sky-300">
                            {trade.receiverTeam} received:
                          </span>
                          <div className="mt-1 text-slate-200">
                            {trade.offeredPlayers.map((p) => p.name).join(', ') || 'None'}
                            {trade.purseTransferLakhs > 0 && ` + ₹${formatLakhs(trade.purseTransferLakhs)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

