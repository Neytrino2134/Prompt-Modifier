import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../../../localization';
import { Download, RotateCcw, X, Copy } from 'lucide-react';

interface ThreeDViewportProps {
    activeTab: 'preview3d' | 'rendered';
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    autoRotate: boolean;
    modelBg: string;
    taskId?: string;
    onToggleAutoRotate: () => void;
    onDownloadGlb: () => void;
    onCopyGlbUrl: () => void;
    onUnloadModel: () => void;
}

const ThreeDViewportComponent: React.FC<ThreeDViewportProps> = ({
    activeTab,
    modelUrl,
    thumbnailUrl,
    renderedImageUrl,
    autoRotate,
    modelBg,
    taskId,
    onToggleAutoRotate,
    onDownloadGlb,
    onCopyGlbUrl,
    onUnloadModel
}) => {
    const { t } = useLanguage();
    const modelViewerRef = useRef<any>(null);

    const modelExtension = (url: string) => /\.(fbx|obj|stl|gltf)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() || 'glb';
    const canPreviewModel = !modelUrl || ['glb', 'gltf'].includes(modelExtension(modelUrl));

    useEffect(() => {
        if (modelViewerRef.current) {
            try {
                if (autoRotate) {
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
    }, [autoRotate, modelUrl]);

    return (
        <div className="w-full md:w-1/2 p-3 flex flex-col space-y-3 overflow-hidden bg-gray-950/40">
            {/* Tab 1: 3D Interactive View */}
            {activeTab === 'preview3d' && (
                <div className="flex-1 flex flex-col min-h-[200px] bg-slate-900 rounded-lg border border-gray-700 relative overflow-hidden">
                    {modelUrl && !canPreviewModel ? (
                        <div className="p-4 text-sm text-gray-300">
                            This model uses {modelExtension(modelUrl).toUpperCase()}. Download it to open in a 3D editor; the preview supports GLB/GLTF.
                        </div>
                    ) : modelUrl ? (
                        <>
                            {/* Web Component <model-viewer> */}
                            {/* @ts-ignore */}
                            <model-viewer
                                ref={modelViewerRef}
                                src={modelUrl}
                                poster={thumbnailUrl || renderedImageUrl || ''}
                                alt="Tripo 3D Generated Model"
                                auto-rotate={autoRotate ? '' : undefined}
                                auto-rotate-delay="0"
                                rotation-per-second="30deg"
                                camera-controls=""
                                shadow-intensity="1"
                                exposure="1"
                                style={{ width: '100%', height: '100%', backgroundColor: modelBg }}
                            >
                                <div slot="progress-bar" className="absolute top-0 left-0 w-full h-1 bg-cyan-500 animate-pulse"></div>
                            {/* @ts-ignore */}
                            </model-viewer>

                            {/* Floating 3D Viewer Toolbar */}
                            <div className="absolute top-2 right-2 flex items-center space-x-1 bg-gray-900/90 backdrop-blur-md p-1 rounded-lg border border-gray-700 shadow-xl text-[11px] z-20">
                                <button
                                    onClick={onToggleAutoRotate}
                                    className={`px-2 py-1 rounded flex items-center space-x-1 font-medium transition-all ${
                                        autoRotate 
                                            ? 'bg-cyan-600 text-white shadow' 
                                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                    }`}
                                    title="Вращение: авто-поворот 3D модели"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
                                    <span>{t('threed.autoRotate') || 'Rotate'}</span>
                                </button>
                                <button
                                    onClick={onDownloadGlb}
                                    className="p-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                    title="Скачать 3D модель (.glb)"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={onCopyGlbUrl}
                                    className="p-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                    title={t('threed.copyModelLink') || "Скопировать прямую ссылку на GLB"}
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                <div className="h-3.5 w-px bg-gray-700 mx-0.5"></div>
                                <button
                                    onClick={onUnloadModel}
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
                    {renderedImageUrl || thumbnailUrl ? (
                        <>
                            <img
                                src={renderedImageUrl || thumbnailUrl}
                                alt="3D Rendered Result"
                                className="max-h-full max-w-full object-contain rounded"
                            />
                            {/* Floating 2D Render Toolbar */}
                            <div className="absolute top-2 right-2 flex items-center space-x-1 bg-gray-900/90 backdrop-blur-md p-1 rounded-lg border border-gray-700 shadow-xl text-[11px] z-20">
                                <a
                                    href={renderedImageUrl || thumbnailUrl}
                                    download={`render_${taskId || Date.now()}.png`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                    title="Скачать 2D рендер изображения"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={onUnloadModel}
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
    );
};

export const ThreeDViewport = React.memo(ThreeDViewportComponent);
