import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface FloatingBarProps {
  onAction: (action: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  color: string;
  disabled?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-chat',
    label: 'New Chat',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    color: 'from-blue-500 to-cyan-500',
    shortcut: 'Ctrl+N',
  },
  {
    id: 'clear-chat',
    label: 'Clear Chat',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6a2 2 0 002 2v-2m-6 9l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    ),
    color: 'from-red-500 to-pink-500',
  },
  {
    id: 'toggle-terminal',
    label: 'Terminal',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-emerald-500 to-green-500',
    shortcut: 'Ctrl+`',
  },
  {
    id: 'toggle-explorer',
    label: 'Explorer',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    color: 'from-purple-500 to-violet-500',
    shortcut: 'Ctrl+B',
  },
  {
    id: 'snippets',
    label: 'Snippets',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l-4 4M4 7h16M9 20l1-17" />
      </svg>
    ),
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-1.756.426-1.756 2.924 0 3.35z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-slate-400 to-slate-600',
    shortcut: 'Ctrl+,',
  },
];

export default function FloatingBar({ onAction }: FloatingBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show on mouse move near edges (bottom-right area)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show when mouse is in bottom-right corner area
      if (e.clientX > window.innerWidth - 200 && e.clientY > window.innerHeight - 150) {
        if (!isVisible) {
          setIsVisible(true);
          clearTimeout(timeoutRef.current!);
        }
        // Hide after 3 seconds of no movement
        timeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isVisible]);

  const handleAction = (id: string) => {
    onAction(id);
    if (!isExpanded) {
      // Keep visible after action
      setIsVisible(true);
      clearTimeout(timeoutRef.current!);
      timeoutRef.current = setTimeout(() => setIsVisible(false), 1500);
    }
  };

  return (
    <>
      {/* Main Floating Button */}
      <div
        className={`fixed z-[9998] bottom-6 right-6 transition-all duration-300 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Expanded Actions Panel */}
        {isExpanded && (
          <div 
            className="absolute bottom-full right-0 mb-2 p-2 bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-dark-700/80 shadow-2xl shadow-black/40 scale-in origin-bottom-right mb-2"
            onMouseLeave={() => setIsExpanded(false)}
            style={{ width: '320px' }}
          >
            <div className="grid grid-cols-3 gap-2 p-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  disabled={action.disabled}
                  className="group flex flex-col items-center gap-1 p-2.5 rounded-xl bg-dark-800/60 hover:bg-dark-700/70 border border-dark-700/50 hover:border-dark-600 transition-all duration-200 text-dark-300 hover:text-white disabled:opacity-50"
                  title={`${action.label} (${action.shortcut || ''})`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${action.color} text-white shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                    {action.icon}
                  </span>
                  <span className="text-[10px] font-medium truncate max-w-[70px]">{action.label}</span>
                  {action.shortcut && (
                    <span className="text-[8px] text-dark-600 font-mono">{action.shortcut}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="mx-2 h-px bg-gradient-to-r from-transparent via-dark-700 to-transparent my-1" />

            {/* Extra Info */}
            <div className="px-3 pb-2">
              <p className="text-[10px] text-dark-500 text-center">
                💡 Click anywhere outside to collapse
              </p>
            </div>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-400/50 hover:scale-110 active:scale-95 transition-all duration-200 group"
          title="Quick Actions (Click to expand)"
        >
          {/* Icon changes based on state */}
          <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-45' : ''}`}>
            {isExpanded ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18l6 6" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </span>

          {/* Pulse ring effect */}
          <span className="absolute inset-0 rounded-full bg-primary-500/30 animate-ping" />
          
          {/* Tooltip */}
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-dark-900 text-xs text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none scale-in origin-bottom">
            Quick Actions
          </span>
        </button>
      </div>

      {/* Mini Action Bar (shown when visible but not expanded) */}
      {isVisible && !isExpanded && (
        <div 
          className="fixed bottom-6 right-20 flex items-end gap-2 p-2 bg-dark-900/90 backdrop-blur-xl rounded-xl border border-dark-700/60 shadow-xl slide-up"
          onMouseEnter={() => clearTimeout(timeoutRef.current!)}
          onMouseLeave={() => timeoutRef.current = setTimeout(() => setIsVisible(false), 1500)}
        >
          {QUICK_ACTIONS.slice(0, 5).map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="group relative w-10 h-10 rounded-lg bg-dark-800/80 hover:bg-dark-700 border border-dark-700/50 flex items-center justify-center text-dark-400 hover:text-white transition-all duration-200 overflow-hidden"
              title={`${action.label} (${action.shortcut || ''})`}
            >
              <span className={`bg-gradient-to-br ${action.color} bg-clip-text text-transparent`}>
                {action.icon}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
