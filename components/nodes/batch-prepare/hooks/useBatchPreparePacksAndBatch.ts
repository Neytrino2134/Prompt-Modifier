import React, { useMemo, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { NodeType } from '../../../../types';
import type { Connection, Node, ToastType } from '../../../../types';
import { run3DBatchGeneration } from '../../../../services/tripoBatchService';
import { isTripoEnabled, getTripoApiKey, getTripoModelVersion } from '../../../../services/tripoService';
import { BatchPrepareNodeState, BatchPreparePack, ViewSlotKey } from '../types';

interface UseBatchPreparePacksAndBatchOptions {
    nodeId: string;
    state: BatchPrepareNodeState;
    stateRef: React.MutableRefObject<BatchPrepareNodeState>;
    updateState: (updater: Partial<BatchPrepareNodeState> | ((prev: BatchPrepareNodeState) => Partial<BatchPrepareNodeState>)) => void;
    addToast: (message: string, type?: ToastType) => void;
    nodes?: Node[];
    connections?: Connection[];
    activeTabId?: string;
    handleValueChange?: (nodeId: string, value: string) => void;
    addToHistory?: (imageUrl: string, prompt: string, model: string, meta?: any) => void;
}

export const useBatchPreparePacksAndBatch = ({
    nodeId,
    state,
    stateRef,
    updateState,
    addToast,
    nodes,
    connections,
    activeTabId,
    handleValueChange,
    addToHistory
}: UseBatchPreparePacksAndBatchOptions) => {
    const activePack = useMemo(() => {
        if (!state.activePackId) return null;
        return state.packs.find(p => p.id === state.activePackId) || null;
    }, [state.activePackId, state.packs]);

    // Pack Buffer Management
    const handleBaseNameChange = useCallback((newBaseName: string) => {
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
    }, [updateState]);

    const handleClearAllPacks = useCallback(() => {
        if (stateRef.current.packs.length === 0) return;
        updateState({
            packs: [],
            activePackId: null
        });
        addToast('Все паки очищены из буфера', 'info');
    }, [stateRef, updateState, addToast]);

    const handleSaveCurrentToPack = useCallback(() => {
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
    }, [state.activeViews, state.mutedViews, state.packs.length, stateRef, updateState, addToast]);

    const handleSelectActivePack = useCallback((packId: string) => {
        const found = state.packs.find(p => p.id === packId);
        if (!found) return;

        updateState({
            activePackId: packId,
            activeViews: { ...found.views },
            mutedViews: { ...(found.mutedViews || {}) }
        });

        addToast(`Выбран "${found.name}" (Виды загружены в Редактор)`, 'info');
    }, [state.packs, updateState, addToast]);

    const handleDeletePack = useCallback((packId: string) => {
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
    }, [updateState, addToast]);

    const handleDuplicatePack = useCallback((pack: BatchPreparePack) => {
        const baseName = (stateRef.current.assetBaseName !== undefined ? stateRef.current.assetBaseName : 'Asset_Name').trim() || 'Asset_Name';
        const padIndex = String(state.packs.length + 1).padStart(2, '0');
        const dup: BatchPreparePack = {
            ...pack,
            id: `pack-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `${baseName}_${padIndex}`,
            createdAt: Date.now(),
            enabled: pack.enabled !== false
        };
        updateState(prev => ({
            packs: [...prev.packs, dup],
            activePackId: dup.id,
            activeViews: { ...dup.views },
            mutedViews: { ...(dup.mutedViews || {}) }
        }));
        addToast(`Создана копия пака "${dup.name}"`, 'success');
    }, [state.packs.length, stateRef, updateState, addToast]);

    // Pack Selection / Activation Handlers
    const handleTogglePackEnabled = useCallback((packId: string, enabled: boolean) => {
        updateState(prev => ({
            packs: prev.packs.map(p => p.id === packId ? { ...p, enabled } : p)
        }));
    }, [updateState]);

    const handleSelectAllPacks = useCallback(() => {
        updateState(prev => ({
            packs: prev.packs.map(p => ({ ...p, enabled: true }))
        }));
        addToast('Все паки активированы', 'info');
    }, [updateState, addToast]);

    const handleDeselectAllPacks = useCallback(() => {
        updateState(prev => ({
            packs: prev.packs.map(p => ({ ...p, enabled: false }))
        }));
        addToast('Выбор со всех паков снят', 'info');
    }, [updateState, addToast]);

    const handleInvertPackSelection = useCallback(() => {
        updateState(prev => ({
            packs: prev.packs.map(p => ({ ...p, enabled: p.enabled === false ? true : false }))
        }));
        addToast('Выбор паков инвертирован', 'info');
    }, [updateState, addToast]);

    const handleSelectPackRange = useCallback((rangeStr: string) => {
        const total = stateRef.current.packs.length;
        if (total === 0) return;

        const selectedIndices = new Set<number>();
        const parts = rangeStr.split(/[,;\s]+/).filter(Boolean);

        parts.forEach(part => {
            if (part.includes('-')) {
                const [startStr, endStr] = part.split('-');
                const start = parseInt(startStr.trim(), 10);
                const end = parseInt(endStr.trim(), 10);
                if (!isNaN(start) && !isNaN(end)) {
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    for (let i = min; i <= max; i++) {
                        if (i >= 1 && i <= total) {
                            selectedIndices.add(i - 1);
                        }
                    }
                }
            } else {
                const num = parseInt(part.trim(), 10);
                if (!isNaN(num) && num >= 1 && num <= total) {
                    selectedIndices.add(num - 1);
                }
            }
        });

        if (selectedIndices.size === 0) {
            addToast('Некорректный диапазон (например: 3-7 или 1-3, 5)', 'warning');
            return;
        }

        updateState(prev => ({
            packs: prev.packs.map((p, idx) => ({
                ...p,
                enabled: selectedIndices.has(idx)
            }))
        }));
        addToast(`Выбрано паков: ${selectedIndices.size} по диапазону "${rangeStr}"`, 'success');
    }, [stateRef, updateState, addToast]);

    const handleDownloadPackZip = useCallback(async (pack: BatchPreparePack) => {
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
    }, [addToast]);

    const handleDownloadAllPacksZip = useCallback(async () => {
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
    }, [state.packs, addToast]);

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
        const allPacks = stateRef.current.packs || [];
        const currentPacks = allPacks.filter(p => p.enabled !== false);
        if (currentPacks.length === 0) {
            addToast('Все паки деактивированы или в буфере нет паков для 3D Batch генерации', 'warning');
            return;
        }

        const apiKey = getTripoApiKey();
        if (!isTripoEnabled() || !apiKey) {
            addToast('Необходимо включить Tripo AI и указать API ключ в Настройках', 'error');
            return;
        }

        // Find target downstream 3D Generation node or any 3D node on canvas
        const downstream3DNodes = (nodes || []).filter(n => {
            if (n.type !== NodeType.THREE_D_GENERATOR) return false;
            return connections?.some(c => c.fromNodeId === nodeId && c.toNodeId === n.id);
        });
        const target3DNode = downstream3DNodes[0] || (nodes || []).find(n => n.type === NodeType.THREE_D_GENERATOR);

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
                nodeId: target3DNode?.id || nodeId,
                tabId: activeTabId,
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
                    if (target3DNode && handleValueChange) {
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
                            handleValueChange(target3DNode.id, JSON.stringify(next3d));
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
                addToHistory
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
    }, [addToast, nodes, connections, activeTabId, handleValueChange, addToHistory, nodeId, stateRef, updateState]);

    return {
        activePack,
        handleBaseNameChange,
        handleClearAllPacks,
        handleSaveCurrentToPack,
        handleSelectActivePack,
        handleDeletePack,
        handleDuplicatePack,
        handleTogglePackEnabled,
        handleSelectAllPacks,
        handleDeselectAllPacks,
        handleInvertPackSelection,
        handleSelectPackRange,
        handleDownloadPackZip,
        handleDownloadAllPacksZip,
        handleStart3DBatch,
        handleStop3DBatch
    };
};
