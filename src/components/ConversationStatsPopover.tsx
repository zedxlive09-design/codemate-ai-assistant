import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { BarChart3, BookOpen, X } from 'lucide-react';
import type { Conversation, Message } from '../types';

interface ConversationStatsPopoverProps {
  // The conversation to compute stats for.
  conversation: Conversation;
}

type Role = Message['role'];

interface RoleMeta {
  label: string;
  text: string;
  bar: string;
}

const ROLE_META: Record<Role, RoleMeta> = {
  user: { label: 'User', text: 'text-cyan-300', bar: 'bg-cyan-400' },
  assistant: { label: 'Assistant', text: 'text-violet-300', bar: 'bg-violet-400' },
  system: { label: 'System', text: 'text-slate-300', bar: 'bg-slate-400' },
};

const ROLE_ORDER: Role[] = ['user', 'assistant', 'system'];

/**
 * Defensive timestamp → Date. The persisted store can hold timestamps as either
 * Date instances (live state) or ISO strings (rehydrated from localStorage), so
 * normalise before calling .getTime().
 */
function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

/** Whitespace-split word count, matching the heuristic used in ChatInput. */
function countWords(text: string): number {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Human-friendly duration (e.g. "3m 12s", "1h 5m", "2d 4h"). */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const totalSecs = Math.floor(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const remSecs = totalSecs % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-dark-500">{label}</div>
      <div className="text-base font-semibold cm-accent leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-dark-500 leading-tight">{sub}</div>}
    </div>
  );
}

/**
 * ConversationStatsPopover
 *
 * Self-contained trigger button + popover that surfaces aggregate stats for the
 * active conversation: message/word/char/token totals, role breakdown with a
 * small proportional bar chart, average + longest message, and the elapsed time
 * between the first and last message.
 *
 * Open/close behaviour:
 *  - Click the trigger to toggle.
 *  - Escape closes.
 *  - Click-outside the wrapper closes.
 *
 * The trigger button mirrors the styling of the chat-header Export button so
 * the two read as a single toolbar.
 */
export default function ConversationStatsPopover({ conversation }: ConversationStatsPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const messages = conversation.messages ?? [];
    const roleCounts: Record<Role, number> = { user: 0, assistant: 0, system: 0 };
    let totalWords = 0;
    let totalChars = 0;
    let longestWords = 0;
    let longestRole: Role | null = null;

    for (const msg of messages) {
      const role: Role = msg.role;
      if (roleCounts[role] !== undefined) roleCounts[role] += 1;
      const words = countWords(msg.content);
      const chars = (msg.content ?? '').length;
      totalWords += words;
      totalChars += chars;
      if (words > longestWords) {
        longestWords = words;
        longestRole = role;
      }
    }

    const totalMessages = messages.length;
    const avgWords = totalMessages > 0 ? totalWords / totalMessages : 0;
    // ~4 chars/token — same heuristic used by the ChatInput live counter (round 5).
    const approxTokens = Math.ceil(totalChars / 4);

    let durationMs = 0;
    let hasDuration = false;
    if (messages.length >= 2) {
      const first = toDate(messages[0].timestamp).getTime();
      const last = toDate(messages[messages.length - 1].timestamp).getTime();
      if (Number.isFinite(first) && Number.isFinite(last)) {
        durationMs = Math.abs(last - first);
        hasDuration = true;
      }
    }

    return {
      totalMessages,
      roleCounts,
      totalWords,
      totalChars,
      approxTokens,
      avgWords,
      longestWords,
      longestRole,
      durationMs,
      hasDuration,
      // Reading-time estimate: ~200 words/minute for English prose.
      readingTimeMin: totalWords / 200,
    };
  }, [conversation.messages]);

  // Escape closes the popover.
  const handleEscape = useCallback((e: globalThis.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleEscape]);

  // Click outside the wrapper closes the popover.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: globalThis.MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const toggle = () => setOpen(prev => !prev);

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Longest bar in the role chart = max single-role count (so the dominant role
  // fills the track and others scale proportionally).
  const maxRoleCount = Math.max(
    stats.roleCounts.user,
    stats.roleCounts.assistant,
    stats.roleCounts.system,
    1
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Conversation statistics"
        title="Conversation statistics"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-700/50 bg-slate-800/40 hover:bg-[color-mix(in_srgb,var(--cm-primary)_15%,transparent)] hover:border-[var(--cm-primary)] text-slate-300 hover:text-white transition-all"
      >
        <BarChart3 size={12} />
        <span className="hidden sm:inline">Stats</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Conversation statistics"
          className="stats-popover stats-popover-enter absolute top-full right-0 mt-2 z-50 w-80 glass-card rounded-2xl p-4 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="cm-accent" />
              <h3 className="text-sm font-semibold text-white">Conversation Stats</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close statistics"
              className="text-slate-400 hover:text-white transition-colors p-0.5"
            >
              <X size={14} />
            </button>
          </div>

          {/* Stat grid (2 columns) */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total Messages" value={formatNumber(stats.totalMessages)} />
            <StatCard label="Total Words" value={formatNumber(stats.totalWords)} />
            <StatCard label="Total Characters" value={formatNumber(stats.totalChars)} />
            <StatCard label="Approx. Tokens" value={formatNumber(stats.approxTokens)} />
            <StatCard label="Avg Length" value={`${formatNumber(stats.avgWords)}w`} />
            <StatCard
              label="Longest Message"
              value={stats.longestRole ? `${formatNumber(stats.longestWords)}w` : '—'}
              sub={stats.longestRole ? ROLE_META[stats.longestRole].label : undefined}
            />
          </div>

          {/* Reading-time estimate (round 11) */}
          <div className="mt-3 px-3 py-2 rounded-lg bg-[color-mix(in_srgb,var(--cm-primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--cm-primary)_20%,transparent)] flex items-center gap-2">
            <BookOpen size={14} className="cm-accent shrink-0" />
            <span className="text-[11px] text-slate-300">Reading time</span>
            <span className="ml-auto text-[11px] cm-accent font-medium tabular-nums">
              {stats.readingTimeMin < 1
                ? `${Math.max(1, Math.round(stats.readingTimeMin * 60))}s`
                : stats.readingTimeMin < 60
                  ? `${Math.round(stats.readingTimeMin)}m`
                  : `${Math.floor(stats.readingTimeMin / 60)}h ${Math.round(stats.readingTimeMin % 60)}m`}
            </span>
          </div>

          {/* Role breakdown bar chart */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-dark-500">Role Breakdown</span>
              <span className="text-[11px] text-dark-500">messages</span>
            </div>
            <div className="space-y-1.5">
              {ROLE_ORDER.map(role => {
                const meta = ROLE_META[role];
                const count = stats.roleCounts[role];
                const pct = stats.totalMessages > 0 ? (count / stats.totalMessages) * 100 : 0;
                const widthPct = (count / maxRoleCount) * 100;
                return (
                  <div key={role} className="flex items-center gap-2">
                    <span className={`w-16 shrink-0 text-[11px] ${meta.text}`}>{meta.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className={`h-full ${meta.bar} rounded-full transition-all duration-300`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] text-slate-300">
                      {count}
                      <span className="text-dark-500"> ({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversation duration (first → last message) */}
          {stats.hasDuration && (
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-dark-500">Conversation Duration</span>
                <span className="cm-accent font-medium">{formatDuration(stats.durationMs)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
