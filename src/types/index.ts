// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: AttachedFile[];
  codeBlocks?: CodeBlock[];
}

export interface AttachedFile {
  name: string;
  path: string;
  content?: string;
  size: number;
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

// Chat types
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  projectPath?: string;
}

// Model types
export interface ModelConfig {
  id: string;
  name: string;
  filename: string;
  path: string;
  size: number;
  quantization: string;
  contextLength: number;
  parameters: string; // e.g., "7B"
  description: string;
  loaded: boolean;
}

export interface InferenceSettings {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  repeatPenalty: number;
  threads: number;
  gpuLayers: number;
}

// Project types
export interface ProjectFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
  children?: ProjectFile[];
  language?: string;
}

export interface ProjectAnalysis {
  path: string;
  totalFiles: number;
  totalLines: number;
  languages: LanguageStats[];
  structure: ProjectFile[];
  summary: string;
}

export interface LanguageStats {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

// App settings
export interface AppSettings {
  language: 'en' | 'ur' | 'both';
  theme: 'dark' | 'light';
  modelPath: string;
  projectsPath: string;
  autoSave: boolean;
  streamResponse: boolean;
  showLineNumbers: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// Tool/Command types
export interface ToolCommand {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
}

// System prompt parts
export interface SystemPromptConfig {
  identity: string;
  capabilities: string[];
  constraints: string[];
  outputFormat: OutputFormatRule[];
  toolProtocols: ToolProtocol[];
}

export interface OutputFormatRule {
  name: string;
  description: string;
  example: string;
}

export interface ToolProtocol {
  tool: string;
  usage: string;
  parameters: ParameterDef[];
  example: string;
}

export interface ParameterDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
}
