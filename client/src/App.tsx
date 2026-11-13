import React, { useEffect, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { LobbyDirectory } from './components/LobbyDirectory';
import { MasterPlayerCatalogModal } from './components/MasterPlayerCatalogModal';
import { BroadcastTicker } from './components/BroadcastTicker';
import { Navbar } from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import { RoomArenaPage } from './pages/RoomArenaPage';

function extractRoomFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#room=([A-Za-z0-9]{4,10})$/);
  return match ? match[1].toUpperCase() : null;
}

const AppShell: React.FC = () => {
  const { user, token, loading } = useAuth();
  const { socket, connected } = useSocket(token);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(() =>
    extractRoomFromHash()
  );
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setActiveRoomCode(extractRoomFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const enterRoom = (code: string) => {
    const upper = code.trim().toUpperCase();
    window.location.hash = `room=${upper}`;
    setActiveRoomCode(upper);
  };

  const exitRoom = () => {
    window.history.pushState('', document.title, window.location.pathname + window.location.search);
    setActiveRoomCode(null);
  };

  return (
    <div className="min-h-screen bg-stadium-950 bg-stadium-grid text-slate-100">
      <Navbar
        socketConnected={connected}
        activeRoomCode={activeRoomCode}
        onExitRoom={exitRoom}
        onOpenCatalog={() => setCatalogOpen(true)}
      />

      <main className="pb-20 sm:pb-16">
        {loading ? (
          <div className="flex min-h-[65vh] items-center justify-center text-sm font-semibold text-slate-400">
            Initializing IPL Mega Auction Arena...
          </div>
        ) : !user ? (
          <AuthScreen />
        ) : activeRoomCode ? (
          <RoomArenaPage
            roomCode={activeRoomCode}
            user={user}
            socket={socket}
            onExitRoom={exitRoom}
          />
        ) : (
          <LobbyDirectory
            onEnterRoom={enterRoom}
            onOpenCatalog={() => setCatalogOpen(true)}
          />
        )}
      </main>

      <MasterPlayerCatalogModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        roomCode={activeRoomCode || undefined}
      />

      <BroadcastTicker />
    </div>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error in IPL Mega Auction:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-stadium-950 p-6 text-center text-white">
          <div className="max-w-md rounded-2xl border border-rose-500/40 bg-stadium-900 p-6 shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-wider text-rose-400">
              ⚠️ Arena Encountered an Issue
            </h2>
            <p className="mt-2 text-xs text-slate-300">
              {this.state.error?.message || 'A transient rendering error occurred.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '';
                  window.location.reload();
                }}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase text-stadium-950 hover:bg-amber-400"
              >
                Return to Lobby
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
