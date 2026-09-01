import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Tooltip } from './Tooltip';
import { getModelDisplayName, setupImageDragData } from '../utils/imageUtils';
import { StatisticsTab } from './StatisticsTab';
import { StatisticsModal } from './StatisticsModal';

export const HistoryPanel: React.FC = () => {
  const context = useAppContext();
  if (!context) return null;

  const { historyItems, isHistoryPanelOpen, setIsHistoryPanelOpen, setIsTaskQueuePanelOpen, removeHistoryItems, clearHistory, historyLimit, setHistoryLimit, setImageViewer, t } = context;
  const [activeTab, setActiveTab] = useState<'images' | 'stats'>('images');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Virtualization State
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(384);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
        setContainerHeight(entries[0].contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeTab, isHistoryPanelOpen]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Card & Virtual slot calculations
  const GAP = 16;
  const cardWidth = Math.max(180, containerWidth - 24); // container padding p-3 (12px * 2)
  const cardHeight = cardWidth + 32 + 70; // Header 32px + Square Image + Prompt footer ~70px
  const slotHeight = cardHeight + GAP;
  const totalVirtualHeight = historyItems.length > 0 ? (historyItems.length * slotHeight - GAP) : 0;

  const visibleItems = useMemo(() => {
    if (historyItems.length === 0) return [];
    const buffer = 600; // Extra buffer (px) for smooth scrolling
    const visibleStart = Math.max(0, scrollTop - buffer);
    const visibleEnd = scrollTop + containerHeight + buffer;

    const startIndex = Math.max(0, Math.floor(visibleStart / slotHeight));
    const endIndex = Math.min(historyItems.length - 1, Math.ceil(visibleEnd / slotHeight));

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        item: historyItems[i],
        index: i,
        top: i * slotHeight,
      });
    }
    return items;
  }, [historyItems, scrollTop, containerHeight, slotHeight]);

  useEffect(() => {
    const handleOpenStats = () => {
      setIsHistoryPanelOpen(true);
      setActiveTab('stats');
    };
    const handleOpenDetailedStats = () => {
      setIsStatsModalOpen(true);
    };
    window.addEventListener('open-generation-stats', handleOpenStats);
    window.addEventListener('open-detailed-generation-stats', handleOpenDetailedStats);
    return () => {
      window.removeEventListener('open-generation-stats', handleOpenStats);
      window.removeEventListener('open-detailed-generation-stats', handleOpenDetailedStats);
    };
  }, [setIsHistoryPanelOpen]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    removeHistoryItems(Array.from(selectedIds));
    setSelectedIds(newSet => {
      newSet.clear();
      return newSet;
    });
    setIsSelectMode(false);
  };

  const handleDragStart = (e: React.DragEvent<HTMLImageElement>, url: string, prompt: string) => {
    const safeName = (prompt || 'image').slice(0, 40).replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeName}.png`;
    // Always use full-resolution original image for dragging to canvas or external apps
    setupImageDragData(e, url, filename, prompt);
  };

  const handleCopyImage = async (url: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create blob');
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      context.addToast?.(t('ui.copied_to_clipboard') || 'Copied to clipboard', 'success');
    } catch (e) {
      console.error('Failed to copy image', e);
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      context.addToast?.(t('ui.copied_to_clipboard') || 'Copied to clipboard', 'success');
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <>
      <div className={`fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-[200] flex flex-col transition-transform duration-300 ease-in-out ${isHistoryPanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0 select-none">
          <h2 className="text-gray-100 font-semibold flex items-center gap-2 text-sm select-none">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('ui.generation_history') || 'Generation History'}</span>
            {activeTab === 'images' && (
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="text-gray-400 hover:text-white transition-colors ml-1"
                title="History Settings"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                </svg>
              </button>
            )}
          </h2>

          <div className="flex items-center gap-1.5 select-none">
            <button
              onClick={() => {
                setIsHistoryPanelOpen(false);
                setIsTaskQueuePanelOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-medium text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-md transition-colors flex items-center gap-1.5"
              title={t('ui.to_tasks') || 'To Tasks'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>{t('ui.to_tasks') || 'To Tasks'}</span>
            </button>

            <button
              onClick={() => setIsHistoryPanelOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex border-b border-gray-800 bg-gray-950/80 px-2 pt-1 gap-1 select-none">
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'images'
                ? 'border-accent text-white bg-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{t('ui.history_tab_images') || 'Галерея'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
              {historyItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'stats'
                ? 'border-accent text-white bg-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
            }`}
          >
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{t('ui.history_tab_stats') || 'Статистика'}</span>
          </button>
        </div>

        {/* Tab 1: Images Gallery */}
        {activeTab === 'images' && (
          <>
            {/* Settings Dropdown */}
            {isSettingsOpen && (
              <div className="p-4 border-b border-gray-800 bg-gray-900 shadow-inner">
                <label className="flex items-center justify-between text-sm text-gray-300 mb-2">
                  Limit ({historyLimit})
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="1"
                    value={historyLimit} 
                    onChange={(e) => setHistoryLimit(parseInt(e.target.value, 10))}
                    className="w-32 accent-accent"
                  />
                </label>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex gap-2 p-3 border-b border-gray-800 bg-gray-900/50">
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedIds(new Set());
                }}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${isSelectMode ? 'bg-accent text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                {isSelectMode ? (t('ui.cancel') || 'Cancel') : (t('ui.select') || 'Select')}
              </button>
              {isSelectMode && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className="flex-1 py-1.5 px-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('ui.delete') || 'Delete'} ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm(t('ui.confirm_clear_history') || 'Are you sure you want to clear all history?')) {
                    clearHistory();
                    setIsSelectMode(false);
                  }
                }}
                className="py-1.5 px-3 bg-gray-800 hover:bg-red-900/80 text-gray-400 hover:text-red-200 rounded text-sm transition-colors"
                title={t('ui.clear_all') || 'Clear All'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Virtualized List Container */}
            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 bg-gray-950 relative"
            >
              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">{t('ui.history_empty') || 'History is empty'}</p>
                </div>
              ) : (
                <div 
                  style={{ height: `${totalVirtualHeight}px`, position: 'relative', width: '100%' }}
                >
                  {visibleItems.map(({ item, top }) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: 0,
                        right: 0,
                        height: `${cardHeight}px`,
                      }}
                      className={`bg-gray-800 rounded-lg overflow-hidden group transition-all flex flex-col ${
                        isSelectMode && selectedIds.has(item.id) ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-gray-600'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="px-3 pt-2 pb-1 bg-gray-800 flex justify-between items-center text-xs text-gray-400 gap-1.5 min-w-0 shrink-0 h-8">
                         <span className="truncate text-gray-400 text-[11px] shrink min-w-0">{formatTimestamp(item.timestamp)}</span>
                         {item.model && (
                           <span 
                             className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 truncate max-w-[130px] shrink-0" 
                             title={item.model}
                           >
                             {getModelDisplayName(item.model)}
                           </span>
                         )}
                      </div>

                      {/* Square Image Preview (Uses 128x128 compressed thumbnail for fast display, original for full view/drag/copy) */}
                      <div 
                        className="relative w-full flex-1 bg-gray-900 cursor-pointer overflow-hidden flex items-center justify-center select-none"
                        onClick={() => {
                          if (isSelectMode) {
                            toggleSelection(item.id);
                          } else if (item.url && setImageViewer) {
                            // Opens the full-resolution original image
                            setImageViewer({
                              sources: [{ 
                                src: item.url, 
                                frameNumber: 0, 
                                prompt: item.prompt,
                                model: item.model,
                                aspectRatio: item.aspectRatio,
                                resolution: item.resolution
                              }],
                              initialIndex: 0
                            });
                          }
                        }}
                      >
                        <Tooltip
                          content={
                            item.prompt ? (
                              <div className="max-w-xs text-xs text-gray-100 leading-relaxed whitespace-normal break-words p-1 font-sans">
                                {item.prompt}
                              </div>
                            ) : null
                          }
                          position="left"
                          className="w-full h-full flex items-center justify-center"
                          delay={150}
                        >
                          <img
                            src={item.thumbnailUrl || item.url}
                            alt={item.prompt || 'Generated image'}
                            className="w-full h-full object-contain select-none"
                            loading="lazy"
                            draggable={!isSelectMode}
                            onDragStart={(e) => !isSelectMode && handleDragStart(e, item.url, item.prompt)}
                          />
                        </Tooltip>
                        
                        {/* Floating Actions on Image */}
                        {!isSelectMode && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm p-1 rounded-md z-10">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); setIsSelectMode(true); }}
                              className="text-gray-300 hover:text-white p-1 rounded hover:bg-white/20 transition-colors"
                              title={t('ui.select') || 'Select'}
                            >
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleCopyImage(item.url); }}
                              className="text-gray-300 hover:text-white p-1 rounded hover:bg-white/20 transition-colors"
                              title={t('ui.copy') || 'Copy Image'}
                            >
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeHistoryItems([item.id]); }}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-colors"
                              title={t('ui.delete') || 'Delete'}
                            >
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}

                        {isSelectMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedIds.has(item.id) ? 'bg-accent border-accent' : 'border-gray-400 bg-black/50'
                            }`}>
                              {selectedIds.has(item.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Prompt Frame Below */}
                      <div className="p-3 bg-gray-800/80 border-t border-gray-700 flex flex-col gap-1 relative shrink-0 min-h-[64px] max-h-[76px] justify-center">
                        <p className="text-xs text-gray-300 line-clamp-2 select-text cursor-text pr-6 leading-relaxed" onMouseDown={(e) => e.stopPropagation()}>
                          {item.prompt || '(no prompt)'}
                        </p>
                        {!isSelectMode && item.prompt && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleCopyText(item.prompt); }}
                             className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300 transition-colors p-1"
                             title="Copy Text"
                           >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                           </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Statistics */}
        {activeTab === 'stats' && (
          <StatisticsTab onOpenDetailedModal={() => setIsStatsModalOpen(true)} />
        )}
      </div>

      {/* Detailed Statistics Modal */}
      <StatisticsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />
    </>
  );
};


