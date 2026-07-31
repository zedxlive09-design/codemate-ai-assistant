import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';
import {
  detectSystemSpecs,
  getModelRecommendations,
  formatMemory,
  getPerformanceColor,
  getPerformanceIcon,
  SystemSpecs,
  ModelRecommendation
} from '../lib/systemSpecs';
import { isTauri } from '../lib/isTauri';
import { fileCommands } from '../lib/tauri';
// Binary file write + path helpers are only used inside `if (isTauri)`
// branches below. They are statically imported (matching the pattern in
// `src/lib/tauri.ts`) because the dynamic `await import(...)` pattern is
// unnecessary and the functions only throw when CALLED outside Tauri,
// not at import time.
import { writeFile as writeBinaryFile } from '@tauri-apps/plugin-fs';
import { join, appDataDir as getAppDataDir } from '@tauri-apps/api/path';

interface ModelDownload {
  id: string;
  name: string;
  description: string;
  size: string;
  sizeBytes: number;
  url: string;
  author: string;
  quantization: string;
  parameters: string;
  architecture: string;
  tags: string[];
  downloaded: boolean;
  downloadPath?: string;
  minRAM?: string; // Minimum RAM required
}

interface ModelDownloadManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel?: (model: ModelDownload) => void;
}

// Pre-configured model sources (HuggingFace-compatible)
const AVAILABLE_MODELS: ModelDownload[] = [
  // === RECOMMENDED FOR MOST SYSTEMS ===
  {
    id: 'llama-3-8b-q4',
    name: 'Llama 3 8B Q4_K_M',
    description: "Meta's Llama 3 with 8B parameters. Best balance of quality & speed for most systems.",
    size: '4.9 GB',
    sizeBytes: 5300000000,
    url: 'https://huggingface.co/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct-Q4_K_M.gguf',
    author: 'Meta',
    quantization: 'Q4_K_M',
    parameters: '8B',
    architecture: 'Llama 3',
    tags: ['chat', 'general', 'recommended', '⭐ Top Pick'],
    downloaded: false,
    minRAM: '6 GB',
  },
  {
    id: 'mistral-7b-q4',
    name: 'Mistral 7B Q4_K_M',
    description: "Mistral AI's powerful 7B model. Excellent at code & reasoning tasks.",
    size: '4.1 GB',
    sizeBytes: 4400000000,
    url: 'https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    author: 'Mistral AI',
    quantization: 'Q4_K_M',
    parameters: '7B',
    architecture: 'Mistral',
    tags: ['chat', 'code', 'reasoning', '🔥 Popular'],
    downloaded: false,
    minRAM: '5 GB',
  },

  // === HIGHER QUALITY (More RAM needed) ===
  {
    id: 'llama-3-8b-q5',
    name: 'Llama 3 8B Q5_K_M',
    description: 'Higher quality 5-bit quantization. Better outputs but slower.',
    size: '5.7 GB',
    sizeBytes: 6100000000,
    url: 'https://huggingface.co/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct-Q5_K_M.gguf',
    author: 'Meta',
    quantization: 'Q5_K_M',
    parameters: '8B',
    architecture: 'Llama 3',
    tags: ['chat', 'general', 'quality', '✨ Premium'],
    downloaded: false,
    minRAM: '8 GB',
  },
  {
    id: 'llama-3-8b-q6',
    name: 'Llama 3 8B Q6_K',
    description: 'Near-lossless quality. For users who want the best outputs.',
    size: '6.9 GB',
    sizeBytes: 7400000000,
    url: 'https://huggingface.co/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct-Q6_K.gguf',
    author: 'Meta',
    quantization: 'Q6_K',
    parameters: '8B',
    architecture: 'Llama 3',
    tags: ['chat', 'general', 'ultra-quality', '💎 Best Quality'],
    downloaded: false,
    minRAM: '10 GB',
  },

  // === CODE SPECIALIZED ===
  {
    id: 'codellama-7b-q4',
    name: 'Code Llama 7B Q4_K_M',
    description: 'Specialized for code generation, completion, and debugging.',
    size: '3.8 GB',
    sizeBytes: 4100000000,
    url: 'https://huggingface.co/codellama/CodeLlama-7B-Instruct-GGUF/resolve/main/CodeLlama-7B-Instruct-Q4_K_M.gguf',
    author: 'Meta',
    quantization: 'Q4_K_M',
    parameters: '7B',
    architecture: 'Code Llama',
    tags: ['code', 'programming', 'completion', '💻 Code'],
    downloaded: false,
    minRAM: '5 GB',
  },
  {
    id: 'deepseek-coder-6.7b-q4',
    name: 'DeepSeek Coder 6.7B Q4_K_M',
    description: 'Excellent code model with strong performance on benchmarks.',
    size: '3.9 GB',
    sizeBytes: 4200000000,
    url: 'https://huggingface.co/deepseek-ai/DeepSeek-Coder-6.7B-instruct-GGUF/resolve/main/deepseek-coder-6.7b-instruct.Q4_K_M.gguf',
    author: 'DeepSeek AI',
    quantization: 'Q4_K_M',
    parameters: '6.7B',
    architecture: 'DeepSeek',
    tags: ['code', 'programming', 'benchmark-top', '🏆 Strong'],
    downloaded: false,
    minRAM: '5 GB',
  },

  // === COMPACT / FAST (For low-RAM systems) ===
  {
    id: 'phi-3-mini-q4',
    name: 'Phi-3 Mini 3.8B Q4_K_M',
    description: "Microsoft's compact but powerful model. Great for older hardware.",
    size: '2.2 GB',
    sizeBytes: 2400000000,
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf',
    author: 'Microsoft',
    quantization: 'Q4_K_M',
    parameters: '3.8B',
    architecture: 'Phi-3',
    tags: ['compact', 'fast', 'efficient', '⚡ Fast'],
    downloaded: false,
    minRAM: '3 GB',
  },
  {
    id: 'gemma-2b-it-q4',
    name: 'Gemma 2B IT Q4_K_M',
    description: "Google's lightweight model. Instant responses on any system.",
    size: '1.4 GB',
    sizeBytes: 1500000000,
    url: 'https://huggingface.co/google/gemma-2b-it-GGUF/resolve/main/gemma-2b-it-Q4_K_M.gguf',
    author: 'Google',
    quantization: 'Q4_K_M',
    parameters: '2B',
    architecture: 'Gemma',
    tags: ['compact', 'lightweight', 'it', '🪶 Feather'],
    downloaded: false,
    minRAM: '2 GB',
  },
  {
    id: 'tinyllama-1.1b-q4',
    name: 'TinyLlama 1.1B Q4_K_M',
    description: 'Ultra-lightweight for minimal systems or quick testing.',
    size: '0.7 GB',
    sizeBytes: 750000000,
    url: 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf',
    author: 'TinyLlama',
    quantization: 'Q4_K_M',
    parameters: '1.1B',
    architecture: 'TinyLlama',
    tags: ['compact', 'testing', 'minimal', '🐜 Tiny'],
    downloaded: false,
    minRAM: '1.5 GB',
  },

  // === LARGE MODELS (For powerful systems only) ===
  {
    id: 'llama-3-70b-q4',
    name: 'Llama 3 70B Q4_K_M',
    description: 'Massive 70B parameter model. Requires powerful hardware.',
    size: '38 GB',
    sizeBytes: 40800000000,
    url: 'https://huggingface.co/Meta-Llama-3-70B-Instruct-GGUF/resolve/main/Meta-Llama-3-70B-Instruct-Q4_K_M.gguf',
    author: 'Meta',
    quantization: 'Q4_K_M',
    parameters: '70B',
    architecture: 'Llama 3',
    tags: ['large', 'powerful', 'expert', '👑 King'],
    downloaded: false,
    minRAM: '48 GB',
  },
  {
    id: 'mixtral-8x7b-q4',
    name: 'Mixtral 8x7B Q4_K_M',
    description: 'Mixture of Experts. Versatile and capable across many tasks.',
    size: '24 GB',
    sizeBytes: 25700000000,
    url: 'https://huggingface.co/mixtrai/Mixtral-8x7B-Instruct-v0.1-GGUF/resolve/main/Mixtral-8x7B-Instruct-v0.1-Q4_K_M.gguf',
    author: 'Mistral AI',
    quantization: 'Q4_K_M',
    parameters: '47B (active 12.9B)',
    architecture: 'Mixtral MoE',
    tags: ['moe', 'versatile', 'advanced', '🧠 Smart'],
    downloaded: false,
    minRAM: '32 GB',
  },
];

