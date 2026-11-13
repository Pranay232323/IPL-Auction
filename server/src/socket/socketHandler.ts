import { Server as SocketIOServer, Socket } from 'socket.io';
import { z } from 'zod';
import { getUserById, verifyAuthToken } from '../services/authService.js';
import { auctionEngine, AuctionEngineError } from '../services/auctionEngine.js';
import { PublicUser, TeamCode, VALID_TEAM_CODES } from '../types/domain.js';

export interface VoicePeerMeta {
  socketId: string;
  userId: string;
  displayName: string;
  teamCode: TeamCode | null;
  muted: boolean;
}

interface SocketData {
  user: PublicUser;
  joinedRooms: Set<string>;
}

const activeVoiceRooms = new Map<string, Map<string, VoicePeerMeta>>();

type AckCallback = (response: Record<string, unknown>) => void;

function safeAck(ack: unknown, payload: Record<string, unknown>): void {
  if (typeof ack === 'function') {
    (ack as AckCallback)(payload);
  }
}

function handleSocketError(err: unknown, ack?: unknown, socket?: Socket): void {
  const message =
    err instanceof AuctionEngineError || err instanceof Error
      ? err.message
      : 'Unexpected server error';
  safeAck(ack, { ok: false, error: message });
  socket?.emit('auction:error', { error: message });
}

