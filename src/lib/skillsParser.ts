/**
 * Skills Parser for CodeMate AI
 * 
 * Parses SKILLS.md or .codemate/skills/*.md files to define
 * custom skills/capabilities for the AI assistant.
 * 
 * Skills define:
 * - When to activate (triggers)
 * - What tools to use
 * - How to format output
 * - Custom prompt additions
 */

import { readTextFile, exists, readDir } from '@tauri-apps/plugin-fs';
import type { SkillDefinition } from './projectMemory';

// ============================================================
// TYPES
// ============================================================

export interface ParsedSkillFile {
  /** File path */
  path: string;
  /** Parsed skills from this file */
  skills: SkillDefinition[];
  /** Any parse errors encountered */
  errors: string[];
}

export interface SkillMatch {
  /** The matched skill */
  skill: SkillDefinition;
  /** Confidence score (0-1) */
  confidence: number;
  /** Which trigger matched */
  matchedTrigger: string;
}

// ============================================================
// BUILT-IN SKILLS (Always Available)
// ============================================================

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generate new code from descriptions and specifications',
    triggers: ['write', 'create', 'implement', 'generate', 'build', 'make a', 'create new'],
    tools: ['write_file', 'edit_file'],
    examples: [
      'Write a function that sorts an array',
      'Create a new React component for user profiles',
      'Implement a REST API endpoint for users',
    ],
    promptAddition: `When generating code:
1. Always include proper TypeScript types
2. Add JSDoc comments for public functions
3. Handle edge cases and errors appropriately
4. Follow existing project patterns when visible`,
  },
  {
    id: 'debugging',
    name: 'Debugging & Troubleshooting',
    description: 'Find, diagnose, and fix bugs in code',
    triggers: ['debug', 'fix', 'error', 'bug', 'issue', 'not working', 'broken', 'why is'],
    tools: ['read_file', 'search_code', 'analyze_project'],
    examples: [
      'Debug this function that returns undefined',
      'Fix the error in my API call',
      'Why is this component not re-rendering?',
    ],
    promptAddition: `When debugging:
1. First understand EXPECTED vs ACTUAL behavior
2. Identify possible causes systematically
3. Provide ROOT CAUSE analysis, not just symptoms
4. Include prevention tips to avoid recurrence`,
    outputFormat: `## 🔍 Diagnosis
[Analysis of what's wrong]

## 🎯 Root Cause
[The underlying issue]

## ✅ Solution
[Code/changes to fix it]

## 💡 Prevention
[How to avoid this in future]`,
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code quality, security, and best practices',
    triggers: ['review', 'improve', 'optimize', 'refactor', 'better way', 'code quality'],
    tools: ['read_file', 'search_code'],
    examples: [
      'Review this PR for issues',
      'How can I improve this code?',
      'Is there a better way to write this?',
    ],
    promptAddition: `When reviewing code:
- Focus on: Correctness, Performance, Security, Readability, Maintainability
- Use severity levels: 🔴 Critical / 🟡 Warning / 💡 Suggestion
- Always explain WHY something should change
- Acknowledge good patterns you see`,
    outputFormat: `# Code Review Summary

## Overall Assessment
[Rating and summary]

## 🔴 Critical Issues
[List with fixes]

## 🟡 Warnings
[List with suggestions]

## 💡 Improvements
[Optional enhancements]

## ✅ What's Good
[Acknowledge strengths]`,
  },
  {
    id: 'explanation',
    name: 'Concept Explanation',
    description: 'Explain programming concepts clearly',
    triggers: ['explain', 'what is', 'how does', 'why', 'tell me about', 'help me understand'],
    tools: [],
    examples: [
      'Explain closures in JavaScript',
      'What is dependency injection?',
      'How does React useState work?',
    ],
    promptAddition: `When explaining concepts:
1. Start with a SIMPLE analogy or real-world comparison
2. Progressively add technical detail
3. Use code examples to illustrate
4. Mention common misconceptions
5. Relate to practical use cases`,
    outputFormat: `## Simple Explanation
[Beginner-friendly overview]

## Technical Details
[In-depth explanation]

## Example
\`\`\`language
[code example]
\`\`\`

## Common Pitfalls
[Mistakes to avoid]

## Related Concepts
[Things to explore next]`,
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    description: 'Restructure code while preserving behavior',
    triggers: ['refactor', 'restructure', 'clean up', 'simplify', 'reduce complexity', 'DRY'],
    tools: ['read_file', 'write_file', 'edit_file', 'search_code'],
    examples: [
      'Refactor this to be more readable',
      'Simplify this complex function',
      'Apply DRY principle here',
    ],
    promptAddition: `When refactoring:
1. Preserve existing behavior exactly
2. Make small, incremental changes
3. Improve naming and clarity
4. Reduce duplication
5. Maintain or improve test coverage`,
  },
  {
    id: 'testing',
    name: 'Testing & TDD',
    description: 'Write tests and implement test-driven development',
    triggers: ['test', 'unit test', 'TDD', 'coverage', 'assert', 'mock', 'spec'],
    tools: ['write_file', 'read_file', 'execute_command'],
    examples: [
      'Write unit tests for this utility',
      'Help me achieve 100% coverage',
      'Create a test suite for the API',
    ],
    promptAddition: `When writing tests:
1. Test behaviors, not implementation details
2. Cover edge cases and boundary conditions
3. Use descriptive test names
4. Follow AAA pattern: Arrange, Act, Assert
5. Mock external dependencies appropriately`,
  },
  {
    id: 'git-workflow',
    name: 'Git & Version Control',
    description: 'Help with Git operations and workflows',
    triggers: ['git', 'commit', 'branch', 'merge', 'push', 'pull request', 'changelog', 'diff'],
    tools: ['execute_command'],
    examples: [
      'Help me write a good commit message',
      'How do I undo the last commit?',
      'Create a branch for this feature',
    ],
    promptAddition: `For Git operations:
1. Show commands before executing
2. Explain what each command does
3. Warn before destructive operations
4. Suggest conventional commit format`,
  },
  {
    id: 'architecture',
    name: 'Architecture Design',
    description: 'Design system architecture and structure',
    triggers: ['architecture', 'design', 'structure', 'pattern', 'scalable', 'microservices', 'monolith'],
    tools: ['write_file', 'read_file', 'list_directory', 'analyze_project'],
    examples: [
      'Design the architecture for a chat app',
      'Should I use Redux or Context?',
      'How should I structure this project?',
    ],
    promptAddition: `When designing architecture:
1. Consider requirements first, then technology
2. Discuss trade-offs of different approaches
3. Recommend proven patterns over clever ones
4. Plan for evolution and scaling
5. Document decisions and rationale`,
    outputFormat: `# Architecture Proposal

## Requirements
[What we're building]

## Proposed Structure
[Architecture diagram/description]

## Key Decisions
| Decision | Rationale | Alternative |
|----------|-----------|------------|

## Trade-offs
[What we gain vs what we lose]

## Next Steps
[Implementation order]`,
  },
];

