import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface Snippet {
  id: string;
  name: string;
  description: string;
  language: string;
  category: 'general' | 'react' | 'python' | 'rust' | 'go' | 'sql' | 'shell' | 'html' | 'css';
  code: string;
  icon: string;
  tags: string[];
}

// Pre-built code snippets
const SNIPPETS: Snippet[] = [
  // General
  {
    id: 'fn-declare',
    name: 'Function Declaration',
    description: 'Basic function with JSDoc',
    language: 'typescript',
    category: 'general',
    icon: '📝',
    tags: ['function', 'basic'],
    code: `/**
 * @description Brief description of the function
 * @param {type} paramName - Parameter description
 * @returns {type} Return value description
 */
function functionName(paramName: type): returnType {
  // TODO: Implement function logic
  return defaultValue;
}`,
  },
  {
    id: 'class-basic',
    name: 'Class Template',
    description: 'ES6 class with constructor and methods',
    language: 'typescript',
    category: 'general',
    icon: '🏗️',
    tags: ['class', 'oop'],
    code: `/**
 * @description Class description
 */
class ClassName {
  private property: type;

  constructor(property: type) {
    this.property = property;
  }

  /**
   * @description Method description
   */
  public methodName(): void {
    // Implementation
  }
}`,
  },
  {
    id: 'async-await',
    name: 'Async/Await Pattern',
    description: 'Async function with error handling',
    language: 'typescript',
    category: 'general',
    icon: '⚡',
    tags: ['async', 'promise'],
    code: `async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}`,
  },
  {
    id: 'try-catch',
    name: 'Try-Catch Block',
    description: 'Error handling pattern',
    language: 'typescript',
    category: 'general',
    icon: '🛡️',
    tags: ['error', 'handling'],
    code: `try {
  // Code that might throw an error
  riskyOperation();
} catch (error) {
  console.error('Error occurred:', error);
  // Handle or rethrow the error
} finally {
  // Cleanup code (always runs)
  cleanup();
}`,
  },

  // React
  {
    id: 'react-component',
    name: 'React Component',
    description: 'Functional component with hooks',
    language: 'typescript',
    category: 'react',
    icon: '⚛️',
    tags: ['react', 'component', 'hooks'],
    code: `import React, { useState, useEffect, useCallback } from 'react';

interface ComponentProps {
  title: string;
  onAction?: (id: string) => void;
}

export default function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState<string>('initial');

  useEffect(() => {
    // Side effect on mount/update
    console.log('Component mounted');
  }, []);

  const handleClick = useCallback(() => {
    setState('updated');
    onAction?.('action-id');
  }, [onAction]);

  return (
    <div className="component">
      <h1>{title}</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
}`,
  },
  {
    id: 'react-useEffect',
    name: 'useEffect Hook',
    description: 'Side effects in functional components',
    language: 'typescript',
    category: 'react',
    icon: '🎣',
    tags: ['react', 'hook', 'effect'],
    code: `useEffect(() => {
  // Run on mount
  console.log('Component mounted');

  // Cleanup function (runs before unmount)
  return () => {
    console.log('Cleanup');
  };
}, [dependency1, dependency2]); // Re-run when these change`,
  },
  {
    id: 'react-custom-hook',
    name: 'Custom Hook',
    description: 'Reusable stateful logic hook',
    language: 'typescript',
    category: 'react',
    icon: '🪝',
    tags: ['react', 'hook', 'custom'],
    code: `import { useState, useCallback } from 'react';

interface UseCustomHookReturn {
  value: boolean;
  toggle: () => void;
  reset: () => void;
}

function useCustomHook(initialValue = false): UseCustomHookReturn {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return { value, toggle, reset };
}

export { useCustomHook };`,
  },
  {
    id: 'react-context',
    name: 'React Context',
    description: 'Context API for state management',
    language: 'typescript',
    category: 'react',
    icon: '🌐',
    tags: ['react', 'context', 'state'],
    code: `import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
interface StateType {
  value: string | null;
  count: number;
}

interface ActionType {
  type: 'SET_VALUE' | 'INCREMENT';
  payload?: any;
}

// Context
const AppContext = createContext<StateType>({
  value: null,
  count: 0,
});

// Reducer
function appReducer(state: StateType, action: ActionType): StateType {
  switch (action.type) {
    case 'SET_VALUE':
      return { ...state, value: action.payload };
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    default:
      return state;
  }
}

// Provider Component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, { value: null, count: 0 });

  return (
    <AppContext.Provider value={state}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to consume context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}`,
  },

  // Python
  {
    id: 'py-function',
    name: 'Python Function',
    description: 'Function with type hints and docstring',
    language: 'python',
    category: 'python',
    icon: '🐍',
    tags: ['python', 'function'],
    code: `"""Module docstring describing the module."""

from typing import List, Optional


def function_name(param1: str, param2: int = 10) -> bool:
    """
    Brief description of what the function does.
    
    Args:
        param1: Description of param1
        param2: Description of param2
        
    Returns:
        bool: Description of return value
        
    Example:
        >>> function_name("test", 20)
        True
    """
    # Function implementation here
    result = param1 * param2
    return result > 0`,
  },
  {
    id: 'py-class',
    name: 'Python Class',
    description: 'Class with __init__ and methods',
    language: 'python',
    category: 'python',
    icon: '🐍',
    tags: ['python', 'class', 'oop'],
    code: `"""Class docstring."""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ClassName:
    """Class description."""
    
    attribute: str
    another_attr: int
    
    def __init__(self, attribute: str, another_attr: int = 42):
        """Initialize the class."""
        self.attribute = attribute
        self.another_attr = another_attr
    
    def method_name(self, param: str) -> bool:
        """Method description."""
        return True
    
    def _private_method(self) -> None:
        """Private method with leading underscore."""
        pass`,
  },
  {
    id: 'py-async',
    name: 'Python Async/Await',
    description: 'Asynchronous programming pattern',
    language: 'python',
    category: 'python',
    icon: '⚡',
    tags: ['python', 'async'],
    code: `import asyncio
import aiohttp

async def fetch_data(url: str) -> dict:
    """Asynchronously fetch JSON data from URL."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            return await response.json()


async def main():
    """Run multiple concurrent tasks."""
    urls = ["https://api.example.com/1", "https://api.example.com/2"]
    
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks)
    
    for result in results:
        print(result)


if __name__ == "__main__":
    asyncio.run(main())`,
  },

  // Rust
  {
    id: 'rs-struct',
    name: 'Rust Struct',
    description: 'Struct with derive macros',
    language: 'rust',
    category: 'rust',
    icon: '🦀',
    tags: ['rust', 'struct'],
    code: `#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructName {
    pub id: u64,
    pub name: String,
    pub value: f64,
    pub items: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl StructName {
    /// Create a new instance
    pub fn new(id: u64, name: String, value: f64) -> Self {
        Self {
            id,
            name,
            value,
            items: Vec::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    /// Update the value
    pub fn update_value(&mut self, new_value: f64) {
        self.value = new_value;
        self.updated_at = Utc::now();
    }
}`,
  },
  {
    id: 'rs-error-handling',
    name: 'Rust Error Handling',
    description: 'Custom Result type and error handling',
    language: 'rust',
    category: 'rust',
    icon: '🛡️',
    tags: ['rust', 'error', 'result'],
    code: `#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    InvalidInput(String),
    ExternalService(String),
    InternalError(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            AppError::ExternalService(msg) => write!(f, "External service error: {}", msg),
            AppError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

type AppResult<T> = Result<T, AppError>;`,
  },
  {
    id: 'rs-async',
    name: 'Rust Async/Tokio',
    description: 'Async function using Tokio runtime',
    language: 'rust',
    category: 'rust',
    icon: '⚡',
    tags: ['rust', 'async', 'tokio'],
    code: `use tokio::task;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Spawn multiple concurrent tasks
    let task1 = task::spawn(async {
        // Async work here
        "Task 1 result".to_string()
    });

    let task2 = task::spawn(async {
        // More async work
        "Task 2 result".to_string()
    });

    // Wait for both tasks
    let result1 = task1.await?;
    let result2 = task2.await?;

    println!("Results: {} and {}", result1, result2);

    Ok(())
}`,
  },

  // SQL
  {
    id: 'sql-select',
    name: 'SELECT Query',
    description: 'Select statement with JOIN',
    language: 'sql',
    category: 'sql',
    icon: '🗃️',
    tags: ['sql', 'select', 'query'],
    code: `-- Select with JOINs and aggregation
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
  AND u.status = 'active'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 50;`,
  },
  {
    id: 'sql-insert',
    name: 'INSERT Statement',
    description: 'Insert with upsert support',
    language: 'sql',
    category: 'sql',
    icon: '📥',
    tags: ['sql', 'insert'],
    code: `-- Insert new record (PostgreSQL with upsert)
INSERT INTO users (name, email, created_at)
VALUES ($1, $2, NOW())
ON CONFLICT (email) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW()
RETURNING *;`,
  },

  // Shell/Bash
  {
    id: 'sh-script',
    name: 'Bash Script Template',
    description: 'Robust bash script with error handling',
    language: 'shell',
    category: 'shell',
    icon: '💻',
    tags: ['bash', 'script', 'shell'],
    code: `#!/bin/bash
set -euo pipefail

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

# Logging functions
log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Cleanup handler
cleanup() {
    log_info "Cleaning up..."
    # Kill background processes here
    exit 0
}
trap cleanup EXIT INT TERM

# Main script
main() {
    log_info "Starting script..."
    
    # Check prerequisites
    if ! command -v node &>/dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    log_info "Running main logic..."
    # Your code here
}

main "$@"`,
  },

  // HTML/CSS
  {
    id: 'html5-template',
    name: 'HTML5 Template',
    description: 'Complete HTML5 document structure',
    language: 'html',
    category: 'html',
    icon: '🌐',
    tags: ['html', 'template'],
    code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Title</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-800 antialiased">
    <!-- Header -->
    <header class="bg-white shadow-sm">
        <nav class="max-w-7xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <h1 class="text-xl font-bold">My App</h1>
                <ul class="flex gap-6 text-sm font-medium">
                    <li><a href="#" class="hover:text-blue-600">Home</a></li>
                    <li><a href="#" class="hover:text-blue-600">About</a></li>
                    <li><a href="#" class="hover:text-blue-600">Contact</a></li>
                </ul>
            </div>
        </nav>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
        <section>
            <h2 class="text-2xl font-bold mb-4">Section Title</h2>
            <p class="text-gray-600">Content goes here.</p>
        </section>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t mt-12 py-6">
        <div class="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>&copy; 2024 My App. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`,
  },
];

