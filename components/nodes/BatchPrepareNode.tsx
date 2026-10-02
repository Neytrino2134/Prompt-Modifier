import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import JSZip from 'jszip';
import type { NodeContentProps } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../localization';
import { sliceImageGrid } from '../../utils/imageUtils';
import { BatchPreparePack, BatchPrepareNodeState, DEFAULT_STATE, ViewSlotKey } from './batch-prepare/types';
import { BatchPrepareHeader } from './batch-prepare/BatchPrepareHeader';
import { BatchPrepareInputColumn } from './batch-prepare/BatchPrepareInputColumn';
import { BatchPrepareSliceColumn } from './batch-prepare/BatchPrepareSliceColumn';
import { BatchPrepareViewsColumn } from './batch-prepare/BatchPrepareViewsColumn';
import { BatchPreparePacksColumn } from './batch-prepare/BatchPreparePacksColumn';
import { run3DBatchGeneration } from '../../services/tripoBatchService';
import { isTripoEnabled, getTripoApiKey, getTripoModelVersion } from '../../services/tripoService';
import { NodeType } from '../../types';

export type { BatchPreparePack, BatchPrepareNodeState };

export const BatchPrepareNode: React.FC<NodeContentProps> = memo(({
    node,
    onValueChange,
    addToast,
    setImageViewer,
    getUpstreamNodeValues,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();

    // Drag tracking for slot swap & external drops
    const [draggedSlot, setDraggedSlot] = useState<ViewSlotKey | null>(null);
    const [isSlicing, setIsSlicing] = useState(false);
    const [isBatchSlicing, setIsBatchSlicing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
    const [isDropOverSlot, setIsDropOverSlot] = useState<{ [key in ViewSlotKey]?: boolean }>({});

    // State parser
    const state = useMemo<BatchPrepareNodeState>(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
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
    }, [node.value]);

    // Keep a synchronous ref to the latest state to avoid race conditions in async actions
    const stateRef = useRef<BatchPrepareNodeState>(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Local state for smooth slider dragging (committing only on mouse up / touch end)
    const [localBorderWidth, setLocalBorderWidth] = useState<number>(state.gridConfig.borderWidth || 0);
    useEffect(() => {
        setLocalBorderWidth(state.gridConfig.borderWidth || 0);
    }, [state.gridConfig.borderWidth]);

    // Upstream Multi-Channel Images Resolution
    const upstreamImages = useMemo<string[]>(() => {
        const rawResults: any[] = [];
        if (getUpstreamNodeValues) {
            const upVals = getUpstreamNodeValues(node.id, 'image', undefined, false);
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
    }, [getUpstreamNodeValues, node.id]);

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

        onValueChange(node.id, JSON.stringify(fullExport));
    }, [node.id, onValueChange]);

    // Track incoming connection to this node for link/unlink/bake action
    const incomingConnections = useMemo(() => {
        return context?.connections?.filter(c => c.toNodeId === node.id) || [];
    }, [context?.connections, node.id]);
    const hasIncomingConnections = incomingConnections.length > 0;

    const handleBakeAndDisconnectInput = useCallback(() => {
        const embeddedImages = [...allInputImages];
        if (context?.setConnections) {
            context.setConnections(prev => prev.filter(c => c.toNodeId !== node.id));
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
    }, [allInputImages, context, node.id, updateState, addToast, hasIncomingConnections]);

    // Commit border slider on release
    const commitBorderWidth = useCallback((bw: number) => {
        updateState(prev => ({
            gridConfig: {
                ...prev.gridConfig,
                borderWidth: bw,
                enableBorder: bw > 0
            }
        }));
    }, [updateState]);

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

    // Auto Slice single helper with custom bounds & border padding
    const handlePerformSlice = useCallback(async (
        imgSrc?: string, 
        cols?: number, 
        rows?: number, 
        preset?: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1' | 'custom'
    ) => {
        const targetImg = imgSrc || activeSourceImage;
        if (!targetImg) {
            addToast(t('batchprep.toast.selectImageFirst') || 'Выберите входящее изображение для нарезки', 'info');
            return;
        }

        const c = cols ?? stateRef.current.gridConfig.cols;
        const r = rows ?? stateRef.current.gridConfig.rows;
        const p = preset ?? stateRef.current.gridConfig.preset;
        const bounds = stateRef.current.gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 };
        const borderConfig = {
            enableBorder: (stateRef.current.gridConfig.borderWidth || 0) > 0,
            borderWidth: stateRef.current.gridConfig.borderWidth || 0,
            borderMode: stateRef.current.gridConfig.borderMode || 'inner',
            customDividers: true,
            colDividers: stateRef.current.gridConfig.colDividers,
            rowDividers: stateRef.current.gridConfig.rowDividers,
        };

        setIsSlicing(true);
        try {
            const { slices } = await sliceImageGrid(targetImg, c, r, bounds, borderConfig);
            const shouldAutoSend = stateRef.current.autoSendToViews;
            const newActiveViews = shouldAutoSend && slices.length > 0 ? {
                front: slices[0] || null,
                back: slices[1] || null,
                left: slices[2] || null,
                right: slices[3] || null,
            } : undefined;

            updateState(prev => {
                const nextPacks = (shouldAutoSend && newActiveViews && prev.activePackId)
                    ? prev.packs.map(pk => pk.id === prev.activePackId ? { ...pk, views: newActiveViews } : pk)
                    : prev.packs;

                return {
                    ...prev,
                    gridConfig: {
                        ...prev.gridConfig,
                        preset: p,
                        cols: c,
                        rows: r,
                    },
                    slicedImages: slices,
                    selectedSliceIndex: 0,
                    ...(newActiveViews ? { activeViews: newActiveViews } : {}),
                    packs: nextPacks
                };
            });
            
            if (shouldAutoSend && slices.length > 0) {
                addToast((t('batchprep.toast.slicedAndSent') || `Нарезано (${c}x${r}) и отправлено в 3D Views`), 'success');
            } else {
                addToast((t('batchprep.toast.slicedSuccess') || `Нарезано на ${slices.length} частей (${c}x${r})`), 'success');
            }
        } catch (err: any) {
            console.error('Slice error:', err);
            addToast(err?.message || 'Ошибка нарезки сетки', 'error');
        } finally {
            setIsSlicing(false);
        }
    }, [activeSourceImage, addToast, t, updateState]);

    // BATCH SLICE ALL INPUTS -> SEND DIRECTLY TO PACK BUFFER
    const handleBatchSliceAllToPackBuffer = useCallback(async () => {
        if (allInputImages.length === 0) {
            addToast('Нет входящих изображений для пакетной нарезки', 'warning');
            return;
        }

        const cols = stateRef.current.gridConfig.cols;
        const rows = stateRef.current.gridConfig.rows;
        const bounds = stateRef.current.gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 };
        const borderConfig = {
            enableBorder: (stateRef.current.gridConfig.borderWidth || 0) > 0,
            borderWidth: stateRef.current.gridConfig.borderWidth || 0,
            borderMode: stateRef.current.gridConfig.borderMode || 'inner',
            customDividers: true,
            colDividers: stateRef.current.gridConfig.colDividers,
            rowDividers: stateRef.current.gridConfig.rowDividers,
        };
        const total = allInputImages.length;

        setIsBatchSlicing(true);
        setBatchProgress({ current: 0, total });

        try {
            const newPacks: BatchPreparePack[] = [];
            const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
            const startIdx = stateRef.current.packs.length;

            for (let i = 0; i < total; i++) {
                const imgSrc = allInputImages[i];
                setBatchProgress({ current: i + 1, total });

                // Perform grid slice for this image with full source resolution
                const { slices } = await sliceImageGrid(imgSrc, cols, rows, bounds, borderConfig);

                const padIndex = String(startIdx + i + 1).padStart(2, '0');
                const pack: BatchPreparePack = {
                    id: `pack-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                    name: `${baseName}_${padIndex}`,
                    createdAt: Date.now() + i,
                    views: {
                        front: slices[0] || null,
                        back: slices[1] || null,
                        left: slices[2] || null,
                        right: slices[3] || null,
                    },
                    mutedViews: {
                        front: false,
                        back: false,
                        left: false,
                        right: false,
                    }
                };
                newPacks.push(pack);
            }

            // Append all created packs to Pack Buffer
            updateState(prev => {
                const combinedPacks = [...prev.packs, ...newPacks];
                const activeId = prev.activePackId || (newPacks[0] ? newPacks[0].id : null);
                const activePackObj = combinedPacks.find(p => p.id === activeId);

                return {
                    ...prev,
                    packs: combinedPacks,
                    activePackId: activeId,
                    ...(activePackObj ? {
                        activeViews: { ...activePackObj.views },
                        mutedViews: { ...(activePackObj.mutedViews || {}) }
                    } : {})
                };
            });

            addToast(`⚡ Успешно нарезано ${total} картинок и добавлено ${newPacks.length} паков в Буфер!`, 'success');
        } catch (err: any) {
            console.error('Batch slice error:', err);
            addToast(`Ошибка пакетной нарезки: ${err?.message}`, 'error');
        } finally {
            setIsBatchSlicing(false);
            setBatchProgress(null);
        }
    }, [allInputImages, addToast, updateState]);

    // Grid Presets handler
    const handleSetGridPreset = (preset: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1') => {
        let cols = 4;
        let rows = 1;
        switch (preset) {
            case '1x2': cols = 2; rows = 1; break;
            case '1x3': cols = 3; rows = 1; break;
            case '1x4': cols = 4; rows = 1; break;
            case '2x2': cols = 2; rows = 2; break;
            case '2x1': cols = 1; rows = 2; break;
            case '3x1': cols = 1; rows = 3; break;
        }

        updateState(prev => ({
            gridConfig: {
                ...prev.gridConfig,
                preset,
                cols,
                rows,
                bounds: { x: 0, y: 0, width: 1, height: 1 },
                colDividers: undefined,
                rowDividers: undefined,
                customDividers: true
            }
        }));

        if (activeSourceImage) {
            handlePerformSlice(activeSourceImage, cols, rows, preset);
        }
    };

    // Reset grid borders, bounds and dividers
    const handleResetGrid = () => {
        updateState(prev => ({
            gridConfig: {
                ...prev.gridConfig,
                borderWidth: 0,
                enableBorder: false,
                borderMode: 'inner',
                bounds: { x: 0, y: 0, width: 1, height: 1 },
                colDividers: undefined,
                rowDividers: undefined,
                customDividers: true
            }
        }));
        setLocalBorderWidth(0);
        addToast('Границы и рамка сетки сброшены', 'info');
    };

    // Auto-assign list of images to 4 views
    const handleAutoAssignToViews = (imgList: string[]) => {
        if (!imgList || imgList.length === 0) return;
        const newViews = {
            front: imgList[0] || null,
            back: imgList[1] || null,
            left: imgList[2] || null,
            right: imgList[3] || null,
        };
        updateActiveViewsAndSyncPack(() => newViews);
        addToast(t('batchprep.toast.viewsAssigned') || 'Ракурсы Front/Back/Left/Right заполнены', 'success');
    };

    // View manipulation helpers
    const handleSetSingleView = (slot: ViewSlotKey, dataUrl: string | null) => {
        updateActiveViewsAndSyncPack(prev => ({
            ...prev,
            [slot]: dataUrl
        }));
    };

    const handleToggleMuteView = (slot: ViewSlotKey) => {
        updateActiveViewsAndSyncPack(
            views => views,
            prevMuted => {
                const currentMuted = Boolean(prevMuted?.[slot]);
                const nextMuted = !currentMuted;
                addToast(nextMuted ? `Ракурс [${slot.toUpperCase()}] исключен (Muted)` : `Ракурс [${slot.toUpperCase()}] включен (Active)`, 'info');
                return {
                    ...prevMuted,
                    [slot]: nextMuted
                };
            }
        );
    };

    const handleSwapLeftRight = () => {
        updateActiveViewsAndSyncPack(
            prev => ({
                ...prev,
                left: prev.right,
                right: prev.left,
            }),
            prevMuted => ({
                ...prevMuted,
                left: prevMuted?.right,
                right: prevMuted?.left,
            })
        );
        addToast('Left ↔ Right поменяны местами (синхронизировано с паком)', 'info');
    };

    const handleSwapFrontBack = () => {
        updateActiveViewsAndSyncPack(
            prev => ({
                ...prev,
                front: prev.back,
                back: prev.front,
            }),
            prevMuted => ({
                ...prevMuted,
                front: prevMuted?.back,
                back: prevMuted?.front,
            })
        );
        addToast('Front ↔ Back поменяны местами (синхронизировано с паком)', 'info');
    };

    const handleRotateViews = () => {
        updateActiveViewsAndSyncPack(
            prev => ({
                front: prev.left,
                right: prev.front,
                back: prev.right,
                left: prev.back,
            }),
            prevMuted => ({
                front: prevMuted?.left,
                right: prevMuted?.front,
                back: prevMuted?.right,
                left: prevMuted?.back,
            })
        );
        addToast('Ракурсы сдвинуты по часовой стрелке', 'info');
    };

    const handleFlipView = async (slot: ViewSlotKey) => {
        const src = state.activeViews[slot];
        if (!src) return;
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0);
                    const flippedDataUrl = canvas.toDataURL('image/png');
                    handleSetSingleView(slot, flippedDataUrl);
                    addToast(`Ракурс ${slot.toUpperCase()} отражен по горизонтали`, 'success');
                }
            };
            img.src = src;
        } catch (e) {
            console.error('Flip error', e);
        }
    };

    const handleClearAllViews = () => {
        updateActiveViewsAndSyncPack(() => ({
            front: null,
            back: null,
            left: null,
            right: null,
        }), () => ({
            front: false,
            back: false,
            left: false,
            right: false,
        }));
        addToast('Все 4 ракурса очищены', 'info');
    };

    // Pack Buffer Management
    const handleBaseNameChange = (newBaseName: string) => {
        const base = newBaseName.trim() || 'Asset_Name';
        updateState(prev => {
            const updatedPacks = prev.packs.map((p, index) => {
                const padIndex = String(index + 1).padStart(2, '0');
                return {
                    ...p,
                    name: `${base}_${padIndex}`
                };
            });
            return {
                ...prev,
                assetBaseName: newBaseName,
                packs: updatedPacks
            };
        });
    };

    const handleClearAllPacks = () => {
        if (stateRef.current.packs.length === 0) return;
        updateState({
            packs: [],
            activePackId: null
        });
        addToast('Все паки очищены из буфера', 'info');
    };

    const handleSaveCurrentToPack = () => {
        const filled = [
            state.activeViews.front,
            state.activeViews.back,
            state.activeViews.left,
            state.activeViews.right
        ].filter(Boolean).length;

        if (filled === 0) {
            addToast('Заполните хотя бы один ракурс для сохранения в пак', 'warning');
            return;
        }

        const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
        const padIndex = String(state.packs.length + 1).padStart(2, '0');
        const newPackId = `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newPack: BatchPreparePack = {
            id: newPackId,
            name: `${baseName}_${padIndex}`,
            createdAt: Date.now(),
            views: { ...state.activeViews },
            mutedViews: { ...(state.mutedViews || {}) }
        };

        updateState(prev => ({
            packs: [...prev.packs, newPack],
            activePackId: newPackId
        }));

        addToast(`Пак "${newPack.name}" сохранен в буфер и выбран`, 'success');
    };

    const handleSelectActivePack = (packId: string) => {
        const found = state.packs.find(p => p.id === packId);
        if (!found) return;

        updateState(prev => ({
            activePackId: packId,
            activeViews: { ...found.views },
            mutedViews: { ...(found.mutedViews || {}) }
        }));

        addToast(`Выбран "${found.name}" (Виды загружены в Редактор)`, 'info');
    };

    const handleDeletePack = (packId: string) => {
        updateState(prev => {
            const nextPacks = prev.packs.filter(p => p.id !== packId);
            const nextActiveId = prev.activePackId === packId 
                ? (nextPacks[0] ? nextPacks[0].id : null) 
                : prev.activePackId;
            const nextActivePack = nextPacks.find(p => p.id === nextActiveId);

            return {
                ...prev,
                packs: nextPacks,
                activePackId: nextActiveId,
                ...(nextActivePack ? {
                    activeViews: { ...nextActivePack.views },
                    mutedViews: { ...(nextActivePack.mutedViews || {}) }
                } : {})
            };
        });
        addToast('Пак удален из буфера', 'info');
    };

    const handleDuplicatePack = (pack: BatchPreparePack) => {
        const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
        const padIndex = String(state.packs.length + 1).padStart(2, '0');
        const dup: BatchPreparePack = {
            ...pack,
            id: `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `${baseName}_${padIndex}`,
            createdAt: Date.now()
        };
        updateState(prev => ({
            packs: [...prev.packs, dup],
            activePackId: dup.id,
            activeViews: { ...dup.views },
            mutedViews: { ...(dup.mutedViews || {}) }
        }));
        addToast(`Создана копия пака "${dup.name}"`, 'success');
    };

    const handleDownloadPackZip = async (pack: BatchPreparePack) => {
        try {
            const zip = new JSZip();
            const viewsOrder: ViewSlotKey[] = ['front', 'back', 'left', 'right'];
            let count = 0;

            for (const vKey of viewsOrder) {
                const dataUrl = pack.views[vKey];
                const isMuted = pack.mutedViews?.[vKey];
                if (dataUrl && !isMuted) {
                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                    zip.file(`${vKey}.png`, base64Data, { base64: true });
                    count++;
                }
            }

            if (count === 0) {
                addToast('В паке нет активных ракурсов для скачивания', 'warning');
                return;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${pack.name.replace(/\s+/g, '_')}_3D_views.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast(`Архив ${pack.name}.zip скачан`, 'success');
        } catch (e) {
            console.error('ZIP export error:', e);
            addToast('Ошибка создания ZIP архива', 'error');
        }
    };

    const handleDownloadAllPacksZip = async () => {
        if (state.packs.length === 0) return;
        try {
            const zip = new JSZip();
            const viewsOrder: ViewSlotKey[] = ['front', 'back', 'left', 'right'];
            let totalImages = 0;

            for (let i = 0; i < state.packs.length; i++) {
                const pack = state.packs[i];
                const folderName = `Pack_${i + 1}_${pack.name.replace(/[^\wа-яА-Я-]/g, '_')}`;
                const packFolder = zip.folder(folderName);

                if (packFolder) {
                    for (const vKey of viewsOrder) {
                        const dataUrl = pack.views[vKey];
                        const isMuted = pack.mutedViews?.[vKey];
                        if (dataUrl && !isMuted) {
                            const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                            packFolder.file(`${vKey}.png`, base64Data, { base64: true });
                            totalImages++;
                        }
                    }
                }
            }

            if (totalImages === 0) {
                addToast('Нет активных изображений для скачивания в паках', 'warning');
                return;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `All_3D_Packs_Batch_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast(`Скачан архив со всеми паками (${state.packs.length} шт.)`, 'success');
        } catch (e) {
            console.error('Batch ZIP export error:', e);
            addToast('Ошибка экспорта всех паков', 'error');
        }
    };

    // File Upload Handler
    const handleUploadInputFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    };

    // Paste handler from clipboard
    const handlePasteFromClipboard = async () => {
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
    };

    // Drag-and-drop onto a View Slot
    const handleDropOnViewSlot = (e: React.DragEvent, targetSlot: ViewSlotKey) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDropOverSlot(prev => ({ ...prev, [targetSlot]: false }));

        // 1. Swap slots
        if (draggedSlot && draggedSlot !== targetSlot) {
            const srcVal = state.activeViews[draggedSlot];
            const targetVal = state.activeViews[targetSlot];
            const srcMuted = state.mutedViews?.[draggedSlot];
            const targetMuted = state.mutedViews?.[targetSlot];

            updateActiveViewsAndSyncPack(
                prevViews => ({
                    ...prevViews,
                    [draggedSlot]: targetVal,
                    [targetSlot]: srcVal
                }),
                prevMuted => ({
                    ...prevMuted,
                    [draggedSlot]: targetMuted,
                    [targetSlot]: srcMuted
                })
            );
            setDraggedSlot(null);
            addToast(`Поменяли местами: ${draggedSlot.toUpperCase()} ↔ ${targetSlot.toUpperCase()}`, 'info');
            return;
        }

        // 2. Custom drag data
        const appDragImg = e.dataTransfer.getData('application/prompt-modifier-drag-image') ||
                            e.dataTransfer.getData('text/uri-list') ||
                            e.dataTransfer.getData('text/plain');

        if (appDragImg && (appDragImg.startsWith('data:image') || appDragImg.startsWith('http'))) {
            handleSetSingleView(targetSlot, appDragImg);
            addToast(`Вид ${targetSlot.toUpperCase()} обновлен`, 'success');
            return;
        }

        // 3. Native file drop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    handleSetSingleView(targetSlot, reader.result as string);
                    addToast(`Вид ${targetSlot.toUpperCase()} загружен из файла`, 'success');
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const activePack = useMemo(() => {
        if (!state.activePackId) return null;
        return state.packs.find(p => p.id === state.activePackId) || null;
    }, [state.activePackId, state.packs]);

    const filledActiveViewCount = [
        state.mutedViews?.front ? null : state.activeViews.front,
        state.mutedViews?.back ? null : state.activeViews.back,
        state.mutedViews?.left ? null : state.activeViews.left,
        state.mutedViews?.right ? null : state.activeViews.right
    ].filter(Boolean).length;

    // 3D Batch Generation Orchestration
    const batchAbortControllerRef = useRef<AbortController | null>(null);

    const handleStop3DBatch = useCallback(() => {
        if (batchAbortControllerRef.current) {
            batchAbortControllerRef.current.abort();
            batchAbortControllerRef.current = null;
        }
        updateState({ isBatchRunning: false });
        addToast('3D Batch остановлен пользователем', 'warning');
    }, [updateState, addToast]);

    const handleStart3DBatch = useCallback(async () => {
        const currentPacks = stateRef.current.packs;
        if (!currentPacks || currentPacks.length === 0) {
            addToast('В буфере нет паков для 3D Batch генерации', 'warning');
            return;
        }

        const apiKey = getTripoApiKey();
        if (!isTripoEnabled() || !apiKey) {
            addToast('Необходимо включить Tripo AI и указать API ключ в Настройках', 'error');
            return;
        }

        // Find target downstream 3D Generation node or any 3D node on canvas
        const downstream3DNodes = (context?.nodes || []).filter(n => {
            if (n.type !== NodeType.THREE_D_GENERATOR) return false;
            return context?.connections?.some(c => c.fromNodeId === node.id && c.toNodeId === n.id);
        });
        const target3DNode = downstream3DNodes[0] || (context?.nodes || []).find(n => n.type === NodeType.THREE_D_GENERATOR);

        let tripoParams: any = {
            modelVersion: getTripoModelVersion(),
            texture: true,
            textureQuality: 'standard',
            textureAlignment: 'original_image',
            pbr: true,
            quadMesh: false,
            autoSave3d: true,
            autoSaveJson: true,
            concurrencyLimit: 5
        };

        if (target3DNode) {
            try {
                const parsed = JSON.parse(target3DNode.value || '{}');
                tripoParams = {
                    ...tripoParams,
                    modelVersion: parsed.modelVersion || tripoParams.modelVersion,
                    texture: parsed.texture !== undefined ? parsed.texture : tripoParams.texture,
                    textureQuality: parsed.textureQuality || tripoParams.textureQuality,
                    textureAlignment: parsed.textureAlignment || tripoParams.textureAlignment,
                    pbr: parsed.pbr !== undefined ? parsed.pbr : tripoParams.pbr,
                    quadMesh: parsed.quadMesh || false,
                    faceLimit: parsed.faceLimit,
                    modelSeed: parsed.modelSeed,
                    textureSeed: parsed.textureSeed,
                    autoSave3d: parsed.autoSave3d !== false,
                    autoSaveJson: parsed.autoSaveJson !== false,
                    concurrencyLimit: parsed.concurrencyLimit || 5
                };
            } catch {}
        }

        batchAbortControllerRef.current = new AbortController();
        const signal = batchAbortControllerRef.current.signal;

        updateState({
            isBatchRunning: true,
            batchProgress: {
                completed: 0,
                total: currentPacks.length,
                percent: 0
            }
        });

        addToast(`🚀 Запущен 3D Batch для ${currentPacks.length} паков!`, 'success');

        try {
            await run3DBatchGeneration({
                packs: currentPacks,
                assetBaseName: (stateRef.current.assetBaseName || 'Asset_Name').trim(),
                nodeId: target3DNode?.id || node.id,
                tabId: context?.activeTabId,
                tripoParams,
                signal,
                onJobUpdated: (job) => {
                    // Sync pack states in BatchPrepareNode
                    updateState(prev => {
                        const updatedPacks = prev.packs.map(p => {
                            const jobItem = job.items.find(it => it.id === p.id || it.packName === p.name);
                            if (jobItem) {
                                return {
                                    ...p,
                                    taskId: jobItem.taskId || p.taskId,
                                    status: jobItem.status,
                                    progress: jobItem.progress,
                                    modelUrl: jobItem.modelUrl || p.modelUrl,
                                    thumbnailUrl: jobItem.thumbnailUrl || p.thumbnailUrl,
                                    renderedImageUrl: jobItem.renderedImageUrl || p.renderedImageUrl,
                                    error: jobItem.error
                                };
                            }
                            return p;
                        });

                        return {
                            ...prev,
                            packs: updatedPacks,
                            batchProgress: {
                                completed: job.completedCount,
                                total: job.totalCount,
                                percent: job.progressPercent
                            }
                        };
                    });

                    // Sync state into target 3D Generation node if exists
                    if (target3DNode && context?.handleValueChange) {
                        try {
                            const current3d = JSON.parse(target3DNode.value || '{}');
                            const next3d = {
                                ...current3d,
                                isBatchMode: true,
                                batchJob: job,
                                status: job.status === 'completed' ? 'success' : job.status === 'failed' ? 'failed' : 'running',
                                progress: job.progressPercent,
                                statusMessage: `3D Batch: ${job.completedCount}/${job.totalCount} (${job.progressPercent}%)`
                            };
                            context.handleValueChange(target3DNode.id, JSON.stringify(next3d));
                        } catch {}
                    }
                },
                onItemTaskCreated: (item, jsonFile) => {
                    if (jsonFile) {
                        addToast(`[Task ID: ${item.taskId?.slice(0, 10)}...] сохранён в JSON`, 'info');
                    }
                },
                onItemCompleted: (item, modelFile) => {
                    if (modelFile) {
                        addToast(`✓ 3D Модель #${item.packIndex} "${item.packName}" скачана!`, 'success');
                    }
                },
                onItemFailed: (item, err) => {
                    addToast(`Ошибка пака #${item.packIndex}: ${err}`, 'error');
                },
                onBatchFinished: (finalJob) => {
                    updateState({
                        isBatchRunning: false,
                        batchProgress: {
                            completed: finalJob.completedCount,
                            total: finalJob.totalCount,
                            percent: 100
                        }
                    });
                    addToast(`🎉 3D Batch успешно завершён: ${finalJob.completedCount}/${finalJob.totalCount} готово!`, 'success');
                },
                addToHistory: context?.addToHistory
            });
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                console.error('3D Batch error', err);
                addToast(`Ошибка 3D Batch: ${err?.message}`, 'error');
            }
        } finally {
            updateState({ isBatchRunning: false });
            batchAbortControllerRef.current = null;
        }
    }, [addToast, context, node.id, updateState]);

    return (
        <div className="flex flex-col w-full h-full text-gray-200 select-none overflow-hidden bg-gray-950/90 font-sans">
            {/* Main Header / Status Ribbon */}
            <BatchPrepareHeader
                filledActiveViewCount={filledActiveViewCount}
                activePack={activePack}
                packsCount={state.packs.length}
                onSaveCurrentToPack={handleSaveCurrentToPack}
                onDownloadAllPacksZip={handleDownloadAllPacksZip}
                isBatchRunning={Boolean(state.isBatchRunning)}
                batchProgress={state.batchProgress}
                onStart3DBatch={handleStart3DBatch}
                onStop3DBatch={handleStop3DBatch}
            />

            {/* 4-Column Layout */}
            <div className="grid grid-cols-4 gap-2 p-2.5 flex-1 min-h-0 w-full overflow-hidden">
                {/* COLUMN 1: INPUT IMAGES WITH VIRTUAL BUFFERING & 64x64 PREVIEWS */}
                <BatchPrepareInputColumn
                    allInputImages={allInputImages}
                    selectedInputIndex={state.selectedInputIndex}
                    hasIncomingConnections={hasIncomingConnections}
                    hasLocalInputs={state.inputImages.length > 0}
                    onSelectInput={(idx) => updateState({ selectedInputIndex: idx })}
                    onBakeAndDisconnect={handleBakeAndDisconnectInput}
                    onUploadFiles={handleUploadInputFiles}
                    onPasteFromClipboard={handlePasteFromClipboard}
                    onClearLocalInputs={() => updateState({ inputImages: [], selectedInputIndex: 0 })}
                    onAutoAssignToViews={handleAutoAssignToViews}
                    onDropFiles={(files) => {
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
                    }}
                    onOpenImageViewer={(src, index) => {
                        setImageViewer?.({
                            sources: [{ src, frameNumber: index }],
                            initialIndex: 0
                        });
                    }}
                />

                {/* COLUMN 2: MULTIPLE GRID & BATCH SLICING */}
                <BatchPrepareSliceColumn
                    gridConfig={state.gridConfig}
                    localBorderWidth={localBorderWidth}
                    onLocalBorderWidthChange={setLocalBorderWidth}
                    onCommitBorderWidth={commitBorderWidth}
                    onSetGridPreset={handleSetGridPreset}
                    onPerformSlice={handlePerformSlice}
                    onResetGrid={handleResetGrid}
                    onToggleBorderMode={() => {
                        const nextMode = state.gridConfig.borderMode === 'all' ? 'inner' : 'all';
                        updateState(prev => ({
                            gridConfig: {
                                ...prev.gridConfig,
                                borderMode: nextMode
                            }
                        }));
                    }}
                    onChangeGridOverlayConfig={(newCfg) => {
                        updateState(prev => ({
                            gridConfig: {
                                ...prev.gridConfig,
                                cols: newCfg.cols,
                                rows: newCfg.rows,
                                bounds: newCfg.bounds,
                                borderWidth: newCfg.borderWidth,
                                borderMode: newCfg.borderMode,
                                enableBorder: (newCfg.borderWidth || 0) > 0,
                                colDividers: newCfg.colDividers,
                                rowDividers: newCfg.rowDividers,
                                customDividers: true,
                            }
                        }));
                    }}
                    activeSourceImage={activeSourceImage}
                    sourceNaturalSize={sourceNaturalSize}
                    slicedImages={state.slicedImages}
                    isSlicing={isSlicing}
                    isBatchSlicing={isBatchSlicing}
                    batchProgress={batchProgress}
                    allInputImagesCount={allInputImages.length}
                    autoSendToViews={Boolean(state.autoSendToViews)}
                    onToggleAutoSend={() => {
                        const nextVal = !state.autoSendToViews;
                        updateState({ autoSendToViews: nextVal });
                        if (nextVal && state.slicedImages.length > 0) {
                            handleAutoAssignToViews(state.slicedImages);
                        }
                        addToast(nextVal ? 'Авто-отправка в 3D Views: ВКЛ' : 'Авто-отправка в 3D Views: ВЫКЛ', 'info');
                    }}
                    onSendTo3DViews={() => {
                        if (state.slicedImages.length > 0) {
                            handleAutoAssignToViews(state.slicedImages);
                        } else if (activeSourceImage) {
                            handlePerformSlice(activeSourceImage).then(() => {
                                if (!state.autoSendToViews && stateRef.current.slicedImages.length > 0) {
                                    handleAutoAssignToViews(stateRef.current.slicedImages);
                                }
                            });
                        } else {
                            addToast('Выберите входящее изображение для нарезки', 'info');
                        }
                    }}
                    onBatchSliceAll={handleBatchSliceAllToPackBuffer}
                    onOpenImageViewer={(src, frameNumber) => {
                        setImageViewer?.({
                            sources: [{ src, frameNumber }],
                            initialIndex: 0
                        });
                    }}
                />

                {/* COLUMN 3: 4-VIEW MULTIVIEW SLOTS (128x128 PREVIEWS FOR 3D VIEWS) */}
                <BatchPrepareViewsColumn
                    activeViews={state.activeViews}
                    mutedViews={state.mutedViews}
                    activePack={activePack}
                    isDropOverSlot={isDropOverSlot}
                    draggedSlot={draggedSlot}
                    setDraggedSlot={setDraggedSlot}
                    setIsDropOverSlot={setIsDropOverSlot}
                    onSwapLeftRight={handleSwapLeftRight}
                    onSwapFrontBack={handleSwapFrontBack}
                    onRotateViews={handleRotateViews}
                    onClearAllViews={handleClearAllViews}
                    onToggleMuteView={handleToggleMuteView}
                    onFlipView={handleFlipView}
                    onSetSingleView={handleSetSingleView}
                    onDropOnViewSlot={handleDropOnViewSlot}
                    onSaveCurrentToPack={handleSaveCurrentToPack}
                    onOpenImageViewer={(src, label) => {
                        setImageViewer?.({
                            sources: [{ src, frameNumber: 1, prompt: label }],
                            initialIndex: 0
                        });
                    }}
                />

                {/* COLUMN 4: PACK BUFFER WITH VIRTUAL BUFFERING & 64x64 PREVIEWS */}
                <BatchPreparePacksColumn
                    packs={state.packs}
                    activePackId={state.activePackId}
                    assetBaseName={state.assetBaseName !== undefined ? state.assetBaseName : 'Asset_Name'}
                    onBaseNameChange={handleBaseNameChange}
                    onSaveCurrentToPack={handleSaveCurrentToPack}
                    onClearAllPacks={handleClearAllPacks}
                    onSelectActivePack={handleSelectActivePack}
                    onDuplicatePack={handleDuplicatePack}
                    onDownloadPackZip={handleDownloadPackZip}
                    onDeletePack={handleDeletePack}
                    isBatchRunning={Boolean(state.isBatchRunning)}
                    onStart3DBatch={handleStart3DBatch}
                    onStop3DBatch={handleStop3DBatch}
                    addToast={addToast}
                />
            </div>
        </div>
    );
});
