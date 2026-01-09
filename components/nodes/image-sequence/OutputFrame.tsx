
import React, { useCallback, useState } from 'react';
import { ActionButton } from '../../ActionButton';
import { CopyIcon } from '../../icons/AppIcons';
import { CustomCheckbox } from '../../CustomCheckbox';

const AspectRatioIcon: React.FC<{ width: number; height: number }> = ({ width, height }) => {
    const ratio = width / height;
    let iconPath = "";
    let title = "";

    if (ratio > 1.2) {
        iconPath = "M2 6h20v12H2z";
        title = "Landscape";
    } else if (ratio < 0.85) {
        iconPath = "M6 2h12v20H6z";
        title = "Portrait";
    } else {
        iconPath = "M4 4h16v16H4z";
        title = "Square";
    }

    return (
        <div className="flex items-center justify-center w-6 h-6" title={title}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                 <path d="MiconPath" />
                 <path d={iconPath} />
            </svg>
        </div>
    );
};

interface OutputFrameProps {
  index: number; 
  frameNumber: number;
  imageUrl: string | undefined;
  fullSizeImageUrl?: string;
  status: 'idle' | 'pending' | 'prompt_processing' | 'generating' | 'done' | 'error';
  isSelected: boolean;
  onSelect: (frameNumber: number) => void; 
  onDoubleClick: (frameNumber: number) => void;
  onRegenerate: (frameNumber: number) => void;
  onDownload: (frameNumber: number, prompt: string) => void;
  onCopy: (frameNumber: number) => void;
  onCopyTextPrompt: (text: string) => void;
  onCopyVideo?: (prompt: string) => void;
  onStop: (frameNumber: number) => void;
  isGeneratingSequence: boolean;
  isAnyGenerationInProgress: boolean;
  t: (key: string) => string;
  isChecked: boolean;
  onCheck: (frameNumber: number, isShiftHeld: boolean) => void; 
  prompt: string; 
  videoPrompt?: string;
  onOpenRaster: (frameNumber: number, imageUrl: string) => void;
  onOpenAI: (imageUrl: string) => void;
  onReplaceImage: (frameNumber: number, imageUrl: string) => void;
  onEditPrompt?: (frameNumber: number) => void;
  readOnlyPrompt?: boolean;
  layoutTop?: number;
  layoutLeft?: string;
  layoutWidth?: string;
  layoutHeight?: string;
  onEditInSource?: (frameNumber: number) => void;
  characterIndices?: string[];
  onExpandFrame?: (frameNumber: number, ratio: string) => void;
  shotType?: string;
  onReportDimensions?: (frameNumber: number, width: number, height: number) => void;
  onCopyCombinedPrompt?: (frameNumber: number) => void; // New prop
}

