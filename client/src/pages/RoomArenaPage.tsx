import React, { useCallback, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Gavel, Users, ListFilter, Mic, ArrowLeftRight } from 'lucide-react';
import { apiRequest } from '../api/http';
import { AnalysisDashboard } from '../components/AnalysisDashboard';
import { AuctionStage } from '../components/AuctionStage';
import { RoomPlayerListsPanel } from '../components/RoomPlayerListsPanel';
import { TeamsOverviewPanel } from '../components/TeamsOverviewPanel';
import { TradeHubModal } from '../components/TradeHubModal';
import { VoiceAndChatPanel } from '../components/VoiceAndChatPanel';
import { WaitingRoomView } from '../components/WaitingRoomView';
import {
  ActiveLotState,
  BidEntryDTO,
  ChatMessageDTO,
  PlayerDTO,
  PublicUser,
  RoomAnalysisReport,
  RoomSnapshot,
  RTMPromptState,
  TeamCode,
  TradeDTO,
  VoicePeerMeta,
} from '../types';
import { playBidBlip, playSoldGavel, playUnsoldStamp } from '../utils/sound';

interface RoomArenaPageProps {
  roomCode: string;
  user: PublicUser;
  socket: Socket | null;
  onExitRoom: () => void;
}

export const RoomArenaPage: React.FC<RoomArenaPageProps> = ({
  roomCode,
  user,
  socket,
  onExitRoom,
}) => {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastError, setToastError] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  const [voiceParticipants, setVoiceParticipants] = useState<VoicePeerMeta[]>([]);
  const [hammerBanner, setHammerBanner] = useState<{
    type: 'SOLD' | 'UNSOLD';
    player: PlayerDTO;
    teamCode?: TeamCode;
    priceLakhs?: number;
  } | null>(null);

  const [floatingReactions, setFloatingReactions] = useState<
    { id: string; emoji: string; sender: string; leftPct: number }[]
  >([]);

  const [analysisReport, setAnalysisReport] = useState<RoomAnalysisReport | null>(null);
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
  const [showTradeHub, setShowTradeHub] = useState(false);

  // Mobile responsive view tab ('stage' | 'teams' | 'pool' | 'comms')
  const [mobileTab, setMobileTab] = useState<'stage' | 'teams' | 'pool' | 'comms'>('stage');

  const showToast = useCallback((msg: string) => {
    setToastError(msg);
    setTimeout(() => {
      setToastError((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  const syncServerClock = useCallback((serverNow?: number) => {
    if (typeof serverNow === 'number') {
      setServerOffsetMs(serverNow - Date.now());
    }
  }, []);

  // Initial REST snapshot load + analysis if COMPLETED
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<{ room: RoomSnapshot }>(`/api/rooms/${roomCode}`)
      .then((res) => {
        if (cancelled) return;
        setRoom(res.room);
        syncServerClock(res.room.serverNow);
        if (res.room.status === 'COMPLETED') {
          void apiRequest<{ analysis: RoomAnalysisReport }>(
            `/api/rooms/${roomCode}/analysis`
          ).then((a) => {
            if (!cancelled) setAnalysisReport(a.analysis);
          });
        }
      })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof Error ? err.message : 'Room not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomCode, showToast, syncServerClock]);

  // Socket.IO Room Subscription & Event Listeners
  useEffect(() => {
    if (!socket) return;

    const joinRoomNow = () => {
      socket.emit(
        'room:join',
        { roomCode },
        (ack: {
          ok?: boolean;
          room?: RoomSnapshot;
          voiceParticipants?: VoicePeerMeta[];
          error?: string;
        }) => {
          if (ack?.ok && ack.room) {
            setRoom(ack.room);
            syncServerClock(ack.room.serverNow);
            if (ack.voiceParticipants) {
              setVoiceParticipants(ack.voiceParticipants);
            }
          } else if (ack?.error) {
            showToast(ack.error);
          }
        }
      );
    };

    joinRoomNow();
    socket.on('connect', joinRoomNow);

    const onRoomState = (nextSnap: RoomSnapshot) => {
      setRoom(nextSnap);
      syncServerClock(nextSnap.serverNow);
    };

    const onLotStarted = (data: {
      currentLot: ActiveLotState | null;
      timerEndsAt: number | null;
      serverNow: number;
      counts: RoomSnapshot['counts'];
    }) => {
      setHammerBanner(null);
      syncServerClock(data.serverNow);
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              currentLot: data.currentLot,
              timerEndsAt: data.timerEndsAt,
              passedTeams: [],
              counts: data.counts,
            }
          : prev
      );
    };

    const onTick = (data: {
      remainingMs: number;
      timerEndsAt: number;
      serverNow: number;
    }) => {
      syncServerClock(data.serverNow);
      setRoom((prev) => (prev ? { ...prev, timerEndsAt: data.timerEndsAt } : prev));
    };

    const onBidPlaced = (data: {
      bid: BidEntryDTO;
      currentLot: ActiveLotState | null;
      timerEndsAt: number | null;
      serverNow: number;
      passedTeams: TeamCode[];
    }) => {
      playBidBlip();
      syncServerClock(data.serverNow);
      setRoom((prev) => {
        if (!prev) return prev;
        const dedupedBids = [
          data.bid,
          ...prev.recentBids.filter((b) => b.id !== data.bid.id),
        ].slice(0, 30);
        return {
          ...prev,
          currentLot: data.currentLot,
          timerEndsAt: data.timerEndsAt,
          passedTeams: data.passedTeams,
          recentBids: dedupedBids,
        };
      });
    };

    const onPassUpdated = (data: { passedTeams: TeamCode[] }) => {
      setRoom((prev) => (prev ? { ...prev, passedTeams: data.passedTeams } : prev));
    };

    const onLotSold = (data: {
      player: PlayerDTO;
      soldToTeam: TeamCode;
      soldPriceLakhs: number;
    }) => {
      playSoldGavel();
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentLot: prev.currentLot
            ? {
                ...prev.currentLot,
                currentBidLakhs: data.soldPriceLakhs,
                currentBidderTeam: data.soldToTeam,
                status: 'SOLD',
              }
            : prev.currentLot,
        };
      });
      setHammerBanner({
        type: 'SOLD',
        player: data.player,
        teamCode: data.soldToTeam,
        priceLakhs: data.soldPriceLakhs,
      });
    };

    const onLotUnsold = (data: { player: PlayerDTO }) => {
      playUnsoldStamp();
      setHammerBanner({
        type: 'UNSOLD',
        player: data.player,
      });
    };

    const onChatMessage = (msg: ChatMessageDTO) => {
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.recentChat.some((c) => c.id === msg.id)) return prev;
        return {
          ...prev,
          recentChat: [...prev.recentChat, msg].slice(-80),
        };
      });
    };

    const onChatReaction = (msg: ChatMessageDTO) => {
      const id = msg.id;
      const leftPct = 15 + Math.floor(Math.random() * 70);
      setFloatingReactions((prev) => [
        ...prev,
        { id, emoji: msg.content, sender: msg.senderName, leftPct },
      ]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    };

    const onVoiceParticipants = (data: { participants: VoicePeerMeta[] }) => {
      setVoiceParticipants(data.participants);
    };

    const onRtmPrompt = (prompt: RTMPromptState) => {
      setRoom((prev) => (prev ? { ...prev, rtmPrompt: prompt } : prev));
    };

    const onAuctionCompleted = (data: {
      analysis: RoomAnalysisReport;
      room: RoomSnapshot;
    }) => {
      setHammerBanner(null);
      setAnalysisReport(data.analysis);
      setRoom(data.room);
      setShowLivePreviewModal(false);
    };

    const onTradeProposed = (data: { trade: TradeDTO; snapshot: RoomSnapshot }) => {
      setRoom(data.snapshot);
    };
    const onTradeAccepted = (data: {
      trade: TradeDTO;
      snapshot: RoomSnapshot;
      analysis?: RoomAnalysisReport;
    }) => {
      setRoom(data.snapshot);
      if (data.analysis) setAnalysisReport(data.analysis);
    };
    const onTradeRejected = (data: { trade: TradeDTO; snapshot: RoomSnapshot }) => {
      setRoom(data.snapshot);
    };
    const onTradeCancelled = (data: { trade: TradeDTO; snapshot: RoomSnapshot }) => {
      setRoom(data.snapshot);
    };
    const onTradeWindowOpened = (data: {
      tradeWindowEndsAt: number;
      snapshot: RoomSnapshot;
    }) => {
      setRoom(data.snapshot);
      setShowTradeHub(true);
    };
    const onTradeWindowClosed = (data: {
      snapshot: RoomSnapshot;
      analysis: RoomAnalysisReport;
    }) => {
      setRoom(data.snapshot);
      setAnalysisReport(data.analysis);
    };

    const onAuctionError = (data: { error: string }) => {
      showToast(data.error);
    };

    socket.on('room:state', onRoomState);
    socket.on('auction:lot_started', onLotStarted);
    socket.on('auction:tick', onTick);
    socket.on('auction:bid_placed', onBidPlaced);
    socket.on('auction:pass_updated', onPassUpdated);
    socket.on('auction:rtm_prompt', onRtmPrompt);
    socket.on('auction:lot_sold', onLotSold);
    socket.on('auction:lot_unsold', onLotUnsold);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:reaction', onChatReaction);
    socket.on('voice:participants', onVoiceParticipants);
    socket.on('auction:completed', onAuctionCompleted);
    socket.on('trade:proposed', onTradeProposed);
    socket.on('trade:accepted', onTradeAccepted);
    socket.on('trade:rejected', onTradeRejected);
    socket.on('trade:cancelled', onTradeCancelled);
    socket.on('trade:window_opened', onTradeWindowOpened);
    socket.on('trade:window_closed', onTradeWindowClosed);
    socket.on('auction:error', onAuctionError);

    return () => {
      socket.emit('room:leave', { roomCode });
      socket.off('connect', joinRoomNow);
      socket.off('room:state', onRoomState);
      socket.off('auction:lot_started', onLotStarted);
      socket.off('auction:tick', onTick);
      socket.off('auction:bid_placed', onBidPlaced);
      socket.off('auction:pass_updated', onPassUpdated);
      socket.off('auction:rtm_prompt', onRtmPrompt);
      socket.off('auction:lot_sold', onLotSold);
      socket.off('auction:lot_unsold', onLotUnsold);
      socket.off('chat:message', onChatMessage);
      socket.off('chat:reaction', onChatReaction);
      socket.off('voice:participants', onVoiceParticipants);
      socket.off('auction:completed', onAuctionCompleted);
      socket.off('trade:proposed', onTradeProposed);
      socket.off('trade:accepted', onTradeAccepted);
      socket.off('trade:rejected', onTradeRejected);
      socket.off('trade:cancelled', onTradeCancelled);
      socket.off('trade:window_opened', onTradeWindowOpened);
      socket.off('trade:window_closed', onTradeWindowClosed);
      socket.off('auction:error', onAuctionError);
    };
  }, [socket, roomCode, showToast, syncServerClock]);

  const handleRtmDecision = useCallback(
    (decision: 'MATCH' | 'DECLINE') => {
      socket?.emit(
        'auction:rtm_decision',
        { roomCode, decision },
        (res?: { ok?: boolean; error?: string }) => {
          if (res && !res.ok && res.error) {
            showToast(res.error);
          }
        }
      );
    },
    [socket, roomCode, showToast]
  );

  const handleRtmRaise = useCallback(
    (action: 'RAISE' | 'PASS', amountLakhs?: number) => {
      socket?.emit(
        'auction:rtm_raise',
        { roomCode, action, raiseAmountLakhs: amountLakhs },
        (res?: { ok?: boolean; error?: string }) => {
          if (res && !res.ok && res.error) {
            showToast(res.error);
          }
        }
      );
    },
    [socket, roomCode, showToast]
  );

  const fetchLiveAnalysisPreview = async (openModal = true) => {
    try {
      const res = await apiRequest<{ analysis: RoomAnalysisReport }>(
        `/api/rooms/${roomCode}/analysis?refresh=1`
      );
      setAnalysisReport(res.analysis);
      if (openModal) setShowLivePreviewModal(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to compute rankings');
    }
  };

  const handleProposeTrade = useCallback(
    async (payload: {
      proposerTeam: TeamCode;
      receiverTeam: TeamCode;
      offeredPlayerIds: number[];
      requestedPlayerIds: number[];
      purseTransferLakhs: number;
    }) => {
      await apiRequest(`/api/rooms/${roomCode}/trades`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    [roomCode]
  );

  const handleRespondTrade = useCallback(
    async (tradeId: string, decision: 'ACCEPT' | 'REJECT') => {
      const res = await apiRequest<{ analysis?: RoomAnalysisReport }>(
        `/api/rooms/${roomCode}/trades/${tradeId}/respond`,
        {
          method: 'POST',
          body: JSON.stringify({ decision }),
        }
      );
      if (res.analysis) {
        setAnalysisReport(res.analysis);
      }
    },
    [roomCode]
  );

  const handleCancelTrade = useCallback(
    async (tradeId: string) => {
      await apiRequest(`/api/rooms/${roomCode}/trades/${tradeId}/cancel`, {
        method: 'POST',
      });
    },
    [roomCode]
  );

  const handleConcludeWindow = useCallback(async () => {
    const res = await apiRequest<{ analysis: RoomAnalysisReport }>(
      `/api/rooms/${roomCode}/trades/conclude`,
      { method: 'POST' }
    );
    if (res.analysis) {
      setAnalysisReport(res.analysis);
    }
  }, [roomCode]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-400">
        Connecting to IPL Auction Arena #{roomCode}...
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-base font-bold text-rose-300">
          Auction room #{roomCode} could not be found.
        </p>
        <button
          onClick={onExitRoom}
          className="mt-4 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-stadium-950"
        >
          Return to Rooms Lobby
        </button>
      </div>
    );
  }

  const myTeam = room.teams.find((t) => t.userId === user.id) || null;

  return (
    <div className="mx-auto max-w-[1600px] px-2.5 py-4 sm:px-5">
      {/* Toast Error Notification */}
      {toastError && (
        <div className="fixed bottom-16 right-4 z-50 max-w-sm rounded-xl border border-rose-500/50 bg-stadium-950/95 px-4 py-3 text-xs font-bold text-rose-300 shadow-2xl sm:bottom-5">
          ⚠️ {toastError}
        </div>
      )}

      {/* ================= 1. WAITING LOBBY STATE ================= */}
      {room.status === 'WAITING' && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8 xl:col-span-9">
            <WaitingRoomView
              room={room}
              currentUserId={user.id}
              onClaimTeam={(teamCode) =>
                socket?.emit('room:claim_team', { roomCode, teamCode })
              }
              onToggleReady={(isReady) =>
                socket?.emit('room:ready', { roomCode, isReady })
              }
              onConfigureBots={(mode, teamCode) =>
                socket?.emit('room:configure_bots', { roomCode, mode, teamCode })
              }
              onStartAuction={() => socket?.emit('auction:start', { roomCode })}
            />
          </div>

          <div className="lg:col-span-4 xl:col-span-3">
            <VoiceAndChatPanel
              socket={socket}
              roomCode={roomCode}
              currentUserId={user.id}
              myTeamCode={myTeam?.teamCode || null}
              chatMessages={room.recentChat}
              recentBids={room.recentBids}
              voiceParticipants={voiceParticipants}
              onSendChat={(content) =>
                socket?.emit('chat:send', { roomCode, content })
              }
              onSendReaction={(emoji) =>
                socket?.emit('chat:react', { roomCode, emoji })
              }
            />
          </div>
        </div>
      )}

      {/* ================= 2. ACTIVE / PAUSED LIVE AUCTION STATE ================= */}
      {(room.status === 'ACTIVE' || room.status === 'PAUSED') && (
        <>
          {/* Mobile Navigation Switcher (< 1024px) */}
          <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-stadium-900 p-1 lg:hidden">
            {[
              { id: 'stage', label: 'Stage', icon: Gavel },
              { id: 'teams', label: '10 Teams', icon: Users },
              { id: 'pool', label: 'Lists', icon: ListFilter },
              { id: 'comms', label: 'Voice/Chat', icon: Mic },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mobileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setMobileTab(tab.id as 'stage' | 'teams' | 'pool' | 'comms')
                  }
                  className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-extrabold transition ${
                    active
                      ? 'bg-amber-500 text-stadium-950'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Live Mid-Auction Ranking Modal */}
          {showLivePreviewModal && analysisReport && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6">
              <div className="mx-auto max-w-6xl">
                <AnalysisDashboard
                  report={analysisReport}
                  isModalPreview
                  onClosePreview={() => setShowLivePreviewModal(false)}
                  onRefresh={() => void fetchLiveAnalysisPreview(true)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left Column: 10 Franchises Live Purse & Squads */}
            <div
              className={`${
                mobileTab === 'teams' ? 'block' : 'hidden'
              } lg:col-span-3 lg:block`}
            >
              <TeamsOverviewPanel room={room} currentUserId={user.id} />
            </div>

            {/* Center Column: Auction Stage + Player Lists */}
            <div
              className={`${
                mobileTab === 'stage' || mobileTab === 'pool' ? 'block' : 'hidden'
              } space-y-4 lg:col-span-6 lg:block`}
            >
              <div className={mobileTab === 'pool' ? 'hidden lg:block' : 'block'}>
                <AuctionStage
                  room={room}
                  currentUserId={user.id}
                  serverOffsetMs={serverOffsetMs}
                  hammerBanner={hammerBanner}
                  floatingReactions={floatingReactions}
                  onBid={(teamCode, amountLakhs) =>
                    socket?.emit('auction:bid', { roomCode, teamCode, amountLakhs })
                  }
                  onPass={() => socket?.emit('auction:pass', { roomCode })}
                  onPause={() => socket?.emit('auction:pause', { roomCode })}
                  onResume={() => socket?.emit('auction:resume', { roomCode })}
                  onSkip={() => {
                    socket?.emit(
                      'auction:skip',
                      { roomCode },
                      (res?: { ok: boolean; error?: string }) => {
                        if (res && !res.ok && res.error) {
                          showToast(res.error);
                        }
                      }
                    );
                  }}
                  onToggleAccelerated={(enabled) =>
                    socket?.emit('auction:accelerated', { roomCode, enabled })
                  }
                  onUnsoldRound={() => socket?.emit('auction:unsold_round', { roomCode })}
                  onFinishAuction={() => socket?.emit('auction:finish', { roomCode })}
                  onOpenLiveRankPreview={() => void fetchLiveAnalysisPreview(true)}
                  onRtmDecision={handleRtmDecision}
                  onRtmRaise={handleRtmRaise}
                />
              </div>

              <div className={mobileTab === 'stage' ? 'hidden lg:block' : 'block'}>
                <RoomPlayerListsPanel
                  roomCode={roomCode}
                  soldCount={room.counts.sold}
                  unsoldCount={room.counts.unsold}
                  upcomingCount={room.counts.upcoming}
                />
              </div>
            </div>

            {/* Right Column: Live Voice Call & Chat (Always mounted so voice never drops!) */}
            <div
              className={`${
                mobileTab === 'comms' ? 'block' : 'hidden'
              } lg:col-span-3 lg:block`}
            >
              <VoiceAndChatPanel
                socket={socket}
                roomCode={roomCode}
                currentUserId={user.id}
                myTeamCode={myTeam?.teamCode || null}
                chatMessages={room.recentChat}
                recentBids={room.recentBids}
                voiceParticipants={voiceParticipants}
                onSendChat={(content) =>
                  socket?.emit('chat:send', { roomCode, content })
                }
                onSendReaction={(emoji) =>
                  socket?.emit('chat:react', { roomCode, emoji })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* ================= 3. COMPLETED POST-AUCTION AI RANKINGS STATE ================= */}
      {room.status === 'COMPLETED' && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8 xl:col-span-9">
            {/* Post-Auction Trade Window Banner */}
            {room.tradeWindowActive ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-stadium-900 to-stadium-950 p-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/30 text-amber-300 shadow">
                    <ArrowLeftRight className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        Post-Auction Trade Window is Active!
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-300">
                        5-Minute Window
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Swap players or transfer purse cash with other franchises before final rosters lock.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTradeHub(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-2.5 text-xs font-black text-stadium-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>OPEN TRADE HUB</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTradeHub(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-stadium-900/80 px-3.5 py-1.5 text-xs font-bold text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
                  <span>Franchise Trade Hub</span>
                </button>
              </div>
            )}

            {analysisReport ? (
              <AnalysisDashboard
                report={analysisReport}
                onRefresh={() => void fetchLiveAnalysisPreview(false)}
              />
            ) : (
              <div className="rounded-2xl border border-white/15 bg-stadium-900 p-10 text-center text-sm text-slate-300">
                Computing AI Post-Auction Team Rankings (#1–#10)...
              </div>
            )}

            <RoomPlayerListsPanel
              roomCode={roomCode}
              soldCount={room.counts.sold}
              unsoldCount={room.counts.unsold}
              upcomingCount={room.counts.upcoming}
            />
          </div>

          <div className="lg:col-span-4 xl:col-span-3">
            <VoiceAndChatPanel
              socket={socket}
              roomCode={roomCode}
              currentUserId={user.id}
              myTeamCode={myTeam?.teamCode || null}
              chatMessages={room.recentChat}
              recentBids={room.recentBids}
              voiceParticipants={voiceParticipants}
              onSendChat={(content) =>
                socket?.emit('chat:send', { roomCode, content })
              }
              onSendReaction={(emoji) =>
                socket?.emit('chat:react', { roomCode, emoji })
              }
            />
          </div>
        </div>
      )}

      {/* Post-Auction Trade Hub Modal */}
      <TradeHubModal
        isOpen={showTradeHub}
        onClose={() => setShowTradeHub(false)}
        room={room}
        currentUserId={user.id}
        onProposeTrade={handleProposeTrade}
        onRespondTrade={handleRespondTrade}
        onCancelTrade={handleCancelTrade}
        onConcludeWindow={handleConcludeWindow}
      />
    </div>
  );
};
