import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { fileCommands } from '../lib/tauri';
import { Brain, Search, Tag, Clock, X, Filter, Pin } from 'lucide-react';
import { AVAILABLE_TAGS } from './TagPicker';

// Format date for display
function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Show actual date for older
  return d.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export default function Sidebar() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    setActiveConversation,
    projectPath,
    setProjectPath,
    toggleMemoryPanel,
    showMemoryPanel,
    pinnedConversationIds,
    togglePinConversation,
    conversationTags,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  // Transient tag filter state (view-only — not persisted to the store).
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const handleNewChat = () => {
    createConversation();
  };

  const handleOpenProject = async () => {
    try {
      const path = await fileCommands.selectFolder();
      if (path) {
        setProjectPath(path);
      }
    } catch (e) {
      console.warn('Dialog failed (this is OK in some environments):', e);
      // Fallback: prompt user for path manually
      const path = prompt('Enter project path:');
      if (path) {
        setProjectPath(path);
      }
    }
  };

  const formatDate = (date: Date | string) => {
    return formatRelativeTime(new Date(date));
  };

  // Sort conversations: pinned first, then by most recently updated
  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = pinnedConversationIds.includes(a.id);
    const bPinned = pinnedConversationIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Derive the unique set of tags currently in use across all conversations,
  // along with a per-tag conversation count for the chip badges. Tag display
  // names come from TagPicker.AVAILABLE_TAGS (the only tag-definition source
  // in the codebase); any unknown tag ID falls back to its raw string.
  const uniqueTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const conv of conversations) {
      const tagIds = conversationTags[conv.id] || [];
      for (const tagId of tagIds) {
        counts.set(tagId, (counts.get(tagId) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        label: AVAILABLE_TAGS.find(t => t.id === id)?.label ?? id,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [conversations, conversationTags]);

  const hasActiveTags = activeTags.size > 0;

  const toggleTag = (tagId: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const clearTags = () => setActiveTags(new Set());

  // Filter conversations based on search query AND active tags (OR semantics
  // across active tags — a conversation matches if it has ANY active tag).
  const filteredConversations = sortedConversations.filter(conv => {
    if (hasActiveTags) {
      const convTags = conversationTags[conv.id] || [];
      if (!convTags.some(t => activeTags.has(t))) return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      conv.title.toLowerCase().includes(q) ||
      conv.messages.some(m => m.content.toLowerCase().includes(q))
    );
  });

  // Separate pinned and unpinned for display
  const pinnedConversations = filteredConversations.filter(c => pinnedConversationIds.includes(c.id));
  const unpinnedConversations = filteredConversations.filter(c => !pinnedConversationIds.includes(c.id));

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-dark-900/90 to-dark-900/70">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-dark-800/60">
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="group w-full py-2.5 px-4 cm-btn-primary rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-white/15 rounded text-xs font-mono text-white/80">
            ⌘N
          </kbd>
        </button>
      </div>

      {/* Project Section */}
      <div className="px-4 py-3 border-b border-dark-800/50">
        <button
          onClick={handleOpenProject}
          className="group w-full py-2.5 px-4 bg-dark-800/60 hover:bg-dark-700/70 rounded-xl text-sm font-medium transition-all duration-200 border border-dark-700/50 hover:border-dark-600/50 flex items-center gap-3"
        >
          {projectPath ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-dark-200 truncate block">Project Loaded</span>
              </div>
              <svg className="w-4 h-4 text-dark-500 group-hover:text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <span className="text-dark-300 group-hover:text-white transition-colors">Open Project</span>
            </>
          )}
        </button>
        
        {projectPath && (
          <p className="mt-2 text-xs text-dark-500 truncate px-1 flex items-center gap-1.5">
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{projectPath}</span>
          </p>
        )}
      </div>

      {/* Conversations List Header */}
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-dark-500 uppercase tracking-widest">
          Recent Chats
        </h3>
        {conversations.length > 0 && (
          <span className="text-[10px] bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full">
            {filteredConversations.length}/{conversations.length}
          </span>
        )}
      </div>

      {/* Search Input */}
      <div className="px-4 pb-2">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-[var(--cm-primary)] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-8 py-2 bg-dark-800/60 border border-dark-700/50 rounded-lg text-xs text-dark-200 placeholder-dark-600 focus:outline-none focus:border-[var(--cm-primary)] focus:bg-dark-800/80 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tag Filter Bar — hidden entirely when no conversations have tags */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          uniqueTags.length > 0 ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <Tag size={12} className="shrink-0 text-dark-500" />

            {/* All chip — clears the tag filter */}
            <button
              onClick={clearTags}
              className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                !hasActiveTags
                  ? 'bg-dark-700/60 text-dark-300 border-dark-600'
                  : 'border-dark-700/50 bg-dark-800/40 text-dark-400 hover:border-dark-600'
              }`}
            >
              All
              <span className="ml-1 text-[9px] opacity-70">{conversations.length}</span>
            </button>

            {/* Tag chips */}
            {uniqueTags.map(({ id, label, count }) => {
              const isActive = activeTags.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleTag(id)}
                  className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                    isActive
                      ? 'bg-[color-mix(in_srgb,var(--cm-primary)_18%,transparent)] border-[var(--cm-primary)] text-white'
                      : 'border-dark-700/50 bg-dark-800/40 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  {label}
                  <span className="ml-1 text-[9px] opacity-70">{count}</span>
                </button>
              );
            })}

            {/* Clear button — only visible when a tag filter is active */}
            {hasActiveTags && (
              <button
                onClick={clearTags}
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-dark-500 hover:text-dark-200 hover:bg-dark-700/60 transition-all"
                title="Clear tag filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        {conversations.length === 0 ? (
          /* Empty state */
          <div className="text-center py-10 px-4">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 cm-gradient-primary opacity-10 rounded-full blur-lg"></div>
              <div className="relative w-16 h-16 rounded-full bg-dark-800/80 border border-dark-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            
            <p className="text-sm font-medium text-dark-400 mb-1">No conversations yet</p>
            <p className="text-xs text-dark-600 mb-4">Start a new chat to begin</p>
            
            <button
              onClick={handleNewChat}
              className="text-xs cm-accent hover:opacity-80 font-medium transition-colors inline-flex items-center gap-1"
            >
              Create your first chat →
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          /* No search results state */
          <div className="text-center py-10 px-4">
            <div className="w-14 h-14 mx-auto mb-3 relative">
              <div className="relative w-14 h-14 rounded-full bg-dark-800/80 border border-dark-700 flex items-center justify-center">
                <Search size={20} className="text-dark-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-dark-400 mb-1">No results found</p>
            <p className="text-xs text-dark-600 mb-3">Try a different search term</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs cm-accent hover:opacity-80 font-medium transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Conversation list - filtered with pinned section */
          <div className="space-y-1">
            {/* Pinned Conversations Section */}
            {pinnedConversations.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-dark-500 uppercase tracking-wider sticky top-0 bg-dark-900/95 backdrop-blur-sm z-10">
                  <Pin size={10} className="cm-accent" />
                  Pinned ({pinnedConversations.length})
                </div>
                {pinnedConversations.map((conversation, index) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    index={index}
                    onSelect={() => setActiveConversation(conversation.id)}
                    onDelete={() => deleteConversation(conversation.id)}
                    onTogglePin={() => togglePinConversation(conversation.id)}
                    isPinned={true}
                    searchQuery={searchQuery}
                  />
                ))}
                
                {/* Separator */}
                {unpinnedConversations.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-dark-600 uppercase tracking-wider sticky top-6 bg-dark-900/95 backdrop-blur-sm z-10 border-t border-dark-800/50 mt-1 pt-2">
                    Recent
                  </div>
                )}
              </>
            )}
            
            {/* Unpinned/Recent Conversations */}
            {unpinnedConversations.map((conversation, index) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                index={index}
                onSelect={() => setActiveConversation(conversation.id)}
                onDelete={() => deleteConversation(conversation.id)}
                onTogglePin={() => togglePinConversation(conversation.id)}
                isPinned={false}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800/60 bg-dark-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg cm-gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-md"
              style={{ boxShadow: '0 4px 12px -4px var(--cm-primary)' }}
            >
              AI
            </div>
            <div>
              <p className="text-xs font-medium text-dark-300 leading-none">CodeMate</p>
              <p className="text-[10px] text-dark-500">Offline AI Assistant</p>
            </div>
          </div>
          
          <StatusIndicator />
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => toggleMemoryPanel()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
              showMemoryPanel 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'bg-dark-800/60 text-dark-400 hover:text-white hover:bg-dark-700/70 border border-dark-700/50'
            }`}
            title="Project Memory & Context"
          >
            <Brain size={14} className={showMemoryPanel ? 'text-purple-400' : ''} />
            <span>Memory</span>
          </button>
          
          <button
            onClick={() => {}}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-dark-800/60 text-dark-400 hover:text-white hover:bg-dark-700/70 border border-dark-700/50 transition-all duration-200"
            title="Search Conversations"
          >
            <Search size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Conversation Item Component
function ConversationItem({
  conversation,
  isActive,
  index,
  onSelect,
  onDelete,
  onTogglePin,
  isPinned = false,
  searchQuery = '',
}: {
  conversation: any; // Conversation type from store
  isActive: boolean;
  index: number;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin?: () => void;
  isPinned?: boolean;
  searchQuery?: string;
}) {
  // Get last message preview
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const messagePreview = lastMessage 
    ? lastMessage.content.slice(0, 80).replace(/\n/g, ' ')
    : 'No messages yet';
  
  // Count user vs assistant messages
  const userMessageCount = conversation.messages.filter((m: any) => m.role === 'user').length;

  // Highlight matching text (XSS-safe: escape HTML first, then wrap matches).
  const escapeHtml = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const highlightText = (text: string, query: string) => {
    const escaped = escapeHtml(text);
    if (!query) return escaped;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${safeQuery})`, 'gi');
    // Apply regex to the ESCAPED string so user content can never inject HTML.
    return escaped.replace(
      re,
      '<mark class="rounded px-0.5" style="background: color-mix(in srgb, var(--cm-primary) 30%, transparent); color: var(--cm-primary);">$1</mark>'
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-3 rounded-xl cursor-pointer transition-all duration-200
        ${isPinned 
          ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 hover:border-amber-400/40' 
          : isActive 
            ? 'border shadow-sm' 
            : 'hover:bg-dark-800/60 border border-transparent hover:border-dark-700/30'
        }
      `}
      style={{
        animationDelay: `${index * 50}ms`,
        ...(isActive && !isPinned ? {
          backgroundImage: 'linear-gradient(to right, color-mix(in srgb, var(--cm-primary) 15%, transparent), color-mix(in srgb, var(--cm-primary) 5%, transparent))',
          borderColor: 'color-mix(in srgb, var(--cm-primary) 30%, transparent)',
        } : {}),
      }}
    >
      {/* Active/Pinned indicator */}
      {isActive && !isPinned && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 cm-active-indicator rounded-r-full"></div>
      )}
      {isPinned && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-400 rounded-r-full"></div>
      )}

      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <p className={`font-medium text-sm truncate ${
              isActive ? 'text-white' : 'text-dark-200'
            }`}
            dangerouslySetInnerHTML={{ __html: highlightText(conversation.title, searchQuery) }}
            />
            
            {/* Message count badge */}
            {userMessageCount > 0 && (
              <span
                className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'cm-accent'
                    : 'bg-dark-700 text-dark-400'
                }`}
                style={isActive ? { backgroundColor: 'color-mix(in srgb, var(--cm-primary) 20%, transparent)' } : undefined}
              >
                {userMessageCount}
              </span>
            )}
          </div>
          
          {/* Meta info row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] ${isActive ? 'cm-accent opacity-80' : 'text-dark-500'}`}>
              {formatDate(conversation.updatedAt)}
            </span>
            
            {conversation.projectPath && (
              <>
                <span className="text-dark-700">•</span>
                <svg className="w-3 h-3 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </>
            )}
          </div>
          
          {/* Last message preview */}
          {lastMessage && (
            <p className={`text-xs line-clamp-2 leading-relaxed ${
              isActive ? 'text-dark-400' : 'text-dark-600'
            }`}
            dangerouslySetInnerHTML={{ __html: 
              (lastMessage.role === 'user' ? '<span class="text-dark-500 mr-1">You:</span>' : '<span class="mr-1" style="color: color-mix(in srgb, var(--cm-primary) 60%, transparent);">AI:</span>') +
              highlightText(messagePreview, searchQuery)
            }}
            />
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
          {/* Pin button */}
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                isPinned 
                  ? 'opacity-100 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10' 
                  : isActive 
                    ? 'opacity-100 text-dark-400 hover:text-amber-400 hover:bg-dark-700/50' 
                    : 'opacity-0 group-hover:opacity-100 text-dark-600 hover:text-amber-400 hover:bg-dark-700/50'
              }`}
              title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
            >
              <Pin size={14} className={isPinned ? 'fill-current' : ''} />
            </button>
          )}
          
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Use window.confirm with fallback
              try {
                if (window.confirm('Delete this conversation?')) {
                  onDelete();
                }
              } catch {
                // If confirm fails, just delete (or use a custom prompt)
                if (window.prompt('Type DELETE to confirm:') === 'DELETE') {
                  onDelete();
                }
              }
            }}
            className={`shrink-0 p-1.5 rounded-lg transition-all duration-150 ${
              isActive 
                ? 'opacity-100 text-dark-400 hover:text-red-400 hover:bg-red-500/10' 
                : 'opacity-0 group-hover:opacity-100 text-dark-600 hover:text-red-400 hover:bg-dark-700/50'
            }`}
            title="Delete conversation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Indicator Component
function StatusIndicator() {
  const { modelLoaded } = useStore();
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={`relative flex h-2 w-2`}>
        {modelLoaded ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </>
        ) : (
          <span className="inline-flex rounded-full h-2 w-2 bg-yellow-500 animate-pulse"></span>
        )}
      </span>
      <span className={`text-[10px] font-medium ${modelLoaded ? 'text-emerald-500' : 'text-yellow-500'}`}>
        {modelLoaded ? 'Ready' : 'Idle'}
      </span>
    </div>
  );
}

// Helper function for relative time formatting
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) return 'Just now';
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMinLabel(diffMins)} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHourLabel(diffHours)} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Fallback to formatted date
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function diffMinLabel(n: number): string {
  return n <= 1 ? 'min' : 'mins';
}

function diffHourLabel(n: number): string {
  return n <= 1 ? 'hour' : 'hours';
}
