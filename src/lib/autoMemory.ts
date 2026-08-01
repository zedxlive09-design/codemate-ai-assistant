/**
 * Auto-Memory System for CodeMate AI
 * 
 * This module provides automatic learning and memory capabilities:
 * - Learns user preferences from interactions
 * - Remembers project-specific patterns
 * - Tracks architecture decisions
 * - Builds contextual knowledge over time
 * 
 * Memory is stored in .codemate/memory/ directory as markdown files.
 */

import { fileCommands } from './tauri';
import type { MemoryEntry, UserPreferences, ProjectContext } from './projectMemory';
import { DEFAULT_PREFERENCES } from './projectMemory';

// ============================================================
// TYPES
// ============================================================

export interface MemoryConfig {
  /** Maximum number of memories to keep */
  maxMemories: number;
  /** Whether auto-learning is enabled */
  autoLearn: boolean;
  /** What types of things to learn */
  learnPreferences: boolean;
  learnPatterns: boolean;
  learnDecisions: boolean;
}

export interface InteractionContext {
  /** The user's message */
  userMessage: string;
  /** The AI's response */
  aiResponse: string;
  /** Timestamp of interaction */
  timestamp: Date;
  /** Which skill was used (if any) */
  usedSkill?: string;
  /** Files referenced in this interaction */
  filesReferenced?: string[];
  /** User feedback on response (if any) */
  feedback?: 'positive' | 'negative' | 'neutral';
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxMemories: 500,
  autoLearn: true,
  learnPreferences: true,
  learnPatterns: true,
  learnDecisions: true,
};

// ============================================================
// MEMORY STORAGE
// ============================================================

const MEMORY_DIR = '.codemate/memory';
const MEMORY_INDEX_FILE = `${MEMORY_DIR}/index.json`;
const PREFERENCES_FILE = `${MEMORY_DIR}/preferences.json`;
const DECISIONS_FILE = `${MEMORY_DIR}/decisions.md`;
const PATTERNS_FILE = `${MEMORY_DIR}/patterns.md`;

/**
 * Initialize memory system for a project
 */
export async function initializeMemory(projectPath: string): Promise<void> {
  const memoryPath = `${projectPath}/${MEMORY_DIR}`;
  
  if (!await fileCommands.pathExists(memoryPath)) {
    await fileCommands.createDirectory(memoryPath);
    
    // Create default index
    await fileCommands.writeFile(
      `${memoryPath}/index.json`,
      JSON.stringify({
        version: 1,
        created: new Date().toISOString(),
        memories: [],
        lastUpdated: new Date().toISOString(),
      }, null, 2)
    );
  }
}

/**
 * Load all memories for a project
 */
export async function loadMemories(projectPath: string): Promise<MemoryEntry[]> {
  try {
    const indexPath = `${projectPath}/${MEMORY_INDEX_FILE}`;
    
    if (!await fileCommands.pathExists(indexPath)) {
      return [];
    }
    
    const content = await fileCommands.readFile(indexPath);
    const data = JSON.parse(content);
    
    return (data.memories || []).map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      lastAccessed: new Date(m.lastAccessed),
    }));
  } catch {
    return [];
  }
}

/**
 * Save a new memory entry
 */
export async function saveMemory(
  projectPath: string,
  memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessed' | 'accessCount'>
): Promise<MemoryEntry> {
  const memoryPath = `${projectPath}/${MEMORY_DIR}`;
  
  // Ensure directory exists
  if (!await fileCommands.pathExists(memoryPath)) {
    await initializeMemory(projectPath);
  }
  
  // Create new memory entry
  const newMemory: MemoryEntry = {
    ...memory,
    id: generateMemoryId(),
    createdAt: new Date(),
    lastAccessed: new Date(),
    accessCount: 0,
  };
  
  // Load existing index
  const existingMemories = await loadMemories(projectPath);
  
  // Check for duplicates (similar title + type)
  const isDuplicate = existingMemories.some(m => 
    m.type === memory.type && 
    similarity(m.title, memory.title) > 0.8
  );
  
  if (!isDuplicate) {
    existingMemories.push(newMemory);
    
    // Enforce max limit (remove oldest/least accessed)
    while (existingMemories.length > DEFAULT_MEMORY_CONFIG.maxMemories) {
      // Find least accessed, oldest memory
      let worstIdx = 0;
      let worstScore = Infinity;
      
      for (let i = 0; i < existingMemories.length; i++) {
        const m = existingMemories[i];
        const score = m.accessCount + (m.lastAccessed.getTime() / 10000000);
        if (score < worstScore) {
          worstScore = score;
          worstIdx = i;
        }
      }
      
      existingMemories.splice(worstIdx, 1);
    }
    
    // Save updated index
    await fileCommands.writeFile(
      `${memoryPath}/index.json`,
      JSON.stringify({
        version: 1,
        created: new Date().toISOString(), // Use current time if file doesn't exist
        memories: existingMemories.map(m => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          lastAccessed: m.lastAccessed.toISOString(),
        })),
        lastUpdated: new Date().toISOString(),
      }, null, 2)
    );
  }
  
  return newMemory;
}

