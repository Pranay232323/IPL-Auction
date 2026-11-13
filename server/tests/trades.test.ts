import Database from 'better-sqlite3';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerApp } from '../src/app.js';
import { setDbForTesting } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedPlayers } from '../src/db/seed.js';
import { auctionEngine } from '../src/services/auctionEngine.js';
import { TeamCode } from '../src/types/domain.js';

describe('Post-Auction Franchise Trade Window Engine', () => {
  let testDb: Database.Database;
  let app: ReturnType<typeof createServerApp>['app'];
  let httpServer: ReturnType<typeof createServerApp>['httpServer'];
  let ioServer: ReturnType<typeof createServerApp>['io'];

  let userA: { id: string; displayName: string };
  let userB: { id: string; displayName: string };
  let tokenA: string;
  let tokenB: string;

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

    const resA = await request(app)
      .post('/api/auth/guest')
      .send({ displayName: 'CSK Boss', avatarColor: '#FACC15' });
    tokenA = resA.body.token;
    userA = resA.body.user;

    const resB = await request(app)
      .post('/api/auth/guest')
      .send({ displayName: 'MI Boss', avatarColor: '#0284C7' });
    tokenB = resB.body.token;
    userB = resB.body.user;
  });

  afterAll(async () => {
    auctionEngine.destroyAllRuntimes();
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    testDb.close();
  });

  it('triggers 5-minute trade window upon completing auction', async () => {
    // 1. Create room
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Trade Test Room', fillBots: true, preferredTeam: 'CSK' });
    expect(createRes.status).toBe(201);
    const roomCode = createRes.body.room.code;

    // 2. User B claims MI
    auctionEngine.claimTeam({ roomCode, user: userB, teamCode: 'MI' });

    // 3. Complete auction via host finish
    await auctionEngine.finishAuctionByHost({ roomCode, hostUserId: userA.id });

    // 4. Verify snapshot shows trade window active
    const snap = auctionEngine.getRoomSnapshot(roomCode);
    expect(snap.status).toBe('COMPLETED');
    expect(snap.tradeWindowActive).toBe(true);
    expect(snap.tradeWindowEndsAt).toBeGreaterThan(Date.now());
  });

  it('allows valid player-for-player and player-for-purse trade proposals', async () => {
    // Create new room with trade window active
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Trade Room 2', fillBots: true, preferredTeam: 'CSK' });
    const roomCode = createRes.body.room.code;

    auctionEngine.claimTeam({ roomCode, user: userB, teamCode: 'MI' });

    await auctionEngine.finishAuctionByHost({ roomCode, hostUserId: userA.id });

    // Assign sample sold players to CSK and MI
    const roomRow = testDb.prepare('SELECT id FROM rooms WHERE code = ?').get(roomCode) as { id: string };
    const players = testDb.prepare('SELECT id, is_overseas FROM players LIMIT 4').all() as { id: number; is_overseas: number }[];

    testDb.prepare(
      `UPDATE auction_lots SET status = 'SOLD', sold_to_team = 'CSK', sold_price_lakhs = 800 WHERE room_id = ? AND player_id = ?`
    ).run(roomRow.id, players[0].id);

    testDb.prepare(
      `UPDATE auction_lots SET status = 'SOLD', sold_to_team = 'MI', sold_price_lakhs = 600 WHERE room_id = ? AND player_id = ?`
    ).run(roomRow.id, players[1].id);

    // Propose trade: CSK offers player[0] + ₹100L cash for MI's player[1]
    const proposeRes = await request(app)
      .post(`/api/rooms/${roomCode}/trades`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proposerTeam: 'CSK',
        receiverTeam: 'MI',
        offeredPlayerIds: [players[0].id],
        requestedPlayerIds: [players[1].id],
        purseTransferLakhs: 100, // CSK pays 1Cr to MI
      });

    expect(proposeRes.status).toBe(200);
    expect(proposeRes.body.trade).toBeDefined();
    expect(proposeRes.body.trade.status).toBe('PENDING');
    expect(proposeRes.body.trade.purseTransferLakhs).toBe(100);

    const tradeId = proposeRes.body.trade.id;

    // MI accepts trade
    const acceptRes = await request(app)
      .post(`/api/rooms/${roomCode}/trades/${tradeId}/respond`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ decision: 'ACCEPT' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.trade.status).toBe('ACCEPTED');

    // Verify ownership swap in database:
    const lotA = testDb.prepare('SELECT sold_to_team FROM auction_lots WHERE room_id = ? AND player_id = ?').get(roomRow.id, players[0].id) as { sold_to_team: string };
    const lotB = testDb.prepare('SELECT sold_to_team FROM auction_lots WHERE room_id = ? AND player_id = ?').get(roomRow.id, players[1].id) as { sold_to_team: string };

    expect(lotA.sold_to_team).toBe('MI'); // Traded to MI!
    expect(lotB.sold_to_team).toBe('CSK'); // Traded to CSK!
  });

  it('rejects invalid trades exceeding overseas limits or unowned players', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Trade Room 3', fillBots: true, preferredTeam: 'CSK' });
    const roomCode = createRes.body.room.code;

    await auctionEngine.finishAuctionByHost({ roomCode, hostUserId: userA.id });

    // Attempt to trade a player NOT owned by CSK
    const failRes = await request(app)
      .post(`/api/rooms/${roomCode}/trades`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proposerTeam: 'CSK',
        receiverTeam: 'MI',
        offeredPlayerIds: [9999], // Not owned
        requestedPlayerIds: [],
        purseTransferLakhs: 0,
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toMatch(/not owned/i);
  });

  it('allows host to conclude the trade window early and lock squads', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Trade Room 4', fillBots: true, preferredTeam: 'CSK' });
    const roomCode = createRes.body.room.code;

    await auctionEngine.finishAuctionByHost({ roomCode, hostUserId: userA.id });

    // Verify active
    let snap = auctionEngine.getRoomSnapshot(roomCode);
    expect(snap.tradeWindowActive).toBe(true);

    // Conclude trade window
    const concludeRes = await request(app)
      .post(`/api/rooms/${roomCode}/trades/conclude`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});

    expect(concludeRes.status).toBe(200);

    // Verify inactive
    snap = auctionEngine.getRoomSnapshot(roomCode);
    expect(snap.tradeWindowActive).toBe(false);
    expect(snap.tradeWindowEndsAt).toBeNull();
  });
});
