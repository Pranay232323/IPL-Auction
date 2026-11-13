import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Globe, Award, Filter, Star } from 'lucide-react';
import { apiRequest } from '../api/http';
import { PlayerDTO, PlayerRole } from '../types';
import { formatLakhs, roleBadgeClasses } from '../utils/format';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { getWishlist, toggleWishlist, WishlistItem } from '../utils/wishlist';

interface MasterPlayerCatalogModalProps {
  open: boolean;
  onClose: () => void;
  roomCode?: string;
}

export const MasterPlayerCatalogModal: React.FC<MasterPlayerCatalogModalProps> = ({
  open,
  onClose,
  roomCode,
}) => {
  const [players, setPlayers] = useState<PlayerDTO[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Map<number, WishlistItem>>(() =>
    roomCode ? getWishlist(roomCode) : new Map()
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'ALL' | PlayerRole>('ALL');
  const [cappedFilter, setCappedFilter] = useState<'ALL' | 'CAPPED' | 'UNCAPPED'>('ALL');
  const [overseasFilter, setOverseasFilter] = useState<'ALL' | 'INDIAN' | 'OVERSEAS'>('ALL');

  useEffect(() => {
    if (!roomCode) return;
    const update = () => setWishlistMap(getWishlist(roomCode));
    window.addEventListener('ipl_wishlist_updated', update);
    return () => window.removeEventListener('ipl_wishlist_updated', update);
  }, [roomCode]);

  useEffect(() => {
    if (!open || players.length > 0) return;
    setLoading(true);
    apiRequest<{ players: PlayerDTO[] }>('/api/players')
      .then((res) => setPlayers(res.players))
      .finally(() => setLoading(false));
  }, [open, players.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (role !== 'ALL' && p.role !== role) return false;
      if (cappedFilter === 'CAPPED' && !p.isCapped) return false;
      if (cappedFilter === 'UNCAPPED' && p.isCapped) return false;
      if (overseasFilter === 'INDIAN' && p.isOverseas) return false;
      if (overseasFilter === 'OVERSEAS' && !p.isOverseas) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.country.toLowerCase().includes(q) &&
        !p.speciality.toLowerCase().includes(q) &&
        !p.auctionSet.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [players, role, cappedFilter, overseasFilter, search]);

  if (!open) return null;

  const cappedCount = players.filter((p) => p.isCapped).length;
  const uncappedCount = players.length - cappedCount;
  const overseasCount = players.filter((p) => p.isOverseas).length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-5"
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-stadium-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-stadium-950 px-4 py-3.5 sm:px-6">
          <div>
            <h2 className="text-base font-extrabold text-white sm:text-lg">
              Registered IPL Mega Auction Player Pool ({players.length} Players)
            </h2>
            <p className="text-xs text-slate-400">
              {cappedCount} Capped • {uncappedCount} Uncapped • {players.length - overseasCount}{' '}
              Indian • {overseasCount} Overseas
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="grid gap-2.5 border-b border-white/10 bg-stadium-900/90 p-3 sm:grid-cols-12 sm:px-6">
          <div className="relative sm:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Kohli, Bumrah, Rashid, Australia..."
              className="w-full rounded-xl border border-white/10 bg-stadium-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:col-span-8">
            <Filter className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            {(['ALL', 'WK', 'BAT', 'AR', 'BOWL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  role === r
                    ? 'bg-amber-500 text-stadium-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}

            <span className="mx-1 h-4 w-px bg-white/10" />

            {(['ALL', 'CAPPED', 'UNCAPPED'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCappedFilter(c)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  cappedFilter === c
                    ? 'bg-emerald-500 text-stadium-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {c === 'ALL' ? 'Capped + Uncapped' : c === 'CAPPED' ? 'Capped' : 'Uncapped'}
              </button>
            ))}

            <span className="mx-1 h-4 w-px bg-white/10" />

            {(['ALL', 'INDIAN', 'OVERSEAS'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOverseasFilter(o)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  overseasFilter === o
                    ? 'bg-sky-400 text-stadium-950'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {o === 'ALL' ? 'All Nations' : o === 'INDIAN' ? '🇮🇳 Indian' : '✈️ Overseas'}
              </button>
            ))}
          </div>
        </div>

        {/* Table / Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:px-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Loading 588 registered IPL players...
            </div>
          ) : (
            <>
              <div className="mb-2 text-xs font-semibold text-slate-400">
                Showing {filtered.length} of {players.length} registered players
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-stadium-950/90 p-3 transition hover:border-amber-500/30"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <PlayerHeadshot player={p} teamCode={p.previousTeam} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{p.name}</span>
                              {p.isOverseas && (
                                <span
                                  className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-300"
                                  title="Overseas Player"
                                >
                                  ✈️ OS
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Globe className="h-3 w-3" /> {p.country}
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Award className="h-3 w-3 text-amber-400" />
                                {p.isCapped ? 'Capped' : 'Uncapped'}
                              </span>
                              <span>• Set {p.auctionSet}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {roomCode && (
                            <button
                              type="button"
                              onClick={() => toggleWishlist(roomCode, p.id)}
                              title={
                                wishlistMap.has(p.id)
                                  ? 'Remove from War Room Wishlist'
                                  : 'Star into War Room Wishlist'
                              }
                              className={`rounded-lg p-1 transition ${
                                wishlistMap.has(p.id)
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'text-slate-500 hover:text-amber-400'
                              }`}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  wishlistMap.has(p.id) ? 'fill-amber-400' : ''
                                }`}
                              />
                            </button>
                          )}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${roleBadgeClasses(
                              p.role
                            )}`}
                          >
                            {p.role}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-1 text-xs text-slate-300">{p.speciality}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono font-bold text-amber-300">
                          OVR {p.overallRating}
                        </span>
                        <span className="text-slate-400">
                          BAT {p.battingRating} • BWL {p.bowlingRating}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        Base {formatLakhs(p.basePriceLakhs)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