export function registerSocketHandlers(io: SocketIOServer): void {
  auctionEngine.attachSocketServer(io);

  io.use((socket, next) => {
    const rawToken =
      socket.handshake.auth?.token ||
      (typeof socket.handshake.headers.authorization === 'string' &&
      socket.handshake.headers.authorization.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : null);

    if (!rawToken || typeof rawToken !== 'string') {
      next(new Error('AUTH_REQUIRED'));
      return;
    }

    try {
      const claims = verifyAuthToken(rawToken);
      const user = getUserById(claims.userId);
      if (!user) {
        next(new Error('USER_NOT_FOUND'));
        return;
      }
      (socket.data as SocketData) = {
        user,
        joinedRooms: new Set<string>(),
      };
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const data = socket.data as SocketData;
    const user = data.user;

    const cleanupVoiceRoom = (code: string) => {
      const peers = activeVoiceRooms.get(code);
      if (peers && peers.has(socket.id)) {
        peers.delete(socket.id);
        socket.to(`voice:${code}`).emit('voice:peer_left', { socketId: socket.id });
        io.to(`room:${code}`).emit('voice:participants', {
          participants: Array.from(peers.values()),
        });
        if (peers.size === 0) {
          activeVoiceRooms.delete(code);
        }
      }
      socket.leave(`voice:${code}`);
    };

    socket.on('room:join', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        if (!code) throw new AuctionEngineError('Room code is required.');

        const snapshot = auctionEngine.getRoomSnapshot(code);
        socket.join(`room:${code}`);
        data.joinedRooms.add(code);
        auctionEngine.markConnectionStatus(code, user.id, true);

        const updatedSnapshot = auctionEngine.getRoomSnapshot(code);
        const voicePeers = Array.from(activeVoiceRooms.get(code)?.values() || []);

        safeAck(ack, {
          ok: true,
          room: updatedSnapshot,
          voiceParticipants: voicePeers,
        });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on('room:leave', (payload: { roomCode?: string }, ack?: unknown) => {
      const code = String(payload?.roomCode || '')
        .trim()
        .toUpperCase();
      if (code) {
        cleanupVoiceRoom(code);
        socket.leave(`room:${code}`);
        data.joinedRooms.delete(code);
        auctionEngine.markConnectionStatus(code, user.id, false);
      }
      safeAck(ack, { ok: true });
    });

    socket.on(
      'room:claim_team',
      (payload: { roomCode?: string; teamCode?: string }, ack?: unknown) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const teamCode = String(payload?.teamCode || '')
            .trim()
            .toUpperCase() as TeamCode;
          if (!VALID_TEAM_CODES.has(teamCode)) {
            throw new AuctionEngineError('Invalid IPL franchise code.');
          }
          const room = auctionEngine.claimTeam({ roomCode: code, user, teamCode });

          // Update teamCode in voice metadata if user is already in voice call
          const voicePeers = activeVoiceRooms.get(code);
          const peer = voicePeers?.get(socket.id);
          if (peer) {
            peer.teamCode = teamCode;
            io.to(`room:${code}`).emit('voice:participants', {
              participants: Array.from(voicePeers!.values()),
            });
          }

          safeAck(ack, { ok: true, room });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on(
      'room:ready',
      (payload: { roomCode?: string; isReady?: boolean }, ack?: unknown) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const room = auctionEngine.setReadyState({
            roomCode: code,
            userId: user.id,
            isReady: Boolean(payload?.isReady),
          });
          safeAck(ack, { ok: true, room });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on(
      'room:configure_bots',
      (
        payload: {
          roomCode?: string;
          mode?: 'FILL_EMPTY' | 'CLEAR_BOTS' | 'TOGGLE_TEAM';
          teamCode?: TeamCode;
        },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const mode = payload?.mode || 'FILL_EMPTY';
          const room = auctionEngine.configureBotSlots({
            roomCode: code,
            hostUserId: user.id,
            mode,
            teamCode: payload?.teamCode,
          });
          safeAck(ack, { ok: true, room });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on('auction:start', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const room = auctionEngine.startAuction({
          roomCode: code,
          hostUserId: user.id,
        });
        safeAck(ack, { ok: true, room });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on(
      'auction:bid',
      (
        payload: { roomCode?: string; teamCode?: string; amountLakhs?: number },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const teamCode = String(payload?.teamCode || '')
            .trim()
            .toUpperCase() as TeamCode;

          if (!VALID_TEAM_CODES.has(teamCode)) {
            throw new AuctionEngineError('Invalid franchise code.');
          }
          const amount =
            payload?.amountLakhs !== undefined ? Number(payload.amountLakhs) : undefined;

          const result = auctionEngine.placeBid({
            roomCode: code,
            userId: user.id,
            teamCode,
            amountLakhs: amount,
          });
          safeAck(ack, { ok: true, bid: result.bid, room: result.snapshot });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on('auction:pass', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        auctionEngine.passCurrentLot({ roomCode: code, userId: user.id });
        safeAck(ack, { ok: true });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on(
      'auction:rtm_decision',
      (payload: { roomCode?: string; decision?: 'MATCH' | 'DECLINE' }, ack?: unknown) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const decision = payload?.decision === 'MATCH' ? 'MATCH' : 'DECLINE';
          auctionEngine.handleRtmDecision({
            roomCode: code,
            userId: user.id,
            decision,
          });
          safeAck(ack, { ok: true });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    // ================= POST-AUCTION TRADE WINDOW SOCKETS =================
    socket.on(
      'trade:propose',
      (
        payload: {
          roomCode?: string;
          proposerTeam?: string;
          receiverTeam?: string;
          offeredPlayerIds?: number[];
          requestedPlayerIds?: number[];
          purseTransferLakhs?: number;
        },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '').trim().toUpperCase();
          const proposerTeam = String(payload?.proposerTeam || '').toUpperCase() as TeamCode;
          const receiverTeam = String(payload?.receiverTeam || '').toUpperCase() as TeamCode;
          if (!VALID_TEAM_CODES.has(proposerTeam) || !VALID_TEAM_CODES.has(receiverTeam)) {
            throw new AuctionEngineError('Invalid franchise teamCode.');
          }
          const result = auctionEngine.proposeTrade({
            roomCode: code,
            userId: user.id,
            proposerTeam,
            receiverTeam,
            offeredPlayerIds: payload?.offeredPlayerIds || [],
            requestedPlayerIds: payload?.requestedPlayerIds || [],
            purseTransferLakhs: payload?.purseTransferLakhs || 0,
          });
          safeAck(ack, { ok: true, trade: result.trade, snapshot: result.snapshot });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on(
      'trade:respond',
      async (
        payload: {
          roomCode?: string;
          tradeId?: string;
          decision?: 'ACCEPT' | 'REJECT';
        },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '').trim().toUpperCase();
          const tradeId = String(payload?.tradeId || '');
          const decision = payload?.decision;
          if (decision !== 'ACCEPT' && decision !== 'REJECT') {
            throw new AuctionEngineError('Decision must be ACCEPT or REJECT.');
          }
          const result = await auctionEngine.respondToTrade({
            roomCode: code,
            userId: user.id,
            tradeId,
            decision,
          });
          safeAck(ack, { ok: true, trade: result.trade, snapshot: result.snapshot, analysis: result.analysis });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on(
      'trade:cancel',
      (
        payload: {
          roomCode?: string;
          tradeId?: string;
        },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '').trim().toUpperCase();
          const tradeId = String(payload?.tradeId || '');
          const result = auctionEngine.cancelTrade({
            roomCode: code,
            userId: user.id,
            tradeId,
          });
          safeAck(ack, { ok: true, trade: result.trade, snapshot: result.snapshot });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on(
      'trade:conclude',
      async (
        payload: {
          roomCode?: string;
        },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '').trim().toUpperCase();
          const result = await auctionEngine.concludeTradeWindow({
            roomCode: code,
            hostUserId: user.id,
          });
          safeAck(ack, { ok: true, snapshot: result.snapshot, analysis: result.analysis });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on(
      'auction:rtm_raise',
      (
        payload: { roomCode?: string; action?: 'RAISE' | 'PASS'; raiseAmountLakhs?: number },
        ack?: unknown
      ) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const action = payload?.action === 'RAISE' ? 'RAISE' : 'PASS';
          auctionEngine.handleRtmRaise({
            roomCode: code,
            userId: user.id,
            action,
            raiseAmountLakhs: payload?.raiseAmountLakhs,
          });
          safeAck(ack, { ok: true });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on('auction:pause', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const room = auctionEngine.pauseAuction({
          roomCode: code,
          hostUserId: user.id,
        });
        safeAck(ack, { ok: true, room });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on('auction:resume', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const room = auctionEngine.resumeAuction({
          roomCode: code,
          hostUserId: user.id,
        });
        safeAck(ack, { ok: true, room });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on('auction:skip', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        auctionEngine.skipOrHammerCurrentLot({
          roomCode: code,
          hostUserId: user.id,
        });
        safeAck(ack, { ok: true });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on(
      'auction:accelerated',
      (payload: { roomCode?: string; enabled?: boolean }, ack?: unknown) => {
        try {
          const code = String(payload?.roomCode || '')
            .trim()
            .toUpperCase();
          const room = auctionEngine.toggleAcceleratedMode({
            roomCode: code,
            hostUserId: user.id,
            enabled: Boolean(payload?.enabled),
          });
          safeAck(ack, { ok: true, room });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    socket.on('auction:unsold_round', (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const room = auctionEngine.startUnsoldReauction({
          roomCode: code,
          hostUserId: user.id,
        });
        safeAck(ack, { ok: true, room });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on('auction:finish', async (payload: { roomCode?: string }, ack?: unknown) => {
      try {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const analysis = await auctionEngine.finishAuctionByHost({
          roomCode: code,
          hostUserId: user.id,
        });
        safeAck(ack, { ok: true, analysis });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    // ================= LIVE TEXT CHAT & REACTIONS =================
    const chatSchema = z.object({
      roomCode: z.string().min(4).max(12),
      content: z.string().min(1).max(280),
    });

    socket.on('chat:send', (payload: unknown, ack?: unknown) => {
      try {
        const parsed = chatSchema.safeParse(payload);
        if (!parsed.success) {
          throw new AuctionEngineError('Message must be 1–280 characters.');
        }
        const message = auctionEngine.sendChatMessage({
          roomCode: parsed.data.roomCode,
          user,
          content: parsed.data.content,
          messageType: 'USER',
        });
        safeAck(ack, { ok: true, message });
      } catch (err) {
        handleSocketError(err, ack, socket);
      }
    });

    socket.on(
      'chat:react',
      (payload: { roomCode?: string; emoji?: string }, ack?: unknown) => {
        try {
          const allowedEmojis = ['🔥', '🔨', '💰', '😱', '👏', '😂', '🧠', '💔'];
          const emoji = String(payload?.emoji || '🔥');
          if (!allowedEmojis.includes(emoji)) {
            throw new AuctionEngineError('Unsupported reaction.');
          }
          const message = auctionEngine.sendChatMessage({
            roomCode: String(payload?.roomCode || ''),
            user,
            content: emoji,
            messageType: 'REACTION',
          });
          safeAck(ack, { ok: true, message });
        } catch (err) {
          handleSocketError(err, ack, socket);
        }
      }
    );

    // ================= WEBRTC P2P VOICE MESH SIGNALING =================
    socket.on(
      'voice:join',
      (payload: { roomCode?: string; teamCode?: TeamCode | null }, ack?: unknown) => {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        if (!code) {
          safeAck(ack, { ok: false, error: 'Missing roomCode' });
          return;
        }

        let peers = activeVoiceRooms.get(code);
        if (!peers) {
          peers = new Map<string, VoicePeerMeta>();
          activeVoiceRooms.set(code, peers);
        }

        const existingPeers = Array.from(peers.values()).filter(
          (p) => p.socketId !== socket.id
        );

        const myPeer: VoicePeerMeta = {
          socketId: socket.id,
          userId: user.id,
          displayName: user.displayName,
          teamCode:
            payload?.teamCode && VALID_TEAM_CODES.has(payload.teamCode)
              ? payload.teamCode
              : null,
          muted: false,
        };

        peers.set(socket.id, myPeer);
        socket.join(`voice:${code}`);

        socket.to(`voice:${code}`).emit('voice:peer_joined', { peer: myPeer });
        io.to(`room:${code}`).emit('voice:participants', {
          participants: Array.from(peers.values()),
        });

        safeAck(ack, {
          ok: true,
          selfSocketId: socket.id,
          existingPeers,
          participants: Array.from(peers.values()),
        });
      }
    );

    socket.on('voice:leave', (payload: { roomCode?: string }, ack?: unknown) => {
      const code = String(payload?.roomCode || '')
        .trim()
        .toUpperCase();
      if (code) cleanupVoiceRoom(code);
      safeAck(ack, { ok: true });
    });

    socket.on(
      'voice:signal',
      (payload: {
        roomCode?: string;
        targetSocketId?: string;
        type?: 'offer' | 'answer' | 'ice-candidate';
        sdp?: unknown;
        candidate?: unknown;
      }) => {
        if (!payload?.targetSocketId || !payload?.type) return;
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const peers = activeVoiceRooms.get(code);
        const senderMeta = peers?.get(socket.id);

        io.to(payload.targetSocketId).emit('voice:signal', {
          fromSocketId: socket.id,
          sender: senderMeta || {
            socketId: socket.id,
            userId: user.id,
            displayName: user.displayName,
            teamCode: null,
            muted: false,
          },
          type: payload.type,
          sdp: payload.sdp,
          candidate: payload.candidate,
        });
      }
    );

    socket.on(
      'voice:mute',
      (payload: { roomCode?: string; muted?: boolean }) => {
        const code = String(payload?.roomCode || '')
          .trim()
          .toUpperCase();
        const peers = activeVoiceRooms.get(code);
        const peer = peers?.get(socket.id);
        if (peer) {
          peer.muted = Boolean(payload?.muted);
          io.to(`room:${code}`).emit('voice:participants', {
            participants: Array.from(peers!.values()),
          });
        }
      }
    );

    socket.on('disconnect', () => {
      for (const code of data.joinedRooms) {
        cleanupVoiceRoom(code);
        auctionEngine.markConnectionStatus(code, user.id, false);
      }
      data.joinedRooms.clear();
    });
  });
}
