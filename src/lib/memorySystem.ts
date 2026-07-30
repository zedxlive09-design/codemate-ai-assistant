/**
 * Memory System Coordinator for CodeMate AI
 * 
 * This module coordinates all memory-related functionality:
 * - Project instructions (CODEMATE.md)
 * - Skills (SKILLS.md, .codemate/skills/)
 * - Auto-learned memories
 * - User preferences
 * 
 * It provides a unified API for accessing all project context.
 */

import { exists, mkdir } from '@tauri-apps/plugin-fs';
import type {
  ProjectContext,
  CodeMateInstructions,
  SkillDefinition,
  MemoryEntry,
  UserPreferences,
} from './projectMemory';

import * as projectMemory from './projectMemory';
import * as skillsParser from './skillsParser';
import * as autoMemory from './autoMemory';

// ============================================================
// TYPES
// ============================================================

export interface MemorySystemConfig {
  /** Root path of the project */
  projectPath: string;
  /** Whether to auto-create CODEMATE.md if missing */
  autoCreateInstructions: boolean;
  /** Whether to enable learning */
  enableLearning: boolean;
}

export interface MemorySystemStatus {
  /** Whether system is initialized */
  initialized: boolean;
  /** Whether CODEMATE.md exists */
  hasCodeMate: boolean;
  /** Number of custom skills loaded */
  customSkillsCount: number;
  /** Number of stored memories */
  memoriesCount: number;
  /** Last time context was refreshed */
  lastRefresh: Date | null;
}

export interface ContextQueryOptions {
  /** Maximum approximate tokens for context */
  maxTokens?: number;
  /** Include instructions? */
  includeInstructions?: boolean;
  /** Include skills? */
  includeSkills?: boolean;
  /** Include memories? */
  includeMemories?: boolean;
  /** Include preferences? */
  includePreferences?: boolean;
  /** Filter memories by relevance to this query */
  relevantTo?: string;
}

// ============================================================
// MEMORY SYSTEM CLASS
// ============================================================

export class MemorySystem {
  private projectPath: string;
  private config: MemorySystemConfig;
  
  // Cached data
  private _instructions: CodeMateInstructions | null = null;
  private _skills: SkillDefinition[] = [];
  private _memories: MemoryEntry[] = [];
  private _preferences: UserPreferences = { ...projectMemory.DEFAULT_PREFERENCES };
  private _initialized = false;
  private _lastRefresh: Date | null = null;
  
  constructor(config: MemorySystemConfig) {
    this.projectPath = config.projectPath;
    this.config = config;
  }
  
  /**
   * Initialize the memory system for a project
   */
  async initialize(): Promise<MemorySystemStatus> {
    try {
      // Ensure .codemate directory structure exists
      const codemateDir = `${this.projectPath}/.codemate`;
      
      if (!await exists(codemateDir)) {
        await mkdir(codemateDir, { recursive: true });
        await mkdir(`${codemateDir}/skills`, { recursive: true });
        await mkdir(`${codemateDir}/memory`, { recursive: true });
        await mkdir(`${codemateDir}/agents`, { recursive: true });
      }
      
      // Initialize auto-memory system
      await autoMemory.initializeMemory(this.projectPath);
      
      // Auto-create CODEMATE.md if enabled and doesn't exist
      if (this.config.autoCreateInstructions) {
        const hasCodeMate = await projectMemory.codeMateExists(this.projectPath);
        if (!hasCodeMate) {
          await projectMemory.createDefaultCodeMate(this.projectPath);
        }
      }
      
      // Load everything
      await this.refresh();
      
      this._initialized = true;
      return this.getStatus();
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      return this.getStatus();
    }
  }
  
  /**
   * Refresh all cached data from disk
   */
  async refresh(): Promise<void> {
    try {
      // Load in parallel for speed
      const [instructions, skills, memories, preferences] = await Promise.all([
        projectMemory.readCodeMateFile(this.projectPath),
        skillsParser.getAllSkills(this.projectPath),
        autoMemory.loadMemories(this.projectPath),
        autoMemory.loadUserPreferences(this.projectPath),
      ]);
      
      this._instructions = instructions;
      this._skills = skills;
      this._memories = memories;
      this._preferences = preferences;
      this._lastRefresh = new Date();
    } catch (error) {
      console.error('Failed to refresh memory:', error);
    }
  }
  
