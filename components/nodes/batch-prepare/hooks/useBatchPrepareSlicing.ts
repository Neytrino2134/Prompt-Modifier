import React, { useState, useEffect, useCallback } from 'react';
import type { ToastType } from '../../../../types';
import { sliceImageGrid } from '../../../../utils/imageUtils';
import { BatchPrepareNodeState, BatchPreparePack } from '../types';

interface UseBatchPrepareSlicingOptions {
    state: BatchPrepareNodeState;
    stateRef: React.MutableRefObject<BatchPrepareNodeState>;
    updateState: (updater: Partial<BatchPrepareNodeState> | ((prev: BatchPrepareNodeState) => Partial<BatchPrepareNodeState>)) => void;
    activeSourceImage: string | null;
    allInputImages: string[];
    addToast: (message: string, type?: ToastType) => void;
    t: (key: string) => string;
}

export const useBatchPrepareSlicing = ({
    state,
    stateRef,
    updateState,
    activeSourceImage,
    allInputImages,
    addToast,
    t
}: UseBatchPrepareSlicingOptions) => {
    const [isSlicing, setIsSlicing] = useState(false);
    const [isBatchSlicing, setIsBatchSlicing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

    // Local state for smooth slider dragging (committing only on mouse up / touch end)
    const [localBorderWidth, setLocalBorderWidth] = useState<number>(
        state.gridConfig.borderWidth !== undefined ? state.gridConfig.borderWidth : 20
    );
    useEffect(() => {
        setLocalBorderWidth(state.gridConfig.borderWidth !== undefined ? state.gridConfig.borderWidth : 20);
    }, [state.gridConfig.borderWidth]);

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
    }, [activeSourceImage, addToast, stateRef, t, updateState]);

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
    }, [allInputImages, addToast, stateRef, updateState]);

    // Grid Presets handler
    const handleSetGridPreset = useCallback((preset: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1') => {
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
    }, [activeSourceImage, handlePerformSlice, updateState]);

    // Reset grid borders, bounds and dividers
    const handleResetGrid = useCallback(() => {
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
    }, [updateState, addToast]);

    return {
        isSlicing,
        isBatchSlicing,
        batchProgress,
        localBorderWidth,
        setLocalBorderWidth,
        commitBorderWidth,
        handlePerformSlice,
        handleBatchSliceAllToPackBuffer,
        handleSetGridPreset,
        handleResetGrid
    };
};
