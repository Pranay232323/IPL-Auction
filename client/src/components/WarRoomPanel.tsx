import React, { useEffect, useState } from 'react';
import {
  Star,
  ShieldAlert,
  Wallet,
  Users,
  Plane,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  DollarSign,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../api/http';
import { PlayerDTO, RoomLotItem, RoomSnapshot, TeamCode } from '../types';
import { formatLakhs, getFranchiseMeta, roleBadgeClasses } from '../utils/format';
import {
  getWishlist,
  toggleWishlist,
  updateWishlistBudget,
  WishlistItem,
} from '../utils/wishlist';

interface WarRoomPanelProps {
  room: RoomSnapshot;
  currentUserId: string;
  onClose?: () => void;
  onOpenCatalog?: () => void;
}

export const WarRoomPanel: React.FC<WarRoomPanelProps> = ({
  room,
  currentUserId,
  onClose,
  onOpenCatalog,
}) => {
  const [wishlistMap, setWishlistMap] = useState<Map<number, WishlistItem>>(() =>
    getWishlist(room.code)
  );
  const [roomLots, setRoomLots] = useState<RoomLotItem[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerDTO[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);

  const myTeam = room.teams.find((t) => t.userId === currentUserId) || null;
  const franchise = getFranchiseMeta(myTeam?.teamCode);

  useEffect(() => {
    const handleUpdate = () => {
      setWishlistMap(getWishlist(room.code));
    };
    window.addEventListener('ipl_wishlist_updated', handleUpdate);
    return () => window.removeEventListener('ipl_wishlist_updated', handleUpdate);
  }, [room.code]);

  useEffect(() => {
    setLoadingLots(true);
    apiRequest<{ lots: RoomLotItem[] }>(`/api/rooms/${room.code}/lots`)
      .then((res) => setRoomLots(res.lots))
      .catch(() => {})
      .finally(() => setLoadingLots(false));
  }, [room.code, room.counts.sold, room.counts.unsold]);

  useEffect(() => {
    apiRequest<{ players: PlayerDTO[] }>('/api/players')
      .then((res) => setAllPlayers(res.players))
      .catch(() => {});
  }, []);

  // Budget calculations
  const squadCount = myTeam?.squadCount || 0;
  const purseRemaining = myTeam?.purseRemainingLakhs || 0;
  const minSlotsNeeded = Math.max(0, room.minSquadSize - squadCount);
  const reserveNeeded = Math.max(0, minSlotsNeeded - 1) * 30; // 30L minimum base price
  const maxSafeBidLakhs = Math.max(0, purseRemaining - reserveNeeded);

  // Combine wishlist with player records and lot status
  const wishlistedPlayers = Array.from(wishlistMap.values()).map((item) => {
    const lot = roomLots.find((l) => l.player.id === item.playerId);
    const catalogPlayer = allPlayers.find((p) => p.id === item.playerId);
    const player = lot?.player || catalogPlayer;
    return {
      ...item,
      player,
      lot,
      isCurrentlyLive: room.currentLot?.player.id === item.playerId,
    };
  });

  return (
    <div className="space-y-4 rounded-2xl border border-white/15 bg-stadium-900/95 p-4 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg font-black text-stadium-950 shadow"
            style={{ backgroundColor: franchise?.primaryColor || '#F59E0B' }}
          >
            {myTeam?.teamCode || 'GM'}
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {franchise ? `${franchise.name} War Room` : 'Franchise Strategy War Room'}
            </h3>
            <p className="text-[11px] text-slate-400">
              Live Squad Math, Purse Safety Reserve & Target Wishlist
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Close
          </button>
        )}
      </div>

      {/* Purse Math & Squad Health Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Remaining Purse */}
        <div className="rounded-xl border border-white/10 bg-stadium-950 p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Remaining Purse</span>
            <Wallet className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-black text-amber-300">
            {formatLakhs(purseRemaining)}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Initial: {formatLakhs(room.initialPurseLakhs)}
          </p>
        </div>

        {/* Max Safe Single Bid */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-[11px] font-semibold uppercase">Max Safe Single Bid</span>
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-lg font-black text-emerald-300">
            {formatLakhs(maxSafeBidLakhs)}
          </div>
          <p className="mt-0.5 text-[10px] text-emerald-400/80">
            Guarantees {formatLakhs(reserveNeeded)} reserve for {minSlotsNeeded} mandatory slots
          </p>
        </div>

        {/* Squad Composition */}
        <div className="rounded-xl border border-white/10 bg-stadium-950 p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Squad Size</span>
            <Users className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="mt-1 text-lg font-black text-white">
            {squadCount} / {room.maxSquadSize}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Min required: {room.minSquadSize} ({minSlotsNeeded} to go)
          </p>
        </div>

        {/* Overseas Slot Meter */}
        <div className="rounded-xl border border-white/10 bg-stadium-950 p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Overseas Cap</span>
            <Plane className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-1 text-lg font-black text-purple-300">
            {myTeam?.overseasCount || 0} / {room.maxOverseas}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {room.maxOverseas - (myTeam?.overseasCount || 0)} overseas slots free
          </p>
        </div>
      </div>

      {/* Role Breakdown Bar */}
      {myTeam && (
        <div className="rounded-xl border border-white/10 bg-stadium-950 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-extrabold uppercase tracking-wider text-slate-300">
              Current Squad Role Balance
            </span>
            <span className="text-[10px] text-slate-400">
              Needs at least 1 WK & 5+ Bowling options
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
              <span className="block text-[10px] font-bold text-amber-300">WK</span>
              <strong className="text-base text-white">{myTeam.roleBreakdown.WK}</strong>
            </div>
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2">
              <span className="block text-[10px] font-bold text-sky-300">BAT</span>
              <strong className="text-base text-white">{myTeam.roleBreakdown.BAT}</strong>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
              <span className="block text-[10px] font-bold text-emerald-300">AR</span>
              <strong className="text-base text-white">{myTeam.roleBreakdown.AR}</strong>
            </div>
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2">
              <span className="block text-[10px] font-bold text-purple-300">BOWL</span>
              <strong className="text-base text-white">{myTeam.roleBreakdown.BOWL}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Target Wishlist Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            Target Wishlist ({wishlistedPlayers.length} Players Starred)
          </h4>
        </div>
        {onOpenCatalog && (
          <button
            onClick={onOpenCatalog}
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            <span>+ Star More from Player Catalog</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Wishlist Items List */}
      {wishlistedPlayers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-slate-400">
          <Star className="mx-auto mb-2 h-6 w-6 text-slate-600" />
          <p className="font-semibold text-slate-300">No players starred in your wishlist yet.</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Open the Master Player Catalog or Upcoming Pool and click the ⭐ icon to set target
            budgets!
          </p>
          {onOpenCatalog && (
            <button
              onClick={onOpenCatalog}
              className="mt-3 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-stadium-950 hover:bg-amber-400"
            >
              Browse 588 Player Catalog
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {wishlistedPlayers.map((item) => {
            const p = item.player;
            if (!p) return null;

            const isSoldToMe = item.lot?.soldToTeam === myTeam?.teamCode;
            const isSoldToOther =
              Boolean(item.lot?.soldToTeam) && item.lot?.soldToTeam !== myTeam?.teamCode;
            const isUnsold = item.lot?.status === 'UNSOLD';
            const isLive = item.isCurrentlyLive;

            return (
              <div
                key={item.playerId}
                className={`relative rounded-xl border p-3 transition ${
                  isLive
                    ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20'
                    : isSoldToMe
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : isSoldToOther
                        ? 'border-white/5 bg-stadium-950/50 opacity-60'
                        : 'border-white/10 bg-stadium-950 hover:border-white/20'
                }`}
              >
                {/* Status Badge */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${roleBadgeClasses(
                        p.role
                      )}`}
                    >
                      {p.role}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.auctionSet}</span>
                    {p.isOverseas && <span className="text-[10px]">✈️</span>}
                  </div>

                  <div className="flex items-center gap-1">
                    {isLive && (
                      <span className="flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-stadium-950 animate-pulse">
                        <Flame className="h-3 w-3 fill-stadium-950" /> ON BLOCK
                      </span>
                    )}
                    {isSoldToMe && (
                      <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> WON
                      </span>
                    )}
                    {isSoldToOther && (
                      <span className="flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                        <XCircle className="h-3 w-3" /> {item.lot?.soldToTeam}
                      </span>
                    )}
                    {isUnsold && (
                      <span className="rounded bg-slate-500/20 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                        UNSOLD
                      </span>
                    )}
                    <button
                      onClick={() => toggleWishlist(room.code, p.id)}
                      title="Remove from Wishlist"
                      className="ml-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Player Name & Country */}
                <div className="mb-2">
                  <div className="font-extrabold text-white text-xs truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {p.country} • {p.overallRating} OVR • Base: {formatLakhs(p.basePriceLakhs)}
                  </div>
                </div>

                {/* Target Budget Input */}
                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
                  <span className="text-[10px] text-slate-400">Target Max:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="10"
                      min="30"
                      max="3000"
                      placeholder="Lakhs (e.g. 800)"
                      value={item.maxBudgetLakhs || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        updateWishlistBudget(room.code, p.id, val);
                      }}
                      className="w-24 rounded border border-white/15 bg-stadium-900 px-2 py-0.5 text-right font-mono text-[11px] text-amber-300 focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">L</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
