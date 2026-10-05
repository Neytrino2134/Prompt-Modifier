import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Connection, ToastType } from '../../../../types';
import { BatchPrepareNodeState, DEFAULT_STATE } from '../types';

interface UseBatchPrepareStateAndInputsOptions {
    nodeId: string;
    nodeValue: string;
    onValueChange: (nodeId: string, value: string) => void;
    addToast: (message: string, type?: ToastType) => void;
    getUpstreamNodeValues?: (nodeId: string, handleId?: string, currentNodes?: any[], optimizedForUI?: boolean) => any[];
    connections?: Connection[];
    setConnections?: React.Dispatch<React.SetStateAction<Connection[]>>;
}

export const useBatchPrepareStateAndInputs = ({
    nodeId,
    nodeValue,
    onValueChange,
    addToast,
    getUpstreamNodeValues,
    connections,
    setConnections
}: UseBatchPrepareStateAndInputsOptions) => {
    // State parser
    const state = useMemo<BatchPrepareNodeState>(() => {
        try {
            const parsed = JSON.parse(nodeValue || '{}');
            return {
                ...DEFAULT_STATE,
                ...parsed,
                assetBaseName: parsed.assetBaseName !== undefined ? parsed.assetBaseName : 'Asset_Name',
                gridConfig: {
                    ...DEFAULT_STATE.gridConfig,
                    ...(parsed.gridConfig || {})
                },
                activeViews: {
                    ...DEFAULT_STATE.activeViews,
                    ...(parsed.activeViews || {})
                },
                mutedViews: {
                    ...DEFAULT_STATE.mutedViews,
                    ...(parsed.mutedViews || {})
                },
                autoSendToViews: parsed.autoSendToViews !== undefined ? parsed.autoSendToViews : true,
                packs: Array.isArray(parsed.packs) ? parsed.packs : [],
                inputImages: Array.isArray(parsed.inputImages) ? parsed.inputImages : [],
                slicedImages: Array.isArray(parsed.slicedImages) ? parsed.slicedImages : [],
            };
        } catch {
            return DEFAULT_STATE;
        }
    }, [nodeValue]);

    // Keep a synchronous ref to the latest state to avoid race conditions in async actions
    const stateRef = useRef<BatchPrepareNodeState>(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Upstream Multi-Channel Images Resolution
    const upstreamImages = useMemo<string[]>(() => {
        const rawResults: any[] = [];
        if (getUpstreamNodeValues) {
            const upVals = getUpstreamNodeValues(nodeId, 'image', undefined, false);
            if (Array.isArray(upVals) && upVals.length > 0) {
                rawResults.push(...upVals);
            }
        }

        const formatted: string[] = [];
        rawResults.forEach((item: any) => {
            if (typeof item === 'string') {
                if (item.startsWith('data:image') || item.startsWith('http://') || item.startsWith('https://') || item.startsWith('blob:')) {
                    formatted.push(item);
                }
            } else if (typeof item === 'object' && item !== null) {
                if (item.base64ImageData) {
                    formatted.push(`data:${item.mimeType || 'image/png'};base64,${item.base64ImageData}`);
                } else if (item.url) {
                    formatted.push(item.url);
                } else if (item.image) {
                    formatted.push(item.image);
                } else if (item.outputImage) {
                    formatted.push(item.outputImage);
                }
            }
        });
        return formatted;
    }, [getUpstreamNodeValues, nodeId]);

    // Combined input images list: upstream + local inputImages
    const allInputImages = useMemo<string[]>(() => {
        const combined = [...state.inputImages];
        upstreamImages.forEach(img => {
            if (!combined.includes(img)) {
                combined.push(img);
            }
        });
        return combined;
    }, [state.inputImages, upstreamImages]);

    // Currently selected source image for grid slicing
    const activeSourceImage = useMemo<string | null>(() => {
        if (allInputImages.length === 0) return null;
        const idx = Math.min(state.selectedInputIndex, allInputImages.length - 1);
        return allInputImages[idx] || allInputImages[0] || null;
    }, [allInputImages, state.selectedInputIndex]);

    // Track active image natural dimensions for pixel-perfect aspect ratio overlay bounding box
    const [sourceNaturalSize, setSourceNaturalSize] = useState<{ width: number; height: number } | null>(null);
    useEffect(() => {
        if (!activeSourceImage) {
            setSourceNaturalSize(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            setSourceNaturalSize({
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
            });
        };
        img.src = activeSourceImage;
    }, [activeSourceImage]);

    // Persistence Helper with activePackId & mutedViews synchronization
    const updateState = useCallback((updater: Partial<BatchPrepareNodeState> | ((prev: BatchPrepareNodeState) => Partial<BatchPrepareNodeState>)) => {
        const currentState = stateRef.current;
        const partial = typeof updater === 'function' ? updater(currentState) : updater;
        const next = { ...currentState, ...partial };
        stateRef.current = next;

        // Compute effective active output multiview and extracted images for downstream nodes
        let effectiveViews = { ...next.activeViews };
        let effectiveMuted = { ...(next.mutedViews || {}) };

        if (next.activePackId) {
            const currentPack = next.packs.find(p => p.id === next.activePackId);
            if (currentPack) {
                effectiveViews = { ...currentPack.views };
                effectiveMuted = { ...(currentPack.mutedViews || {}) };
            }
        }

        // Apply mute flags: if slot is muted, output is strictly null!
        const exportedMultiview = {
            front: effectiveMuted.front ? null : (effectiveViews.front || null),
            back: effectiveMuted.back ? null : (effectiveViews.back || null),
            left: effectiveMuted.left ? null : (effectiveViews.left || null),
            right: effectiveMuted.right ? null : (effectiveViews.right || null),
        };

        const fullExport = {
            ...next,
            multiview: exportedMultiview,
            activeViews: effectiveViews,
            mutedViews: effectiveMuted,
            extractedImages: [
                exportedMultiview.front,
                exportedMultiview.back,
                exportedMultiview.left,
                exportedMultiview.right
            ].filter(Boolean),
            image: exportedMultiview.front || exportedMultiview.left || exportedMultiview.back || exportedMultiview.right || null,
        };

        onValueChange(nodeId, JSON.stringify(fullExport));
    }, [nodeId, onValueChange]);

    // Synchronize updates to activeViews and mutedViews directly to the selected pack in packs buffer
    const updateActiveViewsAndSyncPack = useCallback((
        viewsUpdater: (prevViews: BatchPrepareNodeState['activeViews']) => BatchPrepareNodeState['activeViews'],
        mutedUpdater?: (prevMuted: BatchPrepareNodeState['mutedViews']) => BatchPrepareNodeState['mutedViews']
    ) => {
        updateState(prev => {
            const nextViews = viewsUpdater(prev.activeViews);
            const nextMuted = mutedUpdater ? mutedUpdater(prev.mutedViews) : prev.mutedViews;

            const nextPacks = prev.activePackId
                ? prev.packs.map(p => p.id === prev.activePackId ? { ...p, views: nextViews, mutedViews: nextMuted } : p)
                : prev.packs;

            return {
                ...prev,
                activeViews: nextViews,
                mutedViews: nextMuted,
                packs: nextPacks
            };
        });
    }, [updateState]);

    // Track incoming connection to this node for link/unlink/bake action
    const incomingConnections = useMemo(() => {
        return connections?.filter(c => c.toNodeId === nodeId) || [];
    }, [connections, nodeId]);
    const hasIncomingConnections = incomingConnections.length > 0;

    const handleBakeAndDisconnectInput = useCallback(() => {
        const embeddedImages = [...allInputImages];
        if (setConnections) {
            setConnections(prev => prev.filter(c => c.toNodeId !== nodeId));
        }
        updateState({
            inputImages: embeddedImages,
            selectedInputIndex: 0
        });
        addToast(
            hasIncomingConnections
                ? `Соединение отключено. Встроено ${embeddedImages.length} изображений в ноду`
                : `Все ${embeddedImages.length} изображений встроены в ноду`,
            'success'
        );
    }, [allInputImages, setConnections, nodeId, updateState, addToast, hasIncomingConnections]);

    // File Upload Handler
    const handleUploadInputFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const readPromises = Array.from(files).map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readPromises).then((newImgs) => {
            updateState(prev => ({
                inputImages: [...newImgs, ...prev.inputImages],
                selectedInputIndex: 0
            }));
            addToast(`Загружено ${newImgs.length} изображений`, 'success');
        });

        e.target.value = '';
    }, [updateState, addToast]);

    const handleDropInputFiles = useCallback((files: FileList) => {
        const readPromises = Array.from(files).map(file => {
            return new Promise<string>(resolve => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.readAsDataURL(file);
            });
        });
        Promise.all(readPromises).then(newImgs => {
            updateState(prev => ({
                inputImages: [...newImgs, ...prev.inputImages],
                selectedInputIndex: 0
            }));
        });
    }, [updateState]);

    // Paste handler from clipboard
    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result as string;
                        updateState(prev => ({
                            inputImages: [dataUrl, ...prev.inputImages],
                            selectedInputIndex: 0
                        }));
                        addToast('Изображение вставлено из буфера', 'success');
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
            addToast('В буфере обмена нет изображения', 'info');
        } catch {
            addToast('Не удалось прочитать буфер обмена', 'warning');
        }
    }, [updateState, addToast]);

    return {
        state,
        stateRef,
        updateState,
        updateActiveViewsAndSyncPack,
        allInputImages,
        activeSourceImage,
        sourceNaturalSize,
        hasIncomingConnections,
        handleBakeAndDisconnectInput,
        handleUploadInputFiles,
        handleDropInputFiles,
        handlePasteFromClipboard
    };
};
