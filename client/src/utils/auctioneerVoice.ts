// Browser Speech Synthesis for Realistic IPL Auctioneer Voice Calls

const SPEECH_STORAGE_KEY = 'ipl_auctioneer_voice_enabled';

export function isAuctioneerVoiceEnabled(): boolean {
  try {
    const val = localStorage.getItem(SPEECH_STORAGE_KEY);
    // Enabled by default if supported
    return val === null ? true : val === '1';
  } catch {
    return true;
  }
}

export function setAuctioneerVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SPEECH_STORAGE_KEY, enabled ? '1' : '0');
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore storage errors
  }
}

let preferredVoice: SpeechSynthesisVoice | null = null;

function loadVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (preferredVoice) return preferredVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prefer Indian English voice, British English, or crisp English voice for cricket authenticity
  preferredVoice =
    voices.find(
      (v) =>
        v.lang.toLowerCase().includes('en-in') ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('rishi') ||
        v.name.toLowerCase().includes('veena')
    ) ||
    voices.find(
      (v) =>
        v.lang.toLowerCase().includes('en-gb') ||
        v.name.toLowerCase().includes('george') ||
        v.name.toLowerCase().includes('oliver') ||
        v.name.toLowerCase().includes('daniel')
    ) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0] ||
    null;

  return preferredVoice;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = null;
    loadVoice();
  };
}

export function speakAuctioneer(text: string, options?: { priority?: boolean; cancelPrevious?: boolean }): void {
  if (!isAuctioneerVoiceEnabled() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    if (options?.cancelPrevious) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = loadVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Energetic, professional auctioneer cadence
    utterance.rate = 1.08;
    utterance.pitch = 1.02;
    utterance.volume = 0.95;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech errors gracefully
  }
}

export function cancelAuctioneerSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

