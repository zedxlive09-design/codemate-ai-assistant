import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

interface ActivityItem {
  id: string;
  type: 'message' | 'file_open' | 'model_load' | 'export' | 'command' | 'error';
  title: string;
  description?: string;
  timestamp: Date;
}

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityPanel({ isOpen, onClose }: ActivityPanelProps) {
  const [filter, setFilter] = useState<ActivityItem['type'] | 'all'>('all');
  
  const { conversations, modelLoaded, selectedModelId, projectPath } = useStore();

  // Generate activity data from state
  const activities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    
    // Add conversation activity
    conversations.forEach(conv => {
      // Created
      items.push({
        id: `${conv.id}-created`,
        type: 'message',
        title: `Created "${conv.title}"`,
        description: `${conv.messages.length} messages`,
        timestamp: new Date(conv.createdAt),
      });
      
      // Last updated
      if (conv.updatedAt !== conv.createdAt) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (lastMsg) {
          items.push({
            id: `${conv.id}-updated`,
            type: 'message',
            title: `Updated "${conv.title}"`,
            description: lastMsg.role === 'user' ? 'You sent a message' : 'AI responded',
            timestamp: new Date(conv.updatedAt),
          });
        }
      }
    });

    // Model status
    if (modelLoaded && selectedModelId) {
      items.push({
        id: 'model-loaded',
        type: 'model_load',
        title: 'Model loaded',
        description: selectedModelId.split('/').pop(),
        timestamp: new Date(),
      });
    }

    // Project opened
    if (projectPath) {
      items.push({
        id: 'project-opened',
        type: 'file_open',
        title: 'Project opened',
        description: projectPath.split('/').pop(),
        timestamp: new Date(),
      });
    }

    // Sort by time descending
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [conversations, modelLoaded, selectedModelId, projectPath]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter(a => a.type === filter);
  }, [activities, filter]);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get icon for activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'message':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'file_open':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        );
      case 'model_load':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'export':
        return (
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
        );
      case 'command':
        return (
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Stats calculations
  const stats = useMemo(() => ({
    totalMessages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
    totalConversations: conversations.length,
    avgMessagesPerChat: conversations.length > 0 
      ? Math.round(conversations.reduce((acc, c) => acc + c.messages.length, 0) / conversations.length)
      : 0,
    activeToday: conversations.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.updatedAt).toDateString() === today;
    }).length,
  }), [conversations]);

  if (!isOpen) return null;

  return (
    <aside className="w-80 bg-dark-900/95 backdrop-blur-sm border-l border-dark-800/70 flex flex-col slide-down overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Activity
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-dark-800">
        <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-primary-400">{stats.totalConversations}</div>
          <div className="text-[10px] text-dark-500 uppercase tracking-wider">Chats</div>
        </div>
        <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-emerald-400">{stats.totalMessages}</div>
          <div className="text-[10px] text-dark-500 uppercase tracking-wider">Messages</div>
        </div>
        <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-purple-400">{stats.avgMessagesPerChat}</div>
          <div className="text-[10px] text-dark-500 uppercase tracking-wider">Avg/Chat</div>
        </div>
        <div className="bg-dark-800/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-cyan-400">{stats.activeToday}</div>
          <div className="text-[10px] text-dark-500 uppercase tracking-wider">Today</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-dark-800 overflow-x-auto">
        {[
          { key: 'all', label: 'All' },
          { key: 'message', label: '💬' },
          { key: 'file_open', label: '📁' },
          { key: 'model_load', label: '🖥️' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500 px-4">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No activity yet</p>
            <p className="text-xs mt-1">Start chatting to see activity</p>
          </div>
        ) : (
          <div className="py-2">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-dark-800/30 transition-colors"
              >
                {getActivityIcon(activity.type)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 truncate">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-dark-500 truncate">{activity.description}</p>
                  )}
                  <p className="text-[10px] text-dark-600 mt-0.5">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-dark-800 bg-dark-850/50">
        <p className="text-[10px] text-dark-600 text-center">
          Showing {filteredActivities.length} of {activities.length} activities
        </p>
      </div>
    </aside>
  );
}
