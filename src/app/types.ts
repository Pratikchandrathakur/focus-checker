// Self-reported mental states
export type EmotionalState =
  | 'calm'
  | 'focused'
  | 'energized'
  | 'neutral'
  | 'scattered'
  | 'fatigued'
  | 'overwhelmed'
  | 'anxious'
  | 'frustrated';

// Day flow categories
export type DayFlow =
  | 'productive'
  | 'steady'
  | 'relaxed'
  | 'demanding'
  | 'chaotic'
  | 'sluggish';

// Work environment
export type WorkPlace =
  | 'home-office'
  | 'office'
  | 'cafe'
  | 'library'
  | 'coworking'
  | 'outdoor'
  | 'commute';

// A readiness check — assesses if the nervous system and cognitive resources are primed
export interface ReadinessCheck {
  id: number;
  date: string; // ISO string
  type: 'Check';
  // Focus dimensions (1-10)
  concentration: number;
  energy: number;
  clarity: number;
  motivation: number;
  distractionResistance: number;
  comfort: number;
  // Context
  emotionalState: EmotionalState;
  dayFlow: DayFlow;
  sleepHours: number;
  note: string;
  // Computed
  score: number; // 0-100
  recommendation: string;
}

// A focus session with full tracking
export interface FocusSession {
  id: number;
  date: string; // ISO string
  type: 'Session';
  task: string;
  tags: string[];
  mode: 'deep-work' | 'light-focus' | 'creative' | 'audio-focus';
  // Environment context
  emotionalState: EmotionalState;
  dayFlow: DayFlow;
  workPlace: WorkPlace;
  sleepHours: number;
  // Timing
  startTime: string; // ISO
  endTime: string; // ISO
  durationMinutes: number;
  plannedDurationMinutes: number;
  // Breaks
  breaks: BreakEntry[];
  // Self-assessment after session (1-10)
  focusQuality: number;
  contentClarity: number;
  frustrationLevel: number;
  // Computed
  score: number; // 0-100
  note: string;
  // Did attention fade?
  attentionFaded: boolean;
  fadeAfterMinutes?: number;
}

export interface BreakEntry {
  startMinute: number;
  durationMinutes: number;
}

// Stress Reset / Breathing Session
export type BreathingTechnique = 'physiological-sigh' | 'box-breathing' | 'calm-478';

export interface StressResetSession {
  id: number;
  date: string;
  type: 'StressReset';
  technique: BreathingTechnique;
  durationSeconds: number;
  cyclesCompleted: number;
  stressBefore: number; // 1-10
  stressAfter: number; // 1-10
  score: number;
  note: string;
}

// Union type for history
export type HistoryItem = ReadinessCheck | FocusSession | StressResetSession;

// Attention span insights discovered over time
export interface AttentionInsight {
  avgAttentionSpan: number; // average minutes before attention fades
  bestTimeOfDay: string; // e.g., "09:00 AM - 11:00 AM"
  bestEmotionalState: EmotionalState;
  bestWorkPlace: WorkPlace;
  bestSleepHours: number;
  optimalBreakInterval: number; // minutes
  stressReductionAvg: number; // percentage reduction in stress
  weeklyPattern: WeekdayPattern[];
}

export interface WeekdayPattern {
  day: string;
  avgScore: number;
  avgDuration: number;
  sessionCount: number;
}

// User Profile & Authentication
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarSeed: string;
  joinedAt: string;
  streakDays: number;
  lastActiveDate: string;
}

// User preferences
export interface UserPrefs {
  defaultPlannedDuration: number; // minutes
  breakReminderEnabled: boolean;
  breakIntervalMinutes: number;
  soundEnabled: boolean;
  binauralPreset: 'gamma' | 'alpha' | 'pink' | 'none';
  binauralVolume: number;
  name: string;
}

// Storage keys
export const STORAGE_KEYS = {
  HISTORY: 'focus-checker-history',
  DARK_MODE: 'focus-checker-dark-mode',
  USER_PREFS: 'focus-checker-prefs',
  AUTH_USER: 'focus-checker-auth-user',
  REGISTERED_USERS: 'focus-checker-registered-users',
} as const;
