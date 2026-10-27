import type { LucideIcon } from 'lucide-react';

export type TourTab = 'dial' | 'stress' | 'check' | 'sound' | 'dashboard' | 'history';

export interface TourCallout {
  /** CSS selector, searched inside the highlighted element first, then the whole page. */
  selector: string;
  /** Short name shown in bold in the legend. */
  label: string;
  /** What this control is for. */
  text: string;
}

export interface TourStep {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
  /** CSS selector for the box to spotlight. The first VISIBLE match wins (so one step can serve desktop and phone). No target = centred card. */
  target?: string;
  /** Open this tab before showing the step. */
  tab?: TourTab;
  /** On phones the Focus tab has two screens. */
  mobileView?: 'dial' | 'atmosphere';
  callouts?: TourCallout[];
  tip?: string;
}
