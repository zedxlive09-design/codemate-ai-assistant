import React, { useState } from 'react';
import { useStore } from '../store/useStore';

interface ProfilePanelProps {
  onClose?: () => void;
}

// Sample user profile data
const defaultProfile = {
  name: 'Developer',
  email: 'dev@codemate.ai',
  avatar: null,
  role: 'AI Developer',
  location: 'Remote',
  bio: 'Building the future of offline AI assistants',
  joinDate: new Date('2024-01-15'),
  stats: {
    totalConversations: 47,
    codeSnippetsCreated: 156,
    filesProcessed: 234,
    hoursSaved: 89,
  },
  achievements: [
    { id: 'first-chat', name: 'First Conversation', icon: '💬', description: 'Started your first AI chat', unlocked: true },
    { id: 'code-master', name: 'Code Master', icon: '👨‍💻', description: 'Generated 100+ code snippets', unlocked: true },
    { id: 'explorer', name: 'Explorer', icon: '🗺️', description: 'Used all panel features', unlocked: true },
    { id: 'night-owl', name: 'Night Owl', icon: '🦉', description: 'Used app after midnight', unlocked: false },
    { id: 'power-user', name: 'Power User', icon: '⚡', description: 'Used 20+ keyboard shortcuts', unlocked: true },
    { id: 'model-collector', name: 'Model Collector', icon: '🤖', description: 'Downloaded 5+ AI models', unlocked: false },
  ],
  recentActivity: [
    { action: 'Chat completed', detail: 'Discussed React optimization', time: '2 min ago' },
    { action: 'Code generated', detail: 'TypeScript utility function', time: '15 min ago' },
    { action: 'File analyzed', detail: 'src/App.tsx reviewed', time: '1 hour ago' },
    { action: 'Model loaded', detail: 'Llama 3 8B Q4_K_M', time: '3 hours ago' },
  ],
};

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
  const [profile] = useState(defaultProfile);
  const [activeSection, setActiveSection] = useState<'profile' | 'achievements' | 'activity'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  
  const { conversations, settings } = useStore();

  // Calculate actual stats
  const actualStats = {
    ...profile.stats,
    totalConversations: conversations.length,
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 shrink-0">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          User Profile
        </h2>
        
        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-800/60 rounded-lg">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'achievements', label: 'Badges' },
            { id: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                activeSection === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {activeSection === 'profile' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-cyan-500/25 cursor-pointer hover:shadow-cyan-500/40 transition-shadow">
                  {profile.name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                  <span className="text-[8px]">✓</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white truncate">{profile.name}</h3>
                <p className="text-xs text-slate-400">{profile.role}</p>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.location}
                </p>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            {/* Bio */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Bio</label>
              <p className="text-sm text-slate-300 mt-1">{profile.bio}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                icon="💬" 
                label="Conversations" 
                value={actualStats.totalConversations.toString()} 
                color="blue"
              />
              <StatCard 
                icon="📝" 
                label="Code Snippets" 
                value={actualStats.codeSnippetsCreated.toString()} 
                color="violet"
              />
              <StatCard 
                icon="📁" 
                label="Files Processed" 
                value={actualStats.filesProcessed.toString()} 
                color="emerald"
              />
              <StatCard 
                icon="⏱️" 
                label="Hours Saved" 
                value={actualStats.hoursSaved.toString()} 
                color="amber"
              />
            </div>

            {/* Settings Summary */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Current Settings
              </h4>
              
              <div className="space-y-2">
                <SettingRow label="Language" value={settings.language === 'both' ? 'English + Urdu' : settings.language} />
                <SettingRow label="Theme" value={settings.theme === 'dark' ? 'Dark Mode' : settings.theme} />
                <SettingRow label="Font Size" value={settings.fontSize} />
                <SettingRow label="Auto Save" value={settings.autoSave ? 'Enabled' : 'Disabled'} />
                <SettingRow label="Stream Response" value={settings.streamResponse ? 'Enabled' : 'Disabled'} />
              </div>
            </div>

            {/* Member Since */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/5 to-violet-500/5 border border-slate-700/30 flex items-center justify-between">
              <span className="text-xs text-slate-400">Member since</span>
              <span className="text-xs font-medium text-white">{formatDate(profile.joinDate)}</span>
            </div>
          </div>
        )}

        {activeSection === 'achievements' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="text-center mb-4">
              <p className="text-xs text-slate-400">
                {profile.achievements.filter(a => a.unlocked).length} of {profile.achievements.length} badges earned
              </p>
              <div className="w-full h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(profile.achievements.filter(a => a.unlocked).length / profile.achievements.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {profile.achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`p-3 rounded-xl border transition-all ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
                      : 'bg-slate-800/30 border-slate-700/30 opacity-60'
                  }`}
                >
                  <div className={`text-2xl mb-2 ${!achievement.unlocked && 'grayscale'}`}>
                    {achievement.icon}
                  </div>
                  <h4 className={`text-xs font-semibold ${achievement.unlocked ? 'text-white' : 'text-slate-500'}`}>
                    {achievement.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{achievement.description}</p>
                  
                  {achievement.unlocked && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlocked
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'activity' && (
          <div className="space-y-3 animate-fadeIn">
            <h4 className="text-xs font-semibold text-slate-300">Recent Activity</h4>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700/50" />
              
              <div className="space-y-3">
                {profile.recentActivity.map((activity, index) => (
                  <div key={index} className="relative pl-10 group">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-600 group-hover:border-cyan-400 transition-colors" />
                    
                    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-white">{activity.action}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{activity.detail}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 whitespace-nowrap ml-2">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Load More */}
            <button className="w-full py-2 text-xs text-slate-400 hover:text-white border border-dashed border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors">
              Load more activity...
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 p-3 border-t border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <button className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Data
          </button>
          <button className="flex-1 py-2 px-3 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
    violet: 'from-violet-500/10 to-purple-500/10 border-violet-500/20',
    emerald: 'from-emerald-500/10 to-green-500/10 border-emerald-500/20',
    amber: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
  };

  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  };

  return (
    <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} border ${color} transition-transform hover:scale-[1.02]`}>
      <div className="text-lg mb-1">{icon}</div>
      <p className={`text-lg font-bold ${textColors[color]}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

// Setting Row Component
function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-medium text-white">{value}</span>
    </div>
  );
}
