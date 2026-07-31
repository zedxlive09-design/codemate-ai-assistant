/**
 * Keyboard Shortcuts Overlay Component
 * 
 * Displays all available keyboard shortcuts in a modal overlay.
 * Triggered by Ctrl+/ or Cmd+/
 */

import React, { useEffect, useState } from 'react';
import { getAllShortcuts, formatKeys, CATEGORY_TITLES } from '../lib/shortcuts';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

// Single source of truth: src/lib/shortcuts.ts
const SHORTCUTS: Shortcut[] = getAllShortcuts().map(s => ({
  keys: formatKeys(s.keys),
  description: s.description,
  category: s.category,
}));

const CATEGORIES = CATEGORY_TITLES;

export default function ShortcutsOverlay({ isOpen, onClose }: ShortcutsOverlayProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter shortcuts by category and search
  const filteredShortcuts = SHORTCUTS.filter(s => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 114 0m-6 8h6a6 6 0 100-12h6z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-dark-400">Quick reference for all available shortcuts</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-dark-800">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-2 border-b border-dark-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
              activeCategory === 'All'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            All ({SHORTCUTS.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
                {cat} ({SHORTCUTS.filter(s => s.category === cat).length})
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[40vh] overflow-y-auto p-6 custom-scrollbar">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-dark-500">No shortcuts found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.filter(cat => activeCategory === 'All' || activeCategory === cat).map(category => {
                const categoryShortcuts = filteredShortcuts.filter(s => s.category === category);
                if (categoryShortcuts.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-dark-500 mb-3">
                      {category}
                    </h3>
                    <div className="grid gap-2">
                      {categoryShortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg group hover:bg-dark-800 transition-colors"
                        >
                          <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
                            {shortcut.description}
                          </span>
                          <kbd className="px-2 py-1 text-xs font-mono bg-dark-900 border border-dark-600 rounded text-dark-300 min-w-[80px] text-center">
                            {shortcut.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-dark-800 bg-dark-900/50 flex items-center justify-between">
          <span className="text-xs text-dark-500">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-dark-800 border border-dark-700 rounded text-dark-400 mx-1">Esc</kbd> to close
          </span>
          <span className="text-xs text-dark-500">
            {filteredShortcuts.length} of {SHORTCUTS.length} shortcuts
          </span>
        </div>
      </div>
    </div>
  );
}
