import React from 'react';
import { useStore } from '../store/useStore';
import { Brain, Sparkles, Shield, Zap, GlobeLock } from 'lucide-react';

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
  const { projectPath, toggleMemoryPanel } = useStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <div className="max-w-lg w-full text-center mb-10 float-animation relative z-10">
        {/* Logo - Enhanced with glassmorphism */}
        <div className="relative inline-block mb-6">
          {/* Multi-layer glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl blur-3xl opacity-30 animate-pulse" />
          <div className="absolute inset-2 bg-gradient-to-br from-primary-400/50 to-purple-500/50 rounded-3xl blur-xl opacity-40"></div>
          
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-400 to-purple-600 flex items-center justify-center shadow-2xl shadow-primary-500/30 border border-white/20 backdrop-blur-sm overflow-hidden">
            {/* Inner pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            <span className="text-white font-bold text-4xl tracking-tight relative z-10">AI</span>
            
            {/* Corner decorations */}
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full border-2 border-dark-900 flex items-center justify-center shadow-lg shadow-emerald-500/50">
              <Sparkles size={12} className="text-dark-900" />
            </div>
          </div>
        </div>

        {/* Title with gradient */}
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-white via-primary-200 to-purple-300 bg-clip-text text-transparent">
            CodeMate
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-dark-300 text-lg leading-relaxed max-w-md mx-auto mb-2">
          Your fully offline AI coding assistant
        </p>
        <p className="text-dark-500 text-sm leading-relaxed max-w-sm mx-auto">
          No internet required. Complete privacy. Everything runs locally.
        </p>
        
        {/* Status badges - Enhanced */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold ring-1 ring-emerald-500/25 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50"></span>
            100% Offline
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-500/15 text-purple-400 text-xs font-semibold ring-1 ring-purple-500/25 backdrop-blur-sm">
            <Shield size={12} />
            Private & Secure
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold ring-1 ring-blue-500/25 backdrop-blur-sm">
            <Brain size={12} />
            Smart Memory
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

      {/* Memory System Section */}
      <div className="max-w-2xl w-full mb-10 relative z-10">
        <div className="glass-card p-6 aurora-border">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 shrink-0">
              <Brain size={24} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                Project Memory System
                <span className="px-2 py-0.5 text-[10px] font-medium bg-primary-500/20 text-primary-300 rounded-full">NEW</span>
              </h3>
              <p className="text-sm text-dark-400 leading-relaxed mb-4">
                CodeMate learns from your interactions and remembers project context. 
                It understands your preferences, coding style, and project architecture.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { icon: '📝', label: 'CODEMATE.md', desc: 'Project instructions' },
                  { icon: '🧠', label: 'Auto-Learn', desc: 'From conversations' },
                  { icon: '🎯', label: 'Skills', desc: '8 built-in skills' },
                  { icon: '⚙️', label: 'Preferences', desc: 'Your settings' },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-dark-800/60 border border-dark-700/50 text-center">
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-[11px] font-medium text-dark-300 mt-1">{item.label}</p>
                    <p className="text-[10px] text-dark-500">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => toggleMemoryPanel()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40"
              >
                <Brain size={16} />
                Open Memory Panel
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
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
