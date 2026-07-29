import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'info' | 'success';
  content: string;
  timestamp: Date;
}

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TerminalPanel({ isOpen, onClose }: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'info',
      content: 'CodeMate Terminal v1.0 - Ready for commands',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'info',
      content: 'Type "help" for available commands or run shell commands directly',
      timestamp: new Date(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const { projectPath, showToast } = useStore();

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Add a new line to terminal
  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date(),
    }]);
  };

  // Execute command
  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    // Add input line
    addLine('input', `$ ${cmd}`);
    
    // Add to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Check for built-in commands
    const trimmedCmd = cmd.trim().toLowerCase();
    
    if (trimmedCmd === 'help') {
      showHelp();
      return;
    }

    if (trimmedCmd === 'clear' || trimmedCmd === 'cls') {
      setLines([]);
      return;
    }

    if (trimmedCmd === 'pwd') {
      addLine('output', projectPath || '/no-project-selected');
      return;
    }

    if (trimmedCmd.startsWith('echo ')) {
      addLine('output', cmd.slice(5));
      return;
    }

    if (trimmedCmd === 'date') {
      addLine('output', new Date().toString());
      return;
    }

    if (trimmedCmd === 'whoami') {
      addLine('output', 'codemate-user');
      return;
    }

    if (trimmedCmd === 'version' || trimmedCmd === '--version') {
      addLine('info', 'CodeMate AI Assistant v1.0.0');
      addLine('info', 'Built with Tauri 2.0 + React + TypeScript');
      return;
    }

    if (trimmedCmd === 'history') {
      commandHistory.forEach((h, i) => {
        addLine('output', `  ${i + 1}  ${h}`);
      });
      return;
    }

    // Try to execute as shell command via Tauri
    setIsRunning(true);
    try {
      // Dynamic import for Tauri
      const { invoke } = await import('@tauri-apps/api/core');
      const result: string = await invoke('execute_command', { 
        command: cmd, 
        workingDir: projectPath || undefined 
      });
      
      if (result.trim()) {
        // Split output into lines and add each
        result.split('\n').forEach(line => {
          if (line.trim()) addLine('output', line);
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      addLine('error', `Error: ${err.message || 'Command execution failed'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Show help
  const showHelp = () => {
    const helpText = `
╔══════════════════════════════════════════════════╗
║           CodeMate Terminal Commands            ║
╠══════════════════════════════════════════════════╣
║  help              Show this help message        ║
║  clear / cls       Clear terminal                ║
║  pwd               Print working directory       ║
║  date              Show current date/time        ║
║  whoami            Show current user             ║
║  version           Show app version              ║
║  history           Show command history          ║
║  echo <text>       Print text                    ║
║                                                  ║
║  Any other command is executed as shell command  ║
╚══════════════════════════════════════════════════╝`.trim();

    helpText.split('\n').forEach(line => addLine('info', line));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(currentInput);
    setCurrentInput('');
  };

  // Handle keyboard navigation in history
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  };

  // Get color for line type
  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-primary-400 font-mono';
      case 'output': return 'text-dark-200 font-mono';
      case 'error': return 'text-red-400 font-mono';
      case 'info': return 'text-cyan-400/80 font-mono text-sm';
      case 'success': return 'text-emerald-400 font-mono';
      default: return 'text-dark-300 font-mono';
    }
  };

  // Get icon for line type
  const getLineIcon = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return '$';
      case 'error': return '✗';
      case 'success': return '✓';
      case 'info': return 'ℹ';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9995] flex flex-col bg-dark-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          
          {/* Title */}
          <span className="text-sm font-medium text-dark-200">Terminal</span>
          
          {/* Status */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isRunning 
              ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' 
              : 'bg-dark-800 text-dark-500'
          }`}>
            {isRunning ? '● Running' : '○ Idle'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Path indicator */}
          {projectPath && (
            <span className="text-xs text-dark-500 font-mono hidden sm:inline">
              {projectPath}
            </span>
          )}

          {/* Clear button */}
          <button
            onClick={() => setLines([])}
            className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
            title="Clear Terminal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 bg-dark-950"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div 
            key={line.id} 
            className={`flex gap-2 px-2 py-0.5 rounded ${getLineColor(line.type)}`}
          >
            {line.type !== 'input' && line.type !== 'output' && (
              <span className="shrink-0 opacity-60">{getLineIcon(line.type)}</span>
            )}
            <span className="whitespace-pre-wrap break-all">{line.content}</span>
          </div>
        ))}
        
        {/* Current input line */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 py-0.5">
          <span className="text-primary-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-dark-200 caret-primary-400"
            placeholder="Type a command..."
            disabled={isRunning}
            spellCheck={false}
            autoComplete="off"
          />
          {isRunning && (
            <span className="animate-pulse text-primary-400">▌</span>
          )}
        </form>
      </div>

      {/* Footer with hints */}
      <footer className="px-4 py-2 bg-dark-900 border-t border-dark-800 flex items-center justify-between text-xs text-dark-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>↑↓ Navigate history</span>
          <span className="hidden sm:inline">Ctrl+L Clear</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 text-[10px]">Enter</kbd>
          <span>to run</span>
        </div>
      </footer>
    </div>
  );
}
