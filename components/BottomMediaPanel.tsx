
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const BottomMediaPanel: React.FC = () => {
    const context = useAppContext();
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!context || !context.globalMedia) return null;

    const { globalMedia, setGlobalMedia, selectNode } = context;
    const { name, isPlaying, currentTime, duration, nodeId } = globalMedia;

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGlobalMedia(prev => {
            if (!prev) return null;
            
            const newIsPlaying = !prev.isPlaying;
            return {
                ...prev,
                // Optimistically update UI state immediately
                isPlaying: newIsPlaying,
                // Explicitly toggle command based on the desired state
                command: newIsPlaying ? 'play' : 'pause',
                // Add timestamp to ensure even identical commands are processed if state drifted
                commandTimestamp: Date.now()
            };
        });
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        // Optimistic UI update: Just update the displayed time immediately
        // Do NOT send the 'seek' command yet, as it causes decoder lag during drag
        setGlobalMedia(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentTime: time,
                // Ensure we don't accidentally send a stale command during drag
                command: undefined 
            };
        });
    };

    const handleSeekCommit = (e: React.MouseEvent<HTMLInputElement>) => {
        // Send the actual command only on mouse up (drag end)
        const time = parseFloat((e.currentTarget as HTMLInputElement).value);
        setGlobalMedia(prev => {
            if (!prev) return null;
            return {
                ...prev,
                command: 'seek',
                seekTarget: time,
                currentTime: time,
                commandTimestamp: Date.now()
            };
        });
    };
    
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Send pause command before closing to be nice
        setGlobalMedia(prev => prev ? { ...prev, command: 'pause', commandTimestamp: Date.now() } : null);
        // Small delay to let pause register, then clear
        setTimeout(() => setGlobalMedia(null), 100);
    };

    const handleFocus = () => {
        selectNode(nodeId);
    };

    const toggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsCollapsed(!isCollapsed);
    };

    // --- Collapsed View ---
    if (isCollapsed) {
        return (
            <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
                <div 
                    className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-2 flex flex-col items-center space-y-2 cursor-pointer hover:bg-gray-800/90 transition-colors"
                    onClick={handleFocus}
                    title={name}
                >
                    {/* Expand Button */}
                    <button 
                        onClick={toggleCollapse}
                        className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Expand"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-gray-600 flex-shrink-0">
                        {globalMedia.type === 'audio' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                        )}
                    </div>

                    {/* Mini Play/Pause */}
                    <button 
                        onClick={handlePlayPause}
                        className="text-cyan-400 hover:text-white transition-colors focus:outline-none p-1"
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    
                    <button onClick={handleClose} className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-gray-700 rounded-full transition-colors" title="Close">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    // --- Expanded View ---
    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div 
                className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-2 flex items-center space-x-3 w-[330px] cursor-pointer hover:bg-gray-800/90 transition-colors"
                onClick={handleFocus}
            >
                {/* Collapse Button */}
                <button 
                    onClick={toggleCollapse}
                    className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                    title="Collapse"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Icon */}
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-gray-600 flex-shrink-0">
                    {globalMedia.type === 'audio' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                    )}
                </div>

                <div className="flex-grow min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-200 truncate pr-2" title={name}>{name}</span>
                        <button onClick={handleClose} className="text-gray-500 hover:text-white p-0.5 rounded">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePlayPause}
                            className="text-cyan-400 hover:text-white transition-colors focus:outline-none"
                        >
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        
                        <input 
                            type="range" 
                            min="0" 
                            max={duration || 100} 
                            value={currentTime} 
                            onChange={handleSeekChange}
                            onMouseUp={handleSeekCommit}
                            onTouchEnd={handleSeekCommit as any}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        
                        <span className="text-[9px] font-mono text-gray-400 whitespace-nowrap min-w-[24px]">
                            {formatTime(currentTime)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
