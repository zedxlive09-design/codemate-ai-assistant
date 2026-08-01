/**
 * ConversationQuickSwitcher — a fast, keyboard-driven recent-conversations
 * picker (think VS Code's Ctrl+P / Ctrl+Tab).
 *
 * Opened via Alt+Q (registered in App.tsx). Shows a compact modal with an
 * autofocused search input and a list of conversations sorted most-recently-
 * updated-first (pinned ones floated to the top). Each row shows title, last
 * message preview (truncated ~60 chars), relative timestamp, message count,
 * and a pin indicator if pinned. The active conversation is highlighted with
 * a `cm-active-indicator` left pill + subtle tint.
 *
 * Keyboard navigation: ↑/↓ to move (wraps), Enter to switch (calls
 * setActiveConversation(id) and closes), Escape to close. Filter is
 * case-insensitive substring on title first, with a message-content fallback
 * when no title matches. The list is hard-capped at MAX_VISIBLE rows for DOM
 * snappiness, but the filter runs over every conversation.
 *
 * The component reads conversations / activeConversationId /
 * pinnedConversationIds / setActiveConversation from the Zustand store — it
 * does not mutate any of them. Modal open-state is owned by App.tsx (local
 * useState) and toggled either by the Alt+Q shortcut or by the
 * `codemate:open-quick-switcher` window event (dispatched from
 * modalEvents.openQuickSwitcher, so CommandPalette can trigger it without
 * statically importing this component — keeping the modal code-split).
 *
 * Pattern mirrors GlobalSearchModal (Task 10-b) and QuickThemePicker (round
 * 4): capture-phase window keydown listener so Escape/Arrow keys are scoped
 * to the modal before App.tsx's bubble-phase handler runs.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, MessageSquare, Clock, Pin } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Conversation, Message } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ConversationQuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_VISIBLE = 20;
const PREVIEW_MAX = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Relative timestamp like "Just now", "5m ago", "3h ago", "2d ago", "Jan 4". */
function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/** Build a one-line preview of the last message in a conversation. */
function lastMessagePreview(conv: Conversation): string {
  const msgs = conv.messages;
  if (!msgs || msgs.length === 0) return 'No messages yet';
  const last = msgs[msgs.length - 1];
  const text = (last.content || '').replace(/\s+/g, ' ').trim();
  if (text.length === 0) return `(${last.role})`;
  if (text.length <= PREVIEW_MAX) return text;
  return text.slice(0, PREVIEW_MAX) + '\u2026'; // ellipsis
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ConversationQuickSwitcher({
  isOpen,
  onClose,
}: ConversationQuickSwitcherProps) {
  const conversations = useStore((s) => s.conversations);
  const activeConversationId = useStore((s) => s.activeConversationId);
  const pinnedConversationIds = useStore((s) => s.pinnedConversationIds);
  const setActiveConversation = useStore((s) => s.setActiveConversation);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sort: pinned conversations floated to the top, then most-recently-
  // updated-first within each group. Pinned ones get a small bump so they
  // stay reachable even if older than unpinned ones.
  const sorted = useMemo<Conversation[]>(() => {
    const pinnedSet = new Set(pinnedConversationIds);
    return [...conversations].sort((a, b) => {
      const pa = pinnedSet.has(a.id) ? 1 : 0;
      const pb = pinnedSet.has(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return tb - ta;
    });
  }, [conversations, pinnedConversationIds]);

  // Filter: title-first (case-insensitive substring). If no title matches,
  // fall back to message-content substring search so users can still find a
  // chat by what was said in it (kept simple — title takes priority).
  const filtered = useMemo<Conversation[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    const byTitle = sorted.filter((c) =>
      c.title.toLowerCase().includes(q),
    );
    if (byTitle.length > 0) return byTitle;
    return sorted.filter((c) =>
      c.messages.some((m: Message) => m.content.toLowerCase().includes(q)),
    );
  }, [sorted, query]);

  // Cap the visible DOM rows for snappiness; the filter above still runs
  // across ALL conversations so counts reflect the full result set.
  const visible = useMemo<Conversation[]>(
    () => filtered.slice(0, MAX_VISIBLE),
    [filtered],
  );

  // Reset query + autofocus + selection whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  // Keep selectedIndex in range when the filter result shrinks.
  useEffect(() => {
    if (visible.length === 0) {
      if (selectedIndex !== 0) setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= visible.length) setSelectedIndex(0);
  }, [visible.length, selectedIndex]);

  const handleSelect = useCallback(
    (id: string) => {
      setActiveConversation(id);
      onClose();
    },
    [setActiveConversation, onClose],
  );

  // Keyboard navigation. Registered on window with capture=true so we run
  // BEFORE App.tsx's bubble-phase keydown handler (Escape branch) and can
  // stopPropagation to keep Escape/Arrow keys scoped to the modal. Same
  // pattern as GlobalSearchModal / QuickThemePicker.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          visible.length === 0 ? 0 : (prev + 1) % visible.length,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          visible.length === 0
            ? 0
            : (prev - 1 + visible.length) % visible.length,
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const sel = visible[selectedIndex];
        if (sel) handleSelect(sel.id);
      }
    },
    [isOpen, onClose, visible, selectedIndex, handleSelect],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  // Keep the keyboard-selected row scrolled into view.
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  const hasConversations = conversations.length > 0;
  const trimmedQuery = query.trim();
  const pinnedSet = new Set(pinnedConversationIds);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick switch conversation"
      onMouseDown={(e) => {
        // Close on backdrop click only (not when clicking inside the modal).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="quick-switcher-enter w-full max-w-lg max-h-[70vh] flex flex-col glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header / search input ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Switch conversation…"
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
            aria-label="Filter conversations"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          <span className="text-[10px] text-slate-500 whitespace-nowrap hidden sm:inline">
            {trimmedQuery
              ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
              : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            aria-label="Close quick switcher"
            title="Esc to close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Result list ───────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto custom-scrollbar min-h-0"
        >
          {!hasConversations ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Press{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">
                  Ctrl+N
                </kbd>{' '}
                to start one
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>
                No conversations match{' '}
                <span className="text-slate-200 font-medium">
                  &ldquo;{trimmedQuery}&rdquo;
                </span>
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {visible.map((c, i) => {
                const isSelected = i === selectedIndex;
                const isActiveConv = c.id === activeConversationId;
                const isPinned = pinnedSet.has(c.id);
                const preview = lastMessagePreview(c);
                const msgCount = c.messages.length;
                const ts = formatRelativeTime(c.updatedAt);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      data-row-index={i}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => handleSelect(c.id)}
                      className={`relative w-full text-left px-3 py-2 flex flex-col gap-1 transition-colors border-l-2 ${
                        isSelected
                          ? 'bg-[color-mix(in_srgb,var(--cm-primary)_12%,transparent)] border-[color:var(--cm-primary)]'
                          : isActiveConv
                            ? 'border-[color:var(--cm-primary)] bg-slate-800/30'
                            : 'border-transparent hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Active-conversation indicator pill (mirrors Sidebar
                          pattern: small gradient pill on the left edge). */}
                      {isActiveConv && (
                        <span className="cm-active-indicator pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full" />
                      )}

                      {/* Row 1: title + pin + active dot */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-sm font-medium truncate flex-1 ${
                            isSelected ? 'text-white' : 'text-slate-100'
                          }`}
                        >
                          {c.title || 'Untitled'}
                        </span>
                        {isPinned && (
                          <Pin
                            size={12}
                            className="text-amber-400 shrink-0"
                            aria-label="Pinned"
                          />
                        )}
                      </div>

                      {/* Row 2: preview + message count + timestamp */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                        <span className="truncate flex-1">{preview}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <MessageSquare size={11} />
                          {msgCount}
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap text-[10px]">
                          <Clock size={10} />
                          {ts}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer hints ─────────────────────────────────────────────── */}
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500 bg-slate-900/40">
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">
              ↑↓
            </kbd>
            navigate
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">
              Enter
            </kbd>
            select
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">
              Esc
            </kbd>
            close
          </span>
        </div>

        {/* Overflow indicator: only render when the filter found more than
            what we render (keeps DOM snappy without hiding the true count). */}
        {hasConversations && filtered.length > visible.length && (
          <div className="px-4 py-1.5 text-center text-[10px] text-amber-400/80 border-t border-slate-700/50 bg-slate-900/40">
            Showing first {MAX_VISIBLE} of {filtered.length} matches
          </div>
        )}
      </div>
    </div>
  );
}
