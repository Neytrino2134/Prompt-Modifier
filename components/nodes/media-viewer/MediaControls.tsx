
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MediaControlsProps, MediaMarker } from './types';
import { ActionButton } from '../../ActionButton';
import { Tooltip } from '../../Tooltip';

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const pad = (num: number, size: number) => ('000' + num).slice(size * -1);

const formatSrtTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
};

const MarkerEditPopover: React.FC<{
    marker: MediaMarker;
    onUpdate: (id: string, updates: Partial<MediaMarker>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    initialPosition: { x: number, y: number };
}> = ({ marker, onUpdate, onDelete, onClose, initialPosition }) => {
    const [label, setLabel] = useState(marker.label);
    const [color, setColor] = useState(marker.color);
    const colors = ['#22d3ee', '#facc15', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#f97316', '#ffffff'];

    // Position State
    const [position, setPosition] = useState(initialPosition);
    
    // Dragging state
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragStartRef.current) return;
        setPosition({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handleMouseUp = () => {
        dragStartRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleSave = () => {
        onUpdate(marker.id, { label, color });
        onClose();
    };

    const handleDelete = () => {
        onDelete(marker.id);
        onClose();
    };

    // Use Portal to render at root level to avoid zoom/transform issues from Node graph
    return createPortal(
        <div 
            className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-2 flex flex-col gap-2 w-56"
            style={{ 
                left: position.x,
                top: position.y,
            }}
            onMouseDown={e => e.stopPropagation()} 
        >
            <div 
                className="flex justify-between items-center border-b border-gray-700 pb-1 mb-1 cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <span className="text-xs font-bold text-gray-300">Edit Marker</span>
                <button onClick={onClose} className="text-gray-500 hover:text-white" title="Cancel" onMouseDown={e => e.stopPropagation()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <input 
                type="text" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 w-full"
                placeholder="Marker Name"
            />
            
            <div className="flex gap-1 justify-between">
                {colors.map(c => (
                    <button 
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-4 h-4 rounded-full border ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-700">
                <button 
                    onClick={handleDelete}
                    className="p-1 text-red-400 hover:text-red-200 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete Marker"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
                <button 
                    onClick={handleSave}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Apply
                </button>
            </div>
        </div>,
        document.body
    );
};

export const MediaControls: React.FC<MediaControlsProps> = ({
    isPlaying,
    currentTime,
    duration,
    volume,
    markers,
    onTogglePlay,
    onStop,
    onSeek,
    onVolumeChange,
    onClear,
    onAddMarker,
    onUpdateMarker,
    onDeleteMarker,
    onDeleteAllMarkers,
    onSaveMarkers,
    onLoadMarkers,
    onSelect,
    disabled,
    t
}) => {
    const seekBarRef = useRef<HTMLDivElement>(null);
    const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ x: number, y: number } | null>(null);

    const activeMarker = markers.find(m => m.id === activeMarkerId);

    const handleMarkerClick = (e: React.MouseEvent, marker: MediaMarker) => {
        e.stopPropagation();
        onSeek(marker.time);
    };

    const handleEditClick = (e: React.MouseEvent, markerId: string) => {
        e.stopPropagation();
        // Calculate initial position centered above the click but clamped to screen
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setPopoverPosition({
            x: rect.left,
            y: rect.top - 160 // Approximate height above
        });
        setActiveMarkerId(markerId);
    };

    const handleExportSRT = () => {
        if (markers.length === 0) return;
        
        // Sort markers by time
        const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
        
        let srtContent = "";
        sortedMarkers.forEach((m, i) => {
            const start = formatSrtTime(m.time);
            // Default 1s duration or up to next marker
            const end = formatSrtTime(m.time + 1); 
            srtContent += `${i + 1}\n${start} --> ${end}\n${m.label}\n\n`;
        });
        
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `markers_${new Date().toISOString().slice(0, 10)}.srt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div 
            className="flex-shrink-0 bg-gray-800 border-t border-gray-700 flex flex-col gap-1 relative z-30" 
            onMouseDown={e => { e.stopPropagation(); if (onSelect) onSelect(); }}
        >
            
            {/* Popover */}
            {activeMarkerId && activeMarker && popoverPosition && (
                <MarkerEditPopover 
                    marker={activeMarker}
                    onUpdate={onUpdateMarker}
                    onDelete={(id) => { onDeleteMarker(id); setActiveMarkerId(null); }}
                    onClose={() => setActiveMarkerId(null)}
                    initialPosition={popoverPosition}
                />
            )}

            {/* Seek Bar Container */}
            <div className="flex items-center relative group w-full pt-1">
                
                <div className="flex-grow relative h-4 flex items-center mx-1" ref={seekBarRef}>
                    {/* Markers Overlay */}
                    {duration > 0 && markers.map(marker => {
                        const percent = (marker.time / duration) * 100;
                        return (
                            <div 
                                key={marker.id}
                                className="absolute top-0 w-4 h-4 -ml-2 cursor-pointer z-10 group/marker flex flex-col items-center hover:z-20"
                                style={{ left: `${percent}%` }}
                                onClick={(e) => handleMarkerClick(e, marker)}
                            >
                                {/* Marker Shape */}
                                <div className="w-0.5 h-full bg-white/50 group-hover/marker:bg-white pointer-events-none"></div>
                                <div 
                                    className="w-2.5 h-2.5 rounded-full absolute top-1/2 -translate-y-1/2 shadow-sm border border-black/50 transition-transform group-hover/marker:scale-125" 
                                    style={{ backgroundColor: marker.color }} 
                                ></div>
                                
                                {/* Edit Button Tooltip */}
                                {activeMarkerId !== marker.id && (
                                    <div className="absolute bottom-full mb-1 flex flex-col items-center gap-1 opacity-0 group-hover/marker:opacity-100 transition-opacity">
                                         <div className="bg-black/80 text-white text-[9px] px-1 rounded whitespace-nowrap pointer-events-none mb-0.5">
                                            {marker.label}
                                        </div>
                                        <button 
                                            onClick={(e) => handleEditClick(e, marker.id)}
                                            className="px-2 py-0.5 bg-gray-700 hover:bg-cyan-600 text-white text-[9px] rounded shadow border border-gray-500 hover:border-cyan-400 pointer-events-auto"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={(e) => onSeek(parseFloat(e.target.value))}
                        disabled={disabled}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500 relative z-0"
                    />
                </div>

                <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap min-w-[70px] text-right pr-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>
            </div>

            {/* Buttons Row */}
            <div className="relative flex items-center justify-center px-1 h-8 mb-1">
                
                {/* Center Group */}
                <div className="flex items-center space-x-4">
                    <Tooltip content={t('node.mediaViewer.stop')}>
                        <button 
                            onClick={onStop}
                            disabled={disabled}
                            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            aria-label={t('node.mediaViewer.stop')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <rect x="5" y="5" width="10" height="10" />
                            </svg>
                        </button>
                    </Tooltip>
                    
                    {/* Centered Play Button */}
                    <Tooltip content={isPlaying ? t('node.mediaViewer.pause') : t('node.mediaViewer.play')}>
                        <button 
                            onClick={onTogglePlay}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:bg-gray-700 disabled:text-gray-500"
                            aria-label={isPlaying ? t('node.mediaViewer.pause') : t('node.mediaViewer.play')}
                        >
                            {isPlaying ? (
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                 </svg>
                            ) : (
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                 </svg>
                            )}
                        </button>
                    </Tooltip>

                    <Tooltip content={t('node.mediaViewer.addMarker')}>
                        <button 
                            onClick={onAddMarker} 
                            disabled={disabled}
                            className="p-1.5 rounded-full text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t('node.mediaViewer.addMarker')}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>

                {/* Right Group (Save/Load/Export/Clear Markers) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center space-x-1 pr-1">
                     <Tooltip content={t('node.mediaViewer.saveMarkers')}>
                         <button 
                            onClick={onSaveMarkers}
                            className="p-1.5 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-700 transition-colors cursor-pointer"
                            aria-label={t('node.mediaViewer.saveMarkers')}
                            disabled={disabled || markers.length === 0}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    </Tooltip>

                    <Tooltip content={t('node.mediaViewer.loadMarkers')}>
                         <button 
                            onClick={onLoadMarkers}
                            className="p-1.5 rounded-full text-gray-400 hover:text-emerald-400 hover:bg-gray-700 transition-colors cursor-pointer"
                            aria-label={t('node.mediaViewer.loadMarkers')}
                            disabled={disabled}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                            </svg>
                        </button>
                    </Tooltip>

                     <Tooltip content={t('node.mediaViewer.exportSRT')}>
                         <button 
                            onClick={handleExportSRT}
                            className="p-1.5 rounded-full text-gray-400 hover:text-purple-400 hover:bg-gray-700 transition-colors cursor-pointer"
                            aria-label={t('node.mediaViewer.exportSRT')}
                            disabled={disabled || markers.length === 0}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </Tooltip>
                     <Tooltip content={t('node.mediaViewer.deleteAllMarkers')}>
                         <button 
                            onClick={onDeleteAllMarkers}
                            className="p-1.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors cursor-pointer"
                            aria-label={t('node.mediaViewer.deleteAllMarkers')}
                            disabled={disabled || markers.length === 0}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};
