import React, { useState, useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { TutorialTooltip } from '../TutorialTooltip';
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../../components/icons/AppIcons';
import { expandImageAspectRatio } from '../../services/imageActions';
import { generateThumbnail, setupImageDragData } from '../../utils/imageUtils';
import { 
    useOpenAiEnabled, 
    getImageModelOptions, 
    isGptImage2Model, 
    resolveImageModel, 
    isNanoBanana21Model, 
    getImageModelCapabilities 
} from '../../services/modelConfig';
import { ModelSelectorDropdown } from './image-editor/ModelSelectorDropdown';
import { AspectRatioDropdown } from './image-editor/AspectRatioDropdown';
import { ResolutionDropdown } from './image-editor/ResolutionDropdown';
import { ThinkingToggleDropdown } from './image-editor/ThinkingToggleDropdown';
import { SearchToggleDropdown } from './image-editor/SearchToggleDropdown';
import { RichOptionDropdown } from './image-editor/RichOptionDropdown';
import { EditorTooltip } from './image-editor/EditorTooltip';
import { allThemes } from '../settings/appearance/ThemeAndAutoSaveSettings';
import { ChevronLeft, ChevronRight, Unlink, Link as LinkIcon, Sparkles, Download, HardDrive } from 'lucide-react';

export const ImageOutputNode: React.FC<NodeContentProps> = ({ 
    node, 
    isGeneratingImage, 
    isExecutingChain, 
    onModelChange, 
    onQualityChange,
    onOutputFormatChange,
    onSizeChange,
    onAspectRatioChange, 
    onResolutionChange, 
    onAutoDownloadChange, 
    onAutoSaveImagesChange,
    onGenerateImage, 
    onStopChainExecution, 
    onExecuteChain, 
    t, 
    onDownloadImage, 
    setImageViewer, 
    getFullSizeImage, 
    setFullSizeImage, 
    onValueChange, 
    getUpstreamNodeValues, 
    isGlobalProcessing, 
    onCopyImageToClipboard, 
    addToast 
}) => {
    const context = useAppContext();
    const { 
        tutorialStep, 
        tutorialTargetId, 
        advanceTutorial, 
        skipTutorial, 
        isBatchMode, 
        setIsBatchMode,
        isFormingBatch,
        getNodeActiveBatchJob,
        isNodeBatchActive,
        setConnections
    } = context || {};

    const currentTheme = context?.currentTheme || 'cyan';
    const activeThemeDef = useMemo(() => {
        return allThemes.find(th => th.id === currentTheme) || allThemes[0];
    }, [currentTheme]);
    const themeColor = activeThemeDef?.color || '#06b6d4';

    // Secondary/additional theme color: light green (#10b981) for cyan theme, and theme secondary for other themes
    const secondaryThemeColor = useMemo(() => {
        if (currentTheme === 'cyan') {
            return '#10b981'; // Светло-зеленый (emerald / light green) для темы Cyan
        }
        const secondaryThemeMap: Record<string, string> = {
            cyan: '#10b981',
            azure: '#38bdf8',
            amber: '#fbbf24',
            teal: '#2dd4bf',
            rose: '#fb7185',
            purple: '#c084fc',
            pink: '#f472b6',
            red: '#f87171',
            orange: '#fb923c',
            lime: '#a3e635',
            emerald: '#34d399',
            gray: '#a1a1aa',
            pastel_mint: '#2dd4bf',
            pastel_lavender: '#c4b5db',
            pastel_peach: '#ebba9e',
            pastel_rose: '#e2afc3',
            pastel_sky: '#a5c6de',
            pastel_vanilla: '#e8d49d',
            pastel_sage: '#86efac',
            pastel_sand: '#fcd34d'
        };
        return secondaryThemeMap[currentTheme] || activeThemeDef?.secondaryColor || '#10b981';
    }, [currentTheme, activeThemeDef]);

    const isForming = isFormingBatch ? isFormingBatch(node.id) : false;
    const activeBatchJob = getNodeActiveBatchJob ? getNodeActiveBatchJob(node.id) : undefined;
    const isBatchBusy = isNodeBatchActive ? isNodeBatchActive(node.id) : false;
    
    const [transformingRatio, setTransformingRatio] = useState<string | null>(null);

    const isTutorialActive = tutorialTargetId === node.id && tutorialStep === 'image_output_generate';

    const handleQualitySelect = (val: string) => {
        if (onQualityChange) {
            onQualityChange(node.id, val);
        } else if (context?.handleQualityChange) {
            context.handleQualityChange(node.id, val);
        }
    };

    const handleOutputFormatSelect = (val: string) => {
        if (onOutputFormatChange) {
            onOutputFormatChange(node.id, val);
        } else if (context?.handleOutputFormatChange) {
            context.handleOutputFormatChange(node.id, val);
        }
    };

    const handleSizeSelect = (val: string) => {
        if (onSizeChange) {
            onSizeChange(node.id, val);
        } else if (context?.handleSizeChange) {
            context.handleSizeChange(node.id, val);
        }
    };

    const handleThinkingLevelSelect = (val: string) => {
        if (context?.setNodes) {
            context.setNodes((nds: any[]) => nds.map(n => n.id === node.id ? { ...n, thinkingLevel: val } : n));
        }
    };

    const handleSearchGroundingSelect = (val: string) => {
        if (context?.setNodes) {
            context.setNodes((nds: any[]) => nds.map(n => n.id === node.id ? { ...n, searchGrounding: val } : n));
        }
    };

    const isAutoSaveOn = node.autoSaveImages !== undefined ? !!node.autoSaveImages : true;

    const handleToggleAutoSave = () => {
        if (isGeneratingImage || isExecutingChain) return;
        const nextVal = !isAutoSaveOn;
        if (onAutoSaveImagesChange) {
            onAutoSaveImagesChange(node.id, nextVal);
        } else if (context?.handleAutoSaveImagesChange) {
            context.handleAutoSaveImagesChange(node.id, nextVal);
        } else if (context?.setNodes) {
            context.setNodes((nds: any[]) => nds.map(n => n.id === node.id ? { ...n, autoSaveImages: nextVal } : n));
        }
        if (addToast) {
            addToast(
                nextVal 
                    ? (t('node.content.autoSaveDiskActive') || 'Автосохранение на диск включено')
                    : (t('node.content.autoSaveDiskInactive') || 'Автосохранение на диск выключено'),
                'info'
            );
        }
    };

    const handleToggleAutoDownload = () => {
        if (isGeneratingImage || isExecutingChain) return;
        onAutoDownloadChange(node.id, !node.autoDownload);
    };

    // Calculate prompt for drag/drop context
    const texts = getUpstreamNodeValues(node.id).filter(v => typeof v === 'string') as string[];
    const hasUpstreamText = texts.length > 0;
    const currentPrompt = hasUpstreamText ? texts.join(', ') : (node.customPrompt || '');

    const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (context?.handleCustomPromptChange) {
            context.handleCustomPromptChange(node.id, e.target.value);
        }
    };

    const handleEmbedAndDisconnect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (context?.handleCustomPromptChange) {
            context.handleCustomPromptChange(node.id, currentPrompt);
        }
        if (setConnections) {
            setConnections(prev => prev.filter(c => c.toNodeId !== node.id));
        }
        if (addToast) {
            addToast(t('node.content.promptEmbedded') || 'Входящий текст встроен в поле, связь отключена', 'success');
        }
    };

    const handleGenerateClick = () => {
        onGenerateImage(node.id);
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
            const expansionModel = 'gemini-2.5-flash-image'; 
            const newImage = await expandImageAspectRatio(fullSizeSrc, targetRatio, currentPrompt, expansionModel);
            
            setFullSizeImage(node.id, 0, newImage);
            
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

    const isOpenAiActive = useOpenAiEnabled();
    const modelOptions = useMemo(() => getImageModelOptions(), [isOpenAiActive]);
    
    const effectiveModel = resolveImageModel(node.model);
    const isGpt2 = isGptImage2Model(effectiveModel);
    const isDalle3 = effectiveModel === 'dall-e-3';
    const isDalle2 = effectiveModel === 'dall-e-2';
    const isNanoBanana21 = isNanoBanana21Model(effectiveModel);

    const capabilities = useMemo(() => getImageModelCapabilities(effectiveModel), [effectiveModel]);
    const availableAspectRatios = capabilities.supportedAspectRatios;
    const isAspectRatioEnabled = availableAspectRatios.length > 0;
    const showResolution = capabilities.supportedResolutions.length > 0;
    const showThinkingMode = capabilities.supportedThinkingLevels.length > 0;
    const showSearchGrounding = capabilities.supportedSearchTypes.length > 0;

    const handlePrevModel = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentIndex = modelOptions.findIndex(m => m.value === effectiveModel);
        if (currentIndex > 0) {
            onModelChange(node.id, modelOptions[currentIndex - 1].value);
        }
    };

    const handleNextModel = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentIndex = modelOptions.findIndex(m => m.value === effectiveModel);
        if (currentIndex !== -1 && currentIndex < modelOptions.length - 1) {
            onModelChange(node.id, modelOptions[currentIndex + 1].value);
        }
    };

    const handleUpdateState = (updates: any) => {
        if (updates.model !== undefined) {
            onModelChange(node.id, updates.model);
        }
        if (updates.aspectRatio !== undefined) {
            onAspectRatioChange(node.id, updates.aspectRatio);
        }
        if (updates.resolution !== undefined) {
            onResolutionChange(node.id, updates.resolution);
        }
        if (updates.thinkingLevel !== undefined) {
            handleThinkingLevelSelect(updates.thinkingLevel);
        }
        if (updates.searchGrounding !== undefined) {
            handleSearchGroundingSelect(updates.searchGrounding);
        }
    };

    const handleClick = () => {
        if (!node.value) return;
        const fullSizeSrc = getFullSizeImage(node.id, 0) || node.value;
        if (fullSizeSrc) {
            setImageViewer({
                sources: [{ 
                    src: fullSizeSrc, 
                    frameNumber: 0, 
                    prompt: currentPrompt,
                    model: node.model || 'imagen-4.0-generate-001',
                    aspectRatio: node.aspectRatio,
                    resolution: node.resolution
                }],
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
        <div className="flex flex-col h-full select-none">
            {/* Image Preview Area */}
            <div 
                onClick={handleClick} 
                onWheel={(e) => e.stopPropagation()} 
                className="relative w-full flex-grow bg-gray-900/60 rounded-md flex items-center justify-center overflow-hidden mb-2.5 group cursor-pointer border border-gray-700/80 hover:border-gray-500 transition-colors"
            >
                {node.value ? (
                    <img
                        src={getFullSizeImage(node.id, 0) || node.value}
                        alt="Generated result"
                        className="object-contain w-full h-full"
                        draggable={true}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => {
                            const imageToDrag = getFullSizeImage(node.id, 0) || node.value;
                            if (imageToDrag) {
                                const filename = `Output_Image_${Date.now()}.png`;
                                setupImageDragData(e, imageToDrag, filename, currentPrompt);
                                e.stopPropagation();
                            }
                        }}
                    />
                ) : (
                    <span className="text-gray-400">{t('node.content.imageHere')}</span>
                )}
                
                <div className={`absolute inset-0 bg-gray-800/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 transition-opacity duration-300 ${(isGeneratingImage || (isExecutingChain && !node.value) || isBatchBusy) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <svg className="animate-spin h-8 w-8 text-accent-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="mt-2 font-semibold text-accent-text text-center px-4">
                        {isForming
                            ? (t('batch.formingRequest') || 'Forming batch request...')
                            : activeBatchJob
                                ? (t('batch.waitingForResponse') || 'Waiting for response from service')
                                : (isExecutingChain ? 'Executing...' : t('node.content.generating'))}
                    </span>
                    {activeBatchJob && (
                        <span className="text-[11px] text-accent-secondary mt-1 font-mono">
                            {activeBatchJob.displayName || activeBatchJob.name} ({activeBatchJob.state})
                        </span>
                    )}
                </div>

                {node.value && !(isGeneratingImage || (isExecutingChain && !node.value) || isBatchBusy) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none gap-4">
                        <button
                            onClick={handleCopyLarge}
                            className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors pointer-events-auto cursor-pointer"
                            aria-label={t('node.action.copy')}
                            title={t('node.action.copy')}
                        >
                            {LargeCopyIcon}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownloadImage(node.id); }}
                            className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors pointer-events-auto cursor-pointer"
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
                        <ActionButton title={t('node.action.download')} onClick={(e) => { e.stopPropagation(); onDownloadImage(node.id); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </ActionButton>
                    </div>
                )}
                
                {/* Expansion Controls - Bottom Right Overlay */}
                {node.value && !(isGeneratingImage || (isExecutingChain && !node.value)) && (
                    <div className="absolute bottom-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRatioExpand('16:9'); }}
                            disabled={isGeneratingImage || isExecutingChain || !!transformingRatio}
                            className="px-2 py-1 text-[10px] font-bold text-gray-200 bg-gray-800/80 hover:bg-gray-700 hover:text-white border border-gray-600/50 rounded backdrop-blur-sm shadow-sm flex items-center gap-1 transition-colors pointer-events-auto cursor-pointer"
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
                            className="px-2 py-1 text-[10px] font-bold text-gray-200 bg-gray-800/80 hover:bg-gray-700 hover:text-white border border-gray-600/50 rounded backdrop-blur-sm shadow-sm flex items-center gap-1 transition-colors pointer-events-auto cursor-pointer"
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

            {/* Prompt Section with Higher Height & Chain Embed/Disconnect Icon */}
            <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1 px-0.5">
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-gray-300">
                            {t('node.content.prompt') || 'Prompt'}
                        </label>
                        {hasUpstreamText && (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 font-medium">
                                <LinkIcon className="w-2.5 h-2.5 text-indigo-400" />
                                <span>Входящий текст (связь активна)</span>
                            </span>
                        )}
                    </div>

                    {hasUpstreamText && (
                        <button
                            type="button"
                            onClick={handleEmbedAndDisconnect}
                            title="Встроить текст в поле и отключить входящую ноду"
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 hover:text-white border border-indigo-500/60 text-[11px] font-medium transition-all shadow-sm cursor-pointer"
                        >
                            <Unlink className="w-3.5 h-3.5 text-indigo-300" />
                            <span>Встроить и отключить</span>
                        </button>
                    )}
                </div>

                <textarea
                    value={hasUpstreamText ? currentPrompt : (node.customPrompt || '')}
                    onChange={handleCustomPromptChange}
                    readOnly={hasUpstreamText}
                    disabled={!hasUpstreamText && (isGeneratingImage || isExecutingChain)}
                    placeholder={hasUpstreamText ? '' : (t('node.content.enterPrompt') || 'Enter prompt here...')}
                    className={`w-full text-xs font-sans rounded-md p-2.5 min-h-[96px] max-h-[160px] resize-y focus:outline-none transition-all leading-relaxed ${
                        hasUpstreamText 
                            ? 'bg-gray-900/90 border border-indigo-500/60 text-indigo-100 select-text cursor-default' 
                            : 'bg-gray-800/95 border border-gray-600 text-gray-200 focus:ring-1 focus:ring-accent focus:border-accent'
                    }`}
                    rows={3}
                />
            </div>

            {/* Modern AI Image Editor Style Dropdown Menus Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                {/* Model Selector with Previous & Next Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        title="Previous Model"
                        type="button"
                        onClick={handlePrevModel}
                        disabled={isGeneratingImage || isExecutingChain || modelOptions.findIndex(m => m.value === effectiveModel) <= 0}
                        className="h-[38px] w-[38px] flex-shrink-0 flex items-center justify-center bg-gray-800/90 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 border border-gray-600 rounded-md text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <ModelSelectorDropdown
                        model={node.model || 'gemini-2.5-flash-image'}
                        effectiveModel={effectiveModel}
                        modelOptions={modelOptions}
                        onUpdateState={handleUpdateState}
                        disabled={isGeneratingImage || isExecutingChain}
                        t={t}
                    />

                    <button
                        title="Next Model"
                        type="button"
                        onClick={handleNextModel}
                        disabled={isGeneratingImage || isExecutingChain || modelOptions.findIndex(m => m.value === effectiveModel) >= modelOptions.length - 1 || modelOptions.findIndex(m => m.value === effectiveModel) === -1}
                        className="h-[38px] w-[38px] flex-shrink-0 flex items-center justify-center bg-gray-800/90 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 border border-gray-600 rounded-md text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Aspect Ratio Dropdown */}
                {isAspectRatioEnabled && (
                    <AspectRatioDropdown
                        aspectRatio={node.aspectRatio || '1:1'}
                        availableAspectRatios={availableAspectRatios}
                        onUpdateState={handleUpdateState}
                        disabled={isGeneratingImage || !isAspectRatioEnabled || isExecutingChain}
                        t={t}
                    />
                )}

                {/* Resolution Dropdown */}
                {showResolution && (
                    <ResolutionDropdown
                        resolution={node.resolution && capabilities.supportedResolutions.includes(node.resolution) ? node.resolution : '1K'}
                        availableResolutions={capabilities.supportedResolutions}
                        onUpdateState={handleUpdateState}
                        disabled={isGeneratingImage || isExecutingChain}
                        t={t}
                    />
                )}

                {/* Thinking Mode Toggle & Dropdown */}
                {showThinkingMode && (
                    <ThinkingToggleDropdown
                        thinkingLevel={node.thinkingLevel || 'AUTO'}
                        availableThinkingLevels={capabilities.supportedThinkingLevels}
                        onUpdateState={handleUpdateState}
                        disabled={isGeneratingImage || isExecutingChain}
                        t={t}
                    />
                )}

                {/* Google Search Grounding Toggle & Dropdown */}
                {showSearchGrounding && (
                    <SearchToggleDropdown
                        searchGrounding={node.searchGrounding || 'none'}
                        isNanoBanana21={isNanoBanana21}
                        onUpdateState={handleUpdateState}
                        disabled={isGeneratingImage || isExecutingChain}
                        t={t}
                    />
                )}

                {/* Quality selection for GPT-Image-2 and DALL-E 3 */}
                {(isGpt2 || isDalle3) && (
                    <RichOptionDropdown
                        title="Quality"
                        value={node.quality || (isGpt2 ? 'high' : 'standard')}
                        options={isGpt2 ? [
                            { value: 'standard', label: 'Standard', badge: 'Std', description: 'Базовое стандартное качество генерации' },
                            { value: 'hd', label: 'HD', badge: 'HD', description: 'Высокая чёткость деталей и текстур' },
                            { value: 'high', label: 'High', badge: 'High', description: 'Повышенная детализация' },
                            { value: 'medium', label: 'Medium', badge: 'Med', description: 'Сбалансированное качество' },
                            { value: 'low', label: 'Low', badge: 'Low', description: 'Облегчённое быстрое качество' }
                        ] : [
                            { value: 'standard', label: 'Standard', badge: 'Std', description: 'Стандартное качество генерации DALL-E 3' },
                            { value: 'hd', label: 'HD (High Def)', badge: 'HD', description: 'Максимальная чёткость и прорисовка деталей' }
                        ]}
                        onChange={handleQualitySelect}
                        disabled={isGeneratingImage || isExecutingChain}
                        minWidth="110px"
                    />
                )}

                {/* Resolution / Size for GPT-Image-2 and DALL-E 2 */}
                {(isGpt2 || isDalle2) && (
                    <RichOptionDropdown
                        title="Size"
                        value={node.size || '1024x1024'}
                        options={isGpt2 ? [
                            { value: '1024x1024', label: '1024 × 1024', badge: '1:1', description: 'Квадратный формат' },
                            { value: '1536x1024', label: '1536 × 1024', badge: '3:2', description: 'Горизонтальный формат' },
                            { value: '1024x1536', label: '1024 × 1536', badge: '2:3', description: 'Вертикальный формат' },
                            { value: 'auto', label: 'Auto', badge: 'Auto', description: 'Автоматический подбор размера' }
                        ] : [
                            { value: '1024x1024', label: '1024 × 1024', badge: '1:1', description: 'Максимальный размер DALL-E 2' },
                            { value: '512x512', label: '512 × 512', badge: '512px', description: 'Средний размер' },
                            { value: '256x256', label: '256 × 256', badge: '256px', description: 'Компактный размер' }
                        ]}
                        onChange={handleSizeSelect}
                        disabled={isGeneratingImage || isExecutingChain}
                        minWidth="125px"
                    />
                )}

                {/* Output Format for GPT-Image-2 */}
                {isGpt2 && (
                    <RichOptionDropdown
                        title="Format"
                        value={node.outputFormat || 'png'}
                        options={[
                            { value: 'png', label: 'PNG', badge: 'PNG', description: 'Формат без потерь с поддержкой прозрачности' },
                            { value: 'jpeg', label: 'JPEG', badge: 'JPG', description: 'Сжатый формат с наименьшим весом' },
                            { value: 'webp', label: 'WebP', badge: 'WEBP', description: 'Современный высокоэффективный веб-формат' }
                        ]}
                        onChange={handleOutputFormatSelect}
                        disabled={isGeneratingImage || isExecutingChain}
                        minWidth="95px"
                    />
                )}

                {/* Quick Toggle: Auto Download (Secondary Theme Color: Light Green for Cyan) */}
                <EditorTooltip
                    title={t('node.content.autoDownload') || "Автозагрузка"}
                    status={{
                        enabled: !!node.autoDownload,
                        labelOn: t('common.enabled') || 'ВКЛЮЧЕНО',
                        labelOff: t('common.disabled') || 'ВЫКЛЮЧЕНО'
                    }}
                    description={
                        t('node.content.autoDownloadTooltip') !== 'node.content.autoDownloadTooltip' && t('node.content.autoDownloadTooltip')
                            ? t('node.content.autoDownloadTooltip')
                            : 'Автоматически скачивать каждое сгенерированное изображение на устройство (в папку загрузок) сразу после завершения генерации.'
                    }
                >
                    <button
                        type="button"
                        onClick={handleToggleAutoDownload}
                        disabled={isGeneratingImage || isExecutingChain}
                        className={`group h-[36px] px-2.5 flex-shrink-0 flex items-center gap-1.5 rounded-md cursor-pointer transition-all border outline-none ${
                            (isGeneratingImage || isExecutingChain) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        style={node.autoDownload ? {
                            backgroundColor: `${secondaryThemeColor}1a`,
                            borderColor: `${secondaryThemeColor}99`,
                            boxShadow: `0 0 10px ${secondaryThemeColor}33`
                        } : {
                            backgroundColor: 'rgba(31, 41, 55, 0.6)',
                            borderColor: 'rgba(55, 65, 81, 0.8)'
                        }}
                        aria-label="Auto Download"
                    >
                        <Download 
                            className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                                node.autoDownload ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'
                            }`}
                            strokeWidth={2}
                        />
                        <div 
                            className="w-7 h-3.5 rounded-full relative transition-colors duration-200 flex-shrink-0"
                            style={{
                                backgroundColor: node.autoDownload ? secondaryThemeColor : '#4b5563'
                            }}
                        >
                            <div 
                                className={`absolute top-0.5 bottom-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                    node.autoDownload ? 'translate-x-[14px]' : 'translate-x-[2px]'
                                }`}
                            />
                        </div>
                    </button>
                </EditorTooltip>

                {/* Quick Toggle: Autosave to Disk (Primary Theme Color: Cyan for Cyan) */}
                <EditorTooltip
                    title={t('node.content.autoSaveDisk') !== 'node.content.autoSaveDisk' && t('node.content.autoSaveDisk') ? t('node.content.autoSaveDisk') : "Автосохранение на диск"}
                    status={{
                        enabled: isAutoSaveOn,
                        labelOn: t('common.enabled') || 'ВКЛЮЧЕНО',
                        labelOff: t('common.disabled') || 'ВЫКЛЮЧЕНО'
                    }}
                    description={
                        t('node.content.autoSaveDiskTooltip') !== 'node.content.autoSaveDiskTooltip' && t('node.content.autoSaveDiskTooltip')
                            ? t('node.content.autoSaveDiskTooltip')
                            : 'Автоматически сохранять полноразмерное сгенерированное изображение на локальный диск в галерею и хранилище проекта при получении результата.'
                    }
                >
                    <button
                        type="button"
                        onClick={handleToggleAutoSave}
                        disabled={isGeneratingImage || isExecutingChain}
                        className={`group h-[36px] px-2.5 flex-shrink-0 flex items-center gap-1.5 rounded-md cursor-pointer transition-all border outline-none ${
                            (isGeneratingImage || isExecutingChain) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        style={isAutoSaveOn ? {
                            backgroundColor: `${themeColor}1a`,
                            borderColor: `${themeColor}99`,
                            boxShadow: `0 0 10px ${themeColor}33`
                        } : {
                            backgroundColor: 'rgba(31, 41, 55, 0.6)',
                            borderColor: 'rgba(55, 65, 81, 0.8)'
                        }}
                        aria-label="Autosave to Disk"
                    >
                        <HardDrive 
                            className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                                isAutoSaveOn ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'
                            }`}
                            strokeWidth={2}
                        />
                        <div 
                            className="w-7 h-3.5 rounded-full relative transition-colors duration-200 flex-shrink-0"
                            style={{
                                backgroundColor: isAutoSaveOn ? themeColor : '#4b5563'
                            }}
                        >
                            <div 
                                className={`absolute top-0.5 bottom-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                    isAutoSaveOn ? 'translate-x-[14px]' : 'translate-x-[2px]'
                                }`}
                            />
                        </div>
                    </button>
                </EditorTooltip>
            </div>

            {/* Batch API Synchronized Mode Toggle & Status Indicator */}
            <div 
                onClick={() => {
                    if (!isGeneratingImage && !isExecutingChain && setIsBatchMode) {
                        setIsBatchMode(!isBatchMode);
                    }
                }}
                className={`mb-2.5 p-2 rounded-md border cursor-pointer select-none transition-all ${
                    isBatchMode 
                        ? 'bg-gray-900 border-gray-700 text-gray-200' 
                        : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600 text-gray-300'
                } ${(isGeneratingImage || isExecutingChain) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className={`w-2 h-2 rounded-full ${isBatchMode ? 'bg-accent-secondary animate-pulse' : 'bg-gray-500'}`}></span>
                        <span>{t('batch.mode') || 'Batch API Mode'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-mono font-semibold">
                            -50% Cost
                        </span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${isBatchMode ? 'bg-accent-secondary' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isBatchMode ? 'translate-x-[16px]' : 'translate-x-[2px]'}`}></div>
                    </div>
                </div>
                <div className={`mt-1.5 text-[11px] leading-tight flex items-start gap-1 transition-colors ${
                    isBatchMode ? 'text-accent-secondary font-medium' : 'text-gray-400'
                }`}>
                    <span className={isBatchMode ? '' : 'opacity-70'}>⏳</span>
                    <span>{t('batch.statusDelayed') || 'Batch API Active (Delayed ~24h, -50% cost)'}</span>
                </div>
            </div>
            
            {/* Action Buttons Row (Generate & Chain Execution) */}
            <div className="flex space-x-2 h-10 mt-auto">
                <TutorialTooltip 
                    content={t('tutorial.step3')} 
                    isActive={!!isTutorialActive} 
                    position="top" 
                    onSkip={skipTutorial} 
                    className="flex-grow h-full"
                >
                    {isGeneratingImage ? (
                        <button
                            onClick={() => {
                                if (context?.handleStopImage) {
                                    context.handleStopImage(node.id);
                                }
                            }}
                            className="w-full h-full px-4 font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                            title={t('node.action.stop') || 'Stop'}
                        >
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{t('node.content.generating')} (Stop)</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerateClick}
                            disabled={isExecutingChain || !!transformingRatio || isForming || !!activeBatchJob}
                            className={`w-full h-full px-4 font-bold text-white rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                                isBatchMode 
                                    ? 'bg-accent-secondary hover:bg-accent-secondary-hover active:bg-accent-secondary shadow-md' 
                                    : 'bg-accent hover:bg-accent-hover'
                            }`}
                        >
                            {isForming ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{t('batch.formingRequest') || 'Forming batch request...'}</span>
                                </>
                            ) : activeBatchJob ? (
                                <span>{t('batch.waitingForResponseButton') || 'Waiting for response (Batch)'}</span>
                            ) : isBatchMode ? (
                                (t('node.content.generateImage_batch') || `${t('node.content.generateImage')} (Batch)`)
                            ) : (
                                t('node.content.generateImage')
                            )}
                        </button>
                    )}
                </TutorialTooltip>
                
                {isExecutingChain ? (
                    <button
                        onClick={onStopChainExecution}
                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200 cursor-pointer"
                        title="Остановить выполнение"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => onExecuteChain(node.id)}
                        disabled={isGeneratingImage || isExecutingChain || !!transformingRatio}
                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
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
