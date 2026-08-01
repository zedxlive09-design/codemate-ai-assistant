import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Check, Search, LayoutTemplate } from 'lucide-react';

/**
 * ConversationTemplatesModal
 *
 * A full-screen overlay modal that presents a grid of ~12 curated prompt
 * templates covering common coding tasks (explain, test, refactor, optimise,
 * document, generate, audit, etc.).
 *
 * Selecting a template copies its prompt text to the system clipboard and
 * shows a brief success state on the card before closing the modal. The user
 * then pastes the prompt into the ChatInput (Ctrl+V). This approach was chosen
 * because the ChatInput owns its `message` state locally and we cannot edit
 * either ChatInput or the shared store — clipboard copy works in both the
 * browser preview and the Tauri webview with zero coupling.
 *
 * Close interactions:
 *   - Escape key (global keydown listener, active only while open).
 *   - Click on the backdrop outside the modal card.
 *   - The header close (X) button.
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` + `aria-label` on the overlay.
 *   - Each template card is a real <button> with an descriptive aria-label.
 *   - Search input has an aria-label and an embedded visual icon.
 */

type TemplateCategory = 'Code Quality' | 'Testing' | 'Documentation' | 'Generation';

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  prompt: string;
}

/**
 * The curated template catalogue. Order matters only for the default
 * (un-filtered) view; grouping re-orders by category at render time.
 */
const TEMPLATES: readonly PromptTemplate[] = [
  {
    id: 'explain-code',
    title: 'Explain Code',
    description: 'Break down what this code does, step by step.',
    icon: '📖',
    category: 'Documentation',
    prompt: 'Explain what this code does, step by step:',
  },
  {
    id: 'unit-tests',
    title: 'Write Unit Tests',
    description: 'Generate unit tests covering the given function.',
    icon: '🧪',
    category: 'Testing',
    prompt: 'Write unit tests for this function, covering both happy-path and edge cases:',
  },
  {
    id: 'refactor',
    title: 'Refactor for Readability',
    description: 'Improve naming, structure and clarity without changing behaviour.',
    icon: '✨',
    category: 'Code Quality',
    prompt: 'Refactor this code for readability while preserving its behaviour:',
  },
  {
    id: 'error-handling',
    title: 'Add Error Handling',
    description: 'Wrap risky operations with proper guards and useful messages.',
    icon: '🛡️',
    category: 'Code Quality',
    prompt: 'Add error handling to this code. Use appropriate try/catch, validate inputs, and surface helpful error messages:',
  },
  {
    id: 'optimize',
    title: 'Optimize Performance',
    description: 'Identify bottlenecks and propose faster alternatives.',
    icon: '⚡',
    category: 'Code Quality',
    prompt: 'Optimize this code for performance. Explain each change and its expected impact:',
  },
  {
    id: 'inline-comments',
    title: 'Add Inline Comments',
    description: 'Annotate the logic with helpful, concise comments.',
    icon: '💬',
    category: 'Documentation',
    prompt: 'Add inline comments explaining the logic of this code. Focus on why, not what:',
  },
  {
    id: 'to-typescript',
    title: 'Convert to TypeScript',
    description: 'Port JS to TS with proper types and interfaces.',
    icon: '🔄',
    category: 'Code Quality',
    prompt: 'Convert this code to TypeScript. Add proper types and interfaces, and explain any behavioural changes:',
  },
  {
    id: 'find-bugs',
    title: 'Find & Fix Bugs',
    description: 'Locate potential bugs and propose concrete fixes.',
    icon: '🐛',
    category: 'Code Quality',
    prompt: 'Find and fix potential bugs in this code. Walk through each issue and the recommended fix:',
  },
  {
    id: 'write-regex',
    title: 'Write a Regex',
    description: 'Craft a regex that matches a described pattern.',
    icon: '🔣',
    category: 'Generation',
    prompt: 'Write a regex that matches ',
  },
  {
    id: 'generate-readme',
    title: 'Generate README',
    description: 'Produce a README covering setup, usage and features.',
    icon: '📄',
    category: 'Documentation',
    prompt: 'Generate a README for this project, including: overview, prerequisites, setup, usage, and features.',
  },
  {
    id: 'sql-query',
    title: 'Create SQL Query',
    description: 'Build a SQL query from a natural-language description.',
    icon: '🗄️',
    category: 'Generation',
    prompt: 'Create a SQL query that ',
  },
  {
    id: 'security-review',
    title: 'Security Review',
    description: 'Audit the code for vulnerabilities and suggest mitigations.',
    icon: '🔒',
    category: 'Code Quality',
    prompt: 'Review this code for security issues. For each finding, describe the risk and a concrete mitigation:',
  },
];

/** Render order for the category groupings. */
const CATEGORY_ORDER: readonly TemplateCategory[] = [
  'Code Quality',
  'Testing',
  'Documentation',
  'Generation',
];

const CATEGORY_BLURB: Readonly<Record<TemplateCategory, string>> = {
  'Code Quality': 'Refactor, optimise, harden and audit existing code.',
  Testing: 'Generate test coverage for your functions.',
  Documentation: 'Explain, annotate and document code and projects.',
  Generation: 'Produce new code snippets from a description.',
};

