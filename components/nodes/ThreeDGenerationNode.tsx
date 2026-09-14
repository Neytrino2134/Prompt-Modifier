import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { NodeContentProps, Node, Connection } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { ActionButton } from '../ActionButton';
import { useLanguage } from '../../localization';
import { 
    isTripoEnabled, 
    getTripoApiKey, 
    generateImageTo3D, 
    generateMultiviewTo3D,
    textureExistingModel,
    pollTripoTask,
    TripoTextureQuality,
    TripoTextureAlignment,
    useTripoEnabled
} from '../../services/tripoService';

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
    status: 'idle' | 'uploading' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
    progress: number;
    statusMessage?: string;
    errorMessage?: string;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    activeTab: 'preview3d' | 'rendered' | 'settings';
    autoRotate: boolean;
    wireframe: boolean;
    modelBg: string;
}

const DEFAULT_STATE: ThreeDNodeState = {
    mode: 'multiview_to_3d',
    modelVersion: 'v2.5-20250123',
    texture: true,
    textureQuality: 'standard',
    textureAlignment: 'original_image',
    pbr: true,
    quadMesh: false,
    faceLimit: undefined,
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
    status: 'idle',
    progress: 0,
    activeTab: 'preview3d',
    autoRotate: true,
    wireframe: false,
    modelBg: '#1e293b'
};

