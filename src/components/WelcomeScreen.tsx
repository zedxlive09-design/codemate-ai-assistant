import React from 'react';
import { useStore } from '../store/useStore';

interface WelcomeScreenProps {
  onStartChat: () => void;
}

const quickActions = [
  {
    id: 'explain-project',
    title: 'Explain this project',
    description: 'Analyze the current project structure and explain its purpose',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: 'from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500/30 hover:border-yellow-400/50',
    textColor: 'text-yellow-300',
  },
  {
    id: 'create-component',
    title: 'Create a React component',
    description: 'Generate a new component with TypeScript, props, and styling',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    color: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400/50',
    textColor: 'text-cyan-300',
  },
  {
    id: 'debug-api',
    title: 'Help debug my API endpoint',
    description: 'Find bugs, fix errors, and optimize your API code',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    color: 'from-red-500/20 to-pink-500/20',
    borderColor: 'border-red-500/30 hover:border-red-400/50',
    textColor: 'text-red-300',
  },
  {
    id: 'write-tests',
    title: 'Write unit tests',
    description: 'Generate comprehensive test cases for your functions',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30 hover:border-green-400/50',
    textColor: 'text-green-300',
  },
  {
    id: 'optimize-code',
    title: 'Optimize performance',
    description: 'Review code for performance bottlenecks and suggest improvements',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'from-purple-500/20 to-violet-500/20',
    borderColor: 'border-purple-500/30 hover:border-purple-400/50',
    textColor: 'text-purple-300',
  },
  {
    id: 'write-docs',
    title: 'Generate documentation',
    description: 'Create clear documentation for your code or API',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'from-blue-500/20 to-indigo-500/20',
    borderColor: 'border-blue-500/30 hover:border-blue-400/50',
    textColor: 'text-blue-300',
  },
];

export default function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const { projectPath } = useStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      {/* Hero Section */}
      <div className="max-w-lg w-full text-center mb-10 float-animation">
        {/* Logo */}
        <div className="relative inline-block mb-6">
          {/* Glow effect behind logo */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl blur-2xl opacity-40 animate-pulse" />
          
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-400 to-purple-600 flex items-center justify-center shadow-xl shadow-primary-500/30 border border-white/10">
            <span className="text-white font-bold text-3xl tracking-tight">AI</span>
            
            {/* Corner decorations */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-dark-900 flex items-center justify-center shadow-lg">
              <span className="text-[10px] font-bold text-dark-900">✓</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-3">
          <span className="gradient-text">Welcome to CodeMate</span>
        </h1>

        {/* Subtitle */}
        <p className="text-dark-400 text-base leading-relaxed max-w-md mx-auto">
          Your fully offline AI coding assistant. No internet, no data sent to external servers.
          Everything runs locally on your machine with complete privacy.
        </p>
        
        {/* Status badges */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            100% Offline
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 text-xs font-medium ring-1 ring-purple-500/25">
            🔒 Private & Secure
          </span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-10">
        <FeatureCard 
          emoji="💻"
          title="Code Generation"
          description="Write, refactor, and generate code in any language"
          gradient="from-blue-500 to-cyan-500"
        />
        <FeatureCard 
          emoji="🐛"
          title="Debug & Fix"
          description="Find bugs with detailed explanations and solutions"
          gradient="from-orange-500 to-red-500"
        />
        <FeatureCard 
          emoji="📁"
          title="File Operations"
          description="Read, write, edit files and analyze projects"
          gradient="from-violet-500 to-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="max-w-2xl w-full mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">
            ✨ Quick Start
          </h3>
          {projectPath && (
            <span className="text-xs text-dark-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
              Project loaded
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={onStartChat}
              className={`
                group relative p-4 text-left rounded-xl border transition-all duration-200
                bg-gradient-to-br ${action.color} ${action.borderColor}
                hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
              `}
            >
              <div className={`flex items-start gap-3`}>
                <div className={`p-2 rounded-lg bg-dark-800/80 ${action.textColor}`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${action.textColor} group-hover:text-white transition-colors`}>
                    {action.title}
                  </p>
                  <p className="text-xs text-dark-400 mt-1 line-clamp-2 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
              
              {/* Arrow indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                <svg className={`w-4 h-4 ${action.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="flex items-center gap-4 text-xs text-dark-500">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 font-mono">K</kbd>
        </div>
        <span>to open command palette</span>
        
        <span className="mx-2 text-dark-700">|</span>
        
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 font-mono">?</kbd>
        </div>
        <span>for shortcuts</span>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ 
  emoji, 
  title, 
  description, 
  gradient 
}: { 
  emoji: string; 
  title: string; 
  description: string;
  gradient: string;
}) {
  return (
    <div className="card-glow p-5 text-center group cursor-default">
      <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 transform duration-300 shadow-lg`}>
        {emoji}
      </div>
      <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-dark-400 leading-relaxed">{description}</p>
      
      {/* Urdu subtitle */}
      <p className="urdu-text text-xs text-dark-600 mt-2">{getUrduTitle(title)}</p>
    </div>
  );
}

function getUrduTitle(title: string): string {
  const urduMap: Record<string, string> = {
    'Code Generation': 'کوڈ کی تخلیق',
    'Debug & Fix': 'ڈیبگنگ اور اصلاح',
    'File Operations': 'فائل آپریشنز',
  };
  return urduMap[title] || '';
}
