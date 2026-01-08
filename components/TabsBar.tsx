
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
}

const TabButton: React.FC<{
    tab: Tab;
    isActive: boolean;
    onSwitchTab: (id: string) => void;
    onStartEditing: (tab: Tab) => void;
    onCloseTab: (id: string, e: React.MouseEvent) => void;
    t: (key: string) => string;
}> = ({ tab, isActive, onSwitchTab, onStartEditing, onCloseTab, t }) => {
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

    return (
        <div
            onClick={() => onSwitchTab(tab.id)}
            onDoubleClick={() => onStartEditing(tab)}
            onDragOver={(e) => {
                  e.preventDefault();
                  if (!isActive) onSwitchTab(tab.id);
            }}
            onMouseEnter={measureOverflow}
            className={`flex items-center justify-between px-4 h-full rounded-md cursor-pointer transition-colors duration-150 group flex-shrink-0 ${
                isActive ? 'bg-accent text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } max-w-[200px] overflow-hidden select-none`}
        >
            <Tooltip content={tab.name} position="bottom" delay={800} className="flex-grow min-w-0">
                <div ref={containerRef} className="flex-grow min-w-0 overflow-hidden relative mask-fade">
                        <div 
                            className={`inline-block whitespace-nowrap ${scrollDist < 0 ? 'group-hover:animate-swing' : ''}`}
                            style={{ '--scroll-dist': `${scrollDist}px` } as React.CSSProperties}
                        >
                            <span ref={textRef} className="text-sm pr-1 block">{tab.name}</span>
                        </div>
                </div>
            </Tooltip>
            
            <Tooltip content={t('node.action.close')} position="bottom">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id, e);
                    }}
                    className={`ml-3 p-0.5 rounded-full transition-opacity focus:outline-none opacity-50 group-hover:opacity-100 ${
                    isActive 
                        ? 'text-white hover:bg-accent-hover' 
                        : 'text-gray-500 hover:bg-gray-600 hover:text-white'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </Tooltip>
        </div>
    );
};

const TabsBar: React.FC<TabsBarProps> = ({ tabs, activeTabId, onSwitchTab, onAddTab, onCloseTab, onRenameTab }) => {
  const { t } = useLanguage();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
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

  return (
    <div 
      onMouseDown={(e) => e.stopPropagation()}
      className="flex-shrink-0 pointer-events-auto max-w-[calc(100vw-350px)]"
    >
      <div 
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex items-center h-9 space-x-1 overflow-x-auto overflow-y-hidden hide-scrollbar [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(tab => {
          if (editingTabId === tab.id) {
               return (
                <div key={tab.id} className="flex items-center justify-between px-4 h-full rounded-md bg-gray-700 max-w-[200px]">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishEditing}
                      onKeyDown={handleKeyDown}
                      className="bg-transparent border-b border-accent-text focus:outline-none text-sm w-full text-white"
                      onClick={e => e.stopPropagation()}
                    />
                </div>
               );
          }
          return (
            <TabButton 
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onSwitchTab={onSwitchTab}
                onStartEditing={handleStartEditing}
                onCloseTab={onCloseTab}
                t={t}
            />
          );
        })}
        
        <Tooltip content="New Canvas" position="bottom" className="h-full">
            <button
            onClick={onAddTab}
            className="flex-shrink-0 flex items-center justify-center w-8 h-full rounded-md bg-gray-700 text-gray-300 hover:bg-accent hover:text-white transition-colors focus:outline-none"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default TabsBar;
