import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Flame,
  Clock,
  ArrowUpRight,
  XCircle,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { RTMPromptState, RoomTeamState } from '../types';
import { formatLakhs, getFranchiseMeta } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { playRtmFanfare, playTimerUrgentTick } from '../utils/sound';
import { speakAuctioneer } from '../utils/auctioneerVoice';

interface RTMChallengeModalProps {
  rtmPrompt: RTMPromptState;
  currentUserId: string;
  teams: RoomTeamState[];
  isHost: boolean;
  onDecision: (decision: 'MATCH' | 'DECLINE') => void;
  onRaise: (action: 'RAISE' | 'PASS', amountLakhs?: number) => void;
}

export const RTMChallengeModal: React.FC<RTMChallengeModalProps> = ({
  rtmPrompt,
  currentUserId,
  teams,
  isHost,
  onDecision,
  onRaise,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(10);
  const [percentLeft, setPercentLeft] = useState<number>(100);

  const origTeam = teams.find((t) => t.teamCode === rtmPrompt.originalTeam);
  const origMeta = getFranchiseMeta(rtmPrompt.originalTeam);
  const winnerTeam = teams.find((t) => t.teamCode === rtmPrompt.highestBidderTeam);
  const winnerMeta = getFranchiseMeta(rtmPrompt.highestBidderTeam);

  const isOrigOwner = origTeam?.userId === currentUserId;
  const isWinnerOwner = winnerTeam?.userId === currentUserId;

  const currentPrice = rtmPrompt.currentBidLakhs;
  const raisedPrice = rtmPrompt.finalRaisedBidLakhs ?? currentPrice;

  // Calculate next min raise for highest bidder:
  const minRaiseLakhs =
    currentPrice < 100
      ? currentPrice + 5
      : currentPrice < 200
        ? currentPrice + 10
        : currentPrice < 500
          ? currentPrice + 20
          : currentPrice + 25;

  const maxAffordableLakhs = Math.max(minRaiseLakhs, winnerTeam?.purseRemainingLakhs || minRaiseLakhs);
  const [customRaiseCrores, setCustomRaiseCrores] = useState<string>(() =>
    (minRaiseLakhs / 100).toFixed(2)
  );

  useEffect(() => {
    setCustomRaiseCrores((minRaiseLakhs / 100).toFixed(2));
  }, [minRaiseLakhs]);

  const parsedCustomLakhs = Math.round((parseFloat(customRaiseCrores) || 0) * 100);
  const isRaiseValid =
    !isNaN(parsedCustomLakhs) &&
    parsedCustomLakhs >= minRaiseLakhs &&
    parsedCustomLakhs <= maxAffordableLakhs;

  // Sound and countdown effect
  useEffect(() => {
    playRtmFanfare();
    if (rtmPrompt.stage === 'DECISION_ORIGINAL') {
      speakAuctioneer(
        `Right to Match opportunity for ${origMeta?.name || rtmPrompt.originalTeam} on ${rtmPrompt.player.name} at ${formatLakhs(currentPrice)}!`,
        { cancelPrevious: true }
      );
    } else if (rtmPrompt.stage === 'FINAL_RAISE_WINNER') {
      speakAuctioneer(
        `${origMeta?.name || rtmPrompt.originalTeam} matched! Final bid raise opportunity for ${winnerMeta?.name || rtmPrompt.highestBidderTeam}!`,
        { cancelPrevious: true }
      );
    } else if (rtmPrompt.stage === 'FINAL_MATCH_ORIGINAL') {
      speakAuctioneer(
        `Bid raised to ${formatLakhs(raisedPrice)}! Final Right to Match call for ${origMeta?.name || rtmPrompt.originalTeam}!`,
        { cancelPrevious: true }
      );
    }

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, rtmPrompt.timerEndsAt - Date.now());
      const secs = Math.ceil(remainingMs / 1000);
      setSecondsLeft(secs);
      setPercentLeft(Math.max(0, Math.min(100, (remainingMs / 10000) * 100)));

      if (secs <= 3 && secs > 0) {
        playTimerUrgentTick();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [rtmPrompt.timerEndsAt, rtmPrompt.stage, currentPrice, raisedPrice, origMeta, winnerMeta]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-500/40 bg-stadium-950 shadow-2xl shadow-amber-500/20">
        {/* Animated Accent Bar */}
        <div
          className="h-2 w-full shrink-0 transition-all duration-100 ease-linear"
          style={{
            width: `${percentLeft}%`,
            background:
              percentLeft > 50
                ? 'linear-gradient(90deg, #10B981, #F59E0B)'
                : percentLeft > 25
                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                  : '#EF4444',
          }}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Top Stage Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-300">
                {rtmPrompt.stage === 'FINAL_RAISE_WINNER' ? (
                  <Flame className="h-5 w-5 text-orange-400" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                )}
              </span>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                  {rtmPrompt.stage === 'FINAL_RAISE_WINNER'
                    ? '🔥 BCCI Mega Auction • Final Bid Raise'
                    : '🏏 BCCI Mega Auction • Right-To-Match (RTM)'}
                </span>
                <h3 className="text-xl font-black text-white">
                  {rtmPrompt.stage === 'DECISION_ORIGINAL' &&
                    `${origMeta?.shortName || rtmPrompt.originalTeam} RTM Challenge`}
                  {rtmPrompt.stage === 'FINAL_RAISE_WINNER' &&
                    `${winnerMeta?.shortName || rtmPrompt.highestBidderTeam} Final Raise Chance`}
                  {rtmPrompt.stage === 'FINAL_MATCH_ORIGINAL' &&
                    `Ultimate RTM Call: ${origMeta?.shortName || rtmPrompt.originalTeam}`}
                </h3>
              </div>
            </div>

            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2 font-mono text-lg font-black transition ${
                secondsLeft <= 3
                  ? 'animate-pulse border-rose-500/60 bg-rose-500/20 text-rose-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              <Clock className="h-5 w-5" />
              <span>{secondsLeft}s</span>
            </div>
          </div>

          {/* Player on the Block Card */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-stadium-900/90 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <PlayerHeadshot
                  player={rtmPrompt.player}
                  teamCode={rtmPrompt.originalTeam}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">
                      {rtmPrompt.player.name}
                    </span>
                    {rtmPrompt.player.marquee && (
                      <span className="rounded bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                        MARQUEE
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-extrabold text-sky-300">{rtmPrompt.player.role}</span>
                    <span>•</span>
                    <span>{rtmPrompt.player.country}</span>
                    <span>•</span>
                    <span>Rating: <strong className="text-amber-300">{rtmPrompt.player.overallRating}</strong></span>
                  </div>
                </div>
              </div>

              {/* Franchise matchup */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-right">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-400">Former Franchise</div>
                    <div className="text-xs font-black text-amber-300">
                      {rtmPrompt.originalTeam} ({origTeam?.rtmCardsRemaining ?? 0} RTMs)
                    </div>
                  </div>
                  <FranchiseLogo teamCode={rtmPrompt.originalTeam} size="sm" />
                </div>

                <span className="text-xs font-black text-slate-500">VS</span>

                <div className="flex items-center gap-2">
                  <FranchiseLogo teamCode={rtmPrompt.highestBidderTeam} size="sm" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Winning Bidder</div>
                    <div className="text-xs font-black text-sky-300">
                      {rtmPrompt.highestBidderTeam}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Price Display */}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-slate-400">
                {rtmPrompt.stage === 'FINAL_MATCH_ORIGINAL' ? 'Raised Bid to Match:' : 'Current Winning Bid:'}
              </span>
              <span className="text-xl font-black text-amber-300">
                {formatLakhs(rtmPrompt.stage === 'FINAL_MATCH_ORIGINAL' ? raisedPrice : currentPrice)}
              </span>
            </div>
          </div>

          {/* Interactive Decision Stages */}
          <div className="mt-6">
            {/* Stage 1: Original Team Decides to Match or Decline */}
            {rtmPrompt.stage === 'DECISION_ORIGINAL' && (
              <>
                {isOrigOwner || (isHost && Boolean(origTeam?.isBot)) ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      As the owner of <strong className="text-amber-300">{origMeta?.name}</strong>,
                      you can exercise 1 of your{' '}
                      <strong className="text-sky-300">
                        {origTeam?.rtmCardsRemaining || 0} remaining RTM cards
                      </strong>{' '}
                      to match the winning bid of{' '}
                      <strong className="text-amber-300">{formatLakhs(currentPrice)}</strong>!
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onDecision('DECLINE')}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Decline RTM</span>
                      </button>
                      <button
                        onClick={() => onDecision('MATCH')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-500/30 hover:brightness-110"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Exercise RTM (Match {formatLakhs(currentPrice)})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-stadium-900/60 p-4 text-center">
                    <div className="text-xs text-slate-400">Spectator View:</div>
                    <div className="mt-1 font-bold text-white">
                      Waiting for <strong className="text-amber-300">{origMeta?.name}</strong> to
                      exercise their RTM Card or concede...
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Stage 2: Highest Bidder gets one final raise opportunity */}
            {rtmPrompt.stage === 'FINAL_RAISE_WINNER' && (
              <>
                {isWinnerOwner || (isHost && Boolean(winnerTeam?.isBot)) ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-300">
                      <strong className="text-amber-300">{origMeta?.shortName}</strong> matched your
                      bid of {formatLakhs(currentPrice)}! Under 2025 BCCI rules, you have{' '}
                      <strong className="text-white">ONE final opportunity</strong> to enter your custom
                      final bid or pass!
                    </p>

                    {/* Interactive Custom Price Input */}
                    <div className="rounded-2xl border border-amber-500/30 bg-stadium-900/95 p-4 shadow-inner">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <label className="font-extrabold uppercase tracking-wider text-amber-300">
                          Enter Your Final Raised Bid:
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Min: <strong className="text-white">{formatLakhs(minRaiseLakhs)}</strong> • Max Purse: <strong className="text-emerald-400">{formatLakhs(maxAffordableLakhs)}</strong>
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-extrabold text-amber-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.05"
                            min={(minRaiseLakhs / 100).toFixed(2)}
                            max={(maxAffordableLakhs / 100).toFixed(2)}
                            value={customRaiseCrores}
                            onChange={(e) => setCustomRaiseCrores(e.target.value)}
                            placeholder={(minRaiseLakhs / 100).toFixed(2)}
                            className="w-full rounded-xl border border-white/20 bg-stadium-950 py-2.5 pl-8 pr-12 font-mono text-lg font-black text-white focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Cr
                          </span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-stadium-950 px-3 py-2 text-right">
                          <div className="text-[10px] text-slate-400 uppercase">Equivalent</div>
                          <div className="font-mono text-xs font-black text-amber-300">
                            {formatLakhs(parsedCustomLakhs)}
                          </div>
                        </div>
                      </div>

                      {/* Quick Add Pill Steppers */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Quick Add:</span>
                        {[
                          { label: '+25 L', addLakhs: 25 },
                          { label: '+50 L', addLakhs: 50 },
                          { label: '+1.00 Cr', addLakhs: 100 },
                          { label: '+2.00 Cr', addLakhs: 200 },
                          { label: '+5.00 Cr', addLakhs: 500 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => {
                              const base = Math.max(minRaiseLakhs, parsedCustomLakhs);
                              const target = Math.min(maxAffordableLakhs, base + chip.addLakhs);
                              setCustomRaiseCrores((target / 100).toFixed(2));
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 transition hover:bg-white/15 hover:text-white"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      {!isRaiseValid && (
                        <p className="mt-2 text-[11px] text-rose-400">
                          {parsedCustomLakhs < minRaiseLakhs
                            ? `Final raise must be at least ${formatLakhs(minRaiseLakhs)}.`
                            : `Exceeds max available purse (${formatLakhs(maxAffordableLakhs)}).`}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => onRaise('PASS')}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                      >
                        <span>Pass (Concede to {rtmPrompt.originalTeam})</span>
                      </button>
                      <button
                        disabled={!isRaiseValid}
                        onClick={() => onRaise('RAISE', parsedCustomLakhs)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-3.5 text-xs font-black text-stadium-950 shadow-lg shadow-orange-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span>Submit Final Bid: {formatLakhs(parsedCustomLakhs)}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-stadium-900/60 p-4 text-center">
                    <div className="text-xs text-slate-400">Spectator View:</div>
                    <div className="mt-1 font-bold text-white">
                      <strong className="text-amber-300">{rtmPrompt.originalTeam}</strong> exercised
                      RTM! Waiting for{' '}
                      <strong className="text-sky-300">{winnerMeta?.name}</strong> to enter a custom
                      final raise or pass...
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Stage 3: Original Team matches final raised bid */}
            {rtmPrompt.stage === 'FINAL_MATCH_ORIGINAL' && (
              <>
                {isOrigOwner || (isHost && Boolean(origTeam?.isBot)) ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      <strong className="text-sky-300">{winnerMeta?.shortName}</strong> raised their
                      bid to <strong className="text-amber-300">{formatLakhs(raisedPrice)}</strong>!
                      Will you match this final amount to claim {rtmPrompt.player.name}?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onDecision('DECLINE')}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Concede to {rtmPrompt.highestBidderTeam}</span>
                      </button>
                      <button
                        onClick={() => onDecision('MATCH')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-500/30 hover:brightness-110"
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Match Final {formatLakhs(raisedPrice)} (Claim Player)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-stadium-900/60 p-4 text-center">
                    <div className="text-xs text-slate-400">Spectator View:</div>
                    <div className="mt-1 font-bold text-white">
                      Bid raised to {formatLakhs(raisedPrice)}! Waiting for{' '}
                      <strong className="text-amber-300">{origMeta?.name}</strong> to match or
                      concede...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
