import React, { useState } from 'react';
import { useStore } from '../store/useStore';

interface SliderSetting {
  key: keyof import('../types').InferenceSettings;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  defaultValue: number;
}

const sliderSettings: SliderSetting[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    description: 'Controls randomness. Higher = more creative, Lower = more focused',
    min: 0,
    max: 2,
    step: 0.1,
    defaultValue: 0.7,
  },
  {
    key: 'topP',
    label: 'Top P (Nucleus Sampling)',
    description: 'Considers tokens within p probability mass. Lower = more focused',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.9,
  },
  {
    key: 'topK',
    label: 'Top K',
    description: 'Limits token selection to top K options. 0 = disabled',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 40,
  },
  {
    key: 'repeatPenalty',
    label: 'Repeat Penalty',
    description: 'Penalizes repetition. Higher = less repetitive output',
    min: 1,
    max: 2,
    step: 0.05,
    defaultValue: 1.1,
  },
];

interface PresetConfig {
  name: string;
  icon: React.ReactNode;
  description: string;
  settings: {
    temperature: number;
    topP: number;
    topK: number;
    repeatPenalty: number;
  };
}

const presets: PresetConfig[] = [
  {
    name: 'Balanced',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    description: 'Good balance of creativity and focus',
    settings: { temperature: 0.7, topP: 0.9, topK: 40, repeatPenalty: 1.1 },
  },
  {
    name: 'Creative',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    description: 'More creative and diverse responses',
    settings: { temperature: 1.2, topP: 0.95, topK: 60, repeatPenalty: 1.05 },
  },
  {
    name: 'Precise',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    description: 'Focused, factual, and deterministic',
    settings: { temperature: 0.2, topP: 0.75, topK: 20, repeatPenalty: 1.2 },
  },
  {
    name: 'Code Gen',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    description: 'Optimized for code generation tasks',
    settings: { temperature: 0.4, topP: 0.85, topK: 30, repeatPenalty: 1.15 },
  },
];