/**
 * Update access stats for a memory (call when memory is used)
 */
export async function touchMemory(
  projectPath: string,
  memoryId: string
): Promise<void> {
  const memories = await loadMemories(projectPath);
  const idx = memories.findIndex(m => m.id === memoryId);
  
  if (idx !== -1) {
    memories[idx].lastAccessed = new Date();
    memories[idx].accessCount += 1;
    
    // Save back
    const memoryPath = `${projectPath}/${MEMORY_DIR}`;
    await fileCommands.writeFile(
      `${memoryPath}/index.json`,
      JSON.stringify({
        version: 1,
        memories: memories.map(m => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          lastAccessed: m.lastAccessed.toISOString(),
        })),
        lastUpdated: new Date().toISOString(),
      }, null, 2)
    );
  }
}

/**
 * Delete a memory entry
 */
export async function deleteMemory(projectPath: string, memoryId: string): Promise<boolean> {
  const memories = await loadMemories(projectPath);
  const idx = memories.findIndex(m => m.id === memoryId);
  
  if (idx === -1) return false;
  
  memories.splice(idx, 1);
  
  const memoryPath = `${projectPath}/${MEMORY_DIR}`;
  await fileCommands.writeFile(
    `${memoryPath}/index.json`,
    JSON.stringify({
      version: 1,
      memories: memories.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        lastAccessed: m.lastAccessed.toISOString(),
      })),
      lastUpdated: new Date().toISOString(),
    }, null, 2)
  );
  
  return true;
}

// ============================================================
// USER PREFERENCES LEARNING
// ============================================================

/**
 * Load learned user preferences
 */
