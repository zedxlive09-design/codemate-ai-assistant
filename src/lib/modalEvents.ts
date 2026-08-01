/**
 * Modal event bus — tiny helpers to open modals from anywhere without
 * statically importing the (heavy) modal component modules.
 *
 * The modal components are lazy-loaded in App.tsx via React.lazy, but other
 * components (e.g. CommandPalette) need a way to trigger them. Importing the
 * component modules directly would pull their code into the entry chunk and
 * defeat the lazy-load. Instead, these helpers dispatch window CustomEvents
 * that App.tsx listens for — zero static dependency on the component code.
 *
 * Event names are namespaced `codemate:open-<modal>` to avoid collisions.
 */

export const MODAL_EVENTS = {
  globalSearch: 'codemate:open-global-search',
  quickThemePicker: 'codemate:open-quick-theme-picker',
  toggleFocusMode: 'codemate:toggle-focus-mode',
  quickSwitcher: 'codemate:open-quick-switcher',
  templates: 'codemate:open-templates',
  toggleBulkMode: 'codemate:toggle-bulk-mode',
} as const;

/** Open the GlobalSearchModal (full-text message search). */
export function openGlobalSearch(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MODAL_EVENTS.globalSearch));
}

/** Open the QuickThemePicker (keyboard-driven theme grid). */
export function openQuickThemePicker(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MODAL_EVENTS.quickThemePicker));
}

/** Toggle Focus Mode (distraction-free chat). */
export function toggleFocusMode(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MODAL_EVENTS.toggleFocusMode));
}

/** Open the ConversationQuickSwitcher (fast recent-conversations picker). */
export function openQuickSwitcher(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MODAL_EVENTS.quickSwitcher));
}

/**
 * Open the ConversationTemplatesModal (curated prompt-template picker).
 * Listened to by ChatArea so the CommandPalette can trigger it without
 * prop-drilling the open-state down through the tree.
 */
export function openTemplates(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MODAL_EVENTS.templates));
}

/**
 * Toggle the Sidebar's bulk-select mode (round 11). Listened to by the
 * Sidebar so the Alt+B shortcut (registered in App.tsx) + CommandPalette
 * can toggle it without prop-drilling.
 */
export function toggleBulkMode(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MODAL_EVENTS.toggleBulkMode));
}
