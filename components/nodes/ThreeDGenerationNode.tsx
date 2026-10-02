import React, { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import type { NodeContentProps, Node, Connection } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../localization';
import CustomSelect from '../CustomSelect';
import { CustomToggle } from '../CustomToggle';
import { ChevronLeft, ChevronRight, Box, Sparkles, Zap, Layers, Cpu, Download, Terminal, Link, Unlink, RotateCcw, X } from 'lucide-react';
import { 
    HeadFrontIcon, 
    HeadLeftIcon, 
    HeadRightIcon, 
    HeadBackIcon 
} from '../icons/AppIcons';
import { 
    isTripoEnabled, 
    getTripoApiKey, 
    getTripoModelVersion,
    generateImageTo3D, 
    generateMultiviewTo3D,
    TripoTextureQuality,
    TripoTextureAlignment,
    useTripoEnabled,
    TRIPO_MODEL_OPTIONS,
    TripoModelOption,
    getTripoModelOption,
    DEFAULT_TRIPO_MODEL_VERSION,
    useTripoBalance,
    downloadTaskMetadataJson,
    importTripoTaskById,
    getTripoTaskStatus
} from '../../services/tripoService';
import { Copy, Check, FileJson, RefreshCw, KeyRound, ArrowDownCircle } from 'lucide-react';
import { OptimizedThumbnail } from './image-editor/OptimizedThumbnail';

export interface ThreeDNodeState {
    mode: 'image_to_3d' | 'multiview_to_3d';
    modelVersion: string;
    texture: boolean;
    textureQuality: TripoTextureQuality;
    textureAlignment: TripoTextureAlignment;
    pbr: boolean;
    quadMesh: boolean;
    faceLimit?: number;
    modelSeed?: number;
    textureSeed?: number;
    prompt: string;
    image: string | null;
    multiview: {
        front: string | null;
        left: string | null;
        back: string | null;
        right: string | null;
    };
    taskId?: string;
    generationIndex?: number;
    status: 'idle' | 'uploading' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
    progress: number;
    statusMessage?: string;
    errorMessage?: string;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    activeTab: 'preview3d' | 'rendered';
    autoRotate: boolean;
    wireframe: boolean;
    modelBg: string;
    autoSave3d: boolean;
    autoSaveJson: boolean;
}

const DEFAULT_STATE: ThreeDNodeState = {
    mode: 'multiview_to_3d',
    modelVersion: DEFAULT_TRIPO_MODEL_VERSION,
    texture: true,
    textureQuality: 'standard',
    textureAlignment: 'original_image',
    pbr: false,
    quadMesh: false,
    faceLimit: 2000000,
    modelSeed: undefined,
    textureSeed: undefined,
    prompt: '',
    image: null,
    multiview: {
        front: null,
        left: null,
        back: null,
        right: null
    },
    generationIndex: 1,
    status: 'idle',
    progress: 0,
    activeTab: 'preview3d',
    autoRotate: true,
    wireframe: false,
    modelBg: '#1e293b',
    autoSave3d: true,
    autoSaveJson: true
};

const getModelOptionIcon = (option: TripoModelOption) => {
    if (option.isFlagship) {
        return (
            <div className="flex -space-x-0.5 items-center">
                <Box className="w-3.5 h-3.5 text-purple-400" />
                <Sparkles className="w-2.5 h-2.5 text-yellow-300 relative -top-1 -right-0.5" />
            </div>
        );
    }
    if (option.badge === 'Precision') {
        return (
            <div className="flex -space-x-0.5 items-center">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <Zap className="w-2.5 h-2.5 text-cyan-200 relative -top-1" />
            </div>
        );
    }
    if (option.badge === 'Fast') {
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (option.badge === 'Quality') {
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    }
    return <Box className="w-3.5 h-3.5 text-gray-400" />;
};

export const ThreeDGenerationNode: React.FC<NodeContentProps> = memo(({
    node,
    onValueChange,
    addToast,
    onDownloadImageFromUrl,
    getUpstreamNodeValues,
    getFullSizeImage,
    setFullSizeImage,
    setImageViewer,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();
    const connections: Connection[] = context?.connections || [];
    const allNodes: Node[] = context?.nodes || [];
    const isTripoConfigured = useTripoEnabled();
    const { balance: tripoBalance, loading: isBalanceLoading, refreshBalance } = useTripoBalance();
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputSingleRef = useRef<HTMLInputElement>(null);
    const fileInputFrontRef = useRef<HTMLInputElement>(null);
    const fileInputBackRef = useRef<HTMLInputElement>(null);
    const fileInputLeftRef = useRef<HTMLInputElement>(null);
    const fileInputRightRef = useRef<HTMLInputElement>(null);

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

    // Persistence helper
    const updateState = (updater: Partial<ThreeDNodeState> | ((prev: ThreeDNodeState) => Partial<ThreeDNodeState>)) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        const next = { ...state, ...partial };
        onValueChange(node.id, JSON.stringify(next));
    };

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

    // Model Navigation Helpers (Analogous to AI Image Editor GenerationControls)
    const modelIndex = useMemo(() => {
        return TRIPO_MODEL_OPTIONS.findIndex(m => m.value === state.modelVersion);
    }, [state.modelVersion]);

    const currentModelOption = useMemo(() => {
        return getTripoModelOption(state.modelVersion);
    }, [state.modelVersion]);

    const handlePrevModel = () => {
        if (modelIndex > 0) {
            updateState({ modelVersion: TRIPO_MODEL_OPTIONS[modelIndex - 1].value });
        }
    };

    const handleNextModel = () => {
        if (modelIndex !== -1 && modelIndex < TRIPO_MODEL_OPTIONS.length - 1) {
            updateState({ modelVersion: TRIPO_MODEL_OPTIONS[modelIndex + 1].value });
        }
    };

    // File Upload Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 'image' | 'front' | 'back' | 'left' | 'right') => {
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
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, slot: 'image' | 'front' | 'back' | 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();

        // 1. In-app custom drag data (from BatchPrepareNode, ImageInputNode, CharacterNode, etc.)
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

        // 2. Native file drop from OS file manager or browser
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

    const handleClearSlot = (slot: 'image' | 'front' | 'back' | 'left' | 'right') => {
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

    // Generation Execution with Task Manager, History, and Auto-Save Integration
    const handleGenerate = async () => {
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
        updateState({ status: 'uploading', progress: 5, statusMessage: 'Initializing task...', errorMessage: undefined });

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
        const executeGeneration = async (signal: AbortSignal) => {
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
                    updateState({ status: 'running', progress, statusMessage: `${statusText} (${progress}%)` });
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
                    updateState({ status: 'running', progress, statusMessage: `${statusText} (${progress}%)` });
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
                        a.download = `3D_Model_${cleanName}_${currentIdx}_${dateStr}_${timeStr}.glb`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        if (addToast) addToast(t('threed.autoSavedGlb') || `3D модель 3D_Model_${cleanName}_${currentIdx}_...glb сохранена`, 'success');
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
                                modelUrl: result.modelUrl, // Direct download link for 3D GLB model
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

                updateState({ taskId: queuedTaskId });
            } catch (queueErr) {
                console.warn('Task queue enqueue error, falling back to direct run:', queueErr);
                // Fallback direct execution
                try {
                    await executeGeneration(currentAbortController.signal);
                } catch (err: any) {
                    const msg = err?.message || 'Failed to generate 3D model';
                    setLocalStatusMsg(`Error: ${msg}`);
                    updateState({ status: 'failed', errorMessage: msg, statusMessage: msg });
                    if (addToast) addToast(`Tripo 3D Error: ${msg}`, 'error');
                } finally {
                    setIsGenerating(false);
                    abortControllerRef.current = null;
                }
            }
        } else {
            // Direct execution if no context
            try {
                await executeGeneration(currentAbortController.signal);
            } catch (err: any) {
                const msg = err?.message || 'Failed to generate 3D model';
                setLocalStatusMsg(`Error: ${msg}`);
                updateState({ status: 'failed', errorMessage: msg, statusMessage: msg });
                if (addToast) addToast(`Tripo 3D Error: ${msg}`, 'error');
            } finally {
                setIsGenerating(false);
                abortControllerRef.current = null;
            }
        }
    };

    const [inputQueryTaskId, setInputQueryTaskId] = useState<string>('');
    const [isQueryingTaskId, setIsQueryingTaskId] = useState<boolean>(false);
    const [showTaskIdPanel, setShowTaskIdPanel] = useState<boolean>(false);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

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
                // Restore direct URLs if present in JSON
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
        if (state.taskId && context?.cancelTask) {
            context.cancelTask(state.taskId);
        }
        setIsGenerating(false);
        updateState({ status: 'cancelled', statusMessage: 'Generation cancelled' });
        if (addToast) addToast('3D Generation cancelled', 'info');
    };

    const handleDownloadGlb = () => {
        if (!state.modelUrl) return;
        const a = document.createElement('a');
        a.href = state.modelUrl;
        a.download = `model_${state.taskId || Date.now()}.glb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (addToast) addToast('Downloading GLB file...', 'info');
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

    const modelViewerRef = useRef<any>(null);

    useEffect(() => {
        if (modelViewerRef.current) {
            try {
                if (state.autoRotate) {
                    modelViewerRef.current.setAttribute('auto-rotate', '');
                    modelViewerRef.current.autoRotate = true;
                } else {
                    modelViewerRef.current.removeAttribute('auto-rotate');
                    modelViewerRef.current.autoRotate = false;
                }
            } catch (e) {
                console.warn('Sync auto-rotate error:', e);
            }
        }
    }, [state.autoRotate, state.modelUrl]);

    const apiKey = getTripoApiKey();
    const isApiKeyMissing = !isTripoEnabled() || !apiKey;

    return (
        <div className="flex flex-col h-full w-full bg-gray-900/90 text-gray-200 text-xs overflow-visible select-none relative">
            {/* API Warning Notice if not enabled or no key */}
            {isApiKeyMissing && (
                <div className="bg-amber-950/80 border-b border-amber-600/40 p-2 px-3 text-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{t('threed.apiKeyMissing') || 'Tripo AI API key is not configured or disabled in Settings.'}</span>
                    </div>
                </div>
            )}

            {/* Mode & Navigation Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-b border-gray-700/60">
                {/* Mode Selector & Chain Link/Disconnect button */}
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-gray-900/90 p-0.5 rounded-md border border-gray-700/50">
                        <button
                            onClick={() => updateState({ mode: 'multiview_to_3d' })}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                state.mode === 'multiview_to_3d'
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                            title="Multiview images (Front, Back, Left, Right) to 3D model"
                        >
                            {t('threed.mode.multiviewTo3d') || 'Multiview to 3D (4 Views)'}
                        </button>
                        <button
                            onClick={() => updateState({ mode: 'image_to_3d' })}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                state.mode === 'image_to_3d'
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                            title="Single image to 3D model"
                        >
                            {t('threed.mode.imageTo3d') || 'Image to 3D (1 Image)'}
                        </button>
                    </div>

                    {/* Chain/Unlink Icon: Disconnect connecting lines & embed images into 3D node */}
                    <button
                        type="button"
                        onClick={handleBakeAndDisconnectInput}
                        disabled={!hasUpstreamImages && !effectiveFrontImage && !effectiveSingleImage}
                        className={`p-1.5 rounded transition-all flex items-center justify-center border ${
                            hasIncomingConnections
                                ? 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/70 text-cyan-300 shadow-sm'
                                : 'bg-gray-900/60 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}
                        title={
                            hasIncomingConnections
                                ? "Разорвать входящие соединительные линии и встроить (запечь) изображения в 3D ноду"
                                : "Встроить текущие входные изображения в 3D ноду"
                        }
                    >
                        {hasIncomingConnections ? <Unlink className="w-3.5 h-3.5 text-cyan-300" /> : <Link className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* View Switcher: 3D Interactive Preview vs 2D Render */}
                <div className="flex items-center space-x-1">
                    {/* Tripo Token / Credit Balance Badge */}
                    {isTripoConfigured && tripoBalance !== null && (
                        <button
                            type="button"
                            onClick={() => refreshBalance()}
                            disabled={isBalanceLoading}
                            className="flex items-center space-x-1 px-2 py-1 bg-yellow-950/70 border border-yellow-600/50 hover:border-yellow-400/80 rounded text-yellow-300 hover:text-yellow-100 hover:bg-yellow-900/80 transition-all text-[11px] font-mono shadow-sm"
                            title="Баланс токенов Tripo 3D • Нажмите для обновления"
                        >
                            <Zap className={`w-3 h-3 text-yellow-400 ${isBalanceLoading ? 'animate-spin' : ''}`} />
                            <span className="font-semibold">{tripoBalance}</span>
                            <span className="text-[10px] text-yellow-400/80">cr</span>
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('preview3d')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${
                            activeTab === 'preview3d'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                        </svg>
                        <span>{t('threed.tab.preview3d') || '3D Preview'}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('rendered')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${
                            activeTab === 'rendered'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2}></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <path d="M21 15l-5-5L5 21" strokeWidth={2}></path>
                        </svg>
                        <span>{t('threed.tab.rendered') || 'Render 2D'}</span>
                    </button>

                    {/* Logs & Diagnostics Console Button */}
                    <button
                        type="button"
                        onClick={() => context?.setIsDebugConsoleOpen(true)}
                        className="px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-cyan-300 hover:bg-gray-700/50 flex items-center space-x-1 transition-colors border border-gray-700/40"
                        title="Открыть системные логи и консоль отладки"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Логи</span>
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                {/* Left Pane: Image Input Slots */}
                <div className="w-full md:w-1/2 p-3 flex flex-col space-y-3 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-700/50">
                    <div className="flex items-center justify-between text-gray-300 font-semibold text-xs">
                        <div className="flex items-center space-x-2">
                            <span>
                                {state.mode === 'image_to_3d' 
                                    ? (t('threed.mode.imageTo3d') || 'Input Image (1 Slot)') 
                                    : (t('threed.mode.multiviewTo3d') || 'Multiview to 3D (4 Views)')}
                            </span>
                            {/* Chain/Unlink Icon inside section header */}
                            <button
                                type="button"
                                onClick={handleBakeAndDisconnectInput}
                                disabled={!hasUpstreamImages && !effectiveFrontImage && !effectiveSingleImage}
                                className={`p-1 rounded transition-all flex items-center justify-center border ${
                                    hasIncomingConnections
                                        ? 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-500/80 text-cyan-300 shadow-sm'
                                        : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-400 hover:text-gray-200'
                                }`}
                                title={
                                    hasIncomingConnections
                                        ? "Разорвать входящие соединительные линии и встроить (запечь) изображения в ноду"
                                        : "Встроить текущие изображения в ноду"
                                }
                            >
                                {hasIncomingConnections ? <Unlink className="w-3.5 h-3.5 text-cyan-300" /> : <Link className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {hasUpstreamImages ? (
                            <span className="text-[10px] text-cyan-300 font-medium bg-cyan-950/80 border border-cyan-700/70 px-2 py-0.5 rounded shadow-sm">
                                {`Multi-Channel: ${upstreamImages.length}/4 views`}
                            </span>
                        ) : state.mode === 'multiview_to_3d' ? (
                            <span className="text-[10px] text-cyan-400 font-normal">{t('threed.frontRequired') || 'Front view is required'}</span>
                        ) : null}
                    </div>

                    {/* Single Image Mode Input Frame */}
                    {state.mode === 'image_to_3d' && (
                        <div 
                            className="relative flex-1 min-h-[180px] bg-gray-950/60 rounded-lg border-2 border-dashed border-gray-700 hover:border-cyan-500/80 transition-colors flex flex-col items-center justify-center p-3 group overflow-hidden"
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => handleDrop(e, 'image')}
                        >
                            {effectiveSingleImage ? (
                                <>
                                    <div 
                                        onClick={() => handleOpenImageViewer(effectiveSingleImage, 'Input Image')}
                                        className="cursor-pointer max-h-full max-w-full flex items-center justify-center relative group/preview"
                                        title="Нажмите для просмотра в полном разрешении"
                                    >
                                        <OptimizedThumbnail 
                                            src={effectiveSingleImage} 
                                            size={128}
                                            alt="Input 3D Source" 
                                            className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all"
                                        />
                                    </div>
                                    {isSingleConnected && (
                                        <div className="absolute top-2 left-2 bg-cyan-900/90 text-cyan-200 text-[10px] px-2 py-0.5 rounded border border-cyan-500/50">
                                            {t('threed.connectedFromNode') || 'Connected Multi-Image'}
                                        </div>
                                    )}
                                    {!isSingleConnected && (
                                        <button
                                            onClick={() => handleClearSlot('image')}
                                            className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-red-400 hover:text-red-200 rounded-md border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title={t('threed.clearSlot') || 'Clear image'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div 
                                    className="cursor-pointer flex flex-col items-center justify-center text-gray-400 text-center space-y-2"
                                    onClick={() => fileInputSingleRef.current?.click()}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-medium text-gray-200">{t('threed.singleImageUpload') || 'Click to upload or drag & drop'}</p>
                                        <p className="text-[10px] text-gray-400">{t('threed.singleImageHint') || 'PNG, JPG or WebP (Single Object on clean background)'}</p>
                                    </div>
                                </div>
                            )}
                            <input 
                                ref={fileInputSingleRef} 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, 'image')} 
                            />
                        </div>
                    )}

                    {/* Multiview 4-Slot Grid: Top row (Front, Back), Bottom row (Left, Right) */}
                    {state.mode === 'multiview_to_3d' && (
                        <div className="grid grid-cols-2 gap-2 flex-1 min-h-[180px]">
                            {/* Top-Left: Front View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveFrontImage ? 'border-cyan-500/70' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'front')}
                            >
                                <div className="absolute top-1 left-2 flex items-center space-x-1 z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-cyan-800/60">
                                        {t('threed.front') || 'Front (Required)'}
                                    </span>
                                    {isFrontConnected && (
                                        <span className="text-[9px] bg-cyan-900/90 text-cyan-200 px-1 py-0.2 rounded border border-cyan-500/50">
                                            #1
                                        </span>
                                    )}
                                </div>
                                {effectiveFrontImage ? (
                                    <>
                                        <div 
                                            onClick={() => handleOpenImageViewer(effectiveFrontImage, 'Front View')}
                                            className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                            title="Нажмите для просмотра в полном разрешении"
                                        >
                                            <OptimizedThumbnail src={effectiveFrontImage} size={128} alt="Front View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                        </div>
                                        {!isFrontConnected && (
                                            <button
                                                onClick={() => handleClearSlot('front')}
                                                className="absolute top-1 right-1 p-1 bg-gray-900/80 text-red-400 hover:text-red-200 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div 
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                                        onClick={() => fileInputFrontRef.current?.click()}
                                    >
                                        <HeadFrontIcon className="h-9 w-9 mb-1 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                        <span className="text-[10px] font-medium">{t('threed.addFrontView') || 'Add Front View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputFrontRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                            </div>

                            {/* Top-Right: Back View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveBackImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'back')}
                            >
                                <div className="absolute top-1 left-2 flex items-center space-x-1 z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800">
                                        {t('threed.back') || 'Back View'}
                                    </span>
                                    {isBackConnected && (
                                        <span className="text-[9px] bg-cyan-900/90 text-cyan-200 px-1 py-0.2 rounded border border-cyan-500/50">
                                            #2
                                        </span>
                                    )}
                                </div>
                                {effectiveBackImage ? (
                                    <>
                                        <div 
                                            onClick={() => handleOpenImageViewer(effectiveBackImage, 'Back View')}
                                            className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                            title="Нажмите для просмотра в полном разрешении"
                                        >
                                            <OptimizedThumbnail src={effectiveBackImage} size={128} alt="Back View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                        </div>
                                        {!isBackConnected && (
                                            <button
                                                onClick={() => handleClearSlot('back')}
                                                className="absolute top-1 right-1 p-1 bg-gray-900/80 text-red-400 hover:text-red-200 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div 
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                                        onClick={() => fileInputBackRef.current?.click()}
                                    >
                                        <HeadBackIcon className="h-9 w-9 mb-1 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                        <span className="text-[10px] font-medium">{t('threed.addBackView') || 'Add Back View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputBackRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                            </div>

                            {/* Bottom-Left: Left View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveLeftImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'left')}
                            >
                                <div className="absolute top-1 left-2 flex items-center space-x-1 z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800">
                                        {t('threed.left') || 'Left View'}
                                    </span>
                                    {isLeftConnected && (
                                        <span className="text-[9px] bg-cyan-900/90 text-cyan-200 px-1 py-0.2 rounded border border-cyan-500/50">
                                            #3
                                        </span>
                                    )}
                                </div>
                                {effectiveLeftImage ? (
                                    <>
                                        <div 
                                            onClick={() => handleOpenImageViewer(effectiveLeftImage, 'Left View')}
                                            className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                            title="Нажмите для просмотра в полном разрешении"
                                        >
                                            <OptimizedThumbnail src={effectiveLeftImage} size={128} alt="Left View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                        </div>
                                        {!isLeftConnected && (
                                            <button
                                                onClick={() => handleClearSlot('left')}
                                                className="absolute top-1 right-1 p-1 bg-gray-900/80 text-red-400 hover:text-red-200 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div 
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                                        onClick={() => fileInputLeftRef.current?.click()}
                                    >
                                        <HeadLeftIcon className="h-9 w-9 mb-1 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                        <span className="text-[10px] font-medium">{t('threed.addLeftView') || 'Add Left View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputLeftRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'left')} />
                            </div>

                            {/* Bottom-Right: Right View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveRightImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'right')}
                            >
                                <div className="absolute top-1 left-2 flex items-center space-x-1 z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800">
                                        {t('threed.right') || 'Right View'}
                                    </span>
                                    {isRightConnected && (
                                        <span className="text-[9px] bg-cyan-900/90 text-cyan-200 px-1 py-0.2 rounded border border-cyan-500/50">
                                            #4
                                        </span>
                                    )}
                                </div>
                                {effectiveRightImage ? (
                                    <>
                                        <div 
                                            onClick={() => handleOpenImageViewer(effectiveRightImage, 'Right View')}
                                            className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                            title="Нажмите для просмотра в полном разрешении"
                                        >
                                            <OptimizedThumbnail src={effectiveRightImage} size={128} alt="Right View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                        </div>
                                        {!isRightConnected && (
                                            <button
                                                onClick={() => handleClearSlot('right')}
                                                className="absolute top-1 right-1 p-1 bg-gray-900/80 text-red-400 hover:text-red-200 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div 
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                                        onClick={() => fileInputRightRef.current?.click()}
                                    >
                                        <HeadRightIcon className="h-9 w-9 mb-1 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                        <span className="text-[10px] font-medium">{t('threed.addRightView') || 'Add Right View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputRightRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'right')} />
                            </div>
                        </div>
                    )}

                    {/* Optional Prompt Input */}
                    <div className="flex flex-col space-y-1">
                        <label className="text-[11px] text-gray-400 font-medium">{t('threed.promptOptional') || 'Text Prompt / Material Guidance (Optional)'}</label>
                        <input
                            type="text"
                            value={state.prompt}
                            onChange={(e) => updateState({ prompt: e.target.value })}
                            placeholder="e.g. realistic detailed sci-fi robot with metallic finish"
                            className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>

                {/* Right Pane: 3D Interactive Viewport & 2D Render */}
                <div className="w-full md:w-1/2 p-3 flex flex-col space-y-3 overflow-hidden bg-gray-950/40">
                    {/* Tab 1: 3D Interactive View */}
                    {activeTab === 'preview3d' && (
                        <div className="flex-1 flex flex-col min-h-[200px] bg-slate-900 rounded-lg border border-gray-700 relative overflow-hidden">
                            {state.modelUrl ? (
                                <>
                                    {/* Web Component <model-viewer> */}
                                    {/* @ts-ignore */}
                                    <model-viewer
                                        ref={modelViewerRef}
                                        src={state.modelUrl}
                                        poster={state.thumbnailUrl || state.renderedImageUrl || ''}
                                        alt="Tripo 3D Generated Model"
                                        auto-rotate={state.autoRotate ? '' : undefined}
                                        auto-rotate-delay="0"
                                        rotation-per-second="30deg"
                                        camera-controls=""
                                        shadow-intensity="1"
                                        exposure="1"
                                        style={{ width: '100%', height: '100%', backgroundColor: state.modelBg }}
                                    >
                                        <div slot="progress-bar" className="absolute top-0 left-0 w-full h-1 bg-cyan-500 animate-pulse"></div>
                                    {/* @ts-ignore */}
                                    </model-viewer>

                                    {/* Floating 3D Viewer Toolbar */}
                                    <div className="absolute top-2 right-2 flex items-center space-x-1 bg-gray-900/90 backdrop-blur-md p-1 rounded-lg border border-gray-700 shadow-xl text-[11px] z-20">
                                        <button
                                            onClick={() => {
                                                const next = !state.autoRotate;
                                                updateState({ autoRotate: next });
                                                if (modelViewerRef.current) {
                                                    if (next) {
                                                        modelViewerRef.current.setAttribute('auto-rotate', '');
                                                        modelViewerRef.current.autoRotate = true;
                                                    } else {
                                                        modelViewerRef.current.removeAttribute('auto-rotate');
                                                        modelViewerRef.current.autoRotate = false;
                                                    }
                                                }
                                            }}
                                            className={`px-2 py-1 rounded flex items-center space-x-1 font-medium transition-all ${
                                                state.autoRotate 
                                                    ? 'bg-cyan-600 text-white shadow' 
                                                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                            }`}
                                            title="Вращение: авто-поворот 3D модели"
                                        >
                                            <RotateCcw className={`w-3.5 h-3.5 ${state.autoRotate ? 'animate-spin' : ''}`} />
                                            <span>{t('threed.autoRotate') || 'Rotate'}</span>
                                        </button>
                                        <button
                                            onClick={handleDownloadGlb}
                                            className="p-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                            title="Скачать 3D модель (.glb)"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={handleCopyGlbUrl}
                                            className="p-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                            title={t('threed.copyModelLink') || "Скопировать прямую ссылку на GLB"}
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="h-3.5 w-px bg-gray-700 mx-0.5"></div>
                                        <button
                                            onClick={handleUnloadModel}
                                            className="p-1.5 rounded text-red-400 hover:text-red-200 hover:bg-red-950/60 border border-transparent hover:border-red-800/60 transition-colors"
                                            title="Закрыть / Выгрузить 3D модель из окна (освободить память)"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center p-6 space-y-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 stroke-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                                    </svg>
                                    <p className="text-gray-400 font-medium">No 3D Model Generated Yet</p>
                                    <p className="text-[11px] text-gray-500 max-w-xs">
                                        Provide input views, configure parameters below, and click "Generate 3D Model".
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: 2D Rendered Image */}
                    {activeTab === 'rendered' && (
                        <div className="flex-1 flex flex-col min-h-[200px] bg-slate-900 rounded-lg border border-gray-700 relative overflow-hidden items-center justify-center p-2">
                            {state.renderedImageUrl || state.thumbnailUrl ? (
                                <>
                                    <img
                                        src={state.renderedImageUrl || state.thumbnailUrl}
                                        alt="3D Rendered Result"
                                        className="max-h-full max-w-full object-contain rounded"
                                    />
                                    {/* Floating 2D Render Toolbar */}
                                    <div className="absolute top-2 right-2 flex items-center space-x-1 bg-gray-900/90 backdrop-blur-md p-1 rounded-lg border border-gray-700 shadow-xl text-[11px] z-20">
                                        <a
                                            href={state.renderedImageUrl || state.thumbnailUrl}
                                            download={`render_${state.taskId || Date.now()}.png`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                            title="Скачать 2D рендер изображения"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                            onClick={handleUnloadModel}
                                            className="p-1.5 rounded text-red-400 hover:text-red-200 hover:bg-red-950/60 border border-transparent hover:border-red-800/60 transition-colors"
                                            title="Закрыть / Выгрузить из окна (освободить память)"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center p-6 space-y-1">
                                    <p className="text-gray-400 font-medium">No 2D Render Available</p>
                                    <p className="text-[11px] text-gray-500">Generates alongside the 3D model.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dedicated Parameters Panel: Composed with Model Selection on Left, Texture & Mesh Quality on Right */}
            <div className="bg-gray-950/85 border-t border-gray-800/90 p-3 space-y-2.5 shrink-0 overflow-visible relative z-30">
                {/* 2-Column Responsive Layout with strictly aligned rows */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start overflow-visible">
                    {/* Left Column: Model Selection (md:col-span-6) */}
                    <div className="md:col-span-6 space-y-1.5 min-w-0 overflow-visible">
                        <div className="h-5 flex items-center gap-1.5 min-w-0">
                            <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-xs font-semibold text-gray-200 truncate">{t('threed.model') || 'Tripo 3D Model'}</span>
                            {currentModelOption?.badge && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0 ${
                                    currentModelOption.isFlagship 
                                        ? 'bg-purple-950/90 text-purple-300 border-purple-600/60 shadow-sm' 
                                        : currentModelOption.badge === 'Precision'
                                            ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/60 shadow-sm'
                                            : currentModelOption.badge === 'Fast'
                                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60 shadow-sm'
                                                : 'bg-blue-950/90 text-blue-300 border-blue-600/60 shadow-sm'
                                }`}>
                                    {currentModelOption.badge}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1 overflow-visible">
                            <button
                                type="button"
                                title="Previous Model"
                                onClick={handlePrevModel}
                                disabled={isGenerating || modelIndex <= 0}
                                className="flex items-center justify-center h-[36px] w-[36px] bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors shrink-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex-1 min-w-0 overflow-visible">
                                <CustomSelect
                                    value={state.modelVersion}
                                    onChange={(val) => updateState({ modelVersion: val })}
                                    disabled={isGenerating}
                                    direction="down"
                                    title={currentModelOption?.description}
                                    options={TRIPO_MODEL_OPTIONS.map(opt => ({
                                        value: opt.value,
                                        label: opt.label,
                                        badge: opt.badge,
                                        icon: getModelOptionIcon(opt)
                                    }))}
                                    renderTriggerContent={(selectedOption) => (
                                        <div className="flex items-center gap-2 font-medium text-xs truncate">
                                            {selectedOption?.icon}
                                            <span className="truncate">{selectedOption?.label || state.modelVersion}</span>
                                        </div>
                                    )}
                                />
                            </div>
                            <button
                                type="button"
                                title="Next Model"
                                onClick={handleNextModel}
                                disabled={isGenerating || modelIndex >= TRIPO_MODEL_OPTIONS.length - 1 || modelIndex === -1}
                                className="flex items-center justify-center h-[36px] w-[36px] bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors shrink-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right Columns: Texture Quality & Mesh Quality (md:col-span-6) */}
                    <div className="md:col-span-6 grid grid-cols-2 gap-2 overflow-visible">
                        {/* Texture Quality */}
                        <div className="flex flex-col space-y-1.5 min-w-0 overflow-visible">
                            <div className="h-5 flex items-center gap-1.5 min-w-0">
                                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="text-xs font-semibold text-gray-300 truncate">{t('threed.textureQuality') || 'Texture Quality'}</span>
                            </div>
                            <CustomSelect
                                value={state.textureQuality}
                                onChange={(val) => updateState({ textureQuality: val as TripoTextureQuality })}
                                disabled={isGenerating || !state.texture}
                                direction="down"
                                options={[
                                    { value: 'extreme', label: 'Extreme (4K Texture • Max)' },
                                    { value: 'detailed', label: 'Detailed (HQ Texture)' },
                                    { value: 'standard', label: 'Standard Texture' }
                                ]}
                            />
                        </div>

                        {/* Mesh Quality / Face Limit */}
                        <div className="flex flex-col space-y-1.5 min-w-0 overflow-visible">
                            <div className="h-5 flex items-center gap-1.5 min-w-0">
                                <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="text-xs font-semibold text-gray-300 truncate">{t('threed.faceLimit') || 'Mesh Density'}</span>
                            </div>
                            <CustomSelect
                                value={state.faceLimit ? String(state.faceLimit) : '2000000'}
                                onChange={(val) => updateState({ faceLimit: val ? Number(val) : undefined })}
                                disabled={isGenerating}
                                direction="down"
                                options={[
                                    { value: '2000000', label: '2M (2M Poly • Max H3.1)' },
                                    { value: '1000000', label: '1M (1M Poly • Master)' },
                                    { value: '500000', label: '500K (500K Poly • Ultra)' },
                                    { value: '100000', label: '100K (100K Poly • High-Res)' },
                                    { value: '50000', label: '50K (50K Poly • Detailed)' },
                                    { value: '25000', label: '25K (25K Poly • Standard)' },
                                    { value: '10000', label: '10K (10K Poly • Low Poly)' },
                                    { value: '', label: 'Auto (Default Tripo)' }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Stylish Toggles Row (CustomToggle with interactive pill track & floating tooltips) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/80 overflow-visible">
                    <CustomToggle
                        id={`node-${node.id}-autosave-glb`}
                        checked={state.autoSave3d !== false}
                        onChange={(checked) => updateState({ autoSave3d: checked })}
                        label="Автоскачивание .GLB"
                        tooltip="Автоматически скачивать файл 3D модели (.GLB) на диск при завершении генерации"
                        icon={<Download className="w-3.5 h-3.5 text-emerald-400" />}
                    />
                    <CustomToggle
                        id={`node-${node.id}-autosave-json`}
                        checked={state.autoSaveJson !== false}
                        onChange={(checked) => updateState({ autoSaveJson: checked })}
                        label="Автосохранение JSON задачи"
                        tooltip="Автоматически скачивать JSON файл с Task ID при создании задачи и обновлять при завершении"
                        icon={<FileJson className="w-3.5 h-3.5 text-amber-400" />}
                    />
                    <CustomToggle
                        id={`node-${node.id}-texture`}
                        checked={state.texture}
                        onChange={(checked) => updateState({ texture: checked })}
                        label={t('threed.texture') || 'Textures'}
                        tooltip={t('threed.textureTooltip') || 'Генерация диффузных текстур и UV-развёртки'}
                        icon={<Layers className="w-3.5 h-3.5" />}
                    />
                    <CustomToggle
                        id={`node-${node.id}-pbr`}
                        checked={state.pbr && state.texture}
                        disabled={!state.texture}
                        onChange={(checked) => updateState({ pbr: checked })}
                        label={t('threed.pbr') || 'PBR Materials'}
                        tooltip={t('threed.pbrTooltip') || 'Генерация карт шероховатости и металличности (Roughness / Metallic)'}
                        icon={<Sparkles className="w-3.5 h-3.5" />}
                    />
                    <CustomToggle
                        id={`node-${node.id}-quadmesh`}
                        checked={state.quadMesh}
                        onChange={(checked) => updateState({ quadMesh: checked })}
                        label={t('threed.quadMesh') || 'Quad Mesh'}
                        tooltip={t('threed.quadMeshTooltip') || 'Преобразование сетки в чистую четырёхугольную топологию (Quads)'}
                        icon={<Box className="w-3.5 h-3.5" />}
                    />
                    <CustomToggle
                        id={`node-${node.id}-autorotate`}
                        checked={state.autoRotate}
                        onChange={(checked) => updateState({ autoRotate: checked })}
                        label={t('threed.autoRotate') || 'Auto-Rotate'}
                        tooltip={t('threed.autoRotateTooltip') || 'Автоматическое плавное вращение 3D модели в окне предпросмотра'}
                        icon={<Zap className="w-3.5 h-3.5" />}
                    />
                </div>

                {/* Task ID Safety, JSON Backup & Recovery Toolbar */}
                <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setShowTaskIdPanel(prev => !prev)}
                            className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors"
                        >
                            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Управление Task ID & JSON бэкап</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                                ({state.taskId ? state.taskId.slice(0, 10) + '...' : 'нет ID'})
                            </span>
                        </button>

                        <div className="flex items-center gap-1.5">
                            {state.taskId && (
                                <button
                                    type="button"
                                    onClick={handleCopyTaskId}
                                    className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[10px] font-mono flex items-center gap-1 transition-colors"
                                    title="Скопировать Task ID в буфер"
                                >
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>Копировать ID</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleManualDownloadTaskJson}
                                className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/60 text-[10px] flex items-center gap-1 transition-colors"
                                title="Скачать метаданные задачи в формате JSON"
                            >
                                <FileJson className="w-2.5 h-2.5 text-amber-400" />
                                <span>Скачать JSON</span>
                            </button>
                        </div>
                    </div>

                    {showTaskIdPanel && (
                        <div className="p-2.5 rounded-lg bg-gray-950/90 border border-cyan-900/50 space-y-2 animate-fadeIn">
                            {state.taskId && (
                                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono">
                                    <span className="text-gray-400">Текущий Task ID:</span>
                                    <span className="text-cyan-300 font-bold select-all truncate">{state.taskId}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleQueryTaskById(state.taskId)}
                                        disabled={isQueryingTaskId}
                                        className="px-1.5 py-0.5 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-[10px] flex items-center gap-1"
                                        title="Обновить статус и ссылки модели из Tripo API"
                                    >
                                        <RefreshCw className={`w-2.5 h-2.5 ${isQueryingTaskId ? 'animate-spin' : ''}`} />
                                        <span>Обновить</span>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Вставьте сохранённый Task ID (task_...)"
                                    value={inputQueryTaskId}
                                    onChange={(e) => setInputQueryTaskId(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleQueryTaskById(); }}
                                    className="flex-1 bg-gray-900 border border-gray-700 text-xs px-2.5 py-1.5 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleQueryTaskById()}
                                    disabled={isQueryingTaskId || !inputQueryTaskId.trim()}
                                    className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-xs flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
                                >
                                    {isQueryingTaskId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowDownCircle className="w-3 h-3" />}
                                    <span>Загрузить по ID</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-gray-800/80">
                                <span className="text-[10px] text-gray-400">Восстановить из файла:</span>
                                <input
                                    ref={jsonFileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportTaskJsonFile}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => jsonFileInputRef.current?.click()}
                                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs flex items-center gap-1.5 transition-colors"
                                    title="Выбрать сохранённый файл 3D_Model_...json"
                                >
                                    <FileJson className="w-3 h-3 text-amber-400" />
                                    <span>Выбрать JSON задачи</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions & Status Footer */}
            <div className="p-3 bg-gray-900 border-t border-gray-800 flex flex-col space-y-2 shrink-0 relative z-20">
                {/* Status Bar / Progress Bar */}
                {isGenerating && (
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-cyan-400 font-medium animate-pulse">{localStatusMsg || 'Generating 3D model...'}</span>
                            <span className="text-gray-400 font-mono">{localProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                                style={{ width: `${localProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {state.errorMessage && !isGenerating && (
                    <div className="text-[11px] text-red-300 bg-red-950/60 p-2 rounded border border-red-800/80 flex flex-col gap-1.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                                <span className="text-red-400 font-bold shrink-0">⚠️ Ошибка:</span>
                                <span className="break-words font-medium">{state.errorMessage}</span>
                            </div>
                            <button 
                                onClick={() => updateState({ errorMessage: undefined })} 
                                className="text-red-400 hover:text-white p-0.5 rounded hover:bg-red-900/50 shrink-0"
                                title="Закрыть"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-red-900/50">
                            <span className="text-[10px] text-red-400/80">Проверьте API ключ в Настройках или консоль логов</span>
                            <button
                                type="button"
                                onClick={() => context?.setIsDebugConsoleOpen(true)}
                                className="text-[10px] px-2 py-0.5 bg-red-900/80 hover:bg-red-800 text-red-100 rounded border border-red-700 font-semibold transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Terminal className="w-3 h-3" />
                                <span>Открыть логи</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                        {state.modelUrl && (
                            <button
                                onClick={handleDownloadGlb}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>{t('threed.downloadGlb') || 'Download .GLB'}</span>
                            </button>
                        )}
                        {state.taskId && (
                            <span className="text-[10px] text-gray-500 font-mono">
                                Task: {state.taskId.slice(0, 8)}...
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {isGenerating ? (
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded font-medium text-xs transition-colors"
                            >
                                {t('threed.cancel') || 'Cancel'}
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={isApiKeyMissing}
                                className={`px-4 py-1.5 rounded font-medium text-xs flex items-center space-x-1.5 transition-all shadow-md ${
                                    isApiKeyMissing
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:shadow-cyan-500/20'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                                </svg>
                                <span>{t('threed.generate') || 'Generate 3D Model'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
