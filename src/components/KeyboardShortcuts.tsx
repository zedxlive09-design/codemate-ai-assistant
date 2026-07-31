import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcutCategories = [
  {
    title: 'General',
    icon: '⭐',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette (also Ctrl+P)' },
      { keys: ['Ctrl', ','], description: 'Open Settings' },
      { keys: ['Ctrl', '/'], description: 'Show Keyboard Shortcuts' },
      { keys: ['Escape'], description: 'Close Dialog / Panel' },
    ],
  },
  {
    title: 'Chat',
    icon: '💬',
    shortcuts: [
      { keys: ['Enter'], description: 'Send Message' },
      { keys: ['Shift', 'Enter'], description: 'New Line in Input' },
    ],
  },
  {
    title: 'Panels',
    icon: '🪟',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar' },
      { keys: ['Ctrl', 'E'], description: 'Toggle File Explorer' },
      { keys: ['Ctrl', '`'], description: 'Toggle Terminal' },
      { keys: ['Ctrl', 'I'], description: 'Toggle Code Editor' },
      { keys: ['Ctrl', 'M'], description: 'Toggle Model Manager' },
      { keys: ['Ctrl', 'Shift', 'M'], description: 'Toggle Memory Panel' },
      { keys: ['Ctrl', 'Shift', 'E'], description: 'Toggle Conversation Manager' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle Snippets Panel' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Toggle Git Panel' },
      { keys: ['Ctrl', 'Shift', 'B'], description: 'Toggle Bookmarks' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Toggle Activity Panel' },
    ],
  },
  {
    title: 'Themes',
    icon: '🎨',
    shortcuts: [
      { keys: ['Ctrl', 'Alt', 'T'], description: 'Cycle Theme Preset' },
      { keys: ['Ctrl', 'Shift', 'T'], description: 'Open Theme Customizer' },
      { keys: ['Ctrl', 'Alt', 'Y'], description: 'Open Quick Theme Picker' },
    ],
  },
  {
    title: 'Search',
    icon: '🔍',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'F'], description: 'Open Global Search (also Ctrl+Shift+H)' },
    ],
  },
  {
    title: 'AI & Model',
    icon: '🧠',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', ','], description: 'Open AI Settings' },
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Open Plugin Manager' },
      { keys: ['Ctrl', 'Shift', 'D'], description: 'Open Model Downloads' },
      { keys: ['Ctrl', 'Alt', 'S'], description: 'Open Stats Dashboard' },
    ],
  },
  {
    title: 'Tools',
    icon: '🛠️',
    shortcuts: [
      { keys: ['Ctrl', 'Alt', 'V'], description: 'Open Voice Input' },
      { keys: ['Ctrl', 'Shift', 'Q'], description: 'Open Quick Actions' },
      { keys: ['Ctrl', 'Shift', 'N'], description: 'Open Notifications' },
      { keys: ['Ctrl', 'Alt', 'P'], description: 'Open Profile' },
    ],
  },
];

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-dark-800 border border-dark-600 rounded-md text-xs font-mono font-medium text-dark-200 shadow-sm">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9997] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-dark-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <span className="text-2xl">⌨️</span>
              Keyboard Shortcuts
            </h2>
            <p className="text-sm text-dark-400 mt-1">Quick commands for power users</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-dark-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {shortcutCategories.map((category) => (
            <div key={category.title}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{category.icon}</span>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  {category.title}
                </h3>
                <div className="flex-1 h-px bg-dark-800 ml-4" />
              </div>

              {/* Shortcuts Grid */}
              <div className="grid gap-2">
                {category.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors group"
                  >
                    <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
                      {shortcut.description}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {shortcut.keys.map((key, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-dark-600 text-xs">+</span>}
                          <Key>{key}</Key>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pro Tips */}
          <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-purple-500/10 border border-primary-500/20">
            <h4 className="font-medium text-primary-400 flex items-center gap-2 mb-2">
              💡 Pro Tip
            </h4>
            <p className="text-sm text-dark-300 leading-relaxed">
              Press <Key>Ctrl</Key>+<Key>K</Key> anytime to open the Command Palette, which provides quick access to all features and actions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800 bg-dark-900/50 flex justify-between items-center">
          <p className="text-xs text-dark-500">
            Shortcuts work globally when the app is focused
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
            >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing keyboard shortcuts modal
export function useKeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  // Show shortcuts when pressing Ctrl+/
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { showShortcuts, setShowShortcuts };
}
