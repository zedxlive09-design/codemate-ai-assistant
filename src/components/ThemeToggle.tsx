import React from 'react';
import { useStore } from '../store/useStore';

interface ThemeToggleProps {
  compact?: boolean;
}

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { settings, updateSettings } = useStore();

  const themes = [
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'midnight', name: 'Midnight', icon: '🌃' },
    { id: 'ocean', name: 'Ocean', icon: '🌊' },
    { id: 'forest', name: 'Forest', icon: '🌲' },
  ] as const;

  const currentThemeIndex = themes.findIndex(t => t.id === settings.theme) || 0;

  const cycleTheme = () => {
    const nextIndex = (currentThemeIndex + 1) % themes.length;
    updateSettings({ theme: themes[nextIndex].id });
  };

  if (compact) {
    return (
      <button
        onClick={cycleTheme}
        className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-yellow-400 transition-all duration-200"
        title={`Theme: ${themes[currentThemeIndex]?.name || 'Dark'}`}
      >
        <span className="text-base">{themes[currentThemeIndex]?.icon || '🌙'}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-dark-500">Theme:</span>
      <div className="flex items-center gap-1 p-1 bg-dark-800/60 rounded-lg">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => updateSettings({ theme: theme.id })}
            className={`
              p-2 rounded-md transition-all duration-200
              ${settings.theme === theme.id 
                ? 'bg-primary-600/20 text-white ring-1 ring-primary-500/50' 
                : 'hover:bg-dark-700/50 text-dark-400'
              }
            `}
            title={theme.name}
          >
            <span>{theme.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
