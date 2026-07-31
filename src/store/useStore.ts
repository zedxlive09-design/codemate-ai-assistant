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

// Revive Date fields that JSON serialisation turns into ISO strings, so
// persisted conversations don't crash code that calls .getTime()/.toISOString().
function reviveDate(d: unknown): Date {
  if (d instanceof Date) return d;
  if (typeof d === 'string' || typeof d === 'number') {
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

function reviveConversations(input: unknown): Conversation[] {
  if (!Array.isArray(input)) return [];
  return input.map((c: any) => ({
    ...c,
    createdAt: reviveDate(c?.createdAt),
    updatedAt: reviveDate(c?.updatedAt),
    messages: Array.isArray(c?.messages)
      ? c.messages.map((m: any) => ({ ...m, timestamp: reviveDate(m?.timestamp) }))
      : [],
  }));
}

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
  showTerminal: boolean;
  showActivityPanel: boolean;
  showConversationManager: boolean;
  showSnippetsPanel: boolean;
  showGitPanel: boolean;
  showCodeEditor: boolean;
  showVoiceInput: boolean;
  showBookmarks: boolean;
  showFloatingBar: boolean;
  showThemeCustomizer: boolean;
  showQuickActions: boolean;
  showPluginManager: boolean;
  showAISettings: boolean;
  showModelDownloads: boolean;
  showNotifications: boolean;
  showStatsPanel: boolean;
  showProfilePanel: boolean;
  showMemoryPanel: boolean;
  
  // App Settings
  settings: AppSettings;

  // Actions - Conversations
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  deleteAllConversations: () => void;
  setActiveConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  duplicateConversation: (id: string) => string | null;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  importConversations: (conversations: Conversation[]) => void;
  addConversationBatch: (conversations: Array<{
    id: string;
    title: string;
    messages: Array<{ role: string; content: string }>;
    createdAt: Date;
    updatedAt: Date;
  }>) => void;
  
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
  toggleTerminal: () => void;
  toggleActivityPanel: () => void;
  toggleConversationManager: () => void;
  toggleSnippetsPanel: () => void;
  toggleGitPanel: () => void;
  toggleCodeEditor: () => void;
  toggleVoiceInput: () => void;
  toggleBookmarks: () => void;
  toggleFloatingBar: () => void;
  toggleThemeCustomizer: () => void;
  toggleQuickActions: () => void;
  togglePluginManager: () => void;
  toggleAISettings: () => void;
  toggleModelDownloads: () => void;
  toggleNotifications: () => void;
  toggleStatsPanel: () => void;
  toggleProfilePanel: () => void;
  toggleMemoryPanel: () => void;
  
  // Bookmarks
  addBookmark: (conversationId: string, messageId: string) => void;
  removeBookmark: (messageId: string) => void;
  bookmarks: string[];
  
  // Pinned Conversations
  pinnedConversationIds: string[];
  togglePinConversation: (id: string) => void;
  
  // Conversation Tags
  conversationTags: Record<string, string[]>; // conversationId -> tagIds
  addTagToConversation: (conversationId: string, tagId: string) => void;
  removeTagFromConversation: (conversationId: string, tagId: string) => void;
  
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
      showTerminal: false,
      showActivityPanel: false,
      showConversationManager: false,
      showSnippetsPanel: false,
      showGitPanel: false,
      showCodeEditor: false,
      showVoiceInput: false,
      showBookmarks: false,
      showFloatingBar: true,
      showThemeCustomizer: false,
      showQuickActions: false,
      showPluginManager: false,
      showAISettings: false,
  showModelDownloads: false,
  showNotifications: false,
  showStatsPanel: false,
  showProfilePanel: false,
  showMemoryPanel: false,
      
      bookmarks: [],
      pinnedConversationIds: [],
      conversationTags: {},
      
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

      deleteAllConversations: () => {
        set({
          conversations: [],
          activeConversationId: null,
        });
      },

      setActiveConversation: (id: string) => {
        set({ activeConversationId: id });
      },

      renameConversation: (id: string, title: string) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title: trimmed, updatedAt: new Date() } : c
          ),
        }));
      },

      duplicateConversation: (id: string) => {
        const original = get().conversations.find((c) => c.id === id);
        if (!original) return null;
        const newId = uuidv4();
        const copy: Conversation = {
          id: newId,
          title: `${original.title} (copy)`,
          // Deep-copy messages with fresh ids + timestamps so edits to the
          // duplicate don't alias the original.
          messages: original.messages.map((m) => ({
            ...m,
            id: uuidv4(),
            timestamp: new Date(m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp).getTime()),
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
          projectPath: original.projectPath,
        };
        // Insert the copy right after the original.
        set((state) => {
          const idx = state.conversations.findIndex((c) => c.id === id);
          const next = [...state.conversations];
          next.splice(idx >= 0 ? idx + 1 : 0, 0, copy);
          return { conversations: next, activeConversationId: newId };
        });
        return newId;
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

      toggleTerminal: () => {
        set((state) => ({ showTerminal: !state.showTerminal }));
      },

      toggleActivityPanel: () => {
        set((state) => ({ showActivityPanel: !state.showActivityPanel }));
      },

      toggleConversationManager: () => {
        set((state) => ({ showConversationManager: !state.showConversationManager }));
      },

      importConversations: (importedConversations: Conversation[]) => {
        set((state) => ({
          conversations: [...importedConversations, ...state.conversations],
        }));
      },

      addConversationBatch: (newConversations: Array<{
        id: string;
        title: string;
        messages: Array<{ role: string; content: string }>;
        createdAt: Date;
        updatedAt: Date;
      }>) => {
        set((state) => ({
          conversations: [...newConversations as Conversation[], ...state.conversations],
        }));
      },

      // Settings actions
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Additional UI toggles
      toggleSnippetsPanel: () => {
        set((state) => ({ showSnippetsPanel: !state.showSnippetsPanel }));
      },

      toggleGitPanel: () => {
        set((state) => ({ showGitPanel: !state.showGitPanel }));
      },

      toggleCodeEditor: () => {
        set((state) => ({ showCodeEditor: !state.showCodeEditor }));
      },

      toggleVoiceInput: () => {
        set((state) => ({ showVoiceInput: !state.showVoiceInput }));
      },

      toggleBookmarks: () => {
        set((state) => ({ showBookmarks: !state.showBookmarks }));
      },

      toggleFloatingBar: () => {
        set((state) => ({ showFloatingBar: !state.showFloatingBar }));
      },

      toggleThemeCustomizer: () => {
        set((state) => ({ showThemeCustomizer: !state.showThemeCustomizer }));
      },

      toggleQuickActions: () => {
        set((state) => ({ showQuickActions: !state.showQuickActions }));
      },

      togglePluginManager: () => {
        set((state) => ({ showPluginManager: !state.showPluginManager }));
      },

      toggleAISettings: () => {
        set((state) => ({ showAISettings: !state.showAISettings }));
      },

      toggleModelDownloads: () => {
        set((state) => ({ showModelDownloads: !state.showModelDownloads }));
      },

      toggleNotifications: () => {
        set((state) => ({ showNotifications: !state.showNotifications }));
      },

      toggleStatsPanel: () => {
        set((state) => ({ showStatsPanel: !state.showStatsPanel }));
      },

      toggleProfilePanel: () => {
        set((state) => ({ showProfilePanel: !state.showProfilePanel }));
      },

      toggleMemoryPanel: () => {
        set((state) => ({ showMemoryPanel: !state.showMemoryPanel }));
      },

      // Bookmarks actions
      addBookmark: (_conversationId: string, messageId: string) => {
        set((state) => ({
          bookmarks: [...state.bookmarks, messageId],
        }));
      },

      removeBookmark: (messageId: string) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter(id => id !== messageId),
        }));
      },

      // Pinned Conversations
      togglePinConversation: (id: string) => {
        set((state) => ({
          pinnedConversationIds: state.pinnedConversationIds.includes(id)
            ? state.pinnedConversationIds.filter(pinId => pinId !== id)
            : [...state.pinnedConversationIds, id],
        }));
      },

      // Conversation Tags
      addTagToConversation: (conversationId: string, tagId: string) => {
        set((state) => ({
          conversationTags: {
            ...state.conversationTags,
            [conversationId]: [...(state.conversationTags[conversationId] || []), tagId].filter((t, i, arr) => arr.indexOf(t) === i),
          },
        }));
      },

      removeTagFromConversation: (conversationId: string, tagId: string) => {
        set((state) => ({
          conversationTags: {
            ...state.conversationTags,
            [conversationId]: (state.conversationTags[conversationId] || []).filter(t => t !== tagId),
          },
        }));
      },
    }),
    {
      name: 'ai-assistant-storage',
      version: 1,
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        selectedModelId: state.selectedModelId,
        inferenceSettings: state.inferenceSettings,
        settings: state.settings,
        projectPath: state.projectPath,
      }),
      // Revive Date instances on every rehydrate (JSON stores them as strings).
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<AppState>;
        return {
          ...currentState,
          ...p,
          conversations: reviveConversations(p.conversations),
        };
      },
    }
  )
);
