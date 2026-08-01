import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../types';
import { fileCommands } from '../lib/tauri';
import { isTauri } from '../lib/isTauri';
import { Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Bookmark, Save } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [reaction, setReaction] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = (type: 'up' | 'down') => {
    setReaction(reaction === type ? null : type);
  };

  return (
    <div 
      className={`message-animate group flex ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
        {/* Action buttons - appear on hover */}
        {!isSystem && showActions && (
          <div className={`flex items-center gap-1 mb-1.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <button onClick={handleCopy} className="p-1.5 rounded-lg bg-dark-800/90 border border-dark-700 text-dark-400 hover:text-white hover:bg-dark-700 transition-all" title="Copy message">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            {!isUser && (
              <button className="p-1.5 rounded-lg bg-dark-800/90 border border-dark-700 text-dark-400 hover:text-white hover:bg-dark-700 transition-all" title="Regenerate response">
                <RefreshCw size={14} />
              </button>
            )}
            <button className="p-1.5 rounded-lg bg-dark-800/90 border border-dark-700 text-dark-400 hover:text-amber-400 hover:bg-dark-700 transition-all" title="Bookmark message">
              <Bookmark size={14} />
            </button>
          </div>
        )}
        
        {/* Message Bubble */}
        <div className={`relative rounded-2xl transition-all duration-200 ${
          isUser ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white rounded-br-md shadow-lg shadow-primary-600/20' 
          : isSystem ? 'bg-dark-800/80 text-dark-300 border border-dark-700' 
          : 'bg-dark-800/90 text-dark-100 border border-dark-700/50 rounded-bl-md backdrop-blur-sm'
        }`}>
          {/* Glow effect for AI messages */}
          {!isUser && !isSystem && (
            <div className="absolute -inset-px bg-gradient-to-r from-primary-500/20 via-purple-500/10 to-pink-500/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
          )}
        
          {/* Message Header */}
          {!isUser && (
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md">AI</div>
              <span className="text-sm font-medium text-primary-400">CodeMate</span>
              <span className="text-xs text-dark-500">{formatTime(message.timestamp)}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ready
              </span>
            </div>
          )}

          {/* Message Content */}
          <div className={`px-4 pb-3 ${isUser ? 'pt-3' : ''}`}>
            <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-invert prose-dark'}`}>
              <ReactMarkdown components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  if (isInline) {
                    return (<code className={`${className} px-1.5 py-0.5 rounded bg-dark-700 text-pink-400 text-sm font-mono`} {...props}>{children}</code>);
                  }
                  const lang = match[1];
                  const codeText = String(children).replace(/\n$/, '');
                  return (
                    <CodeBlock language={lang} code={codeText} />
                  );
                },
                p({ children }) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>; },
                ul({ children }) { return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>; },
                ol({ children }) { return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>; },
                li({ children }) { return <li className="text-dark-200">{children}</li>; },
                h1({ children }) { return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>; },
                h2({ children }) { return <h2 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h2>; },
                h3({ children }) { return <h3 className="text-base font-semibold text-white mt-2 mb-1">{children}</h3>; },
                strong({ children }) { return <strong className="text-white font-semibold">{children}</strong>; },
                a({ href, children }) { return (<a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline">{children}</a>); },
                blockquote({ children }) { return (<blockquote className="border-l-4 border-primary-500 pl-4 py-2 my-2 bg-dark-900/50 rounded-r-lg">{children}</blockquote>); },
                table({ children }) { return (<div className="overflow-x-auto my-3"><table className="min-w-full divide-y divide-dark-700">{children}</table></div>); },
                th({ children }) { return <th className="px-3 py-2 bg-dark-900 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">{children}</th>; },
                td({ children }) { return <td className="px-3 py-2 text-sm text-dark-300 border-t border-dark-800">{children}</td>; },
              }}>
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Attached files */}
            {message.files && message.files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.files.map((file, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-dark-700 rounded text-xs">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {file.name}
                  </span>
                ))}
              </div>
            )}

            {/* Reaction buttons for AI messages */}
            {!isUser && !isSystem && (
              <div className={`flex items-center gap-2 mt-2 pt-2 border-t border-dark-700/50 ${showActions ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                <button onClick={() => handleReaction('up')} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${reaction === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-700'}`}>
                  <ThumbsUp size={12} className={reaction === 'up' ? 'fill-current' : ''} /> Helpful
                </button>
                <button onClick={() => handleReaction('down')} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${reaction === 'down' ? 'bg-red-500/20 text-red-400' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-700'}`}>
                  <ThumbsDown size={12} className={reaction === 'down' ? 'fill-current' : ''} /> Not helpful
                </button>
              </div>
            )}
          </div>

          {/* User timestamp */}
          {isUser && (
            <div className="px-4 pb-2 text-right">
              <span className="text-xs text-primary-200/60">{formatTime(message.timestamp)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Language → default file extension mapping.
const LANG_EXTENSIONS: Record<string, string> = {
  javascript: 'js', js: 'js', jsx: 'jsx',
  typescript: 'ts', ts: 'ts', tsx: 'tsx',
  html: 'html', css: 'css', scss: 'scss',
  json: 'json', yaml: 'yml', yml: 'yml',
  python: 'py', py: 'py',
  rust: 'rs', rs: 'rs',
  java: 'java', kotlin: 'kt',
  go: 'go', c: 'c', cpp: 'cpp', 'c++': 'cpp',
  shell: 'sh', bash: 'sh', sh: 'sh',
  sql: 'sql', graphql: 'graphql',
  markdown: 'md', md: 'md',
  xml: 'xml', svg: 'svg',
  dockerfile: 'dockerfile',
  ini: 'ini', toml: 'toml',
};

/**
 * CodeBlock — renders a syntax-highlighted code block with Copy + Save buttons.
 * The Save button uses the Tauri saveFileDialog + writeFile to persist the
 * code to disk (desktop only). In browser/demo mode it falls back to a
 * browser download via a Blob URL.
 */
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    const ext = LANG_EXTENSIONS[language.toLowerCase()] || 'txt';
    const defaultName = `codemate-snippet.${ext}`;

    if (isTauri) {
      // Desktop: use the native save dialog + write to the chosen path.
      try {
        const path = await fileCommands.saveFileDialog(defaultName);
        if (path) {
          await fileCommands.writeFile(path, code);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }
      } catch (e) {
        console.error('Save failed:', e);
      }
    } else {
      // Browser/demo: trigger a download via a Blob URL.
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-dark-700">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-900 rounded-t-lg border-b border-dark-700">
        <span className="text-xs text-dark-400 font-mono">{language}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-xs text-dark-500 hover:text-[var(--cm-primary)] transition-colors"
            title="Save to file"
          >
            {saved ? <Check size={12} className="text-emerald-400" /> : <Save size={12} />}
            <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-dark-500 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        style={oneDark as any}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', fontSize: '0.85rem' }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
