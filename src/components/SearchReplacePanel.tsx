import React, { useState, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';

interface SearchResult {
  file: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchReplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchReplacePanel({ isOpen, onClose }: SearchReplacePanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  
  const { projectFiles, selectedFile, fileContent } = useStore();

  // Search in current file or all files
  const searchResults: SearchResult[] = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const results: SearchResult[] = [];
    
    // If we have file content and a selected file, search in it
    if (fileContent && selectedFile) {
      const lines = fileContent.split('\n');
      lines.forEach((line, lineNum) => {
        const matches = findMatches(line, searchTerm, { useRegex, caseSensitive, wholeWord });
        matches.forEach((match) => {
          results.push({
            file: selectedFile,
            line: lineNum + 1,
            content: line.trim(),
            matchStart: match.start,
            matchEnd: match.end,
          });
        });
      });
    }

    return results;
  }, [searchTerm, fileContent, selectedFile, useRegex, caseSensitive, wholeWord]);

  // Find matches in text
  const findMatches = (
    text: string, 
    term: string, 
    options: { useRegex: boolean; caseSensitive: boolean; wholeWord: boolean }
  ): Array<{ start: number; end: number }> => {
    const matches: Array<{ start: number; end: number }> = [];
    
    if (!term) return matches;

    try {
      let regex: RegExp;
      
      if (options.useRegex) {
        regex = new RegExp(term, options.caseSensitive ? 'g' : 'gi');
      } else {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = options.caseSensitive ? 'g' : 'gi';
        const wordBoundary = options.wholeWord ? '\\b' : '';
        regex = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, flags);
      }

      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length });
        
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } catch (e) {
      // Invalid regex - ignore
    }

    return matches;
  };

  // Highlight match in content
  const highlightMatch = (content: string, start: number, end: number) => {
    const before = content.slice(0, start);
    const match = content.slice(start, end);
    const after = content.slice(end);

    return (
      <>
        <span className="text-dark-400">{before}</span>
        <span className="bg-yellow-500/30 text-yellow-300 px-0.5 rounded">{match}</span>
        <span className="text-dark-400">{after}</span>
      </>
    );
  };

  // Navigate to result
  const goToResult = (index: number) => {
    setActiveResultIndex(index);
    // In real implementation, this would open the file and scroll to the line
  };

  // Navigate to next/prev
  const goNext = () => {
    setActiveResultIndex(prev => (prev + 1) % searchResults.length);
  };

  const goPrev = () => {
    setActiveResultIndex(prev => prev <= 0 ? searchResults.length - 1 : prev - 1);
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goPrev();
      } else {
        goNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [searchResults.length, onClose]);

  if (!isOpen) return null;

  return (
    <div className="border-t border-dark-800 bg-dark-900/95 backdrop-blur-sm slide-up">
      {/* Search Bar */}
      <div className="p-3 space-y-2">
        {/* Main Search Input */}
        <div className="flex items-center gap-2">
          {/* Search Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-dark-800 text-dark-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find in files..."
            className="flex-1 h-9 px-3 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-colors"
            autoFocus
          />

          {/* Result count */}
          {searchResults.length > 0 && (
            <span className="text-xs text-dark-400 font-mono min-w-[60px] text-right">
              {activeResultIndex + 1} of {searchResults.length}
            </span>
          )}

          {/* Navigation buttons */}
          {searchResults.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={goPrev}
                className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                title="Previous (Shift+Enter)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                title="Next (Enter)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Toggle Replace */}
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1.5 rounded transition-colors ${
              showReplace ? 'bg-primary-500/20 text-primary-400' : 'hover:bg-dark-700 text-dark-400'
            }`}
            title="Toggle Replace"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options Row */}
        <div className="flex items-center gap-3 pl-10">
          <label className={`flex items-center gap-1.5 cursor-pointer text-xs ${caseSensitive ? 'text-primary-400' : 'text-dark-500 hover:text-dark-400'} transition-colors`}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded border-dark-600 text-primary-500 focus:ring-primary-500/20 w-3 h-3"
            />
            Aa
          </label>
          
          <label className={`flex items-center gap-1.5 cursor-pointer text-xs ${wholeWord ? 'text-primary-400' : 'text-dark-500 hover:text-dark-400'} transition-colors`}>
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="rounded border-dark-600 text-primary-500 focus:ring-primary-500/20 w-3 h-3"
            />
            Whole Word
          </label>
          
          <label className={`flex items-center gap-1.5 cursor-pointer text-xs ${useRegex ? 'text-primary-400' : 'text-dark-500 hover:text-dark-400'} transition-colors`}>
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              className="rounded border-dark-600 text-primary-500 focus:ring-primary-500/20 w-3 h-3"
            />
            .*
          </label>
        </div>

        {/* Replace Field */}
        {showReplace && (
          <div className="flex items-center gap-2 pl-10 slide-down">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-dark-800 text-dark-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            
            <input
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
              className="flex-1 h-9 px-3 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
            />

            <button
              className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-md transition-colors"
              disabled={!replaceTerm || searchResults.length === 0}
            >
              Replace
            </button>
            
            <button
              className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-md transition-colors"
              disabled={!replaceTerm || searchResults.length === 0}
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Results List */}
      {searchResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-dark-800">
          {searchResults.map((result, index) => (
            <button
              key={`${result.file}-${result.line}-${index}`}
              onClick={() => goToResult(index)}
              className={`w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-dark-800/50 transition-colors ${
                index === activeResultIndex ? 'bg-primary-500/10 border-l-2 border-primary-500' : 'border-l-2 border-transparent'
              }`}
            >
              {/* File & Line info */}
              <div className="shrink-0 text-xs text-dark-500 font-mono pt-0.5">
                {result.file.split('/').pop()}:{result.line}
              </div>
              
              {/* Content preview with highlight */}
              <div className="flex-1 min-w-0 text-xs font-mono truncate">
                {highlightMatch(result.content, result.matchStart, result.matchEnd)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {searchTerm && searchResults.length === 0 && (
        <div className="px-4 py-3 text-xs text-dark-500 border-t border-dark-800">
          No results found for "{searchTerm}"
        </div>
      )}
    </div>
  );
}
