/**
 * Mock Tauri backend for browser / development mode.
 *
 * When `isTauri` is false (the app is running in a plain browser via
 * `vite dev` or preview), the wrappers in `./tauri` dispatch to these mocks
 * instead of calling `invoke()`. This keeps the entire UI explorable —
 * model listing, loading, streaming chat, project tree, etc. — without the
 * Rust backend or Ollama installed.
 *
 * All mock data uses the SAME camelCase shape the (fixed) Rust backend returns
 * via `#[serde(rename_all = "camelCase")]`, so the frontend code paths are
 * identical between demo and production.
 */

import type {
  ModelConfig,
  ProjectFile,
  ProjectAnalysis,
  InferenceSettings,
} from '../types';
import type {
  ModelInfo,
  LoadModelResult,
  ModelValidationResult,
  InferenceSystemInfo,
  GpuInfo,
} from './tauri';

// ============================================================
// IN-MEMORY EVENT BUS (replaces Tauri `listen` / `emit` in web mode)
// ============================================================

type EventListener = (payload: unknown) => void;
const listeners = new Map<string, Set<EventListener>>();

export function mockEmit(event: string, payload: unknown): void {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach((cb) => {
    try {
      cb(payload);
    } catch (e) {
      console.error(`[mockEvent] listener for "${event}" threw:`, e);
    }
  });
}

/** Subscribe to a mock event. Returns an unlisten function (Promise, matching Tauri's `listen`). */
export function mockListen(
  event: string,
  cb: EventListener
): Promise<() => Promise<void>> {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(cb);
  const unlisten = () => {
    listeners.get(event)?.delete(cb);
    return Promise.resolve();
  };
  return Promise.resolve(unlisten);
}

// ============================================================
// MOCK STATE
// ============================================================

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const MOCK_MODELS: ModelConfig[] = [
  {
    id: 'qwen2.5-coder-7b',
    name: 'Qwen2.5-Coder-7B-Instruct (Q4_K_M)',
    filename: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    path: '/demo/models/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    size: Math.round(4.7 * 1024 * 1024 * 1024),
    quantization: 'Q4_K_M',
    contextLength: 8192,
    parameters: '7B',
    description: 'Coding specialist. Excellent on CPU. (demo)',
    loaded: false,
  },
  {
    id: 'llama3.2-3b',
    name: 'Llama 3.2 (3B) Instruct (Q4_K_M)',
    filename: 'llama3.2-3b-instruct-q4_k_m.gguf',
    path: '/demo/models/llama3.2-3b-instruct-q4_k_m.gguf',
    size: Math.round(2.0 * 1024 * 1024 * 1024),
    quantization: 'Q4_K_M',
    contextLength: 4096,
    parameters: '3B',
    description: 'Fast & lightweight general model. (demo)',
    loaded: false,
  },
  {
    id: 'mistral-7b',
    name: 'Mistral-7B-Instruct (Q4_K_M)',
    filename: 'mistral-7b-instruct-v0.3-q4_k_m.gguf',
    path: '/demo/models/mistral-7b-instruct-v0.3-q4_k_m.gguf',
    size: Math.round(4.4 * 1024 * 1024 * 1024),
    quantization: 'Q4_K_M',
    contextLength: 8192,
    parameters: '7B',
    description: 'Versatile general-purpose model. (demo)',
    loaded: false,
  },
];

const MOCK_MODEL_DIRECTORIES = [
  '/demo/models',
  '/home/demo/.codemate/models',
];

let loadedModelInfo: ModelInfo | null = null;
let abortFlag = false;

const MOCK_SYSTEM_INFO: InferenceSystemInfo = {
  totalMemoryGb: 16,
  availableMemoryGb: 9.2,
  cpuCores: 8,
  cpuName: 'Demo CPU @ 3.2GHz',
  recommendedMaxParameters: '13B',
  canRun7b: true,
  canRun13b: true,
  canRun34b: false,
  canRun70b: false,
  gpu: {
    available: false,
    name: 'Not detected (demo)',
    vendor: 'N/A',
    vramGb: 0,
    supportedBackends: [],
  } as GpuInfo,
};

const MOCK_GPU: GpuInfo = {
  available: false,
  name: 'Not detected (demo)',
  vendor: 'N/A',
  vramGb: 0,
  supportedBackends: [],
};

