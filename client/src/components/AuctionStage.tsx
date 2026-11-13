import React, { useEffect, useRef, useState } from 'react';
import {
  Gavel,
  Pause,
  Play,
  SkipForward,
  Zap,
  RotateCcw,
  Trophy,
  Hand,
  Ban,
  Globe,
  Award,
  Sparkles,
  BarChart3,
  Volume2,
  VolumeX,
  Star,
  Brain,
} from 'lucide-react';
import { PlayerDTO, RoomSnapshot, TeamCode } from '../types';
import {
  formatLakhs,
  formatLakhsForSpeech,
  getFranchiseMeta,
  roleBadgeClasses,
  roleFullLabel,
} from '../utils/format';
import {
  playTimerUrgentTick,
  isAuctioneerVoiceEnabled,
  setAuctioneerVoiceEnabled,
  speakAuctioneer,
  cancelAuctioneerSpeech,
} from '../utils/sound';
import { fireTeamConfetti } from '../utils/confetti';
import { getWishlist, toggleWishlist, WishlistItem } from '../utils/wishlist';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { WarRoomPanel } from './WarRoomPanel';
import { RTMChallengeModal } from './RTMChallengeModal';

interface HammerBanner {
  type: 'SOLD' | 'UNSOLD';
  player: PlayerDTO;
  teamCode?: TeamCode;
  priceLakhs?: number;
}

interface AuctionStageProps {
  room: RoomSnapshot;
  currentUserId: string;
  serverOffsetMs: number;
  hammerBanner: HammerBanner | null;
  floatingReactions: { id: string; emoji: string; sender: string; leftPct: number }[];
  onBid: (teamCode: TeamCode, amountLakhs?: number) => void;
  onPass: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onToggleAccelerated: (enabled: boolean) => void;
  onUnsoldRound: () => void;
  onFinishAuction: () => void;
  onOpenLiveRankPreview: () => void;
  onRtmDecision?: (decision: 'MATCH' | 'DECLINE') => void;
  onRtmRaise?: (action: 'RAISE' | 'PASS', amountLakhs?: number) => void;
}

