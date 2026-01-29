
import React, { useState } from 'react';
import type { NodeContentProps } from '../../types';
import CustomSelect from '../CustomSelect';
import { useAppContext } from '../../contexts/AppContext';
import { TutorialTooltip } from '../TutorialTooltip';
import { CustomCheckbox } from '../CustomCheckbox';
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../../components/icons/AppIcons';
import { expandImageAspectRatio } from '../../services/imageActions';
import { generateThumbnail } from '../../utils/imageUtils';

export const ImageOutputNode: React.FC<NodeContentProps> = ({ node, isGeneratingImage, isExecutingChain, onModelChange, onAspectRatioChange, onResolutionChange, onAutoDownloadChange, onGenerateImage, onStopChainExecution, onExecuteChain, t, onDownloadImage, setImageViewer, getFullSizeImage, setFullSizeImage, onValueChange, getUpstreamNodeValues, isGlobalProcessing, onCopyImageToClipboard, addToast }) => {
    const context = useAppContext();
    const { tutorialStep, tutorialTargetId, advanceTutorial, skipTutorial } = context || {};
    
    const [transformingRatio, setTransformingRatio] = useState<string | null>(null);

    const isTutorialActive = tutorialTargetId === node.id && tutorialStep === 'image_output_generate';

    // Calculate prompt for drag/drop context
    const texts = getUpstreamNodeValues(node.id).filter(v => typeof v === 'string') as string[];
    const currentPrompt = texts.join(', ');

    const handleGenerateClick = () => {
        onGenerateImage(node.id);
        // Advance to 'generating' step, not completion yet
        if (isTutorialActive && advanceTutorial) {
            advanceTutorial();
        }
    };

    const handleCopyLarge = (e: React.MouseEvent) => {
        e.stopPropagation();
        const fullSizeSrc = getFullSizeImage(node.id, 0) || node.value;
        if (fullSizeSrc && onCopyImageToClipboard) {
            onCopyImageToClipboard(fullSizeSrc);
        }
    };

    const handleRatioExpand = async (targetRatio: string) => {
        const fullSizeSrc = getFullSizeImage(node.id, 0) || node.value;
        if (!fullSizeSrc) return;

        setTransformingRatio(targetRatio);
        try {
            // Use the node's selected model or default to flash for speed/cost if not specified
            // Note: expansion usually works best with the flash model for editing tasks
            const expansionModel = 'gemini-2.5-flash-image'; 

            const newImage = await expandImageAspectRatio(fullSizeSrc, targetRatio, currentPrompt, expansionModel);
            
            // 1. Update High Res Cache
            setFullSizeImage(node.id, 0, newImage);
            
            // 2. Update Thumbnail/Value
            const thumb = await generateThumbnail(newImage, 256, 256);
            onValueChange(node.id, thumb);

            if (addToast) addToast(`Expanded to ${targetRatio}`, 'success');
        } catch (error: any) {
            console.error("Ratio expansion failed:", error);
            if (addToast) addToast(`Failed to expand: ${error.message}`, 'error');
        } finally {
            setTransformingRatio(null);
        }
    };

    const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
    const modelOptions = [
      { value: 'imagen-4.0-generate-001', label: 'Imagen 4.0 (Quality)' },
      { value: 'imagen-4.0-ultra-generate-preview-06-06', label: 'Imagen 4.0 Ultra (Preview)' },
      { value: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro (Nano Banana Pro)' },
      { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana)' }
    ];
    
    const isNanoBanana = node.model === 'gemini-3-pro-image-preview';
    // An 'imagen' model is selected if the model string is not set (default) or starts with 'imagen-4.0'
    const isImagenModel = !node.model || node.model.startsWith('imagen-4.0');
    const isAspectRatioEnabled = isImagenModel || isNanoBanana;

    const resolutions = [
        { value: '1K', label: '1K' },
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' },
    ];

    const handleClick = () => {
        if (!node.value) return;
        const fullSizeSrc = getFullSizeImage(node.id, 0) || node.value; // Frame 0 for single image nodes
        if (fullSizeSrc) {
            setImageViewer({
                sources: [{ src: fullSizeSrc, frameNumber: 0, prompt: currentPrompt }],
                initialIndex: 0,
            });
        }
    };

    const LargeCopyIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="8" y="8" width="12" height="12" rx="2" ry="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
    );
    
    const LoadingSpinner = () => (
        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );

    return (
        <div className="flex flex-col h-full">
            <div onClick={handleClick} onWheel={(e) => e.stopPropagation()} className="relative w-full flex-grow bg-gray-700 rounded-md flex items-center justify-center overflow-hidden mb-2 group cursor-pointer border border-gray-600 hover:border-gray-500 transition-colors">
                {node.value ? (
                    <img
                        src={node.value || getFullSizeImage(node.id, 0)}
                        alt="Generated result"
                        className="object-contain w-full h-full"
                        draggable={true}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => {
                            // Prioritize High Resolution Image
                            const imageToDrag = getFullSizeImage(node.id, 0) || node.value;
                            if (imageToDrag) {
                                // 1. Internal App Drag (Raw Image)
                                e.dataTransfer.setData('application/prompt-modifier-drag-image', imageToDrag);

                                // 2. Internal App Drag (Rich Info for internal drops)
                                e.dataTransfer.setData('application/prompt-modifier-drag-info', JSON.stringify({
                                    src: imageToDrag,
                                    prompt: currentPrompt
                                }));
                                
                                // 3. External Drag (File Download for Chrome/Edge)
                                const filename = `Output_Image_${Date.now()}.png`;
                                e.dataTransfer.setData("DownloadURL", `image/png:${filename}:${imageToDrag}`);
                                
                                // 4. External Drag (HTML Insertion for Docs/Other Browsers)
                                e.dataTransfer.setData("text/html", `<img src="${imageToDrag}" alt="Exported Image" />`);

                                // 5. Standard URI List
                                e.dataTransfer.setData("text/uri-list", imageToDrag);

                                e.dataTransfer.effectAllowed = 'copy';
                                e.stopPropagation();
                            }
                        }}
                    />
                ) : (
                    <span className="text-gray-400">{t('node.content.imageHere')}</span>
                )}
                <div className={`absolute inset-0 bg-gray-800/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 transition-opacity duration-300 ${(isGeneratingImage || (isExecutingChain && !node.value)) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <svg className="animate-spin h-8 w-8 text-accent-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="mt-2 font-semibold text-accent-text">{isExecutingChain ? 'Executing...' : t('node.content.generating')}</span>
                </div>
                {node.value && !(isGeneratingImage || (isExecutingChain && !node.value)) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none gap-4">
                        <button
                            onClick={handleCopyLarge}
                            className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors pointer-events-auto"
                            aria-label={t('node.action.copy')}
                            title={t('node.action.copy')}
                        >
                            {LargeCopyIcon}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownloadImage(node.id); }}
                            className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors pointer-events-auto"
                            aria-label={t('node.action.download')}
                            title={t('node.action.download')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    </div>
                )}
                {node.value && (
                    <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton title={t('node.action.copy')} onClick={handleCopyLarge}>
                            <CopyIcon />
                        </ActionButton>
                        <ActionButton title={t('node.action.download')} onClick={(e) => { e.stopPropagation(); onDownloadImage(node.id); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></ActionButton>
                    </div>
                )}
                
                {/* Expansion Controls - Bottom Right Overlay */}
                {node.value && !(isGeneratingImage || (isExecutingChain && !node.value)) && (
                    <div className="absolute bottom-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <button
                            onClick={(e) => { e.stopPropagation(); handleRatioExpand('16:9'); }}
                            disabled={isGeneratingImage || isExecutingChain || !!transformingRatio}
                            className="px-2 py-1 text-[10px] font-bold text-gray-200 bg-gray-800/80 hover:bg-gray-700 hover:text-white border border-gray-600/50 rounded backdrop-blur-sm shadow-sm flex items-center gap-1 transition-colors pointer-events-auto"
                            title="Expand to 16:9"
                        >
                            {transformingRatio === '16:9' ? (
                                <LoadingSpinner />
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="8" rx="1" /></svg>
                                    16:9
                                </>
                            )}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRatioExpand('9:16'); }}
                            disabled={isGeneratingImage || isExecutingChain || !!transformingRatio}
                            className="px-2 py-1 text-[10px] font-bold text-gray-200 bg-gray-800/80 hover:bg-gray-700 hover:text-white border border-gray-600/50 rounded backdrop-blur-sm shadow-sm flex items-center gap-1 transition-colors pointer-events-auto"
                            title="Expand to 9:16"
                        >
                            {transformingRatio === '9:16' ? (
                                <LoadingSpinner />
                            ) : (
                                 <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="20" rx="1" /></svg>
                                    9:16
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
            <div className="mb-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('node.content.generationMode')}</label>
                <CustomSelect
                    id={`model-select-${node.id}`}
                    value={node.model || 'imagen-4.0-generate-001'}
                    onChange={(value) => onModelChange(node.id, value)}
                    disabled={isGeneratingImage || isExecutingChain}
                    options={modelOptions}
                />
            </div>
            {isNanoBanana && (
                <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Resolution</label>
                    <CustomSelect
                        value={node.resolution && ['1K', '2K', '4K'].includes(node.resolution) ? node.resolution : '1K'}
                        onChange={(value) => onResolutionChange(node.id, value as '1K'|'2K'|'4K')}
                        disabled={isGeneratingImage || isExecutingChain}
                        options={resolutions}
                    />
                </div>
            )}
            <div className="mb-2">
                <label htmlFor={`aspect-ratio-${node.id}`} className={`block text-xs font-medium mb-1 transition-colors ${!isAspectRatioEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                    {t('node.content.aspectRatio')}
                </label>
                <CustomSelect
                    id={`aspect-ratio-${node.id}`}
                    value={node.aspectRatio || '1:1'}
                    onChange={(value) => onAspectRatioChange(node.id, value)}
                    disabled={isGeneratingImage || !isAspectRatioEnabled || isExecutingChain}
                    title={!isAspectRatioEnabled ? t('node.content.aspectRatioNotSupportedFast') : t('node.content.aspectRatioHelp')}
                    options={aspectRatios.map(ratio => ({ value: ratio, label: ratio }))}
                />
            </div>
            <div className="mb-2">
                <CustomCheckbox
                    id={`auto-download-toggle-${node.id}`}
                    checked={!!node.autoDownload}
                    onChange={(checked) => onAutoDownloadChange(node.id, checked)}
                    disabled={isGeneratingImage || isExecutingChain}
                    label={t('node.content.autoDownload')}
                />
            </div>
            
            <div className="flex space-x-2 h-10">
                <TutorialTooltip 
                    content={t('tutorial.step3')} 
                    isActive={!!isTutorialActive} 
                    position="top" 
                    onSkip={skipTutorial} 
                    className="flex-grow h-full"
                >
                    <button
                        onClick={handleGenerateClick}
                        disabled={isGeneratingImage || isExecutingChain || isGlobalProcessing || !!transformingRatio}
                        className="w-full h-full px-4 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {isGeneratingImage ? t('node.content.generating') : t('node.content.generateImage')}
                    </button>
                </TutorialTooltip>
                
                {isExecutingChain ? (
                    <button
                        onClick={onStopChainExecution}
                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200"
                        title="Остановить выполнение"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => onExecuteChain(node.id)}
                        disabled={isGeneratingImage || isExecutingChain || isGlobalProcessing || !!transformingRatio}
                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                        title={t('node.action.executeChainTitle')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};
