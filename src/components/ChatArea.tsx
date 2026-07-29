import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

export default function ChatArea() {
  const {
    conversations,
    activeConversationId,
    createConversation,
  } = useStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Create new chat if none exists
  const handleStartChat = () => {
    createConversation('New Conversation');
  };

  // Empty state - Show Welcome Screen
  if (!activeConversation) {
    return <WelcomeScreen onStartChat={handleStartChat} />;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-dark-800/70 bg-dark-900/40 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-medium text-white truncate flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {activeConversation.title}
          </h2>
          {activeConversation.projectPath && (
            <p className="text-xs text-dark-500 mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {activeConversation.projectPath.split('/').pop()}
            </p>
          )}
        </div>

        {/* Chat stats */}
        <div className="flex items-center gap-3 text-xs text-dark-500">
          <span>{activeConversation.messages.length} messages</span>
          <span>•</span>
          <time dateTime={activeConversation.updatedAt instanceof Date ? activeConversation.updatedAt.toISOString() : String(activeConversation.updatedAt)}>
            {formatRelativeTime(activeConversation.updatedAt instanceof Date ? activeConversation.updatedAt : new Date(activeConversation.updatedAt))}
          </time>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {activeConversation.messages.length === 0 ? (
          /* Empty chat state */
          <div className="flex items-center justify-center h-full text-dark-500 slide-up">
            <div className="text-center max-w-md">
              {/* Empty state illustration */}
              <div className="w-20 h-20 mx-auto mb-5 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                <svg className="relative w-full h-full text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-dark-400">No messages yet</p>
              <p className="text-sm mt-1 text-dark-600">Start a conversation by typing below</p>
              
              {/* Suggestion chips */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  'Explain this code',
                  'Help me debug',
                  'Write a function',
                  'Optimize performance'
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleStartChat()}
                    className="px-3 py-1.5 text-xs bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 rounded-lg transition-all text-dark-400 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages list */
          <div className="max-w-4xl mx-auto space-y-4">
            {activeConversation.messages.map((message, index) => (
              <div 
                key={message.id}
                className={`message-animate ${index === 0 ? '' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MessageBubble message={message} />
                
                {/* Add subtle separator between messages */}
                {index < (activeConversation.messages.length - 1) && (
                  <div className="my-4 mx-8 h-px bg-gradient-to-r from-transparent via-dark-800 to-transparent opacity-50" />
                )}
              </div>
            ))}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput conversationId={activeConversation.id} />
    </div>
  );
}

// Helper: Format time relatively
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) return 'Just now';
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Fallback to formatted date
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
