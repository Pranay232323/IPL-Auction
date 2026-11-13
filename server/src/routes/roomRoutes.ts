import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { auctionEngine, AuctionEngineError } from '../services/auctionEngine.js';
import { generateRoomAnalysis } from '../services/teamAnalysisService.js';
import { TeamCode, VALID_TEAM_CODES } from '../types/domain.js';

export const roomRouter = Router();

const createRoomSchema = z.object({
  name: z
    .string()
    .min(3, 'Room name must be at least 3 characters')
    .max(48, 'Room name must be at most 48 characters'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  timerSeconds: z.number().int().min(5).max(45).optional(),
  fillBots: z.boolean().optional(),
  preferredTeam: z.string().optional(),
});

roomRouter.get('/', (_req, res) => {
  const rooms = auctionEngine.listPublicRooms();
  res.json({ rooms });
});

roomRouter.post('/', requireAuth, (req, res) => {
  try {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success || !req.user) {
      res.status(400).json({ error: parsed.error?.issues[0]?.message || 'Invalid room settings' });
      return;
    }
    const preferred =
      parsed.data.preferredTeam && VALID_TEAM_CODES.has(parsed.data.preferredTeam)
        ? (parsed.data.preferredTeam as TeamCode)
        : undefined;

    const snapshot = auctionEngine.createRoom({
      hostUser: req.user,
      name: parsed.data.name,
      visibility: parsed.data.visibility,
      timerSeconds: parsed.data.timerSeconds,
      fillBots: parsed.data.fillBots,
      preferredTeam: preferred,
    });
    res.status(201).json({ room: snapshot });
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create auction room.' });
  }
});

roomRouter.get('/:code', (req, res) => {
  try {
    const snapshot = auctionEngine.getRoomSnapshot(req.params.code);
    res.json({ room: snapshot });
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to load room.' });
  }
});

roomRouter.get('/:code/lots', (req, res) => {
  try {
    const lots = auctionEngine.getRoomLots({
      roomCode: req.params.code,
      status: req.query.status ? String(req.query.status) : undefined,
      role: req.query.role ? String(req.query.role) : undefined,
      capped: req.query.capped ? String(req.query.capped) : undefined,
      overseas: req.query.overseas ? String(req.query.overseas) : undefined,
      teamCode: req.query.teamCode ? String(req.query.teamCode) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.json({ total: lots.length, lots });
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to load auction player lots.' });
  }
});

roomRouter.get('/:code/analysis', async (req, res) => {
  try {
    const db = getDb();
    const code = req.params.code.trim().toUpperCase();
    const room = db
      .prepare('SELECT id FROM rooms WHERE code = ?')
      .get(code) as { id: string } | undefined;
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const report = await generateRoomAnalysis(room.id, refresh);
    res.json({ analysis: report });
  } catch {
    res.status(500).json({ error: 'Failed to generate team analysis.' });
  }
});

const saveRetentionsSchema = z.object({
  teamCode: z.string(),
  playerIds: z.array(z.number().int()).max(5),
});

roomRouter.get('/:code/retention-candidates', requireAuth, (req, res) => {
  try {
    const teamCode = String(req.query.teamCode || '').trim().toUpperCase() as TeamCode;
    if (!VALID_TEAM_CODES.has(teamCode)) {
      res.status(400).json({ error: 'Valid teamCode query parameter is required.' });
      return;
    }
    const result = auctionEngine.getRetentionCandidates({
      roomCode: req.params.code,
      teamCode,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to load retention candidates.' });
  }
});

roomRouter.post('/:code/retentions', requireAuth, (req, res) => {
  try {
    const parsed = saveRetentionsSchema.safeParse(req.body);
    if (!parsed.success || !req.user) {
      res.status(400).json({ error: parsed.error?.issues[0]?.message || 'Invalid retention payload.' });
      return;
    }
    const teamCode = parsed.data.teamCode.toUpperCase() as TeamCode;
    if (!VALID_TEAM_CODES.has(teamCode)) {
      res.status(400).json({ error: 'Invalid franchise teamCode.' });
      return;
    }
    const snapshot = auctionEngine.saveRetentions({
      roomCode: req.params.code,
      userId: req.user.id,
      teamCode,
      playerIds: parsed.data.playerIds,
    });
    res.json({ room: snapshot });
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to save retentions.' });
  }
});

roomRouter.post('/:code/retentions/auto-2025', requireAuth, (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const snapshot = auctionEngine.applyOfficial2025Retentions({
      roomCode: req.params.code,
      hostUserId: req.user.id,
    });
    res.json({ room: snapshot });
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to apply official 2025 retentions.' });
  }
});

// ================= POST-AUCTION TRADE WINDOW ENDPOINTS =================
const proposeTradeSchema = z.object({
  proposerTeam: z.string(),
  receiverTeam: z.string(),
  offeredPlayerIds: z.array(z.number().int()).default([]),
  requestedPlayerIds: z.array(z.number().int()).default([]),
  purseTransferLakhs: z.number().int().default(0),
});

const respondTradeSchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT']),
});

roomRouter.get('/:code/trades', requireAuth, (req, res) => {
  try {
    const trades = auctionEngine.getRoomTrades(req.params.code);
    res.json({ trades });
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch room trades.' });
  }
});

roomRouter.post('/:code/trades', requireAuth, (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const parsed = proposeTradeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error?.issues[0]?.message || 'Invalid trade proposal.' });
      return;
    }
    const proposerTeam = parsed.data.proposerTeam.toUpperCase() as TeamCode;
    const receiverTeam = parsed.data.receiverTeam.toUpperCase() as TeamCode;
    if (!VALID_TEAM_CODES.has(proposerTeam) || !VALID_TEAM_CODES.has(receiverTeam)) {
      res.status(400).json({ error: 'Invalid franchise teamCode.' });
      return;
    }

    const result = auctionEngine.proposeTrade({
      roomCode: req.params.code,
      userId: req.user.id,
      proposerTeam,
      receiverTeam,
      offeredPlayerIds: parsed.data.offeredPlayerIds,
      requestedPlayerIds: parsed.data.requestedPlayerIds,
      purseTransferLakhs: parsed.data.purseTransferLakhs,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to propose trade.' });
  }
});

roomRouter.post('/:code/trades/:tradeId/respond', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const parsed = respondTradeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Decision must be ACCEPT or REJECT.' });
      return;
    }
    const result = await auctionEngine.respondToTrade({
      roomCode: req.params.code,
      userId: req.user.id,
      tradeId: req.params.tradeId,
      decision: parsed.data.decision,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to process trade response.' });
  }
});

roomRouter.post('/:code/trades/:tradeId/cancel', requireAuth, (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const result = auctionEngine.cancelTrade({
      roomCode: req.params.code,
      userId: req.user.id,
      tradeId: req.params.tradeId,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to cancel trade.' });
  }
});

roomRouter.post('/:code/trades/conclude', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const result = await auctionEngine.concludeTradeWindow({
      roomCode: req.params.code,
      hostUserId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AuctionEngineError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to conclude trade window.' });
  }
});
