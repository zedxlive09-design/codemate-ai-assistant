import React, { useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import FileExplorer from './FileExplorer';
import SettingsPanel from './SettingsPanel';
import ModelManager from './ModelManager';
import CommandPalette from './CommandPalette';
import KeyboardShortcuts from './KeyboardShortcuts';
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
    isGenerating 
  } = useStore();

  const { isOpen: isPaletteOpen, setIsOpen: setIsPaletteOpen } = useCommandPalette();
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B - Toggle file explorer
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        useStore.getState().toggleFileExplorer();
      }
      
      // Ctrl+S - Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().toggleSidebar();
      }

      // Ctrl+M - Model manager
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        useStore.getState().toggleModelManager();
      }

      // Ctrl+, - Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useStore.getState().toggleSettings();
      }

      // Ctrl+N - New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        useStore.getState().createConversation();
      }

      // Escape - Close modals
      if (e.key === 'Escape') {
        if (isPaletteOpen) setIsPaletteOpen(false);
        else if (showSettings) useStore.getState().toggleSettings();
        else if (showModelManager) useStore.getState().toggleModelManager();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen, showSettings, showModelManager]);

  return (
    <ToastProvider>
      <div className="h-screen flex flex-col bg-dark-950 text-dark-100 overflow-hidden noise-bg">
        {/* Header */}
        <header className="h-14 bg-dark-900/80 backdrop-blur-xl border-b border-dark-800/80 flex items-center justify-between px-4 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-400/40 transition-shadow duration-300">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-300" />
            </div>

            <div>
              <h1 className="text-lg font-semibold gradient-text leading-none">CodeMate</h1>
            </div>
            
            {/* Status badges */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="text-xs text-dark-500 bg-dark-800/60 px-2 py-0.5 rounded-full border border-dark-700/50">
                Offline
              </span>
              
              {isGenerating && (
                <span className="inline-flex items-center gap-1.5 text-xs text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded-full border border-primary-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>
                  Generating...
                  <span className="animate-pulse">⏳</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Center: Breadcrumb / Context (optional) */}
          <div className="hidden lg:flex items-center gap-1 text-xs text-dark-500">
            {/* Can add path breadcrumb here */}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            {/* Search / Command Palette */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-dark-800/60 hover:bg-dark-800 rounded-lg transition-all duration-200 border border-transparent hover:border-dark-700"
              title="Command Palette (Ctrl+K)"
            >
              <svg className="w-4 h-4 text-dark-500 group-hover:text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs text-dark-500 hidden sm:block group-hover:text-dark-300">Search...</span>
              <kbd className="text-[10px] px-1 py-0.5 bg-dark-900 rounded font-mono text-dark-600 border border-dark-700">
                ⌘K
              </kbd>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-dark-800 mx-1" />

            {/* Toggle File Explorer */}
            <Tooltip content="Toggle File Explorer (Ctrl+B)">
              <button
                onClick={() => useStore.getState().toggleFileExplorer()}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showFileExplorer 
                    ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30' 
                    : 'hover:bg-dark-800/80 text-dark-400 hover:text-white'
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            </Tooltip>

            {/* Toggle Settings */}
            <Tooltip content="Settings (Ctrl+,)">
              <button
                onClick={() => useStore.getState().toggleSettings()}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showSettings 
                    ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30' 
                    : 'hover:bg-dark-800/80 text-dark-400 hover:text-white'
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </Tooltip>

            {/* Model Manager */}
            <Tooltip content="Model Manager (Ctrl+M)">
              <button
                onClick={() => useStore.getState().toggleModelManager()}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showModelManager 
                    ? 'bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/30' 
                    : 'hover:bg-dark-800/80 text-dark-400 hover:text-white'
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            </Tooltip>

            {/* Keyboard Shortcuts */}
            <Tooltip content="Keyboard Shortcuts (Ctrl+/)">
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 rounded-lg hover:bg-dark-800/80 text-dark-400 hover:text-white transition-all duration-200"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* Sidebar - Conversations */}
          {sidebarOpen && (
            <aside className="w-72 bg-dark-900/70 backdrop-blur-sm border-r border-dark-800/70 flex flex-col shrink-0 slide-down">
              <Sidebar />
            </aside>
          )}

          {/* Chat Area - Main Content */}
          <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-dark-950 to-dark-900/50">
            <ChatArea />
          </main>

          {/* File Explorer Panel */}
          {showFileExplorer && (
            <aside className="w-80 bg-dark-900/70 backdrop-blur-sm border-l border-dark-800/70 flex flex-col shrink-0 slide-down">
              <FileExplorer />
            </aside>
          )}
        </div>

        {/* Modals & Overlays */}
        
        {/* Command Palette */}
        <CommandPalette 
          isOpen={isPaletteOpen} 
          onClose={() => setIsPaletteOpen(false)} 
        />

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />

        {/* Settings Panel */}
        {showSettings && (
          <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <SettingsPanel onClose={() => useStore.getState().toggleSettings()} />
          </div>
        )}
        
        {/* Model Manager Modal */}
        {showModelManager && (
          <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <ModelManager onClose={() => useStore.getState().toggleModelManager()} />
          </div>
        )}

        {/* Bottom Status Bar */}
        <StatusBar />
      </div>
    </ToastProvider>
  );
}

// Tooltip Component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="group relative" data-tooltip={content}>
      {children}
    </div>
  );
}

// Status Bar Component
function StatusBar() {
  const { modelLoaded, selectedModelId, inferenceSettings, projectPath } = useStore();

  return (
    <footer className="h-7 bg-dark-950 border-t border-dark-800/80 flex items-center justify-between px-4 text-xs text-dark-500 shrink-0 relative z-20">
      {/* Left side status */}
      <div className="flex items-center gap-4">
        <span className={`flex items-center gap-1.5 ${modelLoaded ? 'text-emerald-400' : 'text-yellow-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${modelLoaded ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-500'} `}></span>
          {modelLoaded ? 'Ready' : 'No Model'}
        </span>
        
        {selectedModelId && (
          <>
            <span className="text-dark-700">|</span>
            <span className="text-dark-400 truncate max-w-[150px]" title={selectedModelId}>
              {selectedModelId.split('/').pop()?.split('.gguf')[0]}
            </span>
          </>
        )}

        {projectPath && (
          <>
            <span className="text-dark-700">|</span>
            <span className="flex items-center gap-1 text-dark-400 truncate max-w-[200px]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {projectPath.split('/').pop()}
            </span>
          </>
        )}
      </div>

      {/* Right side info */}
      <div className="flex items-center gap-4">
        <span>Temp: {inferenceSettings.temperature}</span>
        <span className="text-dark-700">|</span>
        <span>Tokens: {inferenceSettings.maxTokens.toLocaleString()}</span>
        <span className="text-dark-700">|</span>
        <span className="font-mono">CodeMate v1.0</span>
      </div>
    </footer>
  );
}
