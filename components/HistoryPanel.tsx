import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Tooltip } from './Tooltip';
import { getModelDisplayName, setupImageDragData } from '../utils/imageUtils';
import { StatisticsTab } from './StatisticsTab';
import { StatisticsModal } from './StatisticsModal';

export const HistoryPanel: React.FC = () => {
  const context = useAppContext();
  if (!context) return null;

  const { historyItems, isHistoryPanelOpen, setIsHistoryPanelOpen, removeHistoryItems, clearHistory, historyLimit, setHistoryLimit, setImageViewer, t } = context;
  const [activeTab, setActiveTab] = useState<'images' | 'stats'>('images');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      <div className={`fixed top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 shadow-2xl z-[200] flex flex-col transition-transform duration-300 ease-in-out ${isHistoryPanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0">
          <h2 className="text-gray-100 font-semibold flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('ui.generation_history') || 'Generation History'}
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
          <button onClick={() => setIsHistoryPanelOpen(false)} className="text-gray-400 hover:text-white transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex border-b border-gray-800 bg-gray-950/80 px-2 pt-1 gap-1">
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

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-950">
              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">{t('ui.history_empty') || 'History is empty'}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className={`relative bg-gray-800 rounded-lg overflow-hidden group transition-all flex flex-col ${
                        isSelectMode && selectedIds.has(item.id) ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-gray-600'
                      }`}
                    >
                      <div className="px-3 pt-2 pb-1 bg-gray-800 flex justify-between items-center text-xs text-gray-400 gap-1.5 min-w-0">
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
                      <div 
                        className="relative w-full aspect-square bg-gray-900 cursor-pointer"
                        onClick={() => {
                          if (isSelectMode) {
                            toggleSelection(item.id);
                          } else if (item.url && setImageViewer) {
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
                          className="w-full h-full"
                          delay={150}
                        >
                          <img
                            src={item.url}
                            alt={item.prompt || 'Generated image'}
                            className="w-full h-full object-contain"
                            draggable={!isSelectMode}
                            onDragStart={(e) => !isSelectMode && handleDragStart(e, item.url, item.prompt)}
                          />
                        </Tooltip>
                        
                        {/* Floating Actions on Image */}
                        {!isSelectMode && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm p-1 rounded-md">
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
                          <div className="absolute top-2 left-2">
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
                      
                      {/* Prompt frame below */}
                      <div className="p-3 bg-gray-800/80 border-t border-gray-700 flex flex-col gap-2 relative">
                        <p className="text-xs text-gray-300 line-clamp-3 select-text cursor-text pr-6" onMouseDown={(e) => e.stopPropagation()}>{item.prompt}</p>
                        {!isSelectMode && item.prompt && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleCopyText(item.prompt); }}
                             className="absolute right-2 top-2 text-gray-500 hover:text-gray-300 transition-colors"
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

