
import React from 'react';

interface VideoPlayerProps {
    src: string;
    mediaRef: React.RefObject<HTMLVideoElement>;
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
    onTogglePlay: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
    src, mediaRef, onTimeUpdate, onLoadedMetadata, onEnded, onTogglePlay 
}) => {
    return (
        <video 
            ref={mediaRef}
            src={src} 
            className="w-full h-full object-contain mx-auto"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onEnded}
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
        />
    );
};
