
import React, { useRef, useState, useMemo } from 'react';
import { MediaFile } from './types';

interface MediaPanelProps {
    files: MediaFile[];
    currentFolderId: string | null;
    viewMode: 'grid' | 'list';
    onUpload: (files: FileList) => void;
    onDragStart: (e: React.DragEvent, file: MediaFile) => void;
    onDelete: (id: string) => void;
    onNavigate: (folderId: string | null) => void;
    onCreateFolder: () => void;
    onRename: (id: string, name: string) => void;
    onToggleView: () => void;
}

const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
    switch(type) {
        case 'folder':
            return (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
            );
        case 'image':
            return (
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            );
        case 'video':
            return (
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            );
        case 'audio':
            return (
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
            );
        default:
             return (
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
    }
};

const LinkIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

export const MediaPanel: React.FC<MediaPanelProps> = ({ 
    files, currentFolderId, viewMode, 
    onUpload, onDragStart, onDelete, onNavigate, onCreateFolder, onRename, onToggleView 
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Filter current directory
    const visibleFiles = useMemo(() => {
        return files.filter(f => f.parentId === currentFolderId).sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [files, currentFolderId]);

    // Build breadcrumb
    const breadcrumb = useMemo(() => {
        const path = [];
        let curr = currentFolderId;
        while(curr) {
            const folder = files.find(f => f.id === curr);
            if (folder) {
                path.unshift({ id: folder.id, name: folder.name });
                curr = folder.parentId;
            } else {
                curr = null;
            }
        }
        return [{ id: null, name: 'Root' }, ...path];
    }, [currentFolderId, files]);

    const handleNavigateUp = () => {
        if (!currentFolderId) return;
        const current = files.find(f => f.id === currentFolderId);
        onNavigate(current ? current.parentId : null);
    };

    const handleStartEdit = (file: MediaFile) => {
        if (file.isLinked) return; // Prevent renaming linked files
        setEditingId(file.id);
        setEditName(file.name);
    };

    const handleCommitEdit = () => {
        if (editingId && editName.trim()) {
            onRename(editingId, editName.trim());
        }
        setEditingId(null);
    };

    const handleItemDoubleClick = (file: MediaFile) => {
        if (file.type === 'folder') {
            onNavigate(file.id);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-800">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-1 border-b border-gray-700 bg-gray-900/50">
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={handleNavigateUp} 
                        disabled={!currentFolderId}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 disabled:opacity-30 transition-colors"
                        title="Up"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                    <div className="h-4 w-px bg-gray-700 mx-1"></div>
                    <button onClick={onCreateFolder} className="p-1 hover:bg-gray-700 rounded text-yellow-500 hover:text-yellow-400" title="New Folder">
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                    </button>
                    <button onClick={() => inputRef.current?.click()} className="p-1 hover:bg-gray-700 rounded text-cyan-400 hover:text-cyan-300" title="Import">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4 4V4" /></svg>
                    </button>
                </div>
                <button onClick={onToggleView} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Toggle View">
                     {viewMode === 'grid' ? (
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                     ) : (
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                     )}
                </button>
                <input ref={inputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => { if(e.target.files) onUpload(e.target.files); e.target.value = ''; }} />
            </div>

            {/* Breadcrumb */}
            <div className="px-2 py-1 bg-gray-900 border-b border-gray-700 text-xs text-gray-400 flex items-center overflow-x-auto whitespace-nowrap scrollbar-none">
                {breadcrumb.map((item, idx) => (
                    <React.Fragment key={item.id || 'root'}>
                        <span 
                            className="hover:text-white cursor-pointer hover:underline"
                            onClick={() => onNavigate(item.id)}
                        >
                            {item.name}
                        </span>
                        {idx < breadcrumb.length - 1 && <span className="mx-1 text-gray-600">/</span>}
                    </React.Fragment>
                ))}
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-y-auto p-2 custom-scrollbar ${viewMode === 'grid' ? 'flex flex-wrap content-start gap-2' : 'flex flex-col space-y-1'}`}>
                {visibleFiles.length === 0 ? (
                    <div className="col-span-full w-full h-32 flex flex-col items-center justify-center text-gray-500 text-xs italic">
                        <span>Empty Folder</span>
                        <span className="opacity-50 mt-1">Drop files here</span>
                    </div>
                ) : (
                    visibleFiles.map(file => (
                        <div 
                            key={file.id}
                            className={`
                                group relative border border-gray-700 rounded hover:bg-gray-700/50 hover:border-gray-500 transition-colors overflow-hidden
                                ${viewMode === 'grid' ? 'flex flex-col w-24 h-24' : 'flex items-center h-8 px-2 w-full'}
                            `}
                            draggable={file.type !== 'folder' && !!file.src}
                            onDragStart={(e) => onDragStart(e, file)}
                            onDoubleClick={() => handleItemDoubleClick(file)}
                        >
                            {/* Icon / Thumbnail */}
                            <div className={`${viewMode === 'grid' ? 'flex-1 w-full bg-black/40 overflow-hidden flex items-center justify-center relative' : 'w-5 h-5 flex-shrink-0 mr-2 relative'}`}>
                                {file.thumbnail ? (
                                    <img src={file.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="thumb" />
                                ) : (file.type === 'image' || (file.type === 'text' && file.src.startsWith('data:image'))) && file.src ? (
                                    <img src={file.src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="thumb" />
                                ) : (
                                    <TypeIcon type={file.type} />
                                )}

                                {/* Linked Icon Overlay */}
                                {file.isLinked && (
                                    <div className="absolute top-0 right-0 bg-cyan-600/80 p-0.5 rounded-bl-md z-10 shadow-sm pointer-events-none">
                                        <LinkIcon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Name / Rename Input */}
                            <div className={`${viewMode === 'grid' ? 'h-7 px-1 flex items-center bg-gray-800 border-t border-gray-700' : 'flex-grow min-w-0'}`}>
                                {editingId === file.id ? (
                                    <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleCommitEdit}
                                        onKeyDown={(e) => { if(e.key === 'Enter') handleCommitEdit(); }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                        className="w-full bg-gray-900 text-white text-[10px] px-1 rounded border border-blue-500 outline-none"
                                        autoFocus
                                    />
                                ) : (
                                    <span 
                                        className={`text-[10px] truncate cursor-text w-full block ${file.isLinked ? 'text-cyan-200' : 'text-gray-300'}`} 
                                        title={file.name}
                                        onClick={(e) => { e.stopPropagation(); handleStartEdit(file); }}
                                    >
                                        {file.name}
                                    </span>
                                )}
                            </div>

                            {/* Actions (Delete) */}
                            {!file.isLinked && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                                    className={`
                                        text-gray-500 hover:text-red-400 transition-colors
                                        ${viewMode === 'grid' ? 'absolute top-1 right-1 bg-black/50 rounded p-0.5 opacity-0 group-hover:opacity-100' : 'ml-2 opacity-0 group-hover:opacity-100'}
                                    `}
                                >
                                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
