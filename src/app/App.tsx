import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Toaster, toast } from 'sonner';
import { 
  Zap, 
  Target, 
  Wind, 
  Headphones, 
  LayoutDashboard, 
  History as HistoryIcon, 
  User, 
  Moon, 
  Sun, 
 LogIn,
  LogOut,
  Cloud,
  CloudOff, 
  Fingerprint, 
  Volume2, 
  Menu,
  X,
  Compass,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Context
import { FocusTimerProvider, useFocusTimer } from './context/FocusTimerContext';

// Components
import { LandingPage } from './components/LandingPage/LandingPage';
import { TactileFocusDial } from './components/FocusChecker/TactileFocusDial';
import { EnvironmentHub } from './components/FocusChecker/EnvironmentHub';
import { FloatingFocusClock } from './components/FocusChecker/FloatingFocusClock';
import { QuickCheck, type BlockSuggestion } from './components/FocusChecker/QuickCheck';
import { StressReset } from './components/FocusChecker/StressReset';
import { Soundscapes } from './components/FocusChecker/Soundscapes';
import { SessionReviewModal } from './components/FocusChecker/SessionReviewModal';
import { LegalPage } from './components/LandingPage/LegalPage';
import { History } from './components/FocusChecker/History';
import { AuthModal, type AuthMode } from './components/Auth/AuthModal';
import { InstallAppButton } from './components/InstallAppButton';
import { supabase, cloudEnabled, profileFromUser, fetchHistory, upsertHistory, deleteAllHistory, mergeHistory } from './services/supabase';

import { 
  HistoryItem, 
  ReadinessCheck, 
  FocusSession, 
  StressResetSession, 
  STORAGE_KEYS, 
  UserProfile 
} from './types';
import { audioEngine } from './services/audioEngine';
import { computeStreak, todayStats, latestReadinessToday } from './services/stats';

// Recharts is heavy — only load it when Analytics is opened.
const Dashboard = lazy(() => import('./components/FocusChecker/Dashboard').then((m) => ({ default: m.Dashboard })));

type AppTab = 'dial' | 'check' | 'stress' | 'sound' | 'dashboard' | 'history';
type Route = { page: 'landing' } | { page: 'privacy' } | { page: 'terms' } | { page: 'app'; tab: AppTab };

const TAB_PATHS: Record<AppTab, string> = {
  dial: '/app',
  stress: '/app/breathe',
  check: '/app/readiness',
  sound: '/app/sounds',
  dashboard: '/app/analytics',
  history: '/app/journal',
};

function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/privacy') return { page: 'privacy' };
  if (path === '/terms') return { page: 'terms' };
  const tab = (Object.keys(TAB_PATHS) as AppTab[]).find((t) => TAB_PATHS[t] === path);
  if (tab) return { page: 'app', tab };
  if (path.startsWith('/app')) return { page: 'app', tab: 'dial' };
  return { page: 'landing' };
}

function routePath(r: Route) {
  if (r.page === 'app') return TAB_PATHS[r.tab];
  if (r.page === 'landing') return '/';
  return `/${r.page}`;
}

const DAILY_GOAL_KEY = 'focus-checker-daily-goal';
const WARM_LIGHT_KEY = 'focus-checker-warm-light';
const GOAL_OPTIONS = [60, 90, 120, 180, 240];

function readNumber(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

// LocalStorage helpers (wrapped: storage can be unavailable in private modes)
function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function loadDarkMode(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (v === null) return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    return v === 'true';
  } catch {
    return false;
  }
}

function loadAuthUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return null;
    const u = JSON.parse(raw) as UserProfile;
    // Cloud sessions are restored by Supabase; only guest profiles live here.
    return u && u.id === 'guest' ? u : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const latestCheck = useMemo(() => latestReadinessToday(history), [history]);

  const handleSessionComplete = (session: FocusSession) => {
    setHistory((prev) => [session, ...prev]);
    toast.success('Session saved to your journal');
  };

  return (
    <FocusTimerProvider onSessionSaved={handleSessionComplete} latestCheck={latestCheck}>
      <AppContent history={history} setHistory={setHistory} />
    </FocusTimerProvider>
  );
}

