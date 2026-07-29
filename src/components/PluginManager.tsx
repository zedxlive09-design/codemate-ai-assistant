import React, { useState } from 'react';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: React.ReactNode;
  category: 'productivity' | 'development' | 'ai' | 'integration' | 'ui';
  status: 'installed' | 'available' | 'update-available' | 'disabled';
  rating: number;
  downloads: string;
  enabled: boolean;
  hasSettings: boolean;
  tags: string[];
}

const availablePlugins: Plugin[] = [
  {
    id: 'code-completion',
    name: 'AI Code Completion',
    description: 'Intelligent code autocomplete powered by local LLM',
    version: '1.2.0',
    author: 'CodeMate Team',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    category: 'ai',
    status: 'installed',
    rating: 4.8,
    downloads: '12.5K',
    enabled: true,
    hasSettings: true,
    tags: ['code', 'autocomplete', 'ai'],
  },
  {
    id: 'git-enhanced',
    name: 'Git Enhanced',
    description: 'Advanced git features with branch visualization and conflict resolution',
    version: '2.1.0',
    author: 'DevTools Co.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    category: 'development',
    status: 'installed',
    rating: 4.6,
    downloads: '8.3K',
    enabled: true,
    hasSettings: true,
    tags: ['git', 'version-control', 'branches'],
  },
  {
    id: 'markdown-preview',
    name: 'Markdown Preview',
    description: 'Live markdown preview with syntax highlighting and export options',
    version: '1.5.0',
    author: 'MD Tools',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    category: 'productivity',
    status: 'available',
    rating: 4.5,
    downloads: '15.2K',
    enabled: false,
    hasSettings: false,
    tags: ['markdown', 'preview', 'export'],
  },
  {
    id: 'database-explorer',
    name: 'Database Explorer',
    description: 'Browse, query, and manage SQLite databases visually',
    version: '1.0.3',
    author: 'DB Tools',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    category: 'development',
    status: 'available',
    rating: 4.3,
    downloads: '5.7K',
    enabled: false,
    hasSettings: true,
    tags: ['database', 'sqlite', 'query'],
  },
  {
    id: 'docker-integration',
    name: 'Docker Integration',
    description: 'Manage containers, images, and docker-compose files',
    version: '1.8.0',
    author: 'ContainerOps',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    category: 'integration',
    status: 'available',
    rating: 4.4,
    downloads: '6.1K',
    enabled: false,
    hasSettings: true,
    tags: ['docker', 'containers', 'devops'],
  },
  {
    id: 'theme-sync',
    name: 'Theme Sync',
    description: 'Sync your theme preferences across devices via cloud',
    version: '0.9.0',
    author: 'CloudSync',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    category: 'integration',
    status: 'update-available',
    rating: 4.1,
    downloads: '3.2K',
    enabled: true,
    hasSettings: true,
    tags: ['cloud', 'sync', 'themes'],
  },
  {
    id: 'emoji-picker',
    name: 'Emoji Picker Pro',
    description: 'Advanced emoji picker with search, categories, and custom emojis',
    version: '2.0.0',
    author: 'EmojiCo',
    icon: (
      <span className="text-xl">😀</span>
    ),
    category: 'ui',
    status: 'available',
    rating: 4.7,
    downloads: '18.9K',
    enabled: false,
    hasSettings: false,
    tags: ['emoji', 'picker', 'fun'],
  },
  {
    id: 'api-tester',
    name: 'API Tester',
    description: 'Test REST APIs with request builder and response viewer',
    version: '1.3.0',
    author: 'APITools',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    category: 'development',
    status: 'available',
    rating: 4.5,
    downloads: '9.4K',
    enabled: false,
    hasSettings: true,
    tags: ['api', 'testing', 'rest'],
  },
];

const categoryColors = {
  productivity: { bg: 'from-emerald-500 to-teal-500', text: 'text-emerald-400' },
  development: { bg: 'from-blue-500 to-indigo-500', text: 'text-blue-400' },
  ai: { bg: 'from-violet-500 to-purple-500', text: 'text-violet-400' },
  integration: { bg: 'from-orange-500 to-red-500', text: 'text-orange-400' },
  ui: { bg: 'from-pink-500 to-rose-500', text: 'text-pink-400' },
};

