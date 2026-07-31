/**
 * Shared theme preset metadata.
 *
 * The full ColorPreset objects (with colors + gradients) live in
 * `ThemeCustomizer.tsx` because they're only needed for the customizer UI.
 * This module exports just the preset IDs + display names so other parts of
 * the app (the cycle shortcut, the command palette) can reference themes
 * without importing the heavy customizer module or duplicating the list.
 *
 * KEEP THIS LIST IN SYNC with `colorPresets` in ThemeCustomizer.tsx.
 */

export interface ThemePresetMeta {
  id: string;
  name: string;
}

function toId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

const PRESET_NAMES = [
  'CodeMate',
  'Ocean Blue',
  'Purple Haze',
  'Cyberpunk',
  'Matrix',
  'Cyan Neon',
  'Emerald Forest',
  'Forest Night',
  'Amber Glow',
  'Rose Pink',
  'Sunset',
  'Sakura',
  'Midnight',
  'Arctic',
];

export const THEME_PRESETS: ThemePresetMeta[] = PRESET_NAMES.map((name) => ({
  id: toId(name),
  name,
}));

export const DEFAULT_THEME_ID = 'codemate';

export function getPresetAfter(currentId: string): ThemePresetMeta {
  const idx = THEME_PRESETS.findIndex((p) => p.id === currentId);
  if (idx === -1) return THEME_PRESETS[0];
  return THEME_PRESETS[(idx + 1) % THEME_PRESETS.length];
}

export function getPresetBefore(currentId: string): ThemePresetMeta {
  const idx = THEME_PRESETS.findIndex((p) => p.id === currentId);
  if (idx === -1) return THEME_PRESETS[0];
  return THEME_PRESETS[(idx - 1 + THEME_PRESETS.length) % THEME_PRESETS.length];
}

export function getPresetById(id: string): ThemePresetMeta | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}
