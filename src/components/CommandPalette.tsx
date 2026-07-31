import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useTheme } from '../hooks/useTheme';
import { THEME_PRESETS, getPresetById } from '../lib/themePresets';
import { openGlobalSearch, openQuickThemePicker, toggleFocusMode, openQuickSwitcher } from '../lib/modalEvents';
import { exportConversationToMarkdown, downloadFile } from '../lib/conversationExport';

// Types
interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  category: 'general' | 'chat' | 'file' | 'model' | 'view' | 'settings';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    createConversation,
    toggleSidebar,
    toggleFileExplorer,
    toggleSettings,
    toggleModelManager,
    toggleThemeCustomizer,
    setProjectPath,
    conversations,
    activeConversationId,
  } = useStore();
  const { setTheme, cycleTheme, resetTheme, config } = useTheme();

  // Build commands list
  const commands: CommandItem[] = [
    // General
    {
      id: 'new-chat',
      label: 'New Chat',
      shortcut: 'Ctrl+N',
      icon: '💬',
      category: 'general',
      action: () => {
        createConversation();
        onClose();
      },
    },
    // Chat
    {
      id: 'clear-chat',
      label: 'Clear Current Chat',
      icon: '🗑️',
      category: 'chat',
      action: () => {
        createConversation('New Chat');
        onClose();
      },
    },
    {
      id: 'quick-switch-conversation',
      label: 'Quick Switch Conversation...',
      shortcut: 'Alt+Q',
      icon: '🔀',
      category: 'chat',
      action: () => {
        // Dispatch the cross-component event; App.tsx listens and opens
        // its lazy-loaded ConversationQuickSwitcher modal (Task 12-b).
        openQuickSwitcher();
        onClose();
      },
    },
    {
      id: 'copy-last-response',
      label: 'Copy Last Response',
      shortcut: 'Ctrl+Shift+C',
      icon: '📋',
      category: 'chat',
      action: () => {
        onClose();
        // Implement copy logic
      },
    },
    {
      id: 'export-conversation-markdown',
      label: 'Export Current Conversation (Markdown)',
      icon: '📄',
      category: 'chat',
      action: async () => {
        onClose();
        const conv = conversations.find((c) => c.id === activeConversationId);
        if (!conv || conv.messages.length === 0) return;
        try {
          const md = exportConversationToMarkdown(conv);
          const safeTitle = conv.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'conversation';
          await downloadFile(md, `${safeTitle}.md`, 'text/markdown');
        } catch (e) {
          console.error('Export failed:', e);
        }
      },
    },
    // File
    {
      id: 'open-project',
      label: 'Open Project Folder',
      icon: '📁',
      category: 'file',
      action: async () => {
        onClose();
        // Use file dialog
      },
    },
    {
      id: 'toggle-file-explorer',
      label: 'Toggle File Explorer',
      shortcut: 'Ctrl+B',
      icon: '📂',
      category: 'file',
      action: () => {
        toggleFileExplorer();
        onClose();
      },
    },
    {
      id: 'search-files',
      label: 'Search in Files',
      shortcut: 'Ctrl+Shift+F',
      icon: '🔍',
      category: 'file',
      action: () => {
        // Repurposed (Task 10-b): this shortcut now opens the global
        // full-text message search modal rather than just toggling the
        // file explorer (which the Files toolbar button already does).
        openGlobalSearch();
        onClose();
      },
    },
    {
      id: 'search-messages',
      label: 'Search Messages (Global)',
      shortcut: 'Ctrl+Shift+F',
      icon: '🔎',
      category: 'chat',
      action: () => {
        openGlobalSearch();
        onClose();
      },
    },
    // Model
    {
      id: 'open-model-manager',
      label: 'Open Model Manager',
      shortcut: 'Ctrl+M',
      icon: '🤖',
      category: 'model',
      action: () => {
        toggleModelManager();
        onClose();
      },
    },
    {
      id: 'load-model',
      label: 'Load Model...',
      icon: '⚡',
      category: 'model',
      action: () => {
        toggleModelManager();
        onClose();
      },
    },
    {
      id: 'unload-model',
      label: 'Unload Current Model',
      icon: '💤',
      category: 'model',
      action: () => {
        onClose();
        // Unload model logic
      },
    },
    // View
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      shortcut: 'Ctrl+S',
      icon: '◀️',
      category: 'view',
      action: () => {
        toggleSidebar();
        onClose();
      },
    },
    {
      id: 'toggle-settings',
      label: 'Open Settings',
      shortcut: 'Ctrl+,',
      icon: '⚙️',
      category: 'view',
      action: () => {
        toggleSettings();
        onClose();
      },
    },
    {
      id: 'toggle-focus-mode',
      label: 'Toggle Focus Mode',
      shortcut: 'Ctrl+Shift+L',
      icon: '🎯',
      category: 'view',
      action: () => {
        // Dispatch the cross-component event; App.tsx listens and toggles
        // its local focusMode state (which snapshots/restores panel flags).
        toggleFocusMode();
        onClose();
      },
    },
    // Settings
    {
      id: 'change-theme',
      label: 'Change Theme... (Open Customizer)',
      shortcut: 'Ctrl+Shift+T',
      icon: '🎨',
      category: 'settings',
      action: () => {
        toggleThemeCustomizer();
        onClose();
      },
    },
    // Per-preset theme quick-switch commands
    ...THEME_PRESETS.map((preset) => ({
      id: `theme-${preset.id}`,
      label: `Theme: ${preset.name}`,
      icon: config.presetId === preset.id ? '✓ 🎨' : '🎨',
      category: 'settings' as const,
      action: () => {
        setTheme({ presetId: preset.id, font: config.font, radius: config.radius });
        onClose();
      },
    })),
    {
      id: 'cycle-theme',
      label: 'Cycle Theme (next preset)',
      shortcut: 'Ctrl+Alt+T',
      icon: '🔄',
      category: 'settings',
      action: () => {
        const newId = cycleTheme();
        const meta = getPresetById(newId);
        // Show a lightweight title flash via the document title (the global
        // ThemeCycleHandler toast also fires from the keydown shortcut).
        if (meta) {
          const orig = document.title;
          document.title = `Theme: ${meta.name}`;
          setTimeout(() => { document.title = orig; }, 1200);
        }
        onClose();
      },
    },
    {
      id: 'quick-theme-picker',
      label: 'Quick Theme Picker...',
      shortcut: 'Ctrl+Alt+Y',
      icon: '🎯',
      category: 'settings',
      action: () => {
        openQuickThemePicker();
        onClose();
      },
    },
    {
      id: 'random-theme',
      label: 'Surprise Me (Random Theme)',
      icon: '🎲',
      category: 'settings',
      action: () => {
        // Pick a random preset different from the current one.
        const currentId = config.presetId;
        const candidates = THEME_PRESETS.filter((p) => p.id !== currentId);
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        setTheme({ presetId: pick.id, font: config.font, radius: config.radius });
        const orig = document.title;
        document.title = `Theme: ${pick.name}`;
        setTimeout(() => { document.title = orig; }, 1200);
        onClose();
      },
    },
    {
      id: 'reset-theme',
      label: 'Reset Theme to Default',
      icon: '↩️',
      category: 'settings',
      action: () => {
        resetTheme();
        onClose();
      },
    },
    {
      id: 'change-language',
      label: 'Change Language...',
      icon: '🌐',
      category: 'settings',
      action: () => {
        onClose();
      },
    },
  ];

  // Filter commands based on query
  const filteredCommands = query.trim() === ''
    ? commands
    : commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
      );

  // Group by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  // Category labels
  const categoryLabels: Record<string, string> = {
    general: 'General',
    chat: 'Chat',
    file: 'File & Project',
    model: 'Model',
    view: 'View',
    settings: 'Settings',
  };

  const categoryIcons: Record<string, string> = {
    general: '⭐',
    chat: '💬',
    file: '📁',
    model: '🤖',
    view: '👁️',
    settings: '⚙️',
  };

  // Reset and focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.querySelector(`[data-command-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative">
          {/* Search Icon */}
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="w-full pl-12 pr-4 py-4 bg-dark-800/95 border border-dark-700 rounded-2xl text-white placeholder-dark-500 text-base backdrop-blur-xl shadow-2xl focus:outline-none focus:border-primary-500 focus:ring-4 ring-primary-500/20 transition-all"
          />

          {/* Keyboard hint */}
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-dark-500 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-dark-900 rounded text-dark-400 font-mono">ESC</kbd>
            to close
          </span>
        </div>

        {/* Results */}
        <div className="mt-3 max-h-[400px] overflow-y-auto rounded-2xl bg-dark-800/95 border border-dark-700 shadow-2xl backdrop-blur-xl overflow-hidden">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-dark-400">No commands found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([category, cmds], groupIdx) => (
                <div key={category}>
                  {/* Category Header */}
                  <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-dark-500 uppercase tracking-wider bg-dark-900/50 sticky top-0">
                    <span>{categoryIcons[category]}</span>
                    <span>{categoryLabels[category]}</span>
                  </div>
                  
                  {/* Commands */}
                  {cmds.map((cmd, cmdIdx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-command-index={globalIndex}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`
                          w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors
                          ${isSelected 
                            ? 'bg-primary-600/20 text-white border-l-2 border-primary-400' 
                            : 'text-dark-300 hover:bg-dark-700/50 hover:text-white'
                          }
                        `}
                      >
                        {/* Icon */}
                        <span className="text-lg w-6 text-center">{cmd.icon || '•'}</span>
                        
                        {/* Label */}
                        <span className={`flex-1 text-sm ${isSelected ? 'font-medium' : ''}`}>
                          {cmd.label}
                          {isSelected && query && (() => {
                            const regex = new RegExp(`(${query})`, 'gi');
                            const parts = cmd.label.split(regex);
                            return parts.map((part, i) => 
                              part.toLowerCase() === query.toLowerCase()
                                ? <mark key={i} className="bg-primary-500/40 rounded px-0.5">{part}</mark>
                                : part
                            );
                          })()}
                        </span>
                        
                        {/* Shortcut */}
                        {cmd.shortcut && (
                          <kbd className="text-xs px-2 py-0.5 bg-dark-900 rounded-md font-mono text-dark-500">
                            {cmd.shortcut.replace('Ctrl+', '⌘')}
                          </kbd>
                        )}
                      </button>
                    );
                  })}

                  {/* Divider between groups */}
                  {groupIdx < Object.keys(groupedCommands).length - 1 && (
                    <div className="mx-4 h-px bg-dark-700/50 my-1" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-dark-700/50 flex items-center justify-between text-xs text-dark-500 bg-dark-900/30">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <span>{commands.length} commands available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global keyboard shortcut hook
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K or Cmd + P to open
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}
