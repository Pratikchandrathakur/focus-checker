import { 
  Target, 
  Wind, 
  Headphones, 
  LayoutDashboard, 
  History as HistoryIcon, 
  Sun, 
  Sparkles,
  Compass,
  type LucideIcon 
} from 'lucide-react';

export interface TourStep {
  id: string;
  title: string;
  category: string;
  tab: 'dial' | 'check' | 'stress' | 'sound' | 'dashboard' | 'history';
  mobileDialView?: 'dial' | 'atmosphere';
  icon: LucideIcon;
  badge: string;
  badgeColor: 'sky' | 'amber' | 'emerald' | 'indigo' | 'violet' | 'cyan';
  headline: string;
  description: string;
  highlights: {
    icon: string;
    label: string;
    detail: string;
  }[];
  proTip: string;
  actionHint: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FocusChecker',
    category: 'Science-Backed Overview',
    tab: 'dial',
    mobileDialView: 'dial',
    icon: Sparkles,
    badge: 'Introduction',
    badgeColor: 'sky',
    headline: 'Focus deeper. Reset nervous tension. Never burn out.',
    description: 'FocusChecker combines tactile timeboxing with autonomic nervous system regulation, acoustic neuro-entrainment, and personal attention tracking. It works with your biology instead of forcing focus through sheer willpower.',
    highlights: [
      {
        icon: '🎯',
        label: 'Dual-Column Layout',
        detail: 'The Tactile Focus Dial on the left paired with the Environment Hub on the right for full sensory control.',
      },
      {
        icon: '🧠',
        label: 'Biology-First Pacing',
        detail: 'Pre-flight readiness assessments align session lengths with your genuine cognitive energy.',
      },
      {
        icon: '🛡️',
        label: '100% Offline & Private',
        detail: 'Zero trackers. All sessions save securely to your device first, syncing to cloud only when you sign in.',
      },
    ],
    proTip: 'Focus is not a character trait—it is an autonomic physiological state. Resetting breathing between blocks keeps dopamine high.',
    actionHint: 'Take a quick 8-step tour to master your focus toolkit.',
  },
  {
    id: 'dial',
    title: 'Tactile Focus Dial',
    category: 'Core Focus Timer',
    tab: 'dial',
    mobileDialView: 'dial',
    icon: Target,
    badge: 'Core Tool',
    badgeColor: 'amber',
    headline: 'Smooth tactile scrubbing tailored to your workflow.',
    description: 'Scrub the circular dial ring or tap duration presets (15m, 25m, 45m, 60m) to timebox your work. Easily toggle between unbroken Deep Work and automated Pomodoro interval cycles.',
    highlights: [
      {
        icon: '⏱️',
        label: 'Deep Work vs Pomodoro Flow',
        detail: 'Choose single uninterrupted blocks (1–180 min) or automated sprint rounds with short/long breaks.',
      },
      {
        icon: '📝',
        label: 'Task Intent & Soundscapes',
        detail: 'Type your single priority task and toggle acoustic masking directly beneath the dial.',
      },
      {
        icon: '☕',
        label: 'Universal Break Controls',
        detail: 'Take a 5-minute breather anytime or skip rest with the coffee cup button when you are in the zone.',
      },
    ],
    proTip: 'Research indicates 45-minute focus blocks followed by a 5-minute break deliver peak cognitive stamina without mental exhaustion.',
    actionHint: 'Scrub the dial or click a preset to set your target block.',
  },
  {
    id: 'environment',
    title: 'Environment Hub & Goals',
    category: 'Atmosphere & Routine',
    tab: 'dial',
    mobileDialView: 'atmosphere',
    icon: Sun,
    badge: 'Habit Engine',
    badgeColor: 'emerald',
    headline: 'Shape your digital and physical focus sanctuary.',
    description: 'Positioned right beside the dial (or under the "Today" toggle on phones), the Environment Hub tracks your cumulative daily focus target, preserves your streak, and adjusts ambient room lighting.',
    highlights: [
      {
        icon: '🎯',
        label: 'Daily Target Progress',
        detail: 'Select your daily focus goal (60m to 240m) and watch the emerald progress ring fill as you log blocks.',
      },
      {
        icon: '💡',
        label: 'Circadian Warm Amber Light',
        detail: 'One-click warm ambient backdrop reduces blue-light retinal strain during late evening deep work.',
      },
      {
        icon: '🔥',
        label: 'Streak Motivation',
        detail: 'Track consecutive active days without punitive resets—celebrating steady, sustainable progress.',
      },
    ],
    proTip: 'Two focused 45-minute blocks every single day outperform sporadic 6-hour weekend marathons.',
    actionHint: 'Set your daily goal to 90 or 120 minutes to start.',
  },
  {
    id: 'readiness',
    title: 'Readiness Check-In',
    category: 'Cognitive Self-Awareness',
    tab: 'check',
    icon: Compass,
    badge: 'Pre-Flight Check',
    badgeColor: 'indigo',
    headline: 'A 30-second pre-flight check before you start.',
    description: 'Before taking on challenging work, rate your sleep quality, emotional state, and mental clarity. FocusChecker computes an instant Readiness Score with custom session recommendations.',
    highlights: [
      {
        icon: '📊',
        label: 'Algorithmic Block Advice',
        detail: 'Recommends whether to take on a 45m deep dive, a light 25m sprint, or a 2m breathing pause first.',
      },
      {
        icon: '🛑',
        label: 'Burnout Early Warning',
        detail: 'Identifies fatigue before you force frustration, helping you adapt your day realistically.',
      },
      {
        icon: '📈',
        label: 'Correlational History',
        detail: 'Reveals how your sleep and emotional state directly influence your subsequent focus stamina.',
      },
    ],
    proTip: 'Checking in takes under 30 seconds and eliminates the anxiety of forcing focus when depleted.',
    actionHint: 'Rate your sleep and clarity to receive instant tailored advice.',
  },
  {
    id: 'breathe',
    title: 'De-Stress & Breathing Resets',
    category: 'Autonomic Regulation',
    tab: 'stress',
    icon: Wind,
    badge: 'Nervous System',
    badgeColor: 'emerald',
    headline: 'Rapid nervous system resets in 2 to 3 minutes.',
    description: 'Downregulate elevated cortisol, steady heart-rate variability, and dispel brain fog with clinically validated respiratory pacing and a hypnotic expanding clay pacer.',
    highlights: [
      {
        icon: '🔲',
        label: 'Box Breathing (4-4-4-4)',
        detail: 'Inhale 4s, Hold 4s, Exhale 4s, Hold empty 4s. Used by tactical operators to regain focus under stress.',
      },
      {
        icon: '🫁',
        label: 'Physiological Sigh',
        detail: 'Two quick inhales through the nose and a long sigh through the mouth to instantly dump CO2.',
      },
      {
        icon: '🔔',
        label: 'Multi-Sensory Guidance',
        detail: 'Follow the gentle expanding ring with soothing bell chimes or subtle tactile vibrations.',
      },
    ],
    proTip: 'When stuck on a frustrating bug or difficult sentence, take 2 minutes of box breathing to restore executive function.',
    actionHint: 'Press play on the breathing pacer anytime tension rises.',
  },
  {
    id: 'sounds',
    title: 'Focus Soundscapes & Mixer',
    category: 'Acoustic Neuro-Entrainment',
    tab: 'sound',
    icon: Headphones,
    badge: 'Sound Science',
    badgeColor: 'violet',
    headline: 'Synthesized frequencies for deep cognitive states.',
    description: 'Mask acoustic distractions and encourage target brainwave frequencies using zero-latency Web Audio oscillators. No external audio streams—plays completely offline.',
    highlights: [
      {
        icon: '⚡',
        label: 'Binaural Brainwave Beats',
        detail: '40Hz Gamma (intense analytical problem solving), 14Hz Beta (writing/coding), 6Hz Theta (creative ideation).',
      },
      {
        icon: '🌧️',
        label: 'Color Noise & Nature',
        detail: 'Balanced Pink Noise, warm Brown Noise, Rain, and Forest soundscapes to mask office chatter.',
      },
      {
        icon: '🎚️',
        label: 'Multi-Track Mix Builder',
        detail: 'Layer multiple frequencies and ambient tracks with individual volume faders and custom presets.',
      },
    ],
    proTip: 'Always use stereo headphones for binaural beats so each ear receives the subtle frequency offset.',
    actionHint: 'Turn on 40Hz Gamma or Pink Noise for distraction-free coding.',
  },
  {
    id: 'dashboard',
    title: 'Analytics & Attention Fade',
    category: 'Personal Intelligence',
    tab: 'dashboard',
    icon: LayoutDashboard,
    badge: 'Insights',
    badgeColor: 'sky',
    headline: 'Discover when your attention naturally begins to fade.',
    description: 'Unlike ordinary timers that just log hours, FocusChecker analyzes post-session ratings to uncover your personal attention fade curve, optimal working hours, and recovery rhythms.',
    highlights: [
      {
        icon: '📉',
        label: 'Attention Fade Detection',
        detail: 'Identifies the precise minute your focus begins to drop off so you can set optimal block lengths.',
      },
      {
        icon: '🕐',
        label: 'Peak Focus Hours',
        detail: 'Visual heatmap showing whether your highest quality blocks occur in morning, afternoon, or evening.',
      },
      {
        icon: '📅',
        label: 'Multi-Range Trends',
        detail: 'Explore 7-day, 30-day, and all-time completion rates, session duration, and focus quality scores.',
      },
    ],
    proTip: 'If your attention consistently fades around minute 38, setting 35-minute blocks ensures every sprint ends on a high note.',
    actionHint: 'Rate each session honestly to generate your cognitive profile.',
  },
  {
    id: 'history',
    title: 'Focus Journal & Offline PWA',
    category: 'Data Ownership & Privacy',
    tab: 'history',
    icon: HistoryIcon,
    badge: 'Privacy & PWA',
    badgeColor: 'cyan',
    headline: 'Complete ownership of your data, anywhere you work.',
    description: 'Review full session records, tag distributions, and reflection notes. FocusChecker runs 100% offline from your very first visit and installs as a standalone desktop or mobile PWA.',
    highlights: [
      {
        icon: '📖',
        label: 'Detailed Timeline',
        detail: 'Filter sessions by mode (Deep Work, Pomodoro Flow, Creative) with search, tag filters, and CSV export.',
      },
      {
        icon: '📱',
        label: 'Standalone App Install',
        detail: 'Install FocusChecker to your Dock or Home Screen with the header install button for windowed, ad-free focus.',
      },
      {
        icon: '☁️',
        label: 'Encrypted Cloud Sync',
        detail: 'Keep data local on device or sign in to sync seamlessly across desktop, tablet, and mobile.',
      },
    ],
    proTip: 'Press the Install button in the header or browser address bar to run FocusChecker in its own dedicated distraction-free window.',
    actionHint: 'Review your focus journey and export your data anytime.',
  },
];

export interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
  category: 'Timer' | 'Navigation' | 'General';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Space', label: 'Space', description: 'Start or pause focus timer / breathing pacer', category: 'Timer' },
  { key: 'R', label: 'R', description: 'Reset timer or finish early', category: 'Timer' },
  { key: 'S', label: 'S', description: 'Skip current rest break', category: 'Timer' },
  { key: '1', label: '1', description: 'Switch to Focus Dial', category: 'Navigation' },
  { key: '2', label: '2', description: 'Switch to Readiness Check', category: 'Navigation' },
  { key: '3', label: '3', description: 'Switch to De-Stress Breathing', category: 'Navigation' },
  { key: '4', label: '4', description: 'Switch to Soundscapes', category: 'Navigation' },
  { key: '5', label: '5', description: 'Switch to Analytics & Insights', category: 'Navigation' },
  { key: '6', label: '6', description: 'Switch to Focus Journal', category: 'Navigation' },
  { key: '?', label: '? or H', description: 'Open this App Tour & Shortcuts Guide', category: 'General' },
  { key: 'Esc', label: 'Esc', description: 'Close modals, tour, or review dialogs', category: 'General' },
];