export const AuctionStage: React.FC<AuctionStageProps> = ({
  room,
  currentUserId,
  serverOffsetMs,
  hammerBanner,
  floatingReactions,
  onBid,
  onPass,
  onPause,
  onResume,
  onSkip,
  onToggleAccelerated,
  onUnsoldRound,
  onFinishAuction,
  onOpenLiveRankPreview,
  onRtmDecision,
  onRtmRaise,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(room.timerSeconds * 1000);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(() => isAuctioneerVoiceEnabled());
  const [warRoomOpen, setWarRoomOpen] = useState(false);
  const [droppingHammer, setDroppingHammer] = useState(false);
  const [wishlistMap, setWishlistMap] = useState<Map<number, WishlistItem>>(() =>
    getWishlist(room.code)
  );

  const lastUrgentSecRef = useRef<number | null>(null);
  const lastAnnouncedLotRef = useRef<string | null>(null);
  const lastAnnouncedBidRef = useRef<{ lotId: string; bidLakhs: number; team: string } | null>(null);
  const lastCallRef = useRef<string | null>(null);
  const lastHammerBannerRef = useRef<HammerBanner | null>(null);

  const isHost = room.hostUserId === currentUserId;
  const myTeam = room.teams.find((t) => t.userId === currentUserId) || null;
  const lot = room.currentLot;
  const p = lot?.player || null;

  useEffect(() => {
    const handleWishlist = () => setWishlistMap(getWishlist(room.code));
    window.addEventListener('ipl_wishlist_updated', handleWishlist);
    return () => window.removeEventListener('ipl_wishlist_updated', handleWishlist);
  }, [room.code]);

  // Spoken voice callouts
  useEffect(() => {
    if (!speechEnabled || room.status !== 'ACTIVE' || !lot) return;

    if (lot.lotId !== lastAnnouncedLotRef.current) {
      lastAnnouncedLotRef.current = lot.lotId;
      lastAnnouncedBidRef.current = null;
      lastCallRef.current = null;
      const speech = `Lot ${lot.lotNumber}. ${lot.player.name}, ${lot.player.country}. Base price ${formatLakhsForSpeech(lot.basePriceLakhs)}.`;
      speakAuctioneer(speech, { cancelPrevious: true });
    }
  }, [lot?.lotId, speechEnabled, room.status]);

  useEffect(() => {
    if (!speechEnabled || room.status !== 'ACTIVE' || !lot?.currentBidLakhs || !lot?.currentBidderTeam) return;

    const key = `${lot.lotId}_${lot.currentBidLakhs}_${lot.currentBidderTeam}`;
    const lastKey = lastAnnouncedBidRef.current
      ? `${lastAnnouncedBidRef.current.lotId}_${lastAnnouncedBidRef.current.bidLakhs}_${lastAnnouncedBidRef.current.team}`
      : null;

    if (key !== lastKey) {
      lastAnnouncedBidRef.current = {
        lotId: lot.lotId,
        bidLakhs: lot.currentBidLakhs,
        team: lot.currentBidderTeam,
      };
      lastCallRef.current = null;
      const bFranchise = getFranchiseMeta(lot.currentBidderTeam)?.name || lot.currentBidderTeam;
      speakAuctioneer(`${formatLakhsForSpeech(lot.currentBidLakhs)} to ${bFranchise}.`, { cancelPrevious: true });
    }
  }, [lot?.currentBidLakhs, lot?.currentBidderTeam, speechEnabled, room.status]);

  // Urgent timer countdown callouts ("Going once...", "Going twice...")
  useEffect(() => {
    if (!speechEnabled || room.status !== 'ACTIVE' || !lot?.currentBidLakhs) return;
    const wholeSec = Math.ceil(remainingMs / 1000);
    if (wholeSec === 4 && lastCallRef.current !== 'once') {
      lastCallRef.current = 'once';
      speakAuctioneer('Going once...', { cancelPrevious: false });
    } else if (wholeSec === 2 && lastCallRef.current !== 'twice') {
      lastCallRef.current = 'twice';
      speakAuctioneer('Going twice...', { cancelPrevious: false });
    }
  }, [remainingMs, speechEnabled, room.status, lot?.currentBidLakhs]);

  // Hammer Banner callouts & Confetti
  useEffect(() => {
    if (!hammerBanner || hammerBanner === lastHammerBannerRef.current) return;
    lastHammerBannerRef.current = hammerBanner;

    if (hammerBanner.type === 'SOLD') {
      const winner = getFranchiseMeta(hammerBanner.teamCode);
      fireTeamConfetti(winner?.primaryColor, winner?.secondaryColor);
      if (speechEnabled) {
        speakAuctioneer(
          `SOLD to ${winner?.name || hammerBanner.teamCode} for ${formatLakhsForSpeech(hammerBanner.priceLakhs)}!`,
          { cancelPrevious: true }
        );
      }
    } else if (hammerBanner.type === 'UNSOLD') {
      if (speechEnabled) {
        speakAuctioneer(`${hammerBanner.player.name} is UNSOLD.`, { cancelPrevious: true });
      }
    }
  }, [hammerBanner, speechEnabled]);

  useEffect(() => {
    if (room.status === 'PAUSED') {
      setRemainingMs(room.pausedRemainingMs ?? room.timerSeconds * 1000);
      return;
    }
    if (!room.timerEndsAt || room.status !== 'ACTIVE') {
      setRemainingMs(0);
      return;
    }

    const update = () => {
      const syncedNow = Date.now() + serverOffsetMs;
      const rem = Math.max(0, (room.timerEndsAt || 0) - syncedNow);
      setRemainingMs(rem);

      const wholeSec = Math.ceil(rem / 1000);
      if (wholeSec >= 1 && wholeSec <= 3 && lastUrgentSecRef.current !== wholeSec) {
        lastUrgentSecRef.current = wholeSec;
        playTimerUrgentTick();
      }
      if (wholeSec > 3) {
        lastUrgentSecRef.current = null;
      }
    };

    update();
    const id = setInterval(update, 80);
    return () => clearInterval(id);
  }, [room.timerEndsAt, room.status, room.pausedRemainingMs, room.timerSeconds, serverOffsetMs]);

  // Eligibility checks for current user's franchise
  const isLeadingBidder = Boolean(
    myTeam && lot && lot.currentBidderTeam === myTeam.teamCode
  );
  const hasPassed = Boolean(myTeam && room.passedTeams.includes(myTeam.teamCode));
  const nextMin = lot?.nextMinBidLakhs || 0;

  let blockReason: string | null = null;
  if (!myTeam) {
    blockReason = 'Spectator Mode (No franchise claimed)';
  } else if (room.status === 'PAUSED') {
    blockReason = 'Auction is Paused';
  } else if (!lot || lot.status !== 'ON_BLOCK' || hammerBanner) {
    blockReason = 'Preparing next lot...';
  } else if (isLeadingBidder) {
    blockReason = `${myTeam.teamCode} holds the highest bid!`;
  } else if (myTeam.squadCount >= room.maxSquadSize) {
    blockReason = `Squad Full (${room.maxSquadSize}/${room.maxSquadSize})`;
  } else if (p?.isOverseas && myTeam.overseasCount >= room.maxOverseas) {
    blockReason = `Overseas Limit Reached (${room.maxOverseas}/${room.maxOverseas})`;
  } else if (nextMin > myTeam.purseRemainingLakhs) {
    blockReason = `Insufficient Purse (${formatLakhs(myTeam.purseRemainingLakhs)} left)`;
  }

  const canBid = !blockReason && Boolean(myTeam && lot && room.status === 'ACTIVE');

  // Spacebar quick-paddle shortcut when not typing in an input/textarea
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (canBid && myTeam) {
        e.preventDefault();
        onBid(myTeam.teamCode);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canBid, myTeam, onBid]);

  const totalTimerMs = (room.acceleratedMode ? Math.min(8, room.timerSeconds) : room.timerSeconds) * 1000;
  const pctRemaining = Math.min(100, Math.max(0, (remainingMs / totalTimerMs) * 100));
  const secondsDisplay = (remainingMs / 1000).toFixed(1);
  const isUrgent = remainingMs > 0 && remainingMs <= 4000 && room.status === 'ACTIVE';

  const leadingMeta = getFranchiseMeta(lot?.currentBidderTeam);

  return (
    <div className="relative space-y-4">
      {/* Floating Emoji Reactions Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 h-44 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.leftPct}%` }}
            className="animate-float-reaction absolute bottom-0 flex flex-col items-center"
          >
            <span className="text-3xl drop-shadow-lg">{r.emoji}</span>
            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {r.sender}
            </span>
          </div>
        ))}
      </div>

      {/* Top Status & Host Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-stadium-900/95 px-4 py-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-display text-sm font-black uppercase tracking-wider text-amber-300">
            <Gavel className="h-4 w-4" />
            <span>{lot ? `${lot.setLabel} • Lot #${lot.lotNumber}/${lot.totalLots}` : 'Auction Arena'}</span>
          </div>
          {room.acceleratedMode && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-purple-500/25 px-2.5 py-1 text-xs font-black uppercase text-purple-300 border border-purple-500/40 animate-pulse">
              <Zap className="h-3.5 w-3.5" /> Fast 7s Mode
            </span>
          )}
          <span className="text-slate-400">
            Sold: <strong className="text-emerald-400 font-mono font-bold">{room.counts.sold}</strong> • Unsold:{' '}
            <strong className="text-rose-400 font-mono font-bold">{room.counts.unsold}</strong> • Left:{' '}
            <strong className="text-white font-mono font-bold">{room.counts.upcoming}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Auctioneer Spoken Voice Mute / Unmute Button */}
          <button
            type="button"
            onClick={() => {
              const next = !speechEnabled;
              setSpeechEnabled(next);
              setAuctioneerVoiceEnabled(next);
              if (!next) {
                cancelAuctioneerSpeech();
              }
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
              speechEnabled
                ? 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-md shadow-amber-500/20'
                : 'border-rose-500/50 bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
            }`}
            title={
              speechEnabled
                ? 'AI Announcer Voice: ON (Click to MUTE speech for bids, sold and unsold)'
                : 'AI Announcer Voice: MUTED (Click to Turn ON AI speech)'
            }
          >
            {speechEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-amber-400 animate-pulse" />
                <span>AI Voice: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-rose-400" />
                <span>AI Voice: MUTED</span>
              </>
            )}
          </button>

          {/* Franchise War Room Button */}
          <button
            type="button"
            onClick={() => setWarRoomOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/20 px-3 py-2 text-xs font-black uppercase tracking-wider text-purple-300 transition hover:bg-purple-500/30 shadow-sm"
            title="Open Franchise War Room Strategy & Target Wishlist"
          >
            <Brain className="h-3.5 w-3.5" />
            <span>War Room</span>
            {wishlistMap.size > 0 && (
              <span className="rounded-full bg-purple-400 px-1.5 text-[10px] font-black text-stadium-950">
                {wishlistMap.size}
              </span>
            )}
          </button>

          <button
            onClick={onOpenLiveRankPreview}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/30 shadow-sm"
            title="Preview Live AI Squad Rankings (#1–#10)"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>AI Rank Check</span>
          </button>

          {isHost && (
            <>
              {room.status === 'ACTIVE' ? (
                <button
                  onClick={onPause}
                  className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={onResume}
                  className="flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume</span>
                </button>
              )}

              {room.status === 'ACTIVE' && (
                <button
                  type="button"
                  disabled={droppingHammer}
                  onClick={() => {
                    if (droppingHammer) return;
                    setDroppingHammer(true);
                    onSkip();
                    setTimeout(() => setDroppingHammer(false), 2000);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-500/30 to-amber-500/15 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-300 shadow-md hover:border-amber-400 hover:bg-amber-500/30 active:scale-95 transition disabled:opacity-50"
                  title="Not interested? AI bots will bid according to player's market capability and hammer immediately"
                >
                  <Gavel
                    className={`h-3.5 w-3.5 text-amber-400 ${
                      droppingHammer ? 'animate-bounce' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {droppingHammer ? 'Dropping Gavel...' : 'Pass to AI / Hammer'}
                  </span>
                  <span className="sm:hidden">
                    {droppingHammer ? 'Gavel...' : 'Hammer'}
                  </span>
                </button>
              )}

              <button
                onClick={() => onToggleAccelerated(!room.acceleratedMode)}
                className={`flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                  room.acceleratedMode
                    ? 'border-purple-400 bg-purple-500/20 text-purple-200'
                    : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title="Toggle 7-second Accelerated Countdown"
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Fast</span>
              </button>

              {room.counts.unsold > 0 && (
                <button
                  onClick={onUnsoldRound}
                  className="flex items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
                  title="Bring Unsold Players Back for Accelerated Bidding"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Unsold Round</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Conclude the auction now and generate final #1–#10 AI Team Rankings?'
                    )
                  ) {
                    onFinishAuction();
                  }
                }}
                className="flex items-center gap-1 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/30 to-amber-500/15 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-300 hover:brightness-110 active:scale-95 transition"
                title="End Auction & Predict Best Team Rankings"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>End & Rank</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Broadcast Stage Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-stadium-900 via-stadium-900 to-stadium-950 p-4 shadow-2xl sm:p-6">
        {/* SOLD / UNSOLD Celebration Stamp Overlay */}
        {hammerBanner && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stadium-950/90 p-6 text-center backdrop-blur-md">
            <div
              className={`animate-stamp rounded-2xl border-4 px-8 py-5 shadow-2xl ${
                hammerBanner.type === 'SOLD'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/25'
                  : 'border-rose-400 bg-rose-500/20 text-rose-300 shadow-rose-500/25'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-3xl font-black tracking-widest sm:text-5xl">
                <Gavel className="h-8 w-8 sm:h-11 sm:w-11" />
                <span>{hammerBanner.type === 'SOLD' ? 'SOLD!' : 'UNSOLD'}</span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-3">
                <PlayerHeadshot
                  player={hammerBanner.player}
                  teamCode={hammerBanner.teamCode}
                  size="md"
                />
                <div className="text-left">
                  <div className="text-lg font-extrabold text-white sm:text-2xl">
                    {hammerBanner.player.name}
                  </div>
                  {hammerBanner.type === 'SOLD' && hammerBanner.teamCode && (
                    <div className="mt-1 flex items-center gap-2 text-base font-black text-amber-300 sm:text-xl">
                      <FranchiseLogo teamCode={hammerBanner.teamCode} size="xs" />
                      <span>To {hammerBanner.teamCode}</span>
                      <span>•</span>
                      <span className="tabular-nums">
                        {formatLakhs(hammerBanner.priceLakhs)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Calling next player to the auction block...
            </p>
          </div>
        )}

        {p && lot ? (
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Left 7 Cols: Player Profile, Stats & Skill Bars - Star Sports Broadcast Podium */}
            <div className="space-y-4 lg:col-span-7">
              <div className="flex items-start justify-between gap-3.5">
                <div className="flex items-center gap-4">
                  {/* Official Real Player Headshot in Television Studio Cutout Frame */}
                  <div className="relative shrink-0">
                    <PlayerHeadshot
                      player={p}
                      teamCode={p.previousTeam || lot.currentBidderTeam}
                      size="lg"
                      showBadge
                      className="border-2 border-amber-400/40 shadow-xl"
                    />
                  </div>

                  <div className="min-w-0">
                    {/* Television Graphic Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.marquee && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500/30 to-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/50 shadow-sm">
                          <Sparkles className="h-3 w-3" /> Marquee Lot
                        </span>
                      )}
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${roleBadgeClasses(
                          p.role
                        )}`}
                      >
                        {roleFullLabel(p.role)}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          p.isCapped
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {p.isCapped ? 'Capped' : 'Uncapped'}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          p.isOverseas
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                        }`}
                      >
                        {p.isOverseas ? '✈️ Overseas' : '🇮🇳 Indian'}
                      </span>
                      {p.previousTeam && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <FranchiseLogo teamCode={p.previousTeam} size="xs" />
                          Former: {p.previousTeam} (RTM Eligible)
                        </span>
                      )}
                    </div>

                    {/* TV Lower-Third Player Name Header */}
                    <div className="mt-1 flex items-center gap-2">
                      <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white sm:text-4xl drop-shadow-md">
                        {p.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => toggleWishlist(room.code, p.id)}
                        className={`rounded-xl p-1.5 transition ${
                          wishlistMap.has(p.id)
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/5 text-slate-500 hover:text-amber-400'
                        }`}
                        title={
                          wishlistMap.has(p.id)
                            ? 'Remove from War Room Wishlist'
                            : 'Star into War Room Wishlist'
                        }
                      >
                        <Star
                          className={`h-5 w-5 ${
                            wishlistMap.has(p.id) ? 'fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
                      <span className="inline-flex items-center gap-1 font-bold text-white">
                        <Globe className="h-3.5 w-3.5 text-sky-400" />
                        {p.country}
                      </span>
                      <span>•</span>
                      <span>{p.battingStyle}</span>
                      {p.bowlingStyle !== 'None' && (
                        <>
                          <span>•</span>
                          <span>{p.bowlingStyle}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcaster Scouting Report Banner */}
              <div className="rounded-2xl border border-white/10 bg-stadium-950/80 px-4 py-2.5 text-xs text-amber-200/90 shadow-inner">
                <Award className="mr-2 inline h-4 w-4 text-amber-400" />
                <strong className="text-white uppercase tracking-wider">🎙️ TV Broadcaster Scout Report:</strong>{' '}
                {p.speciality}
              </div>

              {wishlistMap.has(p.id) && (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400" />
                    <strong>WAR ROOM TARGET:</strong>
                    <span>
                      {wishlistMap.get(p.id)?.maxBudgetLakhs
                        ? `Target Budget: ${formatLakhs(wishlistMap.get(p.id)!.maxBudgetLakhs)}`
                        : 'Bookmarked on your Wishlist'}
                    </span>
                  </div>
                  {wishlistMap.get(p.id)?.maxBudgetLakhs && lot.currentBidLakhs && (
                    <span
                      className={`font-mono font-bold ${
                        lot.currentBidLakhs <= wishlistMap.get(p.id)!.maxBudgetLakhs!
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {lot.currentBidLakhs <= wishlistMap.get(p.id)!.maxBudgetLakhs!
                        ? '✅ Within Budget'
                        : '⚠️ Over Budget'}
                    </span>
                  )}
                </div>
              )}

              {/* Career IPL / T20 Numbers - Television Broadcast Telemetry */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="sports-card p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Matches</div>
                  <div className="mt-1 font-display text-xl font-black text-white tabular-nums">
                    {p.iplMatches}
                  </div>
                </div>
                <div className="sports-card p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Runs / SR</div>
                  <div className="mt-1 font-display text-lg font-black text-sky-300 tabular-nums">
                    {p.iplRuns}{' '}
                    <span className="text-xs text-slate-400">({p.iplStrikeRate})</span>
                  </div>
                </div>
                <div className="sports-card p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Wickets</div>
                  <div className="mt-1 font-display text-xl font-black text-purple-300 tabular-nums">
                    {p.iplWickets}
                  </div>
                </div>
                <div className="sports-card p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Economy</div>
                  <div className="mt-1 font-display text-xl font-black text-emerald-300 tabular-nums">
                    {p.iplEconomy > 0 ? p.iplEconomy : '—'}
                  </div>
                </div>
              </div>

              {/* 5 Tactical Skill Bars */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-stadium-950/60 p-3 sm:grid-cols-5">
                {[
                  { label: 'BAT', val: p.battingRating, color: 'bg-sky-400' },
                  { label: 'BOWL', val: p.bowlingRating, color: 'bg-purple-400' },
                  { label: 'PP', val: p.powerplayRating, color: 'bg-emerald-400' },
                  { label: 'DEATH', val: p.deathRating, color: 'bg-amber-400' },
                  { label: 'FIELD', val: p.fieldingRating, color: 'bg-pink-400' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">{stat.label}</span>
                      <span className="font-mono text-white">{stat.val}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${stat.color}`}
                        style={{ width: `${stat.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Cols: Live Television Score Bug & Interactive Paddle Console */}
            <div className="flex flex-col justify-between rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-[#0a1024] via-[#060a17] to-[#02040a] p-5 lg:col-span-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] ring-1 ring-amber-400/20">
              <div>
                {/* TV Broadcast Countdown Clock Bug */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isUrgent
                          ? 'bg-rose-500 animate-ping'
                          : room.status === 'PAUSED'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        isUrgent
                          ? 'text-rose-400 animate-pulse'
                          : 'text-slate-300'
                      }`}
                    >
                      {room.status === 'PAUSED'
                        ? '⏸️ AUCTION PAUSED'
                        : isUrgent
                          ? '🚨 GOING TWICE • HAMMER FALLING!'
                          : '⏱️ OFFICIAL BIDDING CLOCK'}
                    </span>
                  </div>

                  <span
                    className={`tabular-nums font-mono text-2xl font-black ${
                      isUrgent
                        ? 'animate-pulse text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                        : room.status === 'PAUSED'
                          ? 'text-amber-300'
                          : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                    }`}
                  >
                    {secondsDisplay}s
                  </span>
                </div>

                <div className="mt-2.5 h-3.5 w-full overflow-hidden rounded-full bg-stadium-950 p-0.5 border border-white/10 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${
                      isUrgent
                        ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 shadow-[0_0_15px_rgba(244,63,94,0.9)]'
                        : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    }`}
                    style={{ width: `${pctRemaining}%` }}
                  />
                </div>

                {/* Television Score Bug - Current Highest Bid Box */}
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-gradient-to-b from-[#101b38] via-[#091024] to-[#040817] p-5 text-center shadow-xl">
                  <div className="text-[11px] font-black uppercase tracking-widest text-amber-400 drop-shadow-sm">
                    {lot.currentBidLakhs ? 'Current Highest Live Bid' : 'Opening Base Price'}
                  </div>
                  <div className="tabular-nums font-display mt-1 text-4xl font-black text-amber-300 sm:text-5xl drop-shadow-[0_2px_14px_rgba(245,158,11,0.4)]">
                    {formatLakhs(lot.currentBidLakhs ?? lot.basePriceLakhs)}
                  </div>

                  {leadingMeta ? (
                    <div className="mt-3.5 inline-flex items-center gap-3 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-transparent px-4 py-2.5 shadow-xl">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stadium-950 border border-white/20 p-1.5 shadow-inner">
                        <FranchiseLogo teamCode={leadingMeta.code} size="sm" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                          Current Highest Bidder
                        </div>
                        <div className="font-display text-base font-black uppercase tracking-wide text-white truncate drop-shadow-sm">
                          {leadingMeta.name} ({leadingMeta.code})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs font-bold text-slate-400">
                      No bids yet — Raise paddle to open at Base Price!
                    </div>
                  )}
                </div>
              </div>

              {/* Paddle Action Buttons */}
              <div className="mt-5 space-y-3">
                {myTeam && (
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-stadium-900/80 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-black text-stadium-950"
                        style={{ backgroundColor: myTeam.primaryColor }}
                      >
                        {myTeam.teamCode}
                      </span>
                      <span className="font-mono font-black text-amber-300">
                        {formatLakhs(myTeam.purseRemainingLakhs)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Squad: <strong className="text-white">{myTeam.squadCount}/25</strong> • OS:{' '}
                      <strong className="text-sky-300">{myTeam.overseasCount}/8</strong>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canBid || !myTeam}
                  onClick={() => myTeam && onBid(myTeam.teamCode)}
                  className={`btn-sports-paddle flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-4 font-display text-lg font-black uppercase tracking-wider transition ${
                    canBid
                      ? 'text-stadium-950 shadow-xl cursor-pointer'
                      : 'cursor-not-allowed opacity-50 border border-white/10 bg-white/5 text-slate-400 shadow-none'
                  }`}
                >
                  <Hand className="h-6 w-6" />
                  {canBid ? (
                    <span className="tabular-nums">
                      RAISE PADDLE • BID {formatLakhs(nextMin)}
                    </span>
                  ) : (
                    <span className="text-sm">{blockReason || 'Bidding Unavailable'}</span>
                  )}
                </button>

                {/* Jump Bids + Pass Row */}
                {myTeam && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 100].map((jump) => {
                      const jumpTarget = Math.ceil((nextMin + jump) / 5) * 5;
                      const jumpAffordable =
                        canBid && jumpTarget <= myTeam.purseRemainingLakhs;
                      return (
                        <button
                          key={jump}
                          type="button"
                          disabled={!jumpAffordable}
                          onClick={() => onBid(myTeam.teamCode, jumpTarget)}
                          className="rounded-lg border border-white/10 bg-white/5 py-1.5 font-mono text-[11px] font-bold text-slate-200 transition hover:border-amber-400 hover:bg-amber-500/15 hover:text-amber-300 disabled:opacity-35"
                          title={`Jump Bid directly to ${formatLakhs(jumpTarget)}`}
                        >
                          +{jump === 100 ? '1Cr' : `${jump}L`}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={isLeadingBidder || hasPassed || room.status !== 'ACTIVE'}
                      onClick={onPass}
                      className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-bold transition ${
                        hasPassed
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-35'
                      }`}
                    >
                      <Ban className="h-3 w-3" />
                      <span>{hasPassed ? 'Passed' : 'Pass'}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tip: Press [Spacebar] to raise paddle</span>
                  {room.passedTeams.length > 0 && (
                    <span>Passed: {room.passedTeams.join(', ')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-400">
            Waiting for next player lot...
          </div>
        )}
      </div>

      {/* RTM Challenge Modal */}
      {room.rtmPrompt && (
        <RTMChallengeModal
          rtmPrompt={room.rtmPrompt}
          currentUserId={currentUserId}
          teams={room.teams}
          isHost={isHost}
          onDecision={(decision) => onRtmDecision?.(decision)}
          onRaise={(action, amountLakhs) => onRtmRaise?.(action, amountLakhs)}
        />
      )}

      {/* Franchise War Room Modal */}
      {warRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl">
            <WarRoomPanel
              room={room}
              currentUserId={currentUserId}
              onClose={() => setWarRoomOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
