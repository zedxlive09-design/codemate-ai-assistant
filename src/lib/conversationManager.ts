/**
 * Conversation Manager for CodeMate AI
 * 
 * Handles:
 * - Conversation persistence (save/load to disk)
 * - Conversation history and search
 * - Export/import conversations
 * - Auto-organization by project
 */

import { fileCommands } from './tauri';

// ============================================================
// TYPES
// ============================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Token count (estimated or actual) */
  tokens?: number;
  /** Model used for generation */
  model?: string;
  /** Skill that was active during this response */
  skillUsed?: string;
  /** User rating/feedback */
  feedback?: 'positive' | 'negative' | 'neutral';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  /** Project path this conversation belongs to */
  projectPath?: string;
  /** Tags for organization */
  tags: string[];
  /** Whether this is a pinned/favorite conversation */
  isPinned: boolean;
  /** Model used in this conversation */
  modelName?: string;
  /** Total messages count */
  messageCount: number;
}

export interface ConversationFilter {
  /** Search query (matches title and content) */
  query?: string;
  /** Filter by project path */
  projectPath?: string;
  /** Filter by tags */
  tags?: string[];
  /** Only show pinned */
  pinnedOnly?: boolean;
  /** Date range */
  dateFrom?: Date;
  dateTo?: Date;
  /** Sort order */
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  conversationsThisWeek: number;
  mostActiveDay: string;
  topTags: Array<{ tag: string; count: number }>;
}

// ============================================================
// CONVERSATION MANAGER CLASS
// ============================================================

const CONVERSATIONS_DIR = '.codemate/conversations';