// Category configuration
const CATEGORIES = [
  { id: 'all', label: 'All Snippets', icon: '📚' },
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'react', label: 'React', icon: '⚛️' },
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'rust', label: 'Rust', icon: '🦀' },
  { id: 'go', label: 'Go', icon: '🔵' },
  { id: 'sql', label: 'SQL', icon: '🗃️' },
  { id: 'shell', label: 'Shell', icon: '💻' },
  { id: 'html', label: 'HTML/CSS', icon: '🌐' },
];

interface SnippetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string, language: string) => void;
}

export default function SnippetsPanel({ isOpen, onClose, onInsert }: SnippetsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  
  const { showToast } = useToast();

  // Filter snippets by category and search
  const filteredSnippets = useMemo(() => {
    return SNIPPETS.filter(snippet => {
      const matchesCategory = selectedCategory === 'all' || snippet.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleInsert = (snippet: Snippet) => {
    onInsert(snippet.code, snippet.language);
    showToast(`Inserted: ${snippet.name}`, 'success');
    setSelectedSnippet(snippet);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700/80 shadow-2xl shadow-black/40 scale-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg shadow-lg">
                📋
              </span>
              Code Snippets Library
            </h2>
            <p className="text-sm text-dark-400 mt-1">{SNIPPETS.length} templates available</p>
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

        {/* Search & Categories */}
        <div className="px-6 py-4 border-b border-dark-800/80 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search snippets..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-700/60 rounded-xl text-white placeholder-dark-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                    : 'bg-dark-800/60 text-dark-400 hover:text-dark-300 hover:bg-dark-700/50'
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {cat.id === 'all' ? SNIPPETS.length : SNIPPETS.filter(s => s.category === cat.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Snippets Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              onClick={() => handleInsert(snippet)}
              className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                selectedSnippet?.id === snippet.id
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600 hover:bg-dark-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                  selectedSnippet?.id === snippet.id
                    ? 'bg-amber-500/20'
                    : 'bg-dark-700/50'
                }`}>
                  {snippet.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white text-sm truncate">{snippet.name}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                      snippet.language === 'typescript' ? 'text-blue-400' :
                      snippet.language === 'python' ? 'text-emerald-400' :
                      snippet.language === 'rust' ? 'text-orange-400' :
                      snippet.language === 'sql' ? 'text-purple-400' :
                      'dark-500 bg-dark-700 px-1.5 py-0.5 rounded'
                    }`}>
                      {snippet.language}
                    </span>
                  </div>
                  <p className="text-xs text-dark-500 line-clamp-2">{snippet.description}</p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {snippet.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-md bg-dark-800/60 text-dark-500 text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Insert button */}
                <button 
                  className="absolute top-4 right-4 p-1.5 rounded-md opacity-0 group-hover:opacity-100 bg-dark-700 hover:bg-amber-500/20 hover:text-amber-300 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsert(snippet);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Code preview */}
              <div className="mt-3 p-3 bg-dark-950/50 rounded-lg border border-dark-800/50 max-h-32 overflow-hidden">
                <pre className="text-xs text-dark-300 font-mono whitespace-pre-wrap overflow-hidden">
                  <code>{snippet.code.slice(0, 200)}{snippet.code.length > 200 ? '...' : ''}</code>
                </pre>
              </div>
            </div>
          ))}

          {filteredSnippets.length === 0 && (
            <div className="text-center py-12 text-dark-500">
              <div className="text-4xl mb-3">🔍</div>
              <p>No snippets found matching your search</p>
              <p className="text-xs mt-2">Try different keywords or category</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800 bg-dark-850/50 flex items-center justify-between">
          <p className="text-xs text-dark-500">
            💡 Press Ctrl+Space to quickly insert snippets while typing
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

export { SNIPPETS };
