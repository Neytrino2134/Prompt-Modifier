import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../localization';
import { Node, NodeType, NodeContentProps } from '../types';
import { NodeContent } from './node-ui/NodeContent';
import ImageViewer from './ImageViewer';
import DialogLayer from './DialogLayer';
import { generateThumbnail } from '../utils/imageUtils';
import { readPromptFromPNG } from '../utils/pngMetadata';
import { RATIO_INDICES } from '../utils/nodeUtils';

interface DetachedNodeMiniAppProps {
    nodeId: string;
}

export const DetachedNodeMiniApp: React.FC<DetachedNodeMiniAppProps> = ({ nodeId }) => {
    const context = useAppContext();
    const { t } = useLanguage();

    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [localNode, setLocalNode] = useState<Node | null>(null);
    const [isDragOverWindow, setIsDragOverWindow] = useState(false);
    const dragCounterRef = useRef(0);
    const miniAppImageCacheRef = useRef<Record<string, Record<number, string>>>({});

    const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI);

    // Initial load: search in context.nodes or fall back to localStorage snapshot
    useEffect(() => {
        const found = context?.nodes?.find(n => n.id === nodeId);
        if (found) {
            setLocalNode(found);
            return;
        }

        try {
            const cached = localStorage.getItem(`detached_node_init_${nodeId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                setLocalNode(parsed);
            }
        } catch (e) {
            console.error('Failed to load cached node in mini app', e);
        }
    }, [context?.nodes, nodeId]);

    // Prevent default drop on window to avoid browser navigating away
    useEffect(() => {
        const handleWindowDragOver = (e: DragEvent) => {
            e.preventDefault();
        };
        const handleWindowDrop = (e: DragEvent) => {
            e.preventDefault();
        };
        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('drop', handleWindowDrop);
        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('drop', handleWindowDrop);
        };
    }, []);

    // Initial check for always on top and maximized state
    useEffect(() => {
        if (!isElectron) return;
        const api = (window as any).electronAPI;

        if (api?.isAlwaysOnTop) {
            api.isAlwaysOnTop().then((val: boolean) => setIsAlwaysOnTop(Boolean(val))).catch(() => {});
        }
        if (api?.isMaximized) {
            api.isMaximized().then((val: boolean) => setIsMaximized(Boolean(val))).catch(() => {});
        }
        if (api?.onMaximizedChange) {
            const unsub = api.onMaximizedChange((max: boolean) => setIsMaximized(max));
            return () => {
                if (typeof unsub === 'function') unsub();
            };
        }
    }, [isElectron]);

    // Broadcast channel and Electron IPC two-way sync
    useEffect(() => {
        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel('prompt_modifier_detached_nodes');
            // Request latest node data from main window if needed
            channel.postMessage({ type: 'REQUEST_NODE_DATA', nodeId });

            channel.onmessage = (event) => {
                const data = event.data;
                if (!data || data.nodeId !== nodeId) return;

                if (data.type === 'RESPONSE_NODE_DATA' && data.node) {
                    setLocalNode(data.node);
                } else if (data.type === 'NODE_VALUE_CHANGE') {
                    setLocalNode(prev => prev ? { ...prev, value: data.value } : null);
                } else if (data.type === 'NODE_PROPERTY_CHANGE' && data.properties) {
                    setLocalNode(prev => prev ? { ...prev, ...data.properties } : null);
                } else if (data.type === 'NODE_IMAGE_CACHE_UPDATE') {
                    if (!miniAppImageCacheRef.current[nodeId]) {
                        miniAppImageCacheRef.current[nodeId] = {};
                    }
                    miniAppImageCacheRef.current[nodeId][data.frameNumber] = data.dataUrl;
                    if (context?.setFullSizeImage) {
                        context.setFullSizeImage(nodeId, data.frameNumber, data.dataUrl);
                    }
                } else if (data.type === 'REATTACH_NODE') {
                    // Close this mini-app window since it's reattached
                    handleCloseWindow();
                }
            };
        } catch (e) {
            console.error('BroadcastChannel initialization error', e);
        }

        let removeSyncListener: (() => void) | undefined;
        if (isElectron) {
            const api = (window as any).electronAPI;
            if (api?.onNodeSyncAction) {
                removeSyncListener = api.onNodeSyncAction((data: any) => {
                    if (!data || data.nodeId !== nodeId) return;
                    if (data.type === 'NODE_VALUE_CHANGE') {
                        setLocalNode(prev => prev ? { ...prev, value: data.value } : null);
                    } else if (data.type === 'NODE_PROPERTY_CHANGE' && data.properties) {
                        setLocalNode(prev => prev ? { ...prev, ...data.properties } : null);
                    } else if (data.type === 'NODE_IMAGE_CACHE_UPDATE') {
                        if (!miniAppImageCacheRef.current[nodeId]) {
                            miniAppImageCacheRef.current[nodeId] = {};
                        }
                        miniAppImageCacheRef.current[nodeId][data.frameNumber] = data.dataUrl;
                        if (context?.setFullSizeImage) {
                            context.setFullSizeImage(nodeId, data.frameNumber, data.dataUrl);
                        }
                    } else if (data.type === 'REATTACH_NODE') {
                        handleCloseWindow();
                    }
                });
            }
        }

        return () => {
            if (channel) channel.close();
            if (removeSyncListener) removeSyncListener();
        };
    }, [nodeId, isElectron, context]);

    const broadcastNodeChange = useCallback((value: string) => {
        try {
            const channel = new BroadcastChannel('prompt_modifier_detached_nodes');
            channel.postMessage({ type: 'NODE_VALUE_CHANGE', nodeId, value });
            channel.close();
        } catch {}

        if (isElectron) {
            const api = (window as any).electronAPI;
            api?.syncNodeAction?.({ type: 'NODE_VALUE_CHANGE', nodeId, value });
        }
    }, [nodeId, isElectron]);

    const handleSetFullSizeImage = useCallback((id: string, frameNumber: number, dataUrl: string) => {
        if (!miniAppImageCacheRef.current[id]) {
            miniAppImageCacheRef.current[id] = {};
        }
        miniAppImageCacheRef.current[id][frameNumber] = dataUrl;

        if (context?.setFullSizeImage) {
            context.setFullSizeImage(id, frameNumber, dataUrl);
        }

        try {
            const channel = new BroadcastChannel('prompt_modifier_detached_nodes');
            channel.postMessage({ type: 'NODE_IMAGE_CACHE_UPDATE', nodeId: id, frameNumber, dataUrl });
            channel.close();
        } catch {}

        if (isElectron) {
            const api = (window as any).electronAPI;
            api?.syncNodeAction?.({ type: 'NODE_IMAGE_CACHE_UPDATE', nodeId: id, frameNumber, dataUrl });
        }
    }, [context, isElectron]);

    const handleGetFullSizeImage = useCallback((id: string, frameNumber: number) => {
        if (miniAppImageCacheRef.current[id]?.[frameNumber]) {
            return miniAppImageCacheRef.current[id][frameNumber];
        }
        if (context?.getFullSizeImage) {
            return context.getFullSizeImage(id, frameNumber);
        }
        return undefined;
    }, [context]);

    const handleClearImagesForNodeFromCache = useCallback((id: string) => {
        delete miniAppImageCacheRef.current[id];
        if (context?.clearImagesForNodeFromCache) {
            context.clearImagesForNodeFromCache(id);
        }
    }, [context]);

    const handleValueChange = useCallback((id: string, val: string) => {
        setLocalNode(prev => prev && prev.id === id ? { ...prev, value: val } : prev);
        broadcastNodeChange(val);

        if (context?.handleValueChange) {
            context.handleValueChange(id, val);
        }
    }, [broadcastNodeChange, context]);

    const handlePasteImageToNode = useCallback(async (targetNodeId: string, imageFile: File | null = null): Promise<void> => {
        const handleFile = (file: File) => {
            return new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const dataUrl = event.target?.result as string;
                    if (!dataUrl) {
                        resolve();
                        return;
                    }

                    let thumbnailUrl = dataUrl;
                    try {
                        thumbnailUrl = await generateThumbnail(dataUrl, 512, 512);
                    } catch {
                        thumbnailUrl = dataUrl;
                    }

                    let prompt = '';
                    try {
                        const extracted = await readPromptFromPNG(dataUrl);
                        if (extracted) prompt = extracted;
                    } catch {}

                    handleSetFullSizeImage(targetNodeId, 0, dataUrl);

                    setLocalNode(currentNode => {
                        if (!currentNode || currentNode.id !== targetNodeId) return currentNode;
                        let newValue = currentNode.value;
                        let newWidth = currentNode.width;

                        try {
                            const parsed = JSON.parse(currentNode.value || '{}');

                            if (currentNode.type === NodeType.IMAGE_EDITOR) {
                                const newImages = [...(parsed.inputImages || []), thumbnailUrl];
                                handleSetFullSizeImage(targetNodeId, newImages.length, dataUrl);
                                newValue = JSON.stringify({ ...parsed, inputImages: newImages, prompt: prompt || parsed.prompt || '' });
                            } else if (currentNode.type === NodeType.NOTE) {
                                const references = parsed.references || [];
                                const newRefId = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                                const nextIndex = references.length;
                                handleSetFullSizeImage(targetNodeId, nextIndex, dataUrl);
                                const newRef = {
                                    id: newRefId,
                                    image: thumbnailUrl,
                                    caption: prompt || ''
                                };
                                newValue = JSON.stringify({
                                    ...parsed,
                                    references: [...references, newRef],
                                    activeTab: 'reference'
                                });
                            } else if (currentNode.type === NodeType.TRANSLATOR) {
                                handleSetFullSizeImage(targetNodeId, 0, dataUrl);
                                newValue = JSON.stringify({
                                    ...parsed,
                                    image: thumbnailUrl
                                });
                            } else if (currentNode.type === NodeType.CHARACTER_CARD) {
                                let chars = Array.isArray(parsed) ? [...parsed] : [parsed];
                                const nextIndex = chars.length;
                                const ratio = '1:1';
                                const thumbs: Record<string, string> = { '1:1': thumbnailUrl };
                                const newChar = {
                                    id: `char-card-${Date.now()}-${nextIndex}`,
                                    name: `New Entity ${nextIndex + 1}`,
                                    index: `Entity-${nextIndex + 1}`,
                                    image: thumbnailUrl,
                                    thumbnails: thumbs,
                                    selectedRatio: ratio,
                                    prompt: prompt || '',
                                    fullDescription: '',
                                    targetLanguage: 'en',
                                    isOutput: chars.length === 0
                                };
                                chars.push(newChar);
                                const ratioIndex = RATIO_INDICES[ratio];
                                if (ratioIndex) handleSetFullSizeImage(targetNodeId, (nextIndex * 10) + ratioIndex, dataUrl);
                                handleSetFullSizeImage(targetNodeId, nextIndex * 10, dataUrl);
                                const CARD_WIDTH_STEP = 410;
                                const CARD_BASE_WIDTH = 110;
                                newWidth = (chars.length * CARD_WIDTH_STEP) + CARD_BASE_WIDTH;
                                newValue = JSON.stringify(chars);
                            } else if (currentNode.type === NodeType.IMAGE_INPUT) {
                                if (parsed.mode === 'batch') {
                                    const existingBatch = Array.isArray(parsed.batchFiles) ? parsed.batchFiles : [];
                                    const nextIdx = existingBatch.length;
                                    const newBatchItem = {
                                        id: `batch-${Date.now()}-${nextIdx}-${Math.random().toString(36).substring(2, 7)}`,
                                        name: file.name || `Pasted_Image_${nextIdx + 1}.png`,
                                        dataUrl: dataUrl,
                                        thumbnailUrl: thumbnailUrl,
                                        size: file.size || Math.round(dataUrl.length * 0.75)
                                    };
                                    const mergedBatch = [...existingBatch, newBatchItem];
                                    if (existingBatch.length === 0 || !parsed.image) {
                                        handleSetFullSizeImage(targetNodeId, 0, dataUrl);
                                        newValue = JSON.stringify({
                                            ...parsed,
                                            image: thumbnailUrl,
                                            batchFiles: mergedBatch
                                        });
                                    } else {
                                        newValue = JSON.stringify({
                                            ...parsed,
                                            batchFiles: mergedBatch
                                        });
                                    }
                                } else {
                                    handleSetFullSizeImage(targetNodeId, 0, dataUrl);
                                    newValue = JSON.stringify({
                                        ...parsed,
                                        image: thumbnailUrl,
                                        prompt: prompt || parsed.prompt || '',
                                        extractedImages: [],
                                        croppedImage: null
                                    });
                                }
                            } else {
                                handleSetFullSizeImage(targetNodeId, 0, dataUrl);
                                newValue = JSON.stringify({ ...parsed, image: thumbnailUrl, prompt: prompt || parsed.prompt || '' });
                            }
                        } catch {
                            handleSetFullSizeImage(targetNodeId, 0, dataUrl);
                            newValue = JSON.stringify({ image: thumbnailUrl, prompt: prompt || '' });
                        }

                        broadcastNodeChange(newValue);
                        if (context?.handleValueChange) {
                            context.handleValueChange(targetNodeId, newValue);
                        }

                        return { ...currentNode, value: newValue, width: newWidth };
                    });

                    if (context?.addToast) {
                        context.addToast(t('toast.pastedFromClipboard') || 'Изображение добавлено', 'success');
                    }
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        };

        if (imageFile) {
            await handleFile(imageFile);
            return;
        }

        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const file = new File([blob], "pasted_image.png", { type: blob.type });
                        await handleFile(file);
                        return;
                    }
                }
            }
            if (context?.addToast) {
                context.addToast(t('toast.pasteFailed') || 'В буфере обмена нет изображения', 'error');
            }
        } catch (err) {
            if (context?.addToast) {
                context.addToast(t('toast.pasteFailed') || 'Не удалось вставить изображение', 'error');
            }
        }
    }, [broadcastNodeChange, context, handleSetFullSizeImage, t]);

    const handleContainerDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/prompt-modifier-drag-image')) {
            setIsDragOverWindow(true);
        }
    };

    const handleContainerDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleContainerDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setIsDragOverWindow(false);
        }
    };

    const handleContainerDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragOverWindow(false);

        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            try {
                const res = await fetch(dragImageData);
                const blob = await res.blob();
                const file = new File([blob], "dragged_image.png", { type: blob.type });
                await handlePasteImageToNode(nodeId, file);
            } catch (err) {
                console.error('Failed to handle dropped image data', err);
            }
            return;
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file.type.startsWith('image/')) {
                    await handlePasteImageToNode(nodeId, file);
                    if (localNode?.type !== NodeType.IMAGE_INPUT) {
                        break;
                    }
                }
            }
        }
    };

    const handleToggleAlwaysOnTop = async () => {
        if (isElectron) {
            const api = (window as any).electronAPI;
            if (api?.toggleAlwaysOnTop) {
                try {
                    const next = await api.toggleAlwaysOnTop();
                    setIsAlwaysOnTop(Boolean(next));
                    context?.addToast(
                        next
                            ? (t('titlebar.pinnedToast') || 'Окно закреплено поверх остальных окон')
                            : (t('titlebar.unpinnedToast') || 'Окно откреплено от режима поверх всех'),
                        'info'
                    );
                    return;
                } catch (e) {
                    console.error('Failed to toggle always on top', e);
                }
            }
        }

        setIsAlwaysOnTop(prev => {
            const next = !prev;
            context?.addToast(
                next
                    ? (t('titlebar.pinnedToast') || 'Окно закреплено поверх остальных окон')
                    : (t('titlebar.unpinnedToast') || 'Окно откреплено от режима поверх всех'),
                'info'
            );
            return next;
        });
    };

    const handleReattachToCanvas = useCallback(() => {
        try {
            const channel = new BroadcastChannel('prompt_modifier_detached_nodes');
            channel.postMessage({ type: 'REATTACH_NODE', nodeId });
            channel.close();
        } catch {}

        if (isElectron) {
            const api = (window as any).electronAPI;
            api?.syncNodeAction?.({ type: 'REATTACH_NODE', nodeId });
            api?.closeNodeMiniApp?.(nodeId);
        }

        if (context?.handleReattachNodeFromMiniApp) {
            context.handleReattachNodeFromMiniApp(nodeId);
        }

        try {
            localStorage.removeItem(`detached_node_init_${nodeId}`);
        } catch {}

        handleCloseWindow();
    }, [nodeId, isElectron, context]);

    const handleCloseWindow = () => {
        if (isElectron) {
            const api = (window as any).electronAPI;
            if (api?.closeNodeMiniApp) {
                api.closeNodeMiniApp(nodeId);
                return;
            }
            if (api?.exit) {
                api.exit();
                return;
            }
        }
        window.close();
    };

    const handleMinimize = () => {
        if (isElectron) {
            const api = (window as any).electronAPI;
            api?.minimize?.();
        }
    };

    const handleMaximize = () => {
        if (isElectron) {
            const api = (window as any).electronAPI;
            api?.maximize?.();
        }
    };

    // Construct contentProps for the detached node
    const contentProps: NodeContentProps = useMemo(() => {
        return {
            node: localNode || {
                id: nodeId,
                type: NodeType.TEXT_INPUT,
                title: 'Node',
                position: { x: 0, y: 0 },
                width: 600,
                height: 600,
                value: ''
            },
            isSelected: true,
            isGlobalProcessing: Boolean(context?.isGlobalProcessing),
            onValueChange: handleValueChange,
            onRenameNode: () => {},
            onEnhance: context?.handleEnhance || (() => {}),
            isEnhancing: context?.isEnhancing === nodeId,
            onEnhanceVideo: context?.handleEnhanceVideo || (() => {}),
            isEnhancingVideo: context?.isEnhancingVideo === nodeId,
            onSanitize: context?.onSanitize || (() => {}),
            isSanitizing: context?.isSanitizing === nodeId,
            onAnalyze: context?.handleAnalyzePrompt || (() => {}),
            isAnalyzing: context?.isAnalyzing === nodeId,
            onAnalyzeCharacter: context?.handleAnalyzeCharacter || (() => {}),
            isAnalyzingCharacter: context?.isAnalyzingCharacter === nodeId,
            onAnalyzeImage: context?.handleAnalyzeImage || (() => {}),
            onImageToText: context?.onImageToText || (() => {}),
            isAnalyzingImage: typeof context?.isAnalyzingImage === 'function' ? context.isAnalyzingImage(nodeId) : false,
            onGenerateImage: context?.handleGenerateImage || (() => {}),
            isGeneratingImage: typeof context?.isGeneratingImage === 'function' ? context.isGeneratingImage(nodeId) : false,
            onExecuteChain: context?.handleExecuteChain || (() => {}),
            isExecutingChain: Boolean(context?.isExecutingChain),
            onStopChainExecution: context?.stopChainExecution || (() => {}),
            onEditImage: context?.handleEditImage || (() => {}),
            isEditingImage: typeof context?.isEditingImage === 'function' ? context.isEditingImage(nodeId) : false,
            onCopyNodeValue: () => {},
            onDuplicateNodeWithContent: () => {},
            onPasteImage: handlePasteImageToNode,
            onDownloadImage: () => {},
            onAspectRatioChange: () => {},
            onModelChange: () => {},
            onQualityChange: () => {},
            onOutputFormatChange: () => {},
            onSizeChange: () => {},
            onAutoDownloadChange: () => {},
            onCustomPromptChange: () => {},
            onSendMessage: context?.handleSendMessage || (() => {}),
            isChatting: context?.isChatting === nodeId,
            onTranslate: context?.handleTranslate || (() => {}),
            isTranslating: context?.isTranslating === nodeId,
            onRefreshImageEditor: () => {},
            onRefreshChat: () => {},
            onSetImageEditorOutputToInput: () => {},
            onSetPoseOutputToImage: () => {},
            onProcessImage: context?.handleProcessImage || (() => {}),
            isProcessingImage: typeof context?.isProcessingImage === 'function' ? context.isProcessingImage(nodeId) : false,
            libraryItems: context?.libraryItems || [],
            t,
            deselectAllNodes: () => {},
            onSelectNode: () => {},
            onProcessChainForward: context?.handleProcessChainForward || (() => {}),
            onGenerateScript: context?.handleGenerateScript || (() => {}),
            isGeneratingScript: context?.isGeneratingScript === nodeId,
            onLoadScriptFile: () => {},
            onSaveScriptToDisk: context?.onSaveScriptToDisk || (() => {}),
            onSaveMediaToDisk: context?.onSaveMediaToDisk || (() => {}),
            onGenerateCharacters: context?.handleGenerateCharacters || (() => {}),
            isGeneratingCharacters: context?.isGeneratingCharacters === nodeId,
            onGenerateVideo: context?.handleGenerateVideo || (() => {}),
            onStopVideo: context?.handleStopVideo || (() => {}),
            isGeneratingVideo: typeof context?.isGeneratingVideo === 'function' ? context.isGeneratingVideo(nodeId) : false,
            onDurationChange: () => {},
            onUseBatchChange: () => {},
            onVideoModeChange: () => {},
            onResolutionChange: () => {},
            onLoadImageSequenceFile: () => {},
            onLoadPromptSequenceFile: () => {},
            onGenerateImageSequence: context?.handleGenerateImageSequence || (() => {}),
            onGenerateSelectedFrames: context?.onGenerateSelectedFrames || (() => {}),
            onStopImageSequence: context?.handleStopImageSequence || (() => {}),
            isGeneratingSequence: context?.isGeneratingSequence === nodeId,
            onRegenerateFrame: context?.handleRegenerateFrame || (() => {}),
            onDownloadImageFromUrl: context?.onDownloadImageFromUrl || (() => {}),
            onCopyImageToClipboard: context?.onCopyImageToClipboard || (() => Promise.resolve()),
            onSaveCharacterCard: context?.handleSaveCharacterCard || (() => {}),
            onLoadCharacterCard: () => {},
            onOutputHandleMouseDown: () => {},
            onOutputHandleTouchStart: () => {},
            getHandleColor: () => 'bg-gray-400',
            handleCursor: 'default',
            onDetachAndPasteConcept: context?.handleDetachAndPasteConcept || (() => {}),
            onDetachImageToNode: context?.onDetachImageToNode || (() => {}),
            onSaveCharacterToCatalog: context?.onSaveCharacterToCatalog || (() => {}),
            onSaveGeneratedCharacterToCatalog: () => {},
            onSaveScriptToCatalog: context?.onSaveScriptToCatalog || (() => {}),
            onSaveSequenceToCatalog: context?.onSaveSequenceToCatalog || (() => {}),
            setError: context?.setError || (() => {}),
            setImageViewer: context?.setImageViewer || (() => {}),
            addToast: context?.addToast || (() => {}),
            getFullSizeImage: handleGetFullSizeImage,
            setFullSizeImage: handleSetFullSizeImage,
            clearImagesForNodeFromCache: handleClearImagesForNodeFromCache,
            onUpdateCharacterDescription: context?.onUpdateCharacterDescription || (() => {}),
            isUpdatingDescription: typeof context?.isUpdatingDescription === 'string' ? context.isUpdatingDescription : null,
            onModifyCharacter: () => {},
            isModifyingCharacter: null,
            onTranslateScript: context?.onTranslateScript || (() => {}),
            isTranslatingScript: typeof context?.isTranslatingScript === 'string' ? context.isTranslatingScript : null,
            onReadData: context?.onReadData || (() => {}),
            getUpstreamNodeValues: context?.getUpstreamNodeValues || (() => []),
            onRefreshUpstreamData: context?.onRefreshUpstreamData || (() => {}),
            onModifyPromptSequence: context?.onModifyPromptSequence || (() => {}),
            isModifyingPromptSequence: context?.isModifyingPromptSequence === nodeId,
            onDetachNodeFromGroup: () => {},
            isStoppingSequence: Boolean(context?.isStoppingSequence),
            onSavePromptToLibrary: context?.onSavePromptToLibrary || (() => {}),
            onSaveToLibrary: context?.onSaveToLibrary || (() => {}),
            isStopping: Boolean(context?.isStopping),
            onStopGeneration: context?.onStopGeneration || (() => {}),
            clearSelectionsSignal: 0,
            onGenerateCharacterImage: context?.onGenerateCharacterImage || (() => {}),
            isGeneratingCharacterImage: typeof context?.isGeneratingCharacterImage === 'string' ? context.isGeneratingCharacterImage : null,
            onDetachCharacter: context?.onDetachCharacter || (() => {})
        };
    }, [localNode, nodeId, handleValueChange, handlePasteImageToNode, handleGetFullSizeImage, handleSetFullSizeImage, handleClearImagesForNodeFromCache, context, t]);

    if (!localNode) {
        return (
            <div className="w-screen h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-300 font-sans">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm">{t('node.miniAppLoading') || 'Загрузка мини-приложения...'}</p>
            </div>
        );
    }

    return (
        <div
            className={`w-screen h-screen flex flex-col bg-gray-950 text-gray-200 overflow-hidden font-sans select-none border transition-colors ${
                isDragOverWindow ? 'border-cyan-400 ring-4 ring-cyan-500/20' : 'border-gray-800'
            }`}
            onDragEnter={handleContainerDragEnter}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            onDrop={handleContainerDrop}
        >
            {/* Custom Frameless Titlebar / Header */}
            <header className="w-full flex items-center justify-between px-3 h-10 bg-gray-900 border-b border-gray-800/90 app-region-drag select-none z-50 flex-shrink-0">
                {/* Left: Window identity & Node title */}
                <div className="flex items-center gap-2.5 min-w-0 app-region-drag">
                    <div className="flex items-center gap-1.5 app-region-drag">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 hidden sm:inline">
                            {t('node.miniAppBadge') || 'Mini App'}
                        </span>
                    </div>

                    <div className="w-px h-3.5 bg-gray-700/60 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-gray-100 truncate max-w-[240px] sm:max-w-[340px]">
                            {localNode.title || t(`node.title.${localNode.type.toLowerCase()}`) || localNode.type}
                        </span>
                    </div>
                </div>

                {/* Right: Actions & Window Controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0 app-region-no-drag">
                    {/* Reattach to Canvas Button */}
                    <button
                        onClick={handleReattachToCanvas}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/80 border border-cyan-700/60 hover:border-cyan-400 rounded transition-all shadow-sm"
                        title={t('node.action.reattachToCanvas') || 'Вернуть ноду обратно на холст'}
                    >
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="hidden sm:inline">{t('node.action.reattachShort') || 'Вернуть на холст'}</span>
                    </button>

                    <div className="w-px h-3.5 bg-gray-700/60 mx-1"></div>

                    {/* PIN - Always On Top Button */}
                    <button
                        onClick={handleToggleAlwaysOnTop}
                        className={`h-7 w-8 flex items-center justify-center rounded transition-all focus:outline-none ${
                            isAlwaysOnTop
                                ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/70 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                        title={
                            isAlwaysOnTop
                                ? (t('titlebar.unpinAlwaysOnTop') || 'Открепить поверх окон')
                                : (t('titlebar.pinAlwaysOnTop') || 'PIN - закрепить поверх остальных окон')
                        }
                        aria-label={isAlwaysOnTop ? t('titlebar.unpinAlwaysOnTop') : t('titlebar.pinAlwaysOnTop')}
                    >
                        <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isAlwaysOnTop ? 'rotate-[-45deg] scale-110 text-cyan-400' : ''}`}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                    </button>

                    {/* Minimize Button */}
                    <button
                        onClick={handleMinimize}
                        className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-sm focus:outline-none"
                        title={t('titlebar.minimize')}
                        aria-label={t('titlebar.minimize')}
                    >
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                            <rect y="5.5" width="12" height="1.2" rx="0.6" />
                        </svg>
                    </button>

                    {/* Maximize / Restore Button */}
                    <button
                        onClick={handleMaximize}
                        className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-sm focus:outline-none"
                        title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
                        aria-label={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
                    >
                        {isMaximized ? (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <rect x="2.5" y="0.5" width="8.5" height="8.5" rx="0.5" />
                                <path d="M0.5 3.5v7.5a0.5 0.5 0 0 0 0.5 0.5h7.5" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <rect x="1" y="1" width="10" height="10" rx="0.5" />
                            </svg>
                        )}
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={handleCloseWindow}
                        className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition-colors rounded-sm focus:outline-none"
                        title={t('titlebar.close')}
                        aria-label={t('titlebar.close')}
                    >
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Main Interactive Node Body Container */}
            <main className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-4 flex flex-col bg-gray-900/60 custom-scrollbar relative">
                {isDragOverWindow && (
                    <div className="absolute inset-0 z-50 bg-cyan-950/40 backdrop-blur-[2px] flex items-center justify-center border-2 border-dashed border-cyan-400 rounded-xl m-4 pointer-events-none">
                        <div className="flex flex-col items-center p-6 bg-gray-900/90 rounded-2xl border border-cyan-500/50 shadow-2xl">
                            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 mb-3 animate-bounce">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-cyan-200">
                                {t('node.dropImageHere') || 'Перетащите изображение сюда'}
                            </span>
                        </div>
                    </div>
                )}
                <div className="w-full h-full flex flex-col rounded-xl border border-gray-700/80 bg-gray-800 shadow-2xl p-4 overflow-y-auto">
                    <NodeContent node={localNode} contentProps={contentProps} />
                </div>
            </main>

            {/* Global Overlays: ImageViewer, DialogLayer, Toasts */}
            {context?.imageViewer && (
                <ImageViewer
                    sources={context.imageViewer.sources}
                    initialIndex={context.imageViewer.initialIndex}
                    initialPosition={{ x: (window.innerWidth / 2) - 400, y: (window.innerHeight / 2) - 300 }}
                    onClose={() => context.setImageViewer?.(null)}
                    onDownloadImageFromUrl={context.onDownloadImageFromUrl || (() => {})}
                    onCopyImageToClipboard={context.onCopyImageToClipboard || (() => Promise.resolve())}
                    addToast={context.addToast || (() => {})}
                />
            )}
            <DialogLayer />

            {/* Toast Notifications */}
            {context?.toasts && context.toasts.length > 0 && (
                <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center space-y-2 pointer-events-none">
                    {context.toasts.map(toast => (
                        <div
                            key={toast.id}
                            className={`font-bold px-5 py-2.5 rounded-lg shadow-xl text-xs flex items-center justify-center text-center border pointer-events-auto ${
                                toast.type === 'success'
                                    ? 'bg-accent text-white border-accent-hover'
                                    : toast.type === 'error'
                                    ? 'bg-red-600 text-white border-red-500'
                                    : 'bg-accent-secondary text-white border-accent-secondary-hover'
                            }`}
                        >
                            <span>{toast.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
