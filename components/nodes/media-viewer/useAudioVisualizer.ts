
import { useRef, useEffect } from 'react';

export const useAudioVisualizer = (
    src: string, 
    type: 'audio' | 'video', 
    mediaElement: HTMLMediaElement | null
) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioDataRef = useRef<Float32Array | null>(null);

    // 1. Initialize Audio Context for Real-time Analysis (dB Meter)
    useEffect(() => {
        if (type !== 'audio' || !src || !mediaElement) return;

        const initAudioContext = () => {
            if (!audioContextRef.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx();
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                
                try {
                     const source = ctx.createMediaElementSource(mediaElement);
                     source.connect(analyser);
                     analyser.connect(ctx.destination);
                     
                     audioContextRef.current = ctx;
                     analyserRef.current = analyser;
                } catch (e) {
                    // console.warn("Source already attached");
                }
            } else if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };

        // Attempt init. 
        // Note: Browsers usually require a user gesture (click) before AudioContext runs fully.
        // We initialize structure here, but might need to call resume() on Play click.
        initAudioContext();

        return () => {
            // We generally don't close the context immediately on unmount if we want to persist connections,
            // but for a node system, cleaning up is safer to prevent leaks.
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
                analyserRef.current = null;
            }
        };
    }, [src, type, mediaElement]);

    // 2. Fetch and Decode full audio for Waveform
    useEffect(() => {
        if (type !== 'audio' || !src) {
            audioDataRef.current = null;
            return;
        }
        
        const loadAndDecode = async () => {
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const offlineCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
                
                audioDataRef.current = audioBuffer.getChannelData(0);
            } catch (e) {
                console.warn("Failed to generate waveform data", e);
            }
        };

        loadAndDecode();
    }, [src, type]);

    return {
        audioContextRef,
        analyserRef,
        audioDataRef
    };
};
