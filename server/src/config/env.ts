import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

function parseIceServers(raw: string | undefined): IceServerConfig[] {
  const fallback: IceServerConfig[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  databasePath:
    process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'ipl_auction.db'),
  jwtSecret:
    process.env.JWT_SECRET || 'ipl-mega-auction-2026-default-dev-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  livekitUrl: (process.env.LIVEKIT_URL || '').trim(),
  livekitApiKey: (process.env.LIVEKIT_API_KEY || '').trim(),
  livekitApiSecret: (process.env.LIVEKIT_API_SECRET || '').trim(),
  webrtcIceServers: parseIceServers(process.env.WEBRTC_ICE_SERVERS),
  openAiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  openAiModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),

  get isLiveKitConfigured(): boolean {
    return Boolean(
      this.livekitUrl &&
        this.livekitApiKey &&
        this.livekitApiSecret &&
        (this.livekitUrl.startsWith('ws://') || this.livekitUrl.startsWith('wss://'))
    );
  },
};
