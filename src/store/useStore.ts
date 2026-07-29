import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Message, 
  Conversation, 
  ModelConfig, 
  InferenceSettings,
  AppSettings,
  ProjectFile,
  ProjectAnalysis
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  // Conversations & Messages
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  
  // Models
  availableModels: ModelConfig[];
  selectedModelId: string | null;
  modelLoaded: boolean;
  inferenceSettings: InferenceSettings;
  
  // Project
  projectPath: string | null;
  projectFiles: ProjectFile[];
  projectAnalysis: ProjectAnalysis | null;
  selectedFile: string | null;
  fileContent: string | null;
  
  // UI State
  sidebarOpen: boolean;
  showSettings: boolean;
  showFileExplorer: boolean;
  showModelManager: boolean;
  
  // App Settings
  settings: AppSettings;

  // Actions - Conversations
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  
  // Actions - Generation
  setIsGenerating: (value: boolean) => void;
  
  // Actions - Models
  setAvailableModels: (models: ModelConfig[]) => void;
  setSelectedModel: (id: string) => void;
  setModelLoaded: (loaded: boolean) => void;
  updateInferenceSettings: (settings: Partial<InferenceSettings>) => void;
  
  // Actions - Project
  setProjectPath: (path: string | null) => void;
  setProjectFiles: (files: ProjectFile[]) => void;
  setProjectAnalysis: (analysis: ProjectAnalysis | null) => void;
  setSelectedFile: (path: string | null) => void;
  setFileContent: (content: string | null) => void;
  
  // Actions - UI
  toggleSidebar: () => void;
  toggleSettings: () => void;
  toggleFileExplorer: () => void;
  toggleModelManager: () => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultInferenceSettings: InferenceSettings = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 4096,
  repeatPenalty: 1.1,
  threads: -1, // Auto-detect
  gpuLayers: 0, // CPU only
};

const defaultSettings: AppSettings = {
  language: 'both',
  theme: 'dark',
  modelPath: '',
  projectsPath: '',
  autoSave: true,
  streamResponse: true,
  showLineNumbers: true,
  fontSize: 'medium',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      isGenerating: false,
      
      availableModels: [],
      selectedModelId: null,
      modelLoaded: false,
      inferenceSettings: defaultInferenceSettings,
      
      projectPath: null,
      projectFiles: [],
      projectAnalysis: null,
      selectedFile: null,
      fileContent: null,
      
      sidebarOpen: true,
      showSettings: false,
      showFileExplorer: false,
      showModelManager: false,
      
      settings: defaultSettings,

      // Conversation actions
      createConversation: (title?: string) => {
        const id = uuidv4();
        const conversation: Conversation = {
          id,
          title: title || `Chat ${get().conversations.length + 1}`,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: filtered,
            activeConversationId: state.activeConversationId === id 
              ? (filtered[0]?.id || null) 
              : state.activeConversationId,
          };
        });
      },

      setActiveConversation: (id: string) => {
        set({ activeConversationId: id });
      },

      addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
        const newMessage: Message = {
          ...message,
          id: uuidv4(),
          timestamp: new Date(),
        };
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, newMessage], updatedAt: new Date() }
              : c
          ),
        }));
      },

      updateMessage: (conversationId: string, messageId: string, content: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, content } : m
                  ),
                }
              : c
          ),
        }));
      },

      // Generation actions
      setIsGenerating: (value: boolean) => {
        set({ isGenerating: value });
      },

      // Model actions
      setAvailableModels: (models: ModelConfig[]) => {
        set({ availableModels: models });
      },

      setSelectedModel: (id: string) => {
        set({ selectedModelId: id });
      },

      setModelLoaded: (loaded: boolean) => {
        set({ modelLoaded: loaded });
      },

      updateInferenceSettings: (settings: Partial<InferenceSettings>) => {
        set((state) => ({
          inferenceSettings: { ...state.inferenceSettings, ...settings },
        }));
      },

      // Project actions
      setProjectPath: (path: string | null) => {
        set({ projectPath: path });
      },

      setProjectFiles: (files: ProjectFile[]) => {
        set({ projectFiles: files });
      },

      setProjectAnalysis: (analysis: ProjectAnalysis | null) => {
        set({ projectAnalysis: analysis });
      },

      setSelectedFile: (path: string | null) => {
        set({ selectedFile: path });
      },

      setFileContent: (content: string | null) => {
        set({ fileContent: content });
      },

      // UI actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      toggleSettings: () => {
        set((state) => ({ showSettings: !state.showSettings }));
      },

      toggleFileExplorer: () => {
        set((state) => ({ showFileExplorer: !state.showFileExplorer }));
      },

      toggleModelManager: () => {
        set((state) => ({ showModelManager: !state.showModelManager }));
      },

      // Settings actions
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
    }),
    {
      name: 'ai-assistant-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        selectedModelId: state.selectedModelId,
        inferenceSettings: state.inferenceSettings,
        settings: state.settings,
        projectPath: state.projectPath,
      }),
    }
  )
);
