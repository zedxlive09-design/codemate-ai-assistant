import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
  children?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  parentRef?: React.RefObject<HTMLElement>;
}

export default function ContextMenu({ items, x, y, onClose, parentRef }: ContextMenuProps) {
  const [position, setPosition] = useState({ x, y });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Adjust position if menu goes off-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }
      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Handle item click
  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled || item.divider || item.children) return;
    
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  }, [onClose]);

  // Handle submenu hover
  const handleItemHover = (itemId: string | null) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    setActiveSubmenu(itemId);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[10000] min-w-[200px] py-1.5 context-menu scale-in origin-top-left"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} className="context-menu-divider my-1" />;
        }

        const hasChildren = item.children && item.children.length > 0;

        return (
          <div
            key={item.id}
            className="relative group"
            onMouseEnter={() => hasChildren && handleItemHover(item.id)}
            onMouseLeave={() => hasChildren && handleItemHover(null)}
          >
            <button
              className={`w-full context-menu-item ${item.danger ? '!text-red-400 hover:!bg-red-500/10' : ''} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && (
                <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
              )}
              <span className="flex-1 text-left truncate">{item.label}</span>
              
              {/* Shortcut hint */}
              {item.shortcut && (
                <span className="ml-auto text-[10px] text-dark-600 font-mono opacity-60">
                  {item.shortcut}
                </span>
              )}
              
              {/* Submenu arrow */}
              {hasChildren && (
                <svg className="w-3 h-3 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {/* Submenu */}
            {hasChildren && activeSubmenu === item.id && (
              <div
                className="absolute left-full top-0 ml-1 context-menu scale-in origin-top-left"
                onMouseEnter={() => { if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current); }}
                onMouseLeave={() => handleItemHover(null)}
              >
                {(item.children || []).map((child, childIndex) => 
                  child.divider ? (
                    <div key={childIndex} className="context-menu-divider my-1" />
                  ) : (
                    <button
                      key={child.id}
                      className={`w-full context-menu-item ${child.danger ? '!text-red-400 hover:!bg-red-500/10' : ''}`}
                      onClick={() => {
                        if (child.onClick) child.onClick();
                        onClose();
                      }}
                      disabled={child.disabled}
                    >
                      {child.icon && (
                        <span className="w-4 h-4 flex-shrink-0">{child.icon}</span>
                      )}
                      <span>{child.label}</span>
                      {child.shortcut && (
                        <span className="ml-auto text-[10px] font-mono opacity-60">
                          {child.shortcut}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Hook to manage context menu
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    items: ContextMenuItem[];
    x: number;
    y: number;
  } | null>(null);

  const showContextMenu = useCallback((e: MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    setContextMenu({
      items,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}

// Predefined menu builders
export const MenuBuilders = {
  // Conversation menu (for sidebar items)
  conversation: (onAction: (action: string) => void) => [
    { id: 'open', label: 'Open Chat', icon: <ChatIcon />, onClick: () => onAction('open') },
    { id: 'divider1', label: '', divider: true as const },
    { id: 'rename', label: 'Rename...', icon: <RenameIcon />, onClick: () => onAction('rename') },
    { id: 'duplicate', label: 'Duplicate', icon: <CopyIcon />, onClick: () => onAction('duplicate'), shortcut: 'Ctrl+D' },
    { id: 'divider2', label: '', divider: true as const },
    { id: 'export', label: 'Export as Markdown', icon: <ExportIcon />, onClick: () => onAction('export') },
    { id: 'divider3', label: '', divider: true as const },
    { id: 'delete', label: 'Delete Chat', icon: <TrashIcon />, danger: true, onClick: () => onAction('delete') },
  ],

  // File menu (for file explorer)
  file: (filePath: string, onAction: (action: string) => void) => [
    { id: 'open', label: 'Open File', icon: <FileIcon />, onClick: () => onAction('open') },
    { id: 'edit', label: 'Edit in Editor', icon: <EditIcon />, onClick: () => onAction('edit') },
    { id: 'divider1', label: '', divider: true as const },
    { id: 'copy-path', label: 'Copy Path', icon: <CopyIcon />, onClick: () => onAction('copy-path'), shortcut: 'Ctrl+Shift+C' },
    { id: 'reveal', label: 'Reveal in Finder/Explorer', icon: <FolderIcon />, onClick: () => onAction('reveal') },
    { id: 'divider2', label: '', divider: true as const },
    { id: 'search-in-file', label: 'Search in File...', icon: <SearchIcon />, onClick: () => onAction('search'), shortcut: 'Ctrl+F' },
    { id: 'divider3', label: '', divider: true as const },
    { id: 'new-file', label: 'New File', icon: <NewIcon />, onClick: () => onAction('new-file'), shortcut: 'Ctrl+N' },
    { id: 'new-folder', label: 'New Folder', icon: <FolderIcon />, onClick: () => onAction('new-folder') },
    { id: 'divider4', label: '', divider: true as const },
    { id: 'delete', label: 'Delete', icon: <TrashIcon />, danger: true, onClick: () => onAction('delete') },
  ],

  // Message menu (for chat messages)
  message: (onAction: (action: string) => void) => [
    { id: 'copy', label: 'Copy Text', icon: <CopyIcon />, onClick: () => onAction('copy'), shortcut: 'Ctrl+C' },
    { id: 'divider1', label: '', divider: true as const },
    { id: 'explain', label: 'Ask AI to Explain', icon: <SparkleIcon />, onClick: () => onAction('explain') },
    { id: 'refactor', label: 'Ask AI to Refactor', icon: <RefreshIcon />, onClick: () => onAction('refactor') },
    { id: 'tests', label: 'Generate Tests', icon: <CheckIcon />, onClick: () => onAction('tests') },
    { id: 'divider2', label: '', divider: true as const },
    { id: 'quote', label: 'Quote in Reply', icon: <QuoteIcon />, onClick: () => onAction('quote') },
  ],
};

// Simple SVG Icons
function ChatIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function RenameIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function NewIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-2l2 2 4-4m0 0l4 4m-4-4V9m0 4h4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
