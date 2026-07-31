/**
 * FocusMode — presentational "Exit Focus Mode" pill shown while the app is
 * in distraction-free focus mode.
 *
 * Behaviour:
 *  - Renders a fixed glass pill at bottom-right with the theme accent.
 *  - Calls `useToast()` (it lives inside <ToastProvider>) on mount to show a
 *    "Focus Mode on" hint, so the toast logic stays co-located with the
 *    visual chrome instead of needing a window-event bridge back to App.
 *  - Clicking the pill (or the X icon) fires `onExit`.
 *  - Includes a keyboard hint ("Press Ctrl+Shift+L to exit") so users always
 *    know how to leave via the keyboard.
 *
 * App.tsx renders this component only while `focusMode === true`, and removes
 * it on exit (no internal open/close state).
 */

import { useEffect } from 'react';
import { Focus, X } from 'lucide-react';
import { useToast } from './Toast';

interface FocusModeProps {
  onExit: () => void;
}

export default function FocusMode({ onExit }: FocusModeProps) {
  const toast = useToast();

  // Show the enter-toast exactly once on mount. Mounting is gated by
  // App.tsx's `focusMode` flag, so this naturally fires on enter and not
  // on every render.
  useEffect(() => {
    toast.info('Focus Mode on', 'Press Ctrl+Shift+L to exit');
    // We deliberately depend only on `toast` (stable per ToastProvider impl).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  return (
    <div
      className="focus-mode-pill fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-full glass-card backdrop-blur-xl shadow-2xl select-none"
      role="status"
      aria-live="polite"
      style={{
        // Subtle accent-tinted border + glow so the pill is unmistakably
        // part of the active theme.
        borderColor: 'color-mix(in srgb, var(--cm-primary) 40%, rgba(148,163,184,0.18))',
        boxShadow:
          '0 8px 24px -8px color-mix(in srgb, var(--cm-primary) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--cm-primary) 20%, transparent) inset',
      }}
    >
      {/* Accent icon */}
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full cm-gradient-primary"
        style={{ boxShadow: '0 0 12px -2px var(--cm-primary)' }}
      >
        <Focus className="w-3.5 h-3.5 text-white" />
      </span>

      {/* Label + hint */}
      <button
        type="button"
        onClick={onExit}
        className="flex flex-col items-start text-left leading-tight px-1 py-0.5 rounded-full transition-colors hover:bg-white/5"
        title="Exit Focus Mode"
      >
        <span className="text-xs font-semibold text-white">Exit Focus Mode</span>
        <span className="text-[10px] text-slate-400">
          Press <kbd className="px-1 py-0.5 bg-slate-900/80 rounded font-mono text-[9px] text-slate-300">Ctrl+Shift+L</kbd> to exit
        </span>
      </button>

      {/* Close X */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit Focus Mode"
        title="Exit Focus Mode (Esc)"
        className="flex items-center justify-center w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
