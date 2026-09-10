
import { useState, useCallback } from 'react';
import { generateVideo } from '../../services/geminiService';
import { getConfiguredVideoModel } from '../../services/modelConfig';
import { GeminiGenerationCommonProps } from './types';

interface UseVideoNodeProps extends GeminiGenerationCommonProps {
    showApiKeyDialog?: (callbacks: { onSelect: () => void; onClose: () => void }) => void;
}

const triggerDownloadVideo = (url: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `Video_000_${date}_${time}.mp4`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const raceWithAbort = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
            }
            const onAbort = () => {
                signal.removeEventListener('abort', onAbort);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', onAbort);
        })
    ]);
};

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
    showApiKeyDialog,
    addToHistory,
    addToast,
    taskQueue,
    batchManager
}: UseVideoNodeProps) => {
    const [generatingNodeIds, setGeneratingNodeIds] = useState<Set<string>>(new Set());

    const isGeneratingVideo = useCallback((nodeId?: string) => {
        if (nodeId && taskQueue) {
            return taskQueue.isTaskRunningForNode(nodeId);
        }
        if (nodeId) {
            return generatingNodeIds.has(nodeId);
        }
        return generatingNodeIds.size > 0;
    }, [taskQueue, generatingNodeIds]);

    const handleStopVideo = useCallback((nodeId?: string) => {
        if (nodeId && taskQueue) {
            taskQueue.cancelAllNodeTasks(nodeId);
        }
        if (nodeId) {
            setGeneratingNodeIds(prev => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
            unregisterOperation(nodeId);
        }
    }, [taskQueue, unregisterOperation]);

    const handleGenerateVideo = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const selectedModel = node.model || getConfiguredVideoModel() || 'gemini-omni-1.1-flash';

        // Extract upstream inputs: text prompts, images, videos
        const upstreamValues = getUpstreamNodeValues(nodeId);
        const texts: string[] = [];
        const images: Array<{ data: string; mimeType: string }> = [];
        let videoSource: { data?: string; uri?: string; mimeType: string } | undefined = undefined;

        for (const val of upstreamValues) {
            if (typeof val === 'string') {
                if (val.startsWith('data:image/') || (val.startsWith('http') && (val.includes('.png') || val.includes('.jpg') || val.includes('.jpeg') || val.includes('.webp')))) {
                    const mimeType = val.startsWith('data:image/jpeg') ? 'image/jpeg' : (val.startsWith('data:image/webp') ? 'image/webp' : 'image/png');
                    images.push({ data: val, mimeType });
                } else if (val.startsWith('data:video/') || (val.startsWith('http') && (val.includes('.mp4') || val.includes('.webm')))) {
                    videoSource = { data: val, mimeType: 'video/mp4' };
                } else if (val.startsWith('{') || val.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (parsed.image) {
                            images.push({ data: parsed.image, mimeType: 'image/png' });
                        }
                        if (parsed.prompt) {
                            texts.push(parsed.prompt);
                        }
                    } catch {
                        texts.push(val);
                    }
                } else {
                    texts.push(val);
                }
            }
        }

        const prompt = texts.length > 0 ? texts.join(', ') : (node.customPrompt || '');

        if (!prompt && images.length === 0 && !videoSource) {
            setError("Prompt or visual input is empty. Connect a text node or enter a prompt.");
            if (addToast) addToast("Prompt required for video generation", 'error');
            return;
        }

        setError(null);

        // Check if user has API Key
        if (!process.env.API_KEY && !localStorage.getItem('settings_userApiKey')) {
            if (showApiKeyDialog) {
                showApiKeyDialog({
                    onSelect: () => { /* Implicit refresh via localStorage */ },
                    onClose: () => {
                        setGeneratingNodeIds(prev => {
                            const next = new Set(prev);
                            next.delete(nodeId);
                            return next;
                        });
                        unregisterOperation(nodeId);
                    }
                });
                return;
            }
        }

        // Batch API Mode Interception
        if (node.useBatch || batchManager?.isBatchMode) {
            if (batchManager) {
                try {
                    await batchManager.createBatchGeneration({
                        nodeId,
                        nodeTitle: node.title || 'Video Output',
                        tabId: currentTabId,
                        tabName: activeTabName,
                        model: selectedModel,
                        isSequence: false,
                        items: [{
                            id: `video-${nodeId}-${Date.now()}`,
                            frameIndex: 0,
                            prompt: prompt || 'Video generation',
                            aspectRatio: (node.aspectRatio as any) || '16:9',
                            resolution: node.resolution as any,
                            autoDownload: !!node.autoDownload
                        }]
                    });
                    if (addToast) addToast('Batch video job queued', 'info');
                    return;
                } catch (err: any) {
                    console.error("Batch creation failed for video:", err);
                    const errMsg = err?.message || 'Failed to submit Batch API video job';
                    setError(errMsg);
                    if (addToast) addToast(errMsg, 'error');
                    return;
                }
            }
        }

        const executeGen = async (signal: AbortSignal) => {
            registerOperation({ id: nodeId, type: 'video', description: t('node.content.generating'), tabId: currentTabId, tabName: activeTabName });
            return await raceWithAbort(
                generateVideo(prompt || 'Cinematic shot', {
                    model: selectedModel,
                    aspectRatio: (node.aspectRatio as any) || '16:9',
                    resolution: (node.resolution as any) || '720p',
                    duration: (node.duration as any) || '5s',
                    videoMode: node.videoMode || (images.length > 0 ? 'image_to_video' : 'text_to_video'),
                    images,
                    videoSource
                }),
                signal
            );
        };

        const onSuccess = async (videoUrl: string) => {
            updateNodeInStorage(currentTabId, nodeId, () => videoUrl);
            if (addToHistory) {
                addToHistory(videoUrl, prompt, selectedModel, {
                    aspectRatio: node.aspectRatio || '16:9',
                    resolution: node.resolution || '720p'
                });
            }
            if (node.autoDownload) {
                triggerDownloadVideo(videoUrl, prompt);
            }
            if (addToast) {
                addToast('Video generated successfully', 'success');
            }
        };

        const onError = (err: any) => {
            unregisterOperation(nodeId);
            if (err?.name !== 'AbortError' && err?.message !== 'Aborted') {
                const msg = err?.message || 'Video generation failed';
                setError(msg);
                if (addToast) addToast(msg, 'error');
            }
        };

        if (taskQueue) {
            taskQueue.enqueueTask({
                nodeId,
                nodeTitle: node.title || 'Video Output',
                type: 'video_gen',
                prompt: prompt || 'Video generation',
                tabId: currentTabId,
                tabName: activeTabName,
                execute: executeGen,
                onSuccess,
                onError
            });
        } else {
            setGeneratingNodeIds(prev => new Set(prev).add(nodeId));
            const abortController = new AbortController();
            try {
                const videoUrl = await executeGen(abortController.signal);
                await onSuccess(videoUrl);
            } catch (e: any) {
                onError(e);
            } finally {
                setGeneratingNodeIds(prev => {
                    const next = new Set(prev);
                    next.delete(nodeId);
                    return next;
                });
                unregisterOperation(nodeId);
            }
        }
    }, [
        nodes, getUpstreamNodeValues, setError, showApiKeyDialog, t, updateNodeInStorage,
        registerOperation, unregisterOperation, activeTabName, activeTabIdRef,
        taskQueue, batchManager, addToHistory, addToast
    ]);

    return {
        isGeneratingVideo,
        handleGenerateVideo,
        handleStopVideo
    };
};
