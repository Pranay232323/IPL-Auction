import React, { useCallback, useEffect, useState } from 'react';
import {
  PlusCircle,
  Hash,
  RefreshCw,
  Users,
  Bot,
  Clock,
  ArrowRight,
  Gavel,
  Trophy,
  Database,
} from 'lucide-react';
import { apiRequest } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { FRANCHISES, PublicRoomSummary, RoomSnapshot, TeamCode } from '../types';

interface LobbyDirectoryProps {
  onEnterRoom: (roomCode: string) => void;
  onOpenCatalog: () => void;
}

export const LobbyDirectory: React.FC<LobbyDirectoryProps> = ({
  onEnterRoom,
  onOpenCatalog,
}) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [roomName, setRoomName] = useState(
    `${user?.displayName || 'Champions'}'s IPL Mega Auction`
  );
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [timerSeconds, setTimerSeconds] = useState<number>(15);
  const [preferredTeam, setPreferredTeam] = useState<TeamCode>('CSK');
  const [fillBots, setFillBots] = useState<boolean>(true);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await apiRequest<{ rooms: PublicRoomSummary[] }>('/api/rooms');
      setRooms(res.rooms);
    } catch {
      // Ignore transient poll errors
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    void fetchRooms();
    const timer = setInterval(() => void fetchRooms(), 8000);
    return () => clearInterval(timer);
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await apiRequest<{ room: RoomSnapshot }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: roomName.trim() || 'IPL Mega Auction Room',
          visibility,
          timerSeconds,
          preferredTeam,
          fillBots,
        }),
      });
      onEnterRoom(res.room.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Please enter a valid 6-character room code.');
      return;
    }
    try {
      await apiRequest<{ room: RoomSnapshot }>(`/api/rooms/${code}`);
      onEnterRoom(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Create Room + Join by Code */}
        <div className="space-y-6 lg:col-span-5">
          {/* Create Room Form */}
          <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-5 shadow-xl">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">Host New IPL Auction</h2>
                <p className="text-xs text-slate-400">
                  10 Franchises • ₹120.00 Cr Purse • 588 Players
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Auction Room Name
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={48}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Your Starting Team
                  </label>
                  <select
                    value={preferredTeam}
                    onChange={(e) => setPreferredTeam(e.target.value as TeamCode)}
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3 py-2.5 text-base sm:text-sm font-semibold text-white focus:border-amber-400 focus:outline-none"
                  >
                    {FRANCHISES.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.code} — {f.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Bid Timer
                  </label>
                  <select
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3 py-2.5 text-base sm:text-sm font-semibold text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value={10}>10 Seconds (Fast)</option>
                    <option value={15}>15 Seconds (Standard)</option>
                    <option value={20}>20 Seconds (Tactical)</option>
                    <option value={30}>30 Seconds (Relaxed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    visibility === 'PUBLIC'
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : 'border-white/10 bg-stadium-950 text-slate-400'
                  }`}
                >
                  🌐 Public Room
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    visibility === 'PRIVATE'
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : 'border-white/10 bg-stadium-950 text-slate-400'
                  }`}
                >
                  🔒 Invite Code Only
                </button>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-stadium-950 p-3">
                <input
                  type="checkbox"
                  checked={fillBots}
                  onChange={(e) => setFillBots(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-amber-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-200">
                    Auto-fill empty slots with Smart AI Franchise GMs
                  </div>
                  <div className="text-slate-400">
                    Real friends joining before start can still claim any bot-held franchise!
                  </div>
                </div>
              </label>

              <button
                type="submit"
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-3 text-sm font-extrabold text-stadium-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-50"
              >
                <Gavel className="h-4 w-4" />
                <span>{creating ? 'Creating Arena...' : 'Create 10-Team Auction Room'}</span>
              </button>
            </form>
          </div>

          {/* Join by Code */}
          <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-5 shadow-xl">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white">
              <Hash className="h-4 w-4 text-sky-400" />
              <span>Join Room with 6-Digit Code</span>
            </h3>
            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (e.g. IPL9X4)"
                maxLength={8}
                className="flex-1 rounded-xl border border-white/15 bg-stadium-950 px-3.5 py-2.5 font-mono text-base sm:text-sm font-bold uppercase tracking-widest text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-extrabold text-stadium-950 transition hover:bg-sky-400"
              >
                <span>Join</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Public Rooms Directory */}
        <div className="lg:col-span-7">
          <div className="flex h-full flex-col rounded-2xl border border-white/15 bg-stadium-900/95 p-5 shadow-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Live Multiplayer Auction Rooms
                </h2>
                <p className="text-xs text-slate-400">
                  Independent server-authoritative rooms • Join up to 10 players per room
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenCatalog}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  <Database className="h-3.5 w-3.5 text-amber-400" />
                  <span>Explore 588 Players</span>
                </button>
                <button
                  onClick={() => void fetchRooms()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {rooms.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-stadium-950/60 p-8 text-center">
                <Gavel className="mb-3 h-10 w-10 text-amber-400/70" />
                <div className="text-sm font-bold text-white">No public auction rooms yet</div>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Create the first room on the left, share the 6-character room code with up to 9
                  friends (or fill empty franchises with Smart AI GMs), and drop the hammer!
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1">
                {rooms.map((r) => {
                  const statusBadge =
                    r.status === 'WAITING'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : r.status === 'ACTIVE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : r.status === 'PAUSED'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                  return (
                    <div
                      key={r.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-stadium-950/90 p-4 transition hover:border-amber-500/40 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-white">{r.name}</span>
                          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                            #{r.code}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${statusBadge}`}
                          >
                            {r.status}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1 text-slate-200">
                            <Users className="h-3.5 w-3.5 text-emerald-400" />
                            {r.humanCount}/10 Humans
                          </span>
                          {r.botCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Bot className="h-3.5 w-3.5 text-purple-400" />
                              {r.botCount} AI GMs
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-sky-400" />
                            {r.timerSeconds}s Timer
                          </span>
                          <span>
                            Sold: {r.soldCount}/{r.totalPlayers}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onEnterRoom(r.code)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-amber-500 hover:text-stadium-950"
                      >
                        {r.status === 'COMPLETED' ? (
                          <>
                            <Trophy className="h-3.5 w-3.5" />
                            <span>View AI Rankings</span>
                          </>
                        ) : (
                          <>
                            <span>Enter Room</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
