/**
 * FeatureShowcase
 * ---------------
 * A visually rich grid of "what CodeMate can do" cards shown over the
 * empty-chat / welcome state. Each card has a gradient icon, title, and a
 * one-line description, with a subtle hover lift + glow.
 *
 * Rendered by App.tsx as a centered overlay (absolute inset-0) on top of
 * <ChatArea /> when there is no active conversation or the active
 * conversation has zero messages. Hides automatically once a real
 * conversation begins.
 */

import React from 'react';
import {
  BrainCircuit,
  Code2,
  FolderTree,
  TerminalSquare,
  Cpu,
  Bookmark,
  GitBranch,
  Palette,
  type LucideIcon,
} from 'lucide-react';

interface ShowcaseCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the icon tile. */
  iconGradient: string;
  /** Tailwind classes for the per-card glow on hover. */
  glow: string;
  /** Tailwind text color for the icon glyph. */
  iconColor: string;
  /** Tailwind ring color used on hover. */
  ringHover: string;
}

const CARDS: ShowcaseCard[] = [
  {
    id: 'local-ai-chat',
    title: 'Local AI Chat',
    description: 'Private, offline conversations powered by local LLMs.',
    icon: BrainCircuit,
    iconGradient: 'from-cyan-500 to-blue-600',
    glow: 'group-hover:shadow-cyan-500/25',
    iconColor: 'text-cyan-300',
    ringHover: 'hover:border-cyan-500/40',
  },
  {
    id: 'code-generation',
    title: 'Code Generation',
    description: 'Write, refactor, and explain code in any language.',
    icon: Code2,
    iconGradient: 'from-violet-500 to-purple-600',
    glow: 'group-hover:shadow-violet-500/25',
    iconColor: 'text-violet-300',
    ringHover: 'hover:border-violet-500/40',
  },
  {
    id: 'file-explorer',
    title: 'File Explorer',
    description: 'Browse, read, and edit project files without leaving the app.',
    icon: FolderTree,
    iconGradient: 'from-amber-500 to-orange-600',
    glow: 'group-hover:shadow-amber-500/25',
    iconColor: 'text-amber-300',
    ringHover: 'hover:border-amber-500/40',
  },
  {
    id: 'terminal',
    title: 'Integrated Terminal',
    description: 'Run shell commands and scripts inside the workspace.',
    icon: TerminalSquare,
    iconGradient: 'from-slate-500 to-slate-700',
    glow: 'group-hover:shadow-slate-400/20',
    iconColor: 'text-slate-200',
    ringHover: 'hover:border-slate-400/40',
  },
  {
    id: 'model-manager',
    title: 'Model Manager',
    description: 'Load, validate, and swap GGUF models with one click.',
    icon: Cpu,
    iconGradient: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-emerald-500/25',
    iconColor: 'text-emerald-300',
    ringHover: 'hover:border-emerald-500/40',
  },
  {
    id: 'snippets',
    title: 'Snippets Library',
    description: 'Save reusable code blocks and insert them anywhere.',
    icon: Bookmark,
    iconGradient: 'from-yellow-500 to-amber-600',
    glow: 'group-hover:shadow-yellow-500/25',
    iconColor: 'text-yellow-300',
    ringHover: 'hover:border-yellow-500/40',
  },
  {
    id: 'git-integration',
    title: 'Git Integration',
    description: 'Stage, commit, and review diffs without context-switching.',
    icon: GitBranch,
    iconGradient: 'from-rose-500 to-pink-600',
    glow: 'group-hover:shadow-rose-500/25',
    iconColor: 'text-rose-300',
    ringHover: 'hover:border-rose-500/40',
  },
  {
    id: 'themes',
    title: 'Themes & Polish',
    description: 'Custom accent palettes and glassmorphic UI surfaces.',
    icon: Palette,
    iconGradient: 'from-fuchsia-500 to-purple-600',
    glow: 'group-hover:shadow-fuchsia-500/25',
    iconColor: 'text-fuchsia-300',
    ringHover: 'hover:border-fuchsia-500/40',
  },
];

export default function FeatureShowcase() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 overflow-y-auto z-10 pointer-events-none">
      <div className="w-full max-w-4xl my-auto pointer-events-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-semibold tracking-wide mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Everything CodeMate can do
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
              A complete offline AI dev workspace
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Pick a feature to explore — start a chat, load a model, or open any
            panel from the toolbar.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`
                  group relative p-4 rounded-xl border border-slate-700/60
                  bg-slate-900/70 backdrop-blur-sm
                  transition-all duration-200
                  hover:-translate-y-1 hover:bg-slate-800/80
                  hover:shadow-xl ${card.glow} ${card.ringHover}
                  cursor-default overflow-hidden
                `}
              >
                {/* Decorative gradient blob in the corner (subtle). */}
                <div
                  className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.iconGradient} opacity-10 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-20`}
                  aria-hidden="true"
                />

                {/* Gradient icon tile */}
                <div
                  className={`
                    relative inline-flex items-center justify-center w-11 h-11
                    rounded-xl bg-gradient-to-br ${card.iconGradient}
                    shadow-lg mb-3 transition-transform duration-300
                    group-hover:scale-110
                  `}
                >
                  <Icon className={`w-5 h-5 text-white`} strokeWidth={2} />
                </div>

                <h3 className="text-sm font-semibold text-white mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {card.description}
                </p>

                {/* Hover underline accent */}
                <div
                  className={`mt-3 h-px w-0 bg-gradient-to-r ${card.iconGradient} transition-all duration-300 group-hover:w-full`}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="text-center mt-8 text-[11px] text-slate-500">
          <span className="font-mono text-slate-400">Tip:</span> press{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px] border border-slate-700">
            Ctrl+K
          </kbd>{' '}
          to open the command palette.
        </div>
      </div>
    </div>
  );
}
