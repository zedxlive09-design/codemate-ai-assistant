import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

interface StatsDashboardProps {
  onClose: () => void;
}

// Sample stats data
const generateUsageStats = () => ({
  totalConversations: 47,
  totalMessages: 1234,
  averageResponseTime: '1.2s',
  tokensGenerated: 456789,
  codeBlocksGenerated: 234,
  filesAnalyzed: 89,
  activeHours: 156,
});

const weeklyActivity = [
  { day: 'Mon', messages: 45, conversations: 5 },
  { day: 'Tue', messages: 62, conversations: 8 },
  { day: 'Wed', messages: 38, conversations: 4 },
  { day: 'Thu', messages: 71, conversations: 9 },
  { day: 'Fri', messages: 55, conversations: 6 },
  { day: 'Sat', messages: 28, conversations: 3 },
  { day: 'Sun', messages: 19, conversations: 2 },
];

const modelUsage = [
  { name: 'Llama 3 8B', percentage: 45, color: 'from-blue-500 to-cyan-500' },
  { name: 'Mistral 7B', percentage: 28, color: 'from-purple-500 to-pink-500' },
  { name: 'CodeLlama 7B', percentage: 18, color: 'from-amber-500 to-orange-500' },
  { name: 'Phi-3 Mini', percentage: 9, color: 'from-emerald-500 to-teal-500' },
];

const languageStats = [
  { language: 'TypeScript', files: 145, lines: 24500, percentage: 35 },
  { language: 'Python', files: 89, lines: 18200, percentage: 26 },
  { language: 'Rust', files: 34, lines: 8900, percentage: 13 },
  { language: 'JavaScript', files: 67, lines: 12400, percentage: 18 },
  { language: 'Other', files: 23, lines: 5100, percentage: 8 },
];

