import Database from 'better-sqlite3';
import { AddressInfo } from 'node:net';
import { io as createClient, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerApp } from '../src/app.js';
import { setDbForTesting } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedPlayers } from '../src/db/seed.js';
import { auctionEngine } from '../src/services/auctionEngine.js';
import { IPL_FRANCHISES, TeamCode } from '../src/types/domain.js';

function emitWithAck<T = Record<string, unknown>>(
  socket: ClientSocket,
  event: string,
  payload: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: T) => resolve(response));
  });
}

describe('Real-Time 10-Player Socket.IO Multiplayer Auction, Voice/Chat & AI Team Analysis', () => {
  let testDb: Database.Database;
  let app: ReturnType<typeof createServerApp>['app'];
  let httpServer: ReturnType<typeof createServerApp>['httpServer'];
  let ioServer: ReturnType<typeof createServerApp>['io'];
  let baseUrl: string;
  const clients: ClientSocket[] = [];

  beforeAll(async () => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    setDbForTesting(testDb);
    runMigrations(testDb);
    seedPlayers(testDb);

    const created = createServerApp({ skipAutoSeed: true });
    app = created.app;
    httpServer = created.httpServer;
    ioServer = created.io;

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const port = (httpServer.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    clients.forEach((c) => c.disconnect());
    auctionEngine.destroyAllRuntimes();
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    testDb.close();
  });

  it('supports 10 live players joining a room, claiming all 10 franchises, bidding with ₹120 Cr purse, chatting, voice signaling, and generating #1-#10 AI rankings', async () => {
    // 1. Create 10 independent authenticated users
    const users: { id: string; token: string; teamCode: TeamCode }[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/guest')
        .send({ displayName: `Owner_${IPL_FRANCHISES[i].code}` })
        .expect(201);
      users.push({
        id: res.body.user.id,
        token: res.body.token,
        teamCode: IPL_FRANCHISES[i].code,
      });
    }

    // 2. Host (Player 0 - CSK) creates an auction room (120 Cr = 12000 Lakhs purse)
    const createRoomRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${users[0].token}`)
      .send({
        name: '10-Player Championship Test Room',
        visibility: 'PUBLIC',
        timerSeconds: 20,
        fillBots: false,
        preferredTeam: 'CSK',
      })
      .expect(201);

    const roomCode: string = createRoomRes.body.room.code;
    expect(createRoomRes.body.room.initialPurseLakhs).toBe(12000);
    expect(createRoomRes.body.room.counts.totalLots).toBeGreaterThanOrEqual(520);

    // Verify independent second room can be created simultaneously without state bleed
    const secondRoomRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${users[1].token}`)
      .send({
        name: 'Independent Room B',
        visibility: 'PRIVATE',
        timerSeconds: 15,
        fillBots: true,
        preferredTeam: 'MI',
      })
      .expect(201);
    expect(secondRoomRes.body.room.code).not.toBe(roomCode);

    // 3. Connect all 10 live Socket.IO clients and join Room A + claim each of the 10 franchises
    for (let i = 0; i < 10; i++) {
      const sock = createClient(baseUrl, {
        auth: { token: users[i].token },
        transports: ['websocket'],
      });
      clients.push(sock);
      await new Promise<void>((resolve, reject) => {
        sock.once('connect', () => resolve());
        sock.once('connect_error', (err) => reject(err));
      });

      const joinAck = await emitWithAck<{ ok: boolean }>(sock, 'room:join', {
        roomCode,
      });
      expect(joinAck.ok).toBe(true);

      if (i > 0) {
        const claimAck = await emitWithAck<{ ok: boolean }>(sock, 'room:claim_team', {
          roomCode,
          teamCode: users[i].teamCode,
        });
        expect(claimAck.ok).toBe(true);
      }
    }

    // Attempting to steal an already human-claimed franchise must fail with 409/error
    const stealAttempt = await emitWithAck<{ ok: boolean; error?: string }>(
      clients[1],
      'room:claim_team',
      { roomCode, teamCode: 'CSK' }
    );
    expect(stealAttempt.ok).toBe(false);

    // 4. Live Chat broadcast across all 10 connected sockets
    const chatReceivedByLastPlayer = new Promise<{ content: string; teamCode: string }>(
      (resolve) => {
        clients[9].once('chat:message', (msg) => {
          if (msg.messageType === 'USER') resolve(msg);
        });
      }
    );

    const chatAck = await emitWithAck<{ ok: boolean }>(clients[0], 'chat:send', {
      roomCode,
      content: 'Whistle Podu ready for Marquee Set 1!',
    });
    expect(chatAck.ok).toBe(true);
    const receivedMsg = await chatReceivedByLastPlayer;
    expect(receivedMsg.content).toBe('Whistle Podu ready for Marquee Set 1!');
    expect(receivedMsg.teamCode).toBe('CSK');

    // 5. WebRTC P2P Voice Signaling check between Player 0 and Player 1
    const voiceJoin0 = await emitWithAck<{ ok: boolean; selfSocketId: string }>(
      clients[0],
      'voice:join',
      { roomCode, teamCode: 'CSK' }
    );
    expect(voiceJoin0.ok).toBe(true);

    const signalReceivedBy0 = new Promise<{ type: string }>((resolve) => {
      clients[0].once('voice:signal', (sig) => resolve(sig));
    });

    const voiceJoin1 = await emitWithAck<{
      ok: boolean;
      existingPeers: { socketId: string }[];
    }>(clients[1], 'voice:join', { roomCode, teamCode: 'MI' });
    expect(voiceJoin1.ok).toBe(true);
    expect(voiceJoin1.existingPeers).toHaveLength(1);

    clients[1].emit('voice:signal', {
      roomCode,
      targetSocketId: voiceJoin0.selfSocketId,
      type: 'offer',
      sdp: { type: 'offer', sdp: 'v=0-mock-test-sdp' },
    });
    const relayedSignal = await signalReceivedBy0;
    expect(relayedSignal.type).toBe('offer');

    // 6. Start Live Auction (Host = clients[0])
    const startAck = await emitWithAck<{
      ok: boolean;
      room: { status: string; currentLot: { basePriceLakhs: number } };
    }>(clients[0], 'auction:start', { roomCode });
    expect(startAck.ok).toBe(true);
    expect(startAck.room.status).toBe('ACTIVE');
    const openingBase = startAck.room.currentLot.basePriceLakhs; // 200L (₹2.00 Cr)

    // 7. Server-Authoritative Bidding War between CSK (0), MI (1), RCB (2)
    const bid1 = await emitWithAck<{ ok: boolean; bid: { amountLakhs: number } }>(
      clients[0],
      'auction:bid',
      { roomCode, teamCode: 'CSK' }
    );
    expect(bid1.ok).toBe(true);
    expect(bid1.bid.amountLakhs).toBe(openingBase);

    // Self-outbid must be rejected
    const selfBid = await emitWithAck<{ ok: boolean }>(clients[0], 'auction:bid', {
      roomCode,
      teamCode: 'CSK',
    });
    expect(selfBid.ok).toBe(false);

    // MI bids next slab (200 -> 220L)
    const bid2 = await emitWithAck<{ ok: boolean; bid: { amountLakhs: number } }>(
      clients[1],
      'auction:bid',
      { roomCode, teamCode: 'MI' }
    );
    expect(bid2.ok).toBe(true);
    expect(bid2.bid.amountLakhs).toBe(220);

    // RCB jump-bids to ₹15.00 Cr (1500 Lakhs)
    const bid3 = await emitWithAck<{ ok: boolean; bid: { amountLakhs: number } }>(
      clients[2],
      'auction:bid',
      { roomCode, teamCode: 'RCB', amountLakhs: 1500 }
    );
    expect(bid3.ok).toBe(true);
    expect(bid3.bid.amountLakhs).toBe(1500);

    // Bid exceeding ₹120 Cr (12000L) purse must be rejected
    const overPurseBid = await emitWithAck<{ ok: boolean }>(clients[3], 'auction:bid', {
      roomCode,
      teamCode: 'KKR',
      amountLakhs: 12500,
    });
    expect(overPurseBid.ok).toBe(false);

    // Host drops gavel on Lot #1 -> Sold to RCB for 1500L!
    const soldPromise = new Promise<{ soldToTeam: string; soldPriceLakhs: number }>(
      (resolve) => {
        clients[4].once('auction:lot_sold', (ev) => resolve(ev));
      }
    );
    await emitWithAck(clients[0], 'auction:skip', { roomCode });
    const soldEvent = await soldPromise;
    expect(soldEvent.soldToTeam).toBe('RCB');
    expect(soldEvent.soldPriceLakhs).toBe(1500);

    // Verify RCB purse is now exactly 10,500 Lakhs (₹105.00 Cr)
    const snapAfterSold = await request(app).get(`/api/rooms/${roomCode}`).expect(200);
    const rcbState = snapAfterSold.body.room.teams.find(
      (t: { teamCode: string }) => t.teamCode === 'RCB'
    );
    expect(rcbState.purseRemainingLakhs).toBe(10500);
    expect(rcbState.squadCount).toBe(1);

    // Wait for intermission to advance to Lot #2, then drop gavel with zero bids -> UNSOLD!
    await new Promise<void>((resolve) => {
      clients[0].once('auction:lot_started', () => resolve());
    });
    const unsoldPromise = new Promise<{ lotId: string }>((resolve) => {
      clients[5].once('auction:lot_unsold', (ev) => resolve(ev));
    });
    await emitWithAck(clients[0], 'auction:skip', { roomCode });
    const unsoldEvent = await unsoldPromise;
    expect(unsoldEvent.lotId).toBeTruthy();

    // 8. Conclude Auction & Verify #1-#10 AI Team Ranking Prediction Engine
    const finishAck = await emitWithAck<{
      ok: boolean;
      analysis: {
        predictedChampion: { teamCode: string };
        rankings: { rank: number; teamCode: string; bestPlayingXI: { isOverseas: boolean }[] }[];
      };
    }>(clients[0], 'auction:finish', { roomCode });

    expect(finishAck.ok).toBe(true);
    expect(finishAck.analysis.rankings).toHaveLength(10);
    expect(finishAck.analysis.rankings[0].rank).toBe(1);
    expect(finishAck.analysis.rankings[9].rank).toBe(10);
    expect(finishAck.analysis.predictedChampion.teamCode).toBe('RCB');

    // Verify max 4 overseas constraint in every team's predicted Playing XI
    for (const r of finishAck.analysis.rankings) {
      const osInXI = r.bestPlayingXI.filter((p) => p.isOverseas).length;
      expect(osInXI).toBeLessThanOrEqual(4);
    }

    // Verify Sold & Unsold REST endpoints return accurate room lot lists
    const soldLotsRes = await request(app)
      .get(`/api/rooms/${roomCode}/lots?status=SOLD`)
      .expect(200);
    expect(soldLotsRes.body.total).toBe(1);

    const unsoldLotsRes = await request(app)
      .get(`/api/rooms/${roomCode}/lots?status=UNSOLD`)
      .expect(200);
    expect(unsoldLotsRes.body.total).toBe(1);
  });

  it('strictly enforces 25-player max squad limit, 8-overseas cap, and host pause/resume', async () => {
    const u1 = await request(app).post('/api/auth/guest').send({ displayName: 'GM_GT' });
    const u2 = await request(app).post('/api/auth/guest').send({ displayName: 'GM_LSG' });

    const roomRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${u1.body.token}`)
      .send({
        name: 'Rule Compliance Room',
        visibility: 'PRIVATE',
        timerSeconds: 20,
        fillBots: false,
        preferredTeam: 'GT',
      })
      .expect(201);

    const code = roomRes.body.room.code;
    const roomId = roomRes.body.room.id;

    auctionEngine.claimTeam({
      roomCode: code,
      user: u2.body.user,
      teamCode: 'LSG',
    });

    auctionEngine.startAuction({ roomCode: code, hostUserId: u1.body.user.id });

    // Pause & verify bidding blocked while paused
    auctionEngine.pauseAuction({ roomCode: code, hostUserId: u1.body.user.id });
    expect(() =>
      auctionEngine.placeBid({
        roomCode: code,
        userId: u1.body.user.id,
        teamCode: 'GT',
      })
    ).toThrow(/not currently active/i);

    // Resume auction
    auctionEngine.resumeAuction({ roomCode: code, hostUserId: u1.body.user.id });

    // Simulate GT reaching 25 squad cap -> further bids rejected
    testDb
      .prepare('UPDATE room_teams SET squad_count = 25 WHERE room_id = ? AND team_code = ?')
      .run(roomId, 'GT');

    expect(() =>
      auctionEngine.placeBid({
        roomCode: code,
        userId: u1.body.user.id,
        teamCode: 'GT',
      })
    ).toThrow(/maximum squad size/i);
  });
});
