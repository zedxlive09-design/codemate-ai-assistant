import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useTheme, applyConfig, type ThemeConfig } from '../hooks/useTheme';
import { Palette, Sparkles, RotateCcw, Eye, Download, Upload, Check, Star, Zap } from 'lucide-react';

interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  gradient: string;
  category?: 'default' | 'popular' | 'neon' | 'nature' | 'warm' | 'cool';
  isPremium?: boolean;
}

const colorPresets: ColorPreset[] = [
  // Default/Popular
  {
    name: 'CodeMate',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#a78bfa',
    background: '#0d1117',
    surface: '#161b22',
    text: '#e6edf3',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    category: 'default',
  },
  {
    name: 'Ocean Blue',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#22d3ee',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    category: 'popular',
  },
  {
    name: 'Purple Haze',
    primary: '#8b5cf6',
    secondary: '#a855f7',
    accent: '#c084fc',
    background: '#1a1025',
    surface: '#2d1b4e',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    category: 'popular',
    isPremium: true,
  },
  
  // Neon/Cyber
  {
    name: 'Cyberpunk',
    primary: '#f472b6',
    secondary: '#06b6d4',
    accent: '#a855f7',
    background: '#0a0a0f',
    surface: '#151520',
    text: '#f0f0ff',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #06b6d4 50%, #a855f7 100%)',
    category: 'neon',
    isPremium: true,
  },
  {
    name: 'Matrix',
    primary: '#00ff41',
    secondary: '#008f11',
    accent: '#39ff14',
    background: '#000a00',
    surface: '#001a00',
    text: '#00ff41',
    gradient: 'linear-gradient(135deg, #00ff41 0%, #008f11 100%)',
    category: 'neon',
  },
  {
    name: 'Cyan Neon',
    primary: '#06b6d4',
    secondary: '#0891b2',
    accent: '#67e8f9',
    background: '#051520',
    surface: '#0a252a',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    category: 'neon',
  },
  
  // Nature
  {
    name: 'Emerald Forest',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    background: '#0a1a15',
    surface: '#14261f',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    category: 'nature',
  },
  {
    name: 'Forest Night',
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#4ade80',
    background: '#071208',
    surface: '#0f1f12',
    text: '#dcfce7',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    category: 'nature',
  },
  
  // Warm
  {
    name: 'Amber Glow',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fbbf24',
    background: '#1a1505',
    surface: '#332a10',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    category: 'warm',
  },
  {
    name: 'Rose Pink',
    primary: '#f43f5e',
    secondary: '#ec4899',
    accent: '#fb7185',
    background: '#1a0a10',
    surface: '#3b1525',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
    category: 'warm',
    isPremium: true,
  },
  {
    name: 'Sunset',
    primary: '#f97316',
    secondary: '#ef4444',
    accent: '#fbbf24',
    background: '#140a05',
    surface: '#2a1508',
    text: '#fef3c7',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
    category: 'warm',
  },
  {
    name: 'Sakura',
    primary: '#fb7185',
    secondary: '#f472b6',
    accent: '#fda4af',
    background: '#1a0a12',
    surface: '#2d1520',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #f472b6 100%)',
    category: 'warm',
  },
  
  // Cool
  {
    name: 'Midnight',
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#818cf8',
    background: '#090912',
    surface: '#13132b',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    category: 'cool',
  },
  {
    name: 'Arctic',
    primary: '#38bdf8',
    secondary: '#60a5fa',
    accent: '#93c5fd',
    background: '#0c1419',
    surface: '#162030',
    text: '#f0f9ff',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #60a5fa 100%)',
    category: 'cool',
  },
];

interface FontOption {
  name: string;
  value: string;
  preview: string;
}

