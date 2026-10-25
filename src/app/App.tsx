import React, { useState, useEffect } from 'react';
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
  Fingerprint, 
  Volume2, 
  Menu,
  X,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Context
import { FocusTimerProvider, useFocusTimer } from './context/FocusTimerContext';

// Components
import { LandingPage } from './components/LandingPage/LandingPage';
import { TactileFocusDial } from './components/FocusChecker/TactileFocusDial';
import { EnvironmentHub } from './components/FocusChecker/EnvironmentHub';
import { FloatingFocusClock } from './components/FocusChecker/FloatingFocusClock';
import { QuickCheck } from './components/FocusChecker/QuickCheck';
import { StressReset } from './components/FocusChecker/StressReset';
import { Soundscapes } from './components/FocusChecker/Soundscapes';
import { Dashboard } from './components/FocusChecker/Dashboard';
import { History } from './components/FocusChecker/History';
import { AuthModal } from './components/Auth/AuthModal';

import { 
  HistoryItem, 
  ReadinessCheck, 
  FocusSession, 
  StressResetSession, 
  STORAGE_KEYS, 
  UserProfile 
} from './types';
import { audioEngine } from './services/audioEngine';

// LocalStorage helpers
function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(items));
}

function loadDarkMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
  } catch {
    return false;
  }
}

function saveDarkMode(v: boolean): void {
  localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(v));
}

function loadAuthUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);

  const handleSessionComplete = (session: FocusSession) => {
    setHistory((prev) => [session, ...prev]);
    toast.success("Focus block recorded in your neural journal");
  };

  return (
    <FocusTimerProvider onSessionSaved={handleSessionComplete}>
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
  const [activeTab, setActiveTab] = useState<'landing' | 'dial' | 'check' | 'stress' | 'sound' | 'dashboard' | 'history'>('dial');
  const [darkMode, setDarkMode] = useState<boolean>(loadDarkMode);
  const [user, setUser] = useState<UserProfile | null>(loadAuthUser);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'register'>('login');
  const [activeSoundscape, setActiveSoundscape] = useState<string>('none');

  // Mobile sub-tab toggle on Dial view (Phone vs Atmosphere)
  const [mobileDialView, setMobileDialView] = useState<'dial' | 'atmosphere'>('dial');

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveDarkMode(darkMode);
  }, [darkMode]);

  // Persist history
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthDefaultMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    setUser(null);
    toast.info("Logged out successfully");
  };

  const handleQuickCheckComplete = (check: ReadinessCheck) => {
    setHistory((prev) => [check, ...prev]);
    if (check.score >= 70) {
      setActiveTab('dial');
    } else {
      setActiveTab('stress');
    }
  };

  const handleStressResetComplete = (resetSession: StressResetSession) => {
    setHistory((prev) => [resetSession, ...prev]);
    setActiveTab('dial');
  };

  const handleClearHistory = () => {
    setHistory([]);
    toast.success("Activity journal cleared");
  };

  const handleToggleSoundscape = (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => {
    if (activeSoundscape === preset) {
      audioEngine.stop();
      setActiveSoundscape('none');
      toast.info("Soundscape stopped");
    } else {
      audioEngine.playPreset(preset, 0.6);
      setActiveSoundscape(preset);
      toast.success(`Playing ${preset} focus waves`);
    }
  };

  // Navigation Items
  const navItems = [
    { id: 'dial' as const, label: 'Focus Dial', icon: Fingerprint },
    { id: 'stress' as const, label: 'De-Stress', icon: Wind },
    { id: 'check' as const, label: 'Readiness', icon: Target },
    { id: 'sound' as const, label: 'Soundscapes', icon: Headphones },
    { id: 'dashboard' as const, label: 'Analytics', icon: LayoutDashboard },
    { id: 'history' as const, label: 'Journal', icon: HistoryIcon },
  ];

  return (
    <div className="min-h-screen clay-canvas font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Toaster position="top-center" richColors />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        defaultMode={authDefaultMode}
      />

      {/* Floating Clock Widget (Persistent across all tabs, fully draggable on all devices!) */}
      <FloatingFocusClock
        onOpenDial={() => setActiveTab('dial')}
        activeSoundscape={activeSoundscape}
        isDialTabActive={activeTab === 'dial'}
      />

      {/* Landing Page */}
      {activeTab === 'landing' ? (
        <LandingPage
          onEnterApp={() => setActiveTab('dial')}
          onOpenAuth={handleOpenAuth}
          onOpenQuickCheck={() => setActiveTab('check')}
          onOpenStressReset={() => setActiveTab('stress')}
        />
      ) : (
        <div className="flex flex-col min-h-screen pb-20 md:pb-6">
          
          {/* Top Header */}
          <header className="sticky top-0 z-40 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/60 dark:border-slate-800/60 px-4 md:px-8 py-2.5 transition-all">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              
              {/* Brand and Landing shortcut */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('landing')}
                  className="w-9 h-9 rounded-2xl clay-tile-cyan flex items-center justify-center shadow-md cursor-pointer"
                  title="View Landing Page"
                >
                  <Zap size={18} className="text-white" />
                </button>
                <div>
                  <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    Focus<span className="text-sky-500">Checker</span>
                  </h1>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Tactile Attention Suite
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Side Header Controls */}
              <div className="flex items-center gap-2.5">
                
                {/* Active Soundscape indicator pill */}
                {activeSoundscape !== 'none' && (
                  <button
                    onClick={() => setActiveTab('sound')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold clay-tile-violet animate-pulse shadow-sm"
                  >
                    <Volume2 size={13} />
                    <span className="capitalize">{activeSoundscape}</span>
                  </button>
                )}

                {/* Dark/Light mode toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="w-9 h-9 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
                  title="Toggle Light / Dark Mode"
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                {/* User profile / Login */}
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-semibold">
                        ⚡ {user.streakDays}d Streak
                      </span>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-9 h-9 rounded-xl clay-button flex items-center justify-center text-slate-500 hover:text-red-500"
                      title="Log Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenAuth('login')}
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
          <main className="max-w-6xl mx-auto w-full px-4 md:px-8 py-4 md:py-6">
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
                              : 'text-slate-500'
                          }`}
                        >
                          Focus Dial
                        </button>
                        <button
                          onClick={() => setMobileDialView('atmosphere')}
                          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            mobileDialView === 'atmosphere'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-500'
                          }`}
                        >
                          Environment Hub
                        </button>
                      </div>
                    </div>

                    {/* Dual-Column Desktop Grid matching the 2 screens in reference design! */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left Column: Tactile Focus Dial */}
                      <div className={`lg:col-span-6 xl:col-span-6 ${mobileDialView === 'atmosphere' ? 'hidden lg:block' : 'block'}`}>
                        <div className="max-w-md mx-auto">
                          <TactileFocusDial
                            onOpenStressReset={() => setActiveTab('stress')}
                            activeSoundscape={activeSoundscape}
                            onToggleSoundscape={handleToggleSoundscape}
                          />
                        </div>
                      </div>

                      {/* Right Column: Environment Hub (Weather, Circadian Lighting, 40Hz Waves) */}
                      <div className={`lg:col-span-6 xl:col-span-6 ${mobileDialView === 'dial' ? 'hidden lg:block' : 'block'}`}>
                        <div className="max-w-md mx-auto">
                          <EnvironmentHub
                            userName={user?.name || 'Guest High-Performer'}
                            onOpenStressReset={() => setActiveTab('stress')}
                            activeSoundscape={activeSoundscape}
                            onToggleSoundscape={handleToggleSoundscape}
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
                  <Dashboard
                    history={history}
                    onOpenQuickCheck={() => setActiveTab('check')}
                    onOpenStressReset={() => setActiveTab('stress')}
                  />
                )}

                {activeTab === 'history' && (
                  <History
                    history={history}
                    onClearHistory={handleClearHistory}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Floating Clay Dock */}
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
            <div className="clay-card p-2 flex items-center justify-around shadow-2xl backdrop-blur-2xl">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                      isActive
                        ? 'clay-tile-cyan scale-105 px-3'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-[10px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