function demoResponse(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, ' ').slice(0, 240);
  return [
    `**Demo mode** — running in a browser without the Tauri/Ollama backend.`,
    ``,
    `You said:`,
    ``,
    `> ${trimmed || '(empty message)'}`,
    ``,
    `This is a *simulated* response so you can explore the UI. To get real AI`,
    `completions, run the app as a Tauri desktop build with Ollama installed:`,
    ``,
    '```bash',
    'npm install',
    'npm run tauri dev   # requires Rust + Ollama',
    '```',
    ``,
    `Here is a small example code block rendered by the markdown viewer:`,
    ``,
    '```typescript',
    'function greet(name: string): string {',
    '  return `Hello, ${name}! Welcome to CodeMate.`;',
    '}',
    '',
    'console.log(greet("developer"));',
    '```',
    ``,
    `- Try the Model Manager to load a (demo) model.`,
    `- Open the File Explorer to browse a demo project tree.`,
    `- Use \`Ctrl+K\` for the command palette.`,
  ].join('\n');
}

// ============================================================
// MOCK PROJECT TREE (for FileExplorer / analyzeProject)
// ============================================================

function mockProjectTree(): ProjectFile[] {
  const file = (
    name: string,
    path: string,
    size: number,
    language?: string
  ): ProjectFile => ({ name, path, isDirectory: false, size, language });
  const dir = (name: string, path: string, children: ProjectFile[]): ProjectFile => ({
    name,
    path,
    isDirectory: true,
    children,
  });
  return [
    dir('demo-project', '/demo-project', [
      dir('src', '/demo-project/src', [
        file('main.ts', '/demo-project/src/main.ts', 1280, 'typescript'),
        file('App.tsx', '/demo-project/src/App.tsx', 4200, 'tsx'),
        dir('components', '/demo-project/src/components', [
          file('Sidebar.tsx', '/demo-project/src/components/Sidebar.tsx', 3100, 'tsx'),
          file('ChatArea.tsx', '/demo-project/src/components/ChatArea.tsx', 2600, 'tsx'),
        ]),
      ]),
      file('package.json', '/demo-project/package.json', 820, 'json'),
      file('README.md', '/demo-project/README.md', 1500, 'markdown'),
      file('tsconfig.json', '/demo-project/tsconfig.json', 640, 'json'),
    ]),
  ];
}

// ============================================================
// MOCK MODEL COMMANDS
// ============================================================

export const mockModelCommands = {
  loadModel: async (modelPath: string): Promise<LoadModelResult> => {
    await delay(450);
    const found = MOCK_MODELS.find((m) => m.path === modelPath || m.filename === modelPath);
    const info: ModelInfo = found
      ? {
          name: found.name,
          parameters: found.parameters,
          contextLength: found.contextLength,
          sizeBytes: found.size,
          quantization: found.quantization,
        }
      : {
          name: modelPath.split('/').pop() || modelPath,
          parameters: '7B',
          contextLength: 8192,
          sizeBytes: Math.round(4.7 * 1024 * 1024 * 1024),
          quantization: 'Q4_K_M',
        };
    loadedModelInfo = info;
    mockEmit('model:status-changed', { loaded: true, model: info });
    return {
      success: true,
      message: 'Model loaded (demo mode)',
      modelInfo: info,
    };
  },

  unloadModel: async (): Promise<void> => {
    await delay(120);
    loadedModelInfo = null;
    mockEmit('model:status-changed', { loaded: false, model: null });
  },

  isModelLoaded: async (): Promise<boolean> => !!loadedModelInfo,

  getLoadedModelInfo: async (): Promise<ModelInfo | null> => loadedModelInfo,

  generate: async (prompt: string): Promise<string> => {
    await delay(500);
    return demoResponse(prompt);
  },

  generateStreaming: async (prompt: string): Promise<string> => {
    const text = demoResponse(prompt);
    // Tokenise keeping whitespace so the streamed text reconstructs exactly.
    const tokens = text.match(/\S+\s*|\s+/g) || [text];
    let acc = '';
    let count = 0;
    const start = Date.now();
    abortFlag = false;
    for (const tok of tokens) {
      if (abortFlag) break;
      await delay(32);
      acc += tok;
      count++;
      const elapsedSec = Math.max((Date.now() - start) / 1000, 0.001);
      mockEmit('model:generation-token', {
        token: tok,
        text: acc,
        tokensGenerated: count,
        tokensPerSecond: Math.round((count / elapsedSec) * 10) / 10,
      });
    }
    const elapsedSec = Math.max((Date.now() - start) / 1000, 0.001);
    if (!abortFlag) {
      mockEmit('model:generation-complete', {
        text: acc,
        tokensGenerated: count,
        tokensPerSecond: Math.round((count / elapsedSec) * 10) / 10,
      });
    } else {
      mockEmit('model:generation-error', { message: 'Generation stopped by user.' });
    }
    return acc;
  },

  stopGeneration: async (): Promise<void> => {
    abortFlag = true;
  },

  listModels: async (): Promise<ModelConfig[]> => {
    await delay(200);
    return MOCK_MODELS.map((m) => ({ ...m, loaded: m.name === loadedModelInfo?.name }));
  },

  listModelsInDirectory: async (_dir: string): Promise<ModelConfig[]> => {
    await delay(180);
    return MOCK_MODELS;
  },

  getModelDirectories: async (): Promise<string[]> => MOCK_MODEL_DIRECTORIES,

  ensureModelDirectory: async (): Promise<string> => MOCK_MODEL_DIRECTORIES[0],

  validateModelFile: async (_path: string): Promise<ModelValidationResult> => {
    await delay(200);
    return {
      valid: true,
      modelInfo: {
        name: _path.split('/').pop() || 'model.gguf',
        parameters: '7B',
        contextLength: 8192,
        sizeBytes: Math.round(4.7 * 1024 * 1024 * 1024),
        quantization: 'Q4_K_M',
      },
    };
  },

  getInferenceSystemInfo: async (): Promise<InferenceSystemInfo> => {
    await delay(120);
    return MOCK_SYSTEM_INFO;
  },

  getGpuInfo: async (): Promise<GpuInfo> => {
    await delay(120);
    return MOCK_GPU;
  },
};