function AppContent({
  history,
  setHistory,
}: {
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}) {
  const timer = useFocusTimer();
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  const activeTab: AppTab | null = route.page === 'app' ? route.tab : null;
  const [darkMode, setDarkMode] = useState<boolean>(loadDarkMode);
  const [user, setUser] = useState<UserProfile | null>(loadAuthUser);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [syncState, setSyncState] = useState<'off' | 'syncing' | 'synced' | 'error'>('off');
  const syncedIds = useRef<Set<number> | null>(null);
  const isCloudUser = Boolean(cloudEnabled && user && user.id !== 'guest');

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Restore a signed-in session and follow auth changes (magic link, password reset, other tabs).
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(profileFromUser(data.session.user));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        openAuth('reset');
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        setUser(profileFromUser(session.user));
        try { localStorage.removeItem(STORAGE_KEYS.AUTH_USER); } catch { /* ignore */ }
      } else if (event === 'SIGNED_OUT') {
        setUser((u) => (u && u.id === 'guest' ? u : null));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // On sign-in: merge cloud + this device's history, upload anything only stored locally.
  useEffect(() => {
    if (!isCloudUser || !user) {
      syncedIds.current = null;
      setSyncState('off');
      return;
    }
    let cancelled = false;
    setSyncState('syncing');
    (async () => {
      try {
        const remote = await fetchHistory();
        if (cancelled) return;
        const remoteIds = new Set(remote.map((h) => h.id));
        let localOnly: HistoryItem[] = [];
        setHistory((local) => {
          localOnly = local.filter((h) => !remoteIds.has(h.id));
          return mergeHistory(remote, local);
        });
        await upsertHistory(user.id, localOnly);
        syncedIds.current = new Set([...remoteIds, ...localOnly.map((h) => h.id)]);
        if (!cancelled) setSyncState('synced');
      } catch {
        if (!cancelled) setSyncState('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloudUser, user?.id]);

  // Push new entries as they are logged.
  useEffect(() => {
    if (!isCloudUser || !user || !syncedIds.current) return;
    const fresh = history.filter((h) => !syncedIds.current!.has(h.id));
    if (!fresh.length) return;
    fresh.forEach((h) => syncedIds.current!.add(h.id));
    setSyncState('syncing');
    upsertHistory(user.id, fresh)
      .then(() => setSyncState('synced'))
      .catch(() => {
        fresh.forEach((h) => syncedIds.current!.delete(h.id));
        setSyncState('error');
      });
  }, [history, isCloudUser, user]);
  const [activeSoundscape, setActiveSoundscape] = useState<string>('none');
  const [warmLight, setWarmLight] = useState<boolean>(() => {
    try { return localStorage.getItem(WARM_LIGHT_KEY) === 'true'; } catch { return false; }
  });
  const [dailyGoal, setDailyGoal] = useState<number>(() => readNumber(DAILY_GOAL_KEY, 120));
  const [mobileDialView, setMobileDialView] = useState<'dial' | 'atmosphere'>('dial');

  const navigate = useCallback((r: Route) => {
    const path = routePath(r);
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);
  const setActiveTab = useCallback((tab: AppTab) => navigate({ page: 'app', tab }), [navigate]);
  const navigatePath = useCallback((path: string) => navigate(parseRoute(path)), [navigate]);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Per-page titles for SEO / browser history (the timer overrides while running).
  useEffect(() => {
    const titles: Record<string, string> = {
      landing: 'FocusChecker — Focus timer, breathing resets & attention insights',
      privacy: 'Privacy Policy — FocusChecker',
      terms: 'Terms of Use — FocusChecker',
    };
    if (route.page !== 'app') document.title = titles[route.page];
    else if (!document.title.includes('·') && !document.title.startsWith('Paused')) document.title = 'FocusChecker — Focus timer, breathing resets & attention insights';
  }, [route]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    writeStorage(STORAGE_KEYS.DARK_MODE, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => writeStorage(WARM_LIGHT_KEY, String(warmLight)), [warmLight]);
  useEffect(() => writeStorage(DAILY_GOAL_KEY, String(dailyGoal)), [dailyGoal]);

  const streakDays = useMemo(() => computeStreak(history), [history]);
  const today = useMemo(() => todayStats(history), [history]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const handleSignOut = async () => {
    try { localStorage.removeItem(STORAGE_KEYS.AUTH_USER); } catch { /* ignore */ }
    if (isCloudUser && supabase) {
      await supabase.auth.signOut();
      // Don't leave a signed-out person's history on a shared device.
      setHistory([]);
    }
    setUser(null);
    toast.info('Logged out successfully');
  };

  // Readiness → timer: the saved check sets up the suggested block (unless a block is already under way),
  // then returns the user to the dial — or to the breathing reset if they chose that.
  const handleQuickCheckComplete = (check: ReadinessCheck, suggestion: BlockSuggestion, goBreathe: boolean) => {
    setHistory((prev) => [check, ...prev]);
    if (!timer.hasStarted && !timer.isActive) {
      timer.setMode(suggestion.mode);
      if (suggestion.mode === 'deep') timer.setDuration(suggestion.minutes);
      toast.success(`Check-in saved. Next block set to ${suggestion.label}.`);
    } else {
      toast.success('Check-in saved.');
    }
    setActiveTab(goBreathe ? 'stress' : 'dial');
  };

  const handleStressResetComplete = (resetSession: StressResetSession) => {
    setHistory((prev) => [resetSession, ...prev]);
    setActiveTab('dial');
  };

  const handleClearHistory = async () => {
    setHistory([]);
    if (isCloudUser && user) {
      try {
        await deleteAllHistory(user.id);
        syncedIds.current = new Set();
      } catch {
        toast.error('Cleared on this device, but the cloud copy could not be deleted. Try again when online.');
        return;
      }
    }
    toast.success('Journal cleared');
  };

  const handleStopSoundscape = () => {
    audioEngine.stop();
    setActiveSoundscape('none');
  };

  const SOUND_NAMES: Record<string, string> = { gamma: '40Hz tone', alpha: '10Hz tone', pink: 'Pink noise', rain: 'Rain' };
  const handleToggleSoundscape = (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => {
    if (activeSoundscape === preset) {
      handleStopSoundscape();
    } else {
      audioEngine.playPreset(preset, 0.6);
      setActiveSoundscape(preset);
      toast.success(`Playing ${SOUND_NAMES[preset]}`);
    }
  };

  const cycleDailyGoal = () => {
    const i = GOAL_OPTIONS.indexOf(dailyGoal);
    const next = GOAL_OPTIONS[(i + 1) % GOAL_OPTIONS.length];
    setDailyGoal(next);
    toast.info(`Daily goal set to ${next} minutes`);
  };

  // Navigation Items
  const navItems = [
    { id: 'dial' as const, label: 'Focus', icon: Fingerprint },
    { id: 'stress' as const, label: 'Breathe', icon: Wind },
    { id: 'check' as const, label: 'Check-in', icon: Target },
    { id: 'sound' as const, label: 'Sounds', icon: Headphones },
    { id: 'dashboard' as const, label: 'Analytics', icon: LayoutDashboard },
    { id: 'history' as const, label: 'Journal', icon: HistoryIcon },
  ];

  return (
    <div className="min-h-screen clay-canvas font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      {/* Warm light: a gentle amber tint over the whole UI */}
      {warmLight && (
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none z-[9998]"
          style={{ background: 'rgba(255, 166, 64, 0.10)', mixBlendMode: 'multiply' }}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={setUser}
        defaultMode={authMode}
      />

      <SessionReviewModal />

      <FloatingFocusClock
        onOpenDial={() => setActiveTab('dial')}
        activeSoundscape={activeSoundscape}
        onStopSoundscape={handleStopSoundscape}
        onToggleSoundscape={handleToggleSoundscape}
        isDialTabActive={activeTab === 'dial'}
        enabled={route.page === 'app'}
      />

      {route.page === 'privacy' || route.page === 'terms' ? (
        <LegalPage kind={route.page} onBack={() => (window.history.length > 1 ? window.history.back() : navigate({ page: 'landing' }))} />
      ) : route.page === 'landing' ? (
        <LandingPage
          onEnterApp={() => setActiveTab('dial')}
          onOpenQuickCheck={() => setActiveTab('check')}
          onOpenStressReset={() => setActiveTab('stress')}
          onNavigate={navigatePath}
          onOpenAuth={openAuth}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
        />
      ) : (
        <div className="flex flex-col min-h-screen pb-44 lg:pb-3">
          {/* Top Header */}
          <header className="sticky top-0 z-40 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/60 dark:border-slate-800/60 px-4 md:px-8 py-1.5 sm:py-2 transition-all">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              
              {/* Brand and Landing shortcut */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate({ page: 'landing' })}
                  className="w-9 h-9 rounded-2xl clay-tile-cyan flex items-center justify-center shadow-md cursor-pointer"
                  title="FocusChecker home"
                  aria-label="FocusChecker home"
                >
                  <Zap size={18} className="text-white" />
                </button>
                <div>
                  <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Focus<span className="text-sky-500">Checker</span>
                  </h1>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Focus · Breathe · Learn
                  </span>
                </div>
              </div>

              {/* Desktop Tabs Header Navigation */}
              <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Side Header Controls */}
              <div className="flex items-center gap-2">
                
                {/* Active Soundscape indicator & 1-Click Stop Pill (Visible on PC & Mobile!) */}
                {activeSoundscape !== 'none' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold clay-tile-violet shadow-sm">
                    <Volume2 size={13} className="animate-pulse shrink-0" />
                    <span className="text-[11px] hidden sm:inline">{SOUND_NAMES[activeSoundscape] ?? activeSoundscape}</span>
                    <button
                      onClick={handleStopSoundscape}
                      className="px-1.5 py-0.5 rounded-md bg-white/20 hover:bg-white/40 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Stop Audio immediately"
                    >
                      <span>Stop</span>
                    </button>
                  </div>
                )}

                {/* Install as app (only shown when the browser allows it) */}
                <InstallAppButton />

                {/* Dark/Light mode toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
                  title="Toggle light / dark mode"
                  aria-label="Toggle light / dark mode"
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                {/* User profile / Login */}
                {user ? (
                  <div className="flex items-center gap-2">
                    {isCloudUser && (
                      <span
                        className={`hidden sm:flex w-8 h-8 rounded-xl items-center justify-center ${syncState === 'error' ? 'text-amber-500' : 'text-emerald-500'}`}
                        title={syncState === 'error' ? 'Sync paused — your data is safe on this device and will sync later' : syncState === 'syncing' ? 'Syncing…' : 'Synced to your account'}
                      >
                        {syncState === 'error' ? <CloudOff size={16} /> : <Cloud size={16} className={syncState === 'syncing' ? 'animate-pulse' : ''} />}
                      </span>
                    )}
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{user.name}</span>
                      <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1 justify-end">
                        <Flame size={12} className={streakDays > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-500 dark:text-slate-400'} />
                        <span>{streakDays}d Streak</span>
                      </span>
                    </div>
                    {user.id === 'guest' && cloudEnabled && (
                      <button onClick={() => openAuth('register')} className="hidden md:inline-flex px-2.5 py-1.5 rounded-xl clay-button text-[11px] font-semibold text-sky-600">
                        Save to account
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-9 h-9 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-red-500"
                      title="Log Out"
                      aria-label="Log out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openAuth('login')}
                    className="px-3.5 py-1.5 rounded-xl clay-tile-cyan text-xs font-semibold flex items-center gap-1.5 shadow-md"
                  >
                    <LogIn size={14} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main App Content View */}
          <main className="max-w-6xl mx-auto w-full px-4 md:px-8 py-2 md:py-3 lg:py-2.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {/* DIAL TAB: Complete Dual-Screen Desktop Experience & Responsive Phone Layout */}
                {activeTab === 'dial' && (
                  <div>
                    {/* Mobile Screen Switcher (Dial vs Atmosphere Hub) */}
                    <div className="lg:hidden flex items-center justify-center mb-6">
                      <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1">
                        <button
                          onClick={() => setMobileDialView('dial')}
                          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            mobileDialView === 'dial'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Focus Dial
                        </button>
                        <button
                          onClick={() => setMobileDialView('atmosphere')}
                          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            mobileDialView === 'atmosphere'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Today
                        </button>
                      </div>
                    </div>

                    {/* Dual-Column Desktop Grid matching the 2 screens in reference design! */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
                      
                      {/* Left Column: Tactile Focus Dial */}
                      <div className={`lg:col-span-6 xl:col-span-6 ${mobileDialView === 'atmosphere' ? 'hidden lg:block' : 'block'}`}>
                        <div className="max-w-md mx-auto">
                          <TactileFocusDial
                            onOpenStressReset={() => setActiveTab('stress')}
                            activeSoundscape={activeSoundscape}
                            onToggleSoundscape={handleToggleSoundscape}
                            readinessScore={today.readiness?.score ?? null}
                            sessionsToday={today.sessions}
                            onOpenReadiness={() => setActiveTab('check')}
                          />
                        </div>
                      </div>

                      {/* Right Column: Environment Hub (Weather, Circadian Lighting, 40Hz Waves) */}
                      <div className={`lg:col-span-6 xl:col-span-6 ${mobileDialView === 'dial' ? 'hidden lg:block' : 'block'}`}>
                        <div className="max-w-md mx-auto">
                          <EnvironmentHub
                            userName={user?.name || ''}
                            onOpenStressReset={() => setActiveTab('stress')}
                            activeSoundscape={activeSoundscape}
                            onToggleSoundscape={handleToggleSoundscape}
                            onStopSoundscape={handleStopSoundscape}
                            warmLight={warmLight}
                            onToggleWarmLight={() => setWarmLight((w) => !w)}
                            today={today}
                            streakDays={streakDays}
                            dailyGoalMinutes={dailyGoal}
                            onCycleDailyGoal={cycleDailyGoal}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'stress' && (
                  <StressReset
                    onComplete={handleStressResetComplete}
                    onClose={() => setActiveTab('dial')}
                  />
                )}

                {activeTab === 'check' && (
                  <QuickCheck
                    onComplete={handleQuickCheckComplete}
                    onOpenStressReset={() => setActiveTab('stress')}
                  />
                )}

                {activeTab === 'sound' && (
                  <Soundscapes
                    activeSoundscape={activeSoundscape}
                    onSelectPreset={(preset) => {
                      if (preset === 'none') {
                        audioEngine.stop();
                        setActiveSoundscape('none');
                      } else {
                        audioEngine.playPreset(preset, 0.6);
                        setActiveSoundscape(preset);
                      }
                    }}
                  />
                )}

                {activeTab === 'dashboard' && (
                  <Suspense fallback={<div className="clay-card p-10 text-center text-xs text-slate-500 dark:text-slate-400">Loading analytics…</div>}>
                    <Dashboard
                      history={history}
                      onOpenQuickCheck={() => setActiveTab('check')}
                      onOpenStressReset={() => setActiveTab('stress')}
                      onOpenDial={() => setActiveTab('dial')}
                    />
                  </Suspense>
                )}

                {activeTab === 'history' && (
                  <History
                    history={history}
                    onClearHistory={handleClearHistory}
                    onStartFocus={() => setActiveTab('dial')}
                    onCheckIn={() => setActiveTab('check')}
                    onBreathe={() => setActiveTab('stress')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Floating Clay Dock */}
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
            <nav className="clay-card p-1.5 grid grid-cols-6 gap-0.5 shadow-2xl backdrop-blur-2xl" aria-label="Main">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 rounded-2xl transition-colors ${
                      isActive
                        ? 'clay-tile-cyan'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-[11px] leading-none font-semibold whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
