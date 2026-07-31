import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { modelCommands, fileCommands } from '../lib/tauri';
import type { ModelConfig } from '../types';

interface ModelManagerProps {
  onClose: () => void;
}

// --- Safe numeric formatters (guard against undefined/0 -> NaN) ---
function formatSizeGB(size: number | undefined): string {
  if (!size || !Number.isFinite(size) || size <= 0) return 'Unknown';
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function formatContextK(contextLength: number | undefined): string {
  if (!contextLength || !Number.isFinite(contextLength) || contextLength <= 0) return '—';
  return `${(contextLength / 1000).toFixed(0)}K`;
}

// Recommended models for offline use
const RECOMMENDED_MODELS: Omit<ModelConfig, 'path' | 'loaded'>[] = [
  {
    id: 'qwen2.5-coder-7b-q4',
    name: 'Qwen2.5-Coder-7B-Instruct (Q4_K_M)',
    filename: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    size: 4.7 * 1024 * 1024 * 1024, // ~4.7GB
    quantization: 'Q4_K_M',
    contextLength: 8192,
    parameters: '7B',
    description: 'Best for coding tasks. Excellent performance on CPU.',
  },
  {
    id: 'deepseek-coder-6.7b-q4',
    name: 'DeepSeek-Coder-6.7B (Q4_K_M)',
    filename: 'deepseek-coder-6.7b-instruct-q4_k_m.gguf',
    size: 4.0 * 1024 * 1024 * 1024, // ~4GB
    quantization: 'Q4_K_M',
    contextLength: 8192,
    parameters: '6.7B',
    description: 'Specialized in code generation and debugging.',
  },
  {
    id: 'mistral-7b-q4',
    name: 'Mistral-7B-Instruct (Q4_K_M)',
    filename: 'mistral-7b-instruct-v0.3-q4_k_m.gguf',
    size: 4.4 * 1024 * 1024 * 1024, // ~4.4GB
    quantization: 'Q4_K_M',
    contextLength: 8192,
    parameters: '7B',
    description: 'Versatile general-purpose model with good reasoning.',
  },
  {
    id: 'codegemma-7b-q4',
    name: 'CodeGemma-7B (Q4_K_M)',
    filename: 'codegemma-7b-it-q4_k_m.gguf',
    size: 4.8 * 1024 * 1024 * 1024, // ~4.8GB
    quantization: 'Q4_K_M',
    contextLength: 8192,
    parameters: '7B',
    description: "Google's code-focused model. Great for completion.",
  },
];

export default function ModelManager({ onClose }: ModelManagerProps) {
  const {
    availableModels,
    setAvailableModels,
    selectedModelId,
    setSelectedModel,
    modelLoaded,
    setModelLoaded,
    settings,
    updateSettings,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'local' | 'recommended'>('local');
  const [error, setError] = useState<string | null>(null);

  // Load available models on mount
  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      const models = await modelCommands.listModels();
      setAvailableModels(models);
    } catch (err) {
      console.error('Failed to list models:', err);
      // For demo, show recommended as available
      setAvailableModels([]);
    }
  };

  const handleLoadModel = async (modelPath: string, modelId: string) => {
    setLoading(true);
    setLoadingModelId(modelId);
    setError(null);

    try {
      const result = await modelCommands.loadModel(modelPath);
      
      if (result.success) {
        setSelectedModel(modelId);
        setModelLoaded(true);
      } else {
        setError(result.message || 'Failed to load model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
    } finally {
      setLoading(false);
      setLoadingModelId(null);
    }
  };

  const handleUnloadModel = async () => {
    try {
      await modelCommands.unloadModel();
      setSelectedModel('');
      setModelLoaded(false);
    } catch (err) {
      console.error('Failed to unload model:', err);
    }
  };

  const handleSelectModelFile = async () => {
    try {
      const path = await fileCommands.selectFile([
        { name: 'GGUF Models', extensions: ['gguf'] },
        { name: 'All Files', extensions: ['*'] },
      ]);
      
      if (path) {
        // Extract model info from path
        const filename = path.split('/').pop() || '';
        handleLoadModel(path, filename);
      }
    } catch (e) {
      console.warn('Dialog failed:', e);
      // Fallback
      const path = prompt('Enter model path:');
      if (path) {
        handleLoadModel(path, path.split('/').pop() || path);
      }
    }
  };

  const handleSetModelDirectory = async () => {
    try {
      const dir = await fileCommands.selectFolder();
      if (dir) {
        updateSettings({ modelPath: dir });
        await loadAvailableModels();
      }
    } catch (e) {
      console.warn('Dialog failed:', e);
      const dir = prompt('Enter model directory path:');
      if (dir) {
        updateSettings({ modelPath: dir });
        await loadAvailableModels();
      }
    }
  };

  return (
    <div className="bg-dark-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Model Manager
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

      {/* Current Model Status */}
      <div className={`px-6 py-4 ${modelLoaded ? 'bg-green-900/20 border-b border-green-800/30' : 'bg-yellow-900/20 border-b border-yellow-800/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              modelLoaded ? 'bg-green-600' : 'bg-yellow-600'
            }`}>
              {modelLoaded ? (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium text-white">
                {modelLoaded ? 'Model Loaded' : 'No Model Loaded'}
              </p>
              <p className="text-sm text-dark-400">
                {selectedModelId || 'Select a model to start chatting'}
              </p>
            </div>
          </div>
          
          {modelLoaded && (
            <button
              onClick={handleUnloadModel}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
            >
              Unload
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-800">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'local' 
              ? 'text-primary-400 border-b-2 border-primary-400' 
              : 'text-dark-500 hover:text-dark-300'
          }`}
        >
          📁 Local Models ({availableModels.length})
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'recommended' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-dark-500 hover:text-dark-300'
          }`}
        >
          ⭐ Recommended
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {activeTab === 'local' ? (
          /* Local Models Tab */
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleSelectModelFile}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Select GGUF File
              </button>
              <button
                onClick={handleSetModelDirectory}
                className="py-3 px-4 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Set Directory
              </button>
            </div>

            {/* Model Path Display */}
            {settings.modelPath && (
              <div className="p-3 bg-dark-800 rounded-lg text-sm">
                <span className="text-dark-500">Model directory:</span>{' '}
                <span className="text-dark-300">{settings.modelPath}</span>
              </div>
            )}

            {/* Available Models List */}
            {availableModels.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>No models found</p>
                <p className="text-sm mt-1">Select a GGUF file or set a model directory</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isSelected={selectedModelId === model.id}
                    isLoading={loadingModelId === model.id}
                    onLoad={() => handleLoadModel(model.path, model.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Recommended Models Tab */
          <div className="space-y-4">
            <div className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-lg">
              <h4 className="font-medium text-purple-300 flex items-center gap-2">
                💡 Recommended for CPU-only machines
              </h4>
              <p className="text-sm text-purple-200/70 mt-1">
                These models are optimized for CPU inference using Q4_K_M quantization.
                They provide excellent quality while being small enough to run smoothly without GPU.
              </p>
            </div>

            <div className="space-y-3">
              {RECOMMENDED_MODELS.map((model) => (
                <RecommendedModelCard key={model.id} model={model} />
              ))}
            </div>

            {/* Download Guide */}
            <div className="mt-6 p-4 bg-dark-800 rounded-lg">
              <h4 className="font-medium text-white mb-3">📥 How to Download Models</h4>
              <ol className="text-sm text-dark-300 space-y-2 list-decimal list-inside">
                <li>Visit <span className="text-primary-400">Hugging Face</span> or <span className="text-primary-400">ModelScope</span></li>
                <li>Search for the model name above</li>
                <li>Go to "Files and versions" tab</li>
                <li>Download the Q4_K_M GGUF file</li>
                <li>Use "Select GGUF File" button above to load it</li>
              </ol>
              
              <div className="mt-4 p-3 bg-dark-900 rounded-lg">
                <p className="text-xs text-dark-500 font-mono">
                  Expected download size: 4-5 GB per model<br/>
                  Recommended RAM: 8GB+ for smooth operation
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-dark-800 bg-dark-850">
        <div className="flex items-center justify-between text-xs text-dark-500">
          <span>Supported format: GGUF (llama.cpp)</span>
          <span>Context: Up to 8K tokens • CPU optimized</span>
        </div>
      </div>
    </div>
  );
}

// Model card component for local models
function ModelCard({
  model,
  isSelected,
  isLoading,
  onLoad,
}: {
  model: ModelConfig;
  isSelected: boolean;
  isLoading: boolean;
  onLoad: () => void;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isSelected 
        ? 'bg-green-900/10 border-green-700' 
        : 'bg-dark-800 border-dark-700 hover:border-dark-600'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{model.name}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
            <span>{model.parameters}</span>
            <span>•</span>
            <span>{model.quantization}</span>
            <span>•</span>
            <span>{formatSizeGB(model.size)}</span>
          </div>
          <p className="text-xs text-dark-500 mt-2 line-clamp-2">{model.description}</p>
        </div>
        
        <button
          onClick={onLoad}
          disabled={isLoading || isSelected}
          className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
            isSelected
              ? 'bg-green-600 text-white'
              : isLoading
              ? 'bg-dark-700 text-dark-400 animate-pulse'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {isSelected ? '✓ Loaded' : isLoading ? 'Loading...' : 'Load'}
        </button>
      </div>
    </div>
  );
}

// Recommended model card
function RecommendedModelCard({ 
  model 
}: { 
  model: Omit<ModelConfig, 'path' | 'loaded'> 
}) {
  return (
    <div className="p-4 rounded-xl border border-dark-700 bg-dark-800/50 hover:border-purple-600/50 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl shrink-0">
          🤖
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white">{model.name}</h4>
            {model.id.includes('qwen') && (
              <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full">
                Best for Code
              </span>
            )}
          </div>
          
          <p className="text-sm text-dark-400 mt-1">{model.description}</p>
          
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
            <span className="px-2 py-1 bg-dark-700 rounded text-dark-300">
              {model.parameters}
            </span>
            <span className="px-2 py-1 bg-dark-700 rounded text-dark-300">
              {model.quantization}
            </span>
            <span className="px-2 py-1 bg-dark-700 rounded text-dark-300">
              {formatSizeGB(model.size)}
            </span>
            <span className="px-2 py-1 bg-dark-700 rounded text-dark-300">
              Context: {formatContextK(model.contextLength)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
