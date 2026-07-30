// Type declarations for Tauri API modules
declare module '@tauri-apps/api/core' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/plugin-dialog' {
  export interface OpenDialogOptions {
    multiple?: boolean;
    directory?: boolean;
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
  }

  export interface SaveDialogOptions {
    defaultName?: string;
  }

  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function save(options?: SaveDialogOptions): Promise<string | null>;
}

declare module '@tauri-apps/plugin-fs' {
  export function readTextFile(path: string): Promise<string>;
  export function writeTextFile(path: string, contents: string): Promise<void>;
  export function exists(path: string): Promise<boolean>;
  export function mkdir(path: string, options?: { recursive: boolean }): Promise<void>;
}
