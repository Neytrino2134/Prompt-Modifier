
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LibraryItem, LibraryItemType } from '../types';
import { useLanguage } from '../localization';

interface PromptLibraryToolbarProps {
  libraryItems: LibraryItem[];
  onPromptInsert: (promptText: string) => void;
}

export const PromptLibraryToolbar: React.FC<PromptLibraryToolbarProps> = ({ libraryItems, onPromptInsert }) => {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // State for portal positioning
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const handleToggleMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMenuOpen) {
          closeMenu();
      } else {
          openMenu();
      }
  };

  const openMenu = () => {
      if (toolbarRef.current) {
          const rect = toolbarRef.current.getBoundingClientRect();
          // Calculate position relative to viewport
          const spaceBelow = window.innerHeight - rect.bottom;
          const menuHeight = 280; // approximate max height
          
          let top = rect.bottom + 4;
          // Flip up if not enough space
          if (spaceBelow < menuHeight) {
              top = rect.top - menuHeight - 4;
          }

          setMenuPosition({
              top: top,
              left: rect.left,
              width: Math.max(rect.width, 256) // Min width 16rem (256px)
          });
          setIsMenuOpen(true);
      }
  };

  const closeMenu = () => {
      setIsClosing(true);
      setTimeout(() => {
          setIsMenuOpen(false);
          setIsClosing(false);
          setCurrentFolderId(null);
      }, 200); // Match transition duration
  };

  // Handle outside click to close
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is inside the toolbar button OR the portal menu
      const menuElement = document.getElementById('prompt-library-portal-menu');
      
      if (
          toolbarRef.current && !toolbarRef.current.contains(target) &&
          menuElement && !menuElement.contains(target)
      ) {
        closeMenu();
      }
    };

    // Use capture to catch events before other handlers if needed, 
    // but standard bubble phase usually works for outside click.
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  // Handle Scroll/Resize to close menu (simplest way to handle floating elements without complex positioning libs)
  useEffect(() => {
      if (!isMenuOpen) return;
      const handleScrollOrResize = () => closeMenu();
      window.addEventListener('scroll', handleScrollOrResize, true); // Capture scroll on any element
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
          window.removeEventListener('scroll', handleScrollOrResize, true);
          window.removeEventListener('resize', handleScrollOrResize);
      };
  }, [isMenuOpen]);

  const handlePromptSelect = (promptText: string) => {
    onPromptInsert(promptText);
    closeMenu();
  };

  const handleNavigateBack = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentFolderId) {
          const currentFolder = libraryItems.find(i => i.id === currentFolderId);
          setCurrentFolderId(currentFolder?.parentId || null);
      }
  };

  // Derive items for current view
  const itemsToDisplay = useMemo(() => {
      return libraryItems
          .filter(item => item.parentId === currentFolderId)
          .sort((a, b) => {
              // Folders first, then prompts
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === LibraryItemType.FOLDER ? -1 : 1;
          });
  }, [libraryItems, currentFolderId]);

  const currentFolderName = useMemo(() => {
      if (!currentFolderId) return t('catalog.tabs.library');
      return libraryItems.find(i => i.id === currentFolderId)?.name || t('catalog.tabs.library');
  }, [currentFolderId, libraryItems, t]);

  return (
    <div ref={toolbarRef} className="relative w-full">
      <button
        onClick={handleToggleMenu}
        title={t('catalog.tabs.library')}
        className={`w-full p-1.5 rounded transition-colors flex items-center justify-start space-x-2 ${isMenuOpen ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}
      >
        {/* Book Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="text-xs font-semibold text-gray-200 truncate">{t('catalog.tabs.library')}</span>
        <div className="flex-grow"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isMenuOpen && menuPosition && createPortal(
        <div 
            id="prompt-library-portal-menu"
            className={`fixed bg-gray-800 rounded-lg shadow-xl border border-gray-600 z-[9999] flex flex-col overflow-hidden transition-all duration-200 ease-out origin-top ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: '280px'
            }}
            onWheel={e => e.stopPropagation()}
        >
            {/* Header */}
            <div 
                className={`flex items-center p-2 border-b border-gray-700 bg-gray-900/50 transition-colors select-none ${currentFolderId ? 'cursor-pointer hover:bg-gray-700' : ''}`}
                onClick={currentFolderId ? handleNavigateBack : undefined}
            >
                {currentFolderId ? (
                    <div className="mr-2 p-1 text-cyan-400 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                ) : (
                    <div className="mr-2 p-1 text-gray-500 flex-shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </div>
                )}
                <span className="text-sm font-bold text-gray-200 truncate">{currentFolderName}</span>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1 custom-scrollbar flex-grow">
                {itemsToDisplay.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                        {t('library.empty.description')}
                    </div>
                ) : (
                    <ul className="space-y-0.5">
                        {itemsToDisplay.map(item => (
                            <li key={item.id}>
                                {item.type === LibraryItemType.FOLDER ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentFolderId(item.id); }}
                                        className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-700 text-left group transition-colors"
                                    >
                                        <div className="flex items-center space-x-2 min-w-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                            <span className="text-sm text-gray-200 truncate group-hover:text-white">{item.name}</span>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePromptSelect(item.content || ''); }}
                                        className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-700 text-left group transition-colors"
                                        title={item.content}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500 flex-shrink-0 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm text-gray-300 truncate group-hover:text-white">{item.name}</span>
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};
