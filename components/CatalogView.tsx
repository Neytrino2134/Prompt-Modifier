
import React, { useState, useMemo } from 'react';
import type { CatalogItem } from '../hooks/useCatalog';
import { CatalogItemType, ContentCatalogItemType } from '../hooks/useCatalog';
import type { LibraryItem, ContentCatalogItem } from '../types';
import { LibraryItemType } from '../types';
import { useLanguage } from '../localization';
import type { useContentCatalog } from '../hooks/useCatalog';

interface CatalogViewProps {
  isOpen: boolean;
  onClose: () => void;
  // Group Catalog Props
  currentCatalogItems: CatalogItem[];
  catalogPath: { id: string | null, name: string }[];
  onCatalogNavigateBack: () => void;
  onCatalogNavigateToFolder: (folderId: string | null) => void;
  onCreateCatalogFolder: () => void;
  onAddGroupFromCatalog: (itemId: string) => void;
  onRenameCatalogItem: (itemId: string, currentName: string) => void;
  onSaveCatalogItem: (itemId: string) => void;
  onDeleteCatalogItem: (itemId: string) => void;
  onLoadCatalogItemFromFile: () => void;
  onMoveCatalogItem: (itemId: string, newParentId: string | null) => void;
  // Prompt Library Props
  libraryItems: LibraryItem[];
  libraryPath: { id: string | null; name: string; }[];
  onNavigateBack: () => void;
  onNavigateToFolder: (folderId: string | null) => void;
  onCreateLibraryItem: (type: LibraryItemType) => void;
  onEditLibraryItem: (item: LibraryItem) => void;
  onRenameLibraryItem: (itemId: string, currentName: string) => void;
  onDeleteLibraryItem: (itemId: string) => void;
  onSaveLibraryItem: (item: LibraryItem) => void;
  onLoadLibraryItemFromFile: () => void;
  onMoveLibraryItem: (itemId: string, newParentId: string | null) => void;
  // New Content Catalog Props
  characterCatalog: ReturnType<typeof useContentCatalog>;
  scriptCatalog: ReturnType<typeof useContentCatalog>;
  sequenceCatalog: ReturnType<typeof useContentCatalog>;
  // Specific rename handlers for content catalogs
  onRenameCharacter: (itemId: string, currentName: string) => void;
  onRenameScript: (itemId: string, currentName: string) => void;
  onRenameSequence: (itemId: string, currentName: string) => void;
}

const ActionButton: React.FC<{ title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode; disabled?: boolean }> = ({ title, onClick, children, disabled = false }) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => !disabled && setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
        >
            <button
                onClick={onClick}
                onMouseDown={e => e.stopPropagation()}
                aria-label={title}
                disabled={disabled}
                className="p-2 text-gray-300 rounded-full hover:bg-gray-600 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
                {children}
            </button>
            <div
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-lg shadow-xl z-50 transition-all duration-200 ease-out origin-bottom transform ${isTooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              role="tooltip"
            >
              {title}
            </div>
        </div>
    );
};

const TooltipWrapper: React.FC<{ title: string; children: React.ReactElement }> = ({ title, children }) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
        >
            {children}
            <div
                className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-lg shadow-xl z-50 transition-all duration-200 ease-out origin-top transform ${isTooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                role="tooltip"
            >
                {title}
            </div>
        </div>
    );
};