const fontOptions: FontOption[] = [
  { name: 'Inter', value: "'Inter', system-ui, sans-serif", preview: 'Aa' },
  { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace", preview: 'Aa' },
  { name: 'Fira Code', value: "'Fira Code', monospace", preview: 'Aa' },
  { name: 'Poppins', value: "'Poppins', sans-serif", preview: 'Aa' },
  { name: 'Roboto', value: "'Roboto', sans-serif", preview: 'Aa' },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif", preview: 'Aa' },
];

interface BorderRadiusOption {
  name: string;
  value: string;
  preview: string;
}

const borderRadiusOptions: BorderRadiusOption[] = [
  { name: 'Sharp', value: '4px', preview: '□' },
  { name: 'Rounded', value: '8px', preview: '▢' },
  { name: 'Pill', value: '12px', preview: '◯' },
  { name: 'Circle', value: '9999px', preview: '●' },
];

export default function ThemeCustomizer() {
  const { settings, updateSettings } = useStore();
  const { config, setTheme, resetTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'effects'>('colors');

  // Derive initial UI state from the persisted theme config (so it survives reloads).
  const initialPresetIndex = (() => {
    const idx = colorPresets.findIndex(
      (p) => p.name.toLowerCase().replace(/\s+/g, '-') === config.presetId
    );
    return idx >= 0 ? idx : 0;
  })();
  const [selectedPreset, setSelectedPreset] = useState(initialPresetIndex);
  const [customColors, setCustomColors] = useState({
    primary: config.custom?.primary || colorPresets[initialPresetIndex].primary,
    secondary: config.custom?.secondary || colorPresets[initialPresetIndex].secondary,
    accent: config.custom?.accent || colorPresets[initialPresetIndex].accent,
  });
  const initialFontIndex = (() => {
    const idx = fontOptions.findIndex((f) => f.value === config.font);
    return idx >= 0 ? idx : 0;
  })();
  const [selectedFont, setSelectedFont] = useState(initialFontIndex);
  const initialRadiusIndex = (() => {
    const idx = borderRadiusOptions.findIndex((o) => o.value === config.radius);
    return idx >= 0 ? idx : 1;
  })();
  const [borderRadius, setBorderRadius] = useState(initialRadiusIndex);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [glassIntensity, setGlassIntensity] = useState(50);

  // Keep UI in sync if the persisted config changes externally.
  useEffect(() => {
    setSelectedPreset(initialPresetIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.presetId]);

  const applyPreset = (preset: ColorPreset, index: number) => {
    setSelectedPreset(index);
    setCustomColors({
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent,
    });
    const presetId = preset.name.toLowerCase().replace(/\s+/g, '-');
    // Apply preset vars (clearing any prior custom overrides so the preset wins).
    const next: ThemeConfig = {
      presetId,
      font: fontOptions[selectedFont].value,
      radius: borderRadiusOptions[borderRadius].value,
    };
    setTheme(next);
    updateSettings({ theme: presetId });
  };

  const applyCustomColor = (key: 'primary' | 'secondary' | 'accent', value: string) => {
    const nextColors = { ...customColors, [key]: value };
    setCustomColors(nextColors);
    const next: ThemeConfig = {
      presetId: 'custom',
      custom: nextColors,
      font: fontOptions[selectedFont].value,
      radius: borderRadiusOptions[borderRadius].value,
    };
    setTheme(next);
    updateSettings({ theme: 'custom' });
  };

  const applyFont = (font: FontOption, index: number) => {
    setSelectedFont(index);
    const next: ThemeConfig = {
      presetId: config.presetId,
      custom: config.custom,
      font: font.value,
      radius: borderRadiusOptions[borderRadius].value,
    };
    setTheme(next);
  };

  const applyBorderRadius = (option: BorderRadiusOption, index: number) => {
    setBorderRadius(index);
    const next: ThemeConfig = {
      presetId: config.presetId,
      custom: config.custom,
      font: fontOptions[selectedFont].value,
      radius: option.value,
    };
    setTheme(next);
  };

  // --- Theme preview-on-hover ---
  // Temporarily apply a preset's vars on hover WITHOUT persisting, so the user
  // can preview themes live. On mouse leave we restore the persisted config.
  const previewPreset = (preset: ColorPreset) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', preset.name.toLowerCase().replace(/\s+/g, '-'));
    // Clear custom overrides so the preset's full palette shows through.
    root.style.removeProperty('--cm-primary');
    root.style.removeProperty('--cm-secondary');
    root.style.removeProperty('--cm-accent');
  };

  const restoreTheme = () => {
    applyConfig(config);
  };

  return (
    <div className="theme-customizer-container">
      {/* Header */}
      <div className="theme-customizer-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Theme Customizer</h2>
            <p className="text-xs text-slate-400">Personalize your experience</p>
          </div>
        </div>
        
        {/* Preview Button */}
        <button 
          onClick={() => {
            resetTheme();
            setSelectedPreset(0);
            setCustomColors({
              primary: colorPresets[0].primary,
              secondary: colorPresets[0].secondary,
              accent: colorPresets[0].accent,
            });
            setSelectedFont(0);
            setBorderRadius(1);
          }}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all duration-200 hover:scale-105"
        >
          Reset to Default
        </button>
      </div>

      {/* Tabs */}
      <div className="theme-customizer-tabs">
        <button
          className={`theme-tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Colors
        </button>
        <button
          className={`theme-tab ${activeTab === 'fonts' ? 'active' : ''}`}
          onClick={() => setActiveTab('fonts')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          Typography
        </button>
        <button
          className={`theme-tab ${activeTab === 'effects' ? 'active' : ''}`}
          onClick={() => setActiveTab('effects')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Effects
        </button>
      </div>

      {/* Content */}
      <div className="theme-customizer-content">
        {activeTab === 'colors' && (
          <div className="space-y-6 animate-fade-in">
            {/* Color Presets Grid */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Color Presets
              </label>
              <div className="grid grid-cols-4 gap-3">
                {colorPresets.map((preset, index) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset, index)}
                    onMouseEnter={() => previewPreset(preset)}
                    onMouseLeave={restoreTheme}
                    onFocus={() => previewPreset(preset)}
                    onBlur={restoreTheme}
                    className={`preset-card ${selectedPreset === index ? 'selected' : ''}`}
                    style={{ background: preset.gradient }}
                    title={`Preview ${preset.name} theme`}
                  >
                    <span className="preset-name">{preset.name}</span>
                    {selectedPreset === index && (
                      <div className="preset-check">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Custom Colors
              </label>
              <div className="space-y-3">
                {[
                  { label: 'Primary', key: 'primary' as const, color: customColors.primary },
                  { label: 'Secondary', key: 'secondary' as const, color: customColors.secondary },
                  { label: 'Accent', key: 'accent' as const, color: customColors.accent },
                ].map(({ label, key, color }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label
                      className="relative w-10 h-10 rounded-lg cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all hover:scale-105 overflow-hidden shrink-0"
                      style={{ backgroundColor: color }}
                      title={`Pick ${label} color`}
                    >
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => applyCustomColor(key, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label={`${label} color picker`}
                      />
                    </label>
                    <div className="flex-1">
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className="ml-2 text-xs text-slate-500 font-mono">{color}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Live Preview
              </label>
              <div 
                className="preview-box p-4 rounded-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${customColors.primary}15 0%, ${customColors.secondary}15 100%)`,
                  borderColor: `${customColors.primary}30`
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: customColors.primary }}
                    />
                    <span className="text-sm font-medium" style={{ color: customColors.primary }}>
                      Primary Color
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: customColors.secondary }}
                    />
                    <span className="text-sm font-medium" style={{ color: customColors.secondary }}>
                      Secondary Color
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: customColors.accent }}
                    />
                    <span className="text-sm font-medium" style={{ color: customColors.accent }}>
                      Accent Color
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <button 
                      className="w-full py-2 px-4 rounded-lg text-white text-sm font-medium shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, ${customColors.primary} 0%, ${customColors.secondary} 100%)`,
                        boxShadow: `0 4px 15px ${customColors.primary}40`
                      }}
                    >
                      Sample Button
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="space-y-6 animate-fade-in">
            {/* Font Family Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Font Family
              </label>
              <div className="grid grid-cols-2 gap-3">
                {fontOptions.map((font, index) => (
                  <button
                    key={font.name}
                    onClick={() => applyFont(font, index)}
                    className={`font-option-card ${selectedFont === index ? 'selected' : ''}`}
                    style={{ fontFamily: font.value }}
                  >
                    <span className="font-preview">{font.preview}</span>
                    <span className="font-name">{font.name}</span>
                    {selectedFont === index && (
                      <div className="font-check">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Size Preview
              </label>
              <div 
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                style={{ fontFamily: fontOptions[selectedFont].value }}
              >
                <p className="text-lg font-semibold text-white mb-2">Heading Text</p>
                <p className="text-base text-slate-300 mb-2">Body text content goes here.</p>
                <p className="text-sm text-slate-400">Small caption or helper text.</p>
                <p className="text-xs text-slate-500 mt-2">Extra small legal/disclaimer text.</p>
              </div>
            </div>

            {/* Line Height & Letter Spacing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Line Height
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="1" 
                    max="2" 
                    step="0.1" 
                    defaultValue="1.5"
                    className="flex-1 h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-8">1.5</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Letter Spacing
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="-0.05" 
                    max="0.1" 
                    step="0.01" 
                    defaultValue="0"
                    className="flex-1 h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-xs text-slate-400 w-8">0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-6 animate-fade-in">
            {/* Border Radius */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Border Radius
              </label>
              <div className="grid grid-cols-4 gap-3">
                {borderRadiusOptions.map((option, index) => (
                  <button
                    key={option.name}
                    onClick={() => applyBorderRadius(option, index)}
                    className={`radius-option-card ${borderRadius === index ? 'selected' : ''}`}
                    style={{ borderRadius: option.value }}
                  >
                    <span className="radius-preview">{option.preview}</span>
                    <span className="radius-name">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glass Effect Intensity */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Glass Effect Intensity: {glassIntensity}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={glassIntensity}
                onChange={(e) => setGlassIntensity(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">Solid</span>
                <span className="text-xs text-slate-500">Glass</span>
                <span className="text-xs text-slate-500">Transparent</span>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Visual Effects
              </label>
              
              {/* Reduced Motion */}
              <div className="effect-toggle-item">
                <div className="effect-info">
                  <div className="effect-icon">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm text-white">Reduced Motion</span>
                    <p className="text-xs text-slate-500">Minimize animations for accessibility</p>
                  </div>
                </div>
                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`toggle-switch ${reducedMotion ? 'active' : ''}`}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>

              {/* Compact Mode */}
              <div className="effect-toggle-item">
                <div className="effect-info">
                  <div className="effect-icon">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm text-white">Compact Mode</span>
                    <p className="text-xs text-slate-500">Reduce spacing and padding</p>
                  </div>
                </div>
                <button
                  onClick={() => setCompactMode(!compactMode)}
                  className={`toggle-switch ${compactMode ? 'active' : ''}`}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Effects Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Effects Preview
              </label>
              <div 
                className="p-4 rounded-xl backdrop-blur-md border border-white/10"
                style={{ 
                  borderRadius: borderRadiusOptions[borderRadius].value,
                  backdropFilter: `blur(${glassIntensity * 0.2}px)`
                }}
              >
                <div className="glass-preview-item glass-card-hover">
                  <p className="text-sm text-white font-medium">Glass Card Preview</p>
                  <p className="text-xs text-slate-400">Hover me to see effects!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
