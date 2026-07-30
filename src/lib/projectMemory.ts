/**
 * Project Memory System for CodeMate AI
 * 
 * This module handles reading and managing project-specific instructions,
 * similar to CLAUDE.md for Claude or .cursorrules for Cursor.
 * 
 * Files it manages:
 * - CODEMATE.md: Project-level instructions (like CLAUDE.md)
 * - .codemate/config.json: Project-specific configuration
 * - .codemate/memory/: Learned context about the project
 */

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, exists, mkdir, readDir } from '@tauri-apps/plugin-fs';

// ============================================================
// TYPES
// ============================================================

export interface CodeMateInstructions {
  /** Raw markdown content of CODEMATE.md */
  rawContent: string;
  /** Parsed sections from the file */
  sections: InstructionSection[];
  /** File path where this was loaded from */
  filePath: string;
  /** When the file was last modified */
  lastModified: Date;
}

export interface InstructionSection {
  /** Section heading (e.g., "Project Overview", "Tech Stack") */
  heading: string;
  /** Section content as plain text */
  content: string;
  /** Priority level for context inclusion (higher = more important) */
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ProjectContext {
  /** The project root directory path */
  projectRoot: string;
  /** Parsed CODEMATE.md instructions (if exists) */
  instructions: CodeMateInstructions | null;
  /** Active skills for this project */
  activeSkills: SkillDefinition[];
  /** Learned memory entries */
  memories: MemoryEntry[];
  /** User preferences learned from interactions */
  preferences: UserPreferences;
}

export interface UserPreferences {
  /** Preferred response language */
  language: 'en' | 'ur' | 'auto';
  /** Verbosity level (1-5) */
  verbosity: number;
  /** Whether to show detailed explanations */
  explainInDetail: boolean;
  /** Preferred code style */
  codeStyle: 'concise' | 'detailed' | 'idiomatic';
  /** Whether user prefers Urdu for explanations */
  preferUrduExplanations: boolean;
  /** Common frameworks/languages used */
  techStack: string[];
}

export interface MemoryEntry {
  /** Unique ID for this memory */
  id: string;
  /** Type of memory */
  type: 'decision' | 'preference' | 'pattern' | 'convention' | 'error' | 'fact';
  /** Short title/summary */
  title: string;
  /** Detailed content */
  content: string;
  /** Tags for categorization */
  tags: string[];
  /** When this was created */
  createdAt: Date;
  /** Last time this was accessed/relevant */
  lastAccessed: Date;
  /** How many times this has been relevant */
  accessCount: number;
}

export interface SkillDefinition {
  /** Unique skill identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this skill does */
  description: string;
  /** Phrases that trigger this skill */
  triggers: string[];
  /** Tools this skill can use */
  tools: string[];
  /** Example prompts that match this skill */
  examples: string[];
  /** Output format expected */
  outputFormat?: string;
  /** Custom system prompt additions */
  promptAddition?: string;
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'auto',
  verbosity: 3,
  explainInDetail: true,
  codeStyle: 'idiomatic',
  preferUrduExplanations: false,
  techStack: [],
};

const DEFAULT_CODEMATE_CONTENT = `# Project Instructions for CodeMate

## Overview
Add your project-specific instructions here to help CodeMate understand
your project better and provide more relevant responses.

## Tech Stack
List your main technologies here:
- Language: (e.g., TypeScript, Rust, Python)
- Framework: (e.g., React, Next.js, Tauri)
- Database: (e.g., SQLite, PostgreSQL)

## Conventions
- Code style rules specific to this project
- Naming conventions
- File organization patterns

## Rules
- Things CodeMate should ALWAYS do
- Things CodeMate should NEVER do
- Special handling for certain file types

## Common Patterns
- Frequently used patterns in this codebase
- Architecture decisions and rationale
`;

// ============================================================
// CODEMATE.MD READER
// ============================================================

/**
 * Check if CODEMATE.md exists in the given directory
 */
export async function codeMateExists(projectPath: string): Promise<boolean> {
  try {
    const filePath = `${projectPath}/CODEMATE.md`;
    return await exists(filePath);
  } catch {
    return false;
  }
}

/**
 * Read and parse CODEMATE.md from a project directory
 */
export async function readCodeMateFile(projectPath: string): Promise<CodeMateInstructions | null> {
  try {
    const filePath = `${projectPath}/CODEMATE.md`;
    
    if (!await exists(filePath)) {
      return null;
    }
    
    const content = await readTextFile(filePath);
    
    return {
      rawContent: content,
      sections: parseInstructions(content),
      filePath,
      lastModified: new Date(),
    };
  } catch (error) {
    console.error('Failed to read CODEMATE.md:', error);
    return null;
  }
}

/**
 * Parse markdown content into structured sections
 */
export function parseInstructions(markdown: string): InstructionSection[] {
  const sections: InstructionSection[] = [];
  const lines = markdown.split('\n');
  
  let currentHeading = 'Overview';
  let currentContent: string[] = [];
  let currentPriority: InstructionSection['priority'] = 'medium';
  
  // Priority based on heading keywords
  const priorityMap: Record<string, InstructionSection['priority']> = {
    'rules': 'critical',
    'security': 'critical',
    'must': 'critical',
    'never': 'critical',
    'overview': 'high',
    'tech stack': 'high',
    'architecture': 'high',
    'conventions': 'medium',
    'patterns': 'medium',
    'common': 'medium',
    'preferences': 'low',
    'notes': 'low',
    'todo': 'low',
  };
  
  for (const line of lines) {
    // Check if this is a heading
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section
      if (currentContent.length > 0 || sections.length === 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join('\n').trim(),
          priority: currentPriority,
        });
      }
      
