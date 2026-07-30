import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface CodeEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Language to syntax highlight mapping
const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  css: 'css',
  html: 'html',
  json: 'json',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  sql: 'sql',
  toml: 'toml',
  xml: 'xml',
  svg: 'xml',
};

// Get language from file extension
const getLanguageFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
};

// Get file icon based on extension
const getFileIcon = (filePath: string): { icon: string; color: string } => {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  
  const icons: Record<string, { icon: string; color: string }> = {
    ts: { icon: '🔷', color: 'text-blue-400' },
    tsx: { icon: '⚛️', color: 'text-cyan-400' },
    js: { icon: '🟨', color: 'text-yellow-400' },
    jsx: { icon: '⚛️', color: 'text-cyan-400' },
    py: { icon: '🐍', color: 'text-emerald-400' },
    rs: { icon: '🦀', color: 'text-orange-500' },
    go: { icon: '🐹', color: 'text-sky-400' },
    java: { icon: '☕', color: 'text-red-400' },
    c: { icon: '⚙️', color: 'text-gray-400' },
    cpp: { icon: '⚙️', color: 'text-blue-300' },
    css: { icon: '🎨', color: 'text-pink-400' },
    html: { icon: '🌐', color: 'text-orange-400' },
    json: { icon: '📋', color: 'text-yellow-300' },
    md: { icon: '📝', color: 'text-dark-300' },
    sh: { icon: '💻', color: 'text-green-400' },
    sql: { icon: '🗃️', color: 'text-indigo-400' },
    svg: { icon: '🖼️', color: 'text-yellow-500' },
  };
  
  return icons[ext] || { icon: '📄', color: 'text-dark-400' };
};

