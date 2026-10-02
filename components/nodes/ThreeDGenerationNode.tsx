import React, { useState, useMemo, useRef, memo, useCallback } from 'react';
import type { NodeContentProps, Node, Connection } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../localization';
import { 
    isTripoEnabled, 
    getTripoApiKey, 
    generateImageTo3D, 
    generateMultiviewTo3D,
    useTripoEnabled,
    getTripoModelOption,
    DEFAULT_TRIPO_MODEL_VERSION,
    useTripoBalance,
    downloadTaskMetadataJson,
    importTripoTaskById,
    getTripoFaceLimitRange
} from '../../services/tripoService';
import { ThreeDNodeState, DEFAULT_STATE, ThreeDSlotType } from './three-d/types';
import { ThreeDHeader } from './three-d/ThreeDHeader';
import { ThreeDInputSlots } from './three-d/ThreeDInputSlots';
import { ThreeDViewport } from './three-d/ThreeDViewport';
import { ThreeDParametersPanel } from './three-d/ThreeDParametersPanel';
import { ThreeDFooter } from './three-d/ThreeDFooter';

export type { ThreeDNodeState };

export const ThreeDGenerationNode: React.FC<NodeContentProps> = memo(({
    node,
    onValueChange,
    addToast,
    getUpstreamNodeValues,
    setImageViewer,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();
    const connections: Connection[] = context?.connections || [];
    const isTripoConfigured = useTripoEnabled();
    const { balance: tripoBalance, loading: isBalanceLoading, refreshBalance } = useTripoBalance();
    const queueTaskIdRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Open full resolution image viewer modal helper
    const handleOpenImageViewer = useCallback((imgSrc: string | null | undefined, title: string) => {
        if (!imgSrc) return;
        const viewerFn = setImageViewer || context?.setImageViewer;
        if (viewerFn) {
            viewerFn({
                sources: [{ src: imgSrc, frameNumber: 1, prompt: title }],
                initialIndex: 0
            });
        }
    }, [setImageViewer, context]);

    // State parser
    const state = useMemo<ThreeDNodeState>(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            const model = parsed.modelVersion === 'default' ? DEFAULT_TRIPO_MODEL_VERSION : parsed.modelVersion || DEFAULT_TRIPO_MODEL_VERSION;
            const range = getTripoFaceLimitRange(model, parsed.quadMesh);
            // Old nodes defaulted to 2M even without Ultra mode. Migrate incompatible limits to Auto.
            if (parsed.faceLimit !== undefined && (parsed.faceLimit < range.min || parsed.faceLimit > range.max)) parsed.faceLimit = undefined;
            return {
                ...DEFAULT_STATE,
                ...parsed,
                multiview: {
                    ...DEFAULT_STATE.multiview,
                    ...(parsed.multiview || {})
                }
            };
        } catch {
            return DEFAULT_STATE;
        }
    }, [node.value]);

    const [activeTab, setActiveTab] = useState<'preview3d' | 'rendered'>(
        state.activeTab === 'rendered' ? 'rendered' : 'preview3d'
    );
    const [localProgress, setLocalProgress] = useState<number>(state.progress || 0);
    const [localStatusMsg, setLocalStatusMsg] = useState<string>(state.statusMessage || '');
    const [isGenerating, setIsGenerating] = useState<boolean>(state.status === 'running' || state.status === 'uploading' || state.status === 'queued');

    // Async callbacks must merge against the latest state, including the issued API task ID.
    const stateRef = useRef(state);
    stateRef.current = state;

    // Persistence helper
    const updateState = useCallback((updater: Partial<ThreeDNodeState> | ((prev: ThreeDNodeState) => Partial<ThreeDNodeState>)) => {
        const partial = typeof updater === 'function' ? updater(stateRef.current) : updater;
        const next = { ...stateRef.current, ...partial };
        stateRef.current = next;
        onValueChange(node.id, JSON.stringify(next));
    }, [node.id, onValueChange]);

    // Filter incoming connections to this node to avoid recalculating on canvas drags / other nodes resize
    const incomingConnections = useMemo(() => {
        return connections.filter((c: Connection) => c.toNodeId === node.id);
    }, [connections, node.id]);

    // Upstream Multi-Channel Images Resolution (from Batch Prepare Active Pack, Image Input, AI Editor, Note References)
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
                if (Array.isArray(item.multiview) && item.multiview.length > 0) {
                    formatted.push(...item.multiview.filter(Boolean));
                } else if (Array.isArray(item.activeViews) && item.activeViews.length > 0) {
                    formatted.push(...item.activeViews.filter(Boolean));
                } else if (item.base64ImageData) {
                    formatted.push(`data:${item.mimeType || 'image/png'};base64,${item.base64ImageData}`);
                } else if (item.url) {
                    formatted.push(item.url);
                } else if (item.image) {
                    formatted.push(item.image);
                } else if (item.outputImage) {
                    formatted.push(item.outputImage);
                } else if (item.renderedImage) {
                    formatted.push(item.renderedImage);
                }
            }
        });

        // Support up to 4 images: all images exceeding 4 are filtered out and skipped
        return formatted.filter(Boolean).slice(0, 4);
    }, [getUpstreamNodeValues, node.id, incomingConnections]);

    // Upstream Prompt / Text Resolution
    const upstreamPrompt = useMemo<string | null>(() => {
        if (getUpstreamNodeValues) {
            const list = getUpstreamNodeValues(node.id, 'text', undefined, false);
            const str = list.filter(item => typeof item === 'string' && !item.startsWith('data:image')).join(' ');
            if (str.trim()) return str.trim();
        }
        return null;
    }, [getUpstreamNodeValues, node.id, incomingConnections]);

    // Specific Multiview inspection from connected nodes (e.g. handle-specific connections front/back/left/right)
    const upstreamMultiview = useMemo<{ front: string | null, back: string | null, left: string | null, right: string | null } | null>(() => {
        if (!getUpstreamNodeValues) return null;
        
        const frontVals = getUpstreamNodeValues(node.id, 'front', undefined, false);
        const backVals = getUpstreamNodeValues(node.id, 'back', undefined, false);
        const leftVals = getUpstreamNodeValues(node.id, 'left', undefined, false);
        const rightVals = getUpstreamNodeValues(node.id, 'right', undefined, false);

        const formatVal = (raw: any): string | null => {
            if (!raw) return null;
            if (typeof raw === 'string') return raw;
            if (raw.base64ImageData) return `data:${raw.mimeType || 'image/png'};base64,${raw.base64ImageData}`;
            return raw.url || raw.image || null;
        };

        const front = formatVal(frontVals[0]);
        const back = formatVal(backVals[0]);
        const left = formatVal(leftVals[0]);
        const right = formatVal(rightVals[0]);

        if (front || back || left || right) {
            return { front, back, left, right };
        }
        return null;
    }, [getUpstreamNodeValues, node.id, incomingConnections]);

    const hasUpstreamImages = upstreamImages.length > 0 || Boolean(upstreamMultiview);

    // Slot mappings:
    // Slot 1 (Top-Left): Front
    // Slot 2 (Top-Right): Back
    // Slot 3 (Bottom-Left): Left
    // Slot 4 (Bottom-Right): Right
    const effectiveSingleImage = upstreamMultiview !== null ? (upstreamMultiview.front || upstreamMultiview.left || upstreamMultiview.back || upstreamMultiview.right) : (upstreamImages[0] || state.image);
    const effectiveFrontImage = upstreamMultiview !== null ? upstreamMultiview.front : (upstreamImages[0] || state.multiview.front || state.image);
    const effectiveBackImage = upstreamMultiview !== null ? upstreamMultiview.back : (upstreamImages[1] || state.multiview.back);
    const effectiveLeftImage = upstreamMultiview !== null ? upstreamMultiview.left : (upstreamImages[2] || state.multiview.left);
    const effectiveRightImage = upstreamMultiview !== null ? upstreamMultiview.right : (upstreamImages[3] || state.multiview.right);
    const effectivePrompt = upstreamPrompt || state.prompt;

    const isSingleConnected = Boolean(upstreamMultiview !== null ? (upstreamMultiview.front || upstreamMultiview.left || upstreamMultiview.back || upstreamMultiview.right) : upstreamImages[0]);
    const isFrontConnected = Boolean(upstreamMultiview !== null ? upstreamMultiview.front : upstreamImages[0]);
    const isBackConnected = Boolean(upstreamMultiview !== null ? upstreamMultiview.back : upstreamImages[1]);
    const isLeftConnected = Boolean(upstreamMultiview !== null ? upstreamMultiview.left : upstreamImages[2]);
    const isRightConnected = Boolean(upstreamMultiview !== null ? upstreamMultiview.right : upstreamImages[3]);

    // File Upload Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: ThreeDSlotType) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (slot === 'image') {
                updateState({ image: dataUrl });
            } else {
                updateState(prev => ({
                    multiview: {
                        ...prev.multiview,
                        [slot]: dataUrl
                    }
                }));
            }
            if (addToast) addToast(`Loaded image for ${slot.toUpperCase()}`, 'success');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Drag & Drop Handler (supports in-app custom image transfer and native OS files)
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, slot: ThreeDSlotType) => {
        e.preventDefault();
        e.stopPropagation();

        const appDragImg = e.dataTransfer.getData('application/prompt-modifier-drag-image') ||
                           e.dataTransfer.getData('text/uri-list') ||
                           e.dataTransfer.getData('text/plain');

        if (appDragImg && (appDragImg.startsWith('data:image') || appDragImg.startsWith('http') || appDragImg.startsWith('blob:'))) {
            if (slot === 'image') {
                updateState({ image: appDragImg });
            } else {
                updateState(prev => ({
                    multiview: {
                        ...prev.multiview,
                        [slot]: appDragImg
                    }
                }));
            }
            if (addToast) addToast(`Loaded image for ${slot.toUpperCase()}`, 'success');
            return;
        }

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (slot === 'image') {
                    updateState({ image: dataUrl });
                } else {
                    updateState(prev => ({
                        multiview: {
                            ...prev.multiview,
                            [slot]: dataUrl
                        }
                    }));
                }
                if (addToast) addToast(`Dropped image for ${slot.toUpperCase()}`, 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearSlot = (slot: ThreeDSlotType) => {
        if (slot === 'image') {
            updateState({ image: null });
        } else {
            updateState(prev => ({
                multiview: {
                    ...prev.multiview,
                    [slot]: null
                }
            }));
        }
    };

    const modelExtension = (url: string) => /\.(fbx|obj|stl|gltf)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() || 'glb';

    // Generation Execution with Task Manager, History, and Auto-Save Integration
    const handleGenerate = async () => {
        if (isGenerating) return;
        const apiKey = getTripoApiKey();
        if (!isTripoEnabled() || !apiKey) {
            if (addToast) addToast('Tripo AI API key is not configured or disabled. Please enable it in Settings.', 'error');
            return;
        }

        if (state.mode === 'image_to_3d') {
            if (!effectiveSingleImage) {
                if (addToast) addToast('Please provide an image for Image to 3D generation.', 'error');
                return;
            }
        } else {
            if (!effectiveFrontImage) {
                if (addToast) addToast('Front view image is required for Multiview to 3D generation.', 'error');
                return;
            }
        }

        const modelOption = getTripoModelOption(state.modelVersion);
        const modelLabel = modelOption?.label || state.modelVersion || DEFAULT_TRIPO_MODEL_VERSION;
        const promptDescription = effectivePrompt 
            ? effectivePrompt 
            : (state.mode === 'multiview_to_3d' ? '3D Model from Multiview' : '3D Model from Image');

        const currentIdx = state.generationIndex || 1;
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const cleanName = (node.title || promptDescription || 'Asset').slice(0, 30).replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');

        setIsGenerating(true);
        setLocalProgress(5);
        setLocalStatusMsg('Initializing task & uploading assets...');
        updateState({ status: 'uploading', progress: 5, statusMessage: 'Initializing task...', errorMessage: undefined, taskId: undefined });

        abortControllerRef.current = new AbortController();
        const currentAbortController = abortControllerRef.current;

        // Callback fired immediately when Task ID is issued by Tripo API
        const handleOnTaskCreated = (createdTaskId: string) => {
            updateState({
                taskId: createdTaskId,
                status: 'running',
                progress: 15,
                statusMessage: `Task ID: ${createdTaskId} (queued)`
            });

            // Immediately auto-save Task Metadata JSON to Downloads to prevent loss of Task ID
            if (state.autoSaveJson !== false) {
                try {
                    downloadTaskMetadataJson({
                        taskId: createdTaskId,
                        type: state.mode,
                        prompt: promptDescription,
                        modelVersion: state.modelVersion,
                        status: 'queued',
                        progress: 15,
                        createdAt: Date.now()
                    }, cleanName, currentIdx);
                    if (addToast) addToast(`Task ID [${createdTaskId.slice(0, 12)}...] сохранён в JSON!`, 'info');
                } catch (jsonErr) {
                    console.warn('Immediate Task ID JSON auto-save failed:', jsonErr);
                }
            }
        };

        // Core Generation Worker
        const executeGeneration = async (queueSignal: AbortSignal) => {
            const signal = AbortSignal.any([queueSignal, currentAbortController.signal]);
            signal.throwIfAborted();
            let result;
            if (state.mode === 'image_to_3d') {
                result = await generateImageTo3D({
                    image: effectiveSingleImage!,
                    texture: state.texture,
                    textureQuality: state.textureQuality,
                    textureAlignment: state.textureAlignment,
                    pbr: state.pbr,
                    quadMesh: state.quadMesh,
                    faceLimit: state.faceLimit,
                    modelSeed: state.modelSeed,
                    textureSeed: state.textureSeed,
                    modelVersion: state.modelVersion,
                    prompt: effectivePrompt
                }, (progress, statusText) => {
                    setLocalProgress(progress);
                    setLocalStatusMsg(`Status: ${statusText} (${progress}%)`);
                    updateState({ status: statusText === 'uploading' ? 'uploading' : statusText === 'queued' ? 'queued' : 'running', progress, statusMessage: `${statusText} (${progress}%)` });
                }, signal, handleOnTaskCreated);
            } else {
                result = await generateMultiviewTo3D({
                    views: {
                        front: effectiveFrontImage!,
                        back: effectiveBackImage || undefined,
                        left: effectiveLeftImage || undefined,
                        right: effectiveRightImage || undefined
                    },
                    texture: state.texture,
                    textureQuality: state.textureQuality,
                    textureAlignment: state.textureAlignment,
                    pbr: state.pbr,
                    quadMesh: state.quadMesh,
                    faceLimit: state.faceLimit,
                    modelSeed: state.modelSeed,
                    textureSeed: state.textureSeed,
                    modelVersion: state.modelVersion,
                    prompt: effectivePrompt
                }, (progress, statusText) => {
                    setLocalProgress(progress);
                    setLocalStatusMsg(`Status: ${statusText} (${progress}%)`);
                    updateState({ status: statusText === 'uploading' ? 'uploading' : statusText === 'queued' ? 'queued' : 'running', progress, statusMessage: `${statusText} (${progress}%)` });
                }, signal, handleOnTaskCreated);
            }

            if (result.status === 'success' && result.modelUrl) {
                // Update Node State
                updateState({
                    taskId: result.taskId,
                    status: 'success',
                    progress: 100,
                    statusMessage: '3D Generation Completed!',
                    modelUrl: result.modelUrl,
                    thumbnailUrl: result.thumbnailUrl,
                    renderedImageUrl: result.renderedImageUrl,
                    activeTab: 'preview3d',
                    generationIndex: currentIdx + 1
                });
                setActiveTab('preview3d');

                // 1. Auto-save completed Task Metadata JSON file
                if (state.autoSaveJson !== false) {
                    try {
                        downloadTaskMetadataJson({
                            taskId: result.taskId,
                            type: state.mode,
                            prompt: promptDescription,
                            modelVersion: state.modelVersion,
                            status: 'success',
                            progress: 100,
                            modelUrl: result.modelUrl,
                            thumbnailUrl: result.thumbnailUrl,
                            renderedImageUrl: result.renderedImageUrl,
                            createdAt: Date.now()
                        }, cleanName, currentIdx);
                    } catch (jsonSaveErr) {
                        console.warn('Auto-save Task JSON failed:', jsonSaveErr);
                    }
                }

                // 2. Auto-save .GLB model file to device if autoSave3d is enabled
                if (state.autoSave3d !== false) {
                    try {
                        const a = document.createElement('a');
                        a.href = result.modelUrl;
                        a.download = `3D_Model_${cleanName}_${currentIdx}_${dateStr}_${timeStr}.${modelExtension(result.modelUrl)}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        if (addToast) addToast('Downloading 3D model (' + modelExtension(result.modelUrl).toUpperCase() + ')', 'info');
                    } catch (saveErr) {
                        console.warn('Auto-save GLB failed:', saveErr);
                    }
                }

                // Add to Generation History (saving preview image and download link)
                const previewUrl = result.renderedImageUrl || result.thumbnailUrl || (state.mode === 'image_to_3d' ? effectiveSingleImage : effectiveFrontImage) || '';
                if (context?.addToHistory && previewUrl) {
                    try {
                        await context.addToHistory(
                            previewUrl,
                            `${modelLabel}: ${promptDescription}`,
                            state.modelVersion || DEFAULT_TRIPO_MODEL_VERSION,
                            {
                                aspectRatio: '1:1',
                                resolution: state.faceLimit ? `${state.faceLimit.toLocaleString()} faces` : 'Standard Mesh',
                                mediaType: '3d',
                                modelUrl: result.modelUrl,
                                thumbnailUrl: result.thumbnailUrl || result.renderedImageUrl,
                                generationMode: 'normal'
                            }
                        );
                    } catch (histErr) {
                        console.warn('Failed to add 3D model to history:', histErr);
                    }
                }

                if (addToast) addToast('3D Model generated and saved to History!', 'success');
                return result.modelUrl;
            } else {
                if (result.status === 'cancelled') throw new DOMException(result.error || 'Task cancelled', 'AbortError');
                throw new Error(result.error || 'Generation failed without output model.');
            }
        };

        // If Task Queue is available, enqueue to task manager for background execution & queue visibility
        if (context?.enqueueTask) {
            try {
                const queuedTaskId = context.enqueueTask({
                    nodeId: node.id,
                    nodeTitle: node.title || `3D Generation (${modelLabel})`,
                    prompt: `${modelLabel}: ${promptDescription}`,
                    type: 'three_d_gen',
                    execute: async (signal) => {
                        return await executeGeneration(signal);
                    },
                    onSuccess: async () => {
                        setIsGenerating(false);
                    },
                    onError: (err: any) => {
                        const isAbort = err?.name === 'AbortError' || err?.message === 'Aborted' || currentAbortController.signal.aborted;
                        const msg = err?.message || 'Failed to generate 3D model';
                        setIsGenerating(false);
                        setLocalStatusMsg(isAbort ? 'Generation cancelled' : `Error: ${msg}`);
                        updateState({
                            status: isAbort ? 'cancelled' : 'failed',
                            errorMessage: isAbort ? undefined : msg,
                            statusMessage: isAbort ? 'Cancelled' : msg
                        });
                        if (!isAbort && addToast) {
                            addToast(`Tripo 3D Error: ${msg}`, 'error');
                        }
                    }
                });

                queueTaskIdRef.current = queuedTaskId;
            } catch (queueErr) {
                console.warn('Task queue enqueue error, falling back to direct run:', queueErr);
                try {
                    await executeGeneration(currentAbortController.signal);
                } catch (err: any) {
                    const msg = err?.message || 'Failed to generate 3D model';
                    setLocalStatusMsg(`Error: ${msg}`);
                    const isAbort = err?.name === 'AbortError' || currentAbortController.signal.aborted;
                    updateState({ status: isAbort ? 'cancelled' : 'failed', errorMessage: isAbort ? undefined : msg, statusMessage: isAbort ? 'Cancelled' : msg });
                    if (err?.name !== 'AbortError' && !currentAbortController.signal.aborted && addToast) addToast(`Tripo 3D Error: ${msg}`, 'error');
                } finally {
                    setIsGenerating(false);
                    abortControllerRef.current = null;
                }
            }
        } else {
            try {
                await executeGeneration(currentAbortController.signal);
            } catch (err: any) {
                const msg = err?.message || 'Failed to generate 3D model';
                setLocalStatusMsg(`Error: ${msg}`);
                const isAbort = err?.name === 'AbortError' || currentAbortController.signal.aborted;
                updateState({ status: isAbort ? 'cancelled' : 'failed', errorMessage: isAbort ? undefined : msg, statusMessage: isAbort ? 'Cancelled' : msg });
                if (err?.name !== 'AbortError' && !currentAbortController.signal.aborted && addToast) addToast(`Tripo 3D Error: ${msg}`, 'error');
            } finally {
                setIsGenerating(false);
                abortControllerRef.current = null;
            }
        }
    };

    const [inputQueryTaskId, setInputQueryTaskId] = useState<string>('');
    const [isQueryingTaskId, setIsQueryingTaskId] = useState<boolean>(false);
    const [showTaskIdPanel, setShowTaskIdPanel] = useState<boolean>(false);

    const handleCopyTaskId = () => {
        if (!state.taskId) return;
        navigator.clipboard.writeText(state.taskId);
        if (addToast) addToast(`Task ID "${state.taskId}" скопирован в буфер!`, 'success');
    };

    const handleManualDownloadTaskJson = () => {
        if (!state.taskId && !state.modelUrl) {
            if (addToast) addToast('Нет активного Task ID для экспорта', 'info');
            return;
        }
        const promptDesc = effectivePrompt || (state.mode === 'multiview_to_3d' ? '3D Model from Multiview' : '3D Model from Image');
        const cleanName = (node.title || promptDesc || 'Asset').slice(0, 30).replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
        const file = downloadTaskMetadataJson({
            taskId: state.taskId,
            type: state.mode,
            prompt: promptDesc,
            modelVersion: state.modelVersion,
            status: state.status,
            progress: state.progress,
            modelUrl: state.modelUrl,
            thumbnailUrl: state.thumbnailUrl,
            renderedImageUrl: state.renderedImageUrl,
            createdAt: Date.now()
        }, cleanName, state.generationIndex);
        if (file && addToast) addToast(`Метаданные Task ID сохранены: ${file}`, 'success');
    };

    const handleQueryTaskById = async (overrideId?: string) => {
        const idToQuery = (overrideId || inputQueryTaskId || state.taskId || '').trim();
        if (!idToQuery) {
            if (addToast) addToast('Введите Task ID для запроса', 'info');
            return;
        }

        setIsQueryingTaskId(true);
        if (addToast) addToast(`Запрос данных задачи ${idToQuery.slice(0, 14)}...`, 'info');

        try {
            const task = await importTripoTaskById(idToQuery);
            if (task) {
                updateState({
                    taskId: task.taskId,
                    status: (task.status === 'unknown' ? 'failed' : task.status) as any,
                    progress: task.progress ?? (task.status === 'success' ? 100 : 0),
                    statusMessage: `Status: ${task.status}`,
                    modelUrl: task.modelUrl || state.modelUrl,
                    thumbnailUrl: task.thumbnailUrl || state.thumbnailUrl,
                    renderedImageUrl: task.renderedImageUrl || state.renderedImageUrl,
                    activeTab: task.modelUrl ? 'preview3d' : state.activeTab
                });
                if (task.modelUrl) setActiveTab('preview3d');
                if (addToast) addToast(`3D модель успешно получена по Task ID! (Статус: ${task.status})`, 'success');
                setInputQueryTaskId('');
            } else {
                throw new Error('Tripo API did not return data for this Task ID.');
            }
        } catch (err: any) {
            if (addToast) addToast(`Ошибка запроса Task ID: ${err?.message || err}`, 'error');
        } finally {
            setIsQueryingTaskId(false);
        }
    };

    const handleImportTaskJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const discoveredId = json.task_id || json.taskId || json.id;

            if (discoveredId && typeof discoveredId === 'string') {
                if (addToast) addToast(`Прочитан Task ID: ${discoveredId}. Запрашиваем Tripo API...`, 'info');
                await handleQueryTaskById(discoveredId);
            } else if (json.modelUrl || json.model_url) {
                updateState({
                    taskId: discoveredId || `imported_${Date.now()}`,
                    status: 'success',
                    progress: 100,
                    modelUrl: json.modelUrl || json.model_url,
                    thumbnailUrl: json.thumbnailUrl || json.renderedImageUrl || json.rendered_image_url,
                    renderedImageUrl: json.renderedImageUrl || json.rendered_image_url,
                    activeTab: 'preview3d'
                });
                setActiveTab('preview3d');
                if (addToast) addToast('3D Модель восстановлена из JSON файла!', 'success');
            } else {
                if (addToast) addToast('В выбранном JSON файле не найден task_id или modelUrl', 'error');
            }
        } catch (err: any) {
            if (addToast) addToast(`Ошибка чтения JSON: ${err?.message || err}`, 'error');
        } finally {
            e.target.value = '';
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (queueTaskIdRef.current && context?.cancelTask) {
            context.cancelTask(queueTaskIdRef.current);
            queueTaskIdRef.current = null;
        }
        setIsGenerating(false);
        updateState({ status: 'cancelled', statusMessage: 'Generation cancelled' });
        if (addToast) addToast('3D Generation cancelled', 'info');
    };

    const handleDownloadGlb = () => {
        if (!state.modelUrl) return;
        const a = document.createElement('a');
        a.href = state.modelUrl;
        a.download = `model_${state.taskId || Date.now()}.${modelExtension(state.modelUrl)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (addToast) addToast('Downloading 3D model...', 'info');
    };

    const handleCopyGlbUrl = () => {
        if (!state.modelUrl) return;
        navigator.clipboard.writeText(state.modelUrl);
        if (addToast) addToast('3D Model GLB URL copied to clipboard!', 'success');
    };

    const handleUnloadModel = () => {
        updateState({
            modelUrl: undefined,
            renderedImageUrl: undefined,
            thumbnailUrl: undefined,
            status: 'idle',
            progress: 0,
            statusMessage: ''
        });
        if (addToast) addToast('3D модель выгружена из памяти', 'info');
    };

    const hasIncomingConnections = incomingConnections.length > 0;
    const canBake = Boolean(hasUpstreamImages || effectiveFrontImage || effectiveSingleImage);

    const handleBakeAndDisconnectInput = useCallback(() => {
        const front = effectiveFrontImage;
        const back = effectiveBackImage;
        const left = effectiveLeftImage;
        const right = effectiveRightImage;
        const single = effectiveSingleImage;

        if (context?.setConnections) {
            context.setConnections(prev => prev.filter((c: Connection) => c.toNodeId !== node.id));
        }

        updateState({
            image: single || front || state.image,
            multiview: {
                front: front || null,
                back: back || null,
                left: left || null,
                right: right || null
            }
        });

        const count = [front, back, left, right].filter(Boolean).length || (single ? 1 : 0);
        if (addToast) {
            addToast(
                hasIncomingConnections
                    ? `Соединительные линии отключены. Встроено ${count} изображений в 3D ноду.`
                    : `Изображения (${count}) встроены в 3D ноду.`,
                'success'
            );
        }
    }, [effectiveFrontImage, effectiveBackImage, effectiveLeftImage, effectiveRightImage, effectiveSingleImage, context, node.id, updateState, addToast, hasIncomingConnections, state.image]);

    const apiKey = getTripoApiKey();
    const isApiKeyMissing = !isTripoEnabled() || !apiKey;

    return (
        <div className="flex flex-col h-full w-full bg-gray-900/90 text-gray-200 text-xs overflow-visible select-none relative">
            {/* Header: Modes, Connections Bake, Tripo Balance, Tab selector */}
            <ThreeDHeader
                isApiKeyMissing={isApiKeyMissing}
                mode={state.mode}
                onModeChange={(newMode) => updateState({ mode: newMode })}
                onBakeAndDisconnect={handleBakeAndDisconnectInput}
                hasIncomingConnections={hasIncomingConnections}
                canBake={canBake}
                isTripoConfigured={isTripoConfigured}
                tripoBalance={tripoBalance}
                isBalanceLoading={isBalanceLoading}
                onRefreshBalance={refreshBalance}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onOpenDebugConsole={() => context?.setIsDebugConsoleOpen(true)}
            />

            {/* Main Content: Left Slots Pane + Right 3D Viewport Pane */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                <ThreeDInputSlots
                    mode={state.mode}
                    hasUpstreamImages={hasUpstreamImages}
                    upstreamImagesCount={upstreamImages.length}
                    hasIncomingConnections={hasIncomingConnections}
                    canBake={canBake}
                    onBakeAndDisconnect={handleBakeAndDisconnectInput}
                    effectiveSingleImage={effectiveSingleImage}
                    effectiveFrontImage={effectiveFrontImage}
                    effectiveBackImage={effectiveBackImage}
                    effectiveLeftImage={effectiveLeftImage}
                    effectiveRightImage={effectiveRightImage}
                    isSingleConnected={isSingleConnected}
                    isFrontConnected={isFrontConnected}
                    isBackConnected={isBackConnected}
                    isLeftConnected={isLeftConnected}
                    isRightConnected={isRightConnected}
                    onFileUpload={handleFileUpload}
                    onDrop={handleDrop}
                    onClearSlot={handleClearSlot}
                    onOpenImageViewer={handleOpenImageViewer}
                    prompt={state.prompt}
                    onPromptChange={(prompt) => updateState({ prompt })}
                />

                <ThreeDViewport
                    activeTab={activeTab}
                    modelUrl={state.modelUrl}
                    thumbnailUrl={state.thumbnailUrl}
                    renderedImageUrl={state.renderedImageUrl}
                    autoRotate={state.autoRotate}
                    modelBg={state.modelBg}
                    taskId={state.taskId}
                    onToggleAutoRotate={() => updateState(prev => ({ autoRotate: !prev.autoRotate }))}
                    onDownloadGlb={handleDownloadGlb}
                    onCopyGlbUrl={handleCopyGlbUrl}
                    onUnloadModel={handleUnloadModel}
                />
            </div>

            {/* Dedicated Parameters Panel: Model Select, Texture & Mesh Quality, Toggles, Task ID / JSON Safety */}
            <ThreeDParametersPanel
                nodeId={node.id}
                state={state}
                isGenerating={isGenerating}
                onUpdateState={updateState}
                inputQueryTaskId={inputQueryTaskId}
                setInputQueryTaskId={setInputQueryTaskId}
                isQueryingTaskId={isQueryingTaskId}
                showTaskIdPanel={showTaskIdPanel}
                setShowTaskIdPanel={setShowTaskIdPanel}
                onCopyTaskId={handleCopyTaskId}
                onManualDownloadTaskJson={handleManualDownloadTaskJson}
                onQueryTaskById={handleQueryTaskById}
                onImportTaskJsonFile={handleImportTaskJsonFile}
            />

            {/* Bottom Actions & Status Footer */}
            <ThreeDFooter
                isGenerating={isGenerating}
                localStatusMsg={localStatusMsg}
                localProgress={localProgress}
                errorMessage={state.errorMessage}
                onDismissError={() => updateState({ errorMessage: undefined })}
                onOpenDebugConsole={() => context?.setIsDebugConsoleOpen(true)}
                modelUrl={state.modelUrl}
                taskId={state.taskId}
                isApiKeyMissing={isApiKeyMissing}
                onDownloadGlb={handleDownloadGlb}
                onCancel={handleCancel}
                onGenerate={handleGenerate}
            />
        </div>
    );
});
