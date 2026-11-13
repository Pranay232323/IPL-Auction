import React, { useState } from 'react';
import {
  Gavel,
  LogOut,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Database,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSfxMuted, setSfxMuted } from '../utils/sound';

interface NavbarProps {
  socketConnected: boolean;
  activeRoomCode: string | null;
  onExitRoom: () => void;
  onOpenCatalog: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  socketConnected,
  activeRoomCode,
  onExitRoom,
  onOpenCatalog,
}) => {
  const { user, logout, guestJoin } = useAuth();
  const [muted, setMuted] = useState<boolean>(() => isSfxMuted());
  const [switchingTab, setSwitchingTab] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setSfxMuted(next);
    setMuted(next);
  };

  const handleNewTabIdentity = async () => {
    const customName = window.prompt(
      'Create an independent player identity for THIS browser tab (great for testing multiplayer across tabs):',
      `GM ${Math.floor(10 + Math.random() * 89)}`
    );
    if (!customName) return;
    setSwitchingTab(true);
    try {
      await guestJoin(customName, true);
    } finally {
      setSwitchingTab(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-stadium-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          {activeRoomCode && (
            <button
              onClick={onExitRoom}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-amber-500/40 hover:bg-white/10 hover:text-white"
              title="Back to Rooms Lobby"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lobby</span>
            </button>
          )}

          <div
            onClick={activeRoomCode ? onExitRoom : undefined}
            className={`flex items-center gap-3 ${activeRoomCode ? 'cursor-pointer' : ''}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-stadium-950 shadow-lg shadow-amber-500/25">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-black tracking-wide text-white sm:text-lg">
                  IPL MEGA AUCTION
                </span>
                <span className="hidden rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-500/40 md:inline-block">
                  ₹120 Cr • 10 Teams
                </span>
              </div>
              <p className="hidden text-[11px] font-semibold text-slate-400 sm:block">
                Real-Time Multiplayer Cricket Franchise War Room
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {user && (
            <button
              onClick={onOpenCatalog}
              className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
              title="Explore all 588 Registered IPL Players"
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden md:inline">588 IPL Pool</span>
              <span className="md:hidden">Pool</span>
            </button>
          )}

          <button
            onClick={toggleMute}
            className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title={muted ? 'Unmute Gavel & Bid Sound Effects' : 'Mute Sound Effects'}
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            )}
          </button>

          {user && (
            <>
              <div
                className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:flex ${
                  socketConnected
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                {socketConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span>{socketConnected ? 'LIVE' : 'SYNCING'}</span>
              </div>

              <button
                onClick={handleNewTabIdentity}
                disabled={switchingTab}
                className="hidden items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-xs font-medium text-purple-300 transition hover:bg-purple-500/20 lg:flex"
                title="Create an independent session in this browser tab to test multi-player solo"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>New Tab Player</span>
              </button>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-stadium-900 px-2.5 py-1">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-stadium-950"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="max-w-[100px] truncate text-xs font-semibold text-slate-200 sm:max-w-[140px]">
                  {user.displayName}
                </div>
                <button
                  onClick={logout}
                  className="ml-0.5 rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-rose-400"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          {!user && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="h-4 w-4 text-amber-400" />
              <span>Free Live 10-Player Multiplayer</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