export default function AISettingsPanel() {
  const { inferenceSettings, updateInferenceSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(inferenceSettings);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSliderChange = (key: keyof typeof localSettings, value: number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: PresetConfig, index: number) => {
    setSelectedPreset(index);
    setLocalSettings(prev => ({ ...prev, ...preset.settings }));
    updateInferenceSettings(preset.settings);
  };

  const saveSettings = () => {
    updateInferenceSettings(localSettings);
  };

  const resetToDefaults = () => {
    const defaults = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxTokens: 4096,
      repeatPenalty: 1.1,
      threads: -1,
      gpuLayers: 0,
    };
    setLocalSettings(defaults);
    updateInferenceSettings(defaults);
    setSelectedPreset(0);
  };

  const getTemperatureColor = (value: number) => {
    if (value <= 0.3) return 'from-blue-500 to-cyan-500';
    if (value <= 0.7) return 'from-emerald-500 to-teal-500';
    if (value <= 1.2) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getTemperatureLabel = (value: number) => {
    if (value <= 0.3) return 'Cold ❄️';
    if (value <= 0.7) return 'Moderate 🌤️';
    if (value <= 1.2) return 'Hot 🔥';
    return 'Extreme ☄️';
  };

  return (
    <div className="ai-settings-container">
      {/* Header */}
      <div className="ai-settings-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Settings</h2>
            <p className="text-xs text-slate-400">Configure model behavior</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all"
          >
            Reset
          </button>
          <button
            onClick={saveSettings}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 rounded-lg transition-all shadow-lg shadow-cyan-500/25"
          >
            Save
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-4 gap-3">
          {presets.map((preset, index) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset, index)}
              className={`preset-card ${selectedPreset === index ? 'selected' : ''}`}
            >
              <div className="preset-icon">{preset.icon}</div>
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

      {/* Temperature - Featured Slider */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-sm font-medium text-white flex items-center gap-2">
              🌡️ Temperature
              <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getTemperatureColor(localSettings.temperature)} text-white`}>
                {getTemperatureLabel(localSettings.temperature)}
              </span>
            </label>
            <p className="text-xs text-slate-400 mt-1">{sliderSettings[0].description}</p>
          </div>
          <span className="text-lg font-mono font-bold text-white">{localSettings.temperature.toFixed(1)}</span>
        </div>
        
        <input
          type="range"
          min={sliderSettings[0].min}
          max={sliderSettings[0].max}
          step={sliderSettings[0].step}
          value={localSettings.temperature}
          onChange={(e) => handleSliderChange('temperature', Number(e.target.value))}
          className="ai-slider w-full"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #22c55e ${(localSettings.temperature / 2) * 100}%, #eab308 ${Math.min((localSettings.temperature / 2) * 100 + 20, 100)}%, #ef4444 100%)`
          }}
        />
        
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Precise</span>
          <span>Balanced</span>
          <span>Creative</span>
          <span>Chaotic</span>
        </div>
      </div>

      {/* Other Sliders */}
      <div className="space-y-5 mb-6">
        {sliderSettings.slice(1).map(setting => (
          <div key={setting.key}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-sm font-medium text-white">{setting.label}</label>
                <p className="text-xs text-slate-500">{setting.description}</p>
              </div>
              <span className="text-sm font-mono font-semibold text-white px-2 py-0.5 bg-slate-700/50 rounded">
                {localSettings[setting.key]}{setting.unit || ''}
              </span>
            </div>
            
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={localSettings[setting.key]}
              onChange={(e) => handleSliderChange(setting.key, Number(e.target.value))}
              className="ai-slider w-full"
            />
            
            <div className="flex justify-between mt-1 text-xs text-slate-600">
              <span>{setting.min}</span>
              <span>{setting.max}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors mb-4"
      >
        <span className="text-sm font-medium text-white flex items-center gap-2">
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings
        </span>
        <span className="text-xs text-slate-400">Threads, GPU, Tokens</span>
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 animate-fade-in">
          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">Max Tokens</label>
              <span className="text-sm font-mono font-semibold text-white">{localSettings.maxTokens.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={256}
              max={16384}
              step={256}
              value={localSettings.maxTokens}
              onChange={(e) => handleSliderChange('maxTokens', Number(e.target.value))}
              className="ai-slider w-full"
            />
            <div className="flex justify-between mt-1 text-xs text-slate-600">
              <span>256</span>
              <span>8192</span>
              <span>16384</span>
            </div>
          </div>

          {/* Threads */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">CPU Threads</label>
              <span className="text-sm font-mono font-semibold text-white">
                {localSettings.threads === -1 ? 'Auto' : localSettings.threads}
              </span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 4, 8, -1].map(threads => (
                <button
                  key={threads}
                  onClick={() => handleSliderChange('threads', threads)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    localSettings.threads === threads
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {threads === -1 ? 'Auto' : threads}
                </button>
              ))}
            </div>
          </div>

          {/* GPU Layers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">GPU Layers</label>
              <span className="text-sm font-mono font-semibold text-white">{localSettings.gpuLayers}</span>
            </div>
            <input
              type="range"
              min={0}
              max={64}
              step={1}
              value={localSettings.gpuLayers}
              onChange={(e) => handleSliderChange('gpuLayers', Number(e.target.value))}
              className="ai-slider w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Set to 0 for CPU-only inference</p>
          </div>
        </div>
      )}

      {/* Current Config Preview */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/30">
        <label className="block text-xs font-medium text-slate-400 mb-3">
          Current Configuration Preview
        </label>
        <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "temperature": ${localSettings.temperature},
  "top_p": ${localSettings.topP},
  "top_k": ${localSettings.topK},
  "repeat_penalty": ${localSettings.repeatPenalty},
  "max_tokens": ${localSettings.maxTokens},
  "threads": ${localSettings.threads === -1 ? '"auto"' : localSettings.threads},
  "gpu_layers": ${localSettings.gpuLayers}
}`}
        </pre>
      </div>

      {/* Tips Section */}
      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex gap-2">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-1">💡 Pro Tips:</p>
            <ul className="space-y-1 text-blue-200/80">
              <li>• Use lower temperature for code generation</li>
              <li>• Increase Top-P for creative writing tasks</li>
              <li>• Set GPU layers based on your VRAM (32+ for 8GB)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
