import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, MessageSquare, User, Bot, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Message } from '../types';

// The open-modal event bus now lives in src/lib/modalEvents.ts so that
// CommandPalette can import the helper WITHOUT statically importing this
// (heavy) component module — keeping it out of the entry chunk.

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Internal result type
// ---------------------------------------------------------------------------
interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  role: Message['role'];
  content: string;
  timestamp: Date;
  matchIndex: number; // index of first match inside `content` (original casing)
}

// ---------------------------------------------------------------------------
// XSS-safe highlighting helpers
// (Same escape-then-highlight pattern used by Sidebar.tsx for conversation
//  list search — escape HTML entities first, THEN run the match regex on the
//  escaped string so user-controlled content can never inject markup.)
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Escape HTML, then wrap query matches in <mark>. Safe to inject. */
function highlightMatch(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const q = query.trim();
  if (!q) return escaped;
  const safeQuery = escapeRegExp(q);
  const re = new RegExp(`(${safeQuery})`, 'gi');
  return escaped.replace(
    re,
    '<mark class="bg-[color-mix(in_srgb,var(--cm-primary)_30%,transparent)] text-white rounded px-0.5">$1</mark>',
  );
}

// ---------------------------------------------------------------------------
// Relative timestamp formatter (mirrors Sidebar.tsx style)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Snippet builder — extract a window around the first match and normalise
// whitespace so multi-line code/messages render on a single line in the list.
// ---------------------------------------------------------------------------
const SNIPPET_PADDING = 60;
const MAX_RESULTS = 50;

function buildSnippet(content: string, matchIndex: number, queryLen: number): string {
  // Clamp matchIndex — for some Unicode inputs lowercasing can shift indices,
  // so guard against out-of-range values.
  const safeIdx = Math.max(0, Math.min(matchIndex, Math.max(0, content.length - 1)));
  const start = Math.max(0, safeIdx - SNIPPET_PADDING);
  const end = Math.min(content.length, safeIdx + queryLen + SNIPPET_PADDING);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '\u2026' + snippet; // leading ellipsis
  if (end < content.length) snippet = snippet + '\u2026'; // trailing ellipsis
  // Collapse whitespace for compact one-line preview
  return snippet.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Role icon/label helpers
// ---------------------------------------------------------------------------
function RoleIcon({ role }: { role: Message['role'] }) {
  if (role === 'user') return <User className="w-3.5 h-3.5 shrink-0" />;
  if (role === 'assistant') return <Bot className="w-3.5 h-3.5 shrink-0" />;
  return <MessageSquare className="w-3.5 h-3.5 shrink-0" />;
}

function roleLabel(role: Message['role']): string {
  if (role === 'user') return 'You';
  if (role === 'assistant') return 'Assistant';
  return 'System';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const conversations = useStore((s) => s.conversations);
  const setActiveConversation = useStore((s) => s.setActiveConversation);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Debounce the search query (~150ms) for smoother typing.
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 150);
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query]);

  // Compute search results (case-insensitive substring match across every
  // message in every conversation). Hard-capped at MAX_RESULTS for DOM perf.
  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];
    const lowerQ = q.toLowerCase();
    const out: SearchResult[] = [];
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        const lowerContent = msg.content.toLowerCase();
        const idx = lowerContent.indexOf(lowerQ);
        if (idx === -1) continue;
        out.push({
          conversationId: conv.id,
          conversationTitle: conv.title,
          messageId: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          matchIndex: idx,
        });
        if (out.length >= MAX_RESULTS) return out;
      }
    }
    return out;
  }, [conversations, debouncedQuery]);

  // Reset query + autofocus the input whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  // Keyboard navigation. Registered on window with capture=true so we run
  // BEFORE App.tsx's bubble-phase keydown handler (and can stopPropagation
  // to keep Escape/Arrow keys scoped to the modal).
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
          results.length === 0 ? 0 : (prev + 1) % results.length,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          results.length === 0
            ? 0
            : (prev - 1 + results.length) % results.length,
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const sel = results[selectedIndex];
        if (sel) {
          setActiveConversation(sel.conversationId);
          onClose();
        }
      }
    },
    [isOpen, onClose, results, selectedIndex, setActiveConversation],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  // Keep the keyboard-selected result scrolled into view.
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector(
      `[data-result-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex, isOpen]);

  const handleSelect = useCallback(
    (r: SearchResult) => {
      setActiveConversation(r.conversationId);
      onClose();
    },
    [setActiveConversation, onClose],
  );

  if (!isOpen) return null;

  const trimmedQuery = debouncedQuery.trim();
  const totalMessages = conversations.reduce(
    (n, c) => n + c.messages.length,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onMouseDown={(e) => {
        // Close on backdrop click only (not when clicking inside the modal).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search messages"
        className="global-search-enter w-full max-w-2xl max-h-[70vh] flex flex-col glass-card rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header / search input ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all messages…"
            className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
            aria-label="Search query"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">
            {trimmedQuery
              ? `${results.length} result${results.length === 1 ? '' : 's'}`
              : `${totalMessages} message${totalMessages === 1 ? '' : 's'}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="Close search"
            title="Esc to close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Result list ───────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto custom-scrollbar min-h-0"
        >
          {trimmedQuery === '' ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">Search across all conversations</p>
              <p className="mt-1 text-xs text-slate-500">
                Matches user &amp; assistant message content. Jump straight to the
                conversation.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>
                No results for{' '}
                <span className="text-slate-200 font-medium">
                  &ldquo;{trimmedQuery}&rdquo;
                </span>
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {results.map((r, i) => {
                const isActive = i === selectedIndex;
                const snippet = buildSnippet(
                  r.content,
                  r.matchIndex,
                  trimmedQuery.length,
                );
                const highlighted = highlightMatch(snippet, trimmedQuery);
                return (
                  <li key={`${r.conversationId}:${r.messageId}`}>
                    <button
                      type="button"
                      data-result-index={i}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => handleSelect(r)}
                      className={`w-full text-left px-4 py-2.5 flex flex-col gap-1 transition-colors border-l-2 ${
                        isActive
                          ? 'bg-slate-700/40 border-[color:var(--cm-primary)]'
                          : 'border-transparent hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="text-slate-200 font-medium truncate max-w-[45%]">
                          {r.conversationTitle || 'Untitled'}
                        </span>
                        <span className="opacity-40">·</span>
                        <span className="flex items-center gap-1 capitalize whitespace-nowrap">
                          <RoleIcon role={r.role} />
                          {roleLabel(r.role)}
                        </span>
                        <span className="opacity-40">·</span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(r.timestamp)}
                        </span>
                      </div>
                      <div
                        className="text-sm text-slate-200 line-clamp-2 break-words"
                        // XSS-safe: escapeHtml() ran first inside highlightMatch,
                        // then matches were wrapped in <mark>. User content cannot
                        // inject HTML here.
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500 bg-slate-900/40">
          <div className="flex items-center gap-3 flex-wrap">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Jump to conversation</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">
                Esc
              </kbd>
              to close
            </span>
          </div>
          {results.length >= MAX_RESULTS && (
            <span className="text-amber-400/80 whitespace-nowrap">
              Showing first {MAX_RESULTS} matches
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
