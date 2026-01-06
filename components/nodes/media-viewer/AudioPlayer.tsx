
import React from 'react';
import { WaveformDisplay } from './WaveformDisplay';
import { DbMeter } from './DbMeter';
import { AudioPlayerProps } from './types';
import { ActionButton } from '../../ActionButton';

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    src, name, mediaRef, audioData, analyser, currentTime, duration, isPlaying, volume, markers,
    onSeek, onVolumeChange, onTimeUpdate, onLoadedMetadata, onEnded, onClear, onRelink, onSelect, t
}) => {
    return (
        <div className="w-full h-full flex flex-col relative group bg-gray-900 overflow-hidden pr-3">
            
            {/* Header Info Area - Full Width */}
            <div 
                className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 space-x-2 shrink-0 z-10 w-full"
                onMouseDown={(e) => { 
                    // Allow node dragging from header (don't stop prop), but ensure selection.
                    // Actually, NodeView handles selection on drag start.
                    // But if we click buttons inside, we need explicit select.
                }}
            >
                <div className="w-6 h-6 rounded bg-cyan-900/50 flex items-center justify-center border border-cyan-700 shadow-sm flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                </div>
                <span className="text-gray-200 text-xs font-semibold truncate shadow-sm flex-grow">{name}</span>
                
                <ActionButton title={t('node.mediaViewer.relink')} onClick={onRelink} tooltipPosition="left">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </ActionButton>

                <ActionButton title={t('node.action.clear')} onClick={onClear} tooltipPosition="left">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </ActionButton>
            </div>

            {/* Content Row: Waveform + Volume Panel */}
            <div className="flex-grow flex min-h-0 relative w-full">
                
                {/* Waveform Canvas - Background changed to gray-900 */}
                <div className="flex-grow relative h-full bg-gray-900 min-w-0">
                    <WaveformDisplay 
                        audioData={audioData}
                        currentTime={currentTime}
                        duration={duration}
                        isPlaying={isPlaying}
                        onSeek={onSeek}
                        markers={markers}
                        onSelect={onSelect}
                    />
                </div>

                {/* Right Side - dB Meter & Volume */}
                <div 
                    className="w-12 bg-gray-900 border-l border-gray-700 flex flex-col items-center py-2 gap-2 flex-shrink-0 relative z-20" 
                    onMouseDown={e => { e.stopPropagation(); if (onSelect) onSelect(); }}
                >
                        <div className="flex-1 w-2 relative bg-gray-800 rounded-full overflow-hidden">
                            <DbMeter analyser={analyser} isPlaying={isPlaying} />
                        </div>
                        
                        <div className="h-24 w-full flex justify-center py-1">
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value={volume} 
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                className="h-full w-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                style={{
                                    writingMode: 'vertical-lr', 
                                    direction: 'rtl',
                                    WebkitAppearance: 'slider-vertical',
                                    width: '4px'
                                }}
                                title={`Volume: ${Math.round(volume * 100)}%`}
                            />
                        </div>
                        
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                </div>
            </div>
            
            <audio 
                ref={mediaRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
            />
        </div>
    );
};