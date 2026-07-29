import React, { useState, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface ModelDownload {
  id: string;
  name: string;
  description: string;
  size: string; // in GB
  sizeBytes: number;
  url: string;
  author: string;
  quantization: string;
  parameters: string;
  architecture: string;
  tags: string[];
  downloaded: boolean;
  downloadPath?: string;
}

interface ModelDownloadManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel?: (model: ModelDownload) => void;
}

// Pre-configured model sources (HuggingFace-compatible)
const AVAILABLE_MODELS: ModelDownload[] = [
  {
    id: 'llama-3-8b-q4',
    name: 'Llama 3 8B Q4_K_M',
    description: 'Meta\'s Llama 3 with 8B parameters, 4-bit quantized for CPU inference',
    size: '4.9 GB',
    sizeBytes: 5300000000,
    url: 'https://huggingface.co/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct-Q4_K_M.gguf',
    author: 'Meta',
    quantization: 'Q4_K_M',
    parameters: '8B',
    architecture: 'Llama 3',
    tags: ['chat', 'general', 'recommended'],
    downloaded: false,
  },
  {
    id: 'llama-3-8b-q5',
    name: 'Llama 3 8B Q5_K_M',
    description: 'Higher quality 5-bit quantization of Llama 3 8B',
    size: '5.7 GB',
    sizeBytes: 6100000000,
    url: 'https://huggingface.co/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct-Q5_K_M.gguf',
    author: 'Meta',
    quantization: 'Q5_K_M',
    parameters: '8B',
    architecture: 'Llama 3',
    tags: ['chat', 'general', 'quality'],
    downloaded: false,
  },
  {
    id: 'mistral-7b-q4',
    name: 'Mistral 7B Q4_K_M',
    description: 'Mistral AI\'s powerful 7B model with excellent performance',
    size: '4.1 GB',
    sizeBytes: 4400000000,
    url: 'https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    author: 'Mistral AI',
    quantization: 'Q4_K_M',
    parameters: '7B',
    architecture: 'Mistral',
    tags: ['chat', 'code', 'reasoning'],
    downloaded: false,
  },
  {
    id: 'codellama-7b-q4',
    name: 'Code Llama 7B Q4_K_M',
    description: 'Specialized for code generation and completion tasks',
    size: '3.8 GB',
    sizeBytes: 4100000000,
    url: 'https://huggingface.co/codellama/CodeLlama-7B-Instruct-GGUF/resolve/main/CodeLlama-7B-Instruct-Q4_K_M.gguf',
    author: 'Meta',
    quantization: 'Q4_K_M',
    parameters: '7B',
    architecture: 'Code Llama',
    tags: ['code', 'programming', 'completion'],
    downloaded: false,
  },
  {
    id: 'phi-3-mini-q4',
    name: 'Phi-3 Mini 3.8B Q4_K_M',
    description: 'Microsoft\'s compact but powerful 3.8B parameter model',
    size: '2.2 GB',
    sizeBytes: 2400000000,
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf',
    author: 'Microsoft',
    quantization: 'Q4_K_M',
    parameters: '3.8B',
    architecture: 'Phi-3',
    tags: ['compact', 'fast', 'efficient'],
    downloaded: false,
  },
  {
    id: 'gemma-2b-it-q4',
    name: 'Gemma 2B IT Q4_K_M',
    description: 'Google\'s lightweight Gemma model for instruction following',
    size: '1.4 GB',
    sizeBytes: 1500000000,
    url: 'https://huggingface.co/google/gemma-2b-it-GGUF/resolve/main/gemma-2b-it-Q4_K_M.gguf',
    author: 'Google',
    quantization: 'Q4_K_M',
    parameters: '2B',
    architecture: 'Gemma',
    tags: ['compact', 'lightweight', 'it'],
    downloaded: false,
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
  const [sortBy, setSortBy] = useState<'popular' | 'size' | 'name' | 'newest'>('popular');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  
  const { showToast } = useToast();

  // Filter models
  const filteredModels = useMemo(() => {
    let filtered = [...AVAILABLE_MODELS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.tags.some(t => t.includes(query)) ||
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
      case 'newest':
        filtered.sort((a, b) => b.id.localeCompare(a.id));
        break;
      default:
        // Popular - keep original order (recommended first)
        break;
    }

    return filtered;
  }, [searchQuery, filterQuantization, filterParameters, sortBy]);

  // Simulate download
  const handleDownload = useCallback(async (model: ModelDownload) => {
    setIsDownloading(true);
    setSelectedModel(model);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const increment = Math.random() * 15 + 2; // 2-17%
        const newProgress = Math.min(prev + increment, 100);
        
        // Calculate simulated speed (MB/s)
        const speed = Math.floor(Math.random() * 10 + 5);
        setDownloadSpeed(speed);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDownloading(false);
            setDownloadProgress(0);
            setDownloadSpeed(0);
            showToast(`${model.name} downloaded successfully!`, 'success');
            onSelectModel?.({ ...model, downloaded: true });
          }, 500);
        }
        
        return newProgress;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [onSelectModel, showToast]);

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
    return 'text-orange-400 bg-orange-500/10';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700/80 shadow-2xl shadow-black/40 scale-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 shrink-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </span>
              Download Models
            </h2>
            <p className="text-sm text-dark-400 mt-1">Browse and download GGUF models for local inference</p>
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

        {/* Download Progress */}
        {isDownloading && selectedModel && (
          <div className="px-6 py-4 bg-blue-500/5 border-b border-blue-500/20 slide-down">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">Downloading {selectedModel.name}</p>
                <div className="flex items-center gap-2 text-xs text-dark-400">
                  <span>{Math.round(downloadProgress)}% complete</span>
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
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-300 progress-striped"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            {/* ETA */}
            {downloadProgress < 100 && (
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
          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              disabled={isDownloading}
              className="px-2.5 py-1.5 bg-dark-800/60 border border-dark-700/60 rounded-lg text-xs text-dark-300 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="popular">🔥 Popular</option>
              <option value="size">📦 Size</option>
              <option value="name">🔤 Name</option>
              <option value="newest">✨ Newest</option>
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
            <div className="slide-down">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Enter direct GGUF file URL..."
                className="w-full px-3 py-2 bg-dark-800/60 border border-violet-500/30 rounded-lg text-white placeholder-dark-500 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
              />
              <p className="text-[10px] text-dark-500 mt-1">
                💡 Paste a direct download link to any .gguf file
              </p>
            </div>
          )}
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
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
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                    selectedModel?.id === model.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50'
                  } ${isDownloading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
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
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-dark-900/50 text-[10px] text-dark-500">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleDownload(model)}
                    disabled={isDownloading || model.downloaded}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                      model.downloaded
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                        : isDownloading && selectedModel?.id === model.id
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-wait'
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
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 border-t border-dark-800 bg-dark-850/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-dark-500 space-x-3">
            <span>💡 Models are stored locally for offline use</span>
            <span>•</span>
            <span>Q4_K_M recommended for most systems</span>
          </div>
          
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export { AVAILABLE_MODELS };