const statusConfig = {
  installed: { label: 'Installed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  available: { label: 'Available', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  'update-available': { label: 'Update', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  disabled: { label: 'Disabled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function PluginManager() {
  const [plugins, setPlugins] = useState<Plugin[]>(availablePlugins);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const togglePlugin = (pluginId: string) => {
    setPlugins(prev => prev.map(p => 
      p.id === pluginId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const installPlugin = (pluginId: string) => {
    setPlugins(prev => prev.map(p => 
      p.id === pluginId ? { ...p, status: 'installed' as const, enabled: true } : p
    ));
  };

  const categories = [
    { id: 'all', name: 'All Plugins', count: plugins.length },
    { id: 'productivity', name: 'Productivity', count: plugins.filter(p => p.category === 'productivity').length },
    { id: 'development', name: 'Development', count: plugins.filter(p => p.category === 'development').length },
    { id: 'ai', name: 'AI & ML', count: plugins.filter(p => p.category === 'ai').length },
    { id: 'integration', name: 'Integration', count: plugins.filter(p => p.category === 'integration').length },
    { id: 'ui', name: 'UI & UX', count: plugins.filter(p => p.category === 'ui').length },
  ];

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plugin.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="plugin-manager-container">
      {/* Header */}
      <div className="plugin-manager-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Plugin Manager</h2>
            <p className="text-xs text-slate-400">{plugins.filter(p => p.status === 'installed').length} plugins installed</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="plugin-search-box">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-500"
        />
      </div>

      {/* Categories */}
      <div className="plugin-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`plugin-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            <span>{cat.name}</span>
            <span className="plugin-count">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Plugin Grid/List */}
      <div className={`plugin-${viewMode}`}>
        {filteredPlugins.map(plugin => (
          <div
            key={plugin.id}
            className={`plugin-card glass-card-hover ${selectedPlugin?.id === plugin.id ? 'selected' : ''}`}
            onClick={() => setSelectedPlugin(plugin)}
          >
            <div className="plugin-card-header">
              <div className={`plugin-icon bg-gradient-to-br ${categoryColors[plugin.category].bg}`}>
                {plugin.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className={`plugin-status-badge ${statusConfig[plugin.status].color}`}>
                  {statusConfig[plugin.status].label}
                </span>
                {(plugin.status === 'installed' || plugin.status === 'update-available') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlugin(plugin.id); }}
                    className={`plugin-toggle-btn ${plugin.enabled ? 'enabled' : ''}`}
                  >
                    <span className="toggle-thumb-sm" />
                  </button>
                )}
              </div>
            </div>

            <div className="plugin-card-body">
              <h3 className="plugin-name">{plugin.name}</h3>
              <p className="plugin-description">{plugin.description}</p>
              
              <div className="plugin-meta">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs text-slate-300">{plugin.rating}</span>
                </div>
                <span className="text-xs text-slate-500">v{plugin.version}</span>
                <span className="text-xs text-slate-500">{plugin.downloads} ↓</span>
              </div>

              <div className="plugin-tags">
                {plugin.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="plugin-tag">{tag}</span>
                ))}
              </div>
            </div>

            {plugin.status === 'available' && (
              <button
                onClick={(e) => { e.stopPropagation(); installPlugin(plugin.id); }}
                className="plugin-install-btn"
              >
                Install
              </button>
            )}

            {plugin.status === 'update-available' && (
              <button
                onClick={(e) => { e.stopPropagation(); /* handle update */ }}
                className="plugin-update-btn"
              >
                Update
              </button>
            )}
          </div>
        ))}

        {filteredPlugins.length === 0 && (
          <div className="empty-plugins">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-lg font-medium text-slate-400">No plugins found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Plugin Detail Modal */}
      {selectedPlugin && (
        <div className="plugin-detail-overlay" onClick={() => setSelectedPlugin(null)}>
          <div className="plugin-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plugin-detail-header">
              <div className={`plugin-detail-icon bg-gradient-to-br ${categoryColors[selectedPlugin.category].bg}`}>
                {selectedPlugin.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{selectedPlugin.name}</h3>
                <p className="text-sm text-slate-400">by {selectedPlugin.author}</p>
              </div>
              <button
                onClick={() => setSelectedPlugin(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="plugin-detail-body">
              <p className="text-slate-300 mb-4">{selectedPlugin.description}</p>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="stat-card-mini">
                  <span className="stat-value">{selectedPlugin.rating}</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="stat-card-mini">
                  <span className="stat-value">{selectedPlugin.downloads}</span>
                  <span className="stat-label">Downloads</span>
                </div>
                <div className="stat-card-mini">
                  <span className="stat-value">v{selectedPlugin.version}</span>
                  <span className="stat-label">Version</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedPlugin.tags.map(tag => (
                    <span key={tag} className="plugin-tag">{tag}</span>
                  ))}
                </div>
              </div>

              {selectedPlugin.hasSettings && (
                <button className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configure Plugin
                </button>
              )}
            </div>

            <div className="plugin-detail-footer">
              {selectedPlugin.status === 'installed' || selectedPlugin.status === 'update-available' ? (
                <>
                  <button
                    onClick={() => { togglePlugin(selectedPlugin.id); setSelectedPlugin(null); }}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                      selectedPlugin.enabled 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {selectedPlugin.enabled ? 'Disable' : 'Enable'}
                  </button>
                  {selectedPlugin.status === 'update-available' && (
                    <button className="flex-1 py-2.5 px-4 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-all">
                      Update Now
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => { installPlugin(selectedPlugin.id); setSelectedPlugin(null); }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
                >
                  Install Plugin
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