export const ThreeDGenerationNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    addToast,
    onDownloadImageFromUrl,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();
    const connections: Connection[] = context?.connections || [];
    const allNodes: Node[] = context?.nodes || [];
    const isTripoConfigured = useTripoEnabled();
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputSingleRef = useRef<HTMLInputElement>(null);
    const fileInputFrontRef = useRef<HTMLInputElement>(null);
    const fileInputLeftRef = useRef<HTMLInputElement>(null);
    const fileInputBackRef = useRef<HTMLInputElement>(null);
    const fileInputRightRef = useRef<HTMLInputElement>(null);

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

    const [activeTab, setActiveTab] = useState<'preview3d' | 'rendered' | 'settings'>(state.activeTab || 'preview3d');
    const [localProgress, setLocalProgress] = useState<number>(state.progress || 0);
    const [localStatusMsg, setLocalStatusMsg] = useState<string>(state.statusMessage || '');
    const [isGenerating, setIsGenerating] = useState<boolean>(state.status === 'running' || state.status === 'uploading' || state.status === 'queued');

    // Persistence helper
    const updateState = (updater: Partial<ThreeDNodeState> | ((prev: ThreeDNodeState) => Partial<ThreeDNodeState>)) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        const next = { ...state, ...partial };
        onValueChange(node.id, JSON.stringify(next));
    };

    // Connected Inputs Resolution
    const connectedInputs = useMemo(() => {
        const incoming = connections.filter((c: Connection) => c.toNodeId === node.id);
        const map: {
            singleImage?: string;
            front?: string;
            left?: string;
            back?: string;
            right?: string;
            text?: string;
        } = {};

        incoming.forEach((conn: Connection) => {
            const sourceNode = allNodes.find((n: Node) => n.id === conn.fromNodeId);
            if (!sourceNode) return;

            let sourceValue: any = null;
            try {
                sourceValue = JSON.parse(sourceNode.value || '{}');
            } catch {
                sourceValue = sourceNode.value;
            }

            // Extract image / text from source node based on type
            let extractedImage: string | null = null;
            let extractedText: string | null = null;

            if (typeof sourceValue === 'string') {
                if (sourceValue.startsWith('data:image') || sourceValue.startsWith('http') || sourceValue.startsWith('blob:')) {
                    extractedImage = sourceValue;
                } else {
                    extractedText = sourceValue;
                }
            } else if (sourceValue && typeof sourceValue === 'object') {
                if (sourceValue.image) extractedImage = sourceValue.image;
                else if (sourceValue.outputImage) extractedImage = sourceValue.outputImage;
                else if (sourceValue.renderedImage) extractedImage = sourceValue.renderedImage;
                else if (sourceValue.thumbnailUrl) extractedImage = sourceValue.thumbnailUrl;
                else if (sourceValue.url) extractedImage = sourceValue.url;
                
                if (sourceValue.prompt) extractedText = sourceValue.prompt;
                else if (sourceValue.text) extractedText = sourceValue.text;
                else if (sourceValue.inputText) extractedText = sourceValue.inputText;
            }

            if (conn.toHandleId === 'front') {
                if (extractedImage) map.front = extractedImage;
            } else if (conn.toHandleId === 'left') {
                if (extractedImage) map.left = extractedImage;
            } else if (conn.toHandleId === 'back') {
                if (extractedImage) map.back = extractedImage;
            } else if (conn.toHandleId === 'right') {
                if (extractedImage) map.right = extractedImage;
            } else if (conn.toHandleId === 'image' || !conn.toHandleId) {
                if (extractedImage) {
                    map.singleImage = extractedImage;
                    if (!map.front) map.front = extractedImage;
                }
            } else if (conn.toHandleId === 'text') {
                if (extractedText) map.text = extractedText;
            }
        });

        return map;
    }, [connections, allNodes, node.id]);

    // Effective values (connected inputs take precedence if available, otherwise manual state)
    const effectiveSingleImage = connectedInputs.singleImage || state.image;
    const effectiveFrontImage = connectedInputs.front || state.multiview.front || connectedInputs.singleImage || state.image;
    const effectiveLeftImage = connectedInputs.left || state.multiview.left;
    const effectiveBackImage = connectedInputs.back || state.multiview.back;
    const effectiveRightImage = connectedInputs.right || state.multiview.right;
    const effectivePrompt = connectedInputs.text || state.prompt;

    // File Upload Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 'image' | 'front' | 'left' | 'back' | 'right') => {
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

    // Drag & Drop Handler
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, slot: 'image' | 'front' | 'left' | 'back' | 'right') => {
        e.preventDefault();
        e.stopPropagation();

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
        } else {
            const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (uri && (uri.startsWith('http') || uri.startsWith('data:image'))) {
                if (slot === 'image') {
                    updateState({ image: uri });
                } else {
                    updateState(prev => ({
                        multiview: {
                            ...prev.multiview,
                            [slot]: uri
                        }
                    }));
                }
            }
        }
    };

    // Clear Slot
    const handleClearSlot = (slot: 'image' | 'front' | 'left' | 'back' | 'right') => {
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

    // Generation Execution
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

        setIsGenerating(true);
        setLocalProgress(5);
        setLocalStatusMsg('Uploading image assets...');
        updateState({ status: 'uploading', progress: 5, statusMessage: 'Uploading assets...', errorMessage: undefined });

        abortControllerRef.current = new AbortController();

        try {
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
                }, abortControllerRef.current.signal);
            } else {
                result = await generateMultiviewTo3D({
                    views: {
                        front: effectiveFrontImage!,
                        left: effectiveLeftImage || undefined,
                        back: effectiveBackImage || undefined,
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
                }, abortControllerRef.current.signal);
            }

            if (result.status === 'success' && result.modelUrl) {
                updateState({
                    taskId: result.taskId,
                    status: 'success',
                    progress: 100,
                    statusMessage: '3D Generation Completed!',
                    modelUrl: result.modelUrl,
                    thumbnailUrl: result.thumbnailUrl,
                    renderedImageUrl: result.renderedImageUrl,
                    activeTab: 'preview3d'
                });
                setActiveTab('preview3d');
                if (addToast) addToast('3D Model generated successfully!', 'success');
            } else {
                throw new Error(result.error || 'Generation failed without output model.');
            }
        } catch (err: any) {
            const msg = err?.message || 'Failed to generate 3D model';
            setLocalStatusMsg(`Error: ${msg}`);
            updateState({
                status: 'failed',
                errorMessage: msg,
                statusMessage: msg
            });
            if (addToast) addToast(`Tripo 3D Error: ${msg}`, 'error');
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsGenerating(false);
        updateState({ status: 'cancelled', statusMessage: 'Generation cancelled' });
        if (addToast) addToast('Generation cancelled', 'info');
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

    const apiKey = getTripoApiKey();
    const isApiKeyMissing = !isTripoEnabled() || !apiKey;

    return (
        <div className="flex flex-col h-full w-full bg-gray-900/90 text-gray-200 text-xs overflow-hidden select-none">
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
                {/* Mode Selector */}
                <div className="flex items-center space-x-1 bg-gray-900/90 p-0.5 rounded-md border border-gray-700/50">
                    <button
                        onClick={() => updateState({ mode: 'multiview_to_3d' })}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            state.mode === 'multiview_to_3d'
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                        title="Multiview images (Front, Left, Back, Right) to 3D model"
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

                {/* View Tabs */}
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setActiveTab('preview3d')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${
                            activeTab === 'preview3d'
                                ? 'bg-indigo-600 text-white'
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
                                ? 'bg-indigo-600 text-white'
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
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${
                            activeTab === 'settings'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                        <span>{t('threed.tab.settings') || 'Params'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Pane: Image Input Slots */}
                <div className="w-full md:w-1/2 p-3 flex flex-col space-y-3 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-700/50">
                    <div className="flex items-center justify-between text-gray-300 font-semibold text-xs">
                        <span>{state.mode === 'image_to_3d' ? (t('threed.mode.imageTo3d') || 'Input Image (1 Slot)') : (t('threed.mode.multiviewTo3d') || 'Multiview Input Frames (4 Views)')}</span>
                        {state.mode === 'multiview_to_3d' && (
                            <span className="text-[10px] text-cyan-400 font-normal">{t('threed.frontRequired') || 'Front view is required'}</span>
                        )}
                    </div>

                    {/* Single Image Mode Input Frame */}
                    {state.mode === 'image_to_3d' && (
                        <div 
                            className="relative flex-1 min-h-[220px] bg-gray-950/60 rounded-lg border-2 border-dashed border-gray-700 hover:border-cyan-500/80 transition-colors flex flex-col items-center justify-center p-3 group overflow-hidden"
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => handleDrop(e, 'image')}
                        >
                            {effectiveSingleImage ? (
                                <>
                                    <img 
                                        src={effectiveSingleImage} 
                                        alt="Input 3D Source" 
                                        className="max-h-full max-w-full object-contain rounded"
                                    />
                                    {connectedInputs.singleImage && (
                                        <div className="absolute top-2 left-2 bg-cyan-900/90 text-cyan-200 text-[10px] px-2 py-0.5 rounded border border-cyan-500/50">
                                            {t('threed.connectedFromNode') || 'Connected from node'}
                                        </div>
                                    )}
                                    {!connectedInputs.singleImage && (
                                        <button
                                            onClick={() => handleClearSlot('image')}
                                            className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-red-400 hover:text-red-200 rounded-md border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
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

                    {/* Multiview 4-Slot Grid */}
                    {state.mode === 'multiview_to_3d' && (
                        <div className="grid grid-cols-2 gap-2 flex-1 min-h-[220px]">
                            {/* Front View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveFrontImage ? 'border-cyan-500/70' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'front')}
                            >
                                <span className="absolute top-1 left-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-cyan-800/60 z-10">
                                    {t('threed.front') || 'Front (Required)'}
                                </span>
                                {effectiveFrontImage ? (
                                    <>
                                        <img src={effectiveFrontImage} alt="Front View" className="max-h-full max-w-full object-contain pt-4 rounded" />
                                        {!connectedInputs.front && (
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-[10px]">{t('threed.addFrontView') || 'Add Front View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputFrontRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                            </div>

                            {/* Left View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveLeftImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'left')}
                            >
                                <span className="absolute top-1 left-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800 z-10">
                                    {t('threed.left') || 'Left View'}
                                </span>
                                {effectiveLeftImage ? (
                                    <>
                                        <img src={effectiveLeftImage} alt="Left View" className="max-h-full max-w-full object-contain pt-4 rounded" />
                                        {!connectedInputs.left && (
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
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-gray-300 transition-colors"
                                        onClick={() => fileInputLeftRef.current?.click()}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-[10px]">{t('threed.addLeftView') || 'Add Left View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputLeftRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'left')} />
                            </div>

                            {/* Back View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveBackImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'back')}
                            >
                                <span className="absolute top-1 left-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800 z-10">
                                    {t('threed.back') || 'Back View'}
                                </span>
                                {effectiveBackImage ? (
                                    <>
                                        <img src={effectiveBackImage} alt="Back View" className="max-h-full max-w-full object-contain pt-4 rounded" />
                                        {!connectedInputs.back && (
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
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-gray-300 transition-colors"
                                        onClick={() => fileInputBackRef.current?.click()}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-[10px]">{t('threed.addBackView') || 'Add Back View'}</span>
                                    </div>
                                )}
                                <input ref={fileInputBackRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                            </div>

                            {/* Right View */}
                            <div 
                                className={`relative bg-gray-950/70 rounded-lg border ${
                                    effectiveRightImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                                } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => handleDrop(e, 'right')}
                            >
                                <span className="absolute top-1 left-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800 z-10">
                                    {t('threed.right') || 'Right View'}
                                </span>
                                {effectiveRightImage ? (
                                    <>
                                        <img src={effectiveRightImage} alt="Right View" className="max-h-full max-w-full object-contain pt-4 rounded" />
                                        {!connectedInputs.right && (
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
                                        className="cursor-pointer flex flex-col items-center justify-center text-center p-2 text-gray-500 hover:text-gray-300 transition-colors"
                                        onClick={() => fileInputRightRef.current?.click()}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-[10px]">{t('threed.addRightView') || 'Add Right View'}</span>
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

                {/* Right Pane: 3D Preview & Settings Panel */}
                <div className="w-full md:w-1/2 p-3 flex flex-col space-y-3 overflow-y-auto bg-gray-950/40">
                    {/* Tab 1: 3D Interactive View */}
                    {activeTab === 'preview3d' && (
                        <div className="flex-1 flex flex-col min-h-[260px] bg-slate-900 rounded-lg border border-gray-700 relative overflow-hidden">
                            {state.modelUrl ? (
                                <>
                                    {/* Web Component <model-viewer> */}
                                    {/* @ts-ignore */}
                                    <model-viewer
                                        src={state.modelUrl}
                                        poster={state.thumbnailUrl || state.renderedImageUrl || ''}
                                        alt="Tripo 3D Generated Model"
                                        auto-rotate={state.autoRotate ? '' : undefined}
                                        camera-controls=""
                                        shadow-intensity="1"
                                        exposure="1"
                                        style={{ width: '100%', height: '100%', backgroundColor: state.modelBg }}
                                    >
                                        <div slot="progress-bar" className="absolute top-0 left-0 w-full h-1 bg-cyan-500 animate-pulse"></div>
                                    {/* @ts-ignore */}
                                    </model-viewer>

                                    {/* Floating 3D Viewer Toolbar */}
                                    <div className="absolute top-2 right-2 flex items-center space-x-1 bg-gray-900/80 backdrop-blur p-1 rounded-md border border-gray-700 text-[10px]">
                                        <button
                                            onClick={() => updateState(prev => ({ autoRotate: !prev.autoRotate }))}
                                            className={`px-2 py-1 rounded transition-colors ${state.autoRotate ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                                            title="Toggle Auto Rotation"
                                        >
                                            {t('threed.autoRotate') || 'Rotate'}
                                        </button>
                                        <button
                                            onClick={handleCopyGlbUrl}
                                            className="px-2 py-1 rounded text-gray-300 hover:bg-gray-800 transition-colors"
                                            title="Copy Model URL"
                                        >
                                            {t('threed.copyModelLink') || 'Copy URL'}
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
                                        Provide input views and click "Generate 3D Model" to build interactive GLB mesh.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: 2D Rendered Image */}
                    {activeTab === 'rendered' && (
                        <div className="flex-1 flex flex-col min-h-[260px] bg-slate-900 rounded-lg border border-gray-700 relative overflow-hidden items-center justify-center p-2">
                            {state.renderedImageUrl || state.thumbnailUrl ? (
                                <img
                                    src={state.renderedImageUrl || state.thumbnailUrl}
                                    alt="3D Rendered Result"
                                    className="max-h-full max-w-full object-contain rounded"
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center p-6 space-y-1">
                                    <p className="text-gray-400 font-medium">No 2D Render Available</p>
                                    <p className="text-[11px] text-gray-500">Generates alongside the 3D model.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Advanced Model & Texture Settings */}
                    {activeTab === 'settings' && (
                        <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto pr-1">
                            {/* Model Version */}
                            <div className="flex flex-col space-y-1">
                                <label className="text-[10px] text-gray-400 uppercase font-semibold">{t('threed.modelVersion') || 'Model Version'}</label>
                                <select
                                    value={state.modelVersion}
                                    onChange={(e) => updateState({ modelVersion: e.target.value })}
                                    className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="v2.5-20250123">v2.5-20250123 (Latest & High Quality)</option>
                                    <option value="v2.0-20240919">v2.0-20240919</option>
                                    <option value="v1.4-20240625">v1.4-20240625</option>
                                </select>
                            </div>

                            {/* Texture Settings */}
                            <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-gray-300">{t('threed.texture') || 'Generate Textures'}</span>
                                    <input
                                        type="checkbox"
                                        checked={state.texture}
                                        onChange={(e) => updateState({ texture: e.target.checked })}
                                        className="h-4 w-4 rounded bg-gray-950 border-gray-700 text-cyan-600 focus:ring-0"
                                    />
                                </div>

                                {state.texture && (
                                    <>
                                        <div className="flex flex-col space-y-1">
                                            <label className="text-[10px] text-gray-400">{t('threed.textureQuality') || 'Texture Quality'}</label>
                                            <select
                                                value={state.textureQuality}
                                                onChange={(e) => updateState({ textureQuality: e.target.value as TripoTextureQuality })}
                                                className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                                            >
                                                <option value="standard">Standard Texture</option>
                                                <option value="detailed">Detailed Texture</option>
                                                <option value="extreme">Extreme Texture</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[11px] text-gray-300">{t('threed.pbr') || 'PBR Materials (Roughness/Metallic)'}</span>
                                            <input
                                                type="checkbox"
                                                checked={state.pbr}
                                                onChange={(e) => updateState({ pbr: e.target.checked })}
                                                className="h-4 w-4 rounded bg-gray-950 border-gray-700 text-cyan-600 focus:ring-0"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mesh Topology Settings */}
                            <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-gray-300">{t('threed.quadMesh') || 'Quad Mesh Topology'}</span>
                                    <input
                                        type="checkbox"
                                        checked={state.quadMesh}
                                        onChange={(e) => updateState({ quadMesh: e.target.checked })}
                                        className="h-4 w-4 rounded bg-gray-950 border-gray-700 text-cyan-600 focus:ring-0"
                                    />
                                </div>

                                <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] text-gray-400">{t('threed.faceLimit') || 'Face Count Limit (Optional)'}</label>
                                    <select
                                        value={state.faceLimit || ''}
                                        onChange={(e) => updateState({ faceLimit: e.target.value ? Number(e.target.value) : undefined })}
                                        className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                                    >
                                        <option value="">Auto (Default)</option>
                                        <option value="10000">10,000 Faces</option>
                                        <option value="25000">25,000 Faces</option>
                                        <option value="50000">50,000 Faces</option>
                                        <option value="100000">100,000 Faces</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions & Status Footer */}
            <div className="p-3 bg-gray-900 border-t border-gray-800 flex flex-col space-y-2">
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
                    <div className="text-[11px] text-red-400 bg-red-950/40 p-1.5 px-2 rounded border border-red-900/60 flex items-center justify-between">
                        <span>{state.errorMessage}</span>
                        <button onClick={() => updateState({ errorMessage: undefined })} className="text-red-300 hover:text-white">✕</button>
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
};
