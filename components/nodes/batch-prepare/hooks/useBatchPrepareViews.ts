import React, { useState, useCallback } from 'react';
import type { ToastType } from '../../../../types';
import { BatchPrepareNodeState, ViewSlotKey } from '../types';

interface UseBatchPrepareViewsOptions {
    state: BatchPrepareNodeState;
    updateActiveViewsAndSyncPack: (
        viewsUpdater: (prevViews: BatchPrepareNodeState['activeViews']) => BatchPrepareNodeState['activeViews'],
        mutedUpdater?: (prevMuted: BatchPrepareNodeState['mutedViews']) => BatchPrepareNodeState['mutedViews']
    ) => void;
    addToast: (message: string, type?: ToastType) => void;
    t: (key: string) => string;
}

export const useBatchPrepareViews = ({
    state,
    updateActiveViewsAndSyncPack,
    addToast,
    t
}: UseBatchPrepareViewsOptions) => {
    const [draggedSlot, setDraggedSlot] = useState<ViewSlotKey | null>(null);
    const [isDropOverSlot, setIsDropOverSlot] = useState<{ [key in ViewSlotKey]?: boolean }>({});

    // Auto-assign list of images to 4 views
    const handleAutoAssignToViews = useCallback((imgList: string[]) => {
        if (!imgList || imgList.length === 0) return;
        const newViews = {
            front: imgList[0] || null,
            back: imgList[1] || null,
            left: imgList[2] || null,
            right: imgList[3] || null,
        };
        updateActiveViewsAndSyncPack(() => newViews);
        addToast(t('batchprep.toast.viewsAssigned') || 'Ракурсы Front/Back/Left/Right заполнены', 'success');
    }, [updateActiveViewsAndSyncPack, addToast, t]);

    // View manipulation helpers
    const handleSetSingleView = useCallback((slot: ViewSlotKey, dataUrl: string | null) => {
        updateActiveViewsAndSyncPack(prev => ({
            ...prev,
            [slot]: dataUrl
        }));
    }, [updateActiveViewsAndSyncPack]);

    const handleToggleMuteView = useCallback((slot: ViewSlotKey) => {
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
    }, [updateActiveViewsAndSyncPack, addToast]);

    const handleSwapLeftRight = useCallback(() => {
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
    }, [updateActiveViewsAndSyncPack, addToast]);

    const handleSwapFrontBack = useCallback(() => {
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
    }, [updateActiveViewsAndSyncPack, addToast]);

    const handleRotateViews = useCallback(() => {
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
    }, [updateActiveViewsAndSyncPack, addToast]);

    const handleFlipView = useCallback(async (slot: ViewSlotKey) => {
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
    }, [state.activeViews, handleSetSingleView, addToast]);

    const handleClearAllViews = useCallback(() => {
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
    }, [updateActiveViewsAndSyncPack, addToast]);

    // Drag-and-drop onto a View Slot
    const handleDropOnViewSlot = useCallback((e: React.DragEvent, targetSlot: ViewSlotKey) => {
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
    }, [draggedSlot, state.activeViews, state.mutedViews, updateActiveViewsAndSyncPack, handleSetSingleView, addToast]);

    const filledActiveViewCount = [
        state.mutedViews?.front ? null : state.activeViews.front,
        state.mutedViews?.back ? null : state.activeViews.back,
        state.mutedViews?.left ? null : state.activeViews.left,
        state.mutedViews?.right ? null : state.activeViews.right
    ].filter(Boolean).length;

    return {
        draggedSlot,
        setDraggedSlot,
        isDropOverSlot,
        setIsDropOverSlot,
        filledActiveViewCount,
        handleAutoAssignToViews,
        handleSetSingleView,
        handleToggleMuteView,
        handleSwapLeftRight,
        handleSwapFrontBack,
        handleRotateViews,
        handleFlipView,
        handleClearAllViews,
        handleDropOnViewSlot
    };
};