export async function loadUserPreferences(projectPath: string): Promise<UserPreferences> {
  try {
    const prefsPath = `${projectPath}/${PREFERENCES_FILE}`;
    
    if (!await fileCommands.pathExists(prefsPath)) {
      return { ...DEFAULT_PREFERENCES };
    }
    
    const content = await fileCommands.readFile(prefsPath);
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save user preferences
 */
export async function saveUserPreferences(
  projectPath: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  const memoryPath = `${projectPath}/${MEMORY_DIR}`;
  
  if (!await fileCommands.pathExists(memoryPath)) {
    await initializeMemory(projectPath);
  }
  
  const existing = await loadUserPreferences(projectPath);
  const updated = { ...existing, ...prefs };
  
  await fileCommands.writeFile(
    `${memoryPath}/preferences.json`,
    JSON.stringify(updated, null, 2)
  );
}

/**
 * Learn from an interaction and update preferences
 */
export async function learnFromInteraction(
  projectPath: string,
  context: InteractionContext
): Promise<MemoryEntry[]> {
  const newMemories: MemoryEntry[] = [];
  
  if (!DEFAULT_MEMORY_CONFIG.autoLearn) {
    return newMemories;
  }
  
  // 1. Detect language preference
  if (DEFAULT_MEMORY_CONFIG.learnPreferences) {
    const detectedLang = detectLanguage(context.userMessage);
    if (detectedLang === 'ur') {
      const prefs = await loadUserPreferences(projectPath);
      if (!prefs.preferUrduExplanations) {
        await saveUserPreferences(projectPath, { 
          preferUrduExplanations: true,
          language: 'ur',
        });
        newMemories.push(await saveMemory(projectPath, {
          type: 'preference',
          title: 'Prefers Urdu explanations',
          content: 'User communicates in Urdu, should respond in Urdu or bilingual format.',
          tags: ['language', 'urdu', 'preference'],
        }));
      }
    }
  }
  
  // 2. Detect tech stack mentions
  if (DEFAULT_MEMORY_CONFIG.learnPatterns) {
    const techStack = detectTechStack(context.userMessage);
    if (techStack.length > 0) {
      const prefs = await loadUserPreferences(projectPath);
      const newTech = techStack.filter(t => !prefs.techStack.includes(t));
      
      if (newTech.length > 0) {
        await saveUserPreferences(projectPath, {
          techStack: [...prefs.techStack, ...newTech],
        });
        
        newMemories.push(await saveMemory(projectPath, {
          type: 'pattern',
          title: `Works with ${newTech.join(', ')}`,
          content: `User frequently works with: ${newTech.join(', ')}. Keep examples and suggestions relevant to these technologies.`,
          tags: ['tech-stack', ...newTech],
        }));
      }
    }
  }
  
  // 3. Learn from positive/negative feedback
  if (context.feedback === 'positive' && context.usedSkill) {
    await touchMemory(projectPath, `skill-${context.usedSkill}`);
  }
  
  // 4. Detect architecture decisions
  if (DEFAULT_MEMORY_CONFIG.learnDecisions) {
    const decision = detectArchitectureDecision(context.userMessage, context.aiResponse);
    if (decision) {
      newMemories.push(await saveMemory(projectPath, {
        type: 'decision',
        title: decision.title,
        content: decision.content,
        tags: ['architecture', 'decision', ...decision.tags],
      }));
    }
  }
  
  return newMemories;
}

// ============================================================
// MEMORY RETRIEVAL & SEARCH
// ============================================================

/**
 * Find relevant memories for a given query/context
 */
export async function findRelevantMemories(
  projectPath: string,
  query: string,
  limit: number = 10
): Promise<MemoryEntry[]> {
  const allMemories = await loadMemories(projectPath);
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/);
  
  // Score each memory by relevance
  const scored = allMemories.map(memory => {
    let score = 0;
    const lowerTitle = memory.title.toLowerCase();
    const lowerContent = memory.content.toLowerCase();
    const lowerTags = memory.tags.map(t => t.toLowerCase()).join(' ');
    
    // Title match (highest weight)
    if (lowerTitle.includes(lowerQuery) || lowerQuery.includes(lowerTitle)) {
      score += 3;
    } else {
      // Word overlap in title
      const titleWords = lowerTitle.split(/\s+/);
      const overlap = queryWords.filter(w => titleWords.includes(w)).length;
      score += overlap * 0.5;
    }
    
    // Content match (medium weight)
    if (lowerContent.includes(lowerQuery)) {
      score += 2;
    } else {
      const contentWords = lowerContent.split(/\s+/);
      const overlap = queryWords.filter(w => contentWords.includes(w)).length;
      score += overlap * 0.3;
    }
    
    // Tag match
    for (const tag of memory.tags) {
      if (queryWords.includes(tag.toLowerCase())) {
        score += 1;
      }
    }
    
    // Recency boost (slight)
    const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 7) score += 0.5;
    if (daysSinceAccess < 1) score += 0.5;
    
    // Frequency boost (slight)
    score += Math.min(memory.accessCount * 0.1, 1);
    
    return { memory, score };
  });
  
  // Sort by score descending, take top results
  scored.sort((a, b) => b.score - a.score);
  
  // Touch the returned memories to update access time
  for (const { memory } of scored.slice(0, limit)) {
    touchMemory(projectPath, memory.id);
  }
  
  return scored.slice(0, limit).map(s => s.memory);
}

/**
 * Get memories by type
 */
export async function getMemoriesByType(
  projectPath: string,
  type: MemoryEntry['type']
): Promise<MemoryEntry[]> {
  const allMemories = await loadMemories(projectPath);
  return allMemories.filter(m => m.type === type);
}

// ============================================================
// DETECTION FUNCTIONS
// ============================================================