export default function StatsDashboard({ onClose }: StatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'models' | 'languages'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  
  const { conversations, isGenerating, inferenceSettings } = useStore();
  const usageStats = useMemo(() => generateUsageStats(), []);

  // Calculate actual stats from store
  const actualStats = useMemo(() => ({
    totalConversations: conversations.length,
    totalMessages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
    avgMessagesPerConversation: conversations.length > 0 
      ? Math.round(conversations.reduce((acc, c) => acc + c.messages.length, 0) / conversations.length)
      : 0,
  }), [conversations]);

  // Find max value for chart scaling
  const maxMessages = Math.max(...weeklyActivity.map(d => d.messages));

  return (
    <div className="h-full bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/25 pulse-glow">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Statistics Dashboard</h2>
            <p className="text-xs text-slate-400">Your AI assistant usage analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-800/60 rounded-lg">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  timeRange === range 
                    ? 'bg-violet-500/20 text-violet-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-800/60 bg-slate-900/50">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'activity', label: 'Activity', icon: '📈' },
          { id: 'models', label: 'Models', icon: '🤖' },
          { id: 'languages', label: 'Languages', icon: '💻' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-slate-700/80 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
              <MetricCard
                title="Conversations"
                value={actualStats.totalConversations.toString()}
                subtitle={`${usageStats.totalConversations} lifetime`}
                icon="💬"
                color="blue"
                trend="+12%"
              />
              <MetricCard
                title="Messages"
                value={actualStats.totalMessages.toString()}
                subtitle={`${usageStats.avgMessagesPerConversation} avg/chat`}
                icon="📝"
                color="violet"
                trend="+8%"
              />
              <MetricCard
                title="Tokens Used"
                value={(usageStats.tokensGenerated / 1000).toFixed(0) + 'K'}
                subtitle="Total generated"
                icon="⚡"
                color="amber"
                trend="+24%"
              />
              <MetricCard
                title="Active Time"
                value={usageStats.activeHours + 'h'}
                subtitle="This period"
                icon="⏱️"
                color="emerald"
                trend="+3h"
              />
            </div>

            {/* Quick Charts Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Weekly Activity Chart */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-300 mb-4">Weekly Activity</h3>
                <div className="flex items-end justify-between gap-2 h-32">
                  {weeklyActivity.map((day, i) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center justify-end h-28">
                        <div 
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500 hover:from-blue-500 hover:to-cyan-300"
                          style={{ height: `${(day.messages / maxMessages) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{day.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Usage Distribution */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-300 mb-4">Model Distribution</h3>
                <div className="space-y-3">
                  {modelUsage.map((model) => (
                    <div key={model.name} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 group-hover:text-white transition-colors">{model.name}</span>
                        <span className="text-slate-500">{model.percentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${model.color} transition-all duration-700`}
                          style={{ width: `${model.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <p className="text-2xl font-bold text-emerald-400 glow-text-emerald">{usageStats.averageResponseTime}</p>
                  <p className="text-xs text-slate-500 mt-1">Avg Response Time</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <p className="text-2xl font-bold text-blue-400 glow-text-blue">{usageStats.codeBlocksGenerated}</p>
                  <p className="text-xs text-slate-500 mt-1">Code Blocks Generated</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <p className="text-2xl font-bold text-violet-400 glow-text-violet">{usageStats.filesAnalyzed}</p>
                  <p className="text-xs text-slate-500 mt-1">Files Analyzed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Detailed Activity Chart */}
            <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-medium text-white">Message Activity</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-500" /> Messages
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-violet-500" /> Conversations
                  </span>
                </div>
              </div>
              
              <div className="relative h-48">
                <svg className="w-full h-full" viewBox="0 0 350 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0" y1={150 - y * 1.3}
                      x2="350" y2={150 - y * 1.3}
                      stroke="rgba(71, 85, 105, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="4"
                    />
                  ))}
                  
                  {/* Area fill for messages */}
                  <path
                    d={`M0,${150 - weeklyActivity[0].messages * 1.8} ${weeklyActivity.map((d, i) => 
                      `L${i * (350 / 6)},${150 - d.messages * 1.8}`
                    ).join(' ')} L350,150 L0,150 Z`}
                    fill="url(#gradientCyan)"
                    opacity="0.2"
                  />
                  
                  {/* Line for messages */}
                  <path
                    d={`M0,${150 - weeklyActivity[0].messages * 1.8} ${weeklyActivity.map((d, i) => 
                      `L${i * (350 / 6)},${150 - d.messages * 1.8}`
                    ).join(' ')}`}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="gradientCyan" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 pt-2">
                  {weeklyActivity.map(d => (
                    <span key={d.day}>{d.day}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Table */}
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Day</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Messages</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Chats</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyActivity.map((day) => (
                    <tr key={day.day} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-2.5 text-white font-medium">{day.day}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{day.messages}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{day.conversations}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          +{(Math.random() * 20 + 5).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Model Cards */}
            <div className="space-y-4">
              {modelUsage.map((model, index) => (
                <div key={model.name} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center text-white font-bold text-lg shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                      #{index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">{model.name}</h3>
                      <p className="text-xs text-slate-500">Used in {(Math.floor(Math.random() * 50 + 10))} conversations</p>
                      
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${model.color}`}
                            style={{ width: `${model.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-10 text-right">{model.percentage}%</span>
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="text-lg font-semibold text-white">{model.percentage}%</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Usage Share</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Inference Settings */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Current Inference Settings</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/50 text-center">
                  <p className="text-xs text-slate-500">Temperature</p>
                  <p className="text-sm font-mono text-cyan-400">{inferenceSettings.temperature}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 text-center">
                  <p className="text-xs text-slate-500">Top P</p>
                  <p className="text-sm font-mono text-violet-400">{inferenceSettings.topP}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 text-center">
                  <p className="text-xs text-slate-500">Max Tokens</p>
                  <p className="text-sm font-mono text-emerald-400">{inferenceSettings.maxTokens}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'languages' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Language Stats */}
            <div className="space-y-3">
              {languageStats.map((lang) => (
                <div key={lang.language} className="group p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                      lang.language === 'TypeScript' ? 'bg-blue-500/20 text-blue-400' :
                      lang.language === 'Python' ? 'bg-yellow-500/20 text-yellow-400' :
                      lang.language === 'Rust' ? 'bg-orange-500/20 text-orange-400' :
                      lang.language === 'JavaScript' ? 'bg-yellow-300/20 text-yellow-300' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {lang.language.slice(0, 2)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{lang.language}</span>
                        <span className="text-xs text-slate-500">{lang.percentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${lang.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                        <span>{lang.files} files</span>
                        <span>•</span>
                        <span>{lang.lines.toLocaleString()} lines</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Project Overview</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total of {languageStats.reduce((acc, l) => acc + l.files, 0)} files across {languageStats.length} languages
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                    {languageStats.reduce((acc, l) => acc + l.lines, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500">Total Lines</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="px-6 py-3 border-t border-slate-800 bg-slate-850/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs text-slate-500">
            {isGenerating ? 'Processing...' : 'Last updated just now'}
          </span>
        </div>
        <span className="text-xs text-slate-600">
          CodeMate Analytics v2.0
        </span>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, subtitle, icon, color, trend }: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  trend: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    violet: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
    emerald: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} border transition-all duration-200 hover:scale-[1.02] group cursor-default`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{title}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}