export const OutputFrame: React.FC<OutputFrameProps> = React.memo(({ index, frameNumber, imageUrl, fullSizeImageUrl, status, isSelected, onSelect, onDoubleClick, onRegenerate, onDownload, onCopy, onCopyTextPrompt, onCopyVideo, onStop, isGeneratingSequence, isAnyGenerationInProgress, t, isChecked, onCheck, prompt, videoPrompt, onOpenRaster, onOpenAI, onReplaceImage, onEditPrompt, readOnlyPrompt, onEditInSource, characterIndices, onExpandFrame, shotType, onReportDimensions, onCopyCombinedPrompt }) => {
    const statusClasses = {
        idle: 'bg-gray-800',
        pending: 'bg-gray-700/50',
        prompt_processing: 'bg-yellow-800/50 animate-pulse',
        generating: 'bg-blue-800/50 animate-pulse',
        done: 'bg-gray-800',
        error: 'bg-red-800/50',
    };

    const statusText = {
        idle: '',
        pending: t('image_sequence.status.pending' as any) || 'Queued',
        prompt_processing: 'Processing...',
        generating: 'Generating...',
        done: '',
        error: t('image_sequence.status.error'),
    };

    const [isDragOver, setIsDragOver] = useState(false);
    const [imgDimensions, setImgDimensions] = useState<{width: number, height: number} | null>(null);

    const handleSelect = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(frameNumber);
    }, [frameNumber, onSelect]);

    const handleOpenRasterClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (fullSizeImageUrl || imageUrl) {
            onOpenRaster(frameNumber, fullSizeImageUrl || imageUrl!);
        }
    }, [frameNumber, fullSizeImageUrl, imageUrl, onOpenRaster]);

    const handleOpenAIClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (fullSizeImageUrl || imageUrl) {
            onOpenAI(fullSizeImageUrl || imageUrl!);
        }
    }, [fullSizeImageUrl, imageUrl, onOpenAI]);

    const handleDragEnter = (e: React.DragEvent) => {
        if (status === 'generating' || status === 'prompt_processing') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (status === 'generating' || status === 'prompt_processing') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (status === 'generating' || status === 'prompt_processing') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        if (status === 'generating' || status === 'prompt_processing') return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        // Internal Image Drop
        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            if (dragImageData.startsWith('data:')) {
                onReplaceImage(frameNumber, dragImageData);
            } else {
                 fetch(dragImageData)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                             if (ev.target?.result) {
                                 onReplaceImage(frameNumber, ev.target.result as string);
                             }
                        };
                        reader.readAsDataURL(blob);
                    });
            }
            return;
        }

        // File Drop
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                 const reader = new FileReader();
                 reader.onload = (ev) => {
                     if (ev.target?.result) {
                         onReplaceImage(frameNumber, ev.target.result as string);
                     }
                 };
                 reader.readAsDataURL(file);
            }
        }
    }, [frameNumber, onReplaceImage, status]);

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        setImgDimensions({ width, height });
        if (onReportDimensions) {
            onReportDimensions(frameNumber, width, height);
        }
    };

    const commonButtonClass = "p-1 rounded-md text-[#dad5cf] hover:bg-gray-600 hover:text-white transition-colors focus:outline-none pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50";

    const isProcessingOrGenerating = status === 'prompt_processing' || status === 'generating';
    const showImage = !!imageUrl;

    return (
        <div 
            onClick={handleSelect} 
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative group border-2 transition-colors h-full w-full ${isDragOver ? 'border-cyan-400 bg-gray-700/50' : (isSelected ? 'border-cyan-400' : 'border-transparent')} ${statusClasses[status]}`}
        >
             <div className="absolute top-1 left-1 z-20 pointer-events-auto" title="Select frame for batch generation">
                <CustomCheckbox
                    checked={!!isChecked}
                    onChange={(_, e) => onCheck(frameNumber, e.shiftKey)}
                />
            </div>
            
            <div className="w-full h-full overflow-hidden rounded-lg pointer-events-none relative">
                {showImage && <img 
                    src={imageUrl} 
                    className={`w-full h-full object-cover cursor-pointer ${isProcessingOrGenerating ? 'opacity-50 blur-[2px]' : ''}`} 
                    alt={`Frame ${frameNumber}`} 
                    style={{ pointerEvents: 'auto' }}
                    draggable={true}
                    onLoad={handleImageLoad}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onDoubleClick(frameNumber); }}
                    onDragStart={(e) => {
                        e.dataTransfer.setData('application/prompt-modifier-drag-image', fullSizeImageUrl || imageUrl || '');
                        e.dataTransfer.effectAllowed = 'copy';
                        e.stopPropagation();
                    }}
                />}
                
                 {(status === 'pending' || isProcessingOrGenerating || status === 'error' || (status === 'idle' && !showImage)) && (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-10 ${showImage ? 'bg-black/40' : ''}`}>
                        {status !== 'pending' && status !== 'idle' && <span className="text-white font-semibold text-sm drop-shadow-md">{statusText[status]}</span>}
                        {status === 'pending' && !showImage && <span className="text-white font-semibold text-sm drop-shadow-md">{statusText[status]}</span>}
                        
                        {isProcessingOrGenerating && (
                            <>
                                <svg className="animate-spin h-6 w-6 text-cyan-400 mt-2 drop-shadow-md" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <div className="flex space-x-2 mt-2 pointer-events-auto">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); onStop(frameNumber); }}
                                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold shadow-md"
                                    >
                                        {t('image_sequence.stop_queue')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {!imageUrl && status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-gray-600 text-xs">{isDragOver ? 'Drop Image' : ''}</span>
                </div>
            )}
            
            {/* Action Bar - Always visible unless generating */}
            {!isProcessingOrGenerating && status !== 'pending' && (
                <>
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>
                    <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-auto">
                         {onCopyVideo && videoPrompt && (
                            <ActionButton title={t('node.action.copyVideoPrompt')} tooltipPosition="bottom" tooltipAlign="start" onClick={(e) => { e.stopPropagation(); onCopyVideo(videoPrompt); }} className={commonButtonClass}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </ActionButton>
                        )}
                        
                        {/* New Combined Prompt Copy Button */}
                        {onCopyCombinedPrompt && (
                             <ActionButton 
                                title="Copy Combined Prompt" 
                                tooltipPosition="bottom" 
                                tooltipAlign="center" 
                                onClick={(e) => { e.stopPropagation(); onCopyCombinedPrompt(frameNumber); }} 
                                className={commonButtonClass}
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-400 group-hover:text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </ActionButton>
                        )}

                        <ActionButton title={t('node.action.copyImagePrompt')} tooltipPosition="bottom" tooltipAlign="center" onClick={(e) => { e.stopPropagation(); onCopyTextPrompt(prompt); }} className={commonButtonClass}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </ActionButton>
                        
                        {imageUrl && (
                            <ActionButton title={t('node.action.copyImage')} tooltipPosition="bottom" tooltipAlign="center" onClick={(e) => { e.stopPropagation(); onCopy(frameNumber); }} className={commonButtonClass}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                        )}
                        
                        {imageUrl && (
                            <ActionButton title={t('node.action.download')} tooltipPosition="bottom" tooltipAlign="center" onClick={(e) => { e.stopPropagation(); onDownload(frameNumber, prompt); }} className={commonButtonClass}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></ActionButton>
                        )}

                        <ActionButton title={t('image_sequence.regenerate')} tooltipPosition="bottom" tooltipAlign="end" onClick={(e) => { e.stopPropagation(); onRegenerate(frameNumber); }} disabled={isAnyGenerationInProgress} className={commonButtonClass}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></ActionButton>
                        
                        {((!readOnlyPrompt && onEditPrompt) || (readOnlyPrompt && onEditInSource)) && (
                            <ActionButton title={readOnlyPrompt ? t('image_sequence.edit_in_source') : t('image_sequence.edit_prompt')} tooltipPosition="bottom" tooltipAlign="end" onClick={(e) => { 
                                e.stopPropagation(); 
                                if (readOnlyPrompt && onEditInSource) {
                                    onEditInSource(frameNumber);
                                } else if (onEditPrompt) {
                                    onEditPrompt(frameNumber);
                                }
                            }} className={commonButtonClass}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </ActionButton>
                        )}
                    </div>
                    
                    {/* Bottom Left Action Bar - Only if image present */}
                    {imageUrl && (
                        <div className="absolute bottom-1 left-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-auto">
                            <ActionButton title={t('node.action.rasterEditor')} tooltipPosition="top" tooltipAlign="start" onClick={handleOpenRasterClick} className="p-1 bg-emerald-600/80 rounded text-white hover:bg-emerald-700">
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.openInAIEditor')} tooltipPosition="top" tooltipAlign="start" onClick={handleOpenAIClick} className="p-1 bg-cyan-600/80 rounded text-white hover:bg-cyan-700">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg>
                            </ActionButton>
                            
                            <ActionButton 
                                title="Expand to 16:9" 
                                tooltipPosition="top" 
                                tooltipAlign="start"
                                disabled={isAnyGenerationInProgress}
                                onClick={(e) => { e.stopPropagation(); onExpandFrame && onExpandFrame(frameNumber, '16:9'); }}
                                className={`p-1 rounded text-white transition-colors ${isAnyGenerationInProgress ? 'bg-gray-700/50 cursor-not-allowed opacity-50' : 'bg-gray-700/80 hover:bg-cyan-600'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="2" y="8" width="20" height="8" rx="1" />
                                </svg>
                            </ActionButton>
    
                            <ActionButton 
                                title="Expand to 9:16" 
                                tooltipPosition="top" 
                                tooltipAlign="start"
                                disabled={isAnyGenerationInProgress}
                                onClick={(e) => { e.stopPropagation(); onExpandFrame && onExpandFrame(frameNumber, '9:16'); }}
                                className={`p-1 rounded text-white transition-colors ${isAnyGenerationInProgress ? 'bg-gray-700/50 cursor-not-allowed opacity-50' : 'bg-gray-700/80 hover:bg-cyan-600'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor">
                                    <rect x="8" y="2" width="8" height="20" rx="1" />
                                </svg>
                            </ActionButton>
                        </div>
                    )}

                    {/* Character Badges - Always Visible */}
                    {characterIndices && characterIndices.length > 0 && (
                        <div className="absolute bottom-8 right-1 flex flex-col items-end space-y-0.5 z-10 pointer-events-none opacity-75 group-hover:opacity-100 transition-opacity">
                            {characterIndices.map((idx, i) => (
                                <div key={i} className="bg-black/60 text-white text-[9px] font-bold px-1 rounded backdrop-blur-sm">
                                    ENT-{idx}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Bottom Right Info (Frame + Aspect Ratio) - Always Visible */}
                    <div className="absolute bottom-1 right-1 flex items-center space-x-1 z-10 pointer-events-none opacity-75">
                        <div className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-l-md h-6 flex items-center justify-center min-w-[20px]">
                            {frameNumber}{shotType ? ` [${shotType}]` : ''}
                        </div>
                        <div className="bg-black/60 h-6 flex items-center justify-center px-1 rounded-r-md">
                             {imgDimensions ? (
                                <AspectRatioIcon width={imgDimensions.width} height={imgDimensions.height} />
                             ) : (
                                 <span className="text-[9px] text-gray-300 font-mono">N/A</span>
                             )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});
