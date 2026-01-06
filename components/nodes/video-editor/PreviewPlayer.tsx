
import React, { useRef, useEffect, useState } from 'react';
import { VideoClip } from './types';

interface PreviewPlayerProps {
    currentTime: number;
    clips: VideoClip[];
    isPlaying: boolean;
    onTimeUpdate: (updater: (prev: number) => number) => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ currentTime, clips, isPlaying, onTimeUpdate }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(currentTime);
    
    const [currentVisualClip, setCurrentVisualClip] = useState<VideoClip | null>(null);
    const [activeAudioClips, setActiveAudioClips] = useState<VideoClip[]>([]);

    // Determine clips active at this timestamp
    useEffect(() => {
        const visibleClips = clips.filter(c => 
            (c.type === 'video' || c.type === 'image') && 
            currentTime >= c.start && currentTime < c.start + c.duration
        );
        // Visual Layering: Top track wins
        visibleClips.sort((a, b) => b.layer - a.layer);
        setCurrentVisualClip(visibleClips[0] || null);

        // Audio Clips (can be multiple)
        const activeAudios = clips.filter(c => 
            c.type === 'audio' && 
            currentTime >= c.start && currentTime < c.start + c.duration
        );
        setActiveAudioClips(activeAudios);

    }, [currentTime, clips]);

    // Sync Video Element
    useEffect(() => {
        const clip = currentVisualClip;
        if (clip && clip.type === 'video' && videoRef.current) {
            // Calculate time within the source clip
            const clipTime = (currentTime - clip.start) + clip.offset;
            
            // Sync if significantly off
            if (Math.abs(videoRef.current.currentTime - clipTime) > 0.3) {
                videoRef.current.currentTime = clipTime;
            }
            
            if (isPlaying && videoRef.current.paused) {
                 videoRef.current.play().catch(() => {});
            } else if (!isPlaying && !videoRef.current.paused) {
                videoRef.current.pause();
            }
        }
    }, [currentTime, currentVisualClip, isPlaying]);

    // Sync Audio Elements
    useEffect(() => {
        if (!audioContainerRef.current) return;
        
        // Iterate over rendered audio elements and sync
        Array.from(audioContainerRef.current.children).forEach((child) => {
            const audioEl = child as HTMLAudioElement;
            const clipId = audioEl.getAttribute('data-clip-id');
            const clip = activeAudioClips.find(c => c.id === clipId);
            
            if (clip) {
                 const clipTime = (currentTime - clip.start) + clip.offset;
                 if (Math.abs(audioEl.currentTime - clipTime) > 0.3) {
                    audioEl.currentTime = clipTime;
                }
                
                if (isPlaying && audioEl.paused) audioEl.play().catch(() => {});
                else if (!isPlaying && !audioEl.paused) audioEl.pause();
            }
        });
    }, [currentTime, activeAudioClips, isPlaying]);

    // Main Playback Loop
    const animate = (time: number) => {
        if (isPlaying) {
            const delta = (time - lastTimeRef.current) / 1000;
            const safeDelta = Math.min(delta, 0.1); 
            onTimeUpdate(prev => prev + safeDelta);
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying]);

    return (
        <div ref={containerRef} className="w-full h-full bg-black flex items-center justify-center overflow-hidden relative">
            {/* Visual Output */}
            {currentVisualClip ? (
                currentVisualClip.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={currentVisualClip.src}
                        className="max-w-full max-h-full object-contain"
                        muted // Mute video preview to let audio tracks handle sound if we extract audio later, or keep muted if using separate audio files.
                        playsInline
                    />
                ) : (
                    <img 
                        src={currentVisualClip.src} 
                        alt="preview" 
                        className="max-w-full max-h-full object-contain" 
                    />
                )
            ) : (
                <div className="text-gray-600 text-xs">No Visual Signal</div>
            )}

            {/* Audio Output (Hidden) */}
            <div ref={audioContainerRef} className="hidden">
                {activeAudioClips.map(clip => (
                    <audio 
                        key={clip.id} 
                        data-clip-id={clip.id} 
                        src={clip.src} 
                        // Note: actual play/pause controlled by effect above
                    />
                ))}
            </div>
            
            {/* Time Overlay */}
            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-xs font-mono pointer-events-none z-10">
                {currentTime.toFixed(2)}s
            </div>
        </div>
    );
};
