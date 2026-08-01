/**
 * DemoModeBanner — dismissible top banner shown when the app is running in a
 * plain browser (isTauri === false), i.e. without the Tauri/Ollama backend.
 *
 * Explains that the UI is fully explorable with mock data, and links to the
 * setup instructions for running the real desktop app. Dismissal is persisted
 * to localStorage so it doesn't nag on every reload.
 */

import { useState, useEffect } from 'react';
import { isTauri } from '../lib/isTauri';

const DISMISS_KEY = 'codemate:demo-banner-dismissed';

export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(true);

  // Only reveal after mount (avoids SSR/hydration flash + honors isTauri at runtime).
  useEffect(() => {
    if (isTauri) return; // never show in the real desktop app
    try {
      const seen = localStorage.getItem(DISMISS_KEY) === '1';
      setDismissed(seen);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (isTauri || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore quota errors */
    }
  };

  return (
    <div
      role="region"
      aria-label="Demo mode notice"
      className="demo-banner demo-banner-enter flex items-center gap-3 px-4 py-2 text-xs text-amber-200 relative z-50"
    >
      <svg className="w-4 h-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="flex-1 leading-relaxed">
        <span className="font-semibold text-amber-300">Demo Mode</span> — running in a
        browser without the Tauri/Ollama backend. The UI is fully explorable with
        simulated models &amp; responses. For real AI completions, run{' '}
        <code className="px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[11px]">npm run tauri dev</code>{' '}
        (requires Rust + Ollama).
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-md hover:bg-amber-500/20 transition-colors text-amber-300/80 hover:text-amber-200"
        aria-label="Dismiss demo mode banner"
        title="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
