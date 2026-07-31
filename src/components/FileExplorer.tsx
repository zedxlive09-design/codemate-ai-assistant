import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { fileCommands, projectCommands } from '../lib/tauri';
import type { ProjectFile } from '../types';

export default function FileExplorer() {
  const {
    projectPath,
    setProjectPath,
    projectFiles,
    setProjectFiles,
    selectedFile,
    setSelectedFile,
    fileContent,
    setFileContent,
    projectAnalysis,
    setProjectAnalysis,
  } = useStore();

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'analysis'>('files');

  // Load project files when path changes
  useEffect(() => {
    if (projectPath) {
      loadProjectFiles();
    }
  }, [projectPath]);

  const loadProjectFiles = async () => {
    if (!projectPath) return;
    
    setLoading(true);
    try {
      const files = await projectCommands.listDirectory(projectPath, true);
      setProjectFiles(files);
      
      // Auto-expand root
      setExpandedDirs(new Set([projectPath]));
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (filePath: string) => {
    setSelectedFile(filePath);
    try {
      const content = await fileCommands.readFile(filePath);
      setFileContent(content);
    } catch (error) {
      console.error('Failed to read file:', error);
      setFileContent(null);
    }
  };

  const analyzeProject = async () => {
    if (!projectPath) return;
    
    setLoading(true);
    try {
      const analysis = await projectCommands.analyzeProject(projectPath);
      setProjectAnalysis(analysis);
      setActiveTab('analysis');
    } catch (error) {
      console.error('Failed to analyze project:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (name: string, isDir: boolean) => {
    if (isDir) return '📁';
    
    const ext = name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      ts: '🔷',
      tsx: '⚛️',
      js: '🟨',
      jsx: '⚛️',
      py: '🐍',
      rs: '🦀',
      go: '🐹',
      java: '☕',
      json: '📋',
      md: '📝',
      css: '🎨',
      html: '🌐',
      sql: '🗃️',
      sh: '💻',
      yaml: '⚙️',
      yml: '⚙️',
      toml: '⚙️',
      env: '🔒',
      gitignore: '📝',
    };
    
    return icons[ext || ''] || '📄';
  };

  const getLanguageColor = (language: string): string => {
    const colors: Record<string, string> = {
      TypeScript: '#3178c6',
      JavaScript: '#f7df1e',
      Python: '#3572A5',
      Rust: '#dea584',
      Go: '#00ADD8',
      Java: '#b07219',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Shell: '#89e051',
      JSON: '#292929',
      Markdown: '#083fa1',
    };
    return colors[language] || '#6e7681';
  };

  // Filter files by search
  const filterFiles = (files: ProjectFile[], query: string): ProjectFile[] => {
    if (!query) return files;
    
    return files.reduce((acc, file) => {
      if (file.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(file);
      } else if (file.isDirectory && file.children) {
        const filteredChildren = filterFiles(file.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...file, children: filteredChildren });
        }
      }
      return acc;
    }, [] as ProjectFile[]);
  };

  const filteredFiles = filterFiles(projectFiles, searchQuery);

  // Render file tree
  const renderFileTree = (files: ProjectFile[], depth: number = 0) => (
    <div className="space-y-0.5">
      {files.map((file) => (
        <div key={file.path}>
          <div
            onClick={() => {
              if (file.isDirectory) {
                toggleDir(file.path);
              } else {
                loadFileContent(file.path);
              }
            }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
              selectedFile === file.path
                ? 'bg-primary-600/20 text-primary-400'
                : 'hover:bg-dark-800 text-dark-300 hover:text-white'
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <span className="text-sm">{getFileIcon(file.name, file.isDirectory)}</span>
            <span className="flex-1 truncate text-sm">{file.name}</span>
            
            {!file.isDirectory && file.size !== undefined && (
              <span className="text-xs text-dark-600 opacity-0 group-hover:opacity-100">
                {formatFileSize(file.size)}
              </span>
            )}
            
            {file.isDirectory && (
              <svg 
                className={`w-4 h-4 text-dark-500 transition-transform ${expandedDirs.has(file.path) ? 'rotate-90' : ''}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
          
          {file.isDirectory && expandedDirs.has(file.path) && file.children && (
            renderFileTree(file.children, depth + 1)
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-dark-800">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Explorer
        </h3>
        
        {projectPath && (
          <p className="text-xs text-dark-500 mt-1 truncate">{projectPath}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-800">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'files' 
              ? 'text-primary-400 border-b-2 border-primary-400' 
              : 'text-dark-500 hover:text-dark-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'analysis' 
              ? 'text-primary-400 border-b-2 border-primary-400' 
              : 'text-dark-500 hover:text-dark-300'
          }`}
        >
          Analysis
        </button>
      </div>

      {/* Search & Actions */}
      <div className="p-3 space-y-3 border-b border-dark-800">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm focus:outline-none focus:border-primary-500 text-white placeholder-dark-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={analyzeProject}
            disabled={!projectPath || loading}
            className="flex-1 py-2 px-3 bg-dark-800 hover:bg-dark-700 rounded-lg text-sm text-dark-300 hover:text-white transition-colors disabled:opacity-50"
          >
            📊 Analyze
          </button>
          <button
            onClick={loadProjectFiles}
            disabled={!projectPath || loading}
            className="flex-1 py-2 px-3 bg-dark-800 hover:bg-dark-700 rounded-lg text-sm text-dark-300 hover:text-white transition-colors disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-dark-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : !projectPath ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <svg className="w-12 h-12 text-dark-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm text-dark-400">No project opened</p>
            <p className="text-xs text-dark-500 mt-1">Open a folder to explore</p>
          </div>
        ) : activeTab === 'files' ? (
          filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-dark-500 text-sm">
              No files found
            </div>
          ) : (
            <div className="py-2">
              {renderFileTree(filteredFiles)}
            </div>
          )
        ) : (
          /* Analysis Tab */
          <div className="p-4 space-y-4">
            {!projectAnalysis ? (
              <div className="text-center text-dark-500 text-sm py-8">
                Click "Analyze" to see project insights
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Total Files" value={projectAnalysis.totalFiles.toString()} icon="📄" />
                  <StatCard label="Total Lines" value={formatNumber(projectAnalysis.totalLines)} icon="📏" />
                </div>

                {/* Languages */}
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Languages</h4>
                  <div className="space-y-2">
                    {projectAnalysis.languages.map((lang) => (
                      <div key={lang.language}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-dark-300">{lang.language}</span>
                          <span className="text-dark-500">{lang.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${lang.percentage}%`,
                              backgroundColor: getLanguageColor(lang.language)
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs mt-0.5">
                          <span className="text-dark-600">{lang.files} files</span>
                          <span className="text-dark-600">{formatNumber(lang.lines)} lines</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Summary</h4>
                  <p className="text-xs text-dark-400 leading-relaxed">{projectAnalysis.summary}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected File Preview */}
      {selectedFile && activeTab === 'files' && (
        <div className="border-t border-dark-800 max-h-[40%] flex flex-col">
          <div className="px-4 py-2 bg-dark-900 flex items-center justify-between">
            <span className="text-xs text-dark-400 truncate flex-1">{selectedFile.split('/').pop()}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-dark-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 bg-dark-950">
            {fileContent ? (
              <pre className="text-xs text-dark-300 font-mono whitespace-pre-wrap break-words">
                {fileContent.slice(0, 2000)}
                {fileContent.length > 2000 && '\n... (truncated)'}
              </pre>
            ) : (
              <div className="text-dark-500 text-sm">Loading...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components
function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-dark-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-dark-500">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
