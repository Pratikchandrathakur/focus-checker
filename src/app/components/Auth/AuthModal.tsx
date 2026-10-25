import React, { useState } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Sparkles, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { UserProfile, STORAGE_KEYS } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in email and password");
      return;
    }

    if (mode === 'register' && !name) {
      toast.error("Please enter your name");
      return;
    }

    // Save user profile
    const user: UserProfile = {
      id: `usr_${Date.now()}`,
      name: mode === 'register' ? name : (name || email.split('@')[0]),
      email,
      avatarSeed: name || email,
      joinedAt: new Date().toISOString(),
      streakDays: 4,
      lastActiveDate: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    toast.success(mode === 'register' ? `Welcome to FocusChecker, ${user.name}!` : `Welcome back, ${user.name}!`);
    onAuthSuccess(user);
    onClose();
  };

  const handleGuestDemo = () => {
    const guestUser: UserProfile = {
      id: 'usr_guest',
      name: 'Guest High-Performer',
      email: 'guest@focuschecker.io',
      avatarSeed: 'guest',
      joinedAt: new Date().toISOString(),
      streakDays: 3,
      lastActiveDate: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(guestUser));
    toast.success("Guest workspace loaded — feel free to explore!");
    onAuthSuccess(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="clay-card max-w-md w-full p-6 md:p-8 relative shadow-2xl space-y-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl clay-button text-slate-400 hover:text-slate-700 dark:hover:text-white"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl clay-tile-cyan flex items-center justify-center mx-auto mb-2 shadow-md">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' ? 'Sign In to FocusChecker' : 'Create Your Focus Account'}
          </h3>
          <p className="text-xs text-slate-500">
            {mode === 'login'
              ? 'Access your saved neural attention history and sound preferences'
              : 'Sync your daily focus sessions across devices'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl clay-card-subtle text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl clay-card-subtle text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl clay-card-subtle text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl clay-tile-cyan font-bold text-xs flex items-center justify-center gap-2 shadow-lg mt-2"
          >
            {mode === 'login' ? (
              <>
                <LogIn size={16} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={16} /> Create Account
              </>
            )}
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase font-semibold absolute">
            Or Demo Instantly
          </span>
        </div>

        <button
          type="button"
          onClick={handleGuestDemo}
          className="w-full py-3 rounded-2xl clay-button text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
        >
          <Sparkles size={16} className="text-amber-500" />
          Continue with Guest Access
        </button>
      </motion.div>
    </div>
  );
}
