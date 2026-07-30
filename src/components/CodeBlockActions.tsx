import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface CodeBlockActionsProps {
  code: string;
  language?: string;
}

export default function CodeBlockActions({ code, language = '' }: CodeBlockActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const { showToast } = useToast();
  const { addMessage, activeConversationId, isGenerating } = useStore();

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast('Code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  }, [code, showToast]);

  // Ask AI to explain the code
  const handleExplain = useCallback(() => {
    if (!activeConversationId || isGenerating) return;
    
    setIsExplaining(true);
    
    const prompt = `Please explain this ${language} code in detail:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. A high-level summary of what it does\n2. Line-by-line explanation\n3. Key concepts used\n4. Potential improvements (if any)`;
    
    addMessage(activeConversationId, {
      role: 'user',
      content: prompt,
    });
    
    // Simulate AI response (in real app, this would trigger actual generation)
    setTimeout(() => {
      setIsExplaining(false);
    }, 500);
    
    showToast('Asked AI to explain this code', 'info');
  }, [code, language, activeConversationId, isGenerating, addMessage, showToast]);

  // Ask AI to refactor the code
  const handleRefactor = useCallback(() => {
    if (!activeConversationId || isGenerating) return;
    
    setIsRefactoring(true);
    
    const prompt = `Please refactor and improve this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nFocus on:\n1. Readability improvements\n2. Performance optimizations\n3. Best practices\n4. Error handling\n5. Modern syntax/patterns\n\nProvide the refactored code with explanations for each change.`;
    
    addMessage(activeConversationId, {
      role: 'user',
      content: prompt,
    });
    
    setTimeout(() => {
      setIsRefactoring(false);
    }, 500);
    
    showToast('Asked AI to refactor this code', 'info');
  }, [code, language, activeConversationId, isGenerating, addMessage, showToast]);

  // Generate test cases
  const handleGenerateTests = useCallback(() => {
    if (!activeConversationId || isGenerating) return;
    
    const prompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nInclude:\n1. Happy path tests\n2. Edge case tests\n3. Error handling tests\n4. Boundary conditions`;
    
    addMessage(activeConversationId, {
      role: 'user',
      content: prompt,
    });
    
    showToast('Requested test generation', 'info');
  }, [code, language, activeConversationId, isGenerating, addMessage, showToast]);

  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Language Badge */}
      {language && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700/80 text-dark-300 font-mono uppercase mr-1">
          {language}
        </span>
      )}
      
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md bg-dark-700/60 hover:bg-dark-600 text-dark-400 hover:text-white transition-all duration-150"
        title="Copy code"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Explain Button */}
      <button
        onClick={handleExplain}
        disabled={!activeConversationId || isGenerating || isExplaining}
        className={`p-1.5 rounded-md transition-all duration-150 ${
          isExplaining 
            ? 'bg-cyan-500/30 text-cyan-400 animate-pulse' 
            : 'bg-dark-700/60 hover:bg-cyan-500/20 hover:text-cyan-400 text-dark-400'
        }`}
        title="Ask AI to explain"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Refactor Button */}
      <button
        onClick={handleRefactor}
        disabled={!activeConversationId || isGenerating || isRefactoring}
        className={`p-1.5 rounded-md transition-all duration-150 ${
          isRefactoring 
            ? 'bg-purple-500/30 text-purple-400 animate-pulse' 
            : 'bg-dark-700/60 hover:bg-purple-500/20 hover:text-purple-400 text-dark-400'
        }`}
        title="Ask AI to refactor"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Generate Tests Button */}
      <button
        onClick={handleGenerateTests}
        disabled={!activeConversationId || isGenerating}
        className="p-1.5 rounded-md bg-dark-700/60 hover:bg-emerald-500/20 hover:text-emerald-400 text-dark-400 transition-all duration-150"
        title="Generate tests"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </button>
    </div>
  );
}

// Hook to enhance code blocks with actions
export function useCodeBlockEnhancer() {
  const enhanceCodeBlocks = useCallback(() => {
    // Find all pre elements that don't have our enhancement yet
    document.querySelectorAll('pre:not([data-enhanced])').forEach((pre) => {
      pre.setAttribute('data-enhanced', 'true');
      pre.classList.add('group', 'relative');
      
      const codeEl = pre.querySelector('code');
      if (!codeEl) return;

      // Extract language from class name
      const classes = Array.from(codeEl.classList);
      const langClass = classes.find(c => c.startsWith('language-'));
      const language = langClass?.replace('language-', '') || '';
      
      const code = codeEl.textContent || '';
      
      // Create actions container
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'code-block-actions-container';
      pre.appendChild(actionsContainer);
    });
  }, []);

  return { enhanceCodeBlocks };
}
