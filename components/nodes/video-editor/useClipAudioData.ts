
import { useState, useEffect, useRef } from 'react';
import { VideoClip } from './types';

export const useClipAudioData = (clips: VideoClip[]) => {
    const [audioDataMap, setAudioDataMap] = useState<Record<string, Float32Array>>({});
    const processingRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const loadAudioData = async () => {
            const newAudioData: Record<string, Float32Array> = {};
            let hasNewData = false;

            const audioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioCtx = new audioContextClass();

            for (const clip of clips) {
                // Only process audio or video clips, skip if already processed or processing
                if ((clip.type !== 'audio' && clip.type !== 'video') || audioDataMap[clip.id] || processingRef.current.has(clip.id)) {
                    continue;
                }

                processingRef.current.add(clip.id);

                try {
                    const response = await fetch(clip.src);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    
                    // Downsample for visualization to save memory
                    // We only need channel 0
                    const rawData = audioBuffer.getChannelData(0);
                    
                    // Simple downsampling (take 1 sample every N) to allow drawing large files
                    // However, keeping raw Float32Array is usually fine for < 10min clips in modern browsers
                    newAudioData[clip.id] = rawData;
                    hasNewData = true;
                } catch (e) {
                    console.error(`Failed to decode audio for clip ${clip.id}`, e);
                }
            }
            
            if (hasNewData) {
                setAudioDataMap(prev => ({ ...prev, ...newAudioData }));
            }
            
            if (audioCtx.state !== 'closed') {
                audioCtx.close();
            }
        };

        if (clips.length > 0) {
            loadAudioData();
        }
    }, [clips, audioDataMap]);

    return audioDataMap;
};
