import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  Participant,
} from 'livekit-client';
import { Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Send,
  MessageSquare,
  History,
  Info,
  Radio,
} from 'lucide-react';
import { apiRequest } from '../api/http';
import {
  BidEntryDTO,
  ChatMessageDTO,
  TeamCode,
  VoiceConfigResponse,
  VoicePeerMeta,
} from '../types';
import { formatLakhs, getFranchiseMeta } from '../utils/format';

interface VoiceAndChatPanelProps {
  socket: Socket | null;
  roomCode: string;
  currentUserId: string;
  myTeamCode: TeamCode | null;
  chatMessages: ChatMessageDTO[];
  recentBids: BidEntryDTO[];
  voiceParticipants: VoicePeerMeta[];
  onSendChat: (content: string) => void;
  onSendReaction: (emoji: string) => void;
}

const REACTION_EMOJIS = ['🔥', '🔨', '💰', '😱', '👏', '😂', '🧠', '💔'];

export const VoiceAndChatPanel: React.FC<VoiceAndChatPanelProps> = React.memo(({
  socket,
  roomCode,
  currentUserId,
  myTeamCode,
  chatMessages,
  recentBids,
  voiceParticipants,
  onSendChat,
  onSendReaction,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'bids'>('chat');
  const [draft, setDraft] = useState('');

  // Voice State
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfigResponse | null>(null);
  const [showVoiceInfo, setShowVoiceInfo] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [connectingVoice, setConnectingVoice] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const [lkParticipants, setLkParticipants] = useState<
    { identity: string; name: string; teamCode: TeamCode | null; muted: boolean }[]
  >([]);

  // LiveKit Room Ref
  const lkRoomRef = useRef<LiveKitRoom | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);

  // WebRTC P2P Mesh Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiRequest<VoiceConfigResponse>('/api/voice/config')
      .then((cfg) => setVoiceConfig(cfg))
      .catch(() => {
        // Ignore config error
      });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const cleanupAllVoice = useCallback(() => {
    // Cleanup LiveKit
    if (lkRoomRef.current) {
      lkRoomRef.current.disconnect();
      lkRoomRef.current = null;
    }
    setLkParticipants([]);

    // Cleanup WebRTC Mesh
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    for (const pc of peerConnsRef.current.values()) {
      pc.close();
    }
    peerConnsRef.current.clear();

    for (const el of remoteStreamsRef.current.values()) {
      el.srcObject = null;
      el.remove();
    }
    remoteStreamsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioContainerRef.current) {
      remoteAudioContainerRef.current.innerHTML = '';
    }

    if (socket && roomCode) {
      socket.emit('voice:leave', { roomCode });
    }

    setInCall(false);
    setConnectingVoice(false);
    setSpeakingIds(new Set());
  }, [socket, roomCode]);

  useEffect(() => {
    return () => {
      cleanupAllVoice();
    };
  }, [cleanupAllVoice]);

  // Apply deafen state to attached remote audio elements
  useEffect(() => {
    for (const audioEl of remoteStreamsRef.current.values()) {
      audioEl.muted = deafened;
    }
    if (remoteAudioContainerRef.current) {
      const els = remoteAudioContainerRef.current.querySelectorAll('audio');
      els.forEach((el) => {
        el.muted = deafened;
      });
    }
  }, [deafened]);

  // Helper to sync LiveKit participant roster
  const syncLiveKitRoster = useCallback((room: LiveKitRoom) => {
    const all: Participant[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];
    const mapped = all.map((p) => {
      let parsedTeam: TeamCode | null = null;
      try {
        if (p.metadata) {
          const meta = JSON.parse(p.metadata);
          parsedTeam = meta.teamCode || null;
        }
      } catch {
        // Ignore metadata parse errors
      }
      return {
        identity: p.identity,
        name: p.name || p.identity.slice(0, 8),
        teamCode: parsedTeam,
        muted: !p.isMicrophoneEnabled,
      };
    });
    setLkParticipants(mapped);
  }, []);

  // Connect via Official LiveKit SFU
  const startLiveKitCall = async () => {
    const tokenRes = await apiRequest<{
      token: string;
      roomName: string;
      livekitUrl: string;
    }>('/api/voice/token', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    });

    const lkRoom = new LiveKitRoom({
      adaptiveStream: true,
      dynacast: true,
    });

    lkRoom.on(RoomEvent.ParticipantConnected, () => syncLiveKitRoster(lkRoom));
    lkRoom.on(RoomEvent.ParticipantDisconnected, () => syncLiveKitRoster(lkRoom));
    lkRoom.on(RoomEvent.TrackMuted, () => syncLiveKitRoster(lkRoom));
    lkRoom.on(RoomEvent.TrackUnmuted, () => syncLiveKitRoster(lkRoom));
    lkRoom.on(RoomEvent.LocalTrackPublished, () => syncLiveKitRoster(lkRoom));

    lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setSpeakingIds(new Set(speakers.map((s) => s.identity)));
    });

    lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio && remoteAudioContainerRef.current) {
        const el = track.attach();
        el.muted = deafened;
        remoteAudioContainerRef.current.appendChild(el);
      }
    });

    lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });

    lkRoom.on(RoomEvent.Disconnected, () => {
      cleanupAllVoice();
    });

    await lkRoom.connect(tokenRes.livekitUrl, tokenRes.token);
    await lkRoom.localParticipant.setMicrophoneEnabled(true);

    lkRoomRef.current = lkRoom;
    syncLiveKitRoster(lkRoom);
    setInCall(true);
    setMicMuted(false);
  };

  // Create/manage RTCPeerConnection for built-in WebRTC P2P Mesh
  const getOrCreatePeerConnection = useCallback(
    (targetSocketId: string): RTCPeerConnection => {
      const existing = peerConnsRef.current.get(targetSocketId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({
        iceServers: voiceConfig?.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate && socket) {
          socket.emit('voice:signal', {
            roomCode,
            targetSocketId,
            type: 'ice-candidate',
            candidate: ev.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (!stream) return;
        let audioEl = remoteStreamsRef.current.get(targetSocketId);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          audioEl.muted = deafened;
          remoteAudioContainerRef.current?.appendChild(audioEl);
          remoteStreamsRef.current.set(targetSocketId, audioEl);
        }
        audioEl.srcObject = stream;
        void audioEl.play().catch(() => {});
      };

      peerConnsRef.current.set(targetSocketId, pc);
      return pc;
    },
    [roomCode, socket, voiceConfig?.iceServers, deafened]
  );

  // Listen to WebRTC Mesh signaling events while in call
  useEffect(() => {
    if (!socket || !inCall || voiceConfig?.livekitConfigured) return;

    const handleSignal = async (data: {
      fromSocketId: string;
      type: 'offer' | 'answer' | 'ice-candidate';
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      try {
        const pc = getOrCreatePeerConnection(data.fromSocketId);
        if (data.type === 'offer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voice:signal', {
            roomCode,
            targetSocketId: data.fromSocketId,
            type: 'answer',
            sdp: pc.localDescription,
          });
        } else if (data.type === 'answer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'ice-candidate' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch {
        // Ignore transient ICE/SDP glare
      }
    };

    const handlePeerLeft = (data: { socketId: string }) => {
      const pc = peerConnsRef.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnsRef.current.delete(data.socketId);
      }
      const el = remoteStreamsRef.current.get(data.socketId);
      if (el) {
        el.srcObject = null;
        el.remove();
        remoteStreamsRef.current.delete(data.socketId);
      }
    };

    socket.on('voice:signal', handleSignal);
    socket.on('voice:peer_left', handlePeerLeft);

    return () => {
      socket.off('voice:signal', handleSignal);
      socket.off('voice:peer_left', handlePeerLeft);
    };
  }, [socket, inCall, roomCode, voiceConfig?.livekitConfigured, getOrCreatePeerConnection]);

  const startWebRtcMeshCall = async () => {
    if (!socket) throw new Error('Real-time socket not connected.');
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access requires HTTPS or localhost in a modern browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    localStreamRef.current = stream;

    // Local speaking activity detector
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);

      speakingIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
        setSpeakingIds((prev) => {
          const next = new Set(prev);
          if (avg > 18 && !micMuted) next.add(currentUserId);
          else next.delete(currentUserId);
          return next;
        });
      }, 220);
    } catch {
      // Optional speaking meter
    }

    socket.emit(
      'voice:join',
      { roomCode, teamCode: myTeamCode },
      async (res: { ok?: boolean; existingPeers?: VoicePeerMeta[]; error?: string }) => {
        if (!res?.ok) {
          setVoiceError(res?.error || 'Could not join voice room');
          cleanupAllVoice();
          return;
        }
        setInCall(true);
        setMicMuted(false);

        for (const peer of res.existingPeers || []) {
          try {
            const pc = getOrCreatePeerConnection(peer.socketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('voice:signal', {
              roomCode,
              targetSocketId: peer.socketId,
              type: 'offer',
              sdp: pc.localDescription,
            });
          } catch {
            // Continue connecting other peers
          }
        }
      }
    );
  };

  const handleJoinVoice = async () => {
    setVoiceError(null);
    setConnectingVoice(true);
    try {
      if (voiceConfig?.livekitConfigured) {
        await startLiveKitCall();
      } else {
        await startWebRtcMeshCall();
      }
    } catch (err) {
      setVoiceError(
        err instanceof Error
          ? err.message
          : 'Could not access microphone. Check browser mic permissions.'
      );
      cleanupAllVoice();
    } finally {
      setConnectingVoice(false);
    }
  };

  const toggleMic = async () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);

    if (lkRoomRef.current) {
      await lkRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
      syncLiveKitRoster(lkRoomRef.current);
    } else if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
      socket?.emit('voice:mute', { roomCode, muted: nextMuted });
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setDraft('');
  };

  const displayedVoiceUsers = voiceConfig?.livekitConfigured
    ? lkParticipants.map((p) => ({
        key: p.identity,
        userId: p.identity,
        name: p.name,
        teamCode: p.teamCode,
        muted: p.muted,
      }))
    : voiceParticipants.map((p) => ({
        key: p.socketId,
        userId: p.userId,
        name: p.displayName,
        teamCode: p.teamCode,
        muted: p.muted,
      }));

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden container for remote audio tracks */}
      <div ref={remoteAudioContainerRef} className="hidden" />

      {/* ================= LIVE VOICE ROOM MODULE ================= */}
      <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-3.5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio
              className={`h-4 w-4 ${
                inCall ? 'animate-pulse text-emerald-400' : 'text-amber-400'
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Live Voice Call
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                  {voiceConfig?.livekitConfigured ? 'LiveKit SFU' : 'WebRTC Live'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!voiceConfig?.livekitConfigured && (
              <button
                type="button"
                onClick={() => setShowVoiceInfo((v) => !v)}
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white"
                title="Voice Provider Details"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            )}

            {!inCall ? (
              <button
                type="button"
                disabled={connectingVoice}
                onClick={() => void handleJoinVoice()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-stadium-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>{connectingVoice ? 'Connecting...' : 'Join Voice'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void toggleMic()}
                  className={`rounded-lg p-1.5 transition ${
                    micMuted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                  title={micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {micMuted ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDeafened((d) => !d)}
                  className={`rounded-lg p-1.5 transition ${
                    deafened
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/10 text-slate-200'
                  }`}
                  title={deafened ? 'Undeafen Audio' : 'Deafen Incoming Voice'}
                >
                  {deafened ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={cleanupAllVoice}
                  className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-600"
                  title="Leave Voice Call"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {showVoiceInfo && voiceConfig?.setupHint && (
          <div className="mt-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-[11px] leading-relaxed text-sky-200">
            {voiceConfig.setupHint}
          </div>
        )}

        {voiceError && (
          <div className="mt-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
            {voiceError}
          </div>
        )}

        {/* Active Voice Participants */}
        <div className="mt-2.5">
          {displayedVoiceUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-stadium-950/60 py-2.5 text-center text-[11px] text-slate-400">
              No one in voice yet — click <strong className="text-emerald-400">Join Voice</strong> to talk live during bids!
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {displayedVoiceUsers.map((vp) => {
                const fMeta = getFranchiseMeta(vp.teamCode);
                const isSpeaking = speakingIds.has(vp.userId);
                return (
                  <div
                    key={vp.key}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition ${
                      isSpeaking
                        ? 'border-emerald-400 bg-emerald-500/15 shadow shadow-emerald-500/20'
                        : 'border-white/10 bg-stadium-950'
                    }`}
                  >
                    {fMeta && (
                      <span
                        className="rounded px-1 text-[9px] font-black text-stadium-950"
                        style={{ backgroundColor: fMeta.primaryColor }}
                      >
                        {fMeta.code}
                      </span>
                    )}
                    <span className="max-w-[90px] truncate font-semibold text-white">
                      {vp.name}
                    </span>
                    {vp.muted ? (
                      <MicOff className="h-3 w-3 text-rose-400" />
                    ) : (
                      <Mic className="h-3 w-3 text-emerald-400" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= LIVE TEXT CHAT & BID FEED ================= */}
      <div className="flex h-[450px] flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-stadium-900 to-stadium-950 shadow-xl overflow-hidden">
        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-white/10 p-2 bg-stadium-950/80">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-display text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stadium-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Live Broadcast Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bids')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-display text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'bids'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stadium-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Live Bid Ticker ({recentBids.length})</span>
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Messages Stream */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.map((msg) => {
                if (msg.messageType === 'SYSTEM') {
                  return (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200"
                    >
                      {msg.content}
                    </div>
                  );
                }

                const teamMeta = getFranchiseMeta(msg.teamCode);
                const isMe = msg.userId === currentUserId;

                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      isMe
                        ? 'border-sky-500/30 bg-sky-500/10'
                        : 'border-white/10 bg-stadium-950/90'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {teamMeta && (
                        <span
                          className="rounded px-1.5 py-0.2 text-[9px] font-black text-stadium-950"
                          style={{ backgroundColor: teamMeta.primaryColor }}
                        >
                          {teamMeta.code}
                        </span>
                      )}
                      <span className="font-bold text-slate-200">{msg.senderName}</span>
                    </div>
                    <p className="mt-1 break-words text-slate-100">{msg.content}</p>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Emoji Reactions Bar */}
            <div className="flex items-center justify-between border-t border-white/10 bg-stadium-950/70 px-2.5 py-1.5">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendReaction(emoji)}
                  className="rounded-lg p-1 text-base transition hover:scale-125 hover:bg-white/10 active:scale-95"
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleChatSubmit}
              className="flex gap-1.5 border-t border-white/10 p-2.5"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={280}
                placeholder="Trash talk or discuss bids..."
                className="flex-1 rounded-xl border border-white/15 bg-stadium-950 px-3 py-2 text-base sm:text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-stadium-950 transition hover:bg-amber-400"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {recentBids.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No bids recorded yet.
              </div>
            ) : (
              recentBids.map((b) => {
                const meta = getFranchiseMeta(b.teamCode);
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-stadium-950 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-black text-stadium-950"
                        style={{ backgroundColor: meta?.primaryColor || '#f59e0b' }}
                      >
                        {b.teamCode}
                      </span>
                      <span className="truncate font-semibold text-white">
                        {b.playerName}
                      </span>
                    </div>
                    <span className="tabular-nums font-mono font-black text-amber-300">
                      {formatLakhs(b.amountLakhs)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
});
