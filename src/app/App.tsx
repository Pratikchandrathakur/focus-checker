import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Target, ClipboardList, LayoutDashboard, History as HistoryIcon, User, Settings, Moon, Sun, Search, Menu, LogOut, HelpCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

import { QuickCheck } from './components/FocusChecker/QuickCheck';
import { LogSession } from './components/FocusChecker/LogSession';
import { Dashboard } from './components/FocusChecker/Dashboard';
import { History } from './components/FocusChecker/History';

import { HistoryItem, ReadinessCheck, FocusSession, STORAGE_KEYS, UserPrefs } from './types';

// UI components
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import { Slider } from './components/ui/slider';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from './components/ui/command';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from './components/ui/alert-dialog';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './components/ui/hover-card';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from './components/ui/breadcrumb';

// —— localStorage helpers ——
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

const DEFAULT_PREFS: UserPrefs = {
  defaultPlannedDuration: 45,
  breakReminderEnabled: true,
  breakIntervalMinutes: 25,
  name: '',
};

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFS);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: UserPrefs): void {
  localStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(p));
}

export default function App() {
  const [activeTab, setActiveTab] = useState('check');
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [darkMode, setDarkMode] = useState(loadDarkMode);
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Persist history
  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveDarkMode(darkMode); }, [darkMode]);
  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'check', label: 'Quick Check', icon: Target },
    { id: 'log', label: 'Log Session', icon: ClipboardList },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'History', icon: HistoryIcon },
  ];

  const sessions = history.filter(h => h.type === 'Session');
  const avgScore = history.length > 0
    ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length)
    : 0;

  const handleQuickCheckComplete = (check: ReadinessCheck) => {
    setHistory(prev => [check, ...prev]);
    // If score is high, suggest starting a session
    if (check.score >= 70) {
      setActiveTab('log');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleSessionComplete = (session: FocusSession) => {
    setHistory(prev => [session, ...prev]);
    setActiveTab('dashboard');
  };

  const handleClearHistory = () => {
    setHistory([]);
    toast.success('History cleared');
  };

  const toggleDarkMode = () => setDarkMode(d => !d);

  const displayName = prefs.name || 'Guest User';

  return (
    <div className={clsx("min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white transition-colors", darkMode && 'dark')}>
      <Toaster position="top-center" richColors />

      {/* Command Palette */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Command Palette</DialogTitle>
            <DialogDescription>Search and navigate</DialogDescription>
          </DialogHeader>
          <Command className="rounded-lg border-none">
            <CommandInput placeholder="Search pages, actions..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {navItems.map(item => (
                  <CommandItem key={item.id} onSelect={() => { setActiveTab(item.id); setCommandOpen(false); }}>
                    <item.icon className="mr-2 size-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => { toggleDarkMode(); setCommandOpen(false); }}>
                  {darkMode ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
                  Toggle Theme
                </CommandItem>
                <CommandItem onSelect={() => { setSettingsOpen(true); setCommandOpen(false); }}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Customize your focus experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-sm font-medium">Your Name</Label>
              <Input
                value={prefs.name}
                onChange={(e) => setPrefs(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter your name"
                className="mt-1"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-slate-500">Toggle dark theme</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Break Reminders</Label>
                <p className="text-sm text-slate-500">Get notified to take breaks</p>
              </div>
              <Switch
                checked={prefs.breakReminderEnabled}
                onCheckedChange={(v) => setPrefs(p => ({ ...p, breakReminderEnabled: v }))}
              />
            </div>
            {prefs.breakReminderEnabled && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Break Interval</Label>
                  <span className="text-sm font-medium text-indigo-600">{prefs.breakIntervalMinutes}m</span>
                </div>
                <Slider
                  value={[prefs.breakIntervalMinutes]}
                  onValueChange={(v) => setPrefs(p => ({ ...p, breakIntervalMinutes: v[0] }))}
                  min={15}
                  max={90}
                  step={5}
                />
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>15m</span>
                  <span>45m</span>
                  <span>90m</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-10">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Target className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Focus Checker</h1>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start text-slate-400 mb-4 border-slate-200 dark:border-slate-700"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="mr-2 size-4" />
              Search...
              <Badge variant="secondary" className="ml-auto text-[10px]">⌘K</Badge>
            </Button>

            <Separator className="mb-4" />

            <nav className="space-y-2">
              {navItems.map(item => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                        activeTab === item.id
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </div>

          {/* Avg score card */}
          <div className="mt-auto px-6 pb-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Focus</span>
                <Badge className={clsx("text-xs border-0",
                  avgScore >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {avgScore}%
                </Badge>
              </div>
              <Progress value={avgScore} className="h-2" />
              <p className="text-[11px] text-slate-400 mt-2">{history.length} entries • {sessions.length} sessions</p>
            </div>
          </div>

          <Separator />

          {/* User section */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl p-2 transition-colors">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Avatar className="size-10 bg-slate-200 dark:bg-slate-700">
                        <AvatarFallback className="text-slate-500 text-sm">
                          {displayName.charAt(0).toUpperCase() || <User size={20} />}
                        </AvatarFallback>
                      </Avatar>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" className="w-56">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-slate-400">{history.length} entries logged</p>
                    </HoverCardContent>
                  </HoverCard>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-slate-400">Focus Tracker</p>
                  </div>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleDarkMode}>
                  {darkMode ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 size-4" /> Help
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50 px-4 py-2 flex justify-between items-center">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                activeTab === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Mobile Header */}
          <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 z-20 flex justify-between items-center md:hidden">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-300">
                    <Menu size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-white dark:bg-slate-800">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                        <Target className="text-white" size={14} />
                      </div>
                      Focus Checker
                    </SheetTitle>
                    <SheetDescription>Your attention companion</SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="flex-1 mt-4">
                    <nav className="space-y-1 px-2">
                      {navItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                            activeTab === item.id
                              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          )}
                        >
                          <item.icon size={18} />
                          {item.label}
                        </button>
                      ))}
                    </nav>
                    <Separator className="my-4" />
                    <div className="px-4 flex items-center justify-between">
                      <Label className="text-sm">Dark Mode</Label>
                      <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                <Target className="text-white" size={14} />
              </div>
              <h1 className="font-bold">Focus Checker</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCommandOpen(true)} className="text-slate-500">
                <Search size={18} />
              </Button>
              <Avatar className="size-8 bg-slate-200 dark:bg-slate-700">
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <div className="p-6 md:p-10 pb-24 md:pb-10 max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <Breadcrumb className="mb-4 hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); setActiveTab('check'); }}>Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{navItems.find(i => i.id === activeTab)?.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Page Header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                  {activeTab === 'check' && "Are You Ready to Focus?"}
                  {activeTab === 'log' && "Log Focus Session"}
                  {activeTab === 'dashboard' && "Your Attention Patterns"}
                  {activeTab === 'history' && "Activity Journal"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {activeTab === 'check' && "Check your current state before diving in. Don't force it — assess first."}
                  {activeTab === 'log' && "Track your focus session with full context for pattern discovery."}
                  {activeTab === 'dashboard' && "Discover how your attention span behaves over time."}
                  {activeTab === 'history' && "Review your logged sessions and readiness checks."}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={toggleDarkMode} className="border-slate-200 dark:border-slate-700">
                      {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>
                {activeTab === 'history' && history.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">Clear History</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {history.length} entries including your attention pattern data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory}>Delete All</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'check' && <QuickCheck onComplete={handleQuickCheckComplete} />}
                {activeTab === 'log' && (
                  <LogSession
                    onComplete={handleSessionComplete}
                    breakReminderEnabled={prefs.breakReminderEnabled}
                    breakIntervalMinutes={prefs.breakIntervalMinutes}
                  />
                )}
                {activeTab === 'dashboard' && <Dashboard history={history} />}
                {activeTab === 'history' && <History history={history} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
