
import { useState, useCallback } from 'react';
import { generateVideo } from '../../services/geminiService';
import { GeminiGenerationCommonProps } from './types';

interface UseVideoNodeProps extends GeminiGenerationCommonProps {
    showApiKeyDialog: (callbacks: { onSelect: () => void; onClose: () => void }) => void;
}

export const useVideoNode = ({
    nodes,
    getUpstreamNodeValues,
    setError,
    t,
    registerOperation,
    unregisterOperation,
    updateNodeInStorage,
    activeTabId,
    activeTabName,
    activeTabIdRef,
    showApiKeyDialog
}: UseVideoNodeProps) => {
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null);

    const handleGenerateVideo = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        setIsGeneratingVideo(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'video', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const prompt = texts.join(', ');
            
            if (!prompt) throw new Error("Video generation requires a text prompt.");

            // Check if user has API Key
            if (!process.env.API_KEY && localStorage.getItem('settings_useDevKey') !== 'true' && !localStorage.getItem('settings_userApiKey')) {
                 showApiKeyDialog({
                     onSelect: () => { /* Logic to refresh key is implicit via localStorage */ },
                     onClose: () => { setIsGeneratingVideo(null); unregisterOperation(nodeId); }
                 });
                 return; // Stop here, wait for key
            }

            const videoUrl = await generateVideo(prompt, node.aspectRatio as any, node.resolution as any);
            updateNodeInStorage(currentTabId, nodeId, () => videoUrl); 
            
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGeneratingVideo(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, setError, showApiKeyDialog, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef]);

    return {
        isGeneratingVideo,
        handleGenerateVideo
    };
};
