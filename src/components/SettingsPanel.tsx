import React from 'react';
import { useStore } from '../store/useStore';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, inferenceSettings, updateInferenceSettings } = useStore();

  return (
    <div className="bg-dark-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </h2>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Language Settings */}
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
            Language / زبان
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-750 transition-colors">
              <div>
                <span className="text-sm font-medium text-white">Display Language</span>
                <p className="text-xs text-dark-500 mt-0.5">UI language preference</p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'ur' | 'both' })}
                className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
              >
                <option value="en">English</option>
                <option value="ur">اردو</option>
                <option value="both">Both (English + Urdu)</option>
              </select>
            </label>

            <label className="flex items-center justify-between p-3 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-750 transition-colors">
              <div>
                <span className="text-sm font-medium text-white">Font Size</span>
                <p className="text-xs text-dark-500 mt-0.5">Text size in chat</p>
              </div>
              <select
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: e.target.value as 'small' | 'medium' | 'large' })}
                className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        </section>

        {/* Inference Settings */}
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
            Model Inference / ماڈل سیٹنگز
          </h3>
          
          <div className="space-y-4">
            {/* Temperature */}
            <SettingSlider
              label="Temperature"
              description="Higher = more creative, Lower = more focused"
              value={inferenceSettings.temperature}
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => updateInferenceSettings({ temperature: v })}
            />

            {/* Top P */}
            <SettingSlider
              label="Top P"
              description="Nucleus sampling parameter"
              value={inferenceSettings.topP}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateInferenceSettings({ topP: v })}
            />

            {/* Top K */}
            <SettingSlider
              label="Top K"
              description="Limit vocabulary to top K tokens"
              value={inferenceSettings.topK}
              min={1}
              max={100}
              step={1}
              onChange={(v) => updateInferenceSettings({ topK: v })}
            />

            {/* Max Tokens */}
            <SettingSlider
              label="Max Tokens"
              description="Maximum response length"
              value={inferenceSettings.maxTokens}
              min={256}
              max={8192}
              step={256}
              onChange={(v) => updateInferenceSettings({ maxTokens: v })}
            />

            {/* Repeat Penalty */}
            <SettingSlider
              label="Repeat Penalty"
              description="Penalize repetition (1.0 = off)"
              value={inferenceSettings.repeatPenalty}
              min={1}
              max={2}
              step={0.05}
              onChange={(v) => updateInferenceSettings({ repeatPenalty: v })}
            />

            {/* Threads */}
            <SettingSlider
              label="CPU Threads"
              description="-1 = auto-detect all cores"
              value={inferenceSettings.threads}
              min={-1}
              max={32}
              step={1}
              onChange={(v) => updateInferenceSettings({ threads: v })}
            />
          </div>
        </section>

        {/* Behavior Settings */}
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
            Behavior / رویہ
          </h3>
          
          <div className="space-y-3">
            <ToggleSetting
              label="Stream Responses"
              description="Show response as it generates"
              checked={settings.streamResponse}
              onChange={(v) => updateSettings({ streamResponse: v })}
            />
            
            <ToggleSetting
              label="Auto-save Chats"
              description="Automatically save conversation history"
              checked={settings.autoSave}
              onChange={(v) => updateSettings({ autoSave: v })}
            />
            
            <ToggleSetting
              label="Show Line Numbers"
              description="Display line numbers in code blocks"
              checked={settings.showLineNumbers}
              onChange={(v) => updateSettings({ showLineNumbers: v })}
            />
          </div>
        </section>

        {/* Paths */}
        <section>
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
            Paths / راستے
          </h3>
          
          <div className="space-y-3 p-4 bg-dark-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Model Directory</p>
                <p className="text-xs text-dark-500">{settings.modelPath || 'Not set'}</p>
              </div>
            </div>
            <div className="w-full h-px bg-dark-700"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Projects Directory</p>
                <p className="text-xs text-dark-500">{settings.projectsPath || 'Not set'}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-dark-800 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// Slider component for numeric settings
function SettingSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="p-3 bg-dark-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-white">{label}</span>
          <p className="text-xs text-dark-500">{description}</p>
        </div>
        <span className="text-sm font-mono text-primary-400 bg-dark-900 px-2 py-1 rounded">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
      />
    </div>
  );
}

// Toggle component for boolean settings
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-750 transition-colors">
      <div>
        <span className="text-sm font-medium text-white">{label}</span>
        <p className="text-xs text-dark-500 mt-0.5">{description}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-dark-600'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'left-6' : 'left-1'
          }`}
        ></div>
      </div>
    </label>
  );
}