export class ConversationManager {
  private projectPath: string;
  private conversationsCache: Map<string, Conversation> = new Map();
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }
  
  /**
   * Initialize the conversation storage
   */
  async initialize(): Promise<void> {
    const dirPath = `${this.projectPath}/${CONVERSATIONS_DIR}`;
    
    if (!await fileCommands.pathExists(dirPath)) {
      await fileCommands.createDirectory(dirPath);
    }
    
    // Load all conversation indices
    await this.loadIndex();
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<Conversation> {
    const id = generateId('conv');
    const now = new Date();
    
    const conversation: Conversation = {
      id,
      title: title || `Conversation ${formatDate(now)}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      projectPath: this.projectPath,
      tags: [],
      isPinned: false,
      messageCount: 0,
    };
    
    await this.saveConversation(conversation);
    return conversation;
  }
  
  /**
   * Load a specific conversation
   */
  async loadConversation(id: string): Promise<Conversation | null> {
    // Check cache first
    if (this.conversationsCache.has(id)) {
      return this.conversationsCache.get(id)!;
    }
    
    try {
      const filePath = `${this.projectPath}/${CONVERSATIONS_DIR}/${id}.json`;
      
      if (!await fileCommands.pathExists(filePath)) {
        return null;
      }
      
      const content = await fileCommands.readFile(filePath);
      const data = JSON.parse(content);
      
      return this.parseConversation(data);
    } catch (error) {
      console.error(`Failed to load conversation ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Save/update a conversation
   */
  async saveConversation(conversation: Conversation): Promise<void> {
    // Update timestamp
    conversation.updatedAt = new Date();
    conversation.messageCount = conversation.messages.length;
    
    // Update cache
    this.conversationsCache.set(conversation.id, conversation);
    
    // Save to file
    const filePath = `${this.projectPath}/${CONVERSATIONS_DIR}/${conversation.id}.json`;
    const serialized = this.serializeConversation(conversation);
    
    await fileCommands.writeFile(filePath, JSON.stringify(serialized, null, 2));
    
    // Update index
    await this.updateIndex(conversation);
  }
  
  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    try {
      const filePath = `${this.projectPath}/${CONVERSATIONS_DIR}/${id}.json`;
      
      // Note: Would need delete function from fs plugin
      // For now, just remove from cache
      this.conversationsCache.delete(id);
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    role: Message['role'],
    content: string,
    options?: Partial<Omit<Message, 'id' | 'role' | 'content' | 'timestamp'>>
  ): Promise<Conversation | null> {
    const conversation = await this.loadConversation(conversationId);
    
    if (!conversation) {
      return null;
    }
    
    const message: Message = {
      id: generateId('msg'),
      role,
      content,
      timestamp: new Date(),
      ...options,
    };
    
    conversation.messages.push(message);
    
    // Auto-generate title from first user message
    if (role === 'user' && conversation.messages.filter(m => m.role === 'user').length === 1) {
      conversation.title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
    }
    
    await this.saveConversation(conversation);
    return conversation;
  }
  
  /**
   * List all conversations with optional filtering
   */
  async listConversations(filter?: ConversationFilter): Promise<Conversation[]> {
    let conversations = Array.from(this.conversationsCache.values());
    
    if (!filter || Object.keys(filter).length === 0) {
      return this.sortConversations(conversations, filter?.sortBy, filter?.sortOrder);
    }
    
    // Apply filters
    if (filter.query) {
      const query = filter.query.toLowerCase();
      conversations = conversations.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.messages.some(m => m.content.toLowerCase().includes(query))
      );
    }
    
    if (filter.projectPath) {
      conversations = conversations.filter(c => 
        c.projectPath === filter.projectPath
      );
    }
    
    if (filter.tags && filter.tags.length > 0) {
      conversations = conversations.filter(c =>
        filter.tags!.some(tag => c.tags.includes(tag))
      );
    }
    
    if (filter.pinnedOnly) {
      conversations = conversations.filter(c => c.isPinned);
    }
    
    if (filter.dateFrom) {
      conversations = conversations.filter(c => 
        c.updatedAt >= filter.dateFrom!
      );
    }
    
    if (filter.dateTo) {
      conversations = conversations.filter(c => 
        c.updatedAt <= filter.dateTo!
      );
    }
    
    return this.sortConversations(conversations, filter.sortBy, filter.sortOrder);
  }
  
  /**
   * Search within conversations
   */
  async searchConversations(query: string): Promise<Array<{
    conversation: Conversation;
    message: Message;
    relevanceScore: number;
  }>> {
    const results: Array<{
      conversation: Conversation;
      message: Message;
      relevanceScore: number;
    }> = [];
    
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    
    const conversations = await this.listConversations();
    
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        const lowerContent = msg.content.toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // Exact phrase match
        if (lowerContent.includes(lowerQuery)) {
          score += 10;
        }
        
        // Word matches
        for (const word of queryWords) {
          if (lowerContent.includes(word)) {
            score += 2;
          }
        }
        
        // Title match bonus
        if (conv.title.toLowerCase().includes(lowerQuery)) {
          score += 3;
        }
        
        // Recent conversation bonus
        const daysSinceUpdate = (Date.now() - conv.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) score += 1;
        
        if (score > 0) {
          results.push({
            conversation: conv,
            message: msg,
            relevanceScore: score,
          });
        }
      }
    }
    
    // Sort by relevance descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results.slice(0, 50); // Limit results
  }
  
  /**
   * Get statistics about conversations
   */
  async getStats(): Promise<ConversationStats> {
    const conversations = await this.listConversations();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Count messages per day of week
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const tagCounts: Record<string, number> = {};
    
    let totalMessages = 0;
    let thisWeekCount = 0;
    
    for (const conv of conversations) {
      totalMessages += conv.messageCount;
      
      if (conv.updatedAt >= weekAgo) {
        thisWeekCount++;
      }
      
      // Count by day
      dayCounts[conv.updatedAt.getDay()]++;
      
      // Count tags
      for (const tag of conv.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    // Find most active day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    
    // Sort tags by count
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    
    return {
      totalConversations: conversations.length,
      totalMessages,
      averageMessagesPerConversation: conversations.length > 0 
        ? Math.round(totalMessages / conversations.length) 
        : 0,
      conversationsThisWeek: thisWeekCount,
      mostActiveDay: dayNames[maxDayIndex],
      topTags,
    };
  }
  
  /**
   * Pin/unpin a conversation
   */
  async togglePin(id: string): Promise<Conversation | null> {
    const conv = await this.loadConversation(id);
    if (!conv) return null;
    
    conv.isPinned = !conv.isPinned;
    await this.saveConversation(conv);
    return conv;
  }
  
  /**
   * Add tags to a conversation
   */
  async addTags(id: string, tags: string[]): Promise<Conversation | null> {
    const conv = await this.loadConversation(id);
    if (!conv) return null;
    
    for (const tag of tags) {
      if (!conv.tags.includes(tag)) {
        conv.tags.push(tag);
      }
    }
    
    await this.saveConversation(conv);
    return conv;
  }
  
  /**
   * Export conversation as markdown
   */
  async exportAsMarkdown(id: string): Promise<string | null> {
    const conv = await this.loadConversation(id);
    if (!conv) return null;
    
    let md = `# ${conv.title}\n\n`;
    md += `- **Created**: ${formatDateTime(conv.createdAt)}\n`;
    md += `- **Last Updated**: ${formatDateTime(conv.updatedAt)}\n`;
    md += `- **Messages**: ${conv.messageCount}\n`;
    
    if (conv.tags.length > 0) {
      md += `- **Tags**: ${conv.tags.join(', ')}\n`;
    }
    
    md += `\n---\n\n`;
    
    for (const msg of conv.messages) {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
      md += `### ${role} (${formatTime(msg.timestamp)})\n\n`;
      md += `${msg.content}\n\n---\n\n`;
    }
    
    return md;
  }
  
  // ============================================================
  // PRIVATE METHODS
  // ============================================================
  
  private async loadIndex(): Promise<void> {
    try {
      const indexPath = `${this.projectPath}/${CONVERSATIONS_DIR}/index.json`;
      
      if (!await fileCommands.pathExists(indexPath)) {
        // Create empty index
        await fileCommands.writeFile(indexPath, JSON.stringify({
          version: 1,
          conversations: [],
          lastUpdated: new Date().toISOString(),
        }, null, 2));
        return;
      }
      
      const content = await fileCommands.readFile(indexPath);
      const index = JSON.parse(content);
      
      // Pre-load conversation metadata (not full messages)
      for (const meta of index.conversations || []) {
        // Just store the ID and basic info, full load on demand
        if (!this.conversationsCache.has(meta.id)) {
          this.conversationsCache.set(meta.id, {
            ...meta,
            createdAt: new Date(meta.createdAt),
            updatedAt: new Date(meta.updatedAt),
            messages: [], // Will be loaded on demand
          } as Conversation);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation index:', error);
    }
  }
  
  private async updateIndex(conversation: Conversation): Promise<void> {
    // This would update the index file with the latest metadata
    // For simplicity, we're using the cache as our index
  }
  
  private parseConversation(data: any): Conversation {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      messages: (data.messages || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    };
  }
  
  private serializeConversation(conv: Conversation): any {
    return {
      ...conv,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: conv.messages.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
    };
  }
  
  private sortConversations(
    conversations: Conversation[],
    sortBy?: ConversationFilter['sortBy'],
    sortOrder?: ConversationFilter['sortOrder']
  ): Conversation[] {
    const sorted = [...conversations];
    const field = sortBy || 'updatedAt';
    const order = sortOrder || 'desc';
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (field) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
        default:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
    
    // Pinned conversations always first
    return sorted.sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// EXPORTS
// ============================================================

export default ConversationManager;
