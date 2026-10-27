import { Download } from 'lucide-react';
import { promptInstall, usePwa } from '../services/pwa';

/**
 * Shows only when installing is actually possible: a native prompt is available
 * (Chrome, Edge, Android) or the user is on iOS Safari (shows Add-to-Home-Screen steps).
 * Hidden once the app is installed.
 */
export function InstallAppButton({ variant = 'icon', className }: { variant?: 'icon' | 'pill'; className?: string }) {
  const { canPrompt, isIosSafari, isInstalled } = usePwa();
  if (isInstalled || (!canPrompt && !isIosSafari)) return null;

  if (variant === 'pill') {
    return (
      <button
        data-tour-item="install"
        onClick={() => promptInstall()}
        className={className ?? "px-3 py-2 rounded-xl text-xs font-semibold clay-button text-sky-600 dark:text-sky-400 inline-flex items-center gap-1.5"}
      >
        <Download size={14} />
        <span>Install app</span>
      </button>
    );
  }

  return (
    <button
      data-tour-item="install"
      onClick={() => promptInstall()}
      className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl clay-button flex items-center justify-center text-sky-600 dark:text-sky-400"
      title="Install FocusChecker as an app"
      aria-label="Install FocusChecker as an app"
    >
      <Download size={16} />
    </button>
  );
}
