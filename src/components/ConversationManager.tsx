import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Conversation, Message } from '../types';

interface ConversationManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Export format types
type ExportFormat = 'json' | 'markdown' | 'txt' | 'csv';

export default function ConversationManager({ isOpen, onClose }: ConversationManagerProps) {
  const { conversations, activeConversationId, addMessage } = useStore();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [importPreview, setImportPreview] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Get conversations to operate on
  const targetConversations = selectedConversations.length > 0
    ? conversations.filter(c => selectedConversations.includes(c.id))
    : (activeConversation ? [activeConversation] : []);

  // Toggle conversation selection
  const toggleSelection = (id: string) => {
    setSelectedConversions(prev =>
      prev.includes(id)
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedConversations.length === conversations.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(conversations.map(c => c.id));
    }
  };

  // Generate exported content based on format
  const generateExportContent = (): string => {
    switch (exportFormat) {
      case 'json':
        return generateJSONExport();
      case 'markdown':
        return generateMarkdownExport();
      case 'txt':
        return generateTxtExport();
      case 'csv':
        return generateCSVExport();
      default:
        return '';
    }
  };

  // JSON Export
  const generateJSONExport = (): string => {
    const data = includeMetadata ? {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      app: 'CodeMate AI Assistant',
      conversations: targetConversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        projectPath: conv.projectPath,
        messageCount: conv.messages.length,
        messages: conv.messages
      }))
    } : targetConversations;

    return JSON.stringify(data, null, 2);
  };

  // Markdown Export
  const generateMarkdownExport = (): string => {
    let md = '# CodeMate - Conversation Export\n\n';
    
    if (includeMetadata) {
      md += `**Exported:** ${new Date().toLocaleString()}\n`;
      md += `**App:** CodeMate AI Assistant v1.0\n\n---\n\n`;
    }

    targetConversations.forEach((conv, idx) => {
      md += `## ${idx + 1}. ${conv.title}\n\n`;
      
      if (includeMetadata) {
        md += `*Created: ${new Date(conv.createdAt).toLocaleString()}*\n`;
        md += `*Messages: ${conv.messages.length}*\n\n`;
      }

      conv.messages.forEach(msg => {
        const roleIcon = msg.role === 'user' ? '👤' : '🤖';
        const roleName = msg.role === 'user' ? '**You:**' : '**AI:**';
        
        md += `${roleIcon} ${roleName}\n\n`;
        md += `${msg.content}\n\n`;
        
        if (msg.files && msg.files.length > 0) {
          md += `*Attachments: ${msg.files.map(f => f.name).join(', ')}*\n\n`;
        }
        
        md += '---\n\n';
      });
    });

    return md;
  };

  // Plain Text Export
  const generateTxtExport = (): string => {
    let txt = `CodeMate AI Assistant - Conversation Export\n`;
    txt += `Exported: ${new Date().toLocaleString()}\n`;
    txt += '=' .repeat(50) + '\n\n';

    targetConversations.forEach((conv, idx) => {
      txt += `[CONVERSATION ${idx + 1}] ${conv.title}\n`;
      txt += '-'.repeat(40) + '\n\n';

      conv.messages.forEach(msg => {
        const prefix = msg.role === 'user' ? '[You]' : '[AI]';
        txt += `${prefix} ${msg.content.replace(/\n/g, '\n\t')}\n\n`;
      });

      txt += '\n';
    });

    return txt;
  };

  // CSV Export
  const generateCSVExport = (): string => {
    let csv = 'Timestamp,Role,Content,Files\n';

    targetConversations.forEach(conv => {
      conv.messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toISOString();
        const role = msg.role;
        const content = `"${msg.content.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        const files = msg.files?.map(f => f.name).join(';') || '';

        csv += `${timestamp},${role},${content},"${files}"\n`;
      });
    });

    return csv;
  };

  // Handle download
  const handleDownload = () => {
    const content = generateExportContent();
    const mimeType = getMimeType(exportFormat);
    const extension = getFileExtension(exportFormat);
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemate-export-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // Helper functions
  const getMimeType = (format: ExportFormat): string => {
    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      markdown: 'text/markdown',
      txt: 'text/plain',
      csv: 'text/csv'
    };
    return mimeTypes[format];
  };

  const getFileExtension = (format: ExportFormat): string => {
    const extensions: Record<ExportFormat, string> = {
      json: 'json',
      markdown: 'md',
      txt: 'txt',
      csv: 'csv'
    };
    return extensions[format];
  };

  // Handle import preview
  const handleImportChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setImportPreview(value);
    setImportError(null);

    try {
      // Try to parse as JSON
      if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
        JSON.parse(value);
      }
    } catch (err) {
      setImportError('Invalid format. Please check your data.');
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importPreview.trim()) {
      setImportError('Please paste content to import');
      return;
    }

    try {
      let imported: Conversation[] = [];

      if (importPreview.trim().startsWith('{')) {
        // JSON import
        const data = JSON.parse(importPreview);
        imported = data.conversations || [data];
      } else {
        // Simple text/MD import - create single conversation
        const lines = importPreview.split('\n').filter(l => l.trim());
        
        const messages: Message[] = [];
        let currentRole: 'user' | 'assistant' = 'user';
        let content = '';

        lines.forEach(line => {
          if (line.includes('[You]') || line.includes('[User]')) {
            if (content || messages.length > 0) {
              messages.push({
                id: crypto.randomUUID(),
                role: currentRole,
                content: content.trim(),
                timestamp: new Date()
              });
            }
            currentRole = 'user';
            content = line.replace(/\[.*?\]\s*/, '');
          } else if (line.includes('[AI]') || line.includes('[Assistant]')) {
            if (content || messages.length > 0) {
              messages.push({
                id: crypto.randomUUID(),
                role: currentRole,
                content: content.trim(),
                timestamp: new Date()
              });
            }
            currentRole = 'assistant';
            content = line.replace(/\[.*?\]\s*/, '');
          } else {
            content += (content ? '\n' : '') + line;
          }
        });

        if (content.trim()) {
          messages.push({
            id: crypto.randomUUID(),
            role: currentRole,
            content: content.trim(),
            timestamp: new Date()
          });
        }

        if (messages.length > 0) {
          imported.push({
            id: crypto.randomUUID(),
            title: `Imported Chat (${messages.length} messages)`,
            messages,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      if (imported.length === 0) {
        setImportError('No valid conversations found in the input');
        return;
      }

      // Add to store
      const store = useStore.getState();
      imported.forEach(conv => {
        // Create conversation and add messages
        const convId = store.createConversation(conv.title);
        conv.messages.forEach(msg => {
          store.addMessage(convId, {
            ...msg,
            id: crypto.randomUUID()
          });
        });
      });

      onClose();
      // Success toast would be shown here via Toast context
      
    } catch (err) {
      setImportError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // File input handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportPreview(event.target?.result as string || '');
    };
    reader.readAsText(file);

    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9996] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-dark-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </span>
              Conversation Manager
            </h2>
            <p className="text-sm text-dark-400 mt-1">Export or import your chat history</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-dark-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-800">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3.5 px-4 font-medium text-sm transition-all ${
              activeTab === 'export' 
                ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5' 
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3.5 px-4 font-medium text-sm transition-all ${
              activeTab === 'import' 
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' 
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Import
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'export' ? (
            /* Export Tab */
            <div className="space-y-5">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-3">Export Format</label>
                
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'json', name: 'JSON', icon: '{ }', desc: 'Full data with metadata' },
                    { id: 'markdown', name: 'Markdown', icon: '# ', desc: 'Formatted for reading' },
                    { id: 'txt', name: 'Plain Text', icon: 'T', desc: 'Simple text file' },
                    { id: 'csv', name: 'CSV', icon: ',', desc: 'Spreadsheet compatible' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as ExportFormat)}
                      className={`
                        p-3 rounded-xl border text-left transition-all duration-200
                        ${exportFormat === fmt.id
                          ? 'bg-primary-600/15 border-primary-500/40 ring-1 ring-primary-500/30'
                          : 'bg-dark-800/50 border-dark-700 hover:border-dark-600 hover:bg-dark-800'
                        }
                      `}
                    >
                      <div className="text-lg font-mono mb-1">{fmt.icon}</div>
                      <div className={`font-medium text-sm ${exportFormat === fmt.id ? 'text-white' : 'text-dark-300'}`}>
                        {fmt.name}
                      </div>
                      <div className="text-[10px] text-dark-500 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
                <input
                  type="checkbox"
                  id="includeMeta"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4 rounded bg-dark-700 border-dark-600 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="includeMeta" className="text-sm text-dark-300 cursor-pointer">
                  Include metadata (timestamps, IDs, etc.)
                </label>
              </div>

              {/* Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-dark-300">Conversations to Export</label>
                  
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {selectedConversations.length === conversations.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                  {conversations.slice(0, 20).map(conv => (
                    <label
                      key={conv.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                        ${selectedConversations.includes(conv.id)
                          ? 'bg-primary-600/10 border border-primary-500/30'
                          : 'bg-dark-800/30 border border-transparent hover:border-dark-700'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={selectedConversations.includes(conv.id)}
                        onChange={() => toggleSelection(conv.id)}
                        className="w-4 h-4 rounded bg-dark-700 border-dark-600 text-primary-500 focus:ring-primary-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-200 truncate">{conv.title}</p>
                        <p className="text-[11px] text-dark-500">
                          {conv.messages.length} messages • {new Date(conv.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {conv.id === activeConversationId && (
                        <span className="text-[10px] px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full">
                          Active
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {conversations.length === 0 && (
                  <div className="text-center py-8 text-dark-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No conversations to export</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {(targetConversations.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Preview</label>
                  <div className="p-4 bg-dark-950 rounded-xl border border-dark-800 max-h-32 overflow-auto custom-scrollbar">
                    <pre className="text-xs text-dark-400 font-mono whitespace-pre-wrap break-all">
                      {generateExportContent().slice(0, 500)}...
                    </pre>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={targetConversations.length === 0}
                className={`
                  w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all
                  ${exportSuccess
                    ? 'bg-emerald-600 text-white'
                    : targetConversations.length > 0
                    ? 'btn-primary'
                    : 'bg-dark-800 text-dark-500 cursor-not-allowed'
                  }
                `}
              >
                {exportSuccess ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Downloaded Successfully!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Export ({targetConversations.length} conversations • {exportFormat.toUpperCase()})
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Import Tab */
            <div className="space-y-5">
              {/* Upload File */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-3">Upload File</label>
                
                <label className={`
                  flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl cursor-pointer
                  transition-all duration-200 group
                  ${importPreview
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-dark-700 hover:border-dark-500 hover:bg-dark-800/30'
                  }
                `}>
                  <input
                    type="file"
                    accept=".json,.md,.txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className={`p-4 rounded-xl mb-3 ${importPreview ? 'bg-emerald-500/10' : 'bg-dark-800/80'} group-hover:scale-110 transition-transform`}>
                    {importPreview ? (
                      <svg className="w-8 h-8 text-emerald-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-dark-400 group-hover:text-primary-400 transition-colors mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>

                  <p className="text-sm text-dark-300 mb-1">
                    {importPreview ? 'File loaded!' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-dark-500">Supports JSON, Markdown, TXT, CSV</p>
                </label>
              </div>

              {/* Or paste */}
              <div className="relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-dark-700 to-transparent"></div>
                
                <p className="text-center text-xs text-dark-500 my-4 relative">
                  <span className="bg-dark-900 px-3">or paste content below</span>
                </p>
              </div>

              <textarea
                value={importPreview}
                onChange={handleImportChange}
                placeholder="Paste your JSON export or chat content here..."
                rows={8}
                className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none custom-scrollbar font-mono"
              />

              {/* Error Message */}
              {importError && (
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-400">{importError}</p>
                </div>
              )}

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={!importPreview.trim()}
                className={`
                  w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all
                  ${!importPreview.trim()
                    ? 'bg-dark-800 text-dark-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/25'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import Conversations
              </button>

              {/* Tips */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300 font-medium mb-2">💡 Import Tips:</p>
                <ul className="text-xs text-blue-200/70 space-y-1 list-disc list-inside">
                  <li>JSON export preserves full message structure</li>
                  <li>Text format uses [You] and [AI] prefixes</li>
                  <li>Duplicates will not overwrite existing chats</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800 bg-dark-900/50 flex justify-between items-center">
          <p className="text-xs text-dark-500">
            {targetConversations.length} conversation(s) selected
          </p>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for using conversation manager
export function useConversationManager() {
  const [isOpen, setIsOpen] = React.useState(false);

  return { isOpen, setIsOpen };
}
