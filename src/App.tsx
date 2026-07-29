import React, { useEffect, useCallback, useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import FileExplorer from './FileExplorer';
import SettingsPanel from './SettingsPanel';
import ModelManager from './ModelManager';
import CommandPalette from './CommandPalette';
import KeyboardShortcuts from './KeyboardShortcuts';
import TerminalPanel from './TerminalPanel';
import ActivityPanel from './ActivityPanel';
import ConversationManager from './ConversationManager';
import FloatingBar from './FloatingBar';
import SnippetsPanel from './SnippetsPanel';
import GitPanel from './GitPanel';
import CodeEditorPanel from './CodeEditorPanel';
import VoiceInputPanel from './VoiceInputPanel';
import BookmarkManager from './BookmarkManager';
import ThemeCustomizer from './ThemeCustomizer';
import QuickActionsPanel from './QuickActionsPanel';
import PluginManager from './PluginManager';
import AISettingsPanel from './AISettingsPanel';
import ModelDownloadManager from './ModelDownloadManager';
import NotificationCenter from './NotificationCenter';
import StatsDashboard from './StatsDashboard';
import ProfilePanel from './ProfilePanel';
import { ToastProvider } from './Toast';
import { useStore } from './store/useStore';
import { useCommandPalette } from './CommandPalette';
import { useKeyboardShortcuts } from './KeyboardShortcuts';

export default function App() {
  const { 
    sidebarOpen, 
    showFileExplorer, 
    showSettings, 
    showModelManager,
    showTerminal,
    showActivityPanel,
    showConversationManager,
    showSnippetsPanel,
    showGitPanel,
    showCodeEditor,
    showVoiceInput,
    showBookmarks,
    showThemeCustomizer,
    showQuickActions,
    showPluginManager,
    showAISettings,
    showModelDownloads,
    showNotifications,
    showStatsPanel,
    showProfilePanel,
    isGenerating,
    toggleSidebar,
    toggleSettings,
    toggleFileExplorer,
    toggleModelManager,
    toggleTerminal,
    toggleActivityPanel,
    toggleConversationManager,
    toggleSnippetsPanel,
    toggleGitPanel,
    toggleCodeEditor,
    toggleVoiceInput,
    toggleBookmarks,
    toggleFloatingBar,
    toggleThemeCustomizer,
    toggleQuickActions,
    togglePluginManager,
    toggleAISettings,
    toggleModelDownloads,
    toggleNotifications,
    toggleStatsPanel,
    toggleProfilePanel
  } = useStore();

  const { isOpen: isPaletteOpen, setIsOpen: setIsPaletteOpen } = useCommandPalette();
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  // State for modal panels
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Voice input transcript handler
  const handleVoiceTranscript = useCallback((text: string) => {
    console.log('Voice transcript:', text);
    // Would send to chat input
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      
      // Command Palette
      if ((isMod && e.key === 'k') || (isMod && e.key === 'p')) {
        e.preventDefault();
        setIsPaletteOpen(!isPaletteOpen);
      }
      
      // Keyboard Shortcuts Modal
      if (isMod && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }

      // Sidebar Toggle
      if (isMod && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
      }

      // Settings
      if (isMod && e.key === ',') {
        e.preventDefault();
        toggleSettings();
      }

      // File Explorer
      if (isMod && e.key === 'e' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleFileExplorer();
      }

      // Model Manager
      if (isMod && e.key === 'm' && !e.shiftKey) {
        e.preventDefault();
        toggleModelManager();
      }

      // Terminal
      if (e.key === '`' && isMod) {
        e.preventDefault();
        toggleTerminal();
      }

      // Activity Panel
      if (isMod && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleActivityPanel();
      }

      // Conversation Manager (Export/Import)
      if (isMod && e.key === 'E') {
        e.preventDefault();
        toggleConversationManager();
      }

      // Snippets Panel
      if (isMod && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        toggleSnippetsPanel();
      }

      // Git Panel
      if (isMod && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        toggleGitPanel();
      }

      // Code Editor
      if (isMod && e.key === 'i' && !e.shiftKey) {
        e.preventDefault();
        toggleCodeEditor();
      }

      // Voice Input
      if (e.ctrlKey && e.altKey && e.key === 'v') {
        e.preventDefault();
        toggleVoiceInput();
      }

      // Bookmarks
      if (isMod && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        toggleBookmarks();
      }

      // Theme Customizer
      if (isMod && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleThemeCustomizer();
      }

      // Quick Actions
      if (isMod && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        toggleQuickActions();
      }

      // Plugin Manager
      if (isMod && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePluginManager();
      }

      // AI Settings
      if (isMod && e.shiftKey && e.key === ',') {
        e.preventDefault();
        toggleAISettings();
      }

      // Model Downloads (Modal)
      if (isMod && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDownloadModal(!showDownloadModal);
      }

      // Notifications (Modal)
      if (isMod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNotificationModal(!showNotificationModal);
      }

      // Stats Dashboard
      if (isMod && e.altKey && e.key === 's') {
        e.preventDefault();
        toggleStatsPanel();
      }

      // Profile Panel
      if (isMod && e.altKey && e.key === 'p') {
        e.preventDefault();
        toggleProfilePanel();
      }

      // Floating Bar
      if (isMod && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleFloatingBar();
      }

      // Escape key - close panels
      if (e.key === 'Escape') {
        if (isPaletteOpen) setIsPaletteOpen(false);
        if (showShortcuts) setShowShortcuts(false);
        if (showDownloadModal) setShowDownloadModal(false);
        if (showNotificationModal) setShowNotificationModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaletteOpen, 
    showShortcuts, 
    showDownloadModal,
    showNotificationModal,
    setIsPaletteOpen, 
    setShowShortcuts,
    toggleSidebar,
    toggleSettings,
    toggleFileExplorer,
    toggleModelManager,
    toggleTerminal,
    toggleActivityPanel,
    toggleConversationManager,
    toggleSnippetsPanel,
    toggleGitPanel,
    toggleCodeEditor,
    toggleVoiceInput,
    toggleBookmarks,
    toggleThemeCustomizer,
    toggleQuickActions,
    togglePluginManager,
    toggleAISettings,
    toggleFloatingBar,
    toggleStatsPanel,
    toggleProfilePanel
  ]);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
        {/* Particle Background Effect */}
        <div className="particle-bg fixed inset-0 pointer-events-none z-0" />
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'} relative z-10`}>
          {/* Header */}
          <header className="header-glow h-14 border-b border-slate-700/50 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="logo-pulse w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-white glow-text">CodeMate AI</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/30 neon-flicker">
                v2.2 Phase 6
              </span>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {/* Core Panels */}
              <ToolbarButton icon={<FileIcon />} label="Files" active={showFileExplorer} onClick={toggleFileExplorer} shortcut="Ctrl+E" color="yellow" />
              <ToolbarButton icon={<TerminalIcon />} label="Terminal" active={showTerminal} onClick={toggleTerminal} shortcut="Ctrl+`" color="slate" />
              <ToolbarButton icon={<SettingsIcon />} label="Settings" active={showSettings} onClick={toggleSettings} shortcut="Ctrl+," color="gray" />
              
              <div className="w-px h-6 bg-slate-700 mx-1" />
              
              {/* AI & Code Panels */}
              <ToolbarButton icon={<ModelIcon />} label="Models" active={showModelManager} onClick={toggleModelManager} shortcut="Ctrl+M" color="violet" />
              <ToolbarButton icon={<CodeIcon />} label="Editor" active={showCodeEditor} onClick={toggleCodeEditor} shortcut="Ctrl+I" color="blue" />
              <ToolbarButton icon={<SnippetIcon />} label="Snippets" active={showSnippetsPanel} onClick={toggleSnippetsPanel} shortcut="Ctrl+Shift+S" color="amber" />
              <ToolbarButton icon={<GitIcon />} label="Git" active={showGitPanel} onClick={toggleGitPanel} shortcut="Ctrl+Shift+G" color="orange" />
              
              <div className="w-px h-6 bg-slate-700 mx-1" />
              
              {/* Enhancement Panels */}
              <ToolbarButton icon={<ThemeIcon />} label="Theme" active={showThemeCustomizer} onClick={toggleThemeCustomizer} shortcut="Ctrl+Shift+T" color="pink" />
              <ToolbarButton icon={<QuickActionIcon />} label="Actions" active={showQuickActions} onClick={toggleQuickActions} shortcut="Ctrl+Shift+Q" color="emerald" />
              <ToolbarButton icon={<PluginIcon />} label="Plugins" active={showPluginManager} onClick={togglePluginManager} shortcut="Ctrl+Shift+P" color="purple" />
              <ToolbarButton icon={<AIConfigIcon />} label="AI Config" active={showAISettings} onClick={toggleAISettings} shortcut="Ctrl+Shift+," color="cyan" />
              
              <div className="w-px h-6 bg-slate-700 mx-1" />
              
              {/* Data & Misc Panels */}
              <ToolbarButton icon={<ActivityIcon />} label="Activity" active={showActivityPanel} onClick={toggleActivityPanel} shortcut="Ctrl+Shift+A" color="green" />
              <ToolbarButton icon={<ChatIcon />} label="Chats" active={showConversationManager} onClick={toggleConversationManager} shortcut="Ctrl+E" color="teal" />
              <ToolbarButton icon={<BookmarkIcon />} label="Bookmarks" active={showBookmarks} onClick={toggleBookmarks} shortcut="Ctrl+Shift+B" color="rose" />
              <ToolbarButton icon={<MicIcon />} label="Voice" active={showVoiceInput} onClick={toggleVoiceInput} shortcut="Alt+Ctrl+V" color="red" />

              <div className="w-px h-6 bg-slate-700 mx-1" />
              
              {/* Phase 6 New Panels */}
              <ToolbarButton icon={<DownloadIcon />} label="Downloads" active={showDownloadModal} onClick={() => setShowDownloadModal(true)} shortcut="Ctrl+Shift+D" color="indigo" />
              <ToolbarButton icon={<NotificationIcon />} label="Alerts" active={showNotificationModal} onClick={() => setShowNotificationModal(true)} shortcut="Ctrl+Shift+N" color="fuchsia" />
              <ToolbarButton icon={<StatsIcon />} label="Stats" active={showStatsPanel} onClick={toggleStatsPanel} shortcut="Alt+Ctrl+S" color="lime" />
              <ToolbarButton icon={<ProfileIcon />} label="Profile" active={showProfilePanel} onClick={toggleProfilePanel} shortcut="Alt+Ctrl+P" color="sky" />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setIsPaletteOpen(true)}
                className="toolbar-btn p-2 rounded-lg hover:bg-slate-700/50 transition-all duration-200 group"
                title="Command Palette (Ctrl+K)"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </header>

          {/* Main Chat Area */}
          <main className="flex-1 overflow-hidden relative">
            <ChatArea />
            
            {/* Stats Dashboard Overlay */}
            {showStatsPanel && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                <div className="w-full max-w-5xl max-h-[80vh] overflow-hidden scale-in">
                  <StatsDashboard onClose={() => toggleStatsPanel()} />
                </div>
              </div>
            )}
          </main>

          {/* Status Bar */}
          <footer className="status-bar-glow h-7 border-t border-slate-700/50 flex items-center justify-between px-4 text-xs text-slate-400 bg-slate-900/80 backdrop-blur-md relative z-20">
            <div className="flex items-center gap-4">
              <span className={`flex items-center gap-1.5 ${isGenerating ? 'text-emerald-400' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {isGenerating ? 'Generating...' : 'Ready'}
              </span>
              <span>•</span>
              <span>Model: <span className="text-cyan-400">Local LLM</span></span>
            </div>
            <div className="flex items-center gap-4">
              <span>CPU: <span className="text-amber-400">Auto</span></span>
              <span>•</span>
              <span>GPU: <span className="text-purple-400">Disabled</span></span>
              <span>•</span>
              <span className="text-violet-400">Phase 6</span>
            </div>
          </footer>
        </div>

        {/* Side Panels Container */}
        <div className="fixed inset-0 pointer-events-none z-30">
          {/* File Explorer - Left Panel */}
          {showFileExplorer && (
            <div className="absolute top-14 left-0 w-72 bottom-7 pointer-events-auto slide-left">
              <div className="h-full glass-card m-2 overflow-hidden aurora-border">
                <FileExplorer />
              </div>
            </div>
          )}

          {/* Right Side Panels */}
          {(showSettings || showModelManager || showTerminal || showActivityPanel || 
            showConversationManager || showSnippetsPanel || showGitPanel || 
            showCodeEditor || showVoiceInput || showBookmarks ||
            showThemeCustomizer || showQuickActions || showPluginManager || showAISettings ||
            showProfilePanel) && (
            <div className="absolute top-14 right-0 w-96 bottom-7 pointer-events-auto slide-left overflow-y-auto custom-scrollbar">
              {/* Stack of panels based on priority */}
              {showProfilePanel && (
                <div className="m-2 glass-card aurora-border">
                  <ProfilePanel />
                </div>
              )}
              {showAISettings && (
                <div className="m-2 glass-card aurora-border">
                  <AISettingsPanel />
                </div>
              )}
              {showThemeCustomizer && (
                <div className="m-2 glass-card aurora-border">
                  <ThemeCustomizer />
                </div>
              )}
              {showPluginManager && (
                <div className="m-2 glass-card aurora-border">
                  <PluginManager />
                </div>
              )}
              {showQuickActions && (
                <div className="m-2 glass-card aurora-border">
                  <QuickActionsPanel />
                </div>
              )}
              {showSettings && (
                <div className="m-2 glass-card aurora-border">
                  <SettingsPanel />
                </div>
              )}
              {showModelManager && (
                <div className="m-2 glass-card aurora-border">
                  <ModelManager />
                </div>
              )}
              {showTerminal && (
                <div className="m-2 glass-card aurora-border">
                  <TerminalPanel />
                </div>
              )}
              {showActivityPanel && (
                <div className="m-2 glass-card aurora-border">
                  <ActivityPanel />
                </div>
              )}
              {showConversationManager && (
                <div className="m-2 glass-card aurora-border">
                  <ConversationManager />
                </div>
              )}
              {showSnippetsPanel && (
                <div className="m-2 glass-card aurora-border">
                  <SnippetsPanel />
                </div>
              )}
              {showGitPanel && (
                <div className="m-2 glass-card aurora-border">
                  <GitPanel />
                </div>
              )}
              {showCodeEditor && (
                <div className="m-2 glass-card aurora-border">
                  <CodeEditorPanel />
                </div>
              )}
              {showVoiceInput && (
                <div className="m-2 glass-card aurora-border">
                  <VoiceInputPanel onTranscript={handleVoiceTranscript} />
                </div>
              )}
              {showBookmarks && (
                <div className="m-2 glass-card aurora-border">
                  <BookmarkManager />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Bar */}
        <FloatingBar />

        {/* Modals */}
        <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
        <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        
        {/* Model Download Modal */}
        <ModelDownloadManager 
          isOpen={showDownloadModal} 
          onClose={() => setShowDownloadModal(false)} 
        />
        
        {/* Notification Center Modal */}
        <NotificationCenter 
          isOpen={showNotificationModal} 
          onClose={() => setShowNotificationModal(false)} 
        />
      </div>
    </ToastProvider>
  );
}

// Toolbar Button Component
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
  color?: string;
}

function ToolbarButton({ icon, label, active, onClick, shortcut, color = 'slate' }: ToolbarButtonProps) {
  const colorClasses: Record<string, string> = {
    yellow: active ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : '',
    slate: active ? 'bg-slate-500/20 text-slate-300 border-slate-500/30' : '',
    gray: active ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : '',
    violet: active ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : '',
    blue: active ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : '',
    amber: active ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : '',
    orange: active ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : '',
    pink: active ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : '',
    emerald: active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : '',
    purple: active ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : '',
    cyan: active ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : '',
    green: active ? 'bg-green-500/20 text-green-400 border-green-500/30' : '',
    teal: active ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : '',
    rose: active ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : '',
    red: active ? 'bg-red-500/20 text-red-400 border-red-500/30' : '',
    indigo: active ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : '',
    fuchsia: active ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' : '',
    lime: active ? 'bg-lime-500/20 text-lime-400 border-lime-500/30' : '',
    sky: active ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : '',
  };

  return (
    <button
      onClick={onClick}
      className={`toolbar-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        active 
          ? `${colorClasses[color]} shadow-sm neon-border-hover` 
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
      }`}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <span className="w-4 h-4">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// Icon Components
function FileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ModelIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function SnippetIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function GitIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function QuickActionIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PluginIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  );
}

function AIConfigIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

// New Icons for Phase 6
function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A9 9 0 014.095 4.095H3.5S2 7.5 2 12.5a9 9 1 0013.5 0" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.027 6.027L6 6" transform="translate(12, 0)" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
