// Global type declarations for external modules

// React Syntax Highlighter
declare module 'react-syntax-highlighter' {
  import { ComponentClass } from 'react';
  interface Props {
    language: string;
    style: Record<string, any>;
    customStyle?: Record<string, any>;
    showLineNumbers?: boolean;
    lineNumberStyle?: Record<string, any>;
    wrapLines?: boolean;
    children: string;
  }
  const SyntaxHighlighter: ComponentClass<Props>;
  export { SyntaxHighlighter as default };
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const prism: Record<string, any>;
  export default prism;
}

declare module 'react-syntax-highlighter/dist/esm/styles/vs-dark' {
  const vsDark: Record<string, any>;
  export default vsDark;
}

declare module 'react-syntax-highlighter/dist/esm/styles/github-dark' {
  const githubDark: Record<string, any>;
  export default githubDark;
}

declare module 'react-syntax-highlighter/dist/esm/styles/dracula' {
  const dracula: Record<string, any>;
  export default dracula;
}

// Tauri APIs (backup declarations)
declare module '@tauri-apps/api/core' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  export function listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void>;
  export function emit(event: string, payload?: unknown): Promise<void>;
}

declare module '@tauri-apps/api/event' {
  interface UnlistenFn {
    (): Promise<void>;
  }
  export function listen<T>(event: string, handler: (event: { payload: T; id: number }) => void): Promise<UnlistenFn>;
  export function emit(event: string, payload?: unknown): Promise<void>;
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
  export function readFile(path: string): Promise<Uint8Array>;
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
}

// Web Speech API - Speech Recognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare var SpeechRecognition: SpeechRecognitionConstructor;

// Window interface extensions
interface Window {
  SpeechRecognition: SpeechRecognitionConstructor;
  webkitSpeechRecognition: SpeechRecognitionConstructor;
  // Tauri global
  readonly __TAURI__?: unknown;
}