      // Start new section
      currentHeading = headingMatch[2].trim();
      currentContent = [];
      
      // Determine priority from heading
      const lowerHeading = currentHeading.toLowerCase();
      currentPriority = 'medium';
      
      for (const [keyword, priority] of Object.entries(priorityMap)) {
        if (lowerHeading.includes(keyword)) {
          currentPriority = priority;
          break;
        }
      }
    } else {
      currentContent.push(line);
    }
  }
  
  // Don't forget the last section
  if (currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join('\n').trim(),
      priority: currentPriority,
    });
  }
  
  return sections;
}

/**
 * Create a default CODEMATE.md in the project directory
 */
export async function createDefaultCodeMate(projectPath: string): Promise<string> {
  try {
    // Ensure .codemate directory exists
    const codemateDir = `${projectPath}/.codemate`;
    if (!await exists(codemateDir)) {
      await mkdir(codemateDir, { recursive: true });
    }
    
    const filePath = `${projectPath}/CODEMATE.md`;
    
    // Use Tauri's write API through invoke
    await invoke('write_file', { 
      path: filePath, 
      content: DEFAULT_CODEMATE_CONTENT 
    });
    
    return filePath;
  } catch (error) {
    console.error('Failed to create CODEMATE.md:', error);
    throw error;
  }
}

// ============================================================
// CONTEXT BUILDER - Build prompt context from memory
// ============================================================

/**
 * Build a context string from project memory for inclusion in system prompt
 * Priority order: critical > high > medium > low (respecting token limits)
 */
export function buildPromptContext(
  projectContext: ProjectContext,
  maxTokens: number = 2000
): string {
  const parts: string[] = [];
  
  // 1. Add CODEMATE.md instructions (highest priority)
  if (projectContext.instructions) {
    const instructionText = formatInstructionsForPrompt(
      projectContext.instructions, 
      maxTokens / 2 // Use half budget for instructions
    );
    if (instructionText) {
      parts.push(instructionText);
    }
  }
  
  // 2. Add active skills summary
  if (projectContext.activeSkills.length > 0) {
    const skillsText = projectContext.activeSkills
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n');
    parts.push(`## Available Skills\n${skillsText}`);
  }
  
  // 3. Add relevant memories (prioritized by recency and frequency)
  const relevantMemories = projectContext.memories
    .sort((a, b) => {
      // Sort by access count first, then by last accessed
      if (b.accessCount !== a.accessCount) {
        return b.accessCount - a.accessCount;
      }
      return b.lastAccessed.getTime() - a.lastAccessed.getTime();
    })
    .slice(0, 10); // Top 10 most relevant
  
  if (relevantMemories.length > 0) {
    const memoryText = relevantMemories
      .map(m => `- [${m.type.toUpperCase()}] ${m.title}: ${m.content.slice(0, 100)}...`)
      .join('\n');
    parts.push(`## Project Memory\n${memoryText}`);
  }
  
  // 4. Add user preferences
  const prefs = projectContext.preferences;
  if (prefs.language !== 'auto' || prefs.techStack.length > 0) {
    const prefParts: string[] = [];
    if (prefs.language !== 'auto') {
      prefParts.push(`Language: ${prefs.language}`);
    }
    prefParts.push(`Verbosity: ${prefs.verbosity}/5`);
    prefParts.push(`Code style: ${prefs.codeStyle}`);
    if (prefs.techStack.length > 0) {
      prefParts.push(`Tech stack: ${prefs.techStack.join(', ')}`);
    }
    parts.push(`## User Preferences\n${prefParts.join('\n')}`);
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return `<!-- Project-Specific Context -->\n${parts.join('\n\n')}`;
}

/**
 * Format parsed instructions for inclusion in prompt
 */
function formatInstructionsForPrompt(
  instructions: CodeMateInstructions,
  maxTokens: number
): string {
  // Sort sections by priority
  const sortedSections = [...instructions.sections].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  // Build output, respecting approximate token limit (~4 chars per token)
  let output = `## Project Instructions (from CODEMATE.md)\n`;
  let charCount = output.length;
  const maxChars = maxTokens * 4;
  
  for (const section of sortedSections) {
    const sectionText = `\n### ${section.heading}\n${section.content}\n`;
    
    if (charCount + sectionText.length > maxChars) {
      output += '\n... [truncated due to length]';
      break;
    }
    
    output += sectionText;
    charCount += sectionText.length;
  }
  
  return output;
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  codeMateExists,
  readCodeMateFile,
  parseInstructions,
  createDefaultCodeMate,
  buildPromptContext,
  DEFAULT_PREFERENCES,
  DEFAULT_CODEMATE_CONTENT,
};

// Re-export types for use in other modules
export type {
  SkillDefinition,
};
