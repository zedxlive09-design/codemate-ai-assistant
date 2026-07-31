import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
// Lazy-load MessageBubble so the heavy markdown stack
// (react-markdown + react-syntax-highlighter + prismjs + micromark ecosystem,
// ~766 kB / 268 kB gzip as `vendor-markdown`) is split into an async chunk
// that is only fetched once a conversation actually has messages to render.
const MessageBubble = React.lazy(() => import('./MessageBubble'));
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import ConversationStatsPopover from './ConversationStatsPopover';
import WordFrequencyPanel from './WordFrequencyPanel';
import { exportConversationToMarkdown, exportConversationsToJson, downloadFile } from '../lib/conversationExport';
import { Brain, Clock, MessageSquare, Sparkles, Download, ChevronDown, FileText, FileJson, Type } from 'lucide-react';

/**
 * Lightweight placeholder shown while the lazy MessageBubble (and its
 * markdown chunk) is loading. Deliberately avoids importing the markdown
 * stack — uses only Tailwind + the existing `.skeleton-line` CSS class.
 * Mirrors the visual rhythm of an AI message bubble: avatar circle + a
 * couple of shimmering text lines.
 */
function MessageBubbleSkeleton() {
  return (
    <div className="flex justify-start message-animate">
      <div className="max-w-[85%] flex items-start gap-3">
        {/* Avatar circle */}
        <div className="w-6 h-6 rounded-full cm-gradient-primary shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          {/* Two skeleton lines simulating message text */}
          <div className="skeleton-line h-3 w-64 max-w-full" />
          <div className="skeleton-line h-3 w-48 max-w-full" />
          <div className="skeleton-line h-3 w-40 max-w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ChatArea() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    projectPath,
    showMemoryPanel,
  } = useStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showWordFreq, setShowWordFreq] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Close the export dropdown when clicking outside it.
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  // Create new chat if none exists
  const handleStartChat = () => {
    createConversation('New Conversation');
  };

  // Empty state - Show Welcome Screen
  if (!activeConversation) {
    return <WelcomeScreen onStartChat={handleStartChat} />;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header - Enhanced with Glassmorphism */}
      <div className="px-4 py-3 border-b border-dark-800/70 bg-dark-900/60 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Animated gradient icon background */}
          <div className="relative">
            <div className="absolute inset-0 cm-gradient-primary opacity-30 rounded-xl blur-lg"></div>
            <div
              className="relative w-10 h-10 rounded-xl cm-gradient-primary flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 8px 24px -8px var(--cm-primary)' }}
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <div>
            <h2 className="font-semibold text-white truncate flex items-center gap-2">
              {activeConversation.title}
              {projectPath && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/20">
                  <Sparkles size={10} />
                  Project Context
                </span>
              )}
            </h2>
            {activeConversation.projectPath && (
              <p className="text-xs text-dark-500 mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {activeConversation.projectPath.split('/').pop()}
              </p>
            )}
          </div>
        </div>

        {/* Chat stats - Enhanced */}
        <div className="flex items-center gap-4">
          {/* Memory Active Indicator */}
          {showMemoryPanel && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/15 border border-purple-500/25 rounded-lg">
              <Brain size={12} className="text-purple-400 animate-pulse" />
              <span className="text-[11px] font-medium text-purple-300">Memory Active</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-xs text-dark-500">
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {activeConversation.messages.length} messages
            </span>
            <span className="text-dark-700">•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              <time dateTime={activeConversation.updatedAt instanceof Date ? activeConversation.updatedAt.toISOString() : String(activeConversation.updatedAt)}>
                {formatRelativeTime(activeConversation.updatedAt instanceof Date ? activeConversation.updatedAt : new Date(activeConversation.updatedAt))}
              </time>
            </span>
          </div>

          {/* Stats + Export (round 6-7) */}
          {activeConversation.messages.length > 0 && (
            <>
              <ConversationStatsPopover conversation={activeConversation} />

              {/* Word Frequency analysis (round 10 — Task 16-a) */}
              <button
                type="button"
                onClick={() => setShowWordFreq(true)}
                aria-haspopup="dialog"
                aria-label="Word frequency analysis"
                title="Word frequency analysis"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-700/50 bg-slate-800/40 hover:bg-[color-mix(in_srgb,var(--cm-primary)_15%,transparent)] hover:border-[var(--cm-primary)] text-slate-300 hover:text-white transition-all"
              >
                <Type size={12} />
                <span className="hidden sm:inline">Words</span>
              </button>

              {/* Export dropdown: Markdown + JSON (round 7) */}
              <div ref={exportMenuRef} className="relative">
                <button
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-700/50 bg-slate-800/40 hover:bg-[color-mix(in_srgb,var(--cm-primary)_15%,transparent)] hover:border-[var(--cm-primary)] text-slate-300 hover:text-white transition-all"
                  title="Export this conversation"
                  aria-label="Export conversation"
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown size={10} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportMenuOpen && (
                  <div
                    role="menu"
                    className="stats-popover-enter absolute right-0 top-full mt-1 w-44 glass-card rounded-xl border border-slate-700/50 shadow-xl overflow-hidden z-50"
                  >
                    <button
                      onClick={async () => {
                        setExportMenuOpen(false);
                        try {
                          const md = exportConversationToMarkdown(activeConversation);
                          const safeTitle = activeConversation.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'conversation';
                          await downloadFile(md, `${safeTitle}.md`, 'text/markdown');
                        } catch (e) {
                          console.error('Export failed:', e);
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-[color-mix(in_srgb,var(--cm-primary)_15%,transparent)] hover:text-white transition-colors text-left"
                      role="menuitem"
                    >
                      <FileText size={13} className="text-slate-400" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={async () => {
                        setExportMenuOpen(false);
                        try {
                          const json = exportConversationsToJson([activeConversation]);
                          const safeTitle = activeConversation.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'conversation';
                          await downloadFile(json, `${safeTitle}.json`, 'application/json');
                        } catch (e) {
                          console.error('Export failed:', e);
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-[color-mix(in_srgb,var(--cm-primary)_15%,transparent)] hover:text-white transition-colors text-left border-t border-slate-700/40"
                      role="menuitem"
                    >
                      <FileJson size={13} className="text-slate-400" />
                      <span>JSON (.json)</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {activeConversation.messages.length === 0 ? (
          /* Empty chat state - Enhanced */
          <div className="flex items-center justify-center h-full text-dark-500 slide-up">
            <div className="text-center max-w-md">
              {/* Empty state illustration - Animated */}
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/30 via-purple-500/20 to-pink-500/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute inset-4 cm-gradient-primary opacity-20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }}></div>
                <div className="relative w-full h-full rounded-full bg-dark-800/90 border border-dark-700 flex items-center justify-center shadow-2xl">
                  <MessageSquare className="w-10 h-10 text-dark-600" />
                </div>
              </div>
              <p className="text-xl font-semibold text-dark-300 mb-2">No messages yet</p>
              <p className="text-sm text-dark-600 mb-6">Start a conversation by typing below or try a suggestion</p>
              
              {/* Suggestion chips - Enhanced */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  { icon: '💡', label: 'Explain this code' },
                  { icon: '🐛', label: 'Help me debug' },
                  { icon: '✨', label: 'Write a function' },
                  { icon: '⚡', label: 'Optimize performance' },
                  { icon: '🔄', label: 'Refactor code' },
                  { icon: '📝', label: 'Add comments' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.label}
                    onClick={() => handleStartChat()}
                    className="group px-4 py-2.5 text-xs bg-dark-800/80 hover:bg-[color-mix(in_srgb,var(--cm-primary)_15%,transparent)] border border-dark-700 hover:border-[var(--cm-primary)] rounded-xl transition-all duration-300 text-dark-400 hover:text-white hover:-translate-y-0.5"
                  >
                    <span className="mr-1.5">{suggestion.icon}</span>
                    {suggestion.label}
                  </button>
                ))}
              </div>

              {/* Pro tip */}
              <div className="mt-8 p-3 bg-dark-800/50 rounded-lg border border-dark-700/50">
                <p className="text-[11px] text-dark-500 flex items-center justify-center gap-1.5">
                  <Sparkles size={12} className="cm-accent" />
                  <span>Pro tip: Open a project folder to enable context-aware responses</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Messages list */
          <div className="max-w-4xl mx-auto space-y-4">
            {activeConversation.messages.map((message, index) => (
              <div 
                key={message.id}
                className={`message-animate ${index === 0 ? '' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Per-message keyed Suspense: one loading bubble doesn't block
                    others, and the markdown chunk only needs to load once. */}
                <React.Suspense fallback={<MessageBubbleSkeleton />}>
                  <MessageBubble message={message} />
                </React.Suspense>
                
                {/* Add subtle separator between messages */}
                {index < (activeConversation.messages.length - 1) && (
                  <div className="my-4 mx-8 h-px bg-gradient-to-r from-transparent via-dark-800 to-transparent opacity-50" />
                )}
              </div>
            ))}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput conversationId={activeConversation.id} />

      {/* Word Frequency overlay (round 10 — Task 16-a). Fixed-positioned,
          so it just needs to live somewhere in the tree. */}
      <WordFrequencyPanel
        conversation={activeConversation}
        isOpen={showWordFreq}
        onClose={() => setShowWordFreq(false)}
      />
    </div>
  );
}

// Helper: Format time relatively
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) return 'Just now';
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Fallback to formatted date
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
