/**
 * TokenUsageHUD
 * -------------
 * A small, non-intrusive floating widget that shows LIVE generation stats
 * during LLM streaming: tokens generated, tokens/sec, and a tiny sparkline
 * of throughput history.
 *
 * It subscribes DIRECTLY to `modelEvents` (onGenerationToken /
 * onGenerationComplete / onGenerationError) from `../lib/tauri`, so it works
 * regardless of which component started the generation — no shared hook
 * dependency, no parent wiring required. Works in both Tauri desktop mode
 * and browser-demo mode (where `mockListen` dispatches the same events).
 */

import { useEffect, useRef, useState } from 'react';
import { modelEvents } from '../lib/tauri';
import type {
  GenerationTokenEvent,
  GenerationCompleteEvent,
  GenerationErrorEvent,
} from '../lib/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';

/** Maximum number of throughput samples kept for the mini bar chart. */
const MAX_HISTORY = 20;
/** How long (ms) final stats stay visible after generation completes. */
const FADE_DELAY_MS = 4000;
/** How long (ms) the error state stays visible before hiding. */
const ERROR_HOLD_MS = 4000;

interface HudState {
  isGenerating: boolean;
  tokensGenerated: number;
  tokensPerSecond: number;
  history: number[];
  error: string | null;
}

const initialState: HudState = {
  isGenerating: false,
  tokensGenerated: 0,
  tokensPerSecond: 0,
  history: [],
  error: null,
};

