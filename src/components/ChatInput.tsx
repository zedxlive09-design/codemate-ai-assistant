import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useStore } from '../store/useStore';
import { fileCommands, modelCommands } from '../lib/tauri';
import type { InferenceSettings } from '../types';

interface ChatInputProps {
  conversationId: string;
}

export default function ChatInput({ conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    addMessage,
    updateMessage,
    isGenerating,
    setIsGenerating,
    selectedModelId,
    modelLoaded,
    inferenceSettings,
  } = useStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle send message with real streaming generation
  const handleSend = async () => {
    if (!message.trim() || isGenerating || isComposing) return;

    // Add user message (works even in demo mode)
    addMessage(conversationId, {
      role: 'user',
      content: message.trim(),
      files: attachedFiles.map(f => ({ 
        name: f.split('/').pop() || f, 
        path: f, 
        size: 0 
      })),
    });

    const userMessage = message.trim();
    setMessage('');
    setAttachedFiles([]);

    // Start generating response
    setIsGenerating(true);
    
    // Create assistant message placeholder
    addMessage(conversationId, {
      role: 'assistant',
      content: '',
    });
    
    // Get the created message ID (it's the last one)
    const state = useStore.getState();
    const conv = state.conversations.find(c => c.id === conversationId);
    const assistantMessageId = conv!.messages[conv!.messages.length - 1].id;

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (modelLoaded && selectedModelId) {
        // REAL MODE: Use actual llama.cpp inference
        await generateResponseStreaming(
          conversationId, 
          assistantMessageId, 
          userMessage,
          abortController.signal
        );
      } else {
        // DEMO MODE: Simulated response when no model loaded
        await generateDemoResponse(
          conversationId,
          assistantMessageId,
          userMessage,
          abortController.signal
        );
      }
    } catch (error) {
      // Check if this was an intentional abort
      if (abortController.signal.aborted) {
        // Get current message content and append stop message
        const state = useStore.getState();
        const conv = state.conversations.find(c => c.id === conversationId);
        const currentMsg = conv?.messages.find(m => m.id === assistantMessageId);
        const currentContent = currentMsg?.content || '';
        updateMessage(conversationId, assistantMessageId, 
          currentContent + '\n\n*Generation stopped*'
        );
      } else {
        console.error('Generation error:', error);
        updateMessage(conversationId, assistantMessageId, 
          `❌ **Error**: Failed to generate response.\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check that the model is properly loaded.`
        );
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
    }
  };

  /**
   * Demo mode response - Simulated streaming when no model is loaded
   * This allows users to try the UI without downloading a model
   */
  const generateDemoResponse = async (
    conversationId: string,
    messageId: string,
    prompt: string,
    signal: AbortSignal
  ) => {
    // Generate contextual demo responses
    const responses = generateDemoResponses(prompt);
    
    let currentText = '';
    const words = responses.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (signal.aborted) break;
      
      // Simulate typing speed (faster than real LLM for better UX)
      await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 25));
      
      currentText += (i > 0 ? ' ' : '') + words[i];
      updateMessage(conversationId, messageId, currentText);
    }
    
    if (!signal.aborted) {
      // Add demo notice at the end
      updateMessage(conversationId, messageId, 
        currentText + '\n\n---\n*💡 **Demo Mode** - Load a local GGUF model for real AI responses!*'
      );
    }
  };

  /**
   * Generate contextual demo responses based on user input
   */
  const generateDemoResponses = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect intent and return relevant response
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
      return `Hello! 👋 I'm **CodeMate**, your offline AI coding assistant.

I'm currently running in **demo mode** since no AI model has been loaded yet.

### To get started:
1. 📥 Go to **Model Manager** (Ctrl+M)
2. 🔽 Download a model or load your own .gguf file
3. 💬 Start chatting with real AI assistance!

What would you like help with today?`;
    }
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('function') || lowerPrompt.includes('write')) {
      return `I'd be happy to help you write some code! Here's an example:

\`\`\`typescript
// Example function - will generate real code when model is loaded
function processData<T>(data: T[], processor: (item: T) => T): T[] {
  return data.map(processor).filter(item => item !== null && item !== undefined);
}

// Usage example
const numbers = [1, 2, 3, null, 4, undefined, 5];
const result = processData(numbers, n => n * 2);
console.log(result); // [2, 4, 6, 8, 10]
\`\`\`

> ⚠️ This is a **demo response**. Load an AI model for real, contextual code generation!`;
    }
    
    if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
      return `I can help debug your code! Here's my approach:

## Debugging Strategy

| Step | Action | Tool |
|------|--------|------|
| 1 | Reproduce the issue | Manual testing |
| 2 | Check error messages | Console/Logs |
| 3 | Isolate the problem | Binary search |
| 4 | Find root cause | Code analysis |
| 5 | Apply fix | Edit |
| 6 | Verify | Test again |

### Common Issues to Check:
- ✅ Variable types match expected
- ✅ Null/undefined checks in place
- ✅ Async operations properly awaited
- ✅ API responses handled correctly

> 💡 **Tip**: Share the specific error message and relevant code for targeted help!`;
    }
    
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can')) {
      return `# What Can CodeMate Do? 🚀

## Core Features:
- 💬 **Chat** - Ask questions about any programming topic
- 📝 **Code Generation** - Write functions, classes, APIs
- 🐛 **Debugging** - Find and fix bugs in your code
- 📖 **Explain** - Understand complex codebases
- 🔧 **Refactor** - Improve existing code

## Advanced Features:
- 📁 **File Explorer** - Browse and analyze projects
- 📊 **Stats Dashboard** - Track usage metrics
- 🎨 **Theme Customizer** - Personalize UI
- 🌐 **Bilingual** - English + Urdu support

## Getting Started:
1. Press **Ctrl+M** to open Model Manager
2. Download or load a GGUF model
3. Start chatting!

---
*Load a model to unlock full AI capabilities!*`;
    }

    // Default intelligent response
    return `I understand you're asking about: **"${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}"**

This is a **demo response** - I'm simulating what the AI would say.

### When you load a real model, I'll be able to:
- ✅ Answer questions about any programming topic
- ✅ Write and explain code in any language
- ✅ Debug and fix errors in your codebase
- ✅ Help design architectures and APIs
- ✅ Explain complex concepts simply

### Quick Start:
1. Click **📥 Models** in the sidebar
2. Choose and download a model (recommended: Llama 3 8B Q4)
3. Come back here and ask me anything!

---
*Ready when you are! 🦙*`;
  };

  /**
   * Real streaming generation using Tauri backend
   * This connects to the actual llama.cpp inference engine
   */
  const generateResponseStreaming = async (
    conversationId: string,
    messageId: string,
    prompt: string,
    signal: AbortSignal
  ) => {
    let currentText = '';
    
    // Import event listeners dynamically to avoid issues
    const { listen } = await import('@tauri-apps/api/event');
    
    // Set up event listeners for streaming tokens
    const unlistenToken = await listen<{ token: string | null; text: string; tokensGenerated: number; tokensPerSecond: number }>(
      'model:generation-token',
      (event) => {
        if (signal.aborted) return;
        
        currentText = event.payload.text;
        updateMessage(conversationId, messageId, currentText);
      }
    );

    const unlistenComplete = await listen<{ text: string; tokensGenerated: number; tokensPerSecond: number }>(
      'model:generation-complete',
      (event) => {
        if (signal.aborted) return;
        
        currentText = event.payload.text;
        updateMessage(conversationId, messageId, currentText);
        
        console.log(`Generation complete: ${event.payload.tokensGenerated} tokens at ${event.payload.tokensPerSecond.toFixed(1)} t/s`);
      }
    );

    const unlistenError = await listen<{ message: string }>(
      'model:generation-error',
      (event) => {
        throw new Error(event.payload.message);
      }
    );

    try {
      // Build inference settings from store
      const settings: Partial<InferenceSettings> = {
        temperature: inferenceSettings.temperature,
        topP: inferenceSettings.topP,
        topK: inferenceSettings.topK,
        maxTokens: inferenceSettings.maxTokens,
        repeatPenalty: inferenceSettings.repeatPenalty,
        threads: inferenceSettings.threads,
      };

      // Call the streaming generation command
      await modelCommands.generateStreaming(prompt, settings);
      
    } finally {
      // Clean up all listeners
      unlistenToken();
      unlistenComplete();
      unlistenError();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
    
    // Escape to stop generation
    if (e.key === 'Escape' && isGenerating) {
      e.preventDefault();
      handleStopGeneration();
    }
  };

  // Stop current generation
  const handleStopGeneration = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    try {
      await modelCommands.stopGeneration();
    } catch (e) {
      console.error('Failed to stop generation:', e);
    }
  };

  // Attach file
  const handleAttachFile = async () => {
    const path = await fileCommands.selectFile();
    if (path && !attachedFiles.includes(path)) {
      setAttachedFiles([...attachedFiles, path]);
    }
  };

  // Remove attached file
  const removeFile = (path: string) => {
    setAttachedFiles(attachedFiles.filter(f => f !== path));
  };

  return (
    <div className="border-t border-dark-800/80 bg-dark-900/50 backdrop-blur-sm">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <span
              key={file}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-800/80 rounded-lg text-xs border border-dark-700/50 group animate-in slide-in-from-bottom"
            >
              <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="max-w-[120px] truncate text-dark-300">{file.split('/').pop()}</span>
              <button
                onClick={() => removeFile(file)}
                className="text-dark-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input area container */}
      <div className="p-4">
        <div className={`relative flex items-end gap-3 bg-dark-800/60 rounded-2xl border border-dark-700/60 focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all duration-200 ${isGenerating ? 'opacity-75' : ''}`}>
          {/* Textarea container with max height scrolling */}
          <div className="flex-1 relative overflow-hidden">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={
                modelLoaded 
                  ? "Ask me anything about coding..." 
                  : "💬 Type a message (Demo Mode - no model loaded)..."
              }
              disabled={isGenerating}
              rows={1}
              className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-white placeholder-dark-500 disabled:cursor-not-allowed disabled:opacity-60 pr-16 max-h-[160px] overflow-y-auto custom-scrollbar leading-relaxed"
              style={{ minHeight: '48px' }}
            />
            
            {/* Character count (when near limit) */}
            {message.length > 500 && (
              <span className="absolute bottom-2 right-14 text-[10px] text-yellow-500 font-mono">
                {message.length.toLocaleString()}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pb-2 pr-2 shrink-0">
            {/* Attach file button */}
            <button
              onClick={handleAttachFile}
              disabled={isGenerating}
              className="p-2.5 rounded-xl hover:bg-dark-700/80 text-dark-400 hover:text-dark-200 disabled:opacity-40 transition-all duration-150"
              title="Attach file"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Send / Stop button */}
            {isGenerating ? (
              /* Stop button */
              <button
                onClick={handleStopGeneration}
                className="p-2.5 rounded-xl bg-red-600/90 text-white shadow-md shadow-red-600/30 hover:bg-red-500 hover:shadow-lg transition-all duration-200 transform active:scale-95"
                title="Stop generation (Esc)"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              /* Send button */
              <button
                onClick={handleSend}
                disabled={!message.trim() || isComposing}
                className={`
                  p-2.5 rounded-xl transition-all duration-200 transform active:scale-95
                  ${message.trim()
                    ? modelLoaded
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-600/30 hover:shadow-lg hover:from-primary-500 hover:to-primary-400'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-600/30 hover:shadow-lg hover:from-amber-500 hover:to-amber-400'
                    : 'bg-dark-700/80 text-dark-500 cursor-not-allowed'
                  }
                `}
                title={modelLoaded ? "Send message (Enter)" : "Send (Demo Mode)"}
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between mt-2.5 px-1">
          {/* Left side hints */}
          <div className="flex items-center gap-3 text-xs text-dark-600">
            {modelLoaded ? (
              <span className="flex items-center gap-1.5 text-emerald-500/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Model ready
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-500/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Demo Mode
              </span>
            )}
            
            <span className="hidden sm:inline">Enter to send • Shift+Enter for new line</span>
            
            {isGenerating && (
              <span className="flex items-center gap-1.5 text-primary-400/70">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            )}
          </div>

          {/* Right side settings preview */}
          <div className="hidden md:flex items-center gap-3 text-xs text-dark-600">
            <span className="font-mono">T:{inferenceSettings.temperature}</span>
            <span className="text-dark-700">|</span>
            <span className="font-mono">{inferenceSettings.maxTokens.toLocaleString()}t</span>
          </div>
        </div>
      </div>
    </div>
  );
}
