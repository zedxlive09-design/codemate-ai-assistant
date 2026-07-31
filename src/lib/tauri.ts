/**
 * Tauri Command Bridge
 *
 * Type-safe wrappers for all Tauri backend commands. The actual Rust
 * implementation lives in `src-tauri/src/` (Rust).
 *
 * WEB / BROWSER SUPPORT
 * ---------------------
 * Every wrapper detects at runtime whether it is running inside the Tauri
 * webview (`isTauri`). When it is NOT (e.g. `vite dev` / preview / tests),
 * the call is dispatched to `./tauriMocks` which returns realistic demo data
 * so the entire UI is explorable in a browser without the Rust backend or
 * Ollama installed. The real Tauri APIs are still imported statically because
 * they are lazy — they only throw when *called* outside Tauri, not at import.
 *
 * NORMALISATION
 * -------------
 * The Rust backend uses `#[serde(rename_all = "camelCase")]` so its JSON
 * already matches the TS interfaces. For backwards compatibility with an
 * unbuilt backend (snake_case), the `normalize*` helpers below accept both.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import type { ProjectFile, ModelConfig, InferenceSettings, ProjectAnalysis } from '../types';
import { isTauri } from './isTauri';
import {
  mockModelCommands,
  mockFileCommands,
  mockProjectCommands,
  mockTerminalCommands,
  mockAppCommands,
  mockListen,
  mockEmit,
} from './tauriMocks';

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
  available: boolean;
  name: string;
  vendor: string;
  vramGb: number;
  driverVersion?: string;
  computeCapability?: string;
  supportedBackends: string[];
  recommendedLayers?: number;
}

export interface LoadModelResult {
  success: boolean;
  message: string;
  modelInfo?: ModelInfo;
}

/** Result of a terminal command. `stderr` is the captured stderr text (string). */
export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

// ============================================================
// NORMALISERS (accept both snake_case and camelCase from backend)
// ============================================================

type AnyObj = Record<string, unknown>;

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

/** Normalise a raw model object (from either snake_case or camelCase backend) into ModelConfig. */
export function normalizeModelConfig(raw: AnyObj | null | undefined): ModelConfig {
  if (!raw) {
    return {
      id: '',
      name: '',
      filename: '',
      path: '',
      size: 0,
      quantization: 'unknown',
      contextLength: 0,
      parameters: '',
      description: '',
      loaded: false,
    };
  }
  const size =
    num(raw.size, num(raw.sizeBytes, num(raw.size_bytes, 0)));
  return {
    id: str(raw.id, str(raw.name, str(raw.filename, ''))),
    name: str(raw.name, str(raw.filename, 'model')),
    filename: str(raw.filename, str(raw.name, '')),
    path: str(raw.path, str(raw.modelPath, str(raw.model_path, ''))),
    size,
    quantization: str(
      raw.quantization,
      str(raw.quantizationType, str(raw.quantization_type, 'unknown'))
    ),
    contextLength: num(
      raw.contextLength,
      num(raw.context_length, 0)
    ),
    parameters: str(raw.parameters, ''),
    description: str(raw.description, ''),
    loaded: Boolean(raw.loaded),
  };
}

/** Normalise a raw ModelInfo (snake or camel) into ModelInfo. */
export function normalizeModelInfo(raw: AnyObj | null | undefined): ModelInfo {
  if (!raw) {
    return { name: '', parameters: '', contextLength: 0, sizeBytes: 0, quantization: '' };
  }
  return {
    name: str(raw.name, ''),
    parameters: str(raw.parameters, ''),
    contextLength: num(raw.contextLength, num(raw.context_length, 0)),
    sizeBytes: num(raw.sizeBytes, num(raw.size_bytes, 0)),
    quantization: str(
      raw.quantization,
      str(raw.quantizationType, str(raw.quantization_type, ''))
    ),
  };
}

/** Normalise a raw LoadModelResult. */
function normalizeLoadModelResult(raw: AnyObj | null | undefined): LoadModelResult {
  if (!raw) return { success: false, message: 'Empty response from backend' };
  return {
    success: Boolean(raw.success),
    message: str(raw.message, ''),
    modelInfo: raw.modelInfo
      ? normalizeModelInfo(raw.modelInfo as AnyObj)
      : raw.model_info
      ? normalizeModelInfo(raw.model_info as AnyObj)
      : undefined,
  };
}

