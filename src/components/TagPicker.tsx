import React, { useState } from 'react';
import { Tag, X, Plus, ChevronDown } from 'lucide-react';

// Predefined tags with colors
export const AVAILABLE_TAGS: { id: string; label: string; color: string; bgColor: string }[] = [
  { id: 'important', label: 'Important', color: '#ef4444', bgColor: 'bg-red-500/20' },
  { id: 'work', label: 'Work', color: '#3b82f6', bgColor: 'bg-blue-500/20' },
  { id: 'personal', label: 'Personal', color: '#8b5cf6', bgColor: 'bg-purple-500/20' },
  { id: 'bugfix', label: 'Bug Fix', color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  { id: 'feature', label: 'Feature', color: '#10b981', bgColor: 'bg-emerald-500/20' },
  { id: 'refactor', label: 'Refactor', color: '#06b6d4', bgColor: 'bg-cyan-500/20' },
  { id: 'help', label: 'Help', color: '#ec4899', bgColor: 'bg-pink-500/20' },
  { id: 'review', label: 'Review', color: '#6366f1', bgColor: 'bg-indigo-500/20' },
];

interface TagPickerProps {
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  size?: 'sm' | 'md';
  maxVisible?: number;
}

export function TagPicker({ selectedTags, onToggleTag, size = 'sm', maxVisible = 5 }: TagPickerProps) {
  const [showAll, setShowAll] = useState(false);
  
  const visibleTags = showAll ? AVAILABLE_TAGS : AVAILABLE_TAGS.slice(0, maxVisible);
  const hiddenCount = Math.max(0, AVAILABLE_TAGS.length - maxVisible);

  const getTagById = (id: string) => AVAILABLE_TAGS.find(t => t.id === id);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleTags.map((tag) => {
        const isSelected = selectedTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
              isSelected
                ? `${tag.bgColor} text-white border border-current/30`
                : 'bg-dark-800 text-dark-400 hover:text-dark-200 border border-dark-700 hover:border-dark-600'
            }`}
            style={isSelected ? { borderColor: tag.color + '60' } : {}}
          >
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: isSelected ? tag.color : tag.color + '40' }}
            />
            {tag.label}
            {isSelected && <Tag size={10} className="ml-0.5" />}
          </button>
        );
      })}
      
      {/* Show More/Less */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-dark-800 text-dark-400 hover:text-dark-200 border border-dark-700 transition-all"
        >
          {showAll ? 'Less' : `+${hiddenCount}`}
          <ChevronDown size={10} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
      
      {/* Custom Tag Input (future) */}
      {/* <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-dark-800 text-dark-400 hover:text-primary-400 border border-dashed border-dark-600 transition-all">
        <Plus size={10} />
        Custom
      </button> */}
    </div>
  );
}

// Display component for showing tags on an item
interface TagDisplayProps {
  tagIds: string[];
  size?: 'sm' | 'xs';
  limit?: number;
}

export function TagDisplay({ tagIds, size = 'sm', limit = 3 }: TagDisplayProps) {
  if (!tagIds || tagIds.length === 0) return null;
  
  const getTagById = (id: string) => AVAILABLE_TAGS.find(t => t.id === id);
  const visibleTags = tagIds.slice(0, limit).map(getTagById).filter(Boolean);
  const remainingCount = Math.max(0, tagIds.length - limit);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleTags.map((tag) => (
        <span
          key={tag!.id}
          className={`inline-flex items-center gap-1 rounded-full ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'} font-medium ${tag!.bgColor} border border-current/20`}
          style={{ color: tag!.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag!.color }} />
          {tag!.label}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-[10px] text-dark-500 bg-dark-800 px-1.5 py-0.5 rounded-full">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
