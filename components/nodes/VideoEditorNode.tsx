
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import { Timeline } from './video-editor/Timeline';
import { PreviewPlayer } from './video-editor/PreviewPlayer';
import { MediaPanel } from './video-editor/MediaPanel';
import { VideoEditorState, VideoClip, VideoTrack, MediaFile } from './video-editor/types';
import { useClipAudioData } from './video-editor/useClipAudioData';
import { generateThumbnail } from '../../utils/imageUtils';

const DEFAULT_STATE: VideoEditorState = {
    currentTime: 0,
    totalDuration: 30, // Default 30s timeline
    clips: [],
    tracks: [
        { id: 2, name: 'V2', type: 'video', isMuted: false, isVisible: true },
        { id: 1, name: 'V1', type: 'video', isMuted: false, isVisible: true },
        { id: 101, name: 'A1', type: 'audio', isMuted: false, isVisible: true },
    ],
    mediaFiles: [], // Project Bin
    isPlaying: false,
    zoom: 20, // pixels per second
    selectedClipId: null,
    scrollLeft: 0,
    mediaPanelWidth: 240,
    currentFolderId: null,
    viewMode: 'grid'
};

const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 600;

export const VideoEditorNode: React.FC<NodeContentProps> = ({ node, onValueChange, t, deselectAllNodes, getUpstreamNodeValues, isSelected, onSelectNode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number, startWidth: number } | null>(null);
    
    // State initialization
    const state: VideoEditorState = useMemo(() => {
        try {
            return { ...DEFAULT_STATE, ...JSON.parse(node.value || '{}') };
        } catch {
            return DEFAULT_STATE;
        }
    }, [node.value]);

    const updateState = useCallback((updates: Partial<VideoEditorState>) => {
        const newState = { ...state, ...updates };
        onValueChange(node.id, JSON.stringify(newState));
    }, [state, node.id, onValueChange]);

    // Local state for UI responsiveness (playback) to avoid full node update on every frame
    const [localTime, setLocalTime] = useState(state.currentTime);
    const [isPlaying, setIsPlaying] = useState(false);

    // Fetch Audio Data for visualization
    const audioDataMap = useClipAudioData(state.clips);

    // Sync local time to node state on pause or significant jump
    useEffect(() => {
        setLocalTime(state.currentTime);
    }, [state.currentTime]);
    
    // Sync upstream inputs into Media Library
    useEffect(() => {
        if (!getUpstreamNodeValues) return;
        
        // Fetch specific typed inputs including empty ones to maintain slots
        // We use 'true' for optimizedForUI to get raw data if possible, but we handle missing data below
        const videoInputs = getUpstreamNodeValues(node.id, 'video');
        const audioInputs = getUpstreamNodeValues(node.id, 'audio');
        const imageInputs = getUpstreamNodeValues(node.id, 'image');
        const textInputs = getUpstreamNodeValues(node.id, 'text');

        // Filter out existing "Linked" files to perform a clean refresh of upstream data
        const userFiles = state.mediaFiles.filter(f => !f.isLinked);
        const newLinkedFiles: MediaFile[] = [];

        // Definition of upstream categories
        const categories = [
            { type: 'video' as const, data: videoInputs, folderName: 'Video Inputs' },
            { type: 'audio' as const, data: audioInputs, folderName: 'Audio Inputs' },
            { type: 'image' as const, data: imageInputs, folderName: 'Image Inputs' },
            { type: 'text' as const, data: textInputs, folderName: 'Text Inputs' }
        ];

        const escapeXml = (unsafe: string) => {
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        };

        categories.forEach(({ type, data, folderName }) => {
            if (data.length > 0) {
                // Create Folder for this type
                const folderId = `folder-linked-${type}`;
                newLinkedFiles.push({
                    id: folderId,
                    type: 'folder',
                    src: '',
                    name: folderName,
                    parentId: null,
                    isLinked: true
                });

                // Create Files inside the folder
                data.forEach((input: any, index: number) => {
                     let src = '';
                     
                     // Handle Object (Image Data)
                     if (input && typeof input === 'object' && input.base64ImageData) {
                         src = `data:${input.mimeType};base64,${input.base64ImageData}`;
                     } 
                     // Handle String (URL or Text)
                     else if (typeof input === 'string') {
                         if (type === 'text') {
                             // Safe XML escaping for text content
                             const encodedText = escapeXml(input);
                             // Use encodeURIComponent instead of btoa to handle Unicode characters (Cyrillic etc) correctly
                             const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" style="background:black;"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="40">${encodedText}</text></svg>`;
                             src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
                         } else {
                             if (input.startsWith('data:') || input.startsWith('http') || input.startsWith('blob:')) {
                                 src = input;
                             }
                         }
                     }
                     // If input is null/undefined/empty, src remains '', effectively creating an empty placeholder file

                     newLinkedFiles.push({
                         id: `linked-${type}-${index}`,
                         type: type,
                         src: src, // Can be empty
                         name: src ? `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}` : `Empty ${type} Slot ${index + 1}`,
                         parentId: folderId,
                         isLinked: true
                     });
                });
            }
        });

        // Only update if the structure actually changed (simple length check optimization + ID check)
        const currentLinkedFiles = state.mediaFiles.filter(f => f.isLinked);
        const hasChanges = 
            newLinkedFiles.length !== currentLinkedFiles.length || 
            newLinkedFiles.some((nf, i) => nf.id !== currentLinkedFiles[i]?.id || nf.src !== currentLinkedFiles[i]?.src);

        if (hasChanges) {
             // If current folder was a linked folder that no longer exists (e.g. disconnected), reset to root
             let nextFolderId = state.currentFolderId;
             if (nextFolderId && nextFolderId.startsWith('folder-linked-')) {
                 if (!newLinkedFiles.find(f => f.id === nextFolderId)) {
                     nextFolderId = null;
                 }
             }

             updateState({ 
                 mediaFiles: [...userFiles, ...newLinkedFiles],
                 currentFolderId: nextFolderId
             });
        }

    }, [getUpstreamNodeValues, node.id, state.mediaFiles, state.currentFolderId]); 

    const handlePlayPause = useCallback(() => {
        const newPlaying = !isPlaying;
        setIsPlaying(newPlaying);
        if (!newPlaying) {
            // Commit time on pause
            updateState({ currentTime: localTime, isPlaying: false });
        }
    }, [isPlaying, localTime, updateState]);

    const handleSeek = (time: number) => {
        setLocalTime(time);
        if (!isPlaying) {
            updateState({ currentTime: time });
        }
    };

    const handleTimeUpdate = (updater: (prev: number) => number) => {
        setLocalTime(prev => {
            const next = updater(prev);
            if (next >= state.totalDuration) {
                setIsPlaying(false);
                return state.totalDuration;
            }
            return next;
        });
    };
    
    const handleZoom = (direction: 'in' | 'out') => {
        const newZoom = direction === 'in' ? state.zoom * 1.2 : state.zoom / 1.2;
        updateState({ zoom: Math.max(5, Math.min(200, newZoom)) });
    };

    // --- Media Management ---

    const generateVideoThumbnail = async (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.currentTime = 1; // Seek to 1s
            
            video.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                // Create a small thumbnail
                canvas.width = 160;
                canvas.height = 90;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, 160, 90);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
                URL.revokeObjectURL(video.src);
            };
            video.onerror = () => {
                resolve(''); // Failed
            };
        });
    };

    const handleFileUpload = async (fileList: FileList) => {
        const newFiles: MediaFile[] = [];
        
        for (const file of Array.from(fileList)) {
            const url = URL.createObjectURL(file);
            let type: 'image' | 'video' | 'audio' = 'image';
            let thumbnail: string | undefined = undefined;

            if (file.type.startsWith('video/')) {
                type = 'video';
                try {
                    thumbnail = await generateVideoThumbnail(file);
                } catch (e) { console.error("Thumbnail generation failed", e); }
            }
            else if (file.type.startsWith('audio/')) {
                type = 'audio';
            } else if (file.type.startsWith('image/')) {
                type = 'image';
                // Also create small thumbnail for image
                try {
                    thumbnail = await generateThumbnail(url, 160, 160);
                } catch (e) {}
            }

            newFiles.push({
                id: `media-${Date.now()}-${Math.random()}`,
                type,
                src: url,
                name: file.name,
                parentId: state.currentFolderId,
                thumbnail,
                isLinked: false
            });
        }
        updateState({ mediaFiles: [...state.mediaFiles, ...newFiles] });
    };

    const handleDeleteMedia = (id: string) => {
        // Prevent deleting linked files directly
        const file = state.mediaFiles.find(f => f.id === id);
        if (file?.isLinked) return;

        // Recursive delete if folder
        const idsToDelete = new Set<string>();
        const collectIds = (itemId: string) => {
            idsToDelete.add(itemId);
            state.mediaFiles.filter(f => f.parentId === itemId).forEach(child => collectIds(child.id));
        };
        collectIds(id);
        
        updateState({ mediaFiles: state.mediaFiles.filter(f => !idsToDelete.has(f.id)) });
    };

    const handleCreateFolder = () => {
        const newFolder: MediaFile = {
            id: `folder-${Date.now()}`,
            type: 'folder',
            src: '',
            name: 'New Folder',
            parentId: state.currentFolderId,
            isLinked: false
        };
        updateState({ mediaFiles: [...state.mediaFiles, newFolder] });
    };

    const handleNavigate = (folderId: string | null) => {
        updateState({ currentFolderId: folderId });
    };

    const handleRenameMedia = (id: string, newName: string) => {
        const file = state.mediaFiles.find(f => f.id === id);
        if (file?.isLinked) return; // Prevent renaming linked files

        updateState({ 
            mediaFiles: state.mediaFiles.map(f => f.id === id ? { ...f, name: newName } : f) 
        });
    };

    const handleViewModeToggle = () => {
        updateState({ viewMode: state.viewMode === 'grid' ? 'list' : 'grid' });
    };

    const handleMediaDragStart = (e: React.DragEvent, file: MediaFile) => {
        if (file.type === 'folder') return; // Cannot put folder on timeline
        if (!file.src) return; // Cannot drag empty placeholder
        
        e.dataTransfer.setData('application/video-editor-media', JSON.stringify(file));
        e.dataTransfer.effectAllowed = 'copy';
    };

    // --- Resizing ---
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragStartRef.current = { x: e.clientX, startWidth: state.mediaPanelWidth };
        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!dragStartRef.current) return;
        const delta = e.clientX - dragStartRef.current.x;
        const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, dragStartRef.current.startWidth + delta));
        
        if (containerRef.current) {
             updateState({ mediaPanelWidth: newWidth });
        }
    };

    const handleResizeEnd = () => {
        dragStartRef.current = null;
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
    };


    // --- Timeline Drop Handling ---

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const dropData = e.dataTransfer.getData('application/video-editor-media');
        
        if (dropData) {
            // Internal Media Panel Drop
            const mediaFile = JSON.parse(dropData) as MediaFile;
            addClipFromMedia(mediaFile, e.clientX); 
        } else if (e.dataTransfer.files.length > 0) {
            // External File Drop
            handleFileUpload(e.dataTransfer.files);
        }
    };
    
    const addClipFromMedia = (media: MediaFile, dropClientX: number) => {
        // Find default track based on type
        const defaultTrackId = media.type === 'audio' 
            ? (state.tracks.find(t => t.type === 'audio')?.id || 101)
            : (state.tracks.find(t => t.type === 'video')?.id || 1);
            
        // Map 'text' type to 'image' for clip rendering (since we converted text to SVG image)
        const clipType = media.type === 'text' ? 'image' : media.type;

        // Calculate drop time if needed, for now appending or using current time
        const startTime = localTime;

        const newClip: VideoClip = {
            id: `clip-${Date.now()}-${Math.random()}`,
            type: clipType as any,
            src: media.src,
            start: startTime, 
            duration: media.type === 'image' || media.type === 'text' ? 5 : 10, // Default duration
            offset: 0,
            layer: defaultTrackId,
            name: media.name,
            thumbnail: media.thumbnail
        };
        updateState({ clips: [...state.clips, newClip] });
    };

    const handleClipSelect = (id: string | null) => {
        updateState({ selectedClipId: id });
    };

    const handleDeleteSelected = () => {
        if (state.selectedClipId) {
            updateState({ 
                clips: state.clips.filter(c => c.id !== state.selectedClipId),
                selectedClipId: null
            });
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelectNode) onSelectNode();
    };

    // Keyboard Shortcuts (Space for Play/Pause when selected)
    useEffect(() => {
        if (!isSelected) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                 const target = e.target as HTMLElement;
                 if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
                 
                 e.preventDefault();
                 e.stopPropagation();
                 handlePlayPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, handlePlayPause]);

    return (
        <div 
            ref={containerRef} 
            className="flex flex-col w-full h-full bg-gray-900 text-white rounded-lg overflow-hidden"
            onMouseDown={handleMouseDown}
            onWheel={e => e.stopPropagation()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
        >
            {/* Top Section: Media Panel + Player + Properties */}
            <div className="flex-1 flex min-h-0">
                {/* Left: Media Library (Explorer) */}
                <div style={{ width: state.mediaPanelWidth }} className="flex-shrink-0 flex flex-col relative border-r border-gray-700">
                    <MediaPanel 
                        files={state.mediaFiles} 
                        currentFolderId={state.currentFolderId}
                        viewMode={state.viewMode}
                        onUpload={handleFileUpload} 
                        onDragStart={handleMediaDragStart}
                        onDelete={handleDeleteMedia}
                        onNavigate={handleNavigate}
                        onCreateFolder={handleCreateFolder}
                        onRename={handleRenameMedia}
                        onToggleView={handleViewModeToggle}
                    />
                    
                    {/* Resize Handle */}
                    <div 
                        className="absolute top-0 bottom-0 right-[-4px] w-2 cursor-col-resize z-10 hover:bg-cyan-500/50 transition-colors"
                        onMouseDown={handleResizeStart}
                    />
                </div>

                {/* Center: Player */}
                <div className="flex-1 bg-black relative">
                    <PreviewPlayer 
                        currentTime={localTime} 
                        clips={state.clips} 
                        isPlaying={isPlaying}
                        onTimeUpdate={handleTimeUpdate}
                    />
                </div>
                
                {/* Right: Properties */}
                <div className="w-48 bg-gray-800 p-2 flex flex-col space-y-2 border-l border-gray-700 flex-shrink-0">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Properties</h4>
                    {state.selectedClipId ? (
                        <div className="text-xs space-y-2">
                            <p className="text-gray-300">Selected Clip</p>
                            <div className="h-px bg-gray-700 w-full"></div>
                            <button onClick={handleDeleteSelected} className="w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white transition-colors">Delete Clip</button>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">No clip selected</p>
                    )}
                </div>
            </div>

            {/* Transport Controls */}
            <div className="h-10 bg-gray-800 border-t border-gray-700 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleSeek(0)} className="text-gray-400 hover:text-white">|&lt;</button>
                    <button 
                        onClick={handlePlayPause}
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'} text-white transition-colors`}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                        ) : (
                            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                    </button>
                </div>
                <div className="font-mono text-sm text-cyan-400">
                    {localTime.toFixed(2)}s / {state.totalDuration}s
                </div>
                <div className="flex items-center space-x-2">
                     <button onClick={() => handleZoom('out')} className="text-gray-400 hover:text-white text-xs bg-gray-700 px-2 py-1 rounded">- Zoom</button>
                     <button onClick={() => handleZoom('in')} className="text-gray-400 hover:text-white text-xs bg-gray-700 px-2 py-1 rounded">+ Zoom</button>
                </div>
            </div>

            {/* Bottom Section: Timeline */}
            <div className="h-56 flex-shrink-0">
                <Timeline 
                    tracks={state.tracks}
                    clips={state.clips}
                    currentTime={localTime}
                    duration={state.totalDuration}
                    zoom={state.zoom}
                    onSeek={handleSeek}
                    scrollLeft={state.scrollLeft}
                    onScroll={(sl) => updateState({ scrollLeft: sl })}
                    onClipSelect={handleClipSelect}
                    selectedClipId={state.selectedClipId}
                    audioDataMap={audioDataMap}
                />
            </div>
        </div>
    );
};
