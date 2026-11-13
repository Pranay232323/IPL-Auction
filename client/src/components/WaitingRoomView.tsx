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
} from 'lucide-react';
import { apiRequest } from '../api/http';
import { RoomSnapshot, TeamCode } from '../types';
import { formatLakhs } from '../utils/format';
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
    <div className="space-y-5">
      {/* Top Room Banner */}
      <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-4 shadow-xl sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                Franchise Selection Lobby
              </span>
              <span className="text-xs text-slate-400">
                Purse: <strong className="text-amber-300">₹120.00 Cr</strong> • Squad:{' '}
                <strong className="text-white">18–25</strong> (Max{' '}
                <strong className="text-sky-300">8 Overseas</strong>) • Pool:{' '}
                <strong className="text-white">{room.counts.totalLots} Players</strong>
              </span>
            </div>
            <h1 className="mt-1.5 text-xl font-black text-white sm:text-2xl">{room.name}</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {humanCount} Live Human{humanCount === 1 ? '' : 's'} • {botCount} AI GM
              {botCount === 1 ? '' : 's'} • {10 - activeCount} Open Slot
              {10 - activeCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Copy Invite Code */}
            <button
              onClick={copyCode}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs font-extrabold text-amber-300 transition hover:bg-amber-500/20"
            >
              <span>ROOM CODE:</span>
              <span className="font-mono text-sm tracking-widest text-white">{room.code}</span>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>

            {myTeam && (
              <>
                <button
                  onClick={() => setRetentionTeam(myTeam.teamCode)}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2.5 text-xs font-extrabold text-amber-300 transition hover:bg-amber-500/25"
                >
                  <Star className="h-4 w-4 fill-current" />
                  <span>⭐ Retentions & RTM ({myTeam.retentionsCount}/5)</span>
                </button>

                <button
                  onClick={() => onToggleReady(!myTeam.isReady)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-extrabold transition ${myTeam.isReady
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{myTeam.isReady ? 'Ready!' : 'Mark Ready'}</span>
                </button>
              </>
            )}

            {isHost && (
              <button
                onClick={onStartAuction}
                disabled={activeCount < 2}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-2.5 text-sm font-black text-stadium-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>START MEGA AUCTION ({activeCount}/10)</span>
              </button>
            )}
          </div>
        </div>

        {/* Host Bot Quick Bar */}
        {isHost && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-stadium-950/90 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Crown className="h-4 w-4 text-amber-400" />
              <span>
                <strong className="text-white">Host Controls:</strong> Invite up to 10 live
                players using code <strong className="font-mono text-amber-300">{room.code}</strong>
                , or fill remaining franchises with Smart AI GMs.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={async () => {
                  setAutoApplying2025(true);
                  try {
                    await apiRequest(`/api/rooms/${room.code}/retentions/auto-2025`, { method: 'POST' });
                  } catch {
                    // Handled by state
                  } finally {
                    setAutoApplying2025(false);
                  }
                }}
                disabled={autoApplying2025}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                title="Automatically sets real 2025 IPL retentions for all 10 franchises"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{autoApplying2025 ? 'Applying 2025 Retentions...' : '⚡ Auto-Fill 2025 Retentions'}</span>
              </button>

              <button
                onClick={() => onConfigureBots('FILL_EMPTY')}
                className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Fill Empty with AI GMs</span>
              </button>
              {botCount > 0 && (
                <button
                  onClick={() => onConfigureBots('CLEAR_BOTS')}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
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
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        {room.teams.map((t) => {
          const isMine = t.userId === currentUserId;
          const isOtherHuman = Boolean(t.userId && t.userId !== currentUserId && !t.isBot);
          const canClaim = !isMine && !isOtherHuman;

          return (
            <div
              key={t.teamCode}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition ${isMine
                ? 'border-amber-400 bg-stadium-900 shadow-lg shadow-amber-500/15'
                : isOtherHuman
                  ? 'border-white/15 bg-stadium-900/80'
                  : 'border-white/10 bg-stadium-900/60 hover:border-white/25'
                }`}
            >
              {/* Team color accent bar */}
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${t.primaryColor}, ${t.secondaryColor})`,
                }}
              />

              <div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FranchiseLogo teamCode={t.teamCode} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold leading-tight text-white">
                          {t.teamName}
                        </span>
                        <FranchiseJersey teamCode={t.teamCode} size="sm" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                        <span className="font-semibold text-amber-300">
                          Purse: {formatLakhs(t.purseRemainingLakhs)}
                        </span>
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold text-sky-300">
                          🃏 {t.rtmCardsRemaining} RTMs
                        </span>
                        {t.retentionsCount > 0 && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                            ⭐ {t.retentionsCount} Retained
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Pill */}
                <div className="mt-4 rounded-xl border border-white/10 bg-stadium-950 p-2.5">
                  {isMine ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                        <UserCheck className="h-3.5 w-3.5" />
                        You ({t.ownerName})
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${t.isReady
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-700 text-slate-300'
                          }`}
                      >
                        {t.isReady ? 'READY' : 'NOT READY'}
                      </span>
                    </div>
                  ) : isOtherHuman ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-bold text-white">{t.ownerName}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${t.isReady
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                          }`}
                      >
                        {t.isReady ? 'READY' : 'JOINED'}
                      </span>
                    </div>
                  ) : t.isBot ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-purple-300">
                        <Bot className="h-3.5 w-3.5" />
                        {t.ownerName}
                      </span>
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                        {t.botStrategy}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-xs font-medium text-slate-500">
                      Open Franchise Slot
                    </div>
                  )}
                </div>

                {/* Manage Retentions Button */}
                {(isMine || (isHost && !isOtherHuman)) && (
                  <button
                    onClick={() => setRetentionTeam(t.teamCode)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <Star className="h-3 w-3 fill-current" />
                    <span>Manage Retentions ({t.retentionsCount}/5)</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                {canClaim && (
                  <button
                    onClick={() => onClaimTeam(t.teamCode)}
                    className="flex-1 rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-extrabold text-white transition hover:border-amber-400 hover:bg-amber-500 hover:text-stadium-950"
                  >
                    {t.isBot ? `Take Over ${t.teamCode}` : `Claim ${t.teamCode}`}
                  </button>
                )}

                {isMine && (
                  <div className="flex-1 rounded-xl bg-amber-500/15 py-2 text-center text-xs font-extrabold text-amber-300">
                    ✓ Your Franchise
                  </div>
                )}

                {isOtherHuman && (
                  <div className="flex-1 rounded-xl bg-white/5 py-2 text-center text-xs font-semibold text-slate-400">
                    Claimed
                  </div>
                )}

                {isHost && !t.userId && (
                  <button
                    onClick={() => onConfigureBots('TOGGLE_TEAM', t.teamCode)}
                    className="rounded-xl border border-white/10 bg-stadium-950 px-2.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20"
                    title={t.isBot ? 'Remove AI Bot' : 'Assign AI Bot'}
                  >
                    {t.isBot ? '−Bot' : '+Bot'}
                  </button>
                )}
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
