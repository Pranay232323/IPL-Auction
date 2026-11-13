import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import { getDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { seedPlayers } from './db/seed.js';
import { authRouter } from './routes/authRoutes.js';
import { playerRouter } from './routes/playerRoutes.js';
import { roomRouter } from './routes/roomRoutes.js';
import { voiceRouter } from './routes/voiceRoutes.js';
import { registerSocketHandlers } from './socket/socketHandler.js';

export function createServerApp(options?: { skipAutoSeed?: boolean }) {
  const db = getDb();
  runMigrations(db);

  if (!options?.skipAutoSeed) {
    const countRow = db
      .prepare('SELECT COUNT(*) as cnt FROM players')
      .get() as { cnt: number };
    if (countRow.cnt < 520) {
      seedPlayers(db);
    }
  }

  const app = express();
  app.set('trust proxy', 1);

  // Configure Helmet without X-Frame-Options / frame-ancestors block so embedded browser previews work cleanly
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(','),
      credentials: true,
    })
  );

  app.use(express.json({ limit: '512kb' }));

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication requests, please try again shortly.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded, please slow down.' },
  });

  app.get('/api/health', (_req, res) => {
    const playerCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM players').get() as { cnt: number }
    ).cnt;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      playerCatalogCount: playerCount,
      livekitConfigured: env.isLiveKitConfigured,
    });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/players', apiLimiter, playerRouter);
  app.use('/api/rooms', apiLimiter, roomRouter);
  app.use('/api/voice', apiLimiter, voiceRouter);

  // Serve built frontend bundle in unified/production mode
  const clientDistDir = path.resolve(process.cwd(), 'dist', 'client');
  if (fs.existsSync(path.join(clientDistDir, 'index.html'))) {
    app.use(express.static(clientDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  // Fallback JSON 404 for unknown API endpoints
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 15000,
    pingTimeout: 20000,
  });

  registerSocketHandlers(io);

  return { app, httpServer, io };
}
