
import { useState, useEffect, useRef, useCallback } from 'react';
import { MediaState, MediaMarker } from './types';
import { useAppContext } from '../../../contexts/AppContext';

export const useMediaState = (
    nodeId: string, 
    initialValue: string, 
    onValueChange: (id: string, val: string) => void
) => {
    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
    const context = useAppContext();
    const setGlobalMedia = context?.setGlobalMedia;
    const globalMedia = context?.globalMedia;
    
    // Helper to parse state securely
    const parseState = (json: string): MediaState => {
        try {
            const parsed = JSON.parse(json || '{}');
            return {
                src: parsed.src || '',
                type: parsed.type || 'video',
                name: parsed.name || '',
                currentTime: parsed.currentTime || 0,
                volume: parsed.volume !== undefined ? parsed.volume : 0.4, // Default volume 40%
                isPlaying: parsed.isPlaying || false,
                markers: parsed.markers || []
            };
        } catch {
            return { src: '', type: 'video', name: '', markers: [], volume: 0.4 };
        }
    };

    // Initialize state from props once
    const [state, setState] = useState<MediaState>(() => parseState(initialValue));
    
    // Ref to track latest state for unmount cleanup without triggering re-runs
    const stateRef = useRef(state);
    useEffect(() => { stateRef.current = state; }, [state]);

    // Destructure for easier usage
    const { isPlaying, currentTime, volume, markers, src, type, name } = state as Required<MediaState>;
    
    const [duration, setDuration] = useState(0);
    const isInteractingRef = useRef(false);

    // --- Persistence Logic ---

    // Helper to save current state to node
    const persistState = useCallback((updates: Partial<MediaState>) => {
        setState(prev => {
            let liveData = {};
            if (mediaRef.current) {
                liveData = {
                    currentTime: mediaRef.current.currentTime,
                    volume: mediaRef.current.volume,
                    isPlaying: updates.isPlaying !== undefined ? updates.isPlaying : !mediaRef.current.paused
                };
            }
            
            const next = { ...prev, ...liveData, ...updates };
            
            // Fire update to parent (node storage)
            onValueChange(nodeId, JSON.stringify(next));

            // Sync to Global Player state if playing or interacting
            // CRITICAL FIX: We must clear the 'command' here. If we are updating the state, 
            // it means we have processed whatever command initiated this change.
            if (setGlobalMedia && (next.isPlaying || prev.isPlaying)) {
                setGlobalMedia(prevGlobal => ({
                    nodeId: nodeId,
                    name: next.name || 'Media',
                    isPlaying: !!next.isPlaying,
                    currentTime: next.currentTime || 0,
                    duration: mediaRef.current?.duration || 0,
                    volume: next.volume || 0.4,
                    type: next.type || 'video',
                    command: undefined, // Clear command to prevent loops
                    commandTimestamp: undefined
                }));
            }

            return next;
        });
    }, [nodeId, onValueChange, setGlobalMedia]);

    // --- Global Command Listener ---
    useEffect(() => {
        // Only respond if this node is the active global media
        if (globalMedia && globalMedia.nodeId === nodeId && globalMedia.command && mediaRef.current) {
            
            if (globalMedia.command === 'play') {
                if (mediaRef.current.paused) {
                    mediaRef.current.play().catch(e => console.error(e));
                    setState(prev => ({ ...prev, isPlaying: true }));
                    // We don't call persistState here immediately to avoid render loops, 
                    // the 'play' event listener or next timeUpdate will sync state.
                }
            } else if (globalMedia.command === 'pause') {
                if (!mediaRef.current.paused) {
                    mediaRef.current.pause();
                    setState(prev => ({ ...prev, isPlaying: false }));
                    persistState({ isPlaying: false }); // Force sync state on pause
                }
            } else if (globalMedia.command === 'seek' && globalMedia.seekTarget !== undefined) {
                 mediaRef.current.currentTime = globalMedia.seekTarget;
                 setCurrentTimeInternal(globalMedia.seekTarget);
            }
        }
    }, [globalMedia, nodeId, persistState]);

    // --- Restoration Logic ---

    // Sync from external props (initialValue) to handle race conditions 
    useEffect(() => {
        const incoming = parseState(initialValue);
        
        // 1. Sync Time: Only if incoming > 0 and significantly different, and we are NOT scrubbing
        if (incoming.currentTime > 0.1 && Math.abs(incoming.currentTime - currentTime) > 0.5 && !isInteractingRef.current) {
             setCurrentTimeInternal(incoming.currentTime);
             if (mediaRef.current && Math.abs(mediaRef.current.currentTime - incoming.currentTime) > 0.5) {
                 mediaRef.current.currentTime = incoming.currentTime;
             }
        }

        // 2. Sync Markers
        if (JSON.stringify(incoming.markers) !== JSON.stringify(markers)) {
             setState(prev => ({ ...prev, markers: incoming.markers || [] }));
        }
        
        // 3. Sync Volume
        if (incoming.volume !== undefined && Math.abs(incoming.volume - (volume || 0.4)) > 0.01) {
             setVolumeInternal(incoming.volume);
             if (mediaRef.current) mediaRef.current.volume = incoming.volume;
        }

        // 4. Sync Playing
        if (incoming.isPlaying !== isPlaying) {
             if (incoming.isPlaying) play();
             else pause();
        }
        
        // 5. Sync Src/Name
        if (incoming.src !== src) {
            setState(prev => ({ ...prev, src: incoming.src, name: incoming.name, type: incoming.type }));
        }

    }, [initialValue]); 

    // --- Media Control Wrappers ---

    const setCurrentTimeInternal = (t: number) => setState(prev => ({ ...prev, currentTime: t }));
    const setVolumeInternal = (v: number) => setState(prev => ({ ...prev, volume: v }));

    const play = useCallback(async () => {
        if (mediaRef.current) {
            try {
                await mediaRef.current.play();
                persistState({ isPlaying: true });
            } catch (e) {
                console.error(e);
                persistState({ isPlaying: false });
            }
        }
    }, [persistState]);

    const pause = useCallback(() => {
        if (mediaRef.current) {
            mediaRef.current.pause();
            persistState({ isPlaying: false });
        }
    }, [persistState]);

    const togglePlay = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, play, pause]);

    const stop = useCallback(() => {
        if (mediaRef.current) {
            mediaRef.current.pause();
            mediaRef.current.currentTime = 0;
            setCurrentTimeInternal(0);
            persistState({ isPlaying: false, currentTime: 0 });
        }
    }, [persistState]);

    const seek = useCallback((time: number) => {
        isInteractingRef.current = true;
        if (mediaRef.current) {
            mediaRef.current.currentTime = time;
            setCurrentTimeInternal(time);
        }
        // Debounce the interaction flag release
        setTimeout(() => { isInteractingRef.current = false; }, 500);
    }, []);

    const changeVolume = useCallback((vol: number) => {
        if (mediaRef.current) mediaRef.current.volume = vol;
        setVolumeInternal(vol);
        persistState({ volume: vol }); 
    }, [persistState]);

    // --- Marker Logic ---

    const addMarker = useCallback(() => {
        const newMarker: MediaMarker = {
            id: `marker-${Date.now()}`,
            time: currentTime || 0,
            label: `Marker ${(markers || []).length + 1}`,
            color: '#3b82f6'
        };
        const newMarkers = [...(markers || []), newMarker].sort((a, b) => a.time - b.time);
        persistState({ markers: newMarkers });
    }, [currentTime, markers, persistState]);

    const updateMarker = useCallback((id: string, updates: Partial<MediaMarker>) => {
        const newMarkers = (markers || []).map(m => m.id === id ? { ...m, ...updates } : m);
        persistState({ markers: newMarkers });
    }, [markers, persistState]);

    const deleteMarker = useCallback((id: string) => {
        const newMarkers = (markers || []).filter(m => m.id !== id);
        persistState({ markers: newMarkers });
    }, [markers, persistState]);

    const deleteAllMarkers = useCallback(() => {
        persistState({ markers: [] });
    }, [persistState]);

    // --- Event Handlers ---

    const handleTimeUpdate = useCallback(() => {
        if (mediaRef.current && !isInteractingRef.current) {
            const now = mediaRef.current.currentTime;
            setCurrentTimeInternal(now);
            
            // Sync to Global Player if active
            if (globalMedia?.nodeId === nodeId && setGlobalMedia) {
                 setGlobalMedia(prev => {
                     if (!prev) return null;
                     // Only update time, ensure we don't accidentally re-trigger a stale command
                     return { ...prev, currentTime: now, command: undefined, commandTimestamp: undefined };
                 });
            }
        }
    }, [globalMedia?.nodeId, nodeId, setGlobalMedia]);

    const handleLoadedMetadata = useCallback(() => {
        if (mediaRef.current) {
            setDuration(mediaRef.current.duration);
            const s = stateRef.current;
            mediaRef.current.volume = s.volume !== undefined ? s.volume : 0.4;
            if (s.currentTime > 0 && Math.abs(mediaRef.current.currentTime - s.currentTime) > 0.5) {
                mediaRef.current.currentTime = s.currentTime;
            }
        }
    }, []);

    const handleEnded = useCallback(() => {
        persistState({ isPlaying: false, currentTime: 0 });
        if (mediaRef.current) mediaRef.current.currentTime = 0;
        setCurrentTimeInternal(0);
    }, [persistState]);
    
    useEffect(() => {
        return () => {
            const currentMedia = mediaRef.current;
            const currentState = stateRef.current;
            if (currentMedia && currentState.src) {
                 const finalData = {
                     ...currentState,
                     volume: currentMedia.volume,
                     currentTime: currentMedia.currentTime,
                     isPlaying: !currentMedia.paused && !currentMedia.ended
                 };
                 if (finalData.src) {
                     onValueChange(nodeId, JSON.stringify(finalData));
                 }
            }
        };
    }, []);

    return {
        mediaRef,
        isPlaying: !!isPlaying,
        currentTime: currentTime || 0,
        duration,
        volume: volume !== undefined ? volume : 0.4,
        markers: markers || [],
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
    };
};