const QUANTIZATION_OPTIONS = ['Q2_K', 'Q3_K_S', 'Q3_K_M', 'Q4_K_S', 'Q4_K_M', 'Q5_K_S', 'Q5_K_M', 'Q6_K', 'Q8_0'];
const PARAMETER_OPTIONS = ['< 4B', '4B - 8B', '8B - 14B', '14B - 32B', '> 32B'];

export default function ModelDownloadManager({ isOpen, onClose, onSelectModel }: ModelDownloadManagerProps) {
  const [selectedModel, setSelectedModel] = useState<ModelDownload | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuantization, setFilterQuantization] = useState<string>('all');
  const [filterParameters, setFilterParameters] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'size' | 'name' | 'popular'>('recommended');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  
  // System specs state
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);
  const [isDetectingSpecs, setIsDetectingSpecs] = useState(true);
  
  const { showToast } = useToast();

  // Detect system specs on mount
  useEffect(() => {
    if (isOpen && !systemSpecs) {
      setIsDetectingSpecs(true);
      detectSystemSpecs()
        .then(specs => {
          setSystemSpecs(specs);
          setRecommendations(getModelRecommendations(specs));
          setIsDetectingSpecs(false);
        })
        .catch(err => {
          console.error('Failed to detect system specs:', err);
          setIsDetectingSpecs(false);
        });
    }
  }, [isOpen]);

  // Filter models
  const filteredModels = useMemo(() => {
    let filtered = [...AVAILABLE_MODELS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.tags.some(t => t.toLowerCase().includes(query)) ||
        m.author.toLowerCase().includes(query)
      );
    }

    // Quantization filter
    if (filterQuantization !== 'all') {
      filtered = filtered.filter(m => m.quantization === filterQuantization);
    }

    // Parameter filter
    if (filterParameters !== 'all') {
      filtered = filtered.filter(m => {
        const params = parseFloat(m.parameters);
        switch (filterParameters) {
          case '< 4B': return params < 4;
          case '4B - 8B': return params >= 4 && params <= 8;
          case '8B - 14B': return params > 8 && params <= 14;
          case '14B - 32B': return params > 14 && params <= 32;
          case '> 32B': return params > 32;
          default: return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case 'size':
        filtered.sort((a, b) => a.sizeBytes - b.sizeBytes);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recommended':
        // Put recommended models first
        const recIds = new Set(recommendations.map(r => r.id));
        filtered.sort((a, b) => {
          const aRec = recIds.has(a.id) ? (recommendations.find(r => r.id === a.id)?.isOptimal ? 2 : 1) : 0;
          const bRec = recIds.has(b.id) ? (recommendations.find(r => r.id === b.id)?.isOptimal ? 2 : 1) : 0;
          return bRec - aRec;
        });
        break;
      default:
        // Popular - keep original order (recommended first)
        break;
    }

    return filtered;
  }, [searchQuery, filterQuantization, filterParameters, sortBy, recommendations]);

  // Real download handler using fetch API
  const handleDownload = useCallback(async (model: ModelDownload) => {
    // Check if we can run this model based on system specs
    if (systemSpecs && model.minRAM) {
      const requiredGB = parseInt(model.minRAM);
      if (requiredGB > systemSpecs.availableMemoryGB) {
        showToast(`⚠️ This model requires ${model.minRAM} RAM, you have ~${systemSpecs.availableMemoryGB}GB available`, 'warning');
        return;
      }
    }

    setIsDownloading(true);
    setSelectedModel(model);
    setDownloadProgress(0);

    try {
      // Try real download first (in Tauri environment)
      if (isTauri) {
        await performRealDownload(model);
      } else {
        // Fallback to simulated download for web/demo
        await simulateDownload(model);
      }
    } catch (error) {
      console.error('Download failed:', error);
      showToast(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsDownloading(false);
    }
  }, [onSelectModel, showToast, systemSpecs]);

  // Simulate download (for demo/web mode)
  const simulateDownload = async (model: ModelDownload): Promise<void> => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          const increment = Math.random() * 15 + 2;
          const newProgress = Math.min(prev + increment, 100);
          
          const speed = Math.floor(Math.random() * 10 + 5);
          setDownloadSpeed(speed);
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsDownloading(false);
              setDownloadProgress(0);
              setDownloadSpeed(0);
              showToast(`${model.name} downloaded successfully! 🎉`, 'success');
              onSelectModel?.({ ...model, downloaded: true });
              resolve();
            }, 500);
          }
          
          return newProgress;
        });
      }, 300);
    });
  };

  // Real download using fetch with progress
  const performRealDownload = async (model: ModelDownload): Promise<void> => {
    try {
      const response = await fetch(model.url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('Content-Length') || '0');
      const reader = response.body?.getReader();
      
      if (!reader) {
        throw new Error('No readable stream available');
      }

      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress
        if (contentLength > 0) {
          const progress = (receivedLength / contentLength) * 100;
          setDownloadProgress(progress);
          
          // Estimate speed (rough calculation)
          setDownloadSpeed(receivedLength / 1024); // KB received so far
        }
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      // In Tauri, save to file system. `isTauri` is true here because
      // `performRealDownload` is only invoked from the `isTauri` branch
      // above; the static imports of `writeBinaryFile` / `join` /
      // `getAppDataDir` are safe because they are only CALLED inside
      // this block. `fileCommands.createDirectory` dispatches through the
      // `tauri.ts` bridge and uses `@tauri-apps/plugin-fs` `mkdir` here.
      if (isTauri) {
        const appDataDirPath = await getAppDataDir();
        const modelsDir = await join(appDataDirPath, 'models');
        await fileCommands.createDirectory(modelsDir);

        const filePath = await join(modelsDir, `${model.id}.gguf`);
        await writeBinaryFile(filePath, allChunks);

        showToast(`${model.name} saved to ${filePath}`, 'success');
      }

      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadSpeed(0);
      onSelectModel?.({ ...model, downloaded: true, downloadPath: model.id + '.gguf' });

    } catch (error) {
      throw error;
    }
  };

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec < 1024 * 1024) {
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    }
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getParameterColor = (params: string): string => {
    const num = parseFloat(params);
    if (num < 4) return 'text-emerald-400 bg-emerald-500/10';
    if (num < 8) return 'text-blue-400 bg-blue-500/10';
    if (num < 14) return 'text-purple-400 bg-purple-500/10';
    if (num < 32) return 'text-orange-400 bg-orange-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  // Get recommendation badge for a model
  const getRecommendationBadge = (modelId: string): { text: string; className: string } | null => {
    const rec = recommendations.find(r => r.id === modelId);
    if (!rec) return null;
    
    if (rec.isOptimal) {
      return { text: `⭐ Optimal for your system`, className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    }
    if (rec.isRecommended) {
      return { text: `✓ Recommended`, className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
    
    return null;
  };

  // Check if model fits in available memory
  const checkModelFit = (model: ModelDownload): 'fits' | 'tight' | 'wont-fit' => {
    if (!systemSpecs || !model.minRAM) return 'fits';
    
    const requiredGB = parseInt(model.minRAM);
    const availableGB = systemSpecs.availableMemoryGB;
    
    if (requiredGB > availableGB) return 'wont-fit';
    if (requiredGB > availableGB * 0.75) return 'tight';
    return 'fits';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700/80 shadow-2xl shadow-black/40 scale-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 shrink-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </span>
              Download AI Models
            </h2>
            <p className="text-sm text-dark-400 mt-1">Browse and download GGUF models optimized for your system</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* System Specs Banner */}
        {systemSpecs && (
          <div className={`px-6 py-3 border-b border-dark-800/80 ${getPerformanceColor(systemSpecs.performanceScore)} bg-opacity-10`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <span className="text-lg">{getPerformanceIcon(systemSpecs.performanceScore)}</span>
                <div>
                  <p className="text-xs font-medium text-white">
                    Your System: {systemSpecs.cpuCores} cores • {formatMemory(systemSpecs.totalMemoryMB)} RAM • {systemSpecs.performanceScore.toUpperCase()} Performance
                  </p>
                  <p className="text-[10px] opacity-80">
                    Recommended: Up to {systemSpecs.maxRecommendedParams} parameters • Can run: {systemSpecs.canRunQuantization.join(', ')}
                  </p>
                </div>
              </div>
              
              {/* Quick recommendation highlight */}
              {recommendations[0]?.isOptimal && (
                <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <span className="text-xs font-medium text-purple-300">
                    ⭐ Best fit: {recommendations[0].name}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detecting specs placeholder */}
        {isDetectingSpecs && (
          <div className="px-6 py-3 border-b border-dark-800/80 bg-dark-800/50">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-dark-400">Detecting your system specifications...</span>
            </div>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && selectedModel && (
          <div className="px-6 py-4 bg-blue-500/5 border-b border-blue-500/20 slide-down">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">Downloading {selectedModel.name}</p>
                <div className="flex items-center gap-2 text-xs text-dark-400">
                  <span>{Math.round(downloadProgress)}% complete</span>
                  <span>•</span>
                  <span>{selectedModel.size}</span>
                  <span>•</span>
                  <span>{formatSpeed(downloadSpeed * 1024 * 1024)}</span>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-sm font-mono ${
                downloadProgress >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {downloadProgress >= 100 ? '✓ Complete' : `${Math.round(downloadProgress)}%`}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 rounded-full transition-all duration-300 relative"
                style={{ width: `${downloadProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(45deg, transparent 45%, rgba(255,255,255,.15) 55%, transparent)' }} />
              </div>
            </div>

            {/* ETA */}
            {downloadProgress < 100 && downloadProgress > 0 && (
              <p className="text-[10px] text-dark-500 mt-2">
                ⏱️ Estimated time remaining: {Math.ceil((100 - downloadProgress) / 10)}s
              </p>
            )}
          </div>
        )}

        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-dark-800/80 space-y-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models by name, tag, or author..."
              disabled={isDownloading}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/60 rounded-xl text-white placeholder-dark-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
            />
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              disabled={isDownloading}
              className="px-2.5 py-1.5 bg-dark-800/60 border border-dark-700/60 rounded-lg text-xs text-dark-300 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="recommended">⭐ Recommended</option>
              <option value="popular">🔥 Popular</option>
              <option value="size">📦 Size</option>
              <option value="name">🔤 Name</option>
            </select>

            {/* Quantization */}
            <select
              value={filterQuantization}
              onChange={(e) => setFilterQuantization(e.target.value)}
              disabled={isDownloading}
              className="px-2.5 py-1.5 bg-dark-800/60 border border-dark-700/60 rounded-lg text-xs text-dark-300 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="all">All Quant</option>
              {QUANTIZATION_OPTIONS.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>

            {/* Parameters */}
            <select
              value={filterParameters}
              onChange={(e) => setFilterParameters(e.target.value)}
              disabled={isDownloading}
              className="px-2.5 py-1.5 bg-dark-800/60 border border-dark-700/60 rounded-lg text-xs text-dark-300 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="all">All Sizes</option>
              {PARAMETER_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Custom URL Toggle */}
            <button
              onClick={() => setShowCustomUrl(!showCustomUrl)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showCustomUrl 
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-dark-800/60 text-dark-400 border border-dark-700/60 hover:text-dark-300'
              }`}
            >
              🔗 Custom URL
            </button>
          </div>

          {/* Custom URL Input */}
          {showCustomUrl && (
            <div className="slide-down space-y-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Enter direct .gguf file URL..."
                className="w-full px-3 py-2 bg-dark-800/60 border border-violet-500/30 rounded-lg text-white placeholder-dark-500 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                <span className="text-sm">💡</span>
                <div className="text-[10px] text-dark-400 space-y-1">
                  <p>Paste a direct download link to any .gguf file from:</p>
                  <p className="text-violet-400">• HuggingFace (right-click → Copy link address)</p>
                  <p className="text-violet-400">• Any direct file hosting service</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
          {filteredModels.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-dark-500">
              <div className="w-16 h-16 rounded-full bg-dark-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <p className="text-sm font-medium">No models found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredModels.map((model) => {
                const badge = getRecommendationBadge(model.id);
                const fitStatus = checkModelFit(model);
                
                return (
                  <div
                    key={model.id}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                      selectedModel?.id === model.id
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50'
                    } ${isDownloading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {/* Recommendation Badge */}
                    {badge && (
                      <div className={`absolute -top-2 left-4 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badge.className}`}>
                        {badge.text}
                      </div>
                    )}

                    {/* Memory Fit Indicator */}
                    {fitStatus !== 'fits' && (
                      <div className={`absolute -top-2 right-4 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        fitStatus === 'wont-fit' 
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {fitStatus === 'wont-fit' ? '❌ Not enough RAM' : '⚠️ Tight fit'}
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 mt-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{model.name}</h3>
                        <p className="text-xs text-dark-500 mt-0.5 line-clamp-2">{model.description}</p>
                      </div>
                      
                      {/* Author Badge */}
                      <span className="shrink-0 ml-2 px-2 py-0.5 rounded-md bg-dark-700/50 text-[10px] text-dark-400">
                        {model.author}
                      </span>
                    </div>

                    {/* Tags & Stats */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${getParameterColor(model.parameters)}`}>
                        {model.parameters}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-dark-700/50 text-[10px] font-mono text-dark-400">
                        {model.quantization}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-dark-700/30 text-[10px] text-dark-500">
                        📦 {model.size}
                      </span>
                      {model.minRAM && (
                        <span className="px-2 py-0.5 rounded-md bg-dark-700/30 text-[10px] text-dark-500">
                          🧠 Min: {model.minRAM}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {model.tags.map(tag => (
                        <span 
                          key={tag} 
                          className={`px-1.5 py-0.5 rounded bg-dark-900/50 text-[10px] ${
                            tag.includes('⭐') || tag.includes('Top') ? 'text-yellow-400' :
                            tag.includes('🔥') || tag.includes('Popular') ? 'text-orange-400' :
                            tag.includes('💎') || tag.includes('Best') ? 'text-cyan-400' :
                            tag.includes('⚡') || tag.includes('Fast') ? 'text-green-400' :
                            'text-dark-500'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleDownload(model)}
                      disabled={isDownloading || model.downloaded || fitStatus === 'wont-fit'}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                        model.downloaded
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : isDownloading && selectedModel?.id === model.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-wait'
                            : fitStatus === 'wont-fit'
                              ? 'bg-dark-700/50 text-dark-600 cursor-not-allowed border border-dark-700/30'
                              : 'btn-primary'
                      }`}
                    >
                      {model.downloaded ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Downloaded
                        </span>
                      ) : isDownloading && selectedModel?.id === model.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Downloading...
                        </span>
                      ) : fitStatus === 'wont-fit' ? (
                        <span className="flex items-center justify-center gap-2">
                          ❌ Insufficient RAM
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 border-t border-dark-800 bg-dark-850/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-dark-500 space-x-3">
            <span>💡 Models run locally - no data sent externally</span>
            <span>•</span>
            <span>Q4_K_M recommended for most systems</span>
          </div>
          
          <div className="flex items-center gap-3">
            {systemSpecs && (
              <span className="text-[10px] text-dark-600">
                Detected: {systemSpecs.cpuCores} cores • {systemSpecs.totalMemoryGB}GB RAM
              </span>
            )}
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2 rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AVAILABLE_MODELS };
