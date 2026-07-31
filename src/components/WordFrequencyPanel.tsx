import { useMemo, useEffect, useCallback } from 'react';
import { Type, X } from 'lucide-react';
import type { Conversation } from '../types';

interface WordFrequencyPanelProps {
  /** The conversation whose messages will be analysed. */
  conversation: Conversation;
  /** Whether the overlay is currently open. */
  isOpen: boolean;
  /** Called when the user requests the panel to close (Escape / backdrop / X). */
  onClose: () => void;
}

/**
 * Stop-word list — common English function words that carry little topical
 * signal. Filtered out before counting so the top-30 list surfaces
 * meaningful terms rather than "the / and / to / of / a".
 */
const STOP_WORDS: ReadonlySet<string> = new Set<string>([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'up',
  'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this',
  'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
]);

interface WordFreqEntry {
  word: string;
  count: number;
}

interface WordFreqAnalysis {
  /** Top-N (30) words by frequency, descending. */
  topWords: WordFreqEntry[];
  /** Total number of analysed (post-filter) tokens. */
  totalWords: number;
  /** Number of distinct analysed tokens. */
  uniqueWords: number;
  /** Highest single-word count — used to scale the bar chart. */
  maxCount: number;
}

const MAX_TOP_WORDS = 30;

/**
 * Tokenise → filter → count → rank the active conversation's message text.
 *
 * Tokenisation splits on any run of non-alphanumeric characters (whitespace
 * and punctuation), lowercases the result, and discards:
 *   - empty tokens
 *   - tokens shorter than 3 characters
 *   - pure numeric tokens (e.g. "42", "1000")
 *   - English stop words (see STOP_WORDS)
 *
 * The returned totals (`totalWords`, `uniqueWords`) are computed over this
 * filtered set, so `uniqueWords / totalWords` is a coherent lexical
 * diversity ratio of the meaningful vocabulary.
 */
function analyzeConversation(conversation: Conversation): WordFreqAnalysis {
  const counts = new Map<string, number>();
  let totalWords = 0;

  for (const msg of conversation.messages) {
    const content = msg.content ?? '';
    if (!content) continue;
    // Split on any non-alphanumeric run (whitespace + punctuation). Underscores
    // are intentionally kept so identifiers like `useState` survive intact.
    const tokens = content.toLowerCase().split(/[^a-z0-9_]+/);
    for (const raw of tokens) {
      const token = raw.trim();
      if (!token) continue;
      totalWords += 1;
      if (token.length < 3) continue;
      if (/^\d+$/.test(token)) continue; // pure number
      if (STOP_WORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  const entries: WordFreqEntry[] = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      // Stable tie-break: alphabetical, so the top-30 is deterministic.
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });

  const topWords = entries.slice(0, MAX_TOP_WORDS);
  const maxCount = topWords.length > 0 ? topWords[0].count : 0;

  return {
    topWords,
    totalWords,
    uniqueWords: counts.size,
    maxCount,
  };
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

/**
 * WordFrequencyPanel
 *
 * A full-screen overlay modal that analyses word usage across the active
 * conversation's messages and renders a horizontal bar-chart breakdown of
 * the top 30 most frequent (non-stop-word) terms, plus a footer summarising
 * total words, unique words, and lexical diversity.
 *
 * Close interactions:
 *   - Escape key (global keydown listener, active only while open).
 *   - Click on the backdrop outside the modal card.
 *   - The header close (X) button.
 *
 * The analysis is memoised on `conversation.messages`, so it only recomputes
 * when the message list actually changes — not on every render.
 */
export default function WordFrequencyPanel({
  conversation,
  isOpen,
  onClose,
}: WordFrequencyPanelProps) {
  const analysis = useMemo<WordFreqAnalysis>(
    () => analyzeConversation(conversation),
    [conversation.messages],
  );

  // Escape closes the overlay (listener attached only while open).
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleEscape);
    // Lock background scroll while the modal is mounted.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const lexicalDiversityPct =
    analysis.totalWords > 0
      ? (analysis.uniqueWords / analysis.totalWords) * 100
      : 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Word frequency analysis"
      onClick={onClose}
    >
      <div
        className="word-freq-enter w-full max-w-2xl max-h-[80vh] flex flex-col glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg cm-gradient-primary flex items-center justify-center shrink-0">
              <Type size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white leading-tight">
                Word Frequency
              </h3>
              <p
                className="text-[11px] text-dark-500 truncate leading-tight mt-0.5"
                title={conversation.title}
              >
                {conversation.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close word frequency panel"
            title="Close (Esc)"
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800/60 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable list of top words */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {analysis.topWords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Type size={28} className="text-dark-700 mb-3" />
              <p className="text-sm text-dark-400 font-medium">No analysable words yet</p>
              <p className="text-[11px] text-dark-600 mt-1 max-w-xs">
                Send a few messages with substantive content and the top terms will appear here.
              </p>
            </div>
          ) : (
            <ol className="space-y-2">
              {analysis.topWords.map((entry, i) => {
                const rank = i + 1;
                const sharePct =
                  analysis.totalWords > 0
                    ? (entry.count / analysis.totalWords) * 100
                    : 0;
                const barPct =
                  analysis.maxCount > 0
                    ? (entry.count / analysis.maxCount) * 100
                    : 0;
                return (
                  <li
                    key={entry.word}
                    className="flex items-center gap-3"
                  >
                    <span className="w-7 shrink-0 text-[11px] text-dark-500 text-right tabular-nums font-medium">
                      #{rank}
                    </span>
                    <span
                      className="w-32 shrink-0 text-xs font-mono text-slate-200 truncate"
                      title={entry.word}
                    >
                      {entry.word}
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden"
                      role="presentation"
                    >
                      <div
                        className="word-freq-bar h-full rounded-full"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: 'var(--cm-primary)',
                        }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-[11px] text-slate-300 tabular-nums">
                      {formatNumber(entry.count)}
                      <span className="text-dark-500">
                        {' '}({sharePct.toFixed(1)}%)
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer — aggregate summary */}
        <div className="px-5 py-3 border-t border-slate-700/50 grid grid-cols-3 gap-3 text-center shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-dark-500">
              Total Words
            </div>
            <div className="text-sm font-semibold cm-accent tabular-nums">
              {formatNumber(analysis.totalWords)}
            </div>
          </div>
          <div className="border-x border-slate-700/40">
            <div className="text-[10px] uppercase tracking-wider text-dark-500">
              Unique Words
            </div>
            <div className="text-sm font-semibold cm-accent tabular-nums">
              {formatNumber(analysis.uniqueWords)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-dark-500">
              Lexical Diversity
            </div>
            <div className="text-sm font-semibold cm-accent tabular-nums">
              {lexicalDiversityPct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
