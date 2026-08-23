import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LibraryItem, LibraryItemType } from '../types';
import { useLanguage } from '../localization';

interface AddToLibraryPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
    promptContent: string;
    libraryItems: LibraryItem[];
    onSave: (promptName: string, folderId: string | null, newFolderName?: string) => void;
}

export const AddToLibraryPopover: React.FC<AddToLibraryPopoverProps> = ({
    isOpen,
    onClose,
    anchorRef,
    promptContent,
    libraryItems,
    onSave
}) => {
    const { t } = useLanguage();
    const [promptTitle, setPromptTitle] = useState('');
    const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    // Generate initial prompt title from content
    useEffect(() => {
        if (isOpen) {
            const cleanText = (promptContent || '').trim();
            if (cleanText) {
                const words = cleanText.split(/[\s,]+/).filter(Boolean).slice(0, 5);
                let defaultName = words.join(' ');
                if (defaultName.length > 32) {
                    defaultName = defaultName.substring(0, 32) + '...';
                }
                setPromptTitle(defaultName || 'Prompt');
            } else {
                setPromptTitle('New Prompt');
            }
            setIsCreatingNewFolder(false);
            setNewFolderName('');
            setSearchQuery('');
        }
    }, [isOpen, promptContent]);

    // Focus new folder input when toggled
    useEffect(() => {
        if (isCreatingNewFolder && newFolderInputRef.current) {
            newFolderInputRef.current.focus();
        }
    }, [isCreatingNewFolder]);

    // Position calculation
    useEffect(() => {
        if (isOpen && anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            const popoverWidth = 280;
            const popoverHeight = 340; // estimated max height

            let left = rect.left + rect.width / 2 - popoverWidth / 2;
            if (left + popoverWidth > window.innerWidth - 12) {
                left = window.innerWidth - popoverWidth - 12;
            }
            if (left < 12) {
                left = 12;
            }

            let top = rect.bottom + 6;
            if (top + popoverHeight > window.innerHeight - 12) {
                // Flip above anchor
                top = Math.max(12, rect.top - popoverHeight - 6);
            }

            setMenuPosition({ top, left });
        }
    }, [isOpen, anchorRef, isCreatingNewFolder]);

    // Outside click & esc key handler
    useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                popoverRef.current &&
                !popoverRef.current.contains(target) &&
                anchorRef.current &&
                !anchorRef.current.contains(target)
            ) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, anchorRef]);

    // Close on window resize or scroll
    useEffect(() => {
        if (!isOpen) return;
        const handleScrollOrResize = () => onClose();
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, onClose]);

    // Extract all folders and their hierarchy paths
    const folders = useMemo(() => {
        const allFolders = (libraryItems || []).filter(item => item.type === LibraryItemType.FOLDER);

        const getFolderPath = (folder: LibraryItem): string => {
            if (!folder.parentId) return folder.name;
            const parent = allFolders.find(f => f.id === folder.parentId);
            if (parent) {
                return `${getFolderPath(parent)} / ${folder.name}`;
            }
            return folder.name;
        };

        return allFolders.map(f => {
            const childCount = (libraryItems || []).filter(item => item.parentId === f.id).length;
            return {
                id: f.id,
                name: f.name,
                path: getFolderPath(f),
                parentId: f.parentId,
                childCount
            };
        }).sort((a, b) => a.path.localeCompare(b.path));
    }, [libraryItems]);

    // Filter folders based on search query
    const filteredFolders = useMemo(() => {
        if (!searchQuery.trim()) return folders;
        const q = searchQuery.toLowerCase();
        return folders.filter(f => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    }, [folders, searchQuery]);

    const handleSelectFolder = (folderId: string | null) => {
        onSave(promptTitle.trim() || 'New Prompt', folderId);
        onClose();
    };

    const handleCreateAndSaveNewFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        onSave(promptTitle.trim() || 'New Prompt', null, newFolderName.trim());
        onClose();
    };

    if (!isOpen || !menuPosition) return null;

    return createPortal(
        <div
            ref={popoverRef}
            id="add-to-prompt-library-popover"
            style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
            }}
            className="fixed z-[99999] w-72 bg-slate-800/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl text-gray-200 overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900/60 border-b border-slate-700/60 select-none">
                <div className="flex items-center space-x-1.5 font-semibold text-cyan-400 select-none cursor-default">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="select-none cursor-default">{t('library.addToLibrary')}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-slate-700/60 transition-colors"
                    title={t('node.action.close')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Prompt Title Field */}
            <div className="p-3 border-b border-slate-700/50 bg-slate-900/30">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 select-none cursor-default">
                    {t('library.promptTitle')}
                </label>
                <input
                    type="text"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    placeholder={t('library.promptTitle')}
                    className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-md text-gray-200 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-gray-500 transition-colors"
                />
            </div>

            {/* Categories Section */}
            <div className="p-2 flex flex-col flex-1 max-h-56 overflow-hidden">
                <div className="flex items-center justify-between px-1 mb-1.5 select-none">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none cursor-default">
                        {t('library.selectCategory')}
                    </span>
                    {!isCreatingNewFolder && (
                        <button
                            type="button"
                            onClick={() => setIsCreatingNewFolder(true)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 hover:underline select-none"
                        >
                            <span>+ {t('library.newCategory')}</span>
                        </button>
                    )}
                </div>

                {/* New Folder Form */}
                {isCreatingNewFolder && (
                    <form onSubmit={handleCreateAndSaveNewFolder} className="mb-2 p-2 bg-slate-900/70 border border-cyan-500/40 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-cyan-300 font-medium">
                            <span>{t('library.newCategory')}</span>
                            <button
                                type="button"
                                onClick={() => setIsCreatingNewFolder(false)}
                                className="text-gray-400 hover:text-gray-200 text-xs"
                            >
                                ×
                            </button>
                        </div>
                        <input
                            ref={newFolderInputRef}
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder={t('library.newCategoryPlaceholder')}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                        />
                        <div className="flex justify-end space-x-1.5 pt-0.5">
                            <button
                                type="button"
                                onClick={() => setIsCreatingNewFolder(false)}
                                className="px-2 py-0.5 rounded text-[11px] text-gray-400 hover:bg-slate-800"
                            >
                                {t('node.action.close')}
                            </button>
                            <button
                                type="submit"
                                disabled={!newFolderName.trim()}
                                className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium text-[11px] shadow transition-colors"
                            >
                                {t('library.createAndSave')}
                            </button>
                        </div>
                    </form>
                )}

                {/* Search folder if more than 4 folders */}
                {folders.length > 4 && !isCreatingNewFolder && (
                    <div className="mb-1.5 px-0.5">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('library.searchFolders')}
                            className="w-full px-2 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-[11px] text-gray-300 placeholder-gray-500 focus:outline-none focus:border-cyan-500/70"
                        />
                    </div>
                )}

                {/* Folders List */}
                <div className="overflow-y-auto space-y-1 custom-scrollbar pr-0.5 flex-1">
                    {/* Root Folder Option */}
                    {!searchQuery && (
                        <button
                            type="button"
                            onClick={() => handleSelectFolder(null)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-700/70 text-left group transition-colors border border-transparent hover:border-slate-600/50"
                        >
                            <div className="flex items-center space-x-2 min-w-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="text-xs text-gray-200 group-hover:text-white font-medium truncate">
                                    {t('library.rootFolder')}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-500 group-hover:text-cyan-400 transition-colors font-mono">
                                ↵
                            </span>
                        </button>
                    )}

                    {/* Existing Folders */}
                    {filteredFolders.map(folder => (
                        <button
                            key={folder.id}
                            type="button"
                            onClick={() => handleSelectFolder(folder.id)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-700/70 text-left group transition-colors border border-transparent hover:border-slate-600/50"
                            title={folder.path}
                        >
                            <div className="flex items-center space-x-2 min-w-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400/90 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="text-xs text-gray-200 group-hover:text-white truncate">
                                    {folder.path}
                                </span>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-900/60 text-gray-400 rounded-full">
                                    {folder.childCount}
                                </span>
                                <span className="text-[10px] text-gray-500 group-hover:text-cyan-400 transition-colors font-mono">
                                    ↵
                                </span>
                            </div>
                        </button>
                    ))}

                    {filteredFolders.length === 0 && searchQuery && (
                        <div className="p-3 text-center text-gray-500 text-[11px]">
                            {t('library.noCategoriesFound')}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
