/**
 * QuickThemePicker — a fast, keyboard-driven theme picker modal.
 *
 * Opened via Ctrl+Alt+P (registered in App.tsx). Shows a compact grid of all
 * theme presets; hovering or arrow-keying through them previews the theme live
 * (without persisting), and selecting one (click or Enter) persists it. Think
 * of it as the "quick switch" counterpart to the full ThemeCustomizer panel.
 *
 * Reuses the useTheme hook (setTheme / cycleTheme / presets) and the shared
 * themePresets metadata. The live preview uses applyConfig + a temporary
 * ThemeConfig so the persisted theme is restored on close/cancel.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme, applyConfig, type ThemeConfig } from '../hooks/useTheme';
import type { ThemePresetMeta } from '../lib/themePresets';
import { Search, X, Check } from 'lucide-react';

interface QuickThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickThemePicker({ isOpen, onClose }: QuickThemePickerProps) {
  const { config, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // The presets come from useTheme (re-exported from themePresets).
  const { presets } = useTheme();

  // Filter presets by query (case-insensitive on name).
  const filtered = query.trim()
    ? presets.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : presets;

  // Keep selectedIndex in range when the filter changes.
  useEffect(() => {
    if (selectedIndex >= filtered.length) setSelectedIndex(0);
  }, [filtered.length, selectedIndex]);

  // Restore the persisted theme when the modal closes (cancels any live preview).
  const restoreTheme = useCallback(() => {
    applyConfig(config);
  }, [config]);

  // On close, restore + reset query.
  const handleClose = useCallback(() => {
    restoreTheme();
    setQuery('');
    onClose();
  }, [restoreTheme, onClose]);

  // Keyboard navigation: arrows + Enter + Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const picked = filtered[selectedIndex];
        if (picked) {
          setTheme({
            presetId: picked.id,
            font: config.font,
            radius: config.radius,
          });
          onClose();
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1));
        return;
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, filtered, selectedIndex, config, setTheme, onClose, handleClose]);

  // Live-preview the highlighted preset (without persisting).
  const previewPreset = (preset: ThemePresetMeta) => {
    const previewConfig: ThemeConfig = {
      presetId: preset.id,
      font: config.font,
      radius: config.radius,
    };
    applyConfig(previewConfig);
  };

  // Reset to the persisted theme when the modal opens (clear any stale preview).
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setQuery('');
      restoreTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Scroll the active item into view.
  useEffect(() => {
    if (!isOpen) return;
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick theme picker"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="quick-theme-enter w-full max-w-lg max-h-[70vh] flex flex-col glass-card rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
        {/* Header / search */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            {filtered.length} theme{filtered.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            aria-label="Close theme picker"
          >
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div ref={gridRef} className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No themes match "{query}"
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((preset, idx) => {
                const isActive = preset.id === config.presetId;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={preset.id}
                    data-idx={idx}
                    onMouseEnter={() => {
                      setSelectedIndex(idx);
                      previewPreset(preset);
                    }}
                    onFocus={() => {
                      setSelectedIndex(idx);
                      previewPreset(preset);
                    }}
                    onClick={() => {
                      setTheme({
                        presetId: preset.id,
                        font: config.font,
                        radius: config.radius,
                      });
                      onClose();
                    }}
                    className={`relative text-left p-3 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? 'border-[var(--cm-primary)] bg-[color-mix(in_srgb,var(--cm-primary)_12%,transparent)] scale-[1.02]'
                        : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600'
                    }`}
                  >
                    {/* Swatch row */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <Swatch id={preset.id} />
                    </div>
                    <span className="block text-xs font-medium text-slate-200 truncate">
                      {preset.name}
                    </span>
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 text-emerald-400" title="Active">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-700/60 rounded">↑↓</kbd> navigate
            <kbd className="px-1.5 py-0.5 bg-slate-700/60 rounded">Enter</kbd> apply
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-700/60 rounded">Esc</kbd> cancel
          </span>
        </div>
      </div>
    </div>
  );
}

/** A row of 3 color swatches derived from the preset's [data-theme] CSS vars. */
function Swatch({ id }: { id: string }) {
  // We can't read CSS var values for a non-applied data-theme cheaply, so we
  // render 3 colored dots that take their colors from the preset's own
  // [data-theme] rule by scoping a span with that data-theme attribute.
  return (
    <span
      data-theme={id}
      className="flex items-center gap-1"
      title={id}
    >
      <span
        className="w-3 h-3 rounded-full ring-1 ring-white/20"
        style={{ backgroundColor: 'var(--cm-primary)' }}
      />
      <span
        className="w-3 h-3 rounded-full ring-1 ring-white/20"
        style={{ backgroundColor: 'var(--cm-secondary)' }}
      />
      <span
        className="w-3 h-3 rounded-full ring-1 ring-white/20"
        style={{ backgroundColor: 'var(--cm-accent)' }}
      />
    </span>
  );
}

// The openQuickThemePicker() helper now lives in src/lib/modalEvents.ts so
// that CommandPalette can import it WITHOUT statically importing this
// component module — keeping this code out of the entry chunk (lazy-loaded
// via React.lazy in App.tsx).
