/**
 * Tauri Command Bridge
 * 
 * This module provides type-safe wrappers for all Tauri backend commands.
 * The actual implementation is in src-tauri/src/main.rs (Rust)
 */

import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import type { ProjectFile, ModelConfig, InferenceSettings, ProjectAnalysis } from '../types';

// ============================================================
// MODEL COMMANDS - LLM Inference Operations
// ============================================================

export const modelCommands = {
  /**
   * Load a GGUF model into memory
   */
  loadModel: async (modelPath: string): Promise<{ success: boolean; message: string }> => {
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
   * Generate completion from the model
   */
  generate: async (
    prompt: string,
    settings?: Partial<InferenceSettings>
  ): Promise<string> => {
    return invoke('generate', { prompt, settings: settings || {} });
  },

  /**
   * Stream generation with callback for each token
   */
  generateStream: async (
    prompt: string,
    onToken: (token: string) => void,
    settings?: Partial<InferenceSettings>
  ): Promise<string> => {
    return invoke('generate_stream', { 
      prompt, 
      settings: settings || {} 
    }, {
      // @ts-expect-error Tauri event listener
      onEvent: (event) => {
        if (event.type === 'token') {
          onToken(event.payload);
        }
      }
    });
  },

  /**
   * Get available models from models directory
   */
  listModels: async (): Promise<ModelConfig[]> => {
    return invoke('list_models');
  },

  /**
   * Download a model from URL (for initial setup)
   */
  downloadModel: async (
    url: string,
    destination: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; path: string }> => {
    return invoke('download_model', { url, destination });
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
  file: fileCommands,
  project: projectCommands,
  terminal: terminalCommands,
  app: appCommands,
};
