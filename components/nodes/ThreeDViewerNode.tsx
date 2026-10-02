import React, { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import type { NodeContentProps, Connection, Node } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../localization';
import CustomSelect from '../CustomSelect';
import { CustomToggle } from '../CustomToggle';
import { 
    Box, 
    RotateCcw, 
    Download, 
    Copy, 
    Camera, 
    Upload, 
    Link, 
    Unlink, 
    X, 
    Eye, 
    Sun, 
    Moon, 
    Play, 
    Pause, 
    Sparkles, 
    Layers, 
    Maximize2, 
    Minimize2,
    RefreshCw,
    Sliders,
    Globe,
    FileCheck
} from 'lucide-react';

export interface ThreeDViewerState {
    modelUrl?: string;
    fileName?: string;
    fileSize?: number;
    posterUrl?: string;
    autoRotate: boolean;
    rotationSpeed: number; // deg per second, e.g. 30
    modelBg: string; // e.g. '#0f172a'
    environment: 'neutral' | 'legacy' | 'studio' | 'sunset' | 'night';
    exposure: number; // 0.2 to 3.0, default 1.0
    shadowIntensity: number; // 0 to 2.0, default 1.0
    wireframe: boolean;
    fieldOfView?: string;
    cameraOrbit?: string;
    selectedAnimation?: string;
    isPlayingAnimation: boolean;
    snapshotUrl?: string;
}

const DEFAULT_STATE: ThreeDViewerState = {
    modelUrl: undefined,
    fileName: undefined,
    fileSize: undefined,
    posterUrl: undefined,
    autoRotate: true,
    rotationSpeed: 30,
    modelBg: '#1e293b',
    environment: 'neutral',
    exposure: 1.0,
    shadowIntensity: 1.0,
    wireframe: false,
    selectedAnimation: undefined,
    isPlayingAnimation: true,
    snapshotUrl: undefined
};

// Sample models hosted on fast, reliable CDNs for immediate testing
const SAMPLE_MODELS = [
    {
        name: 'Astronaut (NASA / Khronos)',
        url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
    },
    {
        name: 'Robot Expressive (Animated)',
        url: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb'
    },
    {
        name: 'Neil Armstrong Helmet',
        url: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb'
    },
    {
        name: 'Materials Variants Shoes',
        url: 'https://modelviewer.dev/shared-assets/models/MaterialsVariantsShoe.glb'
    },
    {
        name: 'Hover Drone / Quadcopter',
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Drone/glTF-Binary/Drone.glb'
    }
];

const BG_COLOR_PRESETS = [
    { label: 'Slate Dark', color: '#1e293b' },
    { label: 'Deep Blue', color: '#0f172a' },
    { label: 'Pitch Black', color: '#000000' },
    { label: 'Charcoal', color: '#18181b' },
    { label: 'Studio Gray', color: '#374151' },
    { label: 'Clean White', color: '#f8fafc' },
];

export const ThreeDViewerNode: React.FC<NodeContentProps> = memo(({
    node,
    onValueChange,
    addToast,
    getUpstreamNodeValues,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();
    const connections: Connection[] = context?.connections || [];
    const modelViewerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State parser
    const state = useMemo<ThreeDViewerState>(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                ...DEFAULT_STATE,
                ...parsed
            };
        } catch {
            return DEFAULT_STATE;
        }
    }, [node.value]);

    const updateState = (updater: Partial<ThreeDViewerState> | ((prev: ThreeDViewerState) => Partial<ThreeDViewerState>)) => {
        const partial = typeof updater === 'function' ? updater(state) : updater;
        const next = { ...state, ...partial };
        onValueChange(node.id, JSON.stringify(next));
    };

    // Filter incoming connections to this node
    const incomingConnections = useMemo(() => {
        return connections.filter((c: Connection) => c.toNodeId === node.id);
    }, [connections, node.id]);

    // Upstream 3D Model Resolution (from 3D Generation node or text/data input)
    const upstreamModelUrl = useMemo<string | null>(() => {
        if (!getUpstreamNodeValues) return null;
        
        // Check text handles (which carry GLB URLs / metadata)
        const textVals = getUpstreamNodeValues(node.id, 'text', undefined, false);
        for (const item of textVals) {
            if (typeof item === 'string') {
                if (item.startsWith('http') || item.startsWith('blob:') || item.startsWith('data:model/') || item.startsWith('data:application/octet-stream')) {
                    return item;
                }
                try {
                    const parsed = JSON.parse(item);
                    if (parsed.modelUrl) return parsed.modelUrl;
                    if (parsed.url) return parsed.url;
                } catch {}
            }
        }

        // Check image/model handles
        const imgVals = getUpstreamNodeValues(node.id, 'image', undefined, false);
        for (const item of imgVals) {
            if (typeof item === 'string' && (item.endsWith('.glb') || item.endsWith('.gltf') || item.includes('model/gltf-binary'))) {
                return item;
            }
        }

        return null;
    }, [getUpstreamNodeValues, node.id, incomingConnections]);

    const effectiveModelUrl = upstreamModelUrl || state.modelUrl;
    const isModelConnected = Boolean(upstreamModelUrl);

    // Available animations detected from loaded model
    const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
    const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
    const [urlInputModal, setUrlInputModal] = useState<boolean>(false);
    const [customUrl, setCustomUrl] = useState<string>('');
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync model-viewer properties on change
    useEffect(() => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        const handleLoad = () => {
            try {
                if (viewer.availableAnimations && Array.isArray(viewer.availableAnimations)) {
                    setAvailableAnimations(viewer.availableAnimations);
                    if (viewer.availableAnimations.length > 0 && !state.selectedAnimation) {
                        updateState({ selectedAnimation: viewer.availableAnimations[0] });
                    }
                }
            } catch (e) {
                console.warn('Error reading animations from model:', e);
            }
        };

        viewer.addEventListener('load', handleLoad);
        return () => {
            viewer.removeEventListener('load', handleLoad);
        };
    }, [effectiveModelUrl, state.selectedAnimation]);

    // Handle File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            updateState({
                modelUrl: dataUrl,
                fileName: file.name,
                fileSize: file.size,
                selectedAnimation: undefined
            });
            if (addToast) addToast(`Загружена 3D модель: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Handle Drop onto 3D Viewport
    const handleViewportDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                updateState({
                    modelUrl: dataUrl,
                    fileName: file.name,
                    fileSize: file.size,
                    selectedAnimation: undefined
                });
                if (addToast) addToast(`Загружена 3D модель: ${file.name}`, 'success');
            };
            reader.readAsDataURL(file);
            return;
        }

        // Drop of URL text
        const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
        if (textData && (textData.startsWith('http://') || textData.startsWith('https://') || textData.startsWith('blob:') || textData.startsWith('data:'))) {
            updateState({
                modelUrl: textData.trim(),
                fileName: textData.split('/').pop()?.split('?')[0] || 'model.glb',
                selectedAnimation: undefined
            });
            if (addToast) addToast('3D модель загружена по ссылке!', 'success');
        }
    };

    // Bake and disconnect input lines
    const handleBakeAndDisconnect = useCallback(() => {
        if (context?.setConnections) {
            context.setConnections(prev => prev.filter((c: Connection) => c.toNodeId !== node.id));
        }
        if (upstreamModelUrl) {
            updateState({ modelUrl: upstreamModelUrl });
        }
        if (addToast) addToast('Входящее 3D подключение запечено в узел!', 'success');
    }, [context, node.id, upstreamModelUrl, updateState, addToast]);

    // Snapshot Capture
    const handleTakeSnapshot = async () => {
        const viewer = modelViewerRef.current;
        if (!viewer) return;

        try {
            const dataUrl = viewer.toDataURL('image/png');
            if (dataUrl) {
                updateState({ snapshotUrl: dataUrl });

                // Copy to clipboard
                try {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    if (addToast) addToast('Снимок 3D экрана скопирован в буфер обмена!', 'success');
                } catch {
                    // Fallback to downloading
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = `3D_snapshot_${state.fileName || 'model'}_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (addToast) addToast('Снимок 3D экрана сохранён на устройство!', 'success');
                }
            }
        } catch (err: any) {
            if (addToast) addToast(`Ошибка захвата снимка: ${err?.message || err}`, 'error');
        }
    };

    // Download GLB
    const handleDownloadGlb = () => {
        if (!effectiveModelUrl) return;
        const a = document.createElement('a');
        a.href = effectiveModelUrl;
        a.download = state.fileName || `model_${Date.now()}.glb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (addToast) addToast('Скачивание 3D файла .GLB началось', 'info');
    };

    // Copy GLB Link
    const handleCopyLink = () => {
        if (!effectiveModelUrl) return;
        navigator.clipboard.writeText(effectiveModelUrl);
        if (addToast) addToast('Ссылка / DataURL модели скопирована!', 'success');
    };

    // Reset Camera / Recenter
    const handleResetCamera = () => {
        const viewer = modelViewerRef.current;
        if (viewer) {
            try {
                viewer.cameraOrbit = '0deg 75deg 105%';
                viewer.cameraTarget = 'auto auto auto';
                viewer.fieldOfView = 'auto';
                if (viewer.jumpCameraToGoal) {
                    viewer.jumpCameraToGoal();
                }
                if (addToast) addToast('Положение камеры сброшено в исходное', 'info');
            } catch (e) {
                console.warn('Reset camera error:', e);
            }
        }
    };

    // Unload Model from Memory
    const handleUnloadModel = () => {
        updateState({
            modelUrl: undefined,
            fileName: undefined,
            fileSize: undefined,
            selectedAnimation: undefined,
            snapshotUrl: undefined
        });
        setAvailableAnimations([]);
        if (addToast) addToast('3D модель выгружена из памяти', 'info');
    };

    // Format file size helper
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return null;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const hasIncomingConnections = incomingConnections.length > 0;

    return (
        <div 
            ref={containerRef}
            className={`flex flex-col h-full w-full bg-gray-900/95 text-gray-200 text-xs overflow-hidden select-none relative ${
                isFullscreen ? 'fixed inset-4 z-[9999] rounded-xl shadow-2xl border border-cyan-500/60' : ''
            }`}
        >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/90 border-b border-gray-700/60 shrink-0 gap-2 flex-wrap">
                {/* Left controls: Upload / Link / Samples */}
                <div className="flex items-center space-x-1.5 min-w-0">
                    <input 
                        ref={fileInputRef} 
                        type="file" 
                        accept=".glb,.gltf,model/gltf-binary,model/gltf+json" 
                        className="hidden" 
                        onChange={handleFileUpload} 
                    />
                    
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                        title="Открыть .GLB / .glTF 3D файл с устройства"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Открыть .GLB</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setUrlInputModal(prev => !prev)}
                        className={`p-1.5 rounded transition-all border ${
                            urlInputModal
                                ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200'
                                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                        }`}
                        title="Вставить прямую ссылку на 3D модель (URL)"
                    >
                        <Globe className="w-3.5 h-3.5" />
                    </button>

                    {/* Disconnect upstream line & bake model */}
                    {hasIncomingConnections && (
                        <button
                            type="button"
                            onClick={handleBakeAndDisconnect}
                            className="p-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-300 transition-colors"
                            title="Разорвать входящую линию и запечь 3D модель в узел"
                        >
                            <Unlink className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Sample Models Dropdown */}
                    <div className="hidden sm:block">
                        <CustomSelect
                            value=""
                            onChange={(url) => {
                                if (!url) return;
                                const sample = SAMPLE_MODELS.find(s => s.url === url);
                                updateState({
                                    modelUrl: url,
                                    fileName: sample?.name || 'sample.glb',
                                    selectedAnimation: undefined
                                });
                                if (addToast) addToast(`Загружен демо-образец: ${sample?.name}`, 'success');
                            }}
                            options={[
                                { value: '', label: '📦 Примеры моделей...' },
                                ...SAMPLE_MODELS.map(s => ({ value: s.url, label: s.name }))
                            ]}
                        />
                    </div>
                </div>

                {/* Right controls: Viewport Options, Settings, Snapshot */}
                <div className="flex items-center space-x-1">
                    {/* Model Info Badge if present */}
                    {state.fileName && (
                        <div className="hidden md:flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-950/70 border border-gray-700 text-[11px] font-mono text-cyan-300 max-w-[180px] truncate" title={state.fileName}>
                            <FileCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">{state.fileName}</span>
                            {state.fileSize && <span className="text-gray-500 text-[10px]">({formatFileSize(state.fileSize)})</span>}
                        </div>
                    )}

                    {/* Quick Auto-Rotate Button */}
                    <button
                        type="button"
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
                        className={`p-1.5 rounded transition-all flex items-center space-x-1 border ${
                            state.autoRotate 
                                ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/70 shadow-sm' 
                                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-400'
                        }`}
                        title={state.autoRotate ? 'Выключить авто-вращение' : 'Включить плавное авто-вращение'}
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${state.autoRotate ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Reset Camera */}
                    <button
                        type="button"
                        onClick={handleResetCamera}
                        disabled={!effectiveModelUrl}
                        className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors disabled:opacity-40"
                        title="Центрировать камеру / Сбросить ракурс"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Take Snapshot */}
                    <button
                        type="button"
                        onClick={handleTakeSnapshot}
                        disabled={!effectiveModelUrl}
                        className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-cyan-300 hover:text-cyan-100 transition-colors disabled:opacity-40"
                        title="Сделать 2D снимок текущего ракурса (копировать в буфер / на выход узла)"
                    >
                        <Camera className="w-3.5 h-3.5" />
                    </button>

                    {/* Settings / Controls Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowSettingsPanel(prev => !prev)}
                        className={`p-1.5 rounded transition-all border ${
                            showSettingsPanel
                                ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200'
                                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                        }`}
                        title="Параметры освещения, фона, анимации и камеры"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                    </button>

                    {/* Download GLB */}
                    {effectiveModelUrl && (
                        <button
                            type="button"
                            onClick={handleDownloadGlb}
                            className="p-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white transition-colors"
                            title="Скачать .GLB 3D файл"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Fullscreen Expand */}
                    <button
                        type="button"
                        onClick={() => setIsFullscreen(prev => !prev)}
                        className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors"
                        title={isFullscreen ? 'Свернуть полноэкранный вид' : 'Развернуть на весь экран'}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Clear / Unload */}
                    {effectiveModelUrl && (
                        <button
                            type="button"
                            onClick={handleUnloadModel}
                            className="p-1.5 rounded text-red-400 hover:text-red-200 hover:bg-red-950/60 border border-transparent hover:border-red-800/60 transition-colors"
                            title="Выгрузить модель из окна (освободить память)"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* URL Input Modal Drawer */}
            {urlInputModal && (
                <div className="p-2.5 bg-gray-950 border-b border-gray-800 flex items-center gap-2 animate-fadeIn shrink-0">
                    <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Вставьте прямую ссылку на .glb / .gltf файл (https://.../model.glb)"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && customUrl.trim()) {
                                updateState({
                                    modelUrl: customUrl.trim(),
                                    fileName: customUrl.split('/').pop()?.split('?')[0] || 'remote_model.glb',
                                    selectedAnimation: undefined
                                });
                                setUrlInputModal(false);
                                if (addToast) addToast('3D модель загружена по URL!', 'success');
                            }
                        }}
                        className="flex-1 bg-gray-900 border border-gray-700 text-xs px-2.5 py-1 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (!customUrl.trim()) return;
                            updateState({
                                modelUrl: customUrl.trim(),
                                fileName: customUrl.split('/').pop()?.split('?')[0] || 'remote_model.glb',
                                selectedAnimation: undefined
                            });
                            setUrlInputModal(false);
                            if (addToast) addToast('3D модель загружена по URL!', 'success');
                        }}
                        className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-medium transition-colors shrink-0"
                    >
                        Загрузить
                    </button>
                    <button
                        type="button"
                        onClick={() => setUrlInputModal(false)}
                        className="p-1 text-gray-400 hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Settings & Parameters Bar (Collapsible) */}
            {showSettingsPanel && (
                <div className="p-2.5 bg-gray-950/90 border-b border-gray-800/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px] animate-fadeIn shrink-0">
                    {/* Background Color Palette */}
                    <div className="flex flex-col space-y-1">
                        <span className="text-gray-400 font-medium">Фон вьюпорта:</span>
                        <div className="flex items-center space-x-1">
                            {BG_COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.color}
                                    type="button"
                                    onClick={() => updateState({ modelBg: preset.color })}
                                    className={`w-5 h-5 rounded border transition-all ${
                                        state.modelBg === preset.color
                                            ? 'ring-2 ring-cyan-400 border-white scale-110'
                                            : 'border-gray-700 opacity-70 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: preset.color }}
                                    title={preset.label}
                                />
                            ))}
                            <input
                                type="color"
                                value={state.modelBg}
                                onChange={(e) => updateState({ modelBg: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer bg-transparent border border-gray-700 p-0"
                                title="Пользовательский цвет"
                            />
                        </div>
                    </div>

                    {/* Environment Lighting */}
                    <div className="flex flex-col space-y-1">
                        <span className="text-gray-400 font-medium">Освещение (HDR/Env):</span>
                        <CustomSelect
                            value={state.environment}
                            onChange={(val) => updateState({ environment: val as any })}
                            options={[
                                { value: 'neutral', label: 'Neutral (Сбалансированное)' },
                                { value: 'legacy', label: 'Legacy Default' },
                                { value: 'studio', label: 'Studio (Студийный свет)' },
                                { value: 'sunset', label: 'Sunset (Тёплый закат)' },
                                { value: 'night', label: 'Night (Контрастный неоновый)' },
                            ]}
                        />
                    </div>

                    {/* Exposure & Shadow Sliders */}
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 font-medium">Экспозиция:</span>
                            <span className="text-cyan-300 font-mono text-[10px]">{state.exposure}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.2"
                            max="2.5"
                            step="0.1"
                            value={state.exposure}
                            onChange={(e) => updateState({ exposure: parseFloat(e.target.value) })}
                            className="w-full accent-cyan-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                        />
                    </div>

                    {/* Animations Controller (if available in GLB) */}
                    <div className="flex flex-col space-y-1">
                        <span className="text-gray-400 font-medium">
                            {availableAnimations.length > 0 ? `Анимации (${availableAnimations.length}):` : 'Анимации:'}
                        </span>
                        {availableAnimations.length > 0 ? (
                            <div className="flex items-center space-x-1">
                                <div className="flex-1 min-w-0">
                                    <CustomSelect
                                        value={state.selectedAnimation || availableAnimations[0]}
                                        onChange={(val) => updateState({ selectedAnimation: val })}
                                        options={availableAnimations.map(anim => ({ value: anim, label: anim }))}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateState(prev => ({ isPlayingAnimation: !prev.isPlayingAnimation }))}
                                    className={`p-1.5 rounded transition-colors ${
                                        state.isPlayingAnimation 
                                            ? 'bg-cyan-700 text-white' 
                                            : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                                    title={state.isPlayingAnimation ? 'Приостановить анимацию' : 'Воспроизвести анимацию'}
                                >
                                    {state.isPlayingAnimation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        ) : (
                            <span className="text-gray-500 text-[10px] italic py-1">В файле нет скелетных анимаций</span>
                        )}
                    </div>
                </div>
            )}

            {/* Main Interactive 3D Canvas / Viewport */}
            <div 
                className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center ${
                    isDragOver ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-950/20' : ''
                }`}
                style={{ backgroundColor: state.modelBg }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleViewportDrop}
            >
                {effectiveModelUrl ? (
                    <>
                        {/* Google <model-viewer> Web Component */}
                        {/* @ts-ignore */}
                        <model-viewer
                            ref={modelViewerRef}
                            src={effectiveModelUrl}
                            poster={state.posterUrl || ''}
                            alt={state.fileName || '3D GLB Model'}
                            auto-rotate={state.autoRotate ? '' : undefined}
                            auto-rotate-delay="0"
                            rotation-per-second={`${state.rotationSpeed || 30}deg`}
                            camera-controls=""
                            shadow-intensity={String(state.shadowIntensity ?? 1.0)}
                            exposure={String(state.exposure ?? 1.0)}
                            animation-name={state.selectedAnimation || undefined}
                            autoplay={state.isPlayingAnimation ? '' : undefined}
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                backgroundColor: state.modelBg 
                            }}
                        >
                            <div slot="progress-bar" className="absolute top-0 left-0 w-full h-1 bg-cyan-500 animate-pulse"></div>
                        {/* @ts-ignore */}
                        </model-viewer>

                        {/* Floating Viewport Overlay: Quick Hotkey & Mouse Tips */}
                        <div className="absolute bottom-2 left-2 pointer-events-none bg-gray-950/70 backdrop-blur-md px-2 py-1 rounded text-[10px] text-gray-400 border border-gray-800/80 font-mono shadow">
                            ЛКМ: Вращение • ПКМ: Панорама • Колесо: Зум
                        </div>
                    </>
                ) : (
                    /* Empty Drop Zone */
                    <div 
                        className="flex flex-col items-center justify-center text-center p-6 space-y-3 cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gray-800/80 border-2 border-dashed border-gray-600 group-hover:border-cyan-400 group-hover:bg-cyan-950/30 flex items-center justify-center transition-all shadow-lg group-hover:scale-105">
                            <Box className="w-8 h-8 text-gray-400 group-hover:text-cyan-300 transition-colors" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                            <p className="text-sm font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors">
                                Перетащите .GLB / .glTF модель сюда
                            </p>
                            <p className="text-[11px] text-gray-400">
                                или нажмите для выбора файла с устройства
                            </p>
                            <p className="text-[10px] text-gray-500 pt-1">
                                Поддерживаются PBR материалы, текстуры, нормали и скелетные анимации
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Footer Status & Output Bar */}
            <div className="px-3 py-1.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-[11px] shrink-0">
                <div className="flex items-center space-x-2 text-gray-400 truncate">
                    <span className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${effectiveModelUrl ? 'bg-emerald-400' : 'bg-gray-600'}`}></span>
                        <span>{effectiveModelUrl ? '3D Модель активна' : 'Ожидание 3D файла'}</span>
                    </span>
                    {isModelConnected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                            Подключено из генератора
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {effectiveModelUrl && (
                        <>
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-[10px] flex items-center space-x-1 transition-colors"
                                title="Скопировать ссылку / Data URL модели"
                            >
                                <Copy className="w-3 h-3" />
                                <span>Копировать URL</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleTakeSnapshot}
                                className="px-2 py-0.5 rounded bg-cyan-900/70 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/60 text-[10px] flex items-center space-x-1 transition-colors"
                                title="Сделать 2D снимок"
                            >
                                <Camera className="w-3 h-3" />
                                <span>Снимок 2D</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});