function detectLanguage(text: string): 'en' | 'ur' | 'auto' {
  // Simple Urdu detection based on Unicode range
  const urduRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const urduChars = (text.match(urduRange) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  
  if (totalChars > 0 && urduChars / totalChars > 0.2) {
    return 'ur';
  }
  return 'en';
}

function detectTechStack(text: string): string[] {
  const techMap: Record<string, RegExp> = {
    'react': /\breact\b|jsx|tsx/i,
    'vue': /\bvue\b/i,
    'angular': /\bangular\b/i,
    'typescript': /\btypescript\b|\bts\b(?!\s*\))/i,
    'javascript': /\bjavascript\b|\bjs\b(?!\s*[on])/i,
    'python': /\bpython\b|\bpy\b/i,
    'rust': /\brust\b|\.rs\b/i,
    'go': /\bgolang?\b|\.go\b/i,
    'java': /\bjava\b(?!script)/i,
    'c#': /\bc\#\b/i,
    'c++': /\bc\+\+\b/i,
    'ruby': /\bruby\b/i,
    'swift': /\bswift\b/i,
    'kotlin': /\bkotlin\b/i,
    'nextjs': /\bnext(?:\.?js)?\b/i,
    'node': /\bnode(?:\.?js)?\b/i,
    'express': /\bexpress\b/i,
    'django': /\bdjango\b/i,
    'fastapi': /\bfastapi\b/i,
    'flask': /\bflask\b/i,
    'tauri': /\btauri\b/i,
    'sqlite': /\bsqlite\b/i,
    'postgresql': /\bpostgres|postgresql|pg\b/i,
    'mongodb': /\bmongodb\b/i,
    'redis': /\bredis\b/i,
    'docker': /\bdocker\b/i,
    'git': /\bgit\b/i,
    'tailwind': /\btailwind\b/i,
    'prisma': /\bprisma\b/i,
    'graphql':/\bgraphql\b/i,
    'rest': /\brest\s+api\b/i,
    'aws': /\baws\b/i,
    'linux': /\blinux\b/i,
  };
  
  const detected: string[] = [];
  
  for (const [tech, regex] of Object.entries(techMap)) {
    if (regex.test(text)) {
      detected.push(tech);
    }
  }
  
  return detected;
}

interface ArchitectureDecision {
  title: string;
  content: string;
  tags: string[];
}

function detectArchitectureDecision(userMsg: string, aiResponse: string): ArchitectureDecision | null {
  const decisionPatterns = [
    /decided to|chose to|going with|using\s+(?:instead|rather)/i,
    /architecture|pattern|approach|design/i,
    /why\s+(?:did|are)\s+(?:we|you)\s+/i,
    /(not\s+)?use\s+\w+\s+because/i,
  ];
  
  const hasDecisionPattern = decisionPatterns.some(p => p.test(userMsg) || p.test(aiResponse));
  
  if (!hasDecisionPattern) return null;
  
  // Extract potential decision
  const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (const sentence of sentences) {
    if (decisionPatterns.some(p => p.test(sentence))) {
      return {
        title: extractDecisionTitle(sentence),
        content: sentence.trim(),
        tags: extractTags(sentence),
      };
    }
  }
  
  return null;
}

function extractDecisionTitle(sentence: string): string {
  // Try to create a concise title from the sentence
  const cleaned = sentence.trim();
  if (cleaned.length < 80) {
    return cleaned;
  }
  return cleaned.slice(0, 77) + '...';
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const tagPatterns = {
    'performance': /performanc|speed|optimi[sz]/i,
    'security': /secur|auth|protect/i,
    'scalability': /scalab|scale/i,
    'maintainability': /maintain|readab|clean/i,
    'simplicity': /simple|easy|straightforward/i,
    'compatibility': /compatib|support|work with/i,
  };
  
  for (const [tag, pattern] of Object.entries(tagPatterns)) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate string similarity (Jaccard-like)
 */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = [...wordsA].filter(x => wordsB.has(x)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  
  return union > 0 ? intersection / union : 0;
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  DEFAULT_MEMORY_CONFIG,
  initializeMemory,
  loadMemories,
  saveMemory,
  deleteMemory,
  touchMemory,
  loadUserPreferences,
  saveUserPreferences,
  learnFromInteraction,
  findRelevantMemories,
  getMemoriesByType,
};
