/**
 * useTheme — applies and persists the CodeMate visual theme.
 *
 * The theme is a set of CSS custom properties (--cm-*) driven by a
 * `data-theme` attribute on <html> plus optional inline overrides for custom
 * colors. The full config is persisted in localStorage so it survives reloads
 * and is applied before first paint (via the hook's mount effect).
 *
 * Works identically in browser-demo mode and Tauri desktop mode.
 */

import { useCallback, useEffect, useState } from 'react';
import { THEME_PRESETS, getPresetAfter, DEFAULT_THEME_ID } from '../lib/themePresets';

export interface ThemeConfig {
  /** Preset id (lowercased preset name, spaces->hyphens) or 'custom'. */
  presetId: string;
  /** Custom color overrides (hex). When set, they override the preset vars. */
  custom?: { primary?: string; secondary?: string; accent?: string };
  /** Font family CSS value. */
  font?: string;
  /** Border-radius CSS value. */
  radius?: string;
}

const STORAGE_KEY = 'codemate:theme';
const DEFAULT_CONFIG: ThemeConfig = { presetId: 'codemate' };

function readConfig(): ThemeConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as ThemeConfig;
    if (!parsed || typeof parsed.presetId !== 'string') return DEFAULT_CONFIG;
    return parsed;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function applyConfig(cfg: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', cfg.presetId || 'codemate');
  if (cfg.custom?.primary) root.style.setProperty('--cm-primary', cfg.custom.primary);
  if (cfg.custom?.secondary) root.style.setProperty('--cm-secondary', cfg.custom.secondary);
  if (cfg.custom?.accent) root.style.setProperty('--cm-accent', cfg.custom.accent);
  if (cfg.font) root.style.setProperty('--cm-font', cfg.font);
  if (cfg.radius) root.style.setProperty('--cm-radius', cfg.radius);
}

export { applyConfig };

function persistConfig(cfg: ThemeConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('[useTheme] failed to persist theme', e);
  }
}

/**
 * Apply the persisted theme on mount and expose `setTheme` / `resetTheme`.
 * Call once at the top of the App component.
 */
export function useTheme() {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_CONFIG);

  // Apply persisted theme on mount (before first meaningful paint).
  useEffect(() => {
    const stored = readConfig();
    setConfig(stored);
    applyConfig(stored);
  }, []);

  const setTheme = useCallback((next: ThemeConfig) => {
    setConfig(next);
    applyConfig(next);
    persistConfig(next);
  }, []);

  const resetTheme = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    applyConfig(DEFAULT_CONFIG);
    persistConfig(DEFAULT_CONFIG);
  }, []);

  /** Advance to the next preset in the list (wraps around). Returns the new preset id. */
  const cycleTheme = useCallback((): string => {
    const currentId = config.presetId || DEFAULT_THEME_ID;
    const next = getPresetAfter(currentId);
    const nextConfig: ThemeConfig = {
      presetId: next.id,
      font: config.font,
      radius: config.radius,
    };
    setConfig(nextConfig);
    applyConfig(nextConfig);
    persistConfig(nextConfig);
    return next.id;
  }, [config]);

  return { config, setTheme, resetTheme, cycleTheme, presets: THEME_PRESETS };
}

export default useTheme;
