
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CatalogItem } from '../hooks/useCatalog';
import { CatalogItemType, ContentCatalogItemType } from '../hooks/useCatalog';
import type { LibraryItem, ContentCatalogItem } from '../types';
import { LibraryItemType } from '../types';
import { useLanguage } from '../localization';
import type { useContentCatalog } from '../hooks/useCatalog';
import { 
    GoogleDriveIcon, CloudUploadIcon, CloudDownloadIcon, CopyIcon,
    FolderIcon, GroupItemIcon, FileIcon, RenameIcon, SaveIcon, DeleteIcon, BackIcon, AddFolderIcon, LoadFileIcon, ClearCloudIcon, CharacterIcon, ScriptIcon, SequenceIcon
} from './icons/AppIcons';

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
  
  // Google Drive Props
  handleSyncCatalogs?: () => void;
  isGoogleDriveReady?: boolean;
  isSyncing?: boolean;
  uploadCatalogItem?: (item: any, context: string) => void;
  handleDeleteFromDrive?: (item: any, context: string) => void; 
  handleClearCloudFolder?: (context: string) => void; 
}

const ActionButton: React.FC<{ title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode; disabled?: boolean; className?: string }> = ({ title, onClick, children, disabled = false, className }) => {
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
                className={`p-2 text-gray-300 rounded-full hover:bg-gray-600 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${className || ''}`}
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
  onUpload?: (item: any) => void;
  onDeleteFromDrive?: (item: any) => void;
}> = ({ item, onAddToCanvas, onNavigate, onRename, onSave, onDelete, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver, onUpload, onDeleteFromDrive }) => {
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
            <FolderIcon />
          ) : (
            <GroupItemIcon />
          )}
        </div>
        {/* Cloud Indicator if synced */}
        {item.driveFileId && (
            <div className="absolute top-0 right-0 bg-blue-600/80 p-0.5 rounded-bl-md z-10 shadow-sm pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                </svg>
            </div>
        )}
      </div>
      <p className="font-semibold text-gray-100 text-center break-all w-full truncate" title={item.name}>{item.name}</p>
      <div className="flex justify-center space-x-1 w-full pt-2 border-t border-gray-600/50">
        {!isFolder && (
            <ActionButton title={t('catalog.card.addToCanvas')} onClick={() => onAddToCanvas(item.id)}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </ActionButton>
        )}
        <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
          <RenameIcon />
        </ActionButton>
        <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item.id)}>
          <SaveIcon />
        </ActionButton>
        
        {/* Cloud Actions */}
        {onUpload && (
            <ActionButton title="Upload to Drive" onClick={() => onUpload(item)}>
                <CloudUploadIcon className="h-5 w-5 text-blue-400" />
            </ActionButton>
        )}
        {onDeleteFromDrive && item.driveFileId && (
             <ActionButton title="Delete from Drive" onClick={() => onDeleteFromDrive(item)} className="text-red-300 hover:text-red-100 hover:bg-red-900/30">
                 <div className="relative w-5 h-5">
                     <DeleteIcon />
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-0.5 h-6 bg-red-500 rotate-45 transform origin-center absolute"></div>
                     </div>
                 </div>
            </ActionButton>
        )}

        <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
          <DeleteIcon />
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
  onUpload?: (item: any) => void;
  onDeleteFromDrive?: (item: any) => void;
}> = ({ item, onNavigate, onEdit, onRename, onSave, onDelete, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver, onUpload, onDeleteFromDrive }) => {
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
            <FolderIcon />
          ) : (
            <FileIcon />
          )}
        </div>
         {/* Cloud Indicator if synced */}
         {item.driveFileId && (
            <div className="absolute top-0 right-0 bg-blue-600/80 p-0.5 rounded-bl-md z-10 shadow-sm pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
            </div>
        )}
      </div>
      
      <div className="text-center w-full min-h-[4rem]">
        <p className="font-semibold text-gray-100 break-all w-full truncate" title={item.name}>{item.name}</p>
        {!isFolder && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.content || t('library.emptyPrompt')}</p>}
      </div>

      <div className="flex justify-center space-x-1 w-full pt-2 border-t border-gray-600/50">
        {!isFolder && (
          <ActionButton title={t('library.actions.copy')} onClick={handleCopy}>
            <CopyIcon className="h-5 w-5" />
          </ActionButton>
        )}
        {/* Rename button only for Folders */}
        {isFolder && (
            <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
              <RenameIcon />
            </ActionButton>
        )}
        <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item)}>
          <SaveIcon />
        </ActionButton>

         {/* Cloud Actions */}
         {onUpload && (
            <ActionButton title="Upload to Drive" onClick={() => onUpload(item)}>
                <CloudUploadIcon className="h-5 w-5 text-blue-400" />
            </ActionButton>
        )}
        {onDeleteFromDrive && item.driveFileId && (
             <ActionButton title="Delete from Drive" onClick={() => onDeleteFromDrive(item)} className="text-red-300 hover:text-red-100 hover:bg-red-900/30">
                 <div className="relative w-5 h-5">
                     <DeleteIcon />
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-0.5 h-6 bg-red-500 rotate-45 transform origin-center absolute"></div>
                     </div>
                 </div>
            </ActionButton>
        )}

        <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
          <DeleteIcon />
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
    onUpload?: (item: any) => void; 
    onDeleteFromDrive?: (item: any) => void; 
}> = ({ item, dragItemType, onNavigate, onRename, onSave, onDelete, draggedItem, onDragStart, onDragEnd, onMoveItem, isDragOver, setIsDragOver, t, onUpload, onDeleteFromDrive }) => {
    const isFolder = item.type === ContentCatalogItemType.FOLDER;
    const mainAction = isFolder ? () => onNavigate(item.id) : () => {};

    // --- THUMBNAIL LOGIC ---
    const { thumbnail, isCollection } = useMemo(() => {
        let thumb = null;
        let isCol = false;
        if (!isFolder && item.content) {
            try {
                const parsed = JSON.parse(item.content);
                
                // If it's an array, it's a collection (from node header save)
                if (Array.isArray(parsed) && parsed.length > 0) {
                     isCol = true;
                     const first = parsed[0];
                     if (first.imageSources && first.imageSources['1:1']) thumb = first.imageSources['1:1'];
                     else if (first.image && typeof first.image === 'string') thumb = first.image;
                } else {
                    // Single Item logic
                    if (parsed.image && typeof parsed.image === 'string' && parsed.image.startsWith('data:')) {
                        thumb = parsed.image;
                    } else if (parsed.imageBase64 && typeof parsed.imageBase64 === 'string') {
                        thumb = `data:image/png;base64,${parsed.imageBase64}`;
                    } else if (parsed.imageSources && parsed.imageSources['1:1']) {
                         thumb = parsed.imageSources['1:1'];
                    }
                }
            } catch {}
        }
        return { thumbnail: thumb, isCollection: isCol };
    }, [item.content, isFolder]);

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
        if (isFolder) return <FolderIcon />;
        
        if (thumbnail) {
            return <img src={thumbnail} alt={item.name} className="w-full h-full object-cover rounded" />;
        }

        switch(dragItemType) {
            case 'CHARACTER': return <CharacterIcon />;
            case 'SCRIPT': return <ScriptIcon />;
            case 'PROMPT_SEQUENCE': return <SequenceIcon />;
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
                
                {/* Collection Icon Overlay */}
                {isCollection && (
                    <div className="absolute top-0 left-0 bg-indigo-600/90 p-1 rounded-br-md z-10 shadow-sm pointer-events-none" title="Collection">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="7" y="7" width="14" height="14" rx="2" ry="2"></rect>
                            <path d="M17 3H5a2 2 0 0 0-2 2v12"></path>
                        </svg>
                    </div>
                )}

                {/* Cloud Indicator if synced */}
                {item.driveFileId && (
                     <div className="absolute top-0 right-0 bg-blue-600/80 p-0.5 rounded-bl-md z-10 shadow-sm pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                           <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                        </svg>
                     </div>
                )}
            </div>
            <p className="font-semibold text-gray-100 text-center break-all w-full truncate" title={item.name}>{item.name}</p>
            <div className="flex justify-center space-x-1 w-full pt-2 border-t border-gray-600/50">
                <ActionButton title={t('catalog.card.rename')} onClick={() => onRename(item.id, item.name)}>
                  <RenameIcon />
                </ActionButton>
                <ActionButton title={t('catalog.card.save')} onClick={() => onSave(item.id)}>
                  <SaveIcon />
                </ActionButton>
                {/* Upload Button */}
                {onUpload && (
                    <ActionButton title="Upload to Drive" onClick={() => onUpload(item)}>
                        <CloudUploadIcon className="h-5 w-5 text-blue-400" />
                    </ActionButton>
                )}
                {/* Delete from Drive */}
                {onDeleteFromDrive && item.driveFileId && (
                     <ActionButton title="Delete from Drive" onClick={() => onDeleteFromDrive(item)} className="text-red-300 hover:text-red-100 hover:bg-red-900/30">
                         <div className="relative w-5 h-5">
                             <DeleteIcon />
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                 <div className="w-0.5 h-6 bg-red-500 rotate-45 transform origin-center absolute"></div>
                             </div>
                         </div>
                    </ActionButton>
                )}
                <ActionButton title={t('catalog.card.delete')} onClick={() => onDelete(item.id)}>
                  <DeleteIcon />
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
    onUpload?: (item: any, context: string) => void;
    onDeleteFromDrive?: (item: any, context: string) => void; 
    onClearCloudFolder?: (context: string) => void;
}> = ({ catalog, draggedItem, setDraggedItem, dragOverTarget, setDragOverTarget, dragItemType, onRenameItem, t, onUpload, onDeleteFromDrive, onClearCloudFolder }) => {
    
    const contextMap: Record<string, string> = {
        'CHARACTER': 'characters',
        'SCRIPT': 'scripts',
        'PROMPT_SEQUENCE': 'sequences'
    };
    
    const context = contextMap[dragItemType];

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
                            <BackIcon />
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
                    <TooltipWrapper title={t('catalog.newFolder')}>
                        <button onClick={() => catalog.createItem(ContentCatalogItemType.FOLDER, t('library.actions.newFolder'))} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md flex items-center space-x-2">
                            <AddFolderIcon className="h-5 w-5" />
                            <span className="hidden md:inline">{t('library.actions.newFolder')}</span>
                        </button>
                    </TooltipWrapper>

                    <TooltipWrapper title={t('catalog.load')}>
                        <button onClick={catalog.triggerLoadFromFile} className="px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 rounded-md flex items-center space-x-2">
                            <LoadFileIcon className="h-5 w-5" />
                            <span className="hidden md:inline">{t('library.loadFromFile')}</span>
                        </button>
                    </TooltipWrapper>

                    {onClearCloudFolder && (
                         <TooltipWrapper title={t('catalog.clearCloudCategory')}>
                            <button 
                                onClick={() => { if(confirm("Are you sure you want to delete all files in this cloud folder? This cannot be undone.")) onClearCloudFolder(context); }} 
                                className="px-3 py-2 text-sm font-semibold bg-gray-700 hover:bg-red-600 text-gray-200 hover:text-white rounded-md flex items-center space-x-2 border border-gray-600 hover:border-red-500 transition-colors"
                            >
                                <div className="relative w-5 h-5">
                                    <ClearCloudIcon className="h-5 w-5" />
                                </div>
                                <span className="hidden md:inline">Clear Cloud</span>
                            </button>
                        </TooltipWrapper>
                    )}
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
                                onUpload={onUpload ? (i) => onUpload(i, context) : undefined}
                                onDeleteFromDrive={onDeleteFromDrive ? (i) => onDeleteFromDrive(i, context) : undefined}
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
    onRenameCharacter, onRenameScript, onRenameSequence,
    handleSyncCatalogs, isGoogleDriveReady, isSyncing, uploadCatalogItem, handleDeleteFromDrive, handleClearCloudFolder
  } = props;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'groups' | 'library' | 'characters' | 'scripts' | 'sequences'>('groups');
  const [draggedItem, setDraggedItem] = useState<{ id: string; tab: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // --- High Performance Draggable State for Catalog Window ---
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Initialize position to center on open (or keep if already set/moved)
  useEffect(() => {
      if (isOpen && !position) {
           const w = 896; 
           const h = window.innerHeight * 0.8;
           const x = (window.innerWidth - w) / 2;
           const y = (window.innerHeight - h) / 2;
           setPosition({ x: Math.max(20, x), y: Math.max(20, y) });
      }
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input')) return;

      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !dragStartRef.current || !position || !windowRef.current) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      // Direct DOM update for smooth movement bypassing React state on every frame
      windowRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !dragStartRef.current || !position || !windowRef.current) return;
      
      isDraggingRef.current = false;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      // Update state once drag finishes
      const newPos = { x: position.x + dx, y: position.y + dy };
      setPosition(newPos);
      
      // Reset transform since we updated absolute position
      windowRef.current.style.transform = 'none';
      
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

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
              <BackIcon />
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
          <TooltipWrapper title={t('catalog.newFolder')}>
            <button onClick={onCreateCatalogFolder} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md flex items-center space-x-2">
              <AddFolderIcon className="h-5 w-5" />
              <span className="hidden md:inline">{t('library.actions.newFolder')}</span>
            </button>
          </TooltipWrapper>

          <TooltipWrapper title={t('catalog.load')}>
            <button onClick={onLoadCatalogItemFromFile} className="px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 rounded-md flex items-center space-x-2">
              <LoadFileIcon className="h-5 w-5" />
              <span className="hidden md:inline">{t('library.loadFromFile')}</span>
            </button>
          </TooltipWrapper>

          {handleClearCloudFolder && (
             <TooltipWrapper title={t('catalog.clearCloudCategory')}>
                <button 
                    onClick={() => { if(confirm("Are you sure you want to delete all files in this cloud folder?")) handleClearCloudFolder('groups'); }} 
                    className="px-3 py-2 text-sm font-semibold bg-gray-700 hover:bg-red-600 text-gray-200 hover:text-white rounded-md flex items-center space-x-2 border border-gray-600 hover:border-red-500 transition-colors"
                >
                    <div className="relative w-5 h-5">
                        <ClearCloudIcon className="h-5 w-5" />
                    </div>
                    <span className="hidden md:inline">Clear Cloud</span>
                </button>
            </TooltipWrapper>
          )}
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
                onUpload={(i) => uploadCatalogItem && uploadCatalogItem(i, 'groups')}
                onDeleteFromDrive={handleDeleteFromDrive ? (i) => handleDeleteFromDrive(i, 'groups') : undefined}
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
              <BackIcon />
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
          <TooltipWrapper title={t('library.actions.newPrompt')}>
            <button onClick={() => onCreateLibraryItem(LibraryItemType.PROMPT)} className="px-3 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 rounded-md flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden md:inline">{t('library.actions.newPrompt')}</span>
            </button>
          </TooltipWrapper>

          <TooltipWrapper title={t('catalog.newFolder')}>
            <button onClick={() => onCreateLibraryItem(LibraryItemType.FOLDER)} className="px-3 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md flex items-center space-x-2">
              <AddFolderIcon className="h-5 w-5" />
              <span className="hidden md:inline">{t('library.actions.newFolder')}</span>
            </button>
          </TooltipWrapper>

          <TooltipWrapper title={t('catalog.load')}>
            <button onClick={onLoadLibraryItemFromFile} className="px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 rounded-md flex items-center space-x-2">
              <LoadFileIcon className="h-5 w-5" />
              <span className="hidden md:inline">{t('library.loadFromFile')}</span>
            </button>
          </TooltipWrapper>

          {handleClearCloudFolder && (
             <TooltipWrapper title={t('catalog.clearCloudCategory')}>
                <button 
                    onClick={() => { if(confirm("Are you sure you want to delete all files in this cloud folder?")) handleClearCloudFolder('library'); }} 
                    className="px-3 py-2 text-sm font-semibold bg-gray-700 hover:bg-red-600 text-gray-200 hover:text-white rounded-md flex items-center space-x-2 border border-gray-600 hover:border-red-500 transition-colors"
                >
                    <div className="relative w-5 h-5">
                        <ClearCloudIcon className="h-5 w-5" />
                    </div>
                    <span className="hidden md:inline">Clear Cloud</span>
                </button>
            </TooltipWrapper>
          )}
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
                onUpload={(i) => uploadCatalogItem && uploadCatalogItem(i, 'library')}
                onDeleteFromDrive={handleDeleteFromDrive ? (i) => handleDeleteFromDrive(i, 'library') : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <p className="font-semibold">{t('library.empty.title')}</p>
            <p className="text-sm">{t('library.empty.description')}</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div 
        ref={windowRef}
        className="pointer-events-auto fixed bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl border border-gray-700 flex flex-col h-[80vh] select-none" 
        style={{
            left: position ? position.x : '50%',
            top: position ? position.y : '50%',
            transform: position ? 'none' : 'translate(-50%, -50%)'
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div 
             className="p-4 pb-0 border-b border-gray-700 flex justify-between items-center flex-shrink-0 cursor-move"
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
        >
          <div className="flex items-end space-x-4" onPointerDown={e => e.stopPropagation()}>
            <button onClick={() => setActiveTab('groups')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'groups' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.groups')}</button>
            <button onClick={() => setActiveTab('library')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'library' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.library')}</button>
            <button onClick={() => setActiveTab('characters')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'characters' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.characters')}</button>
            <button onClick={() => setActiveTab('scripts')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'scripts' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.scripts')}</button>
            <button onClick={() => setActiveTab('sequences')} className={`px-4 py-2 text-lg font-bold ${activeTab === 'sequences' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}>{t('catalog.tabs.sequences')}</button>
          </div>
          
          <div className="flex items-center gap-3" onPointerDown={e => e.stopPropagation()}>
             {/* Global Sync Button */}
             {handleSyncCatalogs && (
                 <button
                    onClick={handleSyncCatalogs}
                    disabled={!isGoogleDriveReady || isSyncing}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                        isSyncing 
                        ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-wait' 
                        : 'bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30'
                    }`}
                    title="Sync catalogs from Google Drive"
                 >
                     {isSyncing ? (
                         <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                     ) : (
                         <CloudDownloadIcon className="h-4 w-4" />
                     )}
                     <span className="text-xs font-bold">Sync Drive</span>
                 </button>
             )}

             <button onClick={onClose} className="p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>
        
        {activeTab === 'groups' && renderGroupCatalog()}
        {activeTab === 'library' && renderPromptLibrary()}
        {activeTab === 'characters' && <ContentCatalogView catalog={props.characterCatalog} dragItemType="CHARACTER" onRenameItem={onRenameCharacter} t={t} draggedItem={draggedItem} setDraggedItem={setDraggedItem} dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} onUpload={uploadCatalogItem} onDeleteFromDrive={handleDeleteFromDrive} />}
        {activeTab === 'scripts' && <ContentCatalogView catalog={props.scriptCatalog} dragItemType="SCRIPT" onRenameItem={onRenameScript} t={t} draggedItem={draggedItem} setDraggedItem={setDraggedItem} dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} onUpload={uploadCatalogItem} onDeleteFromDrive={handleDeleteFromDrive} />}
        {activeTab === 'sequences' && <ContentCatalogView catalog={props.sequenceCatalog} dragItemType="PROMPT_SEQUENCE" onRenameItem={onRenameSequence} t={t} draggedItem={draggedItem} setDraggedItem={setDraggedItem} dragOverTarget={dragOverTarget} setDragOverTarget={setDragOverTarget} onUpload={uploadCatalogItem} onDeleteFromDrive={handleDeleteFromDrive} />}
      </div>
    </div>
  );
};
