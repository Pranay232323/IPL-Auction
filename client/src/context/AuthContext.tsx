import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../api/http';
import { PublicUser } from '../types';

interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  guestJoin: (displayName?: string, tabOnly?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const existing = getStoredToken();
    if (!existing) {
      setLoading(false);
      return;
    }

    apiRequest<{ user: PublicUser }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        setToken(existing);
      })
      .catch(() => {
        clearStoredToken();
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await apiRequest<{ user: PublicUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredToken(res.token, false);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const res = await apiRequest<{ user: PublicUser; token: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      setStoredToken(res.token, false);
      setToken(res.token);
      setUser(res.user);
    },
    []
  );

  const guestJoin = useCallback(async (displayName?: string, tabOnly = false) => {
    const res = await apiRequest<{ user: PublicUser; token: string }>('/api/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
    setStoredToken(res.token, tabOnly);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, guestJoin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
