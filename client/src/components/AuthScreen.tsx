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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="grid items-center gap-8 lg:grid-cols-12">
        {/* Left Hero Pitch */}
        <div className="space-y-6 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Mega Auction Rules • 100% Free To Play</span>
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Build the Ultimate IPL Dynasty with{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              ₹120 Crore Purse
            </span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Join up to <strong className="text-white">10 live players</strong> in a real-time
            multiplayer auction room. Claim your favourite IPL franchise, raise your paddle on{' '}
            <strong className="text-amber-300">588 registered Capped, Uncapped & Overseas</strong>{' '}
            cricket stars with live voice & chat, and unlock instant{' '}
            <strong className="text-emerald-300">AI Post-Auction Team Rankings (#1–#10)</strong>.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-stadium-900/80 p-3.5">
              <Users className="mb-2 h-5 w-5 text-amber-400" />
              <div className="text-sm font-bold text-white">10 Franchises</div>
              <div className="text-xs text-slate-400">Live Humans + Smart AI GMs</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-stadium-900/80 p-3.5">
              <Gavel className="mb-2 h-5 w-5 text-sky-400" />
              <div className="text-sm font-bold text-white">588 IPL Stars</div>
              <div className="text-xs text-slate-400">Capped, Uncapped & Overseas</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-stadium-900/80 p-3.5">
              <Mic className="mb-2 h-5 w-5 text-emerald-400" />
              <div className="text-sm font-bold text-white">Voice & Chat</div>
              <div className="text-xs text-slate-400">LiveKit SFU + WebRTC Call</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-stadium-900/80 p-3.5">
              <Trophy className="mb-2 h-5 w-5 text-purple-400" />
              <div className="text-sm font-bold text-white">AI Rank #1–#10</div>
              <div className="text-xs text-slate-400">Optimal XI & SWOT Verdict</div>
            </div>
          </div>

          {/* 10 Franchise Badges Strip */}
          <div className="pt-2">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              All 10 Franchises Available
            </div>
            <div className="flex flex-wrap gap-2">
              {FRANCHISES.map((f) => (
                <span
                  key={f.code}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-stadium-900 px-2.5 py-1 text-xs font-bold text-white"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: f.primaryColor }}
                  />
                  {f.code}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-5 shadow-2xl shadow-black/50 sm:p-6">
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