  /**
   * Get complete project context
   */
  getProjectContext(): ProjectContext {
    return {
      projectRoot: this.projectPath,
      instructions: this._instructions,
      activeSkills: this._skills,
      memories: this._memories,
      preferences: this._preferences,
    };
  }
  
  /**
   * Build prompt context string for inclusion in system prompt
   */
  buildPromptContext(options?: ContextQueryOptions): string {
    const opts = {
      maxTokens: 2000,
      includeInstructions: true,
      includeSkills: true,
      includeMemories: true,
      includePreferences: true,
      ...options,
    };
    
    let contextParts: string[] = [];
    
    // 1. Instructions (CODEMATE.md)
    if (opts.includeInstructions && this._instructions) {
      const instructionText = projectMemory.buildPromptContext(
        { ...this.getProjectContext(), activeSkills: [], memories: [], preferences: { ...projectMemory.DEFAULT_PREFERENCES } },
        opts.maxTokens ? Math.floor(opts.maxTokens * 0.4) : 800
      );
      if (instructionText) {
        contextParts.push(instructionText);
      }
    }
    
    // 2. Active Skills summary
    if (opts.includeSkills && this._skills.length > 0) {
      const builtinCount = skillsParser.BUILTIN_SKILLS.length;
      const customSkills = this._skills.slice(builtinCount);
      
      let skillsText = `## Available Skills (${this._skills.length} total)\n\n`;
      skillsText += `### Built-in Skills\n`;
      skillsText += skillsParser.BUILTIN_SKILLS.map(s => 
        `- **${s.name}**: ${s.description}`
      ).join('\n');
      
      if (customSkills.length > 0) {
        skillsText += `\n\n### Custom Skills\n`;
        skillsText += customSkills.map(s => 
          `- **${s.name}**: ${s.description}`
        ).join('\n');
      }
      
      contextParts.push(skillsText);
    }
    
    // 3. Relevant Memories
    if (opts.includeMemories && this._memories.length > 0) {
      let memoriesToShow = this._memories;
      
      // If we have a query, find most relevant
      if (opts.relevantTo) {
        // Simple relevance scoring
        const query = opts.relevantTo.toLowerCase();
        memoriesToShow = [...this._memories]
          .map(m => ({
            memory: m,
            score: this.scoreRelevance(m, query),
          }))
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 15)
          .map(s => s.memory);
      } else {
        // Just take most recent/accessed
        memoriesToShow = [...this._memories]
          .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
          .slice(0, 15);
      }
      
      if (memoriesToShow.length > 0) {
        const memText = memoriesToShow.map(m => {
          const icon = this.getMemoryIcon(m.type);
          return `${icon} **[${m.type.toUpperCase()}] ${m.title}**\n   ${m.content.slice(0, 150)}${m.content.length > 150 ? '...' : ''}`;
        }).join('\n\n');
        
        contextParts.push(`## Project Memory & Learning\n\n${memText}`);
      }
    }
    
    // 4. User Preferences
    if (opts.includePreferences) {
      const prefs = this._preferences;
      const prefLines: string[] = [];
      
      if (prefs.language !== 'auto') {
        prefLines.push(`- **Language**: Respond in ${prefs.language === 'ur' ? 'Urdu' : 'English'}`);
      }
      if (prefs.preferUrduExplanations) {
        prefLines.push(`- **Urdu Mode**: Use Urdu for explanations when user writes in Urdu`);
      }
      prefLines.push(`- **Verbosity**: ${prefs.verbosity}/5 (${this.getVerbosityLabel(prefs.verbosity)})`);
      prefLines.push(`- **Code Style**: ${prefs.codeStyle}`);
      if (prefs.techStack.length > 0) {
        prefLines.push(`- **Tech Stack**: ${prefs.techStack.join(', ')}`);
      }
      
      if (prefLines.length > 1 || prefs.techStack.length > 0) { // More than just verbosity
        contextParts.push(`## Learned User Preferences\n\n${prefLines.join('\n')}`);
      }
    }
    
