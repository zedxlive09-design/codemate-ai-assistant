// System Specifications Detection & Model Recommendation Engine
// This module detects hardware capabilities and recommends optimal AI models

export interface SystemSpecs {
  // Basic Info
  os: string;
  arch: string;
  
  // CPU
  cpuName: string;
  cpuCores: number;
  cpuThreads: number; // Often same as cores for simplicity
  
  // Memory (RAM)
  totalMemoryMB: number;
  availableMemoryMB: number;
  totalMemoryGB: number;
  availableMemoryGB: number;
  
  // GPU (if detectable)
  gpuName?: string;
  gpuVRAM?: number; // in MB
  
  // Disk Space
  diskFreeGB?: number;
  diskTotalGB?: number;
  
  // Computed Performance Score
  performanceScore: 'low' | 'medium' | 'high' | 'ultra';
  performanceIndex: number; // 0-100
  
  // Recommended Config
  recommendedModel?: string;
  maxRecommendedParams: string;
  canRunQuantization: string[];
}

export interface ModelRecommendation {
  id: string;
  name: string;
  reason: string;
  performance: 'excellent' | 'good' | 'acceptable' | 'slow';
  estimatedSpeed: string; // tokens/sec estimate
  memoryUsage: string;
  isRecommended: boolean;
  isOptimal: boolean;
}

// Detect system specifications
// In Tauri app, this will use the Rust backend command
// For web/demo, it uses browser APIs and defaults
export async function detectSystemSpecs(): Promise<SystemSpecs> {
  // Try to get from Tauri backend first
  if (window.__TAURI__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const sysInfo = await invoke<any>('get_system_info');
      
      return parseTauriSystemInfo(sysInfo);
    } catch (e) {
      console.warn('Tauri system info failed, using fallback:', e);
    }
  }
  
  // Fallback: Browser-based detection + sensible defaults
  return detectBrowserFallback();
}

// Parse Tauri system info into our format
function parseTauriSystemInfo(info: any): SystemSpecs {
  const totalMemMB = info.totalMemoryMb || 8192;
  const availMemMB = info.availableMemoryMb || 4096;
  const cores = info.cpuCores || 4;
  
  const specs: SystemSpecs = {
    os: info.os || 'Unknown',
    arch: info.arch || 'x86_64',
    cpuName: info.cpuName || 'Unknown CPU',
    cpuCores: cores,
    cpuThreads: cores,
    totalMemoryMB: totalMemMB,
    availableMemoryMB: availMemMB,
    totalMemoryGB: Math.round(totalMemMB / 1024),
    availableMemoryGB: Math.round(availMemMB / 1024),
    performanceScore: 'medium',
    performanceIndex: 50,
    maxRecommendedParams: '7B',
    canRunQuantization: ['Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0'],
  };
  
  // Calculate performance metrics
  calculatePerformance(specs);
  
  return specs;
}

// Browser-based fallback detection
async function detectBrowserFallback(): Promise<SystemSpecs> {
  // Get hardware concurrency
  const cores = navigator.hardwareConcurrency || 4;
  
  // Estimate memory (not always available)
  let totalMemGB = 8; // Default assumption
  if ((navigator as any).deviceMemory) {
    totalMemGB = (navigator as any).deviceMemory;
  }
  
  // Get platform info
  const platform = navigator.platform || 'Unknown';
  
  const totalMemMB = totalMemGB * 1024;
  const availMemMB = Math.round(totalMemMB * 0.6); // Assume 60% free
  
  const specs: SystemSpecs = {
    os: platform,
    arch: 'x86_64', // Most common
    cpuName: `Processor (${cores} cores)`,
    cpuCores: cores,
    cpuThreads: cores,
    totalMemoryMB: totalMemMB,
    availableMemoryMB: availMemMB,
    totalMemoryGB: totalMemGB,
    availableMemoryGB: Math.round(availMemMB / 1024),
    performanceScore: 'medium',
    performanceIndex: 50,
    maxRecommendedParams: '7B',
    canRunQuantization: ['Q4_K_M', 'Q5_K_M'],
  };
  
  calculatePerformance(specs);
  
  // Try to get disk space (limited in browser)
  if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
    try {
      const estimate = await (navigator as any).storage.estimate();
      if (estimate.quota) {
        specs.diskTotalGB = Math.round(estimate.quota / (1024 ** 3));
        specs.diskFreeGB = Math.round((estimate.quota - (estimate.usage || 0)) / (1024 ** 3));
      }
    } catch (e) {
      // Storage API not available or permission denied
    }
  }
  
  return specs;
}

