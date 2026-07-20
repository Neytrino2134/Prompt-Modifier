import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

export const HistoryPanel: React.FC = () => {
  const context = useAppContext();
  if (!context) return null;

  const { historyItems, isHistoryPanelOpen, setIsHistoryPanelOpen, removeHistoryItems, clearHistory, t } = context;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  if (!isHistoryPanelOpen) return null;

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, url: string, prompt: string) => {
    e.dataTransfer.setData('text/plain', url);
    e.dataTransfer.setData('application/prompt-modifier-drag-info', JSON.stringify({ src: url, prompt }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCopy = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      // Optional: Add a toast notification here
      context.addToast?.(t('ui.copied_to_clipboard') || 'Copied to clipboard', 'success');
    } catch (e) {
      console.error('Failed to copy image', e);
    }
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 shadow-2xl z-[200] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0">
        <h2 className="text-gray-100 font-semibold">{t('ui.generation_history') || 'Generation History'}</h2>
        <button onClick={() => setIsHistoryPanelOpen(false)} className="text-gray-400 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <div className="grid grid-cols-2 gap-3">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className={`relative aspect-square bg-gray-800 rounded-lg overflow-hidden group cursor-pointer transition-all ${
                  isSelectMode && selectedIds.has(item.id) ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-gray-600'
                }`}
                onClick={() => isSelectMode ? toggleSelection(item.id) : null}
              >
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="w-full h-full object-cover"
                  draggable={!isSelectMode}
                  onDragStart={(e) => !isSelectMode && handleDragStart(e, item.url, item.prompt)}
                  title={item.prompt}
                />
                {!isSelectMode && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-xs text-gray-300 line-clamp-2 mb-2">{item.prompt}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCopy(item.url); }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 rounded text-xs transition-colors"
                      >
                        {t('ui.copy') || 'Copy'}
                      </button>
                    </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