/** Normalise a raw InferenceSystemInfo. */
function normalizeSystemInfo(raw: AnyObj | null | undefined): InferenceSystemInfo {
  const base: InferenceSystemInfo = {
    totalMemoryGb: 0,
    availableMemoryGb: 0,
    cpuCores: 0,
    cpuName: '',
    recommendedMaxParameters: '',
    canRun7b: false,
    canRun13b: false,
    canRun34b: false,
    canRun70b: false,
  };
  if (!raw) return base;
  return {
    ...base,
    totalMemoryGb: num(raw.totalMemoryGb, num(raw.total_memory_gb, 0)),
    availableMemoryGb: num(raw.availableMemoryGb, num(raw.available_memory_gb, 0)),
    cpuCores: num(raw.cpuCores, num(raw.cpu_cores, 0)),
    cpuName: str(raw.cpuName, str(raw.cpu_name, '')),
    recommendedMaxParameters: str(
      raw.recommendedMaxParameters,
      str(raw.recommended_max_parameters, '')
    ),
    canRun7b: Boolean(raw.canRun7b ?? raw.can_run_7b),
    canRun13b: Boolean(raw.canRun13b ?? raw.can_run_13b),
    canRun34b: Boolean(raw.canRun34b ?? raw.can_run_34b),
    canRun70b: Boolean(raw.canRun70b ?? raw.can_run_70b),
    gpu: raw.gpu ? (raw.gpu as GpuInfo) : undefined,
  };
}

/** Normalise a raw ProjectFile tree (snake or camel, dates as strings). */
function normalizeProjectFile(raw: AnyObj): ProjectFile {
  return {
    name: str(raw.name, ''),
    path: str(raw.path, ''),
    isDirectory: Boolean(raw.isDirectory ?? raw.is_directory),
    size: raw.size !== undefined ? num(raw.size, 0) : undefined,
    modified: raw.modified !== undefined ? asDate(raw.modified) : undefined,
    language: raw.language !== undefined ? str(raw.language) : undefined,
    children: Array.isArray(raw.children)
      ? (raw.children as AnyObj[]).map(normalizeProjectFile)
      : undefined,
  };
}

function normalizeProjectAnalysis(raw: AnyObj | null | undefined): ProjectAnalysis {
  if (!raw) {
    return { path: '', totalFiles: 0, totalLines: 0, languages: [], structure: [], summary: '' };
  }
  return {
    path: str(raw.path, ''),
    totalFiles: num(raw.totalFiles, num(raw.total_files, 0)),
    totalLines: num(raw.totalLines, num(raw.total_lines, 0)),
    languages: Array.isArray(raw.languages)
      ? (raw.languages as AnyObj[]).map((l) => ({
          language: str(l.language, ''),
          files: num(l.files, 0),
          lines: num(l.lines, 0),
          percentage: num(l.percentage, 0),
        }))
      : [],
    structure: Array.isArray(raw.structure)
      ? (raw.structure as AnyObj[]).map(normalizeProjectFile)
      : [],
    summary: str(raw.summary, ''),
  };
}

// ============================================================
// MODEL COMMANDS - LLM Inference Operations
// ============================================================

