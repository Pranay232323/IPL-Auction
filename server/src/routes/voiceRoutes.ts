import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { generateLiveKitToken, getVoiceConfig } from '../services/livekitService.js';

export const voiceRouter = Router();

const tokenSchema = z.object({
  roomCode: z.string().min(4).max(12),
});

voiceRouter.get('/config', (_req, res) => {
  res.json(getVoiceConfig());
});

voiceRouter.post('/token', requireAuth, async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success || !req.user) {
    res.status(400).json({ error: 'Valid roomCode is required.' });
    return;
  }

  const roomCode = parsed.data.roomCode.trim().toUpperCase();
  const db = getDb();
  const room = db
    .prepare('SELECT id, code FROM rooms WHERE code = ?')
    .get(roomCode) as { id: string; code: string } | undefined;

  if (!room) {
    res.status(404).json({ error: 'Auction room not found.' });
    return;
  }

  if (!env.isLiveKitConfigured) {
    res.status(503).json({
      error:
        'LiveKit SFU credentials are not configured on this server. Use the built-in WebRTC P2P voice channel or configure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env.',
      provider: 'webrtc-mesh',
      livekitConfigured: false,
    });
    return;
  }

  const teamRow = db
    .prepare('SELECT team_code FROM room_teams WHERE room_id = ? AND user_id = ?')
    .get(room.id, req.user.id) as { team_code: string } | undefined;

  try {
    const tokenData = await generateLiveKitToken({
      roomCode: room.code,
      userId: req.user.id,
      displayName: req.user.displayName,
      teamCode: teamRow?.team_code || null,
    });
    res.json({
      ...tokenData,
      provider: 'livekit',
      livekitConfigured: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to issue LiveKit token.',
    });
  }
});