// Calculate performance score and recommendations
function calculatePerformance(specs: SystemSpecs): void {
  let score = 0;
  
  // CPU scoring (0-30 points)
  if (specs.cpuCores >= 16) score += 30;
  else if (specs.cpuCores >= 8) score += 25;
  else if (specs.cpuCores >= 4) score += 18;
  else if (specs.cpuCores >= 2) score += 10;
  else score += 5;
  
  // Memory scoring (0-40 points)
  if (specs.totalMemoryGB >= 32) score += 40;
  else if (specs.totalMemoryGB >= 16) score += 32;
  else if (specs.totalMemoryGB >= 8) score += 24;
  else if (specs.totalMemoryGB >= 4) score += 15;
  else score += 8;
  
  // Architecture bonus (0-10 points)
  if (specs.arch.includes('arm64') || specs.arch.includes('aarch64')) {
    // Apple Silicon or ARM - very efficient
    score += 10;
  } else if (specs.arch.includes('x86_64')) {
    score += 7;
  } else {
    score += 3;
  }
  
  // OS optimization (0-20 points)
  if (specs.os.toLowerCase().includes('macos')) {
    score += 20; // macOS has excellent memory management
  } else if (specs.os.toLowerCase().includes('linux')) {
    score += 15; // Linux is efficient
  } else if (specs.os.toLowerCase().includes('windows')) {
    score += 10; // Windows is okay
  } else {
    score += 5;
  }
  
  specs.performanceIndex = Math.min(100, Math.max(0, score));
  
  // Determine performance tier
  if (score >= 75) {
    specs.performanceScore = 'ultra';
    specs.maxRecommendedParams = '>32B';
    specs.canRunQuantization = ['Q2_K', 'Q3_K_S', 'Q3_K_M', 'Q4_K_S', 'Q4_K_M', 'Q5_K_S', 'Q5_K_M', 'Q6_K', 'Q8_0', 'FP16'];
  } else if (score >= 55) {
    specs.performanceScore = 'high';
    specs.maxRecommendedParams = '14B-32B';
    specs.canRunQuantization = ['Q3_K_S', 'Q3_K_M', 'Q4_K_S', 'Q4_K_M', 'Q5_K_S', 'Q5_K_M', 'Q6_K', 'Q8_0'];
  } else if (score >= 35) {
    specs.performanceScore = 'medium';
    specs.maxRecommendedParams = '7B-14B';
    specs.canRunQuantization = ['Q3_K_M', 'Q4_K_S', 'Q4_K_M', 'Q5_K_S', 'Q5_K_M'];
  } else {
    specs.performanceScore = 'low';
    specs.maxRecommendedParams = '<7B';
    specs.canRunQuantization = ['Q2_K', 'Q3_K_S', 'Q4_K_S', 'Q4_K_M'];
  }
  
  // Set default recommendation
  setDefaultRecommendation(specs);
}

function setDefaultRecommendation(specs: SystemSpecs): void {
  switch (specs.performanceScore) {
    case 'ultra':
      specs.recommendedModel = 'llama-3-70b-q4'; // Can run large models
      break;
    case 'high':
      specs.recommendedModel = 'mixtral-8x7b-q4';
      break;
    case 'medium':
      specs.recommendedModel = 'llama-3-8b-q4';
      break;
    case 'low':
      specs.recommendedModel = 'phi-3-mini-q4';
      break;
  }
}

