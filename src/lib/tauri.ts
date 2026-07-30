/**
 * Tauri Command Bridge
 * 
 * This module provides type-safe wrappers for all Tauri backend commands.
 * The actual implementation is in src-tauri/src/ (Rust)
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import type { ProjectFile, ModelConfig, InferenceSettings, ProjectAnalysis } from '../types';

// ============================================================
// TYPES FOR STREAMING
// ============================================================

export interface GenerationTokenEvent {
  token: string | null;
  text: string;
  tokensGenerated: number;
  tokensPerSecond: number;
}

export interface GenerationCompleteEvent {
  text: string;
  tokensGenerated: number;
  tokensPerSecond: number;
}

export interface GenerationErrorEvent {
  message: string;
}

export interface ModelInfo {
  name: string;
  parameters: string;
  contextLength: number;
  sizeBytes: number;
  quantization: string;
}

export interface ModelValidationResult {
  valid: boolean;
  error?: string;
  modelInfo?: ModelInfo;
}

export interface InferenceSystemInfo {
  totalMemoryGb: number;
  availableMemoryGb: number;
  cpuCores: number;
  cpuName: string;
  recommendedMaxParameters: string;
  canRun7b: boolean;
  canRun13b: boolean;
  canRun34b: boolean;
  canRun70b: boolean;
  /** GPU information (if available) */
  gpu?: GpuInfo;
}

/** GPU Information structure */
export interface GpuInfo {
  /** Whether a compatible GPU was detected */
  available: boolean;
  /** GPU name/model */
  name: string;
  /** GPU vendor (NVIDIA, AMD, Intel, Apple) */
  vendor: string;
  /** Available VRAM in GB */
  vramGb: number;
  /** Driver version (if detectable) */
  driverVersion?: string;
  /** Compute capability (for NVIDIA) */
  computeCapability?: string;
  /** Supported backends (CUDA, Metal, Vulkan) */
  supportedBackends: string[];
  /** Recommended number of layers to offload (if known) */
  recommendedLayers?: number;
}

export interface LoadModelResult {
  success: boolean;
  message: string;
  modelInfo?: ModelInfo;
}

// ============================================================
// MODEL COMMANDS - LLM Inference Operations
// ============================================================

export const modelCommands = {
  /**
   * Load a GGUF model into memory with full validation
   */
  loadModel: async (modelPath: string): Promise<LoadModelResult> => {
    return invoke('load_model', { modelPath });
  },

  /**
   * Unload current model from memory
   */
  unloadModel: async (): Promise<void> => {
    return invoke('unload_model');
  },

  /**
   * Check if a model is currently loaded
   */
  isModelLoaded: async (): Promise<boolean> => {
    return invoke('is_model_loaded');
  },

  /**
   * Get info about loaded model
   */
  getLoadedModelInfo: async (): Promise<ModelInfo | null> => {
    return invoke('get_loaded_model_info');
  },

  /**
   * Generate completion (non-streaming)
   */
  generate: async (
    prompt: string,
    settings?: Partial<InferenceSettings>
  ): Promise<string> => {
    return invoke('generate', { prompt, settings: settings || {} });
  },

  /**
   * Stream generation - emits events for each token
   * Listen to 'model:generation-token', 'model:generation-complete', 'model:generation-error'
   */
  generateStreaming: async (
    prompt: string,
    settings?: Partial<InferenceSettings>
  ): Promise<string> => {
    return invoke('generate_streaming', { 
      prompt, 
      settings: settings || {} 
    });
  },

  /**
   * Stop current generation
   */
  stopGeneration: async (): Promise<void> => {
    return invoke('stop_generation');
  },

  /**
   * Get available models from default directories
   */
  listModels: async (): Promise<ModelConfig[]> => {
    return invoke('list_models');
  },

  /**
   * List models in specific directory
   */
  listModelsInDirectory: async (dir: string): Promise<ModelConfig[]> => {
    return invoke('list_models_in_directory', { dir });
  },

  /**
   * Get default model directories
   */
  getModelDirectories: async (): Promise<string[]> => {
    return invoke('get_model_directories');
  },

  /**
   * Ensure model directory exists
   */
  ensureModelDirectory: async (): Promise<string> => {
    return invoke('ensure_model_directory');
  },

  /**
   * Validate a GGUF model file
   */
  validateModelFile: async (path: string): Promise<ModelValidationResult> => {
    return invoke('validate_model_file', { path });
  },

  /**
   * Get system info relevant for inference
   */
  getInferenceSystemInfo: async (): Promise<InferenceSystemInfo> => {
    return invoke('get_inference_system_info');
  },

  /**
   * Get detailed GPU information
   */
  getGpuInfo: async (): Promise<GpuInfo> => {
    return invoke('get_gpu_info');
  },
};

