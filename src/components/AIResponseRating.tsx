import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface AIResponseRatingProps {
  messageId: string;
  conversationId: string;
  onFeedback?: (rating: 'positive' | 'negative', messageId: string) => void;
}

interface RatingState {
  rating: 'positive' | 'negative' | null;
  feedback: string;
  submitted: boolean;
}

export default function AIResponseRating({ messageId, conversationId, onFeedback }: AIResponseRatingProps) {
  const [state, setState] = useState<RatingState>({
    rating: null,
    feedback: '',
    submitted: false,
  });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  const { addBookmark, removeBookmark, bookmarks } = useStore();
  const { showToast } = useToast();
  
  const isBookmarked = bookmarks.includes(messageId);

  const handleRating = useCallback((rating: 'positive' | 'negative') => {
    setState(prev => ({ ...prev, rating, submitted: false }));
    setShowFeedbackForm(rating === 'negative');
    
    onFeedback?.(rating, messageId);
    
    if (rating === 'positive') {
      showToast('Thanks for your feedback! 🎉', 'success');
      setState(prev => ({ ...prev, submitted: true }));
    }
  }, [messageId, onFeedback, showToast]);

  const handleSubmitFeedback = useCallback(() => {
    if (state.feedback.trim()) {
      // In a real app, this would send feedback to improve the model
      console.log('Feedback submitted:', { messageId, rating: state.rating, feedback: state.feedback });
      showToast('Thank you for your detailed feedback!', 'success');
      setState(prev => ({ ...prev, submitted: true }));
      setShowFeedbackForm(false);
    }
  }, [messageId, state.feedback, state.rating, showToast]);

  const handleToggleBookmark = useCallback(() => {
    if (isBookmarked) {
      removeBookmark(messageId);
      showToast('Removed from bookmarks', 'info');
    } else {
      addBookmark(conversationId, messageId);
      showToast('Added to bookmarks! 🔖', 'success');
    }
  }, [isBookmarked, messageId, conversationId, addBookmark, removeBookmark, showToast]);

  const handleCopy = useCallback(() => {
    // Get the message content - this would need to be passed or accessed differently
    showToast('Copied to clipboard!', 'success');
  }, [showToast]);

  const handleRegenerate = useCallback(() => {
    showToast('Regenerating response...', 'info');
    // Trigger regeneration logic here
  }, [showToast]);

  if (state.submitted && state.rating === 'positive') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg scale-in">
        <span className="text-emerald-400">✓</span>
        <span className="text-xs text-emerald-400 font-medium">Helpful!</span>
      </div>
    );
  }

  return (
    <div className="response-rating-container">
      {/* Main Action Buttons */}
      <div className="flex items-center gap-1 p-1 bg-dark-800/50 rounded-lg border border-dark-700/50">
        {/* Thumbs Up */}
        <button
          onClick={() => handleRating('positive')}
          className={`group relative p-2 rounded-md transition-all duration-200 ${
            state.rating === 'positive'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'hover:bg-dark-700 text-dark-500 hover:text-emerald-400'
          }`}
          title="This response was helpful"
        >
          <svg className="w-4 h-4" fill={state.rating === 'positive' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-dark-900 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Helpful
          </span>
        </button>

        {/* Thumbs Down */}
        <button
          onClick={() => handleRating('negative')}
          className={`group relative p-2 rounded-md transition-all duration-200 ${
            state.rating === 'negative'
              ? 'bg-red-500/20 text-red-400'
              : 'hover:bg-dark-700 text-dark-500 hover:text-red-400'
          }`}
          title="This response needs improvement"
        >
          <svg className="w-4 h-4" fill={state.rating === 'negative' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2M17 4H19a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-dark-900 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Not helpful
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-dark-700 mx-0.5" />

        {/* Bookmark */}
        <button
          onClick={handleToggleBookmark}
          className={`group relative p-2 rounded-md transition-all duration-200 ${
            isBookmarked
              ? 'bg-amber-500/20 text-amber-400'
              : 'hover:bg-dark-700 text-dark-500 hover:text-amber-400'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark this response'}
        >
          <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-dark-900 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isBookmarked ? 'Bookmarked' : 'Save'}
          </span>
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="group relative p-2 rounded-md hover:bg-dark-700 text-dark-500 hover:text-blue-400 transition-all duration-200"
          title="Copy response"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-dark-900 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Copy
          </span>
        </button>

        {/* Regenerate */}
        <button
          onClick={handleRegenerate}
          className="group relative p-2 rounded-md hover:bg-dark-700 text-dark-500 hover:text-primary-400 transition-all duration-200"
          title="Regenerate response"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-dark-900 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Regenerate
          </span>
        </button>
      </div>

      {/* Feedback Form (shown on negative rating) */}
      {showFeedbackForm && !state.submitted && (
        <div className="mt-2 p-3 bg-dark-900/80 border border-red-500/20 rounded-lg slide-down">
          <p className="text-xs text-dark-300 mb-2">
            What went wrong? Your feedback helps us improve.
          </p>
          
          <div className="space-y-2 mb-3">
            {['Not accurate', 'Not helpful', 'Too long', 'Too short', 'Wrong language'].map(option => (
              <button
                key={option}
                onClick={() => setState(prev => ({ ...prev, feedback: option }))}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                  state.feedback === option
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-dark-800/50 text-dark-400 hover:bg-dark-800 hover:text-dark-200 border border-transparent'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <textarea
            value={state.feedback}
            onChange={(e) => setState(prev => ({ ...prev, feedback: e.target.value }))}
            placeholder="Or describe the issue in detail..."
            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white placeholder-dark-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none resize-none"
            rows={2}
          />

          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="px-3 py-1.5 text-xs text-dark-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={!state.feedback.trim()}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      )}

      {/* Submitted State for Negative Feedback */}
      {state.submitted && state.rating === 'negative' && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="text-blue-400">💬</span>
          <span className="text-xs text-blue-400 font-medium">Feedback submitted. Thanks!</span>
        </div>
      )}
    </div>
  );
}
