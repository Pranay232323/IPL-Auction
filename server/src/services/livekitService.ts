import { AccessToken } from 'livekit-server-sdk';
import { env, IceServerConfig } from '../config/env.js';

export interface VoiceConfigResponse {
  provider: 'livekit' | 'webrtc-mesh';
  livekitConfigured: boolean;
  livekitUrl: string | null;
  iceServers: IceServerConfig[];
  setupHint: string | null;
}

export function getVoiceConfig(): VoiceConfigResponse {
  const configured = env.isLiveKitConfigured;
  return {
    provider: configured ? 'livekit' : 'webrtc-mesh',
    livekitConfigured: configured,
    livekitUrl: configured ? env.livekitUrl : null,
    iceServers: env.webrtcIceServers,
    setupHint: configured
      ? null
      : 'LiveKit SFU keys are not configured in .env; active voice rooms automatically use the built-in P2P WebRTC Audio Mesh over Socket.IO. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to switch to LiveKit SFU.',
  };
}

export async function generateLiveKitToken(params: {
  roomCode: string;
  userId: string;
  displayName: string;
  teamCode?: string | null;
  apiKey?: string;
  apiSecret?: string;
}): Promise<{ token: string; roomName: string; livekitUrl: string }> {
  const key = params.apiKey || env.livekitApiKey;
  const secret = params.apiSecret || env.livekitApiSecret;
  const url = env.livekitUrl || 'wss://localhost:7880';

  if (!key || !secret) {
    throw new Error(
      'LiveKit credentials (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) are not configured on the server.'
    );
  }

  const roomName = `ipl-auction-${params.roomCode.toUpperCase()}`;
  const at = new AccessToken(key, secret, {
    identity: params.userId,
    name: params.displayName,
    ttl: '4h',
    metadata: JSON.stringify({
      userId: params.userId,
      displayName: params.displayName,
      teamCode: params.teamCode || null,
    }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return {
    token,
    roomName,
    livekitUrl: url,
  };
}
