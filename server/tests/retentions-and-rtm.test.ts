import Database from 'better-sqlite3';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerApp } from '../src/app.js';
import { setDbForTesting } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedPlayers } from '../src/db/seed.js';
import {
  auctionEngine,
  calculateRetentionAllocation,
} from '../src/services/auctionEngine.js';

describe('Pre-Auction Retentions & Right-to-Match (RTM) Engine', () => {
  let testDb: Database.Database;
  let app: ReturnType<typeof createServerApp>['app'];
  let httpServer: ReturnType<typeof createServerApp>['httpServer'];
  let ioServer: ReturnType<typeof createServerApp>['io'];

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
  });

  afterAll(async () => {
    auctionEngine.destroyAllRuntimes();
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    testDb.close();
  });

  it('calculates BCCI slabs correctly: 18Cr, 14Cr, 11Cr for capped and 4Cr for uncapped', () => {
    const mockPlayers = [
      { id: 1, name: 'Capped Star 1', isCapped: true, isOverseas: false, marquee: true, overallRating: 92 },
      { id: 2, name: 'Capped Star 2', isCapped: true, isOverseas: false, marquee: false, overallRating: 88 },
      { id: 3, name: 'Capped Star 3', isCapped: true, isOverseas: false, marquee: false, overallRating: 85 },
      { id: 4, name: 'Uncapped Talent', isCapped: false, isOverseas: false, marquee: false, overallRating: 78 },
    ];

    const result = calculateRetentionAllocation(mockPlayers as any);
    expect(result.cappedCount).toBe(3);
    expect(result.uncappedCount).toBe(1);
    // Slabs: 1800, 1400, 1100, 400
    expect(result.allocations[0].costLakhs).toBe(1800);
    expect(result.allocations[1].costLakhs).toBe(1400);
    expect(result.allocations[2].costLakhs).toBe(1100);
    expect(result.allocations[3].costLakhs).toBe(400);
    expect(result.totalCostLakhs).toBe(4700); // ₹47.00 Cr
  });

  it('supports selecting and saving retentions in the lobby, deducting purse, and updating RTM cards', async () => {
    // 1. Create a guest user and a room
    const authRes = await request(app)
      .post('/api/auth/guest')
      .send({ displayName: 'Thala_CSK' })
      .expect(201);
    const token = authRes.body.token;

    const roomRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Retention Test Room', timerSeconds: 15, preferredTeam: 'CSK' })
      .expect(201);
    const roomCode = roomRes.body.room.code;

    // 2. Fetch retention candidates for CSK
    const candRes = await request(app)
      .get(`/api/rooms/${roomCode}/retention-candidates?teamCode=CSK`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(candRes.body.teamCode).toBe('CSK');
    expect(candRes.body.candidates.length).toBeGreaterThan(0);
    const cskCandidates = candRes.body.candidates;

    // Pick 2 players from candidates
    const selected = cskCandidates.slice(0, 2);
    const selectedIds = selected.map((c: any) => c.id);

    // 3. Save retentions
    const saveRes = await request(app)
      .post(`/api/rooms/${roomCode}/retentions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ teamCode: 'CSK', playerIds: selectedIds })
      .expect(200);

    const cskTeam = saveRes.body.room.teams.find((t: any) => t.teamCode === 'CSK');
    expect(cskTeam.retentionsCount).toBe(2);
    expect(cskTeam.squadCount).toBe(2);
    expect(cskTeam.rtmCardsRemaining).toBe(4); // 6 - 2 = 4 RTMs
    expect(cskTeam.purseRemainingLakhs).toBeLessThan(12000);

    // 4. Verify candidate list now marks them as retained
    const updatedCandRes = await request(app)
      .get(`/api/rooms/${roomCode}/retention-candidates?teamCode=CSK`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const retainedInList = updatedCandRes.body.candidates.filter((c: any) => c.isRetained);
    expect(retainedInList.length).toBe(2);
  });

  it('can auto-apply official 2025 IPL retentions across all teams in the lobby', async () => {
    const authRes = await request(app)
      .post('/api/auth/guest')
      .send({ displayName: 'BCCI_President' })
      .expect(201);
    const token = authRes.body.token;

    const roomRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Official 2025 Retentions Room', timerSeconds: 15, preferredTeam: 'RCB' })
      .expect(201);
    const roomCode = roomRes.body.room.code;

    const autoRes = await request(app)
      .post(`/api/rooms/${roomCode}/retentions/auto-2025`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200);

    const teams = autoRes.body.room.teams;
    const rcbTeam = teams.find((t: any) => t.teamCode === 'RCB');
    expect(rcbTeam.retentionsCount).toBeGreaterThan(0);
    expect(rcbTeam.rtmCardsRemaining).toBe(6 - rcbTeam.retentionsCount);
    expect(rcbTeam.purseRemainingLakhs).toBeLessThan(12000);
  });
});