export default function CodeEditorPanel({ isOpen, onClose }: CodeEditorPanelProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);
  
  const { selectedFile, fileContent, projectPath } = useStore();
  const toast = useToast();
  
  // Load content when selectedFile changes
  useEffect(() => {
    if (fileContent) {
      setContent(fileContent);
      setOriginalContent(fileContent);
      setIsModified(false);
    }
  }, [selectedFile, fileContent]);

  // Update line numbers
  useEffect(() => {
    if (lineNumbers && lineCountRef.current && textareaRef.current) {
      const lines = content.split('\n').length;
      const lineNumbersHtml = Array.from(
        { length: lines }, 
        (_, i) => `<div class="pr-4 text-right text-dark-600 select-none">${i + 1}</div>`
      ).join('');
      lineCountRef.current.innerHTML = lineNumbersHtml;
    }
  }, [content, lineNumbers]);

  // Sync scroll between textarea and line numbers
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineCountRef.current) {
      lineCountRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsModified(newContent !== originalContent);
  };

  // Save file (simulated)
  const handleSave = async () => {
    try {
      // In real app, this would call Tauri's write file API
      toast.showToast(`File saved successfully!`, 'success');
      setOriginalContent(content);
      setIsModified(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast.showToast('Failed to save file', 'error');
    }
  };

  // Format code (simulated)
  const handleFormat = () => {
    // In real app, this would use a formatter
    toast.showToast('Code formatted!', 'info');
  };

  // Copy content
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.showToast('Copied to clipboard!', 'success');
  };

  // Undo (basic implementation)
  const handleUndo = () => {
    document.execCommand('undo');
  };

  // Redo (basic implementation)
  const handleRedo = () => {
    document.execCommand('redo');
  };

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  const fileInfo = selectedFile ? getFileIcon(selectedFile) : { icon: '📄', color: 'text-dark-400' };
  const fileName = selectedFile?.split('/').pop() || 'No file selected';
  const filePath = selectedFile || '';
  const language = getLanguageFromPath(filePath);

  if (!isOpen) return null;

  return (
    <aside className="w-[45%] min-w-[400px] max-w-[700px] bg-dark-900/95 backdrop-blur-sm border-l border-dark-800/70 flex flex-col slide-down overflow-hidden">
      
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-800 shrink-0 bg-dark-900">
        <div className="flex items-center gap-3 min-w-0">
          {/* File Icon */}
          <span className={`text-lg ${fileInfo.color}`}>{fileInfo.icon}</span>
          
          {/* File Name */}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{fileName}</p>
            <p className="text-xs text-dark-500 truncate font-mono">{filePath}</p>
          </div>

          {/* Modified indicator */}
          {isModified && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
              modified
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Tab toggle */}
          <div className="tab-container mr-2" style={{ padding: '2px' }}>
            <button 
              onClick={() => setActiveTab('editor')}
              className={`tab-item px-3 py-1 ${activeTab === 'editor' ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Editor
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`tab-item px-3 py-1 ${activeTab === 'preview' ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Preview
            </button>
          </div>

          {/* Find */}
          <button 
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1.5 rounded-md transition-colors ${showFindReplace ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'}`}
            title="Find (Ctrl+F)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Save */}
          <button 
            onClick={handleSave}
            disabled={!isModified}
            className={`p-1.5 rounded-md transition-colors ${isModified ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-dark-500 cursor-not-allowed'}`}
            title="Save (Ctrl+S)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>

          {/* Close */}
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors"
            title="Close editor"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-dark-800/50 bg-dark-850/50 shrink-0">
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <button onClick={handleUndo} className="p-1.5 rounded text-dark-500 hover:text-dark-200 hover:bg-dark-800/60 transition-colors" title="Undo">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button onClick={handleRedo} className="p-1.5 rounded text-dark-500 hover:text-dark-200 hover:bg-dark-800/60 transition-colors" title="Redo">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="w-px h-4 bg-dark-700 mx-1" />

          {/* Format */}
          <button onClick={handleFormat} className="p-1.5 rounded text-dark-500 hover:text-dark-200 hover:bg-dark-800/60 transition-colors" title="Format document">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>

          {/* Copy */}
          <button onClick={handleCopy} className="p-1.5 rounded text-dark-500 hover:text-dark-200 hover:bg-dark-800/60 transition-colors" title="Copy all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          <div className="w-px h-4 bg-dark-700 mx-1" />

          {/* Line Numbers Toggle */}
          <button 
            onClick={() => setLineNumbers(!lineNumbers)} 
            className={`p-1.5 rounded transition-colors ${lineNumbers ? 'text-primary-400 bg-primary-500/15' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-800/60'}`}
            title="Toggle line numbers"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </button>

          {/* Word Wrap Toggle */}
          <button 
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded transition-colors ${wordWrap ? 'text-primary-400 bg-primary-500/15' : 'text-dark-500 hover:text-dark-200 hover:bg-dark-800/60'}`}
            title="Toggle word wrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {/* Right side - Language badge & stats */}
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded bg-dark-800 text-dark-400 font-mono uppercase">
            {language}
          </span>
          {content && (
            <span className="text-xs text-dark-600">
              {content.split('\n').length} lines • {content.length.toLocaleString()} chars
            </span>
          )}
        </div>
      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-dark-800 bg-dark-850/80 slide-down">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Find..."
              className="flex-1 h-7 px-2 bg-dark-800 border border-dark-700 rounded text-xs text-white placeholder-dark-500 focus:border-primary-500 outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace..."
              className="flex-1 h-7 px-2 bg-dark-800 border border-dark-700 rounded text-xs text-white placeholder-dark-500 focus:border-purple-500 outline-none"
            />
          </div>

          <button onClick={() => setShowFindReplace(false)} className="p-1 text-dark-500 hover:text-dark-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {selectedFile && activeTab === 'editor' ? (
          <>
            {/* Line Numbers Column */}
            {lineNumbers && (
              <div 
                ref={lineCountRef}
                className="py-3 pl-3 pr-0 bg-dark-950/50 text-xs font-mono leading-relaxed select-none overflow-hidden"
                style={{ width: '48px', minWidth: '48px' }}
              />
            )}
            
            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onScroll={handleScroll}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-dark-200 font-mono text-sm leading-relaxed resize-none focus:outline-none caret-primary-400 overflow-auto"
              style={{
                fontSize: `${fontSize}px`,
                tabSize: 2,
                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              }}
              placeholder="Select a file from File Explorer to edit..."
            />

            {/* Mini Map (optional visual representation) */}
            {showMiniMap && (
              <div 
                className="w-20 bg-dark-950/30 border-l border-dark-800/50 p-2 overflow-hidden opacity-50"
                style={{ fontSize: '2px', lineHeight: '3px', letterSpacing: '-0.5px' }}
              >
                <pre className="text-dark-500 break-all">{content}</pre>
              </div>
            )}
          </>
        ) : selectedFile && activeTab === 'preview' ? (
          /* Preview Mode */
          <div className="flex-1 p-4 overflow-auto">
            {language === 'markdown' ? (
              <div className="prose-dark prose-sm max-w-none">
                {/* Simple markdown preview would be rendered here */}
                <pre className="whitespace-pre-wrap text-sm text-dark-200 font-mono">{content || 'No content to preview'}</pre>
              </div>
            ) : (
              <pre className="text-sm text-dark-200 font-mono whitespace-pre-wrap">{content || 'No content to preview'}</pre>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center text-dark-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No file selected</p>
              <p className="text-xs mt-1">Click a file in the explorer to open it</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-dark-800 bg-dark-950/80 text-xs text-dark-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>Ln 1, Col 1</span>
          <span>{wordWrap ? 'Wrapped' : 'Unwrapped'}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          {isModified && <span className="text-amber-400">• Unsaved changes</span>}
          <span className="font-mono">{language.toUpperCase()}</span>
        </div>
      </div>
    </aside>
  );
}
