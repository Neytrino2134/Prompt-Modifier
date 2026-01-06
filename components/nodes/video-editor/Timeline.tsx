
import React, { useRef, useEffect } from 'react';
import { VideoClip, VideoTrack } from './types';
import { WaveformClip } from './WaveformClip';

interface TimelineProps {
    tracks: VideoTrack[];
    clips: VideoClip[];
    currentTime: number;
    duration: number;
    zoom: number; // Pixels per second
    onSeek: (time: number) => void;
    scrollLeft: number;
    onScroll: (scrollLeft: number) => void;
    onClipSelect: (id: string | null) => void;
    selectedClipId: string | null;
    audioDataMap?: Record<string, Float32Array>; // Added audio data
}

export const Timeline: React.FC<TimelineProps> = ({ 
    tracks, clips, currentTime, duration, zoom, onSeek, scrollLeft, onScroll, onClipSelect, selectedClipId, audioDataMap
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    
    // Calculate total width based on duration + padding
    const totalWidth = Math.max(duration * zoom, containerRef.current?.clientWidth || 0) + 200;

    const handleClipClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onClipSelect(id);
    };

    const getClipColorClass = (clip: VideoClip) => {
        if (clip.type === 'video') return 'bg-indigo-900/80 border-indigo-500';
        if (clip.type === 'image') return 'bg-emerald-900/80 border-emerald-500';
        if (clip.type === 'audio') return 'bg-amber-900/80 border-amber-500';
        return 'bg-gray-700 border-gray-500';
    };
    
    // --- Scrubbing Logic ---
    const calculateTimeFromEvent = (clientX: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        // Mouse X relative to the container viewport
        const xInViewport = clientX - rect.left;
        // Add scroll offset to get absolute X
        const xAbsolute = xInViewport + containerRef.current.scrollLeft;
        const time = Math.max(0, xAbsolute / zoom);
        return time;
    };

    const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        onSeek(calculateTimeFromEvent(e.clientX));
        
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDraggingRef.current) {
            onSeek(calculateTimeFromEvent(e.clientX));
        }
    };

    const handleGlobalMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    // Ensure cleanup
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);

    const renderRuler = () => {
        const marks = [];
        const step = zoom < 20 ? 5 : (zoom < 50 ? 1 : 0.5); // seconds per mark
        const limit = duration + 10; // Render a bit past end

        for (let t = 0; t <= limit; t += step) {
            const left = t * zoom;
            marks.push(
                <div key={t} className="absolute top-0 bottom-0 border-l border-gray-600 pointer-events-none" style={{ left }}>
                    <span className="absolute top-0 left-1 text-[9px] text-gray-400 select-none">{t}s</span>
                </div>
            );
        }
        return marks;
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700">
            {/* Timeline Area (Tracks + Ruler) */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Track Headers (Left Column) */}
                <div className="w-24 flex-shrink-0 bg-gray-800 border-r border-gray-700 z-20 flex flex-col shadow-lg">
                    <div className="h-8 border-b border-gray-700 bg-gray-800"></div> {/* Ruler Corner */}
                    {tracks.map(track => (
                        <div key={track.id} className="h-16 border-b border-gray-700 flex flex-col justify-center px-2 text-xs text-gray-400 bg-gray-800 gap-1 relative">
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${track.type === 'audio' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                                <span className="font-bold truncate" title={track.name}>{track.name}</span>
                             </div>
                             <div className="flex items-center gap-1 text-[10px] opacity-60">
                                 <span>{track.type.toUpperCase()}</span>
                             </div>
                        </div>
                    ))}
                </div>

                {/* Timeline Content (Scrollable) */}
                <div 
                    className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar"
                    ref={containerRef}
                    onScroll={(e) => onScroll(e.currentTarget.scrollLeft)}
                >
                    <div style={{ width: totalWidth, height: '100%' }} className="relative">
                        
                        {/* Ruler */}
                        <div 
                            className="h-8 bg-gray-800 border-b border-gray-700 relative cursor-pointer hover:bg-gray-750 z-10"
                            onMouseDown={handleRulerMouseDown}
                        >
                            {renderRuler()}
                            
                            {/* Playhead Handle in Ruler */}
                            <div 
                                className="absolute top-0 bottom-0 w-0 z-20 pointer-events-none"
                                style={{ left: currentTime * zoom }}
                            >
                                {/* Triangle Handle */}
                                <div className="absolute -top-0 -left-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-500"></div>
                            </div>
                        </div>

                        {/* Tracks */}
                        {tracks.map(track => (
                            <div key={track.id} className="h-16 border-b border-gray-700 relative bg-gray-900/50">
                                {/* Grid Lines (Background) */}
                                <div className="absolute inset-0 pointer-events-none opacity-20">
                                     {/* Can add subdivided grid here if needed */}
                                </div>
                                
                                {clips.filter(c => c.layer === track.id).map(clip => (
                                    <div
                                        key={clip.id}
                                        onClick={(e) => handleClipClick(e, clip.id)}
                                        className={`absolute top-1 bottom-1 rounded overflow-hidden cursor-pointer border border-opacity-50 select-none group
                                            ${getClipColorClass(clip)}
                                            ${selectedClipId === clip.id ? 'ring-2 ring-white z-10' : ''}
                                        `}
                                        style={{
                                            left: clip.start * zoom,
                                            width: clip.duration * zoom,
                                        }}
                                        title={`${clip.name} (Start: ${clip.start.toFixed(1)}s, Dur: ${clip.duration.toFixed(1)}s)`}
                                    >
                                        {/* Waveform Visualization */}
                                        {audioDataMap && audioDataMap[clip.id] && (
                                            <WaveformClip 
                                                data={audioDataMap[clip.id]} 
                                                color={clip.type === 'audio' ? 'rgba(251, 191, 36, 0.7)' : 'rgba(99, 102, 241, 0.7)'} 
                                            />
                                        )}
                                        
                                        {/* Text Overlay */}
                                        <div className="absolute top-0 left-0 right-0 px-1 text-[10px] text-white/90 truncate bg-black/30 pointer-events-none">
                                            {clip.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Global Playhead Line (extends down) */}
                        <div 
                            className="absolute top-8 bottom-0 w-px bg-red-500 pointer-events-none z-30"
                            style={{ left: currentTime * zoom }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