// ============================================================
// PARSER FUNCTIONS
// ============================================================

/**
 * Parse a SKILLS.md file content into skill definitions
 * 
 * Expected format:
 * ```markdown
 * # Skill Name
 * 
 * description: What this skill does
 * 
 * triggers: word1, word2, "phrase with spaces"
 * 
 * tools: tool1, tool2
 * 
 * ## Examples
 * - "Example prompt 1"
 * - "Example prompt 2"
 * 
 * ## Output Format
 * [Template for responses]
 * ```
 */
export function parseSkillsFile(content: string, filePath: string): ParsedSkillFile {
  const skills: SkillDefinition[] = [];
  const errors: string[] = [];
  
  // Split by ## headings (each skill starts with # Name)
  // Support both single doc with multiple sections and multiple skills
  
  // Try parsing as multiple skills separated by ---
  const skillBlocks = content.split(/\n---\n/);
  
  for (const block of skillBlocks) {
    try {
      const skill = parseSingleSkill(block.trim(), filePath);
      if (skill) {
        skills.push(skill);
      }
    } catch (e) {
      errors.push(`Parse error in ${filePath}: ${e}`);
    }
  }
  
  return { path: filePath, skills, errors };
}

/**
 * Parse a single skill block
 */
function parseSingleSkill(block: string, sourcePath: string): SkillDefinition | null {
  const lines = block.split('\n');
  
  // First line should be the skill name (# Skill Name)
  const firstLine = lines.find(l => l.startsWith('#'));
  if (!firstLine) return null;
  
  const name = firstLine.replace(/^#+\s*/, '').trim();
  if (!name) return null;
  
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  let description = '';
  const triggers: string[] = [];
  const tools: string[] = [];
  const examples: string[] = [];
  let outputFormat: string | undefined;
  let promptAddition: string | undefined;
  
  let currentSection = '';
  const currentContent: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for section headers
    if (line.startsWith('## ')) {
      // Process previous section
      processSection(currentSection, currentContent.join('\n'), {
        set description(v) { description = v; },
        get description() { return description; },
        set triggers(v) { triggers.push(...v); },
        get triggers() { return triggers; },
        set tools(v) { tools.push(...v); },
        get tools() { return tools; },
        set examples(v) { examples.push(...v); },
        get examples() { return examples; },
        set outputFormat(v) { outputFormat = v; },
        get outputFormat() { return outputFormat; },
        set promptAddition(v) { promptAddition = v; },
        get promptAddition() { return promptAddition; },
      });
      
      currentSection = line.replace('## ', '').toLowerCase();
      currentContent.length = 0;
    } else {
      // Check for frontmatter-style fields at top level
      if (!currentSection && line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.toLowerCase().trim()) {
          case 'description':
            description = value;
            break;
          case 'triggers':
            triggers.push(...parseTriggers(value));
            break;
          case 'tools':
            tools.push(...value.split(',').map(t => t.trim()).filter(Boolean));
            break;
        }
      } else {
        currentContent.push(line);
      }
    }
  }
  
  // Don't forget last section
  processSection(currentSection, currentContent.join('\n'), {
    set description(v) { description = v; },
    get description() { return description; },
    set triggers(v) { triggers.push(...v); },
    get triggers() { return triggers; },
    set tools(v) { tools.push(...v); },
    get tools() { return tools; },
    set examples(v) { examples.push(...v); },
    get examples() { return examples; },
    set outputFormat(v) { outputFormat = v; },
    get outputFormat() { return outputFormat; },
    set promptAddition(v) { promptAddition = v; },
    get promptAddition() { return promptAddition; },
  });
  
  return {
    id: `custom-${id}`,
    name,
    description: description || `Custom skill: ${name}`,
    triggers: triggers.length > 0 ? triggers : [name.toLowerCase()],
    tools,
    examples,
    outputFormat,
    promptAddition,
  };
}

