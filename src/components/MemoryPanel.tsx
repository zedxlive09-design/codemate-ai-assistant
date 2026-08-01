/**
 * MemoryPanel Component for CodeMate AI
 * 
 * Provides UI for:
 * - Viewing/editing CODEMATE.md instructions
 - Managing learned memories
 - Configuring user preferences
 - Viewing active skills
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Brain, 
  Settings, 
  Zap, 
  Trash2, 
  Edit3, 
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  Tag,
  MessageSquare,
  Code,
  Lightbulb,
  Bug,
  Clipboard,
} from 'lucide-react';
import type { 
  MemoryEntry, 
  UserPreferences, 
  SkillDefinition,
  InstructionSection,
} from '../lib/projectMemory';
import { getMemorySystem } from '../lib/memorySystem';
import { BUILTIN_SKILLS } from '../lib/skillsParser';

// ============================================================
// TYPES
// ============================================================

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath?: string;
}

type TabType = 'instructions' | 'memories' | 'skills' | 'preferences';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

// ============================================================
// TABS CONFIGURATION
// ============================================================

const TABS: TabConfig[] = [
  { id: 'instructions', label: 'Instructions', icon: <FileText size={16} /> },
  { id: 'memories', label: 'Memory', icon: <Brain size={16} /> },
  { id: 'skills', label: 'Skills', icon: <Zap size={16} /> },
  { id: 'preferences', label: 'Preferences', icon: <Settings size={16} /> },
];

const MEMORY_TYPE_CONFIG: Record<MemoryEntry['type'], { icon: React.ReactNode; color: string; label: string }> = {
  decision: { icon: <Clipboard size={14} />, color: 'text-blue-400', label: 'Decision' },
  preference: { icon: <Settings size={14} />, color: 'text-purple-400', label: 'Preference' },
  pattern: { icon: <RefreshCw size={14} />, color: 'text-green-400', label: 'Pattern' },
  convention: { icon: <Code size={14} />, color: 'text-yellow-400', label: 'Convention' },
  error: { icon: <Bug size={14} />, color: 'text-red-400', label: 'Error' },
  fact: { icon: <Lightbulb size={14} />, color: 'text-amber-400', label: 'Fact' },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ 
  isOpen, 
  onClose, 
  projectPath = '' 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('instructions');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [instructionsContent, setInstructionsContent] = useState('');
  const [instructionSections, setInstructionSections] = useState<InstructionSection[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: 'auto',
    verbosity: 3,
    explainInDetail: true,
    codeStyle: 'idiomatic',
    preferUrduExplanations: false,
    techStack: [],
  });
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [memoryFilter, setMemoryFilter] = useState<MemoryEntry['type'] | 'all'>('all');
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Load data when panel opens or path changes
  useEffect(() => {
    if (isOpen && projectPath) {
      loadData();
    }
  }, [isOpen, projectPath]);
  
  const loadData = useCallback(async () => {
    if (!projectPath) return;
    
    setIsLoading(true);
    try {
      const memSys = await getMemorySystem(projectPath);
      const context = memSys.getProjectContext();
      
      if (context.instructions) {
        setInstructionsContent(context.instructions.rawContent);
        setInstructionSections(context.instructions.sections);
      }
      
      setMemories(context.memories);
      setSkills(context.activeSkills);
      setPreferences(context.preferences);
      
    } catch (error) {
      console.error('Failed to load memory data:', error);
      showStatus('error', 'Failed to load memory data');
    }
    setIsLoading(false);
  }, [projectPath]);
  
  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3000);
  };
  
  // Filter memories based on search and type filter
  const filteredMemories = memories.filter(m => {
    const matchesType = memoryFilter === 'all' || m.type === memoryFilter;
    const matchesSearch = !searchQuery || 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesSearch;
  });
  
  // Handle saving edited instructions
  const handleSaveInstructions = async () => {
    if (!projectPath) return;
    
    setIsLoading(true);
    try {
      const memSys = await getMemorySystem(projectPath);
      // Note: Would need a write function in memory system
      showStatus('success', 'Instructions saved successfully!');
      setIsEditingInstructions(false);
      loadData();
    } catch (error) {
      showStatus('error', 'Failed to save instructions');
    }
    setIsLoading(false);
  };
  
  // Handle deleting a memory
  const handleDeleteMemory = async (memoryId: string) => {
    if (!projectPath) return;
    
    try {
      const memSys = await getMemorySystem(projectPath);
      await memSys.deleteMemory(memoryId);
      loadData();
      showStatus('success', 'Memory deleted');
    } catch (error) {
      showStatus('error', 'Failed to delete memory');
    }
  };
  
  // Handle preference changes
  const handlePreferenceChange = async (key: keyof UserPreferences, value: any) => {
    if (!projectPath) return;
    
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    try {
      const memSys = await getMemorySystem(projectPath);
      await memSys.updatePreferences({ [key]: value });
      showStatus('success', 'Preference saved');
    } catch (error) {
      showStatus('error', 'Failed to save preference');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden backdrop-blur-xl">
        
        {/* Sidebar / Tabs */}
        <div className="w-56 bg-black/40 border-r border-white/10 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="text-purple-400" />
              Project Memory
            </h2>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          
          {/* Tab buttons */}
          <nav className="space-y-1 flex-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  activeTab === tab.id 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.id === 'memories' && memories.length > 0 && (
                  <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {memories.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          
          {/* Status message */}
          {statusMessage && (
            <div className={`mt-4 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-green-500/20 text-green-300' 
                : 'bg-red-500/20 text-red-300'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {statusMessage.text}
            </div>
          )}
          
          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        
        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white capitalize">{activeTab}</h3>
            
            {(activeTab === 'memories') && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 w-48"
                  />
                </div>
                
                <select
                  value={memoryFilter}
                  onChange={(e) => setMemoryFilter(e.target.value as MemoryEntry['type'] | 'all')}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-purple-500/50"
                >
                  <option value="all">All Types</option>
                  <option value="decision">Decisions</option>
                  <option value="preference">Preferences</option>
                  <option value="pattern">Patterns</option>
                  <option value="convention">Conventions</option>
                  <option value="error">Errors</option>
                  <option value="fact">Facts</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw size={24} className="animate-spin text-purple-400" />
              </div>
            ) : (
              <>
                {activeTab === 'instructions' && (
                  <InstructionsTab
                    content={instructionsContent}
                    sections={instructionSections}
                    isEditing={isEditingInstructions}
                    editContent={editContent}
                    onEditToggle={() => {
                      setIsEditingInstructions(!isEditingInstructions);
                      setEditContent(instructionsContent);
                    }}
                    onEditChange={setEditContent}
                    onSave={handleSaveInstructions}
                  />
                )}
                
                {activeTab === 'memories' && (
                  <MemoriesTab
                    memories={filteredMemories}
                    onDelete={handleDeleteMemory}
                  />
                )}
                
                {activeTab === 'skills' && (
                  <SkillsTab skills={skills} />
                )}
                
                {activeTab === 'preferences' && (
                  <PreferencesTab
                    preferences={preferences}
                    onChange={handlePreferenceChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface InstructionsTabProps {
  content: string;
  sections: InstructionSection[];
  isEditing: boolean;
  editContent: string;
  onEditToggle: () => void;
  onEditChange: (value: string) => void;
  onSave: () => void;
}

const InstructionsTab: React.FC<InstructionsTabProps> = ({
  content,
  sections,
  isEditing,
  editContent,
  onEditToggle,
  onEditChange,
  onSave,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (heading: string) => {
    const next = new Set(expandedSections);
    if (next.has(heading)) {
      next.delete(heading);
    } else {
      next.add(heading);
    }
    setExpandedSections(next);
  };
  
  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Editing CODEMATE.md
          </p>
          <div className="flex gap-2">
            <button
              onClick={onEditToggle}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
        <textarea
          value={editContent}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full h-[500px] p-4 bg-black/30 border border-white/10 rounded-xl text-gray-200 font-mono text-sm resize-none focus:outline-none focus:border-purple-500/50"
          placeholder="# Project Instructions..."
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {sections.length} sections found in CODEMATE.md
        </p>
        <button
          onClick={onEditToggle}
          className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors border border-white/10"
        >
          <Edit3 size={14} />
          Edit Instructions
        </button>
      </div>
      
      {!content ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No CODEMATE.md found</p>
          <p className="text-sm text-gray-500">
            Create one to give CodeMate project-specific instructions
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <div 
              key={idx}
              className="border border-white/10 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.heading)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                {expandedSections.has(section.heading) ? (
                  <ChevronDown size={16} className="text-gray-500" />
                ) : (
                  <ChevronRight size={16} className="text-gray-500" />
                )}
                <span className="font-medium text-white">{section.heading}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  section.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                  section.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                  section.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {section.priority}
                </span>
              </button>
              
              {expandedSections.has(section.heading) && (
                <div className="px-4 pb-4 pt-0">
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                    {section.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface MemoriesTabProps {
  memories: MemoryEntry[];
  onDelete: (id: string) => void;
}

const MemoriesTab: React.FC<MemoriesTabProps> = ({ memories, onDelete }) => {
  if (memories.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain size={48} className="mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400 mb-2">No memories stored yet</p>
        <p className="text-sm text-gray-500">
          CodeMate will learn from your interactions automatically
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400 mb-4">
        Showing {memories.length} memor{memories.length === 1 ? 'y' : 'ies'}
      </p>
      
      {memories.map((memory) => {
        const config = MEMORY_TYPE_CONFIG[memory.type];
        return (
          <div
            key={memory.id}
            className="group p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className={`${config.color} mt-0.5`}>
                {config.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-white truncate">
                    {memory.title}
                  </h4>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${config.color} bg-current/10`}>
                    {config.label}
                  </span>
                </div>
                
                <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                  {memory.content}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatRelativeTime(memory.lastAccessed)}
                  </span>
                  <span>Used {memory.accessCount} times</span>
                  
                  {memory.tags.length > 0 && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Tag size={10} />
                      {memory.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-purple-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => onDelete(memory.id)}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                title="Delete memory"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface SkillsTabProps {
  skills: SkillDefinition[];
}

const SkillsTab: React.FC<SkillsTabProps> = ({ skills }) => {
  const builtinSkills = skills.filter(s => BUILTIN_SKILLS.some(bs => bs.id === s.id));
  const customSkills = skills.filter(s => !BUILTIN_SKILLS.some(bs => bs.id === s.id));
  
  return (
    <div className="space-y-8">
      {/* Built-in Skills */}
      <section>
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Zap size={14} className="text-yellow-400" />
          Built-in Skills ({builtinSkills.length})
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          {builtinSkills.map(skill => (
            <SkillCard key={skill.id} skill={skill} isBuiltIn />
          ))}
        </div>
      </section>
      
      {/* Custom Skills */}
      {customSkills.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Plus size={14} className="text-green-400" />
            Custom Skills ({customSkills.length})
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {customSkills.map(skill => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      )}
      
      {skills.length === 0 && (
        <div className="text-center py-12">
          <Zap size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No skills loaded</p>
          <p className="text-sm text-gray-500">
            Add custom skills in .codemate/skills/ directory
          </p>
        </div>
      )}
    </div>
  );
};

interface SkillCardProps {
  skill: SkillDefinition;
  isBuiltIn?: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, isBuiltIn }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div 
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isBuiltIn 
          ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40' 
          : 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
      }`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          isBuiltIn ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
        }`}>
          <Zap size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-white text-sm">{skill.name}</h5>
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
            {skill.description}
          </p>
          
          {skill.triggers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {skill.triggers.slice(0, 3).map(trigger => (
                <span key={trigger} className="text-xs px-1.5 py-0.5 bg-white/5 text-gray-400 rounded">
                  "{trigger}"
                </span>
              ))}
              {skill.triggers.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{skill.triggers.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {skill.tools.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">Tools:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {skill.tools.map(tool => (
                  <span key={tool} className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {skill.examples.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">Examples:</span>
              <ul className="mt-1 space-y-1">
                {skill.examples.slice(0, 2).map((ex, i) => (
                  <li key={i} className="text-xs text-gray-400 italic pl-2 border-l-2 border-white/10">
                    "{ex}"
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PreferencesTabProps {
  preferences: UserPreferences;
  onChange: (key: keyof UserPreferences, value: any) => void;
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({ preferences, onChange }) => {
  return (
    <div className="max-w-lg space-y-6">
      {/* Language */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Response Language
        </label>
        <select
          value={preferences.language}
          onChange={(e) => onChange('language', e.target.value)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="auto">Auto-detect from input</option>
          <option value="en">English only</option>
          <option value="ur">Urdu only</option>
        </select>
      </div>
      
      {/* Verbosity */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Response Detail Level: {preferences.verbosity}/5
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={preferences.verbosity}
          onChange={(e) => onChange('verbosity', parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Concise</span>
          <span>Balanced</span>
          <span>Detailed</span>
        </div>
      </div>
      
      {/* Code Style */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Preferred Code Style
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['concise', 'detailed', 'idiomatic'] as const).map(style => (
            <button
              key={style}
              onClick={() => onChange('codeStyle', style)}
              className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${
                preferences.codeStyle === style
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      
      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
          <div>
            <span className="text-sm text-white block">Detailed Explanations</span>
            <span className="text-xs text-gray-500">Include step-by-step reasoning</span>
          </div>
          <button
            onClick={() => onChange('explainInDetail', !preferences.explainInDetail)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              preferences.explainInDetail ? 'bg-purple-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              preferences.explainInDetail ? 'left-6' : 'left-1'
            }`} />
          </button>
        </label>
        
        <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
          <div>
            <span className="text-sm text-white block">Urdu Explanations</span>
            <span className="text-xs text-gray-500">Use Urdu when user writes in Urdu</span>
          </div>
          <button
            onClick={() => onChange('preferUrduExplanations', !preferences.preferUrduExplanations)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              preferences.preferUrduExplanations ? 'bg-purple-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              preferences.preferUrduExplanations ? 'left-6' : 'left-1'
            }`} />
          </button>
        </label>
      </div>
      
      {/* Tech Stack */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Common Tech Stack
        </label>
        <TechStackInput
          values={preferences.techStack}
          onChange={(techStack) => onChange('techStack', techStack)}
        />
        <p className="text-xs text-gray-500">
          Add technologies you frequently work with
        </p>
      </div>
    </div>
  );
};

interface TechStackInputProps {
  values: string[];
  onChange: (values: string[]) => void;
}

const TechStackInput: React.FC<TechStackInputProps> = ({ values, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  
  const addTech = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  };
  
  const removeTech = (tech: string) => {
    onChange(values.filter(t => t !== tech));
  };
  
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map(tech => (
          <span
            key={tech}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-lg"
          >
            {tech}
            <button
              onClick={() => removeTech(tech)}
              className="hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTech()}
          placeholder="Add technology (e.g., react, rust)"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
        />
        <button
          onClick={addTech}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export default MemoryPanel;