// ============================================================
// EVENT LISTENERS FOR STREAMING
// ============================================================

export const modelEvents = {
  /**
   * Listen for generation token events
   */
  onGenerationToken: (callback: (event: GenerationTokenEvent) => void): Promise<UnlistenFn> => {
    return listen<GenerationTokenEvent>('model:generation-token', (event) => callback(event.payload));
  },

  /**
   * Listen for generation complete event
   */
  onGenerationComplete: (callback: (event: GenerationCompleteEvent) => void): Promise<UnlistenFn> => {
    return listen<GenerationCompleteEvent>('model:generation-complete', (event) => callback(event.payload));
  },

  /**
   * Listen for generation error event
   */
  onGenerationError: (callback: (event: GenerationErrorEvent) => void): Promise<UnlistenFn> => {
    return listen<GenerationErrorEvent>('model:generation-error', (event) => callback(event.payload));
  },

  /**
   * Listen for model status changes (loaded/unloaded)
   */
  onModelStatusChanged: (callback: (event: { loaded: boolean; model: ModelInfo | null }) => void): Promise<UnlistenFn> => {
    return listen('model:status-changed', (event) => callback(event.payload as { loaded: boolean; model: ModelInfo | null }));
  },
};

// ============================================================
// FILE SYSTEM COMMANDS
// ============================================================

export const fileCommands = {
  /**
   * Read file content as text
   */
  readFile: async (path: string): Promise<string> => {
    try {
      return await readTextFile(path);
    } catch (error) {
      throw new Error(`Failed to read file: ${path}`);
    }
  },

  /**
   * Write content to file (creates if not exists)
   */
  writeFile: async (path: string, content: string): Promise<void> => {
    try {
      await writeTextFile(path, content);
    } catch (error) {
      throw new Error(`Failed to write file: ${path}`);
    }
  },

  /**
   * Check if file/directory exists
   */
  pathExists: async (path: string): Promise<boolean> => {
    try {
      return await exists(path);
    } catch {
      return false;
    }
  },

  /**
   * Create directory recursively
   */
  createDirectory: async (path: string): Promise<void> => {
    await mkdir(path, { recursive: true });
  },

  /**
   * Open file picker dialog
   */
  selectFile: async (filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null> => {
    const selected = await open({
      multiple: false,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return selected as string | null;
  },

  /**
   * Open folder picker dialog
   */
  selectFolder: async (): Promise<string | null> => {
    const selected = await open({ directory: true });
    return selected as string | null;
  },

  /**
   * Save file dialog
   */
  saveFileDialog: async (defaultName: string): Promise<string | null> => {
    const selected = await save({ defaultName });
    return selected;
  },
};

// ============================================================
// PROJECT COMMANDS
// ============================================================

export const projectCommands = {
  /**
   * List files in directory (recursive)
   */
  listDirectory: async (path: string, recursive: boolean = true): Promise<ProjectFile[]> => {
    return invoke('list_directory', { path, recursive });
  },

  /**
   * Analyze entire project
   */
  analyzeProject: async (projectPath: string): Promise<ProjectAnalysis> => {
    return invoke('analyze_project', { projectPath });
  },

  /**
   * Search codebase for pattern
   */
  searchCode: async (
    pattern: string,
    path: string,
    filePattern?: string
  ): Promise<Array<{ file: string; line: number; content: string }>> => {
    return invoke('search_code', { pattern, path, filePattern });
  },

  /**
   * Get file statistics
   */
  getFileStats: async (path: string): Promise<{
    lines: number;
    size: number;
    language: string;
  }> => {
    return invoke('get_file_stats', { path });
  },
};

// ============================================================
// TERMINAL COMMANDS
// ============================================================

export const terminalCommands = {
  /**
   * Execute shell command and return output
   */
  executeCommand: async (
    command: string,
    workingDir?: string
  ): Promise<{ stdout: string; stderr: number; code: number }> => {
    return invoke('execute_command', { command, cwd: workingDir });
  },

  /**
   * Kill running process
   */
  killProcess: async (pid: number): Promise<void> => {
    return invoke('kill_process', { pid });
  },
};

// ============================================================
// APP COMMANDS
// ============================================================

export const appCommands = {
  /**
   * Get system information
   */
  getSystemInfo: async () => {
    return invoke('get_system_info');
  },

  /**
   * Get app version
   */
  getAppVersion: async (): Promise<string> => {
    return invoke('get_app_version');
  },

  /**
   * Open external link in default browser
   */
  openExternal: async (url: string): Promise<void> => {
    return invoke('open_external', { url });
  },
};

export default {
  model: modelCommands,
  events: modelEvents,
  file: fileCommands,
  project: projectCommands,
  terminal: terminalCommands,
  app: appCommands,
};
