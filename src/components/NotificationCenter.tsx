import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generate some sample notifications
const generateSampleNotifications = (): Notification[] => [
  {
    id: '1',
    type: 'info',
    title: 'Welcome to CodeMate!',
    message: 'Your AI coding assistant is ready. Press Ctrl+K for commands.',
    timestamp: new Date(Date.now() - 300000),
    read: false,
    icon: '👋',
  },
  {
    id: '2',
    type: 'success',
    title: 'Model Loaded',
    message: 'Llama-3-8B-Q4_K_M model loaded successfully.',
    timestamp: new Date(Date.now() - 600000),
    read: true,
    icon: '✅',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low Memory Warning',
    message: 'System memory is running low. Consider closing unused panels.',
    timestamp: new Date(Date.now() - 1200000),
    read: false,
    icon: '⚠️',
  },
  {
    id: '4',
    type: 'info',
    title: 'Keyboard Shortcut Tip',
    message: 'Did you know? Press Ctrl+Shift+S to open the Snippets panel.',
    timestamp: new Date(Date.now() - 1800000),
    read: true,
    icon: '⌨️',
  },
  {
    id: '5',
    type: 'error',
    title: 'File Read Error',
    message: 'Could not read /src/utils/config.ts - file may be locked.',
    timestamp: new Date(Date.now() - 2400000),
    read: false,
    icon: '❌',
  },
];

const NOTIFICATION_CONFIG = {
  info: {
    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  error: {
    bg: 'bg-red-500/10 border-red-500/20 text-red-400',
    iconBg: 'bg-red-500/20',
  },
};

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(generateSampleNotifications());
  const [filter, setFilter] = useState<'all' | 'unread' | 'type'>('all');
  
  const { conversations } = useStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const filteredNotifications = filter === 'all' 
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !n.read)
      : notifications; // Could add type filtering

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Bell Button (can be used standalone) */}
      {/* This component is designed to be opened as a panel/modal */}
      
      <div className="fixed inset-0 z-[9997] flex items-end justify-end p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md max-h-[70vh] bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-dark-700/80 shadow-2xl shadow-black/50 flex flex-col scale-in origin-bottom-right overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A9 9 1 0 004.095 4.095H3.5S2 7.5 2 12.5a9 9 1 0 0013.5 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{unreadCount}</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
            </div>
            
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-2 py-1 text-xs text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-md transition-colors"
                >
                  Mark all read
                </button>
              )}
              
              <button
                onClick={clearAll}
                className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                title="Clear all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m0 0V7" />
                </svg>
              </button>
              
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-5 py-2 border-b border-dark-800/60 shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-dark-700 text-white' : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'unread' ? 'bg-dark-700 text-white' : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-dark-500">
                <div className="w-12 h-12 rounded-full bg-dark-800/50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A9 9 1 0 004.095 4.095H3.5S2 7.5 2 12.5a9 9 1 0 0013.5 0" />
                  </svg>
                </div>
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const config = NOTIFICATION_CONFIG[notification.type];
                
                return (
                  <div
                    key={notification.id}
                    className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      notification.read
                        ? 'border-dark-700/30 bg-transparent hover:bg-dark-800/30'
                        : `${config.bg} border-l-2 border-l-current`
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`shrink-0 w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center text-sm`}>
                        {notification.icon || (
                          <span>{
                            notification.type === 'info' ? 'ℹ️' :
                            notification.type === 'success' ? '✓' :
                            notification.type === 'warning' ? '⚠' : '✕'
                          }</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${
                            notification.read ? 'text-dark-300' : config.bg.replace('bg-', 'text-').split(' ')[0]
                          }`}>
                            {notification.title}
                          </p>
                          
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-dark-500 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>

                        {/* Action & Meta */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-dark-600">
                            {formatRelativeTime(notification.timestamp)}
                          </span>
                          
                          {notification.action && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action.onClick();
                              }}
                              className="px-2 py-0.5 text-[10px] bg-dark-700/50 hover:bg-dark-700 rounded text-dark-300 hover:text-white transition-colors"
                            >
                              {notification.action.label}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-dark-700 text-dark-500 hover:text-red-400 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-dark-800/80 bg-dark-850/50 shrink-0 flex items-center justify-between">
            <span className="text-[10px] text-dark-500">
              {notifications.length > 0 && `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
              {notifications.length > 0 && ` • Last ${formatRelativeTime(notifications[notifications.length - 1].timestamp)}`}
            </span>
            
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white text-xs rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
