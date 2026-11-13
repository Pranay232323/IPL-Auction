import React, { useState } from 'react';
import {
  Copy,
  Check,
  Bot,
  Play,
  Crown,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Trash2,
  Star,
  Users,
  Shield,
  Layers,
  Zap,
} from 'lucide-react';
import { apiRequest } from '../api/http';
import { RoomSnapshot, TeamCode } from '../types';
import { formatLakhs, getFranchiseMeta } from '../utils/format';
import { FranchiseLogo, FranchiseJersey } from '../utils/franchiseAssets';
import { RetentionSelectionModal } from './RetentionSelectionModal';

interface WaitingRoomViewProps {
  room: RoomSnapshot;
  currentUserId: string;
  onClaimTeam: (teamCode: TeamCode) => void;
  onToggleReady: (ready: boolean) => void;
  onConfigureBots: (mode: 'FILL_EMPTY' | 'CLEAR_BOTS' | 'TOGGLE_TEAM', teamCode?: TeamCode) => void;
  onStartAuction: () => void;
}

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  room,
  currentUserId,
  onClaimTeam,
  onToggleReady,
  onConfigureBots,
  onStartAuction,
}) => {
  const [copied, setCopied] = useState(false);
  const [retentionTeam, setRetentionTeam] = useState<TeamCode | null>(null);
  const [autoApplying2025, setAutoApplying2025] = useState(false);

  const isHost = room.hostUserId === currentUserId;
  const myTeam = room.teams.find((t) => t.userId === currentUserId);
  const activeCount = room.teams.filter((t) => t.userId !== null || t.isBot).length;
  const humanCount = room.teams.filter((t) => t.userId !== null && !t.isBot).length;
  const botCount = room.teams.filter((t) => t.isBot).length;

  const copyCode = () => {
    void navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Arena Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-stadium-950 via-stadium-900 to-stadium-950 p-5 shadow-2xl sm:p-7">
        {/* Subtle accent glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Franchise War-Room Lobby</span>
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Purse: <strong className="font-mono text-amber-300">₹120.00 Cr</strong> • Squad:{' '}
                <strong className="text-white">18–25</strong> (Max{' '}
                <strong className="text-sky-300">8 Overseas</strong>) • Registered Pool:{' '}
                <strong className="text-white">{room.counts.totalLots} Stars</strong>
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl lg:text-4xl">
              {room.name}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-sky-400" />
                <strong className="text-white">{humanCount}</strong> Live Human{humanCount === 1 ? '' : 's'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-purple-400" />
                <strong className="text-white">{botCount}</strong> Smart AI GM{botCount === 1 ? '' : 's'}
              </span>
              <span>•</span>
              <span className="text-slate-400">
                <strong className="text-amber-300">{10 - activeCount}</strong> Open Franchise Slot{10 - activeCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Copy Room Code Button */}
            <button
              onClick={copyCode}
              className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-xs font-black text-amber-300 shadow-md shadow-amber-500/10 transition hover:bg-amber-500/25 active:scale-95"
              title="Click to copy room invite code"
            >
              <span className="text-[10px] uppercase text-slate-300">Room Code:</span>
              <span className="font-mono text-base font-black tracking-widest text-white">
                {room.code}
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-amber-300" />
              )}
            </button>

            {myTeam && (
              <>
                <button
                  onClick={() => setRetentionTeam(myTeam.teamCode)}
                  className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-500/10 px-4 py-2.5 text-xs font-black text-amber-300 transition hover:bg-amber-500/30 shadow-md shadow-amber-500/10"
                >
                  <Star className="h-4 w-4 fill-current text-amber-400" />
                  <span>⭐ Retentions & RTM ({myTeam.retentionsCount}/5)</span>
                </button>

                <button
                  onClick={() => onToggleReady(!myTeam.isReady)}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black transition ${
                    myTeam.isReady
                      ? 'border-emerald-500/60 bg-emerald-500/25 text-emerald-300 shadow-lg shadow-emerald-500/20'
                      : 'border-white/20 bg-white/10 text-slate-200 hover:bg-white/15'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{myTeam.isReady ? 'READY TO BID! ✓' : 'CLICK TO READY UP'}</span>
                </button>
              </>
            )}

            {isHost && (
              <button
                onClick={onStartAuction}
                disabled={activeCount < 2}
                className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-3 text-sm font-black text-stadium-950 shadow-xl shadow-amber-500/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>START MEGA AUCTION ({activeCount}/10)</span>
              </button>
            )}
          </div>
        </div>

        {/* Host Bot Management Strip */}
        {isHost && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-stadium-950/80 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <Crown className="h-4 w-4" />
              </div>
              <span>
                <strong className="text-white">Host War-Room Controls:</strong> Fill empty franchise slots with Smart AI GMs or invite friends with room code <strong className="font-mono text-amber-300">{room.code}</strong>.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={async () => {
                  setAutoApplying2025(true);
                  try {
                    await apiRequest(`/api/rooms/${room.code}/retentions/auto-2025`, { method: 'POST' });
                  } catch {
                    // Handled
                  } finally {
                    setAutoApplying2025(false);
                  }
                }}
                disabled={autoApplying2025}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-black text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50"
                title="Automatically sets real 2025 IPL retentions for all 10 franchises"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{autoApplying2025 ? 'Applying 2025 Retentions...' : '⚡ Auto-Fill Official 2025 Retentions'}</span>
              </button>

              <button
                onClick={() => onConfigureBots('FILL_EMPTY')}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3.5 py-2 text-xs font-black text-purple-300 hover:bg-purple-500/25 transition"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Fill Empty with AI GMs</span>
              </button>

              {botCount > 0 && (
                <button
                  onClick={() => onConfigureBots('CLEAR_BOTS')}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-black text-rose-300 hover:bg-rose-500/20 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Bots</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 10 IPL Franchises Selection Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {room.teams.map((t) => {
          const isMine = t.userId === currentUserId;
          const isOtherHuman = Boolean(t.userId && t.userId !== currentUserId && !t.isBot);
          const canClaim = !isMine && !isOtherHuman;
          const meta = getFranchiseMeta(t.teamCode);

          return (
            <div
              key={t.teamCode}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
                isMine
                  ? 'border-amber-400 bg-gradient-to-b from-stadium-900 via-stadium-950 to-stadium-950 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/40 scale-[1.02]'
                  : isOtherHuman
                    ? 'border-white/20 bg-stadium-900/90 shadow-md'
                    : 'border-white/10 bg-stadium-900/70 hover:border-white/25 hover:bg-stadium-900/90'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className="h-2 w-full"
                style={{
                  background: `linear-gradient(90deg, ${t.primaryColor}, ${t.secondaryColor})`,
                }}
              />

              <div className="p-4 sm:p-5">
                {/* Team Crest & Name Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <FranchiseLogo teamCode={t.teamCode} size="md" />
                      <div className="absolute -bottom-1 -right-1">
                        <FranchiseJersey teamCode={t.teamCode} size="sm" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-black tracking-wide text-white leading-tight">
                        {t.teamName}
                      </h3>
                      <span className="font-mono text-xs font-extrabold uppercase text-slate-400">
                        {t.teamCode} Franchise
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purse & RTM Status Metrics */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-stadium-950/80 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Purse Available
                    </span>
                    <span className="font-mono text-base font-black text-amber-300">
                      {formatLakhs(t.purseRemainingLakhs)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                    <span className="flex items-center gap-1 rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-black text-sky-300">
                      🃏 {t.rtmCardsRemaining} RTM Cards
                    </span>

                    {t.retentionsCount > 0 ? (
                      <span className="flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-300">
                        ⭐ {t.retentionsCount} Retained
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">0 Retained</span>
                    )}
                  </div>
                </div>

                {/* Owner GM Status Card */}
                <div className="mt-3.5 rounded-2xl border border-white/10 bg-stadium-950 p-3">
                  {isMine ? (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="truncate font-black text-amber-300">
                          YOU ({t.ownerName})
                        </span>
                      </div>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          t.isReady
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {t.isReady ? 'READY ✓' : 'NOT READY'}
                      </span>
                    </div>
                  ) : isOtherHuman ? (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate font-bold text-white">{t.ownerName}</span>
                      </div>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                          t.isReady
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.isReady ? 'READY' : 'JOINED'}
                      </span>
                    </div>
                  ) : t.isBot ? (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bot className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span className="truncate font-bold text-purple-300">{t.ownerName}</span>
                      </div>
                      <span className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[10px] font-black text-purple-300 uppercase">
                        {t.botStrategy || 'AI GM'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-0.5">
                      Open Franchise Slot
                    </div>
                  )}
                </div>

                {/* Manage Retentions Trigger */}
                {(isMine || (isHost && !isOtherHuman)) && (
                  <button
                    onClick={() => setRetentionTeam(t.teamCode)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                    <span>Manage Retentions ({t.retentionsCount}/5)</span>
                  </button>
                )}
              </div>

              {/* Action Claim / Takeover Buttons */}
              <div className="border-t border-white/10 bg-stadium-950/60 p-3 sm:px-4">
                <div className="flex items-center gap-2">
                  {canClaim && (
                    <button
                      onClick={() => onClaimTeam(t.teamCode)}
                      className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 text-xs font-black text-stadium-950 shadow-md transition hover:brightness-110 active:scale-95"
                    >
                      {t.isBot ? `Take Over ${t.teamCode}` : `Claim ${t.teamCode}`}
                    </button>
                  )}

                  {isMine && (
                    <div className="flex-1 rounded-xl bg-amber-500/20 border border-amber-400/40 py-2.5 text-center text-xs font-black text-amber-300">
                      ✓ Your Franchise
                    </div>
                  )}

                  {isOtherHuman && (
                    <div className="flex-1 rounded-xl bg-white/5 py-2.5 text-center text-xs font-bold text-slate-400">
                      Claimed by Player
                    </div>
                  )}

                  {isHost && !t.userId && (
                    <button
                      onClick={() => onConfigureBots('TOGGLE_TEAM', t.teamCode)}
                      className="rounded-xl border border-white/10 bg-stadium-900 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition"
                      title={t.isBot ? 'Remove AI Bot' : 'Assign AI Bot'}
                    >
                      {t.isBot ? '−Bot' : '+Bot'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retention Selection Modal */}
      {retentionTeam && (
        <RetentionSelectionModal
          roomCode={room.code}
          teamCode={retentionTeam}
          teamName={
            room.teams.find((t) => t.teamCode === retentionTeam)?.teamName || retentionTeam
          }
          primaryColor={
            room.teams.find((t) => t.teamCode === retentionTeam)?.primaryColor || '#FACC15'
          }
          isOpen={Boolean(retentionTeam)}
          onClose={() => setRetentionTeam(null)}
          onSaveSuccess={() => {
            // Real-time snapshot will automatically update via socket
          }}
        />
      )}
    </div>
  );
};
