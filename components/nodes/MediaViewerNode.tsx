
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import { MediaState } from './media-viewer/types';
import { useMediaState } from './media-viewer/useMediaState';
import { useAudioVisualizer } from './media-viewer/useAudioVisualizer';
import { MediaControls } from './media-viewer/MediaControls';
import { AudioPlayer } from './media-viewer/AudioPlayer';
import { VideoPlayer } from './media-viewer/VideoPlayer';
import { ActionButton } from '../ActionButton';

export const MediaViewerNode: React.FC<NodeContentProps> = ({ node, onValueChange, t, isSelected, onSelectNode }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const relinkInputRef = useRef<HTMLInputElement>(null); // New ref for relinking
    const markersInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [urlInput, setUrlInput] = useState('');

    // Initial parsing for static properties like src/type to prevent hook reset on every render
    const initialState = useMemo<MediaState>(() => {
        try { return JSON.parse(node.value || '{}'); } catch { return { src: '', type: 'video', name: '' }; }
    }, [node.value]);

    const { src, type, name } = initialState;

    // Use custom hook for playback state management
    const {
        mediaRef,
        isPlaying,
        currentTime,
        duration,
        volume,
        markers,
        togglePlay,
        stop,
        seek,
        changeVolume,
        addMarker,
        updateMarker,
        deleteMarker,
        deleteAllMarkers,
        handleTimeUpdate,
        handleLoadedMetadata,
        handleEnded
    } = useMediaState(node.id, node.value, onValueChange);

    // Wrapper to trigger node selection on interaction
    const select = useCallback(() => {
        if (onSelectNode) onSelectNode();
    }, [onSelectNode]);

    // Wrapped Handlers for selection + action
    const handleTogglePlay = useCallback(() => { select(); togglePlay(); }, [select, togglePlay]);
    const handleStop = useCallback(() => { select(); stop(); }, [select, stop]);
    const handleSeek = useCallback((time: number) => { select(); seek(time); }, [select, seek]);
    const handleChangeVolume = useCallback((vol: number) => { select(); changeVolume(vol); }, [select, changeVolume]);
    const handleAddMarker = useCallback(() => { select(); addMarker(); }, [select, addMarker]);
    const handleUpdateMarker = useCallback((id: string, u: any) => { select(); updateMarker(id, u); }, [select, updateMarker]);
    const handleDeleteMarker = useCallback((id: string) => { select(); deleteMarker(id); }, [select, deleteMarker]);
    const handleDeleteAllMarkers = useCallback(() => { select(); deleteAllMarkers(); }, [select, deleteAllMarkers]);

    // Hotkeys for selected node
    useEffect(() => {
        if (!isSelected || !src) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Prevent if user is typing in an input field within the node (e.g. renaming marker)
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            
            // Frame step constant (approx 1/24s)
            const FRAME_STEP = 0.042;

            if (e.code === 'KeyM') {
                e.preventDefault();
                e.stopPropagation(); // Prevent global "M" hotkey from creating new node
                addMarker();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                seek(Math.max(0, currentTime - FRAME_STEP));
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                seek(Math.min(duration, currentTime + FRAME_STEP));
            } else if (e.code === 'Space') {
                // Prevent scrolling page/canvas
                e.preventDefault();
                togglePlay();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, src, currentTime, duration, addMarker, seek, togglePlay]);

    // Use custom hook for audio visualizer data
    const { analyserRef, audioDataRef } = useAudioVisualizer(src, type, mediaRef.current as HTMLMediaElement);

    // --- File Handling ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
        if (e.target) e.target.value = '';
    };

    const handleRelinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleRelinkUpload(file);
        if (e.target) e.target.value = '';
    };

    const handleFileUpload = (file: File) => {
        const url = URL.createObjectURL(file);
        const newType = file.type.startsWith('audio/') ? 'audio' : 'video';
        
        onValueChange(node.id, JSON.stringify({
            src: url,
            type: newType,
            name: file.name,
            currentTime: 0,
            volume: 0.4, // Default volume
            isPlaying: true, // Auto-play on load
            markers: [] // Reset markers on new file
        }));
    };
    
    const handleUrlSubmit = () => {
        if (!urlInput.trim()) return;
        const url = urlInput.trim();
        
        // Simple heuristic for type detection based on extension
        // If unknown, default to video as it's more common for generic URLs
        const ext = url.split('.').pop()?.toLowerCase();
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '');
        const newType = isAudio ? 'audio' : 'video';
        const nameFromUrl = url.split('/').pop() || 'Remote Media';

        onValueChange(node.id, JSON.stringify({
            src: url,
            type: newType,
            name: nameFromUrl.length > 30 ? nameFromUrl.substring(0, 30) + '...' : nameFromUrl,
            currentTime: 0,
            volume: 0.4,
            isPlaying: true, // Auto-play on URL load
            markers: []
        }));
        setUrlInput('');
    };

    const handleRelinkUpload = (file: File) => {
        const url = URL.createObjectURL(file);
        const newType = file.type.startsWith('audio/') ? 'audio' : 'video';
        // Preserve existing state (markers, etc), just update src, type, name, AND reset playback
        const currentState = JSON.parse(node.value || '{}');
        
        onValueChange(node.id, JSON.stringify({
            ...currentState,
            src: url,
            type: newType,
            name: file.name,
            currentTime: 0, // Reset time on relink
            isPlaying: true // Auto-play on relink
        }));
    };

    const handleTriggerRelink = () => {
        select();
        // 1. Stop playback immediately and clear element source
        if (mediaRef.current) {
            mediaRef.current.pause();
            mediaRef.current.removeAttribute('src'); 
            mediaRef.current.load();
        }

        // 2. Clear the node state src to "close" the player panel and reset to empty state.
        // We preserve markers and volume.
        const currentState = JSON.parse(node.value || '{}');
        onValueChange(node.id, JSON.stringify({
            ...currentState,
            src: '', // Clearing src triggers the "Drop Media" view
            name: '',
            isPlaying: false,
            currentTime: 0
        }));

        // 3. Open file dialog after a brief delay to ensure state and UI have reset
        setTimeout(() => {
             relinkInputRef.current?.click();
        }, 100);
    };

    // --- Marker Save/Load Handling ---
    const handleSaveMarkers = () => {
        select();
        if (!markers || markers.length === 0) return;
        const json = JSON.stringify(markers, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 10);
        a.download = `markers_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoadMarkersTrigger = () => {
        select();
        markersInputRef.current?.click();
    };

    const handleMarkersFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const loadedMarkers = JSON.parse(text);
                
                if (Array.isArray(loadedMarkers)) {
                    // Update persistent state via onValueChange
                    const currentState = JSON.parse(node.value || '{}');
                    onValueChange(node.id, JSON.stringify({
                        ...currentState,
                        markers: loadedMarkers
                    }));
                } else {
                    console.error("Invalid markers file format");
                }
            } catch (err) {
                console.error("Failed to load markers", err);
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
             if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
                 handleFileUpload(file); // Drag and drop replaces file completely (reset markers)
             } else if (file.name.endsWith('.json')) {
                 // Try to load markers from JSON if dropped
                 const reader = new FileReader();
                 reader.onload = (event) => {
                    try {
                        const text = event.target?.result as string;
                        const loaded = JSON.parse(text);
                        if (Array.isArray(loaded)) {
                            const currentState = JSON.parse(node.value || '{}');
                            onValueChange(node.id, JSON.stringify({ ...currentState, markers: loaded }));
                        }
                    } catch {}
                 };
                 reader.readAsText(file);
             }
        }
    };

    const handleClear = () => {
        select();
        // Manually pause element to prevent audio continuing after clear
        if (mediaRef.current) {
            mediaRef.current.pause();
            mediaRef.current.src = "";
        }
        // Force update to empty state, resetting everything including markers
        onValueChange(node.id, JSON.stringify({ src: '', type: 'video', name: '', markers: [], volume: 0.4 }));
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} />
            <input ref={relinkInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleRelinkChange} />
            <input ref={markersInputRef} type="file" accept=".json" className="hidden" onChange={handleMarkersFileChange} />
            
            {/* Display Area */}
            <div 
                className={`flex-grow relative flex ${src ? 'bg-black' : 'bg-gray-800'} min-h-0 overflow-hidden group ${isDragOver ? 'ring-2 ring-cyan-500 bg-gray-800' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {src ? (
                    type === 'video' ? (
                        <>
                            <VideoPlayer 
                                src={src}
                                mediaRef={mediaRef as React.RefObject<HTMLVideoElement>}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={handleEnded}
                                onTogglePlay={handleTogglePlay}
                            />
                            {/* Overlay Controls for Video */}
                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <ActionButton 
                                    title={t('node.mediaViewer.relink')} 
                                    onClick={(e) => { e.stopPropagation(); handleTriggerRelink(); }} 
                                    className="bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white cursor-pointer"
                                    tooltipPosition="bottom" // Changed to bottom
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </ActionButton>
                                <ActionButton 
                                    title={t('node.action.clear')} 
                                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                    className="bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white cursor-pointer"
                                    tooltipPosition="bottom" // Changed to bottom
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </ActionButton>
                            </div>
                        </>
                    ) : (
                        <AudioPlayer 
                            src={src}
                            name={name}
                            mediaRef={mediaRef as React.RefObject<HTMLAudioElement>}
                            audioData={audioDataRef.current}
                            analyser={analyserRef.current}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            volume={volume}
                            markers={markers} 
                            onSeek={handleSeek}
                            onVolumeChange={handleChangeVolume}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                            onClear={(e) => { if(e) e.stopPropagation(); handleClear(); }} 
                            onRelink={(e) => { if(e) e.stopPropagation(); handleTriggerRelink(); }} 
                            onSelect={select}
                            t={t}
                        />
                    )
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                        {/* Drop Zone / File Select */}
                        <div 
                            className="flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:text-gray-400 transition-colors mb-4" 
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-medium">{t('node.content.dropMedia')}</p>
                        </div>
                        
                        {/* Divider */}
                        <div className="w-1/2 h-px bg-gray-700 my-2"></div>

                        {/* URL Input */}
                        <div className="w-full max-w-[80%] flex items-center space-x-1">
                             <div className="flex-grow bg-gray-800 rounded-md border border-gray-600 flex items-center px-2 py-1 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <input 
                                    type="text" 
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="Paste URL..."
                                    className="bg-transparent border-none text-xs text-white focus:outline-none w-full"
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleUrlSubmit(); }}
                                    onMouseDown={(e) => e.stopPropagation()} // Allow text selection
                                />
                             </div>
                             <button 
                                onClick={handleUrlSubmit}
                                className="p-1.5 bg-cyan-600 hover:bg-cyan-700 rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!urlInput.trim()}
                                title="Load from URL"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                             </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            {src && (
                <MediaControls 
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    markers={markers}
                    onTogglePlay={handleTogglePlay}
                    onStop={handleStop}
                    onSeek={handleSeek}
                    onVolumeChange={handleChangeVolume}
                    onClear={handleClear} 
                    onAddMarker={handleAddMarker}
                    onUpdateMarker={handleUpdateMarker}
                    onDeleteMarker={handleDeleteMarker}
                    onDeleteAllMarkers={handleDeleteAllMarkers}
                    onSaveMarkers={handleSaveMarkers}
                    onLoadMarkers={handleLoadMarkersTrigger}
                    onSelect={select}
                    disabled={!src}
                    t={t}
                />
            )}
        </div>
    );
};
