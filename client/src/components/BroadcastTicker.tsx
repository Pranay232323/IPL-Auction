import React, { useEffect, useState } from 'react';
import { Radio, Sparkles, TrendingUp, Award, Zap } from 'lucide-react';
import { RoomSnapshot, PlayerDTO } from '../types';
import { formatLakhs } from '../utils/format';

interface BroadcastTickerProps {
  room?: RoomSnapshot | null;
  currentLotPlayer?: PlayerDTO | null;
}

const BROADCAST_TICKER_ITEMS = [
  '🔴 STAR SPORTS LIVE BROADCAST • TATA IPL 2026 MEGA AUCTION ARENA',
  '💰 SQUAD SALARY CAP: ₹120.00 CRORE PER FRANCHISE • MIN 18 / MAX 25 SQUAD LIMIT',
  '✈️ OVERSEAS ROSTER LIMIT: MAXIMUM 4 OVERSEAS PLAYERS IN PLAYING XI • MAX 8 IN SQUAD',
  '🃏 RIGHT TO MATCH (RTM): FRANCHISES CAN MATCH THE HIGHEST BID FOR ELIGIBLE STARS',
  '⚡ ACCELERATED AUCTION PHASE: 7-SECOND RAPID TIMER FOR UNRESERVED PLAYERS',
  '🎙️ STAR SPORTS EXPERT PUNDIT: "AGGRESSIVE BIDDING EXPECTED FOR HIGH-PACE INDIAN PACERS AND FINISHERS"',
  '🏆 POST-AUCTION PREDICTOR: HOLISTIC 7-FACTOR AI POTENTIAL & PLAYOFF SIMULATION READY',
];

export const BroadcastTicker: React.FC<BroadcastTickerProps> = ({
  room,
  currentLotPlayer,
}) => {
  const [tickerIndex, setTickerIndex] = useState(0);

  // Dynamic ticker feed combining live room telemetry + broadcast news
  const liveFeed: string[] = [];

  if (currentLotPlayer) {
    liveFeed.push(
      `🏏 NOW ON AUCTION BLOCK: ${currentLotPlayer.name.toUpperCase()} (${currentLotPlayer.role} • ${currentLotPlayer.country.toUpperCase()}) • ${currentLotPlayer.overallRating} OVR`
    );
  }

  if (room) {
    if (room.counts.sold > 0) {
      liveFeed.push(
        `📊 TO DATE: ${room.counts.sold} PLAYERS SOLD • ${room.counts.unsold} UNSOLD • ${room.counts.upcoming} LOTS REMAINING`
      );
    }
    const topPurse = [...room.teams].sort(
      (a, b) => b.purseRemainingLakhs - a.purseRemainingLakhs
    )[0];
    if (topPurse) {
      liveFeed.push(
        `💼 HIGHEST REMAINING PURSE: ${topPurse.teamName} (${topPurse.teamCode}) WITH ${formatLakhs(topPurse.purseRemainingLakhs)} AVAILABLE`
      );
    }
  }

  const allItems = [...liveFeed, ...BROADCAST_TICKER_ITEMS];

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % allItems.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [allItems.length]);

  const currentItem = allItems[tickerIndex] || allItems[0];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-9 items-center border-t border-amber-400/40 bg-gradient-to-r from-[#030611] via-[#09112a] to-[#030611] px-3 shadow-[0_-8px_25px_rgba(0,0,0,0.8)] backdrop-blur-md">
      {/* Left Star Sports TV Badge */}
      <div className="flex shrink-0 items-center gap-2 border-r border-amber-400/30 pr-3 sm:pr-4">
        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
        <span className="font-display text-xs font-black uppercase tracking-wider text-amber-400 sm:text-sm drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          STAR SPORTS <span className="text-white">LIVE</span>
        </span>
        <span className="hidden rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300 border border-amber-500/40 md:inline-block">
          IPL 2026
        </span>
      </div>

      {/* Center Animated Ticker Strap */}
      <div className="flex flex-1 items-center overflow-hidden px-3 sm:px-4">
        <div
          key={tickerIndex}
          className="truncate font-display text-xs font-bold uppercase tracking-wider text-slate-200 transition-all duration-300 animate-fadeIn"
        >
          {currentItem}
        </div>
      </div>

      {/* Right Telemetry Badge */}
      <div className="hidden shrink-0 items-center gap-2 border-l border-white/10 pl-3 sm:flex">
        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
          BROADCAST HD 1080P
        </span>
        <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
      </div>
    </div>
  );
};
