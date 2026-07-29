import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  shortcut?: string;
  category: 'chat' | 'code' | 'file' | 'ai' | 'system';
  action: () => void;
}

export default function QuickActionsPanel() {
  const {
    toggleSidebar,
    toggleSettings,
    toggleFileExplorer,
    toggleModelManager,
    toggleTerminal,
    toggleActivityPanel,
    toggleConversationManager,
    toggleSnippetsPanel,
    toggleGitPanel,
    toggleCodeEditor,
    toggleVoiceInput,
    toggleBookmarks,
    createConversation,
    deleteAllConversations,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recentActions, setRecentActions] = useState<string[]>([]);

  const executeAction = useCallback((actionId: string, actionFn: () => void) => {
    actionFn();
    setRecentActions(prev => [actionId, ...prev.filter(id => id !== actionId).slice(0, 5)]);
  }, []);

  const quickActions: QuickAction[] = [
    // Chat Actions
    {
      id: 'new-chat',
      name: 'New Chat',
      description: 'Start a new conversation',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: 'from-emerald-500 to-teal-500',
      shortcut: 'Ctrl+N',
      category: 'chat',
      action: () => createConversation('New Chat'),
    },
    {
      id: 'clear-chat',
      name: 'Clear All Chats',
      description: 'Delete all conversations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      color: 'from-red-500 to-rose-500',
      category: 'chat',
      action: () => {
        if (confirm('Are you sure you want to delete all conversations?')) {
          deleteAllConversations();
        }
      },
    },
    // Code Actions
    {
      id: 'toggle-terminal',
      name: 'Toggle Terminal',
      description: 'Open/close integrated terminal',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-slate-600 to-slate-700',
      shortcut: 'Ctrl+`',
      category: 'code',
      action: () => executeAction('toggle-terminal', toggleTerminal),
    },
    {
      id: 'toggle-editor',
      name: 'Toggle Editor',
      description: 'Open/close code editor',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      color: 'from-blue-500 to-indigo-500',
      shortcut: 'Ctrl+I',
      category: 'code',
      action: () => executeAction('toggle-editor', toggleCodeEditor),
    },
    {
      id: 'toggle-snippets',
      name: 'Snippets Library',
      description: 'Browse code snippets',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'from-amber-500 to-orange-500',
      shortcut: 'Ctrl+Shift+S',
      category: 'code',
      action: () => executeAction('toggle-snippets', toggleSnippetsPanel),
    },
    // File Actions
    {
      id: 'toggle-explorer',
      name: 'File Explorer',
      description: 'Browse project files',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      color: 'from-yellow-500 to-amber-500',
      category: 'file',
      action: () => executeAction('toggle-explorer', toggleFileExplorer),
    },
    {
      id: 'toggle-git',
      name: 'Git Panel',
      description: 'View git status & commits',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-orange-500 to-red-500',
      shortcut: 'Ctrl+Shift+G',
      category: 'file',
      action: () => executeAction('toggle-git', toggleGitPanel),
    },
    // AI Actions
    {
      id: 'voice-input',
      name: 'Voice Input',
      description: 'Start speech-to-text input',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      color: 'from-pink-500 to-rose-500',
      shortcut: 'Alt+Ctrl+V',
      category: 'ai',
      action: () => executeAction('voice-input', toggleVoiceInput),
    },
    {
      id: 'model-manager',
      name: 'Model Manager',
      description: 'Manage AI models',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-violet-500 to-purple-500',
      category: 'ai',
      action: () => executeAction('model-manager', toggleModelManager),
    },
    {
      id: 'bookmarks',
      name: 'Bookmarks',
      description: 'View saved bookmarks',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      color: 'from-cyan-500 to-blue-500',
      shortcut: 'Ctrl+Shift+B',
      category: 'ai',
      action: () => executeAction('bookmarks', toggleBookmarks),
    },
    // System Actions
    {
      id: 'settings',
      name: 'Settings',
      description: 'Application settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'from-gray-500 to-gray-600',
      category: 'system',
      action: () => executeAction('settings', toggleSettings),
    },
    {
      id: 'activity',
      name: 'Activity Panel',
      description: 'View activity dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-500',
      shortcut: 'Ctrl+Shift+A',
      category: 'system',
      action: () => executeAction('activity', toggleActivityPanel),
    },
    {
      id: 'conversations',
      name: 'Export/Import',
      description: 'Manage conversations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      ),
      color: 'from-teal-500 to-cyan-500',
      shortcut: 'Ctrl+E',
      category: 'system',
      action: () => executeAction('conversations', toggleConversationManager),
    },
  ];

  const categories = [
    { id: 'all', name: 'All', icon: '◉' },
    { id: 'chat', name: 'Chat', icon: '💬' },
    { id: 'code', name: 'Code', icon: '⚡' },
    { id: 'file', name: 'Files', icon: '📁' },
    { id: 'ai', name: 'AI', icon: '🤖' },
    { id: 'system', name: 'System', icon: '⚙️' },
  ];

  const filteredActions = quickActions.filter(action => {
    const matchesSearch = action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="quick-actions-container">
      {/* Header */}
      <div className="quick-actions-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <p className="text-xs text-slate-400">Fast access to common tasks</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="quick-search-box">
        <svg className="quick-search-icon w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search actions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="quick-search-input"
        />
        {searchQuery && (
          <span className="quick-search-count">{filteredActions.length}</span>
        )}
      </div>

      {/* Category Tabs */}
      <div className="quick-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`quick-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            <span>{cat.icon}</span>
            <span className="text-xs">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Recent Actions */}
      {recentActions.length > 0 && !searchQuery && selectedCategory === 'all' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-2 px-1">
            Recent Actions
          </label>
          <div className="flex gap-2 flex-wrap">
            {recentActions.slice(0, 4).map(actionId => {
              const action = quickActions.find(a => a.id === actionId);
              if (!action) return null;
              return (
                <button
                  key={actionId}
                  onClick={() => action.action()}
                  className={`recent-action-chip bg-gradient-to-r ${action.color}`}
                >
                  {action.icon}
                  <span className="text-xs">{action.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions Grid */}
      <div className="quick-actions-grid">
        {filteredActions.map(action => (
          <button
            key={action.id}
            onClick={() => action.action()}
            className="quick-action-card glass-card-hover"
          >
            <div className={`quick-action-icon bg-gradient-to-br ${action.color}`}>
              {action.icon}
            </div>
            <div className="quick-action-info">
              <span className="quick-action-name">{action.name}</span>
              <span className="quick-action-desc">{action.description}</span>
            </div>
            {action.shortcut && (
              <kbd className="quick-action-shortcut">{action.shortcut}</kbd>
            )}
          </button>
        ))}

        {filteredActions.length === 0 && (
          <div className="empty-quick-actions">
            <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-400">No actions found</p>
            <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="quick-actions-footer">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{filteredActions.length} actions available</span>
          <span>•</span>
          <span>Click to execute</span>
        </div>
      </div>
    </div>
  );
}
