
import React from 'react';

export interface MediaMarker {
    id: string;
    time: number;
    label: string;
    color: string;
}

export interface MediaState {
    src: string;
    type: 'video' | 'audio';
    name: string;
    currentTime?: number;
    volume?: number;
    isPlaying?: boolean;
    markers?: MediaMarker[];
}

export interface MediaControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    markers: MediaMarker[];
    onTogglePlay: () => void;
    onStop: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onClear: () => void;
    onAddMarker: () => void;
    onUpdateMarker: (id: string, updates: Partial<MediaMarker>) => void;
    onDeleteMarker: (id: string) => void;
    onDeleteAllMarkers: () => void; 
    onSaveMarkers: () => void;
    onLoadMarkers: () => void;
    onSelect?: () => void; // New Prop
    disabled?: boolean;
    t: (key: string) => string;
}

export interface AudioPlayerProps {
    src: string;
    name: string;
    mediaRef: React.RefObject<HTMLAudioElement>;
    audioData: Float32Array | null;
    analyser: AnalyserNode | null;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    markers: MediaMarker[]; 
    onSeek: (time: number) => void;
    onVolumeChange: (vol: number) => void;
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
    onClear: (e?: React.MouseEvent) => void;
    onRelink: (e?: React.MouseEvent) => void;
    onSelect?: () => void; // New Prop
    t: (key: string) => string;
}

export interface WaveformDisplayProps {
    audioData: Float32Array | null;
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    markers: MediaMarker[]; 
    onSeek: (time: number) => void;
    onSelect?: () => void; // Added for click handling
}