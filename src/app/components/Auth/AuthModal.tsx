import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Sparkles, X, ShieldCheck, Send, KeyRound, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { UserProfile, STORAGE_KEYS } from '../../types';
import { supabase, cloudEnabled, profileFromUser, redirectUrl } from '../../services/supabase';

export type AuthMode = 'login' | 'register' | 'magic' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  defaultMode?: AuthMode;
}

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128; // bcrypt-style limits; also stops absurd payloads
// Slows scripted guessing from this tab. The real rate limit is Supabase's, server side.
const MAX_FAILS = 5;
const LOCK_MS = 30_000;

function friendlyError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Email or password is incorrect.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link.';
  if (m.includes('already registered') || m.includes('user already exists')) return 'An account with this email already exists. Try signing in.';
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit')) {
    return 'Email rate limit exceeded on Supabase. Disable "Confirm email" in Supabase Auth settings for instant sign up without email verification.';
  }
  if (m.includes('password')) return msg;
  return msg || 'Authentication error. Please try again.';
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setSentTo(null);
      setPassword('');
    }
  }, [isOpen, defaultMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fails = useRef(0);
  const lockedUntil = useRef(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockedUntil.current) {
      toast.error(`Too many attempts. Try again in ${Math.ceil((lockedUntil.current - Date.now()) / 1000)} seconds.`);
      return;
    }
    if (!supabase) {
      toast.error('Accounts are not set up on this server yet. Use guest access for now.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if ((mode === 'register' || mode === 'login' || mode === 'reset') && password.length < (mode === 'login' ? 1 : MIN_PASSWORD)) {
      toast.error(mode === 'login' ? 'Please enter your password' : `Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (password.length > MAX_PASSWORD) {
      toast.error(`Password must be at most ${MAX_PASSWORD} characters`);
      return;
    }
    if (mode === 'register' && !name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        fails.current = 0;
        const u = profileFromUser(data.user);
        toast.success(`Welcome back, ${u.name}!`);
        onAuthSuccess(u);
        onClose();
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: name.trim().slice(0, 40) }, emailRedirectTo: redirectUrl() },
        });
        if (error) throw error;
        if (data.session && data.user) {
          const u = profileFromUser(data.user);
          toast.success(`Welcome to FocusChecker, ${u.name}!`);
          onAuthSuccess(u);
          onClose();
        } else {
          setSentTo(cleanEmail);
        }
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
        });
        if (error) throw error;
        setSentTo(cleanEmail);
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: redirectUrl() });
        if (error) throw error;
        setSentTo(cleanEmail);
      } else if (mode === 'reset') {
        const { data, error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('Password updated');
        if (data.user) onAuthSuccess(profileFromUser(data.user));
        onClose();
      }
    } catch (err) {
      if (mode === 'login' && ++fails.current >= MAX_FAILS) { lockedUntil.current = Date.now() + LOCK_MS; fails.current = 0; }
      toast.error(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleGuestDemo = () => {
    const guestUser: UserProfile = {
      id: 'guest',
      name: 'Guest',
      email: '',
      avatarSeed: 'guest',
      joinedAt: new Date().toISOString(),
      streakDays: 0,
      lastActiveDate: new Date().toISOString(),
    };
    try { localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(guestUser)); } catch { /* ignore */ }
    toast.success('Guest workspace loaded — your data stays on this device');
    onAuthSuccess(guestUser);
    onClose();
  };

  const titles: Record<AuthMode, [string, string]> = {
    login: ['Sign In to FocusChecker', 'Access your focus history on any device'],
    register: ['Create Your Focus Account', 'Sync your daily focus sessions across devices'],
    magic: ['Sign in with a link', "We'll email you a one-time sign-in link — no password needed"],
    forgot: ['Reset your password', "We'll email you a link to choose a new password"],
    reset: ['Choose a new password', `At least ${MIN_PASSWORD} characters`],
  };

  const inputCls =
    'w-full pl-10 pr-4 py-2.5 rounded-xl clay-card-subtle text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-md z-[10000] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="clay-card max-w-md w-full p-6 md:p-8 relative shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl clay-button text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl clay-tile-cyan flex items-center justify-center mx-auto mb-2 shadow-md">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h3 id="auth-title" className="text-xl font-bold text-slate-900 dark:text-white">{titles[mode][0]}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">{titles[mode][1]}</p>
        </div>

        {sentTo ? (
          <div className="space-y-4 text-center">
            <div className="clay-card-subtle p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <Mail size={20} className="mx-auto mb-2 text-sky-500" />
              We sent an email to <span className="font-bold text-slate-900 dark:text-white break-all">{sentTo}</span>.
              Open it on this device and tap the link to continue. Check spam if it doesn't arrive within a minute.
            </div>
            <button onClick={() => { setSentTo(null); setMode('login'); }} className="text-xs font-semibold text-sky-600 hover:underline">
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {(mode === 'login' || mode === 'register') && (
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      mode === m
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {!cloudEnabled && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3">
                Accounts aren't connected on this server yet (Supabase keys missing). Guest access works fully.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3 text-slate-500 dark:text-slate-400" />
                    <input id="auth-name" type="text" autoComplete="name" placeholder="e.g. Alex Morgan" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputCls} />
                  </div>
                </div>
              )}

              {mode !== 'reset' && (
                <div>
                  <label htmlFor="auth-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-500 dark:text-slate-400" />
                    <input id="auth-email" type="email" autoComplete="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {mode === 'reset' ? 'New password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('forgot')} className="text-[11px] font-semibold text-sky-600 hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-500 dark:text-slate-400" />
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-2xl clay-tile-cyan font-bold text-xs flex items-center justify-center gap-2 shadow-lg mt-2 disabled:opacity-70"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> :
                  mode === 'login' ? <LogIn size={16} /> :
                  mode === 'register' ? <UserPlus size={16} /> :
                  mode === 'reset' ? <KeyRound size={16} /> : <Send size={16} />}
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'reset' ? 'Save new password' : mode === 'magic' ? 'Email me a sign-in link' : 'Send reset link'}
              </button>
            </form>

            {mode === 'login' || mode === 'register' ? (
              <button type="button" onClick={() => setMode('magic')} className="w-full text-xs font-semibold text-sky-600 hover:underline -mt-2">
                Email me a sign-in link instead
              </button>
            ) : mode !== 'reset' ? (
              <button type="button" onClick={() => setMode('login')} className="w-full text-xs font-semibold text-sky-600 hover:underline -mt-2">
                Back to sign in with password
              </button>
            ) : null}

            {mode !== 'reset' && (
              <>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold absolute">Or Demo Instantly</span>
                </div>
                <button
                  type="button"
                  onClick={handleGuestDemo}
                  className="w-full py-3 rounded-2xl clay-button text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} className="text-amber-500" />
                  Continue with Guest Access
                </button>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">Guest data stays in this browser only.</p>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
