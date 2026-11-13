let audioCtx: AudioContext | null = null;
const SFX_STORAGE_KEY = 'ipl_auction_sfx_muted';

export function isSfxMuted(): boolean {
  try {
    return localStorage.getItem(SFX_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSfxMuted(muted: boolean): void {
  try {
    localStorage.setItem(SFX_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
}

function getCtx(): AudioContext | null {
  if (isSfxMuted() || typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playBidBlip(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playTimerUrgentTick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

export function playSoldGavel(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Three crisp gavel knocks + celebratory major triad
  [0, 0.13, 0.27].forEach((offset, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(idx === 2 ? 220 : 175, now + offset);
    osc.frequency.exponentialRampToValueAtTime(65, now + offset + 0.09);
    gain.gain.setValueAtTime(idx === 2 ? 0.2 : 0.14, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.11);
  });

  [523.25, 659.25, 783.99].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + 0.34);
    gain.gain.setValueAtTime(0.08, now + 0.34);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + 0.34);
    osc.stop(now + 0.86);
  });
}

export function playUnsoldStamp(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(210, now);
  osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);
  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}

export function playRtmFanfare(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [440, 554.37, 659.25, 880].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);
    gain.gain.setValueAtTime(0.12, now + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.36);
  });
}

export {
  isAuctioneerVoiceEnabled,
  setAuctioneerVoiceEnabled,
  speakAuctioneer,
  cancelAuctioneerSpeech,
} from './auctioneerVoice';