// Get model recommendations based on system specs
export function getModelRecommendations(specs: SystemSpecs): ModelRecommendation[] {
  const allModels = [
    // Large models (for ultra systems)
    {
      id: 'llama-3-70b-q4',
      name: 'Llama 3 70B Q4_K_M',
      reason: 'Most capable, best reasoning',
      performance: 'excellent' as const,
      estimatedSpeed: '2-5 t/s',
      memoryUsage: '~40 GB',
      isRecommended: false,
      isOptimal: false,
    },
    {
      id: 'mixtral-8x7b-q4',
      name: 'Mixtral 8x7B Q4_K_M',
      reason: 'MoE architecture, great versatility',
      performance: 'excellent' as const,
      estimatedSpeed: '6-12 t/s',
      memoryUsage: '~24 GB',
      isRecommended: false,
      isOptimal: false,
    },
    
    // Medium-large models
    {
      id: 'llama-3-8b-q5',
      name: 'Llama 3 8B Q5_K_M',
      reason: 'High quality, good balance',
      performance: 'good' as const,
      estimatedSpeed: '12-20 t/s',
      memoryUsage: '~6 GB',
      isRecommended: true,
      isOptimal: specs.performanceScore === 'high' || specs.performanceScore === 'ultra',
    },
    {
      id: 'llama-3-8b-q4',
      name: 'Llama 3 8B Q4_K_M',
      reason: 'Best value for most systems',
      performance: 'good' as const,
      estimatedSpeed: '18-28 t/s',
      memoryUsage: '~5 GB',
      isRecommended: true,
      isOptimal: specs.performanceScore === 'medium',
    },
    {
      id: 'mistral-7b-q4',
      name: 'Mistral 7B Q4_K_M',
      reason: 'Fast & capable, excellent code',
      performance: 'good' as const,
      estimatedSpeed: '20-35 t/s',
      memoryUsage: '~4.5 GB',
      isRecommended: true,
      isOptimal: specs.performanceScore === 'medium',
    },
    {
      id: 'codellama-7b-q4',
      name: 'Code Llama 7B Q4_K_M',
      reason: 'Specialized for code tasks',
      performance: 'acceptable' as const,
      estimatedSpeed: '18-30 t/s',
      memoryUsage: '~4 GB',
      isRecommended: specs.totalMemoryGB >= 8,
      isOptimal: false,
    },
    
    // Compact models (for low-end systems)
    {
      id: 'phi-3-mini-q4',
      name: 'Phi-3 Mini 3.8B Q4_K_M',
      reason: 'Compact yet powerful, fast',
      performance: 'acceptable' as const,
      estimatedSpeed: '35-50 t/s',
      memoryUsage: '~2.5 GB',
      isRecommended: specs.performanceScore === 'low' || specs.totalMemoryGB <= 8,
      isOptimal: specs.performanceScore === 'low',
    },
    {
      id: 'gemma-2b-it-q4',
      name: 'Gemma 2B IT Q4_K_M',
      reason: 'Lightweight, instant responses',
      performance: 'slow' as const,
      estimatedSpeed: '50+ t/s',
      memoryUsage: '~1.5 GB',
      isRecommended: specs.totalMemoryGB <= 4,
      isOptimal: specs.performanceScore === 'low' && specs.totalMemoryGB <= 4,
    },
    {
      id: 'tinyllama-1.1b-q4',
      name: 'TinyLlama 1.1B Q4_K_M',
      reason: 'Ultra-lightweight for minimal systems',
      performance: 'slow' as const,
      estimatedSpeed: '60+ t/s',
      memoryUsage: '~0.8 GB',
      isRecommended: specs.totalMemoryGB <= 4,
      isOptimal: false,
    },
  ];
  
  // Filter and rank based on system capabilities
  return allModels
    .filter(model => {
      // Filter out models that need more RAM than available
      const memGB = parseInt(model.memoryUsage.replace(/[^0-9]/g, ''));
      return memGB <= specs.availableMemoryGB * 0.8; // Use 80% of available memory
    })
    .sort((a, b) => {
      // Sort by: optimal first, then recommended, then performance
      if (a.isOptimal && !b.isOptimal) return -1;
      if (!a.isOptimal && b.isOptimal) return 1;
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      
      const perfOrder = { excellent: 4, good: 3, acceptable: 2, slow: 1 };
      return perfOrder[b.performance] - perfOrder[a.performance];
    });
}

// Format memory display
export function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

// Get performance color class
export function getPerformanceColor(score: SystemSpecs['performanceScore']): string {
  switch (score) {
    case 'ultra': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    case 'high': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    case 'medium': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    case 'low': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
  }
}

// Get performance icon
export function getPerformanceIcon(score: SystemSpecs['performanceScore']): string {
  switch (score) {
    case 'ultra': return '🚀';
    case 'high': return '⚡';
    case 'medium': return '✅';
    case 'low': return '⚠️';
  }
}
