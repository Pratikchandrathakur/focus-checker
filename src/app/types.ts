// Emotional states from the attention methodology
export type EmotionalState = 'calm' | 'nervous' | 'worried' | 'happy' | 'depressed' | 'relaxed' | 'excited' | 'frustrated' | 'neutral';

// Day flow categories
export type DayFlow = 'productive' | 'stressful' | 'relaxed' | 'chaotic' | 'routine' | 'energetic' | 'slow';

// Work environment
export type WorkPlace = 'home-office' | 'office' | 'cafe' | 'library' | 'coworking' | 'outdoor' | 'other';

// A readiness check — assesses if you're in the right state to learn/work
export interface ReadinessCheck {
  id: number;
  date: string; // ISO string for localStorage
  type: 'Check';
  // Focus dimensions
  concentration: number;   // 1-10
  energy: number;          // 1-10
  clarity: number;         // 1-10
  motivation: number;      // 1-10
  distractionResistance: number; // 1-10
  comfort: number;         // 1-10 — "do you feel comfortable and ready?"
  // Context
  emotionalState: EmotionalState;
  dayFlow: DayFlow;
  sleepHours: number;
  note: string;
  // Computed
  score: number; // 0-100
  // Recommendation generated from the check
  recommendation: string;
}

// A focus session with full tracking
export interface FocusSession {
  id: number;
  date: string; // ISO string
  type: 'Session';
  // What
  task: string;
  tags: string[];
  // Environment context
  emotionalState: EmotionalState;
  dayFlow: DayFlow;
  workPlace: WorkPlace;
  sleepHours: number;
  // Timing
  startTime: string;  // ISO
  endTime: string;    // ISO
  durationMinutes: number;
  plannedDurationMinutes: number;
  // Breaks
  breaks: BreakEntry[];
  // Self-assessment after session
  focusQuality: number;    // 1-10: how well did you focus?
  contentClarity: number;  // 1-10: how clear was the material?
  frustrationLevel: number; // 1-10: how frustrated did you feel?
  // Computed
  score: number; // 0-100  
  note: string;
  // Did attention fade?
  attentionFaded: boolean;
  fadeAfterMinutes?: number; // when did attention start to drop?
}

export interface BreakEntry {
  startMinute: number;  // minute mark when break started
  durationMinutes: number;
}

// Union type for history
export type HistoryItem = ReadinessCheck | FocusSession;

// Attention span insights discovered over time
export interface AttentionInsight {
  avgAttentionSpan: number;     // average minutes before attention fades
  bestTimeOfDay: string;        // e.g., "9:00 AM - 11:00 AM" 
  bestEmotionalState: EmotionalState;
  bestWorkPlace: WorkPlace;
  bestSleepHours: number;
  optimalBreakInterval: number; // minutes
  weeklyPattern: WeekdayPattern[];
}

export interface WeekdayPattern {
  day: string; // Mon, Tue, etc.
  avgScore: number;
  avgDuration: number;
  sessionCount: number;
}

// Storage keys
export const STORAGE_KEYS = {
  HISTORY: 'focus-checker-history',
  DARK_MODE: 'focus-checker-dark-mode',
  USER_PREFS: 'focus-checker-prefs',
} as const;

// User preferences
export interface UserPrefs {
  defaultPlannedDuration: number; // minutes
  breakReminderEnabled: boolean;
  breakIntervalMinutes: number;
  name: string;
}