    if (contextParts.length === 0) {
      return '';
    }
    
    return `\n<!-- CodeMate Project Context -->\n${contextParts.join('\n\n')}\n<!-- End Context -->`;
  }
  
  /**
   * Learn from an interaction
   */
  async learnFromInteraction(context: autoMemory.InteractionContext): Promise<MemoryEntry[]> {
    if (!this.config.enableLearning) {
      return [];
    }
    
    const newMemories = await autoMemory.learnFromInteraction(this.projectPath, context);
    
    // Refresh memories cache
    await this.refresh();
    
    return newMemories;
  }
  
  /**
   * Find relevant memories for a query
   */
  async findRelevantMemories(query: string, limit?: number): Promise<MemoryEntry[]> {
    return autoMemory.findRelevantMemories(this.projectPath, query, limit);
  }
  
  /**
   * Add a manual memory entry
   */
  async addMemory(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed' | 'accessCount'>): Promise<MemoryEntry> {
    const newMemory = await autoMemory.saveMemory(this.projectPath, memory);
    await this.refresh();
    return newMemory;
  }
  
  /**
   * Delete a memory entry
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const result = await autoMemory.deleteMemory(this.projectPath, memoryId);
    await this.refresh();
    return result;
  }
  
  /**
   * Update user preferences
   */
  async updatePreferences(prefs: Partial<UserPreferences>): Promise<void> {
    await autoMemory.saveUserPreferences(this.projectPath, prefs);
    this._preferences = { ...this._preferences, ...prefs };
  }
  
  /**
   * Get current status
   */
  getStatus(): MemorySystemStatus {
    return {
      initialized: this._initialized,
      hasCodeMate: this._instructions !== null,
      customSkillsCount: this._skills.filter(s => s.id.startsWith('custom-')).length,
      memoriesCount: this._memories.length,
      lastRefresh: this._lastRefresh,
    };
  }
  
  /**
   * Get the matching skill for a message
   */
  getMatchingSkill(message: string): skillsParser.SkillMatch | null {
    return skillsParser.getPrimarySkill(message, this._skills);
  }
  
  // ============================================================
  // PRIVATE HELPERS
  // ============================================================
  
  private scoreRelevance(memory: MemoryEntry, query: string): number {
    let score = 0;
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    
    // Title matches
    const lowerTitle = memory.title.toLowerCase();
    for (const word of queryWords) {
      if (lowerTitle.includes(word)) score += 2;
    }
    
    // Content matches
    const lowerContent = memory.content.toLowerCase();
    for (const word of queryWords) {
      if (lowerContent.includes(word)) score += 1;
    }
    
    // Tag matches
    for (const tag of memory.tags) {
      if (queryWords.includes(tag.toLowerCase())) score += 1.5;
    }
    
    // Recency boost
    const hoursSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60);
    if (hoursSinceAccess < 24) score += 0.5;
    
    return score;
  }
  
  private getMemoryIcon(type: MemoryEntry['type']): string {
    switch (type) {
      case 'decision': return '📋';
      case 'preference': return '⚙️';
      case 'pattern': return '🔄';
      case 'convention': return '📐';
      case 'error': return '🐛';
      case 'fact': return '💡';
      default: return '📝';
    }
  }
  
  private getVerbosityLabel(level: number): string {
    switch (level) {
      case 1: return 'Very concise';
      case 2: return 'Concise';
      case 3: return 'Balanced';
      case 4: return 'Detailed';
      case 5: return 'Very detailed';
      default: return 'Balanced';
    }
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

let instance: MemorySystem | null = null;

/**
 * Get or create the MemorySystem singleton for a project
 */
export async function getMemorySystem(
  projectPath: string,
  options?: Partial<MemorySystemConfig>
): Promise<MemorySystem> {
  if (!instance || instance['projectPath'] !== projectPath) {
    instance = new MemorySystem({
      projectPath,
      autoCreateInstructions: false,
      enableLearning: true,
      ...options,
    });
    
    await instance.initialize();
  }
  
  return instance;
}

/**
 * Reset the singleton (useful when switching projects)
 */
export function resetMemorySystem(): void {
  instance = null;
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  MemorySystem,
  getMemorySystem,
  resetMemorySystem,
};
