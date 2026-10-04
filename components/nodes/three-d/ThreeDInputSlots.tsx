import { setupImageDragData } from '../../../utils/imageUtils';
import React, { useRef } from 'react';
import { useLanguage } from '../../../localization';
import { Link, Unlink } from 'lucide-react';
import { 
    HeadFrontIcon, 
    HeadLeftIcon, 
    HeadRightIcon, 
    HeadBackIcon 
} from '../../icons/AppIcons';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import { ThreeDSlotType } from './types';

interface ThreeDInputSlotsProps {
    mode: 'image_to_3d' | 'multiview_to_3d';
    hasUpstreamImages: boolean;
    upstreamImagesCount: number;
    hasIncomingConnections: boolean;
    canBake: boolean;
    onBakeAndDisconnect: () => void;
    // Effective images
    effectiveSingleImage: string | null;
    effectiveFrontImage: string | null;
    effectiveBackImage: string | null;
    effectiveLeftImage: string | null;
    effectiveRightImage: string | null;
    // Connection flags
    isSingleConnected: boolean;
    isFrontConnected: boolean;
    isBackConnected: boolean;
    isLeftConnected: boolean;
    isRightConnected: boolean;
    // Actions
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, slot: ThreeDSlotType) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, slot: ThreeDSlotType) => void;
    onClearSlot: (slot: ThreeDSlotType) => void;
    onOpenImageViewer: (imgSrc: string | null | undefined, title: string) => void;
    // Prompt
    prompt: string;
    onPromptChange: (val: string) => void;
}

