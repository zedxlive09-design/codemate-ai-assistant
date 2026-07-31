import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Panel {
  id: string;
  size: number; // percentage (0-100)
  minSize?: number;
  maxSize?: number;
  resizable?: boolean;
}

interface SplitViewProps {
  direction?: 'horizontal' | 'vertical';
  panels: Array<{
    id: string;
    size: number;
    minSize?: number;
    maxSize?: number;
    content: React.ReactNode;
    collapsible?: boolean;
  }>;
  onResize?: (panelId: string, newSize: number) => void;
  className?: string;
  children?: React.ReactNode; // Alternative to panels prop
}

// Simple two-panel split view
export function SplitView({ 
  direction = 'horizontal', 
  panels, 
  onResize,
  className = '',
  children 
}: SplitViewProps) {
  const [sizes, setSizes] = useState<number[]>(() => panels.map(p => p.size));
  const [activeResizer, setActiveResizer] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize sizes if panels provided
  useEffect(() => {
    if (panels && panels.length > 0) {
      setSizes(panels.map(p => p.size));
    }
  }, [panels]);

  const handleResizeStart = useCallback((panelIndex: number) => {
    setActiveResizer(`resizer-${panelIndex}`);
  }, []);

  const handleResizeEnd = useCallback(() => {
    setActiveResizer(null);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!activeResizer || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const isHorizontal = direction === 'horizontal';

    let totalSize = isHorizontal ? containerRect.width : containerRect.height;
    
    // Get position relative to container
    const position = isHorizontal ? e.clientX - containerRect.left : e.clientY - containerRect.top;
    const percentage = (position / totalSize) * 100;

    // Determine which panel we're resizing
    const resizerIndex = parseInt(activeResizer.split('-')[1]);
    
    // Calculate new sizes
    const newSizes = [...sizes];
    newSizes[resizerIndex] = Math.max(
      panels[resizerIndex]?.minSize || 10,
      Math.min(
        panels[resizerIndex]?.maxSize || 90,
        Math.max(5, Math.min(95, percentage))
      )
    );
    
    // Adjust adjacent panel
    if (resizerIndex < sizes.length - 1) {
      const remaining = 100 - newSizes.slice(0, resizerIndex + 1).reduce((a, b) => a + b, 0);
      newSizes[resizerIndex + 1] = Math.max(5, Math.min(95, remaining));
    }

    setSizes(newSizes);
    onResize?.(panels[resizerIndex].id, newSizes[resizerIndex]);
  }, [activeResizer, sizes, panels, direction, onResize]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleResizeEnd();

    if (activeResizer) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [activeResizer, handleMouseMove, handleResizeEnd]);

  // If children is used instead of panels
  if (children && (!panels || panels.length === 0)) {
    return (
      <div 
        ref={containerRef}
        className={`flex ${direction === 'vertical' ? 'flex-col' : 'flex-row'} ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex ${direction === 'vertical' ? 'flex-col' : 'flex-row'} w-full h-full overflow-hidden ${className}`}
      style={{ cursor: activeResizer ? (direction === 'horizontal' ? 'col-resize' : 'row-resize') : 'default' }}
    >
      {panels.map((panel, index) => {
        const isFirst = index === 0;
        const isLast = index === panels.length - 1;
        
        return (
          <React.Fragment key={panel.id}>
            {/* Panel */}
            <div
              style={{
                flex: `0 0 ${sizes[index]}%`,
                minWidth: panel.minSize ? `${panel.minSize}%` : undefined,
                maxWidth: panel.maxSize ? `${panel.maxSize}%` : undefined,
                overflow: 'hidden',
              }}
              className="overflow-hidden"
            >
              {panel.content}
            </div>

            {/* Resizer Handle */}
            {!isLast && (
              <div
                onMouseDown={() => handleResizeStart(index)}
                className={`group relative z-10 flex-shrink-0 ${
                  direction === 'horizontal'
                    ? 'w-1.5 hover:w-2 cursor-col-resize'
                    : 'h-1.5 hover:h-2 cursor-row-resize'
                } flex items-center justify-center transition-colors duration-150`}
              >
                <div 
                  className={`rounded-full transition-all duration-200 ${
                    activeResizer === `resizer-${index}`
                      ? 'bg-primary-500 shadow-lg shadow-primary-500/50 scale-110'
                      : 'bg-dark-700/60 group-hover:bg-dark-600 group-hover:scale-110'
                  }`}
                  style={{
                    width: direction === 'horizontal' ? '3px' : 'auto',
                    height: direction === 'vertical' ? '3px' : 'auto',
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute inset-0 -inset-x-4 -inset-y-2 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="px-2 py-1 bg-dark-900 text-[10px] text-white rounded-md shadow-lg whitespace-nowrap border border-dark-700">
                    {Math.round(sizes[index])}%
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Three-way split view
interface ThreeWaySplitProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftWidth?: number;
  centerWidth?: number;
  rightWidth?: number;
  onLeftResize?: (width: number) => void;
  onCenterResize?: (width: number) => void;
  onRightResize?: (width: number) => void;
  className?: string;
}

export function ThreeWaySplit({
  leftPanel,
  centerPanel,
  rightPanel,
  leftWidth = 25,
  centerWidth = 50,
  rightWidth = 25,
  onLeftResize,
  onCenterResize,
  onRightResize,
  className = '',
}: ThreeWaySplitProps) {
  const [leftSize, setLeftSize] = useState(leftWidth);
  const [centerSize, setCenterSize] = useState(centerWidth);

  const handleLeftResize = useCallback((newSize: number) => {
    setLeftSize(newSize);
    onLeftResize?.(newSize);
  }, [onLeftResize]);

  const handleCenterResize = useCallback((newSize: number) => {
    setCenterSize(newSize);
    onCenterResize?.(newSize);
  }, [onCenterResize]);

  return (
    <div className={`flex h-full ${className}`}>
      <div style={{ width: `${leftSize}%` }} className="h-full overflow-hidden">
        {leftPanel}
      </div>
      <ResizableDivider 
        direction="horizontal"
        onResize={handleLeftResize} 
        size={leftSize}
      />
      <div style={{ width: `${centerSize}%` }} className="h-full overflow-hidden">
        {centerPanel}
      </div>
      <ResizableDivider 
        direction="horizontal"
        onResize={handleCenterResize} 
        size={centerSize}
      />
      <div style={{ width: `${100 - leftSize - centerSize}%` }} className="h-full overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}

// Resizable divider component
interface ResizableDividerProps {
  direction: 'horizontal' | 'vertical';
  onResize: (newSize: number) => void;
  size: number;
  min?: number;
  max?: number;
  className?: string;
}

function ResizableDivider({
  direction,
  onResize,
  size,
  min = 5,
  max = 95,
  className = ''
}: ResizableDividerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);
  const dividerRef = useRef<HTMLDivElement>(null);

  // Register global mouse listeners ONLY while resizing, and clean them up
  // on mouseup. Uses refs so the move handler always sees fresh values and
  // avoids the stale-closure bug where `isResizing` was captured as `false`.
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta =
        direction === 'horizontal'
          ? e.clientX - startPosRef.current
          : e.clientY - startPosRef.current;

      // Walk up to the flex container that holds the panels.
      const containerEl = dividerRef.current?.parentElement;
      if (!containerEl) return;

      const containerSize =
        direction === 'horizontal'
          ? containerEl.clientWidth
          : containerEl.clientHeight;

      const deltaPercent = (delta / Math.max(containerSize, 1)) * 100;
      const newSize = startSizeRef.current + deltaPercent;

      if (newSize >= min && newSize <= max) {
        onResize(newSize);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, onResize, min, max]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPosRef.current =
        direction === 'horizontal' ? e.clientX : e.clientY;
      startSizeRef.current = size;
      setIsResizing(true);
    },
    [direction, size]
  );

  return (
    <div
      ref={dividerRef}
      onMouseDown={handleMouseDown}
      className={`${className} ${
        direction === 'horizontal'
          ? 'w-1 hover:w-2 cursor-col-resize'
          : 'h-1.5 hover:h-2 cursor-row-resize'
      } group flex-shrink-0 flex items-center justify-center transition-all duration-150`}
    >
      <div 
        className={`rounded-full transition-all duration-200 ${
          isResizing 
            ? 'bg-primary-500 shadow-lg shadow-primary-500/30'
            : 'bg-dark-700/60 group-hover:bg-dark-600 group-hover:scale-x-125'
        }`}
        style={{
          width: direction === 'horizontal' ? '4px' : '100%',
          height: direction === 'vertical' ? '4px' : '100%',
        }}
      />
    </div>
  );
}

// Panel wrapper with collapse support
interface CollapsiblePanelProps {
  id: string;
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  defaultSize?: number;
  collapsed?: boolean;
  onCollapse?: (id: string, collapsed: boolean) => void;
  className?: string;
  headerClassName?: string;
}

export function CollapsiblePanel({
  id,
  children,
  title,
  icon,
  defaultSize = 50,
  collapsed = false,
  onCollapse,
  className = '',
  headerClassName = '',
}: CollapsiblePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [size, setSize] = useState(defaultSize);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapse?.(id, newState);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={toggleCollapse}
        className={`p-2 bg-dark-800/80 hover:bg-dark-700 rounded-lg border border-dark-700/50 transition-all duration-200 hover:border-dark-600 ${className}`}
        title={`Expand ${title}`}
      >
        <div className="flex items-center gap-2 text-sm text-dark-400">
          {icon || (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <span>{title}</span>
        </div>
      </button>
    );
  }

  return (
    <div className={`flex flex-col overflow-hidden ${className}`} style={{ width: `${size}%` }}>
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className={`flex items-center gap-2 px-3 py-2 bg-dark-850/80 border-b border-dark-800/50 text-xs font-medium text-dark-400 hover:text-white hover:bg-dark-800 transition-colors shrink-0 ${headerClassName}`}
      >
        <svg 
          className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6m0 0l6 6" />
        </svg>
        <span>{title}</span>
        
        {/* Collapse hint */}
        <span className="ml-auto text-[9px] opacity-50">Click to collapse</span>
      </button>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export { SplitView as default };
