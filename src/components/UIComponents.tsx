import React from 'react';
import { useStore } from '../store/useStore';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 message-animate">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
        AI
      </div>
      
      {/* Typing bubble */}
      <div className="bg-dark-800/80 border border-dark-700/50 rounded-2xl rounded-tl-sm px-5 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-primary-400"></span>
          <span className="typing-dot w-2 h-2 rounded-full bg-primary-400"></span>
          <span className="typing-dot w-2 h-2 rounded-full bg-primary-400"></span>
        </div>
        
        {/* Optional status text */}
        <p className="text-xs text-dark-500 mt-2 ml-0.5">Thinking...</p>
      </div>
    </div>
  );
}

// Enhanced Model Status Badge
export function ModelStatusBadge() {
  const { modelLoaded, selectedModelId } = useStore();

  if (!selectedModelId) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-dark-700/50 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
        </span>
        <span className="text-dark-400">No Model</span>
      </div>
    );
  }

  const modelName = selectedModelId.split('/').pop()?.replace('.gguf', '') || 'Unknown';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
      modelLoaded 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : 'bg-dark-800/60 border-dark-700/50'
    }`}>
      {modelLoaded ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-medium">{modelName}</span>
          <span className="text-emerald-600">• Loaded</span>
        </>
      ) : (
        <>
          <svg className="animate-spin w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-dark-300">{modelName}</span>
          <span className="text-blue-400">• Loading</span>
        </>
      )}
    </div>
  );
}

// System Info Card
export function SystemInfoCard() {
  // Would be populated with actual system data
  return (
    <div className="p-4 rounded-xl bg-dark-800/40 border border-dark-700/30 space-y-3">
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        System Resources
      </h4>

      {/* CPU Usage */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-dark-400">CPU Usage</span>
          <span className="text-white">23%</span>
        </div>
        <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
          <div className="h-full w-[23%] bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full"></div>
        </div>
      </div>

      {/* Memory Usage */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-dark-400">Memory (RAM)</span>
          <span className="text-white">4.2 / 16 GB</span>
        </div>
        <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
          <div className="h-full w-[26%] bg-gradient-to-r from-purple-500 to-pink-400 rounded-full"></div>
        </div>
      </div>

      {/* GPU Memory (if available) */}
      <div className="opacity-50">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-dark-400">GPU Memory</span>
          <span className="text-dark-500">N/A (CPU Mode)</span>
        </div>
        <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
          <div className="h-full w-0 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

// Quick Stats Component
export function QuickStats() {
  const { conversations, isGenerating, projectPath } = useStore();
  
  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatBox 
        label="Chats"
        value={conversations.length.toString()}
        icon="💬"
        color="from-blue-500/20 to-blue-600/20"
        textColor="text-blue-400"
      />
      <StatBox 
        label="Messages"
        value={totalMessages.toString()}
        icon="📝"
        color="from-purple-500/20 to-purple-600/20"
        textColor="text-purple-400"
      />
      <StatBox 
        label="Status"
        value={isGenerating ? "Active" : "Idle"}
        icon={isGenerating ? "⚡" : "✓"}
        color={isGenerating ? "from-amber-500/20 to-orange-500/20" : "from-emerald-500/20 to-green-600/20"}
        textColor={isGenerating ? "text-amber-400" : "text-emerald-400"}
      />
    </div>
  );
}

function StatBox({ 
  label, 
  value, 
  icon,
  color,
  textColor 
}: { 
  label: string; 
  value: string; 
  icon: string;
  color: string;
  textColor: string;
}) {
  return (
    <div className={`p-3 rounded-xl bg-gradient-to-br ${color} border border-dark-700/30`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-dark-500">{label}</span>
      </div>
      <p className={`text-lg font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
