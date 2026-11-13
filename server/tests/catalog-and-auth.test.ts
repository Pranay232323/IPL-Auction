import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerApp } from '../src/app.js';
import { setDbForTesting } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedPlayers } from '../src/db/seed.js';
import { auctionEngine } from '../src/services/auctionEngine.js';
import { generateLiveKitToken } from '../src/services/livekitService.js';
import { getNextMinimumBidLakhs } from '../src/types/domain.js';

describe('Foundation: Player Pool (520+), Auth APIs, Bid Slabs & LiveKit JWT', () => {
  let testDb: Database.Database;
  let app: ReturnType<typeof createServerApp>['app'];
  let httpServer: ReturnType<typeof createServerApp>['httpServer'];

  beforeAll(() => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    setDbForTesting(testDb);
    runMigrations(testDb);
    seedPlayers(testDb);

    const created = createServerApp({ skipAutoSeed: true });
    app = created.app;
    httpServer = created.httpServer;
  });

  afterAll(() => {
    auctionEngine.destroyAllRuntimes();
    httpServer.close();
    testDb.close();
  });

  it('seeds at least 520 unique real IPL-registered players across all roles, capped, uncapped & overseas', async () => {
    const metaRes = await request(app).get('/api/players/meta').expect(200);
    const { stats, franchises } = metaRes.body;

    expect(stats.total).toBeGreaterThanOrEqual(520);
    expect(stats.capped).toBeGreaterThan(250);
    expect(stats.uncapped).toBeGreaterThan(150);
    expect(stats.overseas).toBeGreaterThan(150);
    expect(stats.indian).toBeGreaterThan(200);
    expect(stats.wk).toBeGreaterThan(40);
    expect(stats.bat).toBeGreaterThan(80);
    expect(stats.ar).toBeGreaterThan(100);
    expect(stats.bowl).toBeGreaterThan(150);
    expect(franchises).toHaveLength(10);

    // Filter overseas capped wicketkeepers
    const wkRes = await request(app)
      .get('/api/players?role=WK&capped=1&overseas=1')
      .expect(200);
    expect(wkRes.body.players.length).toBeGreaterThan(15);
    expect(
      wkRes.body.players.every(
        (p: { role: string; isCapped: boolean; isOverseas: boolean }) =>
          p.role === 'WK' && p.isCapped && p.isOverseas
      )
    ).toBe(true);
  });

  it('calculates official IPL Mega Auction bid slab increments accurately', () => {
    // Opening bid = base price
    expect(getNextMinimumBidLakhs(200, null, null)).toBe(200);
    // < 1 Cr (+5L)
    expect(getNextMinimumBidLakhs(30, 30, 'CSK')).toBe(35);
    expect(getNextMinimumBidLakhs(30, 95, 'MI')).toBe(100);
    // 1 Cr - <2 Cr (+10L)
    expect(getNextMinimumBidLakhs(100, 100, 'RCB')).toBe(110);
    expect(getNextMinimumBidLakhs(100, 190, 'KKR')).toBe(200);
    // 2 Cr - <5 Cr (+20L)
    expect(getNextMinimumBidLakhs(200, 200, 'SRH')).toBe(220);
    expect(getNextMinimumBidLakhs(200, 480, 'RR')).toBe(500);
    // >= 5 Cr (+25L)
    expect(getNextMinimumBidLakhs(200, 500, 'DC')).toBe(525);
    expect(getNextMinimumBidLakhs(200, 1850, 'PBKS')).toBe(1875);
  });

  it('registers users, prevents duplicates, authenticates logins, and supports guest sessions', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'ms_dhoni_07',
        email: 'thala@csk.in',
        password: 'whistlepodu2026',
        displayName: 'Captain Cool',
      })
      .expect(201);

    expect(regRes.body.token).toBeTruthy();
    expect(regRes.body.user.username).toBe('ms_dhoni_07');
    expect(regRes.body.user.displayName).toBe('Captain Cool');

    // Duplicate username rejected
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'ms_dhoni_07',
        email: 'other@csk.in',
        password: 'password123',
      })
      .expect(409);

    // Wrong password rejected
    await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'ms_dhoni_07',
        password: 'wrongpassword',
      })
      .expect(401);

    // Valid login succeeds
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'thala@csk.in',
        password: 'whistlepodu2026',
      })
      .expect(200);

    // Verify /api/auth/me with Bearer token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .expect(200);
    expect(meRes.body.user.id).toBe(regRes.body.user.id);

    // Guest session creation
    const guestRes = await request(app)
      .post('/api/auth/guest')
      .send({ displayName: 'Quick Bidder' })
      .expect(201);
    expect(guestRes.body.user.isGuest).toBe(true);
    expect(guestRes.body.user.displayName).toBe('Quick Bidder');
  });

  it('generates valid signed LiveKit SFU JWT tokens and honestly reports voice config', async () => {
    const cfgRes = await request(app).get('/api/voice/config').expect(200);
    expect(typeof cfgRes.body.livekitConfigured).toBe('boolean');
    expect(Array.isArray(cfgRes.body.iceServers)).toBe(true);

    const testSecret = 'livekit-unit-test-secret-minimum-32-chars-long!';
    const issued = await generateLiveKitToken({
      roomCode: 'IPL777',
      userId: 'user-123',
      displayName: 'Rohit',
      teamCode: 'MI',
      apiKey: 'APItestKey123',
      apiSecret: testSecret,
    });

    expect(issued.roomName).toBe('ipl-auction-IPL777');
    const decoded = jwt.verify(issued.token, testSecret) as {
      sub: string;
      name: string;
      video: { roomJoin: boolean; room: string; canPublish: boolean };
    };
    expect(decoded.sub).toBe('user-123');
    expect(decoded.name).toBe('Rohit');
    expect(decoded.video.roomJoin).toBe(true);
    expect(decoded.video.room).toBe('ipl-auction-IPL777');
    expect(decoded.video.canPublish).toBe(true);
  });
});