/** Process a section content into appropriate field */
function processSection(
  section: string, 
  content: string,
  target: {
    description: string;
    triggers: string[];
    tools: string[];
    examples: string[];
    outputFormat?: string;
    promptAddition?: string;
  }
) {
  const trimmed = content.trim();
  if (!trimmed) return;
  
  switch (section) {
    case 'description':
      target.description = trimmed;
      break;
    case 'triggers':
    case 'trigger words':
      target.triggers.push(...parseTriggers(trimmed));
      break;
    case 'tools':
      target.tools.push(...trimmed.split(/[,\n]/).map(t => t.trim()).filter(Boolean));
      break;
    case 'examples':
    case 'example prompts':
      // Parse list items or quoted strings
      const exampleMatches = trimmed.match(/[-*]\s*"([^"]+)"|[-*]\s*(.+)/g);
      if (exampleMatches) {
        for (const ex of exampleMatches) {
          const match = ex.match(/"([^"]+)"|[-*]\s*(.+)/);
          if (match) {
            target.examples.push((match[1] || match[2]).trim());
          }
        }
      }
      break;
    case 'output format':
    case 'format':
    case 'template':
      target.outputFormat = trimmed;
      break;
    case 'prompt addition':
    case 'instructions':
    case 'guidelines':
    case 'behavior':
      target.promptAddition = trimmed;
      break;
  }
}

/**
 * Parse trigger words/phrases from string
 * Supports: word1, word2, "phrase with spaces"
 */