const CatalogItemCard: React.FC<{
  item: CatalogItem;
  onAddToCanvas: (itemId: string) => void;
  onNavigate: (folderId: string) => void;
  onRename: (itemId: string, currentName: string) => void;
  onSave: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  draggedItem: { id: string; tab: string } | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMoveItem: (targetFolderId: string) => void;
  isDragOver: boolean;
  setIsDragOver: (isOver: boolean) => void;
}> = ({ item, onAddToCanvas, onNavigate, onRename, onSave, onDelete, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver }) => {
  const { t } = useLanguage();
  const isFolder = item.type === CatalogItemType.FOLDER;

  const mainAction = isFolder ? () => onNavigate(item.id) : () => {};
  
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart();
    if (item.type === CatalogItemType.GROUP) {
        e.dataTransfer.setData('application/prompt-modifier-drag-item', JSON.stringify({
            type: 'catalog-group',
            itemId: item.id
        }));
        e.dataTransfer.effectAllowed = 'copyMove';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (isFolder && draggedItem && draggedItem.tab === 'groups' && draggedItem.id !== item.id) {
          e.preventDefault();
          setIsDragOver(true);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      if (isFolder) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          onMoveItem(item.id);
      }
  };

  return (
    <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-between space-y-3 border border-gray-600 hover:border-cyan-500 transition-all duration-200 transform hover:-translate-y-1 ${isDragOver ? 'ring-2 ring-cyan-400' : ''}`}
    >
      <div 
        className="relative w-24 h-20 mx-auto mb-2 group"
        onClick={mainAction}
        style={{ cursor: isFolder ? 'pointer' : 'default' }}
      >
        <div className={`absolute w-full h-full ${isFolder ? 'group-hover:scale-110' : ''} bg-gray-800 rounded-lg flex items-center justify-center shadow-lg transition-transform`}>
           {isFolder ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          )}
        </div>
      </div>
      <p className="font-semibold text-gray-100 text-center break-all w-full truncate" title={item.name}>{item.name}</p>
      <div className="flex justify-center space-x-2 w-full pt-2 border-t border-gray-600/50">
        {!isFolder && (
            <ActionButton title={t('catalog.card.addToCanvas')} onClick={() => onAddToCanvas(item.id)}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </ActionButton>
        )}
        <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </ActionButton>
        <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </ActionButton>
        <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </ActionButton>
      </div>
    </div>
  );
};

const LibraryItemCard: React.FC<{
  item: LibraryItem;
  onNavigate: (folderId: string) => void;
  onEdit: (item: LibraryItem) => void;
  onRename: (itemId: string, currentName: string) => void;
  onSave: (item: LibraryItem) => void;
  onDelete: (itemId: string) => void;
  draggedItem: { id: string; tab: string } | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMoveItem: (targetFolderId: string) => void;
  isDragOver: boolean;
  setIsDragOver: (isOver: boolean) => void;
}> = ({ item, onNavigate, onEdit, onRename, onSave, onDelete, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver }) => {
  const { t } = useLanguage();
  const isFolder = item.type === LibraryItemType.FOLDER;

  const handleCopy = () => {
    if (item.content) {
      navigator.clipboard.writeText(item.content).catch(err => console.error("Copy failed", err));
    }
  };

  // Clicking file icon opens editor
  const mainAction = isFolder ? () => onNavigate(item.id) : () => onEdit(item);
  
  const handleDragStart = (e: React.DragEvent) => {
    onDragStart();
    e.dataTransfer.setData('application/prompt-modifier-drag-item', JSON.stringify({
        type: item.type === LibraryItemType.FOLDER ? 'library-folder' : 'library-prompt',
        itemId: item.id
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent) => {
      if (isFolder && draggedItem && draggedItem.tab === 'library' && draggedItem.id !== item.id) {
          e.preventDefault();
          setIsDragOver(true);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      if (isFolder) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          onMoveItem(item.id);
      }
  };

  return (
    <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-between space-y-3 border border-gray-600 hover:border-cyan-500 transition-all duration-200 transform hover:-translate-y-1 ${isDragOver ? 'ring-2 ring-cyan-400' : ''}`}
    >
      <div 
        className="relative w-24 h-20 mx-auto mb-2 group"
        onClick={mainAction}
        style={{ cursor: 'pointer' }}
      >
        <div className={`absolute w-full h-full ${isFolder ? 'group-hover:scale-110' : ''} bg-gray-800 rounded-lg flex items-center justify-center shadow-lg transition-transform`}>
          {isFolder ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
        </div>
      </div>
      
      <div className="text-center w-full min-h-[4rem]">
        <p className="font-semibold text-gray-100 break-all w-full truncate" title={item.name}>{item.name}</p>
        {!isFolder && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.content || t('library.emptyPrompt')}</p>}
      </div>

      <div className="flex justify-center space-x-2 w-full pt-2 border-t border-gray-600/50">
        {!isFolder && (
          <ActionButton title={t('library.actions.copy')} onClick={handleCopy}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </ActionButton>
        )}
        {/* Rename button only for Folders */}
        {isFolder && (
            <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </ActionButton>
        )}
        <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </ActionButton>
        <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </ActionButton>
      </div>
    </div>
  );
};

