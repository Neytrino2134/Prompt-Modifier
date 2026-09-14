import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import type { Tab } from '../types';
import { useLanguage } from '../localization';
import { Tooltip } from './Tooltip';

interface TabsBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onReorderTabs?: (sourceIndex: number, targetIndex: number) => void;
}

interface DropTargetState {
  index: number;
  position: 'left' | 'right';
}

const TabButton: React.FC<{
    tab: Tab;
    index: number;
    isActive: boolean;
    isDragging: boolean;
    dropTarget: DropTargetState | null;
    onSwitchTab: (id: string) => void;
    onStartEditing: (tab: Tab) => void;
    onCloseTab: (id: string, e: React.MouseEvent) => void;
    onDragStartTab: (index: number, tabId: string, e: React.DragEvent) => void;
    onDragOverTab: (index: number, e: React.DragEvent) => void;
    onDragLeaveTab: (index: number, e: React.DragEvent) => void;
    onDropTab: (index: number, e: React.DragEvent) => void;
    onDragEndTab: () => void;
    t: (key: string) => string;
}> = ({
    tab,
    index,
    isActive,
    isDragging,
    dropTarget,
    onSwitchTab,
    onStartEditing,
    onCloseTab,
    onDragStartTab,
    onDragOverTab,
    onDragLeaveTab,
    onDropTab,
    onDragEndTab,
    t,
}) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollDist, setScrollDist] = useState(0);

    const measureOverflow = () => {
        if (textRef.current && containerRef.current) {
             const dist = containerRef.current.clientWidth - textRef.current.offsetWidth;
             setScrollDist(dist < 0 ? dist : 0);
        }
    };

    useLayoutEffect(() => {
        measureOverflow();
    }, [tab.name]);

    const isDropLeft = dropTarget?.index === index && dropTarget?.position === 'left';
    const isDropRight = dropTarget?.index === index && dropTarget?.position === 'right';

    return (
        <div
            draggable
            onDragStart={(e) => onDragStartTab(index, tab.id, e)}
            onDragOver={(e) => onDragOverTab(index, e)}
            onDragLeave={(e) => onDragLeaveTab(index, e)}
            onDrop={(e) => onDropTab(index, e)}
            onDragEnd={onDragEndTab}
            onClick={() => onSwitchTab(tab.id)}
            onDoubleClick={() => onStartEditing(tab)}
            onMouseEnter={measureOverflow}
            className={`relative flex items-center justify-between gap-1.5 px-2.5 h-6 rounded-md cursor-pointer transition-all duration-150 group flex-shrink-0 select-none max-w-[170px] outline-none focus:outline-none focus:ring-0 ${
                isDragging ? 'opacity-40 scale-95' : 'opacity-100'
            } ${
                isActive 
                    ? 'bg-accent text-white shadow-sm shadow-accent/20 font-semibold border border-transparent' 
                    : 'bg-gray-800/70 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700/40 hover:border-gray-600/70 font-medium'
            }`}
        >
            {/* Insertion drop indicator line on left */}
            {isDropLeft && (
                <div 
                    className="absolute -left-[3px] top-0 bottom-0 w-[3px] bg-accent shadow-[0_0_8px_rgba(59,130,246,1)] rounded-full z-30 pointer-events-none animate-pulse" 
                />
            )}

            {/* Insertion drop indicator line on right */}
            {isDropRight && (
                <div 
                    className="absolute -right-[3px] top-0 bottom-0 w-[3px] bg-accent shadow-[0_0_8px_rgba(59,130,246,1)] rounded-full z-30 pointer-events-none animate-pulse" 
                />
            )}

            {/* Status dot */}
            <span 
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                    isActive ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]' : 'bg-gray-500/50 group-hover:bg-gray-400'
                }`} 
            />

            <Tooltip content={typeof tab.name === 'string' ? tab.name : 'Canvas'} position="bottom" delay={700} className="flex-grow min-w-0">
                <div ref={containerRef} className="flex-grow min-w-0 overflow-hidden relative">
                    <div 
                        className={`inline-block whitespace-nowrap ${scrollDist < 0 ? 'group-hover:animate-swing' : ''}`}
                        style={{ '--scroll-dist': `${scrollDist}px` } as React.CSSProperties}
                    >
                        <span ref={textRef} className="text-xs truncate block leading-none">{typeof tab.name === 'string' ? tab.name : 'Canvas'}</span>
                    </div>
                </div>
            </Tooltip>
            
            <Tooltip content={t('node.action.close')} position="bottom">
                <button
                    type="button"
                    tabIndex={-1}
                    draggable={false}
                    onDragStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id, e);
                    }}
                    className={`p-0.5 rounded transition-colors focus:outline-none focus:ring-0 outline-none flex-shrink-0 ${
                        isActive 
                            ? 'text-white/80 hover:text-white hover:bg-black/25 opacity-75 group-hover:opacity-100' 
                            : 'text-gray-500 hover:text-gray-200 hover:bg-gray-700 opacity-0 group-hover:opacity-100'
                    }`}
                    aria-label={t('node.action.close')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </Tooltip>
        </div>
    );
};

const TabsBar: React.FC<TabsBarProps> = ({ tabs, activeTabId, onSwitchTab, onAddTab, onCloseTab, onRenameTab, onReorderTabs }) => {
  const { t } = useLanguage();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);
  
  const handleStartEditing = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleFinishEditing = () => {
    if (editingTabId && editingName.trim()) {
      onRenameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Drag-and-Drop Handlers
  const handleDragStartTab = useCallback((index: number, tabId: string, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/tab-id', tabId);
    e.dataTransfer.setData('text/tab-index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOverTab = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const position: 'left' | 'right' = e.clientX < midX ? 'left' : 'right';
      
      // Avoid showing indicator on the same spot as dragged item
      if (draggedIndex === index && ((position === 'left' && index === 0) || (position === 'right' && index === tabs.length - 1))) {
        setDropTarget(null);
        return;
      }
      setDropTarget({ index, position });
    } else {
      // External drag (nodes / files) over tab: switch tab to allow dropping inside it
      const targetTab = tabs[index];
      if (targetTab && targetTab.id !== activeTabId) {
        onSwitchTab(targetTab.id);
      }
    }
  }, [draggedIndex, tabs, activeTabId, onSwitchTab]);

  const handleDragLeaveTab = useCallback((index: number, e: React.DragEvent) => {
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(prev => (prev?.index === index ? null : prev));
    }
  }, []);

  const handleDropTab = useCallback((targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && onReorderTabs) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const position: 'left' | 'right' = dropTarget?.position || (e.clientX < midX ? 'left' : 'right');

      let destinationIndex = position === 'left' ? targetIndex : targetIndex + 1;
      if (draggedIndex < destinationIndex) {
        destinationIndex -= 1;
      }

      if (destinationIndex >= 0 && destinationIndex < tabs.length && destinationIndex !== draggedIndex) {
        onReorderTabs(draggedIndex, destinationIndex);
      }
    }

    setDraggedIndex(null);
    setDropTarget(null);
  }, [draggedIndex, dropTarget, onReorderTabs, tabs.length]);

  const handleDragEndTab = useCallback(() => {
    setDraggedIndex(null);
    setDropTarget(null);
  }, []);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    if (draggedIndex !== null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }, [draggedIndex]);

  const handleContainerDrop = useCallback((e: React.DragEvent) => {
    if (draggedIndex !== null && onReorderTabs) {
      e.preventDefault();
      if (dropTarget) {
        handleDropTab(dropTarget.index, e);
      } else {
        // Dropped at the far right end of the container
        const destinationIndex = tabs.length - 1;
        if (destinationIndex !== draggedIndex) {
          onReorderTabs(draggedIndex, destinationIndex);
        }
      }
    }
    setDraggedIndex(null);
    setDropTarget(null);
  }, [draggedIndex, dropTarget, handleDropTab, onReorderTabs, tabs.length]);

  return (
    <div 
      onMouseDown={(e) => e.stopPropagation()}
      className="flex-shrink-0 pointer-events-auto max-w-[calc(100vw-360px)]"
    >
      <div 
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        className="flex items-center h-7 px-1 bg-gray-950/40 border border-gray-800/80 rounded-lg gap-1 overflow-x-auto overflow-y-hidden hide-scrollbar [&::-webkit-scrollbar]:hidden outline-none"
      >
        {tabs.map((tab, idx) => {
          if (editingTabId === tab.id) {
               return (
                <div key={tab.id} className="flex items-center px-2 h-6 rounded-md bg-gray-800 border border-accent max-w-[170px]">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishEditing}
                      onKeyDown={handleKeyDown}
                      className="bg-transparent border-none focus:outline-none text-xs w-full text-white font-medium outline-none"
                      onClick={e => e.stopPropagation()}
                      draggable={false}
                      onDragStart={e => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    />
                </div>
               );
          }
          return (
            <TabButton 
                key={tab.id}
                tab={tab}
                index={idx}
                isActive={tab.id === activeTabId}
                isDragging={draggedIndex === idx}
                dropTarget={dropTarget}
                onSwitchTab={onSwitchTab}
                onStartEditing={handleStartEditing}
                onCloseTab={onCloseTab}
                onDragStartTab={handleDragStartTab}
                onDragOverTab={handleDragOverTab}
                onDragLeaveTab={handleDragLeaveTab}
                onDropTab={handleDropTab}
                onDragEndTab={handleDragEndTab}
                t={t}
            />
          );
        })}
        
        <Tooltip content="New Canvas" position="bottom">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onAddTab()}
              className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-800/70 text-gray-400 hover:text-white hover:bg-accent border border-gray-700/50 hover:border-accent transition-colors focus:outline-none focus:ring-0 outline-none"
              aria-label="Add new tab"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default TabsBar;