function parseTriggers(input: string): string[] {
  const triggers: string[] = [];
  
  // Match quoted phrases first
  const quotedRegex = /"([^"]+)"/g;
  let match;
  while ((match = quotedRegex.exec(input)) !== null) {
    triggers.push(match[1].toLowerCase());
  }
  
  // Then split remaining by comma and add individual words
  const remaining = input.replace(/"[^"]+"/g, '');
  for (const part of remaining.split(',')) {
    const trimmed = part.trim();
    if (trimmed && !quotedRegex.test(`"${trimmed}"`)) {
      triggers.push(trimmed.toLowerCase());
    }
  }
  
  return triggers.filter(t => t.length > 0);
}

// ============================================================
// SKILL MATCHING
// ============================================================

/**
 * Find the best matching skill(s) for a user message
 */
export function findMatchingSkills(
  message: string,
  availableSkills: SkillDefinition[],
  threshold: number = 0.3
): SkillMatch[] {
  const lowerMessage = message.toLowerCase();
  const matches: SkillMatch[] = [];
  
  for (const skill of availableSkills) {
    let bestScore = 0;
    let bestTrigger = '';
    
    for (const trigger of skill.triggers) {
      let score = 0;
      
      if (lowerMessage.includes(trigger)) {
        // Exact phrase match gets higher score
        score = trigger.split(' ').length > 1 ? 0.9 : 0.7;
        
        // Boost score if trigger appears at start
        if (lowerMessage.startsWith(trigger)) {
          score += 0.1;
        }
      } else {
        // Calculate word overlap for partial matches
        const triggerWords = trigger.split(' ');
        const messageWords = lowerMessage.split(' ');
        const overlap = triggerWords.filter(w => messageWords.includes(w)).length;
        
        if (overlap > 0 && overlap === triggerWords.length) {
          score = 0.5 + (overlap * 0.1);
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestTrigger = trigger;
      }
    }
    
    if (bestScore >= threshold) {
      matches.push({
        skill,
        confidence: Math.min(bestScore, 1),
        matchedTrigger: bestTrigger,
      });
    }
  }
  
  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}

/**
 * Get the primary (best matching) skill for a message
 */
export function getPrimarySkill(
  message: string,
  availableSkills: SkillDefinition[]
): SkillMatch | null {
  const matches = findMatchingSkills(message, availableSkills);
  return matches.length > 0 ? matches[0] : null;
}

// ============================================================
// FILE LOADING
// ============================================================

/**
 * Load all custom skills from .codemate/skills/ directory
 */
export async function loadCustomSkills(projectPath: string): Promise<SkillDefinition[]> {
  const skills: SkillDefinition[] = [];
  
  try {
    const skillsDir = `${projectPath}/.codemate/skills`;
    
    if (!await exists(skillsDir)) {
      return skills;
    }
    
    const entries = await readDir(skillsDir);
    
    for (const entry of entries) {
      if (entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
        try {
          const content = await readTextFile(`${skillsDir}/${entry.name}`);
          const parsed = parseSkillsFile(content, entry.name);
          skills.push(...parsed.skills);
        } catch (e) {
          console.error(`Failed to load skill file ${entry.name}:`, e);
        }
      }
    }
  } catch (e) {
    console.error('Failed to load custom skills:', e);
  }
  
  return skills;
}

/**
 * Load SKILLS.md from root if it exists
 */
export async function loadRootSkillsFile(projectPath: string): Promise<SkillDefinition[]> {
  try {
    const filePath = `${projectPath}/SKILLS.md`;
    
    if (!await exists(filePath)) {
      return [];
    }
    
    const content = await readTextFile(filePath);
    const parsed = parseSkillsFile(content, filePath);
    
    return parsed.skills;
  } catch (e) {
    console.error('Failed to load SKILLS.md:', e);
    return [];
  }
}

/**
 * Get all available skills (built-in + custom)
 */
export async function getAllSkills(projectPath: string): Promise<SkillDefinition[]> {
  const [customSkills, rootSkills] = await Promise.all([
    loadCustomSkills(projectPath),
    loadRootSkillsFile(projectPath),
  ]);
  
  // Built-in skills first, then custom, then root file
  return [...BUILTIN_SKILLS, ...rootSkills, ...customSkills];
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  BUILTIN_SKILLS,
  parseSkillsFile,
  findMatchingSkills,
  getPrimarySkill,
  loadCustomSkills,
  loadRootSkillsFile,
  getAllSkills,
};