export const modelCommands = {
  loadModel: async (modelPath: string): Promise<LoadModelResult> => {
    if (!isTauri) return mockModelCommands.loadModel(modelPath);
    const raw = await invoke<AnyObj>('load_model', { modelPath });
    return normalizeLoadModelResult(raw);
  },

  unloadModel: async (): Promise<void> => {
    if (!isTauri) return mockModelCommands.unloadModel();
    return invoke('unload_model');
  },

  isModelLoaded: async (): Promise<boolean> => {
    if (!isTauri) return mockModelCommands.isModelLoaded();
    return invoke('is_model_loaded');
  },

  getLoadedModelInfo: async (): Promise<ModelInfo | null> => {
    if (!isTauri) return mockModelCommands.getLoadedModelInfo();
    const raw = await invoke<AnyObj | null>('get_loaded_model_info');
    return raw ? normalizeModelInfo(raw) : null;
  },

  generate: async (
    prompt: string,
    settings?: Partial<InferenceSettings>
  ): Promise<string> => {
    if (!isTauri) return mockModelCommands.generate(prompt);
    return invoke<string>('generate', { prompt, settings: settings || {} });
  },

  /**
   * Stream generation - emits events for each token.
   * Listen to 'model:generation-token', 'model:generation-complete', 'model:generation-error'
   */
  generateStreaming: async (
    prompt: string,
    settings?: Partial<InferenceSettings>
  ): Promise<string> => {
    if (!isTauri) return mockModelCommands.generateStreaming(prompt);
    return invoke<string>('generate_streaming', {
      prompt,
      settings: settings || {},
    });
  },

  stopGeneration: async (): Promise<void> => {
    if (!isTauri) return mockModelCommands.stopGeneration();
    return invoke('stop_generation');
  },

  listModels: async (): Promise<ModelConfig[]> => {
    if (!isTauri) return mockModelCommands.listModels();
    const raw = await invoke<AnyObj[]>('list_models');
    return (raw || []).map(normalizeModelConfig);
  },

  listModelsInDirectory: async (dir: string): Promise<ModelConfig[]> => {
    if (!isTauri) return mockModelCommands.listModelsInDirectory(dir);
    const raw = await invoke<AnyObj[]>('list_models_in_directory', { dir });
    return (raw || []).map(normalizeModelConfig);
  },

  getModelDirectories: async (): Promise<string[]> => {
    if (!isTauri) return mockModelCommands.getModelDirectories();
    return invoke<string[]>('get_model_directories');
  },

  ensureModelDirectory: async (): Promise<string> => {
    if (!isTauri) return mockModelCommands.ensureModelDirectory();
    return invoke<string>('ensure_model_directory');
  },

  validateModelFile: async (path: string): Promise<ModelValidationResult> => {
    if (!isTauri) return mockModelCommands.validateModelFile(path);
    const raw = await invoke<AnyObj>('validate_model_file', { path });
    return {
      valid: Boolean(raw?.valid),
      error: raw?.error ? str(raw.error) : undefined,
      modelInfo: raw?.modelInfo
        ? normalizeModelInfo(raw.modelInfo as AnyObj)
        : raw?.model_info
        ? normalizeModelInfo(raw.model_info as AnyObj)
        : undefined,
    };
  },

  getInferenceSystemInfo: async (): Promise<InferenceSystemInfo> => {
    if (!isTauri) return mockModelCommands.getInferenceSystemInfo();
    const raw = await invoke<AnyObj>('get_inference_system_info');
    return normalizeSystemInfo(raw);
  },

  getGpuInfo: async (): Promise<GpuInfo> => {
    if (!isTauri) return mockModelCommands.getGpuInfo();
    return invoke<GpuInfo>('get_gpu_info');
  },
};

// ============================================================
// EVENT LISTENERS FOR STREAMING
// ============================================================

export const modelEvents = {
  onGenerationToken: (
    callback: (event: GenerationTokenEvent) => void
  ): Promise<UnlistenFn> => {
    if (!isTauri) {
      return mockListen('model:generation-token', (p) => callback(p as GenerationTokenEvent));
    }
    return listen<GenerationTokenEvent>('model:generation-token', (event) => callback(event.payload));
  },

  onGenerationComplete: (
    callback: (event: GenerationCompleteEvent) => void
  ): Promise<UnlistenFn> => {
    if (!isTauri) {
      return mockListen('model:generation-complete', (p) => callback(p as GenerationCompleteEvent));
    }
    return listen<GenerationCompleteEvent>('model:generation-complete', (event) =>
      callback(event.payload)
    );
  },

  onGenerationError: (
    callback: (event: GenerationErrorEvent) => void
  ): Promise<UnlistenFn> => {
    if (!isTauri) {
      return mockListen('model:generation-error', (p) => callback(p as GenerationErrorEvent));
    }
    return listen<GenerationErrorEvent>('model:generation-error', (event) =>
      callback(event.payload)
    );
  },

  onModelStatusChanged: (
    callback: (event: { loaded: boolean; model: ModelInfo | null }) => void
  ): Promise<UnlistenFn> => {
    if (!isTauri) {
      return mockListen('model:status-changed', (p) =>
        callback(p as { loaded: boolean; model: ModelInfo | null })
      );
    }
    return listen('model:status-changed', (event) =>
      callback(event.payload as { loaded: boolean; model: ModelInfo | null })
    );
  },
};

// ============================================================
// FILE SYSTEM COMMANDS
// ============================================================

