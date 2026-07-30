/**
 * Conversation Export/Import Utilities
 * 
 * Provides functionality to export conversations as JSON or Markdown
 * and import them back into the application.
 */

import type { Conversation, Message } from '../types';

// ============================================================================
// EXPORT FORMATS
// ============================================================================

/// Export data structure for JSON format
export interface ConversationExport {
  version: string;
  exportDate: string;
  appInfo: {
    name: string;
    version: string;
  };
  conversations: ExportedConversation[];
}

/// Single exported conversation
export interface ExportedConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: ExportedMessage[];
}

/// Single exported message
export interface ExportedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: Array<{
    name: string;
    path: string;
    size: number;
  }>;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export conversations to JSON format
 */
export function exportConversationsToJson(conversations: Conversation[]): string {
  const exportData: ConversationExport = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    appInfo: {
      name: 'CodeMate AI Assistant',
      version: '1.0.0',
    },
    conversations: conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt instanceof Date 
        ? conv.createdAt.toISOString() 
        : new Date(conv.createdAt).toISOString(),
      updatedAt: conv.updatedAt instanceof Date 
        ? conv.updatedAt.toISOString() 
        : new Date(conv.updatedAt).toISOString(),
      messageCount: conv.messages.length,
      messages: conv.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp.toISOString() 
          : new Date(msg.timestamp).toISOString(),
        files: msg.files?.map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
        })),
      })),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export single conversation to Markdown format
 */
export function exportConversationToMarkdown(conversation: Conversation): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push(`**Exported from:** CodeMate AI Assistant`);
  lines.push(`**Date:** ${new Date().toLocaleDateString()}`);
  lines.push(`**Messages:** ${conversation.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const message of conversation.messages) {
    const roleLabel = message.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
    const timeStr = message.timestamp instanceof Date 
      ? message.timestamp.toLocaleTimeString()
      : new Date(message.timestamp).toLocaleTimeString();
    
    lines.push(`${roleLabel} (${timeStr})`);
    lines.push('');
    lines.push(message.content);
    lines.push('');

    // Attached files
    if (message.files && message.files.length > 0) {
      lines.push('*Attachments:*');
      for (const file of message.files) {
        lines.push(`- \`${file.name}\` (${formatFileSize(file.size)})`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export all conversations to Markdown (one file with all conversations)
 */
export function exportAllConversationsToMarkdown(conversations: Conversation[]): string {
  const lines: string[] = [];
  
  lines.push('# CodeMate AI Assistant - Conversations Export');
  lines.push('');
  lines.push(`**Export Date:** ${new Date().toLocaleString()}`);
  lines.push(`**Total Conversations:** ${conversations.length}`);
  lines.push('---');
  lines.push('');

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    
    lines.push(`## ${i + 1}. ${conv.title}`);
    lines.push('');
    lines.push(`- **ID:** ${conv.id}`);
    lines.push(`- **Created:** ${conv.createdAt instanceof Date ? conv.createdAt.toLocaleDateString() : new Date(conv.createdAt).toLocaleDateString()}`);
    lines.push(`- **Messages:** ${conv.messages.length}`);
    lines.push('');
    lines.push('### Messages');
    lines.push('');

    for (const message of conv.messages) {
      const roleLabel = message.role === 'user' ? '👤' : '🤖';
      lines.push(`**${roleLabel}**: ${message.content.slice(0, 100)}${message.content.length > 100 ? '...' : ''}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Import conversations from JSON export
 */
export function importConversationsFromJson(jsonString: string): Conversation[] {
  try {
    const data = JSON.parse(jsonString) as ConversationExport;
    
    if (!data.conversations || !Array.isArray(data.conversations)) {
      throw new Error('Invalid export format: missing conversations array');
    }

    return data.conversations.map(conv => ({
      id: conv.id || crypto.randomUUID(),
      title: conv.title || 'Imported Conversation',
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: (conv.messages || []).map(msg => ({
        id: crypto.randomUUID(),
        role: msg.role as Message['role'],
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        files: (msg.files || []).map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
        })),
      })),
      projectPath: undefined,
    }));
  } catch (e) {
    throw new Error(`Failed to import conversations: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Validate if a JSON string is a valid CodeMate export
 */
export function validateExportJson(jsonString: string): { valid: boolean; error?: string; count?: number } {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.version) {
      return { valid: false, error: 'Missing version field' };
    }
    
    if (!Array.isArray(data.conversations)) {
      return { valid: false, error: 'Missing or invalid conversations array' };
    }

    return { valid: true, count: data.conversations.length };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Download a string as a file (browser/Tauri)
 */
export async function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): Promise<void> {
  // Try Tauri file system first
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    
    const path = await save({ defaultName: filename });
    if (path) {
      await writeTextFile(path, content);
      return;
    }
  } catch {
    // Fall back to browser download
  }
  
  // Browser fallback
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file content (Tauri or browser)
 */
export async function readFileContent(accept?: string): Promise<string | null> {
  // Try Tauri first
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    
    const selected = await open({
      multiple: false,
      filters: accept ? [{ name: 'Files', extensions: [accept] }] : undefined,
    });
    
    if (selected && typeof selected === 'string') {
      return await readTextFile(selected);
    }
  } catch {
    // Fall back to browser
  }
  
  // Browser fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      } else {
        resolve(null);
      }
    };
    input.click();
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
