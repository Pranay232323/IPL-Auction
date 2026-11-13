import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(token: string | null): {
  socket: Socket | null;
  connected: boolean;
} {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setConnected(false);
      return;
    }

    // Relative connection ('/') works seamlessly with Vite proxy, preview hosts, and production single-port servers
    const s = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    setSocket(s);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.disconnect();
    };
  }, [token]);

  return { socket, connected };
}
