import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

interface Bookmark {
  id: string;
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  content: string;
  timestamp: Date;
  preview: string;
}

interface BookmarkManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simulated bookmarks data (in real app, this would come from store)
const generateMockBookmarks = (): Bookmark[] => [
  {
    id: '1',
    messageId: 'msg-1',
    conversationId: 'conv-1',
    conversationTitle: 'React Hooks Tutorial',
    content: 'The useEffect hook runs after every render by default...',
    timestamp: new Date(Date.now() - 3600000),
    preview: 'useEffect hook explanation with dependency array examples',
  },
  {
    id: '2',
    messageId: 'msg-2',
    conversationId: 'conv-2',
    conversationTitle: 'Python Data Analysis',
    content: 'For data manipulation, pandas provides powerful DataFrame operations...',
    timestamp: new Date(Date.now() - 7200000),
    preview: 'Pandas DataFrame methods and best practices',
  },
  {
    id: '3',
    messageId: 'msg-3',
    conversationId: 'conv-1',
    conversationTitle: 'React Hooks Tutorial',
    content: 'Custom hooks allow you to extract component logic into reusable functions...',
    timestamp: new Date(Date.now() - 86400000),
    preview: 'Creating custom hooks pattern with TypeScript',
  },
];

export default function BookmarkManager({ isOpen, onClose }: BookmarkManagerProps) {
  const [bookmarks] = useState<Bookmark[]>(generateMockBookmarks());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'conversation'>('recent');
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { bookmarks: bookmarkIds, conversations } = useStore();

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = bookmarks;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(b =>
        b.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.conversationTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.preview.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        break;
      case 'conversation':
        filtered.sort((a, b) => a.conversationTitle.localeCompare(b.conversationTitle));
        break;
    }

    return filtered;
  }, [bookmarks, searchQuery, sortBy]);

  const handleSelectAll = () => {
    if (selectedBookmarks.size === filteredBookmarks.length) {
      setSelectedBookmarks(new Set());
    } else {
      setSelectedBookmarks(new Set(filteredBookmarks.map(b => b.id)));
    }
  };

  const handleSelectBookmark = (id: string) => {
    const newSet = new Set(selectedBookmarks);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBookmarks(newSet);
  };

  const handleExportSelected = () => {
    const selected = bookmarks.filter(b => selectedBookmarks.has(b.id));
    console.log('Exporting bookmarks:', selected);
    // Export logic would go here
  };

  const handleDeleteSelected = () => {
    // Delete logic would go here
    setSelectedBookmarks(new Set());
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700/80 shadow-2xl shadow-black/40 scale-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 shrink-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" stroke="none">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Bookmarks</h2>
              <p className="text-sm text-dark-400">
                {bookmarkIds.length} saved responses
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-dark-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-dark-700 text-white' : 'text-dark-500 hover:text-dark-300'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-dark-700 text-white' : 'text-dark-500 hover:text-dark-300'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="px-6 py-4 border-b border-dark-800/80 space-y-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/60 rounded-xl text-white placeholder-dark-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
            />
          </div>

          {/* Sort & Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-2 py-1 bg-dark-800 border border-dark-700 rounded-lg text-xs text-dark-300 focus:border-amber-500 outline-none cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="conversation">By Conversation</option>
              </select>
            </div>

            {selectedBookmarks.size > 0 && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xs text-dark-400">{selectedBookmarks.size} selected</span>
                <button
                  onClick={handleExportSelected}
                  className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-md hover:bg-primary-500/30 transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-md hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bookmarks List/Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredBookmarks.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-dark-500">
              <div className="w-16 h-16 rounded-full bg-dark-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="text-sm font-medium">No bookmarks found</p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Save important responses to find them later'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="space-y-2">
              {/* Select All Header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-dark-800/30 rounded-lg border border-dark-700/30">
                <input
                  type="checkbox"
                  checked={selectedBookmarks.size === filteredBookmarks.length && filteredBookmarks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-dark-600 text-amber-500 focus:ring-amber-500/20"
                />
                <span className="text-xs text-dark-500 font-medium">Select All</span>
                <span className="ml-auto text-xs text-dark-600">{filteredBookmarks.length} bookmarks</span>
              </div>

              {filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedBookmarks.has(bookmark.id)
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50'
                  }`}
                  onClick={() => handleSelectBookmark(bookmark.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedBookmarks.has(bookmark.id)}
                      onChange={() => handleSelectBookmark(bookmark.id)}
                      className="mt-1 rounded border-dark-600 text-amber-500 focus:ring-amber-500/20"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-white truncate">{bookmark.preview}</h3>
                      </div>
                      
                      <p className="text-xs text-dark-400 line-clamp-2 mb-2">
                        {bookmark.content}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-dark-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {bookmark.conversationTitle}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(bookmark.timestamp)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded-md hover:bg-dark-700 text-dark-500 hover:text-white transition-colors"
                        title="Go to message"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                      <button
                        className="p-1.5 rounded-md hover:bg-dark-700 text-dark-500 hover:text-red-400 transition-colors"
                        title="Remove bookmark"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m0-6V6a2 2 0 112 0v2m0 0V6a2 2 0 012 0v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 gap-3">
              {filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedBookmarks.has(bookmark.id)
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50'
                  }`}
                  onClick={() => handleSelectBookmark(bookmark.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <input
                      type="checkbox"
                      checked={selectedBookmarks.has(bookmark.id)}
                      onChange={() => handleSelectBookmark(bookmark.id)}
                      className="rounded border-dark-600 text-amber-500 focus:ring-amber-500/20"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-[10px] text-dark-500">{formatRelativeTime(bookmark.timestamp)}</span>
                  </div>

                  <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">
                    {bookmark.preview}
                  </h3>
                  
                  <p className="text-xs text-dark-400 line-clamp-3">
                    {bookmark.content}
                  </p>

                  <div className="mt-3 pt-2 border-t border-dark-700/50 flex items-center gap-1 text-[10px] text-dark-500">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">{bookmark.conversationTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800 bg-dark-850/50 flex items-center justify-between">
          <p className="text-xs text-dark-500">
            💡 Bookmarked messages sync across sessions
          </p>
          
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-xl text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