export const ThreeDInputSlots: React.FC<ThreeDInputSlotsProps> = ({
    mode,
    hasUpstreamImages,
    upstreamImagesCount,
    hasIncomingConnections,
    canBake,
    onBakeAndDisconnect,
    effectiveSingleImage,
    effectiveFrontImage,
    effectiveBackImage,
    effectiveLeftImage,
    effectiveRightImage,
    isSingleConnected,
    isFrontConnected,
    isBackConnected,
    isLeftConnected,
    isRightConnected,
    onFileUpload,
    onDrop,
    onClearSlot,
    onOpenImageViewer,
    prompt,
    onPromptChange
}) => {
    const { t } = useLanguage();

    const fileInputSingleRef = useRef<HTMLInputElement>(null);
    const fileInputFrontRef = useRef<HTMLInputElement>(null);
    const fileInputBackRef = useRef<HTMLInputElement>(null);
    const fileInputLeftRef = useRef<HTMLInputElement>(null);
    const fileInputRightRef = useRef<HTMLInputElement>(null);

    return (
        <div className="w-full md:w-1/2 p-3 flex flex-col space-y-3 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-700/50">
            <div className="flex items-center justify-between text-gray-300 font-semibold text-xs">
                <div className="flex items-center space-x-2">
                    <span>
                        {mode === 'image_to_3d' 
                            ? (t('threed.mode.imageTo3d') || 'Input Image (1 Slot)') 
                            : (t('threed.mode.multiviewTo3d') || 'Multiview to 3D (4 Views)')}
                    </span>
                    {/* Chain/Unlink Icon inside section header */}
                    <button
                        type="button"
                        onClick={onBakeAndDisconnect}
                        disabled={!canBake}
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
                        {`Multi-Channel: ${upstreamImagesCount}/4 views`}
                    </span>
                ) : mode === 'multiview_to_3d' ? (
                    <span className="text-[10px] text-cyan-400 font-normal">{t('threed.frontRequired') || 'Front view is required'}</span>
                ) : null}
            </div>

            {/* Single Image Mode Input Frame */}
            {mode === 'image_to_3d' && (
                <div 
                    className="relative flex-1 min-h-[180px] bg-gray-950/60 rounded-lg border-2 border-dashed border-gray-700 hover:border-cyan-500/80 transition-colors flex flex-col items-center justify-center p-3 group overflow-hidden"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => onDrop(e, 'image')}
                >
                    {effectiveSingleImage ? (
                        <>
                            <div 
                                onClick={() => onOpenImageViewer(effectiveSingleImage, 'Input Image')}
                                className="cursor-pointer max-h-full max-w-full flex items-center justify-center relative group/preview"
                                title="Нажмите для просмотра в полном разрешении"
                            >
                                <OptimizedThumbnail 
                                    src={effectiveSingleImage} draggable={true} onDragStart={e => { e.stopPropagation(); if (effectiveSingleImage) setupImageDragData(e, effectiveSingleImage, '3D_Input.png'); }}
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
                                    onClick={() => onClearSlot('image')}
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
                        onChange={(e) => onFileUpload(e, 'image')} 
                    />
                </div>
            )}

            {/* Multiview 4-Slot Grid: Top row (Front, Back), Bottom row (Left, Right) */}
            {mode === 'multiview_to_3d' && (
                <div className="grid grid-cols-2 gap-2 flex-1 min-h-[180px]">
                    {/* Top-Left: Front View */}
                    <div 
                        className={`relative bg-gray-950/70 rounded-lg border ${
                            effectiveFrontImage ? 'border-cyan-500/70' : 'border-dashed border-gray-700'
                        } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => onDrop(e, 'front')}
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
                                    onClick={() => onOpenImageViewer(effectiveFrontImage, 'Front View')}
                                    className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                    title="Нажмите для просмотра в полном разрешении"
                                >
                                    <OptimizedThumbnail src={effectiveFrontImage} draggable={true} onDragStart={e => { e.stopPropagation(); if (effectiveFrontImage) setupImageDragData(e, effectiveFrontImage, '3D_Input.png'); }} size={128} alt="Front View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                </div>
                                {!isFrontConnected && (
                                    <button
                                        onClick={() => onClearSlot('front')}
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
                        <input ref={fileInputFrontRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'front')} />
                    </div>

                    {/* Top-Right: Back View */}
                    <div 
                        className={`relative bg-gray-950/70 rounded-lg border ${
                            effectiveBackImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                        } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => onDrop(e, 'back')}
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
                                    onClick={() => onOpenImageViewer(effectiveBackImage, 'Back View')}
                                    className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                    title="Нажмите для просмотра в полном разрешении"
                                >
                                    <OptimizedThumbnail src={effectiveBackImage} draggable={true} onDragStart={e => { e.stopPropagation(); if (effectiveBackImage) setupImageDragData(e, effectiveBackImage, '3D_Input.png'); }} size={128} alt="Back View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                </div>
                                {!isBackConnected && (
                                    <button
                                        onClick={() => onClearSlot('back')}
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
                        <input ref={fileInputBackRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'back')} />
                    </div>

                    {/* Bottom-Left: Left View */}
                    <div 
                        className={`relative bg-gray-950/70 rounded-lg border ${
                            effectiveLeftImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                        } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => onDrop(e, 'left')}
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
                                    onClick={() => onOpenImageViewer(effectiveLeftImage, 'Left View')}
                                    className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                    title="Нажмите для просмотра в полном разрешении"
                                >
                                    <OptimizedThumbnail src={effectiveLeftImage} draggable={true} onDragStart={e => { e.stopPropagation(); if (effectiveLeftImage) setupImageDragData(e, effectiveLeftImage, '3D_Input.png'); }} size={128} alt="Left View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                </div>
                                {!isLeftConnected && (
                                    <button
                                        onClick={() => onClearSlot('left')}
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
                        <input ref={fileInputLeftRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'left')} />
                    </div>

                    {/* Bottom-Right: Right View */}
                    <div 
                        className={`relative bg-gray-950/70 rounded-lg border ${
                            effectiveRightImage ? 'border-gray-600' : 'border-dashed border-gray-700'
                        } p-2 flex flex-col items-center justify-center group overflow-hidden`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => onDrop(e, 'right')}
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
                                    onClick={() => onOpenImageViewer(effectiveRightImage, 'Right View')}
                                    className="cursor-pointer max-h-full max-w-full flex items-center justify-center pt-4"
                                    title="Нажмите для просмотра в полном разрешении"
                                >
                                    <OptimizedThumbnail src={effectiveRightImage} draggable={true} onDragStart={e => { e.stopPropagation(); if (effectiveRightImage) setupImageDragData(e, effectiveRightImage, '3D_Input.png'); }} size={128} alt="Right View" className="max-h-full max-w-full object-contain rounded hover:brightness-110 transition-all" />
                                </div>
                                {!isRightConnected && (
                                    <button
                                        onClick={() => onClearSlot('right')}
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
                        <input ref={fileInputRightRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'right')} />
                    </div>
                </div>
            )}

            {/* Optional Prompt Input */}
            <div className="flex flex-col space-y-1">
                <label className="text-[11px] text-gray-400 font-medium">{t('threed.promptOptional') || 'Text Prompt / Material Guidance (Optional)'}</label>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="e.g. realistic detailed sci-fi robot with metallic finish"
                    className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                />
            </div>
        </div>
    );
};
