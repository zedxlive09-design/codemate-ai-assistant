import React, { useState } from 'react';
import { useStore } from '../store/useStore';

interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  gradient: string;
}

const colorPresets: ColorPreset[] = [
  {
    name: 'Ocean Blue',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#22d3ee',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
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
  },
  {
    name: 'Emerald Forest',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    background: '#0a1a15',
    surface: '#14261f',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
  },
  {
    name: 'Amber Glow',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fbbf24',
    background: '#1a1505',
    surface: '#332a10',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
  },
  {
    name: 'Midnight',
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#818cf8',
    background: '#090912',
    surface: '#13132b',
    text: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'effects'>('colors');
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customColors, setCustomColors] = useState({
    primary: colorPresets[0].primary,
    secondary: colorPresets[0].secondary,
    accent: colorPresets[0].accent,
  });
  const [selectedFont, setSelectedFont] = useState(0);
  const [borderRadius, setBorderRadius] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [glassIntensity, setGlassIntensity] = useState(50);

  const applyPreset = (preset: ColorPreset, index: number) => {
    setSelectedPreset(index);
    setCustomColors({
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent,
    });
    
    // Apply CSS variables
    document.documentElement.style.setProperty('--color-primary', preset.primary);
    document.documentElement.style.setProperty('--color-secondary', preset.secondary);
    document.documentElement.style.setProperty('--color-accent', preset.accent);
    document.documentElement.style.setProperty('--color-background', preset.background);
    document.documentElement.style.setProperty('--color-surface', preset.surface);
    
    updateSettings({ theme: preset.name.toLowerCase().replace(' ', '-') });
  };

  const applyFont = (font: FontOption, index: number) => {
    setSelectedFont(index);
    document.documentElement.style.setProperty('--font-family', font.value);
  };

  const applyBorderRadius = (option: BorderRadiusOption, index: number) => {
    setBorderRadius(index);
    document.documentElement.style.setProperty('--border-radius', option.value);
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
            // Reset to default
            applyPreset(colorPresets[0], 0);
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
                    className={`preset-card ${selectedPreset === index ? 'selected' : ''}`}
                    style={{ background: preset.gradient }}
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
                  { label: 'Primary', key: 'primary', color: customColors.primary },
                  { label: 'Secondary', key: 'secondary', color: customColors.secondary },
                  { label: 'Accent', key: 'accent', color: customColors.accent },
                ].map(({ label, key, color }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all hover:scale-105"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        // Simulate color picker (would use actual input in production)
                        const newColor = prompt(`Enter ${label} color (hex):`, color);
                        if (newColor && /^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                          setCustomColors(prev => ({ ...prev, [key]: newColor }));
                          document.documentElement.style.setProperty(`--color-${key}`, newColor);
                        }
                      }}
                    />
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
