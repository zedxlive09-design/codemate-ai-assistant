/**
 * Single source of truth for the documented keyboard shortcuts.
 *
 * Both `KeyboardShortcuts.tsx` (grouped-by-category modal) and
 * `ShortcutsOverlay.tsx` (flat, searchable, filterable modal) consume this
 * module so the two help surfaces can never drift apart.
 *
 * Content was canonicalized in round 5 (Task 11-a, Agent N) and is unchanged
 * here — this file is a pure extraction of that data.
 */

/** A single keyboard shortcut, expressed as an ordered list of key parts. */
export interface Shortcut {
  /** Ordered parts of the chord, e.g. `['Ctrl', 'Shift', 'M']`. */
  keys: string[];
  /** Human-readable description of what the shortcut does. */
  description: string;
  /** Title of the category this shortcut belongs to (see `ShortcutCategory.title`). */
  category: string;
}

/** A grouped bucket of shortcuts rendered under a shared heading + icon. */
export interface ShortcutCategory {
  /** Display title of the category (also used as `Shortcut.category`). */
  title: string;
  /** Single emoji used as the category's icon in the grouped view. */
  icon: string;
  /** The shortcuts that belong to this category. */
  shortcuts: Shortcut[];
}

/**
 * All 29 documented shortcuts grouped into 7 categories:
 * General (4), Chat (2), Panels (11), Themes (3), Search (1),
 * AI & Model (4), Tools (4).
 */
export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'General',
    icon: '⭐',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette (also Ctrl+P)', category: 'General' },
      { keys: ['Ctrl', ','], description: 'Open Settings', category: 'General' },
      { keys: ['Ctrl', '/'], description: 'Show Keyboard Shortcuts', category: 'General' },
      { keys: ['Escape'], description: 'Close Dialog / Panel', category: 'General' },
    ],
  },
  {
    title: 'Chat',
    icon: '💬',
    shortcuts: [
      { keys: ['Enter'], description: 'Send Message', category: 'Chat' },
      { keys: ['Shift', 'Enter'], description: 'New Line in Input', category: 'Chat' },
    ],
  },
  {
    title: 'Panels',
    icon: '🪟',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar', category: 'Panels' },
      { keys: ['Ctrl', 'E'], description: 'Toggle File Explorer', category: 'Panels' },
      { keys: ['Ctrl', '`'], description: 'Toggle Terminal', category: 'Panels' },
      { keys: ['Ctrl', 'I'], description: 'Toggle Code Editor', category: 'Panels' },
      { keys: ['Ctrl', 'M'], description: 'Toggle Model Manager', category: 'Panels' },
      { keys: ['Ctrl', 'Shift', 'M'], description: 'Toggle Memory Panel', category: 'Panels' },
      { keys: ['Ctrl', 'Shift', 'E'], description: 'Toggle Conversation Manager', category: 'Panels' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle Snippets Panel', category: 'Panels' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Toggle Git Panel', category: 'Panels' },
      { keys: ['Ctrl', 'Shift', 'B'], description: 'Toggle Bookmarks', category: 'Panels' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Toggle Activity Panel', category: 'Panels' },
    ],
  },
  {
    title: 'Themes',
    icon: '🎨',
    shortcuts: [
      { keys: ['Ctrl', 'Alt', 'T'], description: 'Cycle Theme Preset', category: 'Themes' },
      { keys: ['Ctrl', 'Shift', 'T'], description: 'Open Theme Customizer', category: 'Themes' },
      { keys: ['Ctrl', 'Alt', 'Y'], description: 'Open Quick Theme Picker', category: 'Themes' },
    ],
  },
  {
    title: 'Search',
    icon: '🔍',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'F'], description: 'Open Global Search (also Ctrl+Shift+H)', category: 'Search' },
      { keys: ['Alt', 'Q'], description: 'Quick Switch Conversation', category: 'Search' },
      { keys: ['Alt', 'P'], description: 'Pin / Unpin Current Conversation', category: 'Search' },
      { keys: ['Alt', 'R'], description: 'Rename Current Conversation', category: 'Search' },
      { keys: ['Alt', 'D'], description: 'Duplicate Current Conversation', category: 'Search' },
      { keys: ['Alt', 'A'], description: 'Archive Current Conversation', category: 'Search' },
    ],
  },
  {
    title: 'AI & Model',
    icon: '🧠',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', ','], description: 'Open AI Settings', category: 'AI & Model' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Open Plugin Manager', category: 'AI & Model' },
      { keys: ['Ctrl', 'Shift', 'D'], description: 'Open Model Downloads', category: 'AI & Model' },
      { keys: ['Ctrl', 'Alt', 'S'], description: 'Open Stats Dashboard', category: 'AI & Model' },
    ],
  },
  {
    title: 'Tools',
    icon: '🛠️',
    shortcuts: [
      { keys: ['Ctrl', 'Alt', 'V'], description: 'Open Voice Input', category: 'Tools' },
      { keys: ['Ctrl', 'Shift', 'Q'], description: 'Open Quick Actions', category: 'Tools' },
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Open Notifications', category: 'Tools' },
      { keys: ['Ctrl', 'Alt', 'P'], description: 'Open Profile', category: 'Tools' },
    ],
  },
];

/**
 * The ordered list of category titles (mirrors `SHORTCUT_CATEGORIES` order).
 * Useful for the flat overlay's tab strip.
 */
export const CATEGORY_TITLES: string[] = SHORTCUT_CATEGORIES.map(c => c.title);

/**
 * Flatten `SHORTCUT_CATEGORIES` into a single array of `Shortcut`s, each
 * already tagged with its `category`. The flat list preserves category order
 * then intra-category order.
 */
export function getAllShortcuts(): Shortcut[] {
  return SHORTCUT_CATEGORIES.flatMap(category => category.shortcuts);
}

/**
 * Join the parts of a chord into a single display string, e.g.
 * `['Ctrl', 'Shift', 'M']` -> `'Ctrl + Shift + M'`.
 */
export function formatKeys(keys: string[]): string {
  return keys.join(' + ');
}
