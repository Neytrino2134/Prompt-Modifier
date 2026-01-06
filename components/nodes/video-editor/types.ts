

export interface MediaFile {
    id: string;
    type: 'video' | 'image' | 'audio' | 'text' | 'folder';
    src: string; // Empty for folders
    name: string;
    parentId: string | null;
    thumbnail?: string; // Small base64 preview
    isLinked?: boolean; // Indicates if this file comes from an upstream node
}

export interface VideoClip {
    id: string;
    type: 'video' | 'image' | 'audio';
    src: string;
    start: number; // Start time on timeline (seconds)
    duration: number; // Duration of clip on timeline (seconds)
    offset: number; // Start offset within source media (seconds) (for video trimming)
    layer: number; // Track index (0 is bottom)
    name: string;
    thumbnail?: string;
}

export interface VideoTrack {
    id: number;
    name: string;
    type: 'video' | 'audio';
    isMuted: boolean;
    isVisible: boolean;
}

export interface VideoEditorState {
    currentTime: number;
    totalDuration: number;
    clips: VideoClip[];
    tracks: VideoTrack[];
    mediaFiles: MediaFile[]; // Project Bin
    isPlaying: boolean;
    zoom: number; // Pixels per second
    selectedClipId: string | null;
    scrollLeft: number;
    
    // Explorer UI State
    mediaPanelWidth: number;
    currentFolderId: string | null;
    viewMode: 'grid' | 'list';
}