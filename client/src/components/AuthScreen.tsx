import React, { useState } from 'react';
import {
  Gavel,
  Mic,
  MessageSquare,
  Trophy,
  Users,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FRANCHISES } from '../types';
import { FranchiseLogo } from '../utils/franchiseAssets';

export const AuthScreen: React.FC = () => {
  const { login, register, guestJoin } = useAuth();
  const [mode, setMode] = useState<'guest' | 'login' | 'register'>('guest');
  const [guestName, setGuestName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await guestJoin(guestName.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        username,
        email,
        password,
        displayName: displayName.trim() || username,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-14">
      <div className="grid items-center gap-10 lg:grid-cols-12">
        {/* Left Hero Pitch */}
        <div className="space-y-6 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-transparent px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-300 shadow-md">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>STAR SPORTS 1 HD • TATA IPL 2026 PLAYER AUCTION ARENA</span>
          </div>

          <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            BUILD THE ULTIMATE IPL DYNASTY WITH{' '}
            <span className="gold-gradient-text drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
              ₹120 CRORE PURSE
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-300">
            Take command of an official IPL franchise alongside <strong className="text-white">10 live franchise managers</strong>. 
            Raise your paddle for <strong className="text-amber-300">588 registered cricket superstars</strong> with real photos and official team crests, 
            use strategic <strong className="text-sky-300">RTM Challenge Cards</strong>, and unleash our <strong className="text-emerald-300">7-Factor AI Potential Engine</strong> to simulate the full IPL season & playoffs.
          </p>

          {/* Feature Grid - Sports Broadcast Tiles */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="sports-card p-4">
              <Users className="mb-2.5 h-6 w-6 text-amber-400" />
              <div className="font-display text-sm font-black uppercase text-white">10 Franchises</div>
              <div className="text-xs text-slate-400">Live Humans + AI GMs</div>
            </div>
            <div className="sports-card p-4">
              <Gavel className="mb-2.5 h-6 w-6 text-sky-400" />
              <div className="font-display text-sm font-black uppercase text-white">588 Real Stars</div>
              <div className="text-xs text-slate-400">Real Photos & Crests</div>
            </div>
            <div className="sports-card p-4">
              <Mic className="mb-2.5 h-6 w-6 text-emerald-400" />
              <div className="font-display text-sm font-black uppercase text-white">Voice & Chat</div>
              <div className="text-xs text-slate-400">LiveKit WebRTC Call</div>
            </div>
            <div className="sports-card p-4">
              <Trophy className="mb-2.5 h-6 w-6 text-purple-400" />
              <div className="font-display text-sm font-black uppercase text-white">AI Season Sim</div>
              <div className="text-xs text-slate-400">Playing XI & Playoffs</div>
            </div>
          </div>

          {/* 10 Official Franchise Crests Strip */}
          <div className="pt-2">
            <div className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
              Official 10 IPL Franchises Ready for Draft
            </div>
            <div className="flex flex-wrap gap-2.5">
              {FRANCHISES.map((f) => (
                <div
                  key={f.code}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-stadium-950/80 px-3 py-1.5 shadow-sm transition hover:border-amber-400/50 hover:bg-stadium-900"
                >
                  <FranchiseLogo teamCode={f.code} size="xs" />
                  <span className="font-display text-xs font-black text-white">{f.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#0f172a]/95 to-[#050914] p-6 shadow-2xl sm:p-8">
            {/* Mode Switcher */}
            <div className="mb-5 grid grid-cols-3 rounded-xl bg-stadium-950 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('guest');
                  setError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  mode === 'guest'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stadium-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Instant Play
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stadium-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stadium-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300">
                {error}
              </div>
            )}

            {mode === 'guest' && (
              <form onSubmit={handleGuest} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Your Franchise Owner Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Akash Ambani / Captain Cool"
                    maxLength={28}
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Jump straight into a live 10-player auction room for free with persistent JWT session.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-3 text-sm font-extrabold text-stadium-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  <span>{submitting ? 'Entering Arena...' : 'Enter Auction Arena Now'}</span>
                </button>
              </form>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="username or you@example.com"
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-extrabold text-stadium-950 shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{submitting ? 'Signing In...' : 'Sign In to Account'}</span>
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="virat_18"
                      className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="King Kohli"
                      className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@iplfranchise.com"
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Password (6+ chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/15 bg-stadium-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-extrabold text-stadium-950 shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{submitting ? 'Creating Account...' : 'Create Owner Account'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
