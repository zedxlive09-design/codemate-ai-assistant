/**
 * Detects whether the app is running inside the Tauri webview (native desktop)
 * or in a plain browser (e.g. `vite dev`, preview, automated tests).
 *
 * In Tauri v2 the runtime injects `window.__TAURI_INTERNALS__`. When that is
 * absent, every `invoke()` / plugin call throws, so callers must fall back to
 * mock data (see `./tauriMocks`) to keep the UI explorable in a browser.
 *
 * This check is evaluated ONCE at module load and exported as a stable boolean.
 */
function detectTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  };
  return typeof w.__TAURI_INTERNALS__ !== 'undefined' || typeof w.__TAURI__ !== 'undefined';
}

export const isTauri: boolean = detectTauri();
export default isTauri;