export const fileCommands = {
  readFile: async (path: string): Promise<string> => {
    if (!isTauri) return mockFileCommands.readFile(path);
    try {
      return await readTextFile(path);
    } catch {
      throw new Error(`Failed to read file: ${path}`);
    }
  },

  writeFile: async (path: string, content: string): Promise<void> => {
    if (!isTauri) return mockFileCommands.writeFile(path, content);
    try {
      await writeTextFile(path, content);
    } catch {
      throw new Error(`Failed to write file: ${path}`);
    }
  },

  pathExists: async (path: string): Promise<boolean> => {
    if (!isTauri) return mockFileCommands.pathExists(path);
    try {
      return await exists(path);
    } catch {
      return false;
    }
  },

  createDirectory: async (path: string): Promise<void> => {
    if (!isTauri) return mockFileCommands.createDirectory(path);
    await mkdir(path, { recursive: true });
  },

  selectFile: async (
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<string | null> => {
    if (!isTauri) return mockFileCommands.selectFile();
    const selected = await open({
      multiple: false,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return selected as string | null;
  },

  selectFolder: async (): Promise<string | null> => {
    if (!isTauri) return mockFileCommands.selectFolder();
    const selected = await open({ directory: true });
    return selected as string | null;
  },

  saveFileDialog: async (defaultName: string): Promise<string | null> => {
    if (!isTauri) return mockFileCommands.saveFileDialog(defaultName);
    const selected = await save({ defaultName });
    return selected;
  },
};

// ============================================================
// PROJECT COMMANDS
// ============================================================

export const projectCommands = {
  listDirectory: async (path: string, recursive = true): Promise<ProjectFile[]> => {
    if (!isTauri) return mockProjectCommands.listDirectory(path, recursive);
    const raw = await invoke<AnyObj[]>('list_directory', { path, recursive });
    return (raw || []).map(normalizeProjectFile);
  },

  analyzeProject: async (projectPath: string): Promise<ProjectAnalysis> => {
    if (!isTauri) return mockProjectCommands.analyzeProject(projectPath);
    const raw = await invoke<AnyObj>('analyze_project', { projectPath });
    return normalizeProjectAnalysis(raw);
  },

  searchCode: async (
    pattern: string,
    path: string,
    filePattern?: string
  ): Promise<Array<{ file: string; line: number; content: string }>> => {
    if (!isTauri) return mockProjectCommands.searchCode(pattern, path);
    return invoke('search_code', { pattern, path, filePattern });
  },

  getFileStats: async (
    path: string
  ): Promise<{ lines: number; size: number; language: string }> => {
    if (!isTauri) return mockProjectCommands.getFileStats(path);
    return invoke('get_file_stats', { path });
  },
};

// ============================================================
// TERMINAL COMMANDS
// ============================================================

export const terminalCommands = {
  executeCommand: async (
    command: string,
    workingDir?: string
  ): Promise<CommandResult> => {
    if (!isTauri) return mockTerminalCommands.executeCommand(command);
    const raw = await invoke<AnyObj>('execute_command', { command, cwd: workingDir });
    // Backend returns { stdout, stderr: string, code }. Be tolerant of the old
    // shape where stderr was a number holding the exit code.
    return {
      stdout: str(raw?.stdout, ''),
      stderr: typeof raw?.stderr === 'string' ? raw.stderr : '',
      code: num(raw?.code, typeof raw?.stderr === 'number' ? raw.stderr : 0),
    };
  },

  killProcess: async (pid: number): Promise<void> => {
    if (!isTauri) return mockTerminalCommands.killProcess(pid);
    return invoke('kill_process', { pid });
  },
};

// ============================================================
// APP COMMANDS
// ============================================================

export const appCommands = {
  getSystemInfo: async () => {
    if (!isTauri) return mockAppCommands.getSystemInfo();
    return invoke('get_system_info');
  },

  getAppVersion: async (): Promise<string> => {
    if (!isTauri) return mockAppCommands.getAppVersion();
    return invoke<string>('get_app_version');
  },

  openExternal: async (url: string): Promise<void> => {
    if (!isTauri) return mockAppCommands.openExternal(url);
    return invoke('open_external', { url });
  },
};

// Expose a way for components to programmatically emit mock events (testing).
export const __mock = { emit: mockEmit };

export default {
  model: modelCommands,
  events: modelEvents,
  file: fileCommands,
  project: projectCommands,
  terminal: terminalCommands,
  app: appCommands,
};
