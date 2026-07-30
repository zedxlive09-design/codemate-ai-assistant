import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  isHead: boolean;
}

interface FileDiff {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

interface GitPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GitPanel({ isOpen, onClose }: GitPanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'commits' | 'diff'>('status');
  
  const { projectPath } = useStore();
  const { showToast } = useToast();
  
  // Simulated git data (in real app, this would come from git commands)
  const [gitStatus] = useState<GitStatus>({
    branch: 'main',
    ahead: 0,
    behind: 2,
    staged: 3,
    modified: 5,
    untracked: 2,
  });
  
  const [commits] = useState<Commit[]>([
    {
      hash: 'a1b2c3d4',
      message: 'feat: Add AI code completion feature',
      author: 'Developer',
      date: '2 hours ago',
      isHead: true,
    },
    {
      hash: 'e5f6g7h8',
      message: 'fix: Resolve memory leak in terminal',
      author: 'Developer',
      date: '5 hours ago',
      isHead: false,
    },
    {
      hash: 'i9j0k1l2',
      message: 'refactor: Improve error handling',
      author: 'Developer',
      date: '1 day ago',
      isHead: false,
    },
    {
      hash: 'm3n4o5p6',
      message: 'docs: Update README with new features',
      author: 'Developer',
      date: '2 days ago',
      isHead: false,
    },
  ]);
  
  const [fileDiffs] = useState<FileDiff[]>([
    { file: 'src/App.tsx', status: 'modified', additions: 15, deletions: 3 },
    { file: 'src/components/ChatArea.tsx', status: 'modified', additions: 42, deletions: 8 },
    { file: 'src/store/useStore.ts', status: 'modified', additions: 12, deletions: 2 },
    { file: 'src/utils/api.ts', status: 'added', additions: 67, deletions: 0 },
    { file: 'src/components/NewFeature.tsx', status: 'deleted', additions: 0, deletions: 23 },
  ]);

  // Stats calculations
  const stats = useMemo(() => ({
    totalChanges: fileDiffs.reduce((acc, f) => acc + f.additions + f.deletions, 0),
    filesChanged: fileDiffs.length,
    additions: fileDiffs.reduce((acc, f) => acc + f.additions, 0),
    deletions: fileDiffs.reduce((acc, f) => acc + f.deletions, 0),
  }), [fileDiffs]);

  // Simulate git operations
  const handleRefresh = () => {
    showToast('Git status refreshed', 'info');
  };

  const handleStageAll = () => {
    showToast('All changes staged successfully', 'success');
  };

  const handleUnstageAll = () => {
    showToast('All changes unstaged', 'info');
  };

  const handleCommit = async () => {
    if (!gitStatus.staged && !gitStatus.modified) {
      showToast('No changes to commit', 'warning');
      return;
    }
    showToast('Changes committed successfully!', 'success');
  };

  const handlePush = async () => {
    if (gitStatus.behind > 0) {
      showToast(`Pulling ${gitStatus.behind} commits before push...`, 'info');
    }
    showToast('Pushed to remote successfully!', 'success');
  };

  const handlePull = async () => {
    showToast('Pulled latest changes from remote', 'success');
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'added': return 'bg-emerald-500/15 text-emerald-400';
      case 'modified': return 'bg-amber-500/15 text-amber-400';
      case 'deleted': return 'bg-red-500/15 text-red-400';
      default: return 'bg-slate-500/15 text-slate-400';
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-[400px] bg-dark-900/95 backdrop-blur-sm border-l border-dark-800/70 flex flex-col slide-down overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h2 className="text-sm font-semibold text-white">Git</h2>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-dark-800/60 shrink-0">
        <button
          onClick={() => setActiveTab('status')}
          className={activeTab === 'status' ? "px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-primary-500/20 text-primary-400" : "px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-dark-500 hover:text-dark-300 hover:bg-dark-800/50"}
        >
          Status
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/30">
            {gitStatus.staged + gitStatus.modified}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('commits')}
          className={activeTab === 'commits' ? "px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-primary-500/20 text-primary-400" : "px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-dark-500 hover:text-dark-300 hover:bg-dark-800/50"}
        >
          Commits
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/30">
            {commits.length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('diff')}
          className={activeTab === 'diff' ? "px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-primary-500/20 text-primary-400" : "px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-dark-500 hover:text-dark-300 hover:bg-dark-800/50"}
        >
          Diff
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/30">
            {fileDiffs.length}
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status Tab Content */}
        {activeTab === 'status' && (
          <>
            {/* Branch Info */}
            <div className="bg-dark-800/40 rounded-xl p-4 border border-dark-700/50 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v6m0 0l6-6m-6 6h-6" />
                  </svg>
                  <span className="text-sm font-medium text-white">{gitStatus.branch}</span>
                </div>
                
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
                  Current
                </span>
              </div>

              {/* Sync Status */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 bg-dark-900/50 rounded-lg border border-dark-800/50">
                  <p className="text-lg font-bold text-white">{gitStatus.ahead}</p>
                  <p className="text-[10px] text-dark-500">Ahead</p>
                </div>
                <div className="text-center p-2 bg-dark-900/50 rounded-lg border border-dark-800/50">
                  <p className="text-lg font-bold text-white">{gitStatus.behind}</p>
                  <p className="text-[10px] text-dark-500">Behind</p>
                </div>
                <div className="text-center p-2 bg-dark-900/50 rounded-lg border border-dark-800/50">
                  <p className="text-lg font-bold text-white">{gitStatus.untracked}</p>
                  <p className="text-[10px] text-dark-500">Untracked</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleStageAll}
                  className="flex-1 btn-primary py-2 rounded-lg text-xs"
                >
                  Stage All
                </button>
                <button 
                  onClick={handleUnstageAll}
                  className="flex-1 btn-secondary py-2 rounded-lg text-xs"
                >
                  Unstage All
                </button>
              </div>
            </div>

            {/* Changes Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
                Changes Summary
              </h3>
              
              <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/40">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dark-700/50 bg-dark-850/50">
                      <th className="text-left px-3 py-2 text-dark-400 font-medium">File</th>
                      <th className="text-center px-3 py-2 text-dark-400 font-medium w-16">Status</th>
                      <th className="text-right px-3 py-2 text-dark-400 font-medium w-16">+</th>
                      <th className="text-right px-3 py-2 text-dark-400 font-medium w-16">-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileDiffs.map((diff) => (
                      <tr key={diff.file} className="border-b border-dark-800/30 last:border-0">
                        <td className="px-3 py-2 text-dark-200 truncate max-w-[180px]" title={diff.file}>
                          {diff.file.split('/').pop()}
                        </td>
                        <td className="text-center px-3 py-2">
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${getStatusClass(diff.status)}`}>
                            {diff.status}
                          </span>
                        </td>
                        <td className="text-right px-3 py-2 text-emerald-400 font-mono">+{diff.additions}</td>
                        <td className="text-right px-3 py-2 text-red-400 font-mono">-{diff.deletions}</td>
                      </tr>
                    ))}
                    
                    {/* Summary Row */}
                    <tr className="bg-dark-850/30 font-semibold">
                      <td colSpan={2} className="px-3 py-2 text-dark-300">Total</td>
                      <td className="text-center px-3 py-2 text-emerald-400">{stats.additions}</td>
                      <td className="text-right px-3 py-2 text-red-400">{stats.deletions}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Commits Tab Content */}
        {activeTab === 'commits' && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
              Commit History
            </h3>
            
            <div className="space-y-2">
              {commits.map((commit) => (
                <div
                  key={commit.hash}
                  className="group relative p-3 rounded-xl border cursor-pointer transition-all duration-200 border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Commit Hash */}
                    <code className="text-[10px] text-primary-400 font-mono bg-dark-900/50 px-1.5 py-0.5 rounded shrink-0">
                      {commit.hash.slice(0, 7)}
                    </code>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark-200 line-clamp-2">{commit.message}</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-dark-500">{commit.author}</span>
                        <span className="text-[10px] text-dark-600">{commit.date}</span>
                        
                        {commit.isHead && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-medium">
                            HEAD
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diff Tab Content */}
        {activeTab === 'diff' && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
              Staged Changes
            </h3>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {fileDiffs.map((diff) => (
                <div key={diff.file} className="rounded-xl border border-dark-700/50 overflow-hidden">
                  {/* File Header */}
                  <div className={`flex items-center justify-between px-3 py-2 text-xs font-medium ${
                    diff.status === 'added' ? 'bg-emerald-500/10 text-emerald-400' :
                    diff.status === 'modified' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    <span className="truncate max-w-[250px]">{diff.file}</span>
                    <span className="capitalize">{diff.status}</span>
                  </div>
                  
                  {/* Diff Stats */}
                  <div className="px-3 py-2 bg-dark-900/30 text-xs text-dark-500 flex items-center justify-between font-mono">
                    <span className="text-emerald-400">+{diff.additions}</span>
                    <span className="text-red-400">-{diff.deletions}</span>
                  </div>
                  
                  {/* Diff Preview (simplified) */}
                  <div className="px-3 pb-3">
                    <pre className="text-xs text-dark-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-32">
                      {diff.status !== 'deleted' ? (
                        <div className="text-emerald-400/80">+ {diff.additions} lines added</div>
                      ) : ''}
                      {diff.status !== 'added' ? (
                        <div className="text-red-400/80">- {diff.deletions} lines removed</div>
                      ) : ''}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="shrink-0 px-4 py-3 border-t border-dark-800 bg-dark-850/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <span>💡 Press Ctrl+Shift+G to quick toggle</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePull}
            className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
            title="Pull latest changes"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3V4m0 0h-3M4 20v-1m-1-4H4" />
            </svg>
            Pull
          </button>
          
          <button
            onClick={handleCommit}
            className="btn-primary px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
            title="Commit changes (Ctrl+Enter)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Commit
          </button>
          
          <button
            onClick={handlePush}
            className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
            title="Push to remote"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            Push
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
