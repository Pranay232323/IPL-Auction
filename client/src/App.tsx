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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;
