import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface ConversationManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationManager({ isOpen, onClose }: ConversationManagerProps) {
  const { conversations, activeConversationId, addConversationBatch } = useStore();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('json');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  };

  // Export selected or current conversation
  const handleExport = async () => {
    try {
      const idsToExport = selectedIds.size > 0 
        ? Array.from(selectedIds)
        : activeConversationId 
          ? [activeConversationId]
          : [];

      if (idsToExport.length === 0) {
        showToast('No conversation selected to export', 'warning');
        return;
      }

      const conversationsToExport = conversations.filter(c => idsToExport.includes(c.id));

      if (exportFormat === 'json') {
        await exportAsJSON(conversationsToExport);
      } else {
        await exportAsMarkdown(conversationsToExport);
      }

      showToast(`Exported ${idsToExport.length} conversation(s) successfully!`, 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export conversations', 'error');
    }
  };

  // Export as JSON
  const exportAsJSON = async (convs: typeof conversations) => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      app: 'CodeMate AI Assistant',
      conversations: convs.map(c => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messages: c.messages,
        messageCount: c.messages.length,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `codemate-export-${Date.now()}.json`);
  };

  // Export as Markdown
  const exportAsMarkdown = async (convs: typeof conversations) => {
    let markdown = `# CodeMate AI Assistant - Conversation Export\n\n`;
    markdown += `> Exported on ${new Date().toLocaleDateString()}\n\n---\n\n`;

    for (const conv of convs) {
      markdown += `## ${conv.title}\n\n`;
      markdown += `*Created: ${new Date(conv.createdAt).toLocaleString()}*\n\n`;

      for (const msg of conv.messages) {
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **AI Assistant**';
        markdown += `### ${role}\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += `---\n\n`;
      }

      markdown += `\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadBlob(blob, `codemate-export-${Date.now()}.md`);
  };

  // Download helper
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import handler
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        
        if (!data.conversations || !Array.isArray(data.conversations)) {
          throw new Error('Invalid format: missing conversations array');
        }

        // Convert imported data to our format
        const importedConversations = data.conversations.map((c: Record<string, unknown>) => ({
          id: c.id as string || crypto.randomUUID(),
          title: (c.title as string) || 'Imported Chat',
          messages: (c.messages as Array<{role: string; content: string}>) || [],
          createdAt: c.createdAt ? new Date(c.createdAt as string) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt as string) : new Date(),
        }));

        addConversationBatch(importedConversations);
        showToast(`Successfully imported ${importedConversations.length} conversation(s)!`, 'success');
      } else {
        showToast('Only JSON files are supported for import', 'warning');
      }
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Failed to import: Invalid file format', 'error');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleImport({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    } else {
      showToast('Please drop a JSON file (.json)', 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700/80 shadow-2xl shadow-black/40 scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-sm">
                📦
              </span>
              Conversation Manager
            </h2>
            <p className="text-sm text-dark-400 mt-1">Export or import your chat history</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-6 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
              <div className="text-2xl font-bold text-primary-400">{conversations.length}</div>
              <div className="text-xs text-dark-400 mt-1">Total Conversations</div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
              <div className="text-2xl font-bold text-emerald-400">
                {conversations.reduce((acc, c) => acc + c.messages.length, 0)}
              </div>
              <div className="text-xs text-dark-400 mt-1">Total Messages</div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-dark-700/50">
              <div className="text-2xl font-bold text-purple-400">{selectedIds.size}</div>
              <div className="text-xs text-dark-400 mt-1">Selected</div>
            </div>
          </div>

          {/* Export Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-dark-300 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export Conversations
            </h3>

            {/* Format Selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setExportFormat('json')}
                className={`flex-1 py-3 px-4 rounded-xl border transition-all duration-200 ${
                  exportFormat === 'json'
                    ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:border-dark-600'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">{}</span>
                  <div className="text-left">
                    <div className="font-medium text-sm">JSON Format</div>
                    <div className="text-xs opacity-70">Full data with metadata</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setExportFormat('markdown')}
                className={`flex-1 py-3 px-4 rounded-xl border transition-all duration-200 ${
                  exportFormat === 'markdown'
                    ? 'bg-primary-500/15 border-primary-500/50 text-primary-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:border-dark-600'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">📝</span>
                  <div className="text-left">
                    <div className="font-medium text-sm">Markdown</div>
                    <div className="text-xs opacity-70">Readable document</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Conversation List for Selection */}
            <div className="bg-dark-800/30 rounded-xl border border-dark-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-dark-800/50 border-b border-dark-700/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === conversations.length && conversations.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-dark-600 text-primary-500 focus:ring-primary-500/20"
                  />
                  <span className="text-sm text-dark-300">Select All</span>
                </label>
                <span className="text-xs text-dark-500">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select conversations to export'}
                </span>
              </div>
              
              <div className="max-h-48 overflow-y-auto divide-y divide-dark-800/50">
                {conversations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-dark-500">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <label
                      key={conv.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-dark-800/30 transition-colors ${
                        conv.id === activeConversationId ? 'bg-primary-500/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(conv.id)}
                        onChange={() => toggleSelection(conv.id)}
                        className="rounded border-dark-600 text-primary-500 focus:ring-primary-500/20"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-dark-200 truncate">{conv.title}</div>
                        <div className="text-xs text-dark-500">
                          {conv.messages.length} messages • {new Date(conv.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {conv.id === activeConversationId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                          Active
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={conversations.length === 0}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Active'} Conversation{selectedIds.size > 1 || (!selectedIds.size && conversations.length !== 1) ? 's' : ''}
            </button>
          </div>

          {/* Divider */}
          <div className="divider"><span>or</span></div>

          {/* Import Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-dark-300 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Conversations
            </h3>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? 'border-primary-500 bg-primary-500/10 scale-[1.02]'
                  : 'border-dark-700 hover:border-dark-600 bg-dark-800/20'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              
              <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <svg className={`w-8 h-8 text-purple-400 ${isDragging ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <p className="text-dark-200 font-medium mb-1">
                  {isDragging ? 'Drop your JSON file here' : 'Click to browse or drag & drop'}
                </p>
                <p className="text-sm text-dark-500">
                  Supports CodeMate JSON export files (.json)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-800 bg-dark-850/50">
          <p className="text-xs text-dark-500">
            💡 Tip: Export regularly to backup your conversations
          </p>
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
