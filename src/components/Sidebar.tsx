import React from 'react';
import { useStore } from '../store/useStore';
import { fileCommands } from '../lib/tauri';

export default function Sidebar() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    deleteConversation,
    setActiveConversation,
    projectPath,
    setProjectPath,
  } = useStore();

  const handleNewChat = () => {
    createConversation();
  };

  const handleOpenProject = async () => {
    const path = await fileCommands.selectFolder();
    if (path) {
      setProjectPath(path);
    }
  };

  const formatDate = (date: Date | string) => {
    return formatRelativeTime(new Date(date));
  };

  // Sort conversations by most recently updated
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-dark-900/90 to-dark-900/70">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-dark-800/60">
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="group w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40"
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
            {conversations.length}
          </span>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        {conversations.length === 0 ? (
          /* Empty state */
          <div className="text-center py-10 px-4">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-full blur-lg"></div>
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
              className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors inline-flex items-center gap-1"
            >
              Create your first chat →
            </button>
          </div>
        ) : (
          /* Conversation list */
          <div className="space-y-1">
            {sortedConversations.map((conversation, index) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                index={index}
                onSelect={() => setActiveConversation(conversation.id)}
                onDelete={() => deleteConversation(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800/60 bg-dark-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-primary-500/25">
              AI
            </div>
            <div>
              <p className="text-xs font-medium text-dark-300 leading-none">CodeMate</p>
              <p className="text-[10px] text-dark-500">Offline AI Assistant</p>
            </div>
          </div>
          
          <StatusIndicator />
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
}: {
  conversation: typeof import('../store/useStore').State extends { conversations: infer T } ? T : any;
  isActive: boolean;
  index: number;
  onSelect: () => void;
  onDelete: () => void;
}) {
  // Get last message preview
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const messagePreview = lastMessage 
    ? lastMessage.content.slice(0, 80).replace(/\n/g, ' ')
    : 'No messages yet';
  
  // Count user vs assistant messages
  const userMessageCount = conversation.messages.filter(m => m.role === 'user').length;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-3 rounded-xl cursor-pointer transition-all duration-200
        ${isActive 
          ? 'bg-gradient-to-r from-primary-600/15 to-primary-500/5 border border-primary-500/30 shadow-sm' 
          : 'hover:bg-dark-800/60 border border-transparent hover:border-dark-700/30'
        }
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full"></div>
      )}

      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <p className={`font-medium text-sm truncate ${
              isActive ? 'text-white' : 'text-dark-200'
            }`}>
              {conversation.title}
            </p>
            
            {/* Message count badge */}
            {userMessageCount > 0 && (
              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive 
                  ? 'bg-primary-500/20 text-primary-300' 
                  : 'bg-dark-700 text-dark-400'
              }`}>
                {userMessageCount}
              </span>
            )}
          </div>
          
          {/* Meta info row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] ${isActive ? 'text-primary-400/80' : 'text-dark-500'}`}>
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
            }`}>
              {lastMessage.role === 'user' ? (
                <span className="text-dark-500 mr-1">You:</span>
              ) : (
                <span className="text-primary-500/60 mr-1">AI:</span>
              )}
              {messagePreview}
            </p>
          )}
        </div>
        
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this conversation?')) {
              onDelete();
            }
          }}
          className={`shrink-0 p-1.5 -mr-1 -mt-1 rounded-lg transition-all duration-150 ${
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
