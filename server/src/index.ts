import { createServerApp } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/connection.js';
import { auctionEngine } from './services/auctionEngine.js';

const { httpServer } = createServerApp();

httpServer.listen(env.port, env.host, () => {
  console.log(
    `[IPL Auction Server] Listening on http://${env.host}:${env.port} (${env.nodeEnv})`
  );
  console.log(
    `[IPL Auction Voice] Mode: ${env.isLiveKitConfigured ? 'LiveKit SFU' : 'Built-in WebRTC P2P Mesh (LiveKit env vars unset)'}`
  );
});

function shutdown() {
  console.log('[IPL Auction Server] Shutting down gracefully...');
  auctionEngine.destroyAllRuntimes();
  httpServer.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