interface ConversationTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateGroup {
  category: TemplateCategory;
  items: PromptTemplate[];
}

export default function ConversationTemplatesModal({
  isOpen,
  onClose,
}: ConversationTemplatesModalProps) {
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  // Escape closes the overlay; lock background scroll while mounted.
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleEscape]);

  // Reset transient state when re-opened so a previous search/success state
  // doesn't leak between sessions.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCopiedId(null);
    }
  }, [isOpen]);

  // Clear any pending close-timer on unmount so we don't call onClose after
  // the consumer has already torn the modal down.
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo<TemplateGroup[]>(() => {
    const buckets = new Map<TemplateCategory, PromptTemplate[]>();
    for (const cat of CATEGORY_ORDER) buckets.set(cat, []);
    for (const t of filtered) {
      const list = buckets.get(t.category);
      if (list) list.push(t);
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: buckets.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const handleSelect = useCallback(
    async (template: PromptTemplate) => {
      // Primary path: async Clipboard API. Available in secure contexts
      // (https, localhost, and the Tauri webview which is served over tauri://).
      let copied = false;
      try {
        await navigator.clipboard.writeText(template.prompt);
        copied = true;
      } catch (e) {
        // Fall back to a hidden textarea + execCommand so the modal is still
        // useful in older / insecure contexts (e.g. the Vite dev server over
        // plain HTTP behind a proxy).
        try {
          const ta = document.createElement('textarea');
          ta.value = template.prompt;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '0';
          ta.style.left = '0';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copied = true;
        } catch (err) {
          console.error('ConversationTemplatesModal: clipboard copy failed', err);
        }
      }

      if (!copied) return;

      // Brief success state on the card, then close.
      setCopiedId(template.id);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        setCopiedId(null);
        copiedTimerRef.current = null;
        onClose();
      }, 650);
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Prompt templates"
      onClick={onClose}
    >
      <div
        className="templates-enter w-full max-w-2xl max-h-[75vh] flex flex-col glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50 shrink-0">
          <div className="w-8 h-8 rounded-lg cm-gradient-primary flex items-center justify-center shrink-0">
            <LayoutTemplate size={15} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white leading-tight">
              Prompt Templates
            </h3>
            <p className="text-[11px] text-dark-500 truncate leading-tight mt-0.5">
              {TEMPLATES.length} curated prompts for common coding tasks
            </p>
          </div>

          {/* Search */}
          <div className="relative w-40 sm:w-56 shrink-0">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
              aria-label="Search prompt templates"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/70 border border-slate-700/60 rounded-lg text-xs text-white placeholder-dark-500 focus:outline-none focus:border-[var(--cm-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cm-primary)_25%,transparent)] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt templates"
            title="Close (Esc)"
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800/60 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable grid grouped by category */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Search size={28} className="text-dark-700 mb-3" aria-hidden="true" />
              <p className="text-sm text-dark-400 font-medium">
                No templates match &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-dark-600 mt-1">Try a different keyword.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <section key={group.category}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-dark-400">
                      {group.category}
                    </h4>
                    <span className="text-[10px] text-dark-600 tabular-nums">
                      ({group.items.length})
                    </span>
                    <div
                      className="flex-1 h-px bg-slate-700/40"
                      role="presentation"
                    />
                  </div>
                  <p className="text-[11px] text-dark-600 mb-2.5 -mt-0.5">
                    {CATEGORY_BLURB[group.category]}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.items.map((t) => {
                      const isCopied = copiedId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelect(t)}
                          aria-label={`Copy template: ${t.title}. ${t.description}`}
                          title={t.prompt}
                          className={[
                            'template-card group text-left p-3 rounded-xl border bg-slate-800/40 hover:bg-slate-800/70',
                            'transition-all',
                            isCopied
                              ? 'border-emerald-500/60 ring-2 ring-emerald-500/30'
                              : 'border-slate-700/50 hover:border-[var(--cm-primary)] hover:ring-2 hover:ring-[color-mix(in_srgb,var(--cm-primary)_22%,transparent)]',
                          ].join(' ')}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className="text-xl leading-none shrink-0 mt-0.5 select-none"
                              aria-hidden="true"
                            >
                              {t.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white truncate">
                                  {t.title}
                                </span>
                                {isCopied && (
                                  <Check
                                    size={12}
                                    className="text-emerald-400 shrink-0"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-dark-500 leading-snug mt-0.5 line-clamp-2">
                                {isCopied
                                  ? 'Copied! Paste in the chat input (Ctrl+V).'
                                  : t.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Footer — usage hint */}
        <div className="px-5 py-2.5 border-t border-slate-700/50 flex items-center justify-between gap-3 shrink-0 bg-slate-900/40">
          <p className="text-[11px] text-dark-500 flex items-center gap-1.5 min-w-0">
            <span aria-hidden="true">💡</span>
            <span className="truncate">
              Click a template to copy &mdash; then paste in the chat input
            </span>
          </p>
          <span className="text-[10px] text-dark-600 hidden sm:inline shrink-0">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Esc</kbd>{' '}
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