const ContentCatalogItemCard: React.FC<{
    item: ContentCatalogItem;
    dragItemType: 'CHARACTER' | 'SCRIPT' | 'PROMPT_SEQUENCE';
    onNavigate: (folderId: string) => void;
    onRename: (itemId: string, currentName: string) => void;
    onSave: (itemId: string) => void;
    onDelete: (itemId: string) => void;
    draggedItem: { id: string; tab: string } | null;
    onDragStart: () => void;
    onDragEnd: () => void;
    onMoveItem: (targetFolderId: string) => void;
    isDragOver: boolean;
    setIsDragOver: (isOver: boolean) => void;
    t: (key: string) => string;
}> = ({ item, dragItemType, onNavigate, onRename, onSave, onDelete, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver, t }) => {
    const isFolder = item.type === ContentCatalogItemType.FOLDER;
    const mainAction = isFolder ? () => onNavigate(item.id) : () => {};

    // --- THUMBNAIL LOGIC ---
    const thumbnail = useMemo(() => {
        if (!isFolder && item.content) {
            try {
                const parsed = JSON.parse(item.content);
                // 1. Check for 'image' field (Base64)
                if (parsed.image && typeof parsed.image === 'string' && parsed.image.startsWith('data:')) {
                    return parsed.image;
                }
                // 2. Check for 'imageBase64' field (Base64 without prefix)
                if (parsed.imageBase64 && typeof parsed.imageBase64 === 'string') {
                    return `data:image/png;base64,${parsed.imageBase64}`;
                }
                // 3. Check for 'imageSources' (Character Card structure)
                if (parsed.imageSources && parsed.imageSources['1:1']) {
                     return parsed.imageSources['1:1'];
                }
            } catch {}
        }
        return null;
    }, [item.content, isFolder]);
    // -----------------------

    const handleDragStart = (e: React.DragEvent) => {
        onDragStart();
        const dragData = {
            itemId: item.id,
            type: isFolder ? 'content-catalog-folder' : 'content-catalog-item',
            itemType: dragItemType,
            content: item.content
        };
        e.dataTransfer.setData('application/prompt-modifier-drag-item', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (isFolder && draggedItem && draggedItem.tab === dragItemType && draggedItem.id !== item.id) {
            e.preventDefault();
            setIsDragOver(true);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        if (isFolder) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            onMoveItem(item.id);
        }
    };
    
    const icon = useMemo(() => {
        if (isFolder) return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
        
        if (thumbnail) {
            return <img src={thumbnail} alt={item.name} className="w-full h-full object-cover rounded" />;
        }

        switch(dragItemType) {
            case 'CHARACTER': return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3h15a1.5 1.5 0 011.5 1.5v15a1.5 1.5 0 01-1.5 1.5h-15a1.5 1.5 0 01-1.5-1.5v-15A1.5 1.5 0 014.5 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 17.25h7.5a6 6 0 00-7.5 0z" /></svg>;
            case 'SCRIPT': return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3M15 19.5h-6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0115.75 19.5h-1.5" /></svg>;
            case 'PROMPT_SEQUENCE': return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M6 9h12M6 13h12M6 17h12M3 3h2.5v18H3zm15.5 0H21v18h-2.5z" /></svg>;
            default: return null;
        }
    }, [isFolder, dragItemType, thumbnail]);

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-between space-y-3 border border-gray-600 hover:border-cyan-500 transition-all duration-200 transform hover:-translate-y-1 ${isDragOver ? 'ring-2 ring-cyan-400' : ''}`}
        >
            <div 
                className="relative w-24 h-20 mx-auto mb-2 group"
                onClick={mainAction}
                style={{ cursor: isFolder ? 'pointer' : 'default' }}
            >
                <div className={`absolute w-full h-full ${isFolder ? 'group-hover:scale-110' : ''} bg-gray-800 rounded-lg flex items-center justify-center shadow-lg transition-transform overflow-hidden`}>
                   {icon}
                </div>
            </div>
            <p className="font-semibold text-gray-100 text-center break-all w-full truncate" title={item.name}>{item.name}</p>
            <div className="flex justify-center space-x-2 w-full pt-2 border-t border-gray-600/50">
                <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </ActionButton>
                <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </ActionButton>
                <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </ActionButton>
            </div>
        </div>
    );
};

const ContentCatalogView: React.FC<{
    catalog: ReturnType<typeof useContentCatalog>;
    draggedItem: { id: string, tab: string } | null;
    setDraggedItem: React.Dispatch<React.SetStateAction<{ id: string, tab: string } | null>>;
    dragOverTarget: string | null;
    setDragOverTarget: React.Dispatch<React.SetStateAction<string | null>>;
    dragItemType: 'CHARACTER' | 'SCRIPT' | 'PROMPT_SEQUENCE';
    onRenameItem: (id: string, name: string) => void;
    t: (key: string) => string;
}> = ({ catalog, draggedItem, setDraggedItem, dragOverTarget, setDragOverTarget, dragItemType, onRenameItem, t }) => {
    
    return (
        <>
            <div className="p-3 border-b border-gray-700 flex items-center justify-between space-x-2 flex-shrink-0">
                <div className="flex items-center space-x-1 min-w-0">
                    <div
                        className={`rounded-full transition-colors ${dragOverTarget === `back-${dragItemType}` ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-800' : ''}`}
                        onDragOver={(e) => { if (draggedItem?.tab === dragItemType && catalog.path.length > 1) { e.preventDefault(); setDragOverTarget(`back-${dragItemType}`); }}}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDrop={(e) => {
                            e.preventDefault(); e.stopPropagation(); setDragOverTarget(null);
                            if (!draggedItem || draggedItem.tab !== dragItemType || catalog.path.length <= 1) return;
                            const newParentId = catalog.path[catalog.path.length - 2].id;
                            catalog.moveItem(draggedItem.id, newParentId);
                        }}
                    >
                        <ActionButton title={t('catalog.back')} onClick={catalog.navigateBack} disabled={catalog.path.length <= 1}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </ActionButton>
                    </div>
                    <div className="flex items-center text-sm text-gray-400 truncate">
                        {catalog.path.map((folder, index) => (
                            <React.Fragment key={folder.id || 'root'}>
                                <span onClick={() => catalog.navigateToFolder(folder.id)} className="px-1 hover:text-white cursor-pointer truncate">{folder.name}</span>
                                {index < catalog.path.length - 1 && <span className="px-1 select-none">/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                    <TooltipWrapper title={t('catalog.load')}>
                        <button onClick={catalog.triggerLoadFromFile} className="px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 rounded-md flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                            <span>{t('library.loadFromFile')}</span>
                        </button>
                    </TooltipWrapper>
                    <TooltipWrapper title={t('catalog.newFolder')}>
                        <button onClick={() => catalog.createItem(ContentCatalogItemType.FOLDER, t('library.actions.newFolder'))} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                            <span>{t('library.actions.newFolder')}</span>
                        </button>
                    </TooltipWrapper>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                {catalog.currentItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                        {catalog.currentItems.map((item) => (
                            <ContentCatalogItemCard
                                key={item.id} item={item} dragItemType={dragItemType}
                                onNavigate={catalog.navigateToFolder}
                                onRename={onRenameItem}
                                onSave={catalog.saveItemToDisk}
                                onDelete={catalog.deleteItem}
                                draggedItem={draggedItem}
                                onDragStart={() => setDraggedItem({ id: item.id, tab: dragItemType })}
                                onDragEnd={() => { setDraggedItem(null); setDragOverTarget(null); }}
                                onMoveItem={(targetFolderId) => catalog.moveItem(draggedItem!.id, targetFolderId)}
                                isDragOver={dragOverTarget === item.id}
                                setIsDragOver={(isOver) => setDragOverTarget(isOver ? item.id : null)}
                                t={t}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        <p className="font-semibold">{t('library.empty.title')}</p>
                        <p className="text-sm">{t('catalog.empty.description')}</p>
                    </div>
                )}
            </div>
        </>
    );
};

export const CatalogView: React.FC<CatalogViewProps> = (props) => {
  const { 
    isOpen, onClose,
    currentCatalogItems, catalogPath, onCatalogNavigateBack, onCatalogNavigateToFolder, onCreateCatalogFolder, onAddGroupFromCatalog, onRenameCatalogItem, onSaveCatalogItem, onDeleteCatalogItem, onLoadCatalogItemFromFile, onMoveCatalogItem,
    libraryItems, libraryPath, onNavigateBack, onNavigateToFolder, onCreateLibraryItem, onEditLibraryItem, onRenameLibraryItem, onDeleteLibraryItem, onSaveLibraryItem, onLoadLibraryItemFromFile, onMoveLibraryItem,
    onRenameCharacter, onRenameScript, onRenameSequence
  } = props;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'groups' | 'library' | 'characters' | 'scripts' | 'sequences'>('groups');
  const [draggedItem, setDraggedItem] = useState<{ id: string; tab: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const renderGroupCatalog = () => (
    <>
      <div className="p-3 border-b border-gray-700 flex items-center justify-between space-x-2 flex-shrink-0">
        <div className="flex items-center space-x-1 min-w-0">
          <div
            className={`rounded-full transition-colors ${dragOverTarget === 'back-groups' ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-800' : ''}`}
            onDragOver={(e) => { if (draggedItem?.tab === 'groups' && catalogPath.length > 1) { e.preventDefault(); setDragOverTarget('back-groups'); }}}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverTarget(null);
              if (!draggedItem || draggedItem.tab !== 'groups' || catalogPath.length <= 1) return;
              const newParentId = catalogPath[catalogPath.length - 2].id;
              onMoveCatalogItem(draggedItem.id, newParentId);
            }}
          >
            <ActionButton
              title={t('catalog.back')}
              onClick={onCatalogNavigateBack} 
              disabled={catalogPath.length <= 1} 
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </ActionButton>
          </div>
          <div className="flex items-center text-sm text-gray-400 truncate">
              {catalogPath.map((folder, index) => (
                  <React.Fragment key={folder.id || 'root'}>
                      <span onClick={() => onCatalogNavigateToFolder(folder.id)} className="px-1 hover:text-white cursor-pointer truncate">{folder.name}</span>
                      {index < catalogPath.length - 1 && <span className="px-1 select-none">/</span>}
                  </React.Fragment>
              ))}
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <TooltipWrapper title={t('catalog.load')}>
            <button onClick={onLoadCatalogItemFromFile} className="px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 rounded-md flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              <span>{t('library.loadFromFile')}</span>
            </button>
          </TooltipWrapper>
          <TooltipWrapper title={t('catalog.newFolder')}>
            <button onClick={onCreateCatalogFolder} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              <span>{t('library.actions.newFolder')}</span>
            </button>
          </TooltipWrapper>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {currentCatalogItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {currentCatalogItems.map((item) => (
              <CatalogItemCard 
                key={item.id} 
                item={item} 
                onAddToCanvas={onAddGroupFromCatalog} 
                onNavigate={(folderId) => onCatalogNavigateToFolder(folderId)}
                onRename={onRenameCatalogItem} 
                onSave={onSaveCatalogItem} 
                onDelete={onDeleteCatalogItem}
                draggedItem={draggedItem}
                onDragStart={() => setDraggedItem({ id: item.id, tab: 'groups' })}
                onDragEnd={handleDragEnd}
                onMoveItem={(targetFolderId) => onMoveCatalogItem(draggedItem!.id, targetFolderId)}
                isDragOver={dragOverTarget === item.id}
                setIsDragOver={(isOver) => setDragOverTarget(isOver ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              <p className="font-semibold">{t('library.empty.title')}</p>
              <p className="text-sm">{t('catalog.empty.description')}</p>
          </div>
        )}
      </div>
    </>
  );

  const renderPromptLibrary = () => (
    <>
      <div className="p-3 border-b border-gray-700 flex items-center justify-between space-x-2 flex-shrink-0">
        <div className="flex items-center space-x-1 min-w-0">
          <div
            className={`rounded-full transition-colors ${dragOverTarget === 'back-library' ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-800' : ''}`}
            onDragOver={(e) => { if (draggedItem?.tab === 'library' && libraryPath.length > 1) { e.preventDefault(); setDragOverTarget('back-library'); }}}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverTarget(null);
              if (!draggedItem || draggedItem.tab !== 'library' || libraryPath.length <= 1) return;
              const newParentId = libraryPath[libraryPath.length - 2].id;
              onMoveLibraryItem(draggedItem.id, newParentId);
            }}
          >
            <ActionButton
              title={t('catalog.back')}
              onClick={onNavigateBack} 
              disabled={libraryPath.length <= 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </ActionButton>
          </div>
          <div className="flex items-center text-sm text-gray-400 truncate">
              {libraryPath.map((folder, index) => (
                  <React.Fragment key={folder.id || 'root'}>
                      <span onClick={() => onNavigateToFolder(folder.id)} className="px-1 hover:text-white cursor-pointer truncate">{folder.name}</span>
                      {index < libraryPath.length - 1 && <span className="px-1 select-none">/</span>}
                  </React.Fragment>
              ))}
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <TooltipWrapper title={t('catalog.load')}>
            <button onClick={onLoadLibraryItemFromFile} className="px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 rounded-md flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              <span>{t('library.loadFromFile')}</span>
            </button>
          </TooltipWrapper>
          <TooltipWrapper title={t('catalog.newFolder')}>
            <button onClick={() => onCreateLibraryItem(LibraryItemType.FOLDER)} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              <span>{t('library.actions.newFolder')}</span>
            </button>
          </TooltipWrapper>
          <TooltipWrapper title={t('library.actions.newPrompt')}>
            <button onClick={() => onCreateLibraryItem(LibraryItemType.PROMPT)} className="px-3 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 rounded-md flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>{t('library.actions.newPrompt')}</span>
            </button>
          </TooltipWrapper>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {libraryItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {libraryItems.map((item) => (
              <LibraryItemCard 
                key={item.id} 
                item={item} 
                onNavigate={onNavigateToFolder as (folderId: string) => void} 
                onEdit={onEditLibraryItem} 
                onRename={onRenameLibraryItem} 
                onSave={onSaveLibraryItem} 
                onDelete={onDeleteLibraryItem} 
                draggedItem={draggedItem}
                onDragStart={() => setDraggedItem({ id: item.id, tab: 'library' })}
                onDragEnd={handleDragEnd}
                onMoveItem={(targetFolderId) => onMoveLibraryItem(draggedItem!.id, targetFolderId)}
                isDragOver={dragOverTarget === item.id}
                setIsDragOver={(isOver) => setDragOverTarget(isOver ? item.id : null)}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <p className="font-semibold">{t('library.empty.title')}</p>
            <p className="text-sm">{t('library.empty.description')}</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl border border-gray-700 flex flex-col h-[80vh] pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
        <div className="p-4 pb-0 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-end space-x-4">
            <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'groups' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.groups')}</button>
            <button onClick={() => setActiveTab('library')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'library' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.library')}</button>
            <button onClick={() => setActiveTab('characters')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'characters' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.characters')}</button>
            <button onClick={() => setActiveTab('scripts')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'scripts' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.scripts')}</button>
            <button onClick={() => setActiveTab('sequences')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'sequences' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.sequences')}</button>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {activeTab === 'groups' && renderGroupCatalog()}
        {activeTab === 'library' && renderPromptLibrary()}
        {activeTab === 'characters' && <ContentCatalogView catalog={props.characterCatalog} dragItemType="CHARACTER" onRenameItem={onRenameCharacter} t={t} draggedItem={draggedItem} setDraggedItem={setDraggedItem} dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} />}
        {activeTab === 'scripts' && <ContentCatalogView catalog={props.scriptCatalog} dragItemType="SCRIPT" onRenameItem={onRenameScript} t={t} draggedItem={draggedItem} setDraggedItem={setDraggedItem} dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} />}
        {activeTab === 'sequences' && <ContentCatalogView catalog={props.sequenceCatalog} dragItemType="PROMPT_SEQUENCE" onRenameItem={onRenameSequence} t={t} draggedItem={draggedItem} setDraggedItem={setDraggedItem} dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} />}
      </div>
    </div>
  );
};