export default function TokenUsageHUD() {
  const [state, setState] = useState<HudState>(initialState);
  const [visible, setVisible] = useState(false);

  // Track unlisten functions and timers so they can be cleaned up on unmount.
  const unlistenRef = useRef<Array<UnlistenFn | (() => void)>>([]);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      // Token listener — updates live stats + pushes a throughput sample.
      const unlistenToken = await modelEvents.onGenerationToken(
        (event: GenerationTokenEvent) => {
          if (cancelled) return;
          const tps = Number.isFinite(event.tokensPerSecond)
            ? event.tokensPerSecond
            : 0;
          setState((prev) => {
            const nextHistory = [...prev.history, tps];
            if (nextHistory.length > MAX_HISTORY) {
              nextHistory.splice(0, nextHistory.length - MAX_HISTORY);
            }
            return {
              isGenerating: true,
              tokensGenerated: event.tokensGenerated ?? prev.tokensGenerated,
              tokensPerSecond: tps,
              history: nextHistory,
              error: null,
            };
          });
          setVisible(true);
          // Clear any pending fade-out since generation is live again.
          if (fadeTimerRef.current) {
            clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = null;
          }
          if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
          }
        }
      );

      // Complete listener — keep final stats visible for FADE_DELAY_MS then hide.
      const unlistenComplete = await modelEvents.onGenerationComplete(
        (event: GenerationCompleteEvent) => {
          if (cancelled) return;
          const tps = Number.isFinite(event.tokensPerSecond)
            ? event.tokensPerSecond
            : 0;
          setState((prev) => {
            const nextHistory = [...prev.history, tps];
            if (nextHistory.length > MAX_HISTORY) {
              nextHistory.splice(0, nextHistory.length - MAX_HISTORY);
            }
            return {
              isGenerating: false,
              tokensGenerated: event.tokensGenerated ?? prev.tokensGenerated,
              tokensPerSecond: tps,
              history: nextHistory,
              error: null,
            };
          });
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = setTimeout(() => {
            setVisible(false);
            // Reset stats shortly after hiding so a fresh generation starts clean.
            setTimeout(() => {
              if (!cancelled) setState(initialState);
            }, 400);
          }, FADE_DELAY_MS);
        }
      );

      // Error listener — show error briefly, then hide.
      const unlistenError = await modelEvents.onGenerationError(
        (event: GenerationErrorEvent) => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error: event.message || 'Generation failed',
          }));
          setVisible(true);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(() => {
            setVisible(false);
            setTimeout(() => {
              if (!cancelled) setState(initialState);
            }, 400);
          }, ERROR_HOLD_MS);
        }
      );

      unlistenRef.current = [unlistenToken, unlistenComplete, unlistenError];
    }

    subscribe().catch((err) => {
      // If subscription fails (e.g. event API unavailable), fail silently —
      // the HUD simply stays hidden. Not worth crashing the app for.
      console.warn('TokenUsageHUD: failed to subscribe to model events', err);
    });

    return () => {
      cancelled = true;
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      unlistenRef.current.forEach((unlisten) => {
        try {
          const result = unlisten();
          // Both real Tauri unlisten and mock unlisten may return a Promise.
          if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch(() => {});
          }
        } catch {
          /* ignore */
        }
      });
      unlistenRef.current = [];
    };
  }, []);

  // Render nothing while idle and no recent stats.
  if (!visible) return null;

  const { isGenerating, tokensGenerated, tokensPerSecond, history, error } =
    state;
  const hasStats =
    tokensGenerated > 0 || history.length > 0 || isGenerating || !!error;
  if (!hasStats) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Generation stats"
      className="token-hud-enter fixed bottom-12 left-1/2 -translate-x-1/2 z-40 w-[220px] pointer-events-none select-none"
    >
      <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/50 rounded-xl shadow-lg px-3 py-2 flex items-center gap-3">
        {/* Status dot — emerald when generating, slate when idle, red on error. */}
        <span
          className={`relative inline-flex h-2.5 w-2.5 shrink-0 ${
            error
              ? ''
              : isGenerating
                ? 'animate-pulse'
                : ''
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute inset-0 rounded-full ${
              error
                ? 'bg-rose-400'
                : isGenerating
                  ? 'bg-emerald-400'
                  : 'bg-slate-500'
            }`}
          />
          {isGenerating && !error && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          )}
        </span>

        {/* Labels + numbers */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-[11px] font-semibold tracking-wide ${
                error
                  ? 'text-rose-300'
                  : isGenerating
                    ? 'text-emerald-300'
                    : 'text-slate-300'
              }`}
            >
              {error
                ? 'Error'
                : isGenerating
                  ? 'Generating…'
                  : 'Done'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {tokensGenerated.toLocaleString()} tok
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500 font-mono tabular-nums">
              {tokensPerSecond.toFixed(1)} t/s
            </span>
            {/* Mini throughput bar chart */}
            <ThroughputBars history={history} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini bar chart of throughput history. Renders up to 16 bars (2px wide,
 * 16px tall max). Taller = faster. Uses `--cm-primary` CSS var with a
 * fallback to `rgb(56 189 248)`.
 */
function ThroughputBars({ history }: { history: number[] }) {
  const MAX_BARS = 16;
  const BAR_MAX_HEIGHT_PX = 16;
  const BAR_WIDTH_PX = 2;

  // Take the most recent MAX_BARS samples.
  const recent = history.slice(-MAX_BARS);
  // Determine scale from the max value seen so far (avoid div-by-zero).
  const maxTps = Math.max(1, ...recent);

  // Pad to MAX_BARS on the left so the chart keeps a stable width.
  const padded: Array<number | null> = [
    ...Array(Math.max(0, MAX_BARS - recent.length)).fill(null),
    ...recent,
  ];

  return (
    <div
      className="flex items-end gap-[2px] h-4"
      role="img"
      aria-label="throughput sparkline"
    >
      {padded.map((value, idx) => {
        const ratio =
          value === null || value === undefined || !Number.isFinite(value)
            ? 0
            : Math.min(1, Math.max(0.08, value / maxTps));
        const heightPx = Math.max(1, Math.round(ratio * BAR_MAX_HEIGHT_PX));
        return (
          <span
            key={idx}
            style={{
              width: `${BAR_WIDTH_PX}px`,
              height: `${heightPx}px`,
              // Inline style uses the CSS var with explicit fallback.
              backgroundColor: 'var(--cm-primary, rgb(56 189 248))',
              opacity: value === null ? 0.18 : 0.55 + ratio * 0.45,
              borderRadius: '1px',
            }}
          />
        );
      })}
    </div>
  );
}
