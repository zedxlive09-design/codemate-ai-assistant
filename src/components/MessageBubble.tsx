import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`message-animate flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-md'
            : isSystem
            ? 'bg-dark-800 text-dark-300 border border-dark-700'
            : 'bg-dark-800 text-dark-100 border border-dark-700 rounded-bl-md'
        }`}
      >
        {/* Message Header */}
        {!isUser && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              AI
            </div>
            <span className="text-sm font-medium text-primary-400">CodeMate</span>
            <span className="text-xs text-dark-500">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Message Content */}
        <div className={`px-4 pb-3 ${isUser ? 'pt-3' : ''}`}>
          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-invert prose-dark'}`}>
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  
                  if (isInline) {
                    return (
                      <code 
                        className={`${className} px-1.5 py-0.5 rounded bg-dark-700 text-pink-400 text-sm font-mono`} 
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  
                  return (
                    <div className="relative group my-3">
                      {/* Language label */}
                      <div className="flex items-center justify-between px-4 py-2 bg-dark-900 rounded-t-lg border-b border-dark-700">
                        <span className="text-xs text-dark-400 font-mono">{match[1]}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                          className="text-xs text-dark-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Copy
                        </button>
                      </div>
                      <SyntaxHighlighter
                        // @ts-expect-error Style type mismatch from library
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0 0 0.5rem 0.5rem',
                          fontSize: '0.85rem',
                        }}
                        showLineNumbers
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                },
                li({ children }) {
                  return <li className="text-dark-200">{children}</li>;
                },
                h1({ children }) {
                  return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-base font-semibold text-white mt-2 mb-1">{children}</h3>;
                },
                strong({ children }) {
                  return <strong className="text-white font-semibold">{children}</strong>;
                },
                a({ href, children }) {
                  return (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 underline"
                    >
                      {children}
                    </a>
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-primary-500 pl-4 py-2 my-2 bg-dark-900/50 rounded-r-lg">
                      {children}
                    </blockquote>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full divide-y divide-dark-700">{children}</table>
                    </div>
                  );
                },
                th({ children }) {
                  return <th className="px-3 py-2 bg-dark-900 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-3 py-2 text-sm text-dark-300 border-t border-dark-800">{children}</td>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Attached files */}
          {message.files && message.files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.files.map((file, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-dark-700 rounded text-xs"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {file.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* User timestamp */}
        {isUser && (
          <div className="px-4 pb-2 text-right">
            <span className="text-xs text-primary-200/60">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