// ============================================================
// MOCK FILE COMMANDS (localStorage-backed text FS)
// ============================================================

const fsKey = (path: string) => `codemate:fs:${path}`;

export const mockFileCommands = {
  readFile: async (path: string): Promise<string> => {
    await delay(60);
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(fsKey(path));
      if (v !== null) return v;
    }
    // Pretend demo source files have content
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      return `// ${path}\nexport default function Demo() {\n  return null;\n}\n`;
    }
    return '';
  },

  writeFile: async (path: string, content: string): Promise<void> => {
    await delay(60);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(fsKey(path), content);
    } catch (e) {
      console.warn('[mockFileCommands.writeFile] quota?', e);
    }
  },

  pathExists: async (path: string): Promise<boolean> => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(fsKey(path)) !== null) return true;
    return mockProjectTree().some((f) => f.path === path);
  },

  createDirectory: async (_path: string): Promise<void> => {
    await delay(40);
  },

  selectFile: async (): Promise<string | null> => {
    // No native dialog in browser; return null so callers show their fallback UI.
    return null;
  },

  selectFolder: async (): Promise<string | null> => null,

  saveFileDialog: async (defaultName: string): Promise<string | null> => {
    // Best-effort: return a synthetic path so callers proceed; actual bytes
    // should be downloaded by the caller (see conversationExport).
    return `/demo/Downloads/${defaultName}`;
  },
};

// ============================================================
// MOCK PROJECT COMMANDS
// ============================================================

export const mockProjectCommands = {
  listDirectory: async (_path: string, _recursive = true): Promise<ProjectFile[]> => {
    await delay(180);
    return mockProjectTree();
  },

  analyzeProject: async (projectPath: string): Promise<ProjectAnalysis> => {
    await delay(320);
    return {
      path: projectPath,
      totalFiles: 8,
      totalLines: 1420,
      languages: [
        { language: 'TypeScript', files: 4, lines: 980, percentage: 69 },
        { language: 'JSON', files: 2, lines: 120, percentage: 8 },
        { language: 'Markdown', files: 1, lines: 320, percentage: 23 },
      ],
      structure: mockProjectTree(),
      summary:
        'Demo project — a small TypeScript/React app with 8 files and ~1.4k lines.',
    };
  },

  searchCode: async (
    pattern: string,
    _path: string
  ): Promise<Array<{ file: string; line: number; content: string }>> => {
    await delay(220);
    return [
      {
        file: '/demo-project/src/App.tsx',
        line: 12,
        content: `export default function App() {`,
      },
      {
        file: '/demo-project/src/main.ts',
        line: 4,
        content: `// matches: ${pattern}`,
      },
    ];
  },

  getFileStats: async (path: string): Promise<{ lines: number; size: number; language: string }> => {
    await delay(80);
    return { lines: 128, size: 3200, language: path.endsWith('.tsx') ? 'tsx' : 'text' };
  },
};

// ============================================================
// MOCK TERMINAL & APP COMMANDS
// ============================================================

export const mockTerminalCommands = {
  executeCommand: async (
    command: string
  ): Promise<{ stdout: string; stderr: string; code: number }> => {
    await delay(250);
    return {
      stdout: `$ ${command}\n(demo) command simulated in browser mode.\n`,
      stderr: '',
      code: 0,
    };
  },

  killProcess: async (_pid: number): Promise<void> => {
    await delay(60);
  },
};

export const mockAppCommands = {
  getSystemInfo: async () => ({
    os: 'Browser (demo)',
    arch: navigator.platform || 'unknown',
    cpuCores: navigator.hardwareConcurrency || 4,
    totalMemoryGb: 16,
    availableMemoryGb: 9,
    appVersion: '1.0.0-demo',
  }),

  getAppVersion: async (): Promise<string> => '1.0.0-demo',

  openExternal: async (url: string): Promise<void> => {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  },
};

export type { InferenceSettings };
