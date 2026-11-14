import React, { useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, ListFilter, Star } from 'lucide-react';
import { apiRequest } from '../api/http';
import { LotStatus, PlayerRole, RoomLotItem } from '../types';
import { formatLakhs, getFranchiseMeta, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { getWishlist, toggleWishlist, WishlistItem } from '../utils/wishlist';

interface RoomPlayerListsPanelProps {
  roomCode: string;
  soldCount: number;
  unsoldCount: number;
  upcomingCount: number;
}

export const RoomPlayerListsPanel: React.FC<RoomPlayerListsPanelProps> = ({
  roomCode,
  soldCount,
  unsoldCount,
  upcomingCount,
}) => {
  const [lots, setLots] = useState<RoomLotItem[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Map<number, WishlistItem>>(() =>
    getWishlist(roomCode)
  );
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'ALL' | LotStatus>('UPCOMING');
  const [roleFilter, setRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [capFilter, setCapFilter] = useState<'ALL' | 'CAPPED' | 'UNCAPPED'>('ALL');
  const [nationFilter, setNationFilter] = useState<'ALL' | 'INDIAN' | 'OVERSEAS'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const update = () => setWishlistMap(getWishlist(roomCode));
    window.addEventListener('ipl_wishlist_updated', update);
    return () => window.removeEventListener('ipl_wishlist_updated', update);
  }, [roomCode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<{ lots: RoomLotItem[] }>(`/api/rooms/${roomCode}/lots`)
      .then((res) => {
        if (!cancelled) setLots(res.lots);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomCode, soldCount, unsoldCount, upcomingCount]);

  const filteredLots = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = lots.filter((item) => {
      if (statusTab !== 'ALL' && item.status !== statusTab) return false;
      if (roleFilter !== 'ALL' && item.player.role !== roleFilter) return false;
      if (capFilter === 'CAPPED' && !item.player.isCapped) return false;
      if (capFilter === 'UNCAPPED' && item.player.isCapped) return false;
      if (nationFilter === 'INDIAN' && item.player.isOverseas) return false;
      if (nationFilter === 'OVERSEAS' && !item.player.isOverseas) return false;
      if (
        q &&
        !item.player.name.toLowerCase().includes(q) &&
        !item.player.country.toLowerCase().includes(q) &&
        !(item.soldToTeam || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    if (statusTab === 'SOLD') {
      return [...list].sort((a, b) => (b.soldPriceLakhs || 0) - (a.soldPriceLakhs || 0));
    }
    return list;
  }, [lots, statusTab, roleFilter, capFilter, nationFilter, search]);

  return (
    <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-4 shadow-xl">
      {/* Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusTab('UPCOMING')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
              statusTab === 'UPCOMING'
                ? 'bg-amber-500 text-stadium-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Auction List ({upcomingCount})</span>
          </button>

          <button
            onClick={() => setStatusTab('SOLD')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
              statusTab === 'SOLD'
                ? 'bg-emerald-500 text-stadium-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Sold ({soldCount})</span>
          </button>

          <button
            onClick={() => setStatusTab('UNSOLD')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
              statusTab === 'UNSOLD'
                ? 'bg-rose-500 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Unsold ({unsoldCount})</span>
          </button>

          <button
            onClick={() => setStatusTab('ALL')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
              statusTab === 'ALL'
                ? 'bg-sky-400 text-stadium-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>All ({lots.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter name, team, country..."
            className="w-full rounded-xl border border-white/10 bg-stadium-950 py-1.5 pl-8 pr-3 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Pills (Role, Capped/Uncapped, Overseas/Indian) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        {(['ALL', 'WK', 'BAT', 'AR', 'BOWL'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-lg px-2 py-1 font-bold ${
              roleFilter === r
                ? 'bg-white/20 text-white'
                : 'bg-stadium-950 text-slate-400 hover:text-white'
            }`}
          >
            {r === 'ALL' ? 'All Roles' : r}
          </button>
        ))}

        <span className="mx-1 h-3.5 w-px bg-white/10" />

        {(['ALL', 'CAPPED', 'UNCAPPED'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCapFilter(c)}
            className={`rounded-lg px-2 py-1 font-bold ${
              capFilter === c
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'bg-stadium-950 text-slate-400 hover:text-white'
            }`}
          >
            {c === 'ALL' ? 'Capped & Uncapped' : c === 'CAPPED' ? 'Capped' : 'Uncapped'}
          </button>
        ))}

        <span className="mx-1 h-3.5 w-px bg-white/10" />

        {(['ALL', 'INDIAN', 'OVERSEAS'] as const).map((n) => (
          <button
            key={n}
            onClick={() => setNationFilter(n)}
            className={`rounded-lg px-2 py-1 font-bold ${
              nationFilter === n
                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                : 'bg-stadium-950 text-slate-400 hover:text-white'
            }`}
          >
            {n === 'ALL' ? 'All Nations' : n === 'INDIAN' ? '🇮🇳 Indian' : '✈️ Overseas'}
          </button>
        ))}
      </div>

      {/* Scrollable Results List */}
      <div className="mt-3 max-h-[340px] overflow-y-auto pr-1">
        {loading && lots.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading player lots...</div>
        ) : filteredLots.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No players match the selected filters.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredLots.slice(0, 150).map((item) => {
              const buyerMeta = getFranchiseMeta(item.soldToTeam);
              return (
                <div
                  key={item.lotId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-stadium-950/90 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleWishlist(roomCode, item.player.id)}
                      title={
                        wishlistMap.has(item.player.id)
                          ? 'Remove from War Room Wishlist'
                          : 'Star into War Room Wishlist'
                      }
                      className={`rounded p-1 transition ${
                        wishlistMap.has(item.player.id)
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'text-slate-600 hover:text-amber-400'
                      }`}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          wishlistMap.has(item.player.id) ? 'fill-amber-400' : ''
                        }`}
                      />
                    </button>
                    <PlayerHeadshot
                      player={item.player}
                      teamCode={item.soldToTeam || item.player.previousTeam}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500">
                          #{item.lotNumber}
                        </span>
                        <span className="truncate text-xs font-bold text-white">
                          {item.player.name}
                        </span>
                        {item.player.isOverseas && (
                          <span className="text-[10px]" title="Overseas">
                            ✈️
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                        <span
                          className={`rounded border px-1 py-0.2 font-bold ${roleBadgeClasses(
                            item.player.role
                          )}`}
                        >
                          {item.player.role}
                        </span>
                        <span>{item.player.country}</span>
                        <span>• {item.player.isCapped ? 'Capped' : 'Uncapped'}</span>
                        <span>• OVR {item.player.overallRating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {item.status === 'SOLD' && buyerMeta ? (
                      <div>
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isRetention && (
                            <span className="rounded bg-amber-500/25 px-1 py-0.2 text-[9px] font-black text-amber-300" title="Retained Player">
                              ⭐ RET
                            </span>
                          )}
                          {item.isRtmBuy && (
                            <span className="rounded bg-sky-500/25 px-1 py-0.2 text-[9px] font-black text-sky-300" title="Bought via RTM Card">
                              🏏 RTM
                            </span>
                          )}
                          <div className="flex items-center gap-1 rounded bg-stadium-900 border border-white/10 px-1.5 py-0.5">
                            <FranchiseLogo teamCode={buyerMeta.code} size="xs" />
                            <span className="text-[10px] font-black text-white">
                              {buyerMeta.code}
                            </span>
                          </div>
                        </div>
                        <div className="tabular-nums mt-0.5 font-mono text-xs font-black text-emerald-400">
                          {formatLakhs(item.soldPriceLakhs)}
                        </div>
                      </div>
                    ) : item.status === 'UNSOLD' ? (
                      <div>
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          UNSOLD
                        </span>
                        <div className="tabular-nums mt-0.5 font-mono text-[11px] text-slate-400">
                          {formatLakhs(item.basePriceLakhs)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          {item.setName}
                        </span>
                        <div className="tabular-nums mt-0.5 font-mono text-xs font-bold text-amber-300">
                          {formatLakhs(item.basePriceLakhs)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filteredLots.length > 150 && (
          <div className="mt-2 text-center text-[11px] text-slate-500">
            Showing first 150 of {filteredLots.length} matching players — refine search to narrow down.
          </div>
        )}
      </div>
    </div>
  );
};
