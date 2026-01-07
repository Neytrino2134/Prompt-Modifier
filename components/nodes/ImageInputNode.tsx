
import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { NodeType } from '../../types';
import { readPromptFromPNG } from '../../utils/pngMetadata';
import { ActionButton } from '../ActionButton';
import { Tooltip } from '../Tooltip';
import ImageEditorModal from '../ImageEditorModal';
import { generateThumbnail } from '../../utils/imageUtils';
import { useAppContext } from '../../contexts/AppContext';
import { expandImageAspectRatio } from '../../services/imageActions';
import { CopyIcon } from '../../components/icons/AppIcons';

export const ImageInputNode: React.FC<NodeContentProps> = ({ 
    node, 
    onValueChange, 
    onProcessImage, 
    isProcessingImage, 
    onPasteImage, 
    t, 
    deselectAllNodes, 
    getFullSizeImage, 
    setImageViewer, 
    setFullSizeImage,
    onCopyImageToClipboard,
    onDownloadImage,
    addToast,
    onAddNode,
    onDeleteNode,
    onImageToText,
    isAnalyzingImage
}) => {
    const context = useAppContext();
    const addNode = onAddNode || context?.onAddNode;
    const deleteNode = onDeleteNode || context?.deleteNodeAndConnections;
    const setSelectedNodeIds = context?.setSelectedNodeIds;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [metadataPrompt, setMetadataPrompt] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    
    // State for aspect ratio transformation loading
    const [transformingRatio, setTransformingRatio] = useState<string | null>(null);

    // State for original image dimensions
    const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

    // Derived state: Controls are visible if node height is >= 460
    const showControls = (node.height ?? 0) >= 460;

    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { image: node.value.startsWith('data:image') ? node.value : null, prompt: '' };
        }
    }, [node.value]);

    const { image, prompt } = parsedValue;
    const fullResImage = getFullSizeImage(node.id, 0);

    // Effect to calculate original dimensions from full resolution image if available
    useEffect(() => {
        const srcToCheck = fullResImage || image;
        if (!srcToCheck) {
            setOriginalDimensions(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = srcToCheck;
    }, [fullResImage, image]);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
    };

    const handleImageChange = async (dataUrl: string) => {
        const promptFromMeta = await readPromptFromPNG(dataUrl);
        setMetadataPrompt(promptFromMeta);
        
        // Generate thumbnail to keep node.value small
        const thumbnail = await generateThumbnail(dataUrl, 256, 256);
        
        // Save high-res to cache (index 0)
        setFullSizeImage(node.id, 0, dataUrl);
        
        handleValueUpdate({ image: thumbnail });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onPasteImage(node.id, file);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
        const el = document.getElementById('app-container');
        if (el) el.classList.remove('ring-2', 'ring-cyan-500', 'ring-inset');
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            fetch(dragImageData)
              .then(res => res.blob())
              .then(blob => {
                  const file = new File([blob], "dragged_image.png", { type: blob.type });
                  onPasteImage(node.id, file);
              });
            return;
        }

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            onPasteImage(node.id, file);
        }
    };
    
    const handleApplyEdit = (imageDataUrl: string) => {
        handleImageChange(imageDataUrl);
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image) return;

        const fullSizeSrc = getFullSizeImage(node.id, 0) || image;
        if (fullSizeSrc) {
            setImageViewer({
                sources: [{
                    src: fullSizeSrc,
                    frameNumber: 0,
                    prompt: prompt || 'Input Image'
                }],
                initialIndex: 0
            });
        }
    };

    const handleCopyImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        const fullSizeSrc = getFullSizeImage(node.id, 0) || image;
        if (fullSizeSrc && onCopyImageToClipboard) {
            onCopyImageToClipboard(fullSizeSrc);
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownloadImage) {
            onDownloadImage(node.id);
        }
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ image: null });
        if (addToast) addToast(t('toast.contentCleared'));
    };
    
    const handleRatioExpand = async (targetRatio: string) => {
        const fullSizeSrc = getFullSizeImage(node.id, 0) || image;
        if (!fullSizeSrc) return;

        setTransformingRatio(targetRatio);
        try {
            const newImage = await expandImageAspectRatio(fullSizeSrc, targetRatio, prompt);
            await handleImageChange(newImage);
            if (addToast) addToast(`Converted to ${targetRatio} successfully`, 'success');
        } catch (error: any) {
            console.error("Ratio expansion failed:", error);
            if (addToast) addToast(`Failed to convert: ${error.message}`, 'error');
        } finally {
            setTransformingRatio(null);
        }
    };

    const handleOpenInNode = (e: React.MouseEvent, targetType: NodeType) => {
        if (!addNode) return;
        
        const fullRes = getFullSizeImage(node.id, 0) || image;
        if (!fullRes) return;

        let newPosition = { x: node.position.x, y: node.position.y };
        
        if (!e.shiftKey) {
             const GAP = 50;
             newPosition = { 
                 x: node.position.x + node.width + GAP, 
                 y: node.position.y 
             };
        }

        const newNodeId = addNode(targetType, newPosition);

        if (targetType === NodeType.IMAGE_ANALYZER) {
            onValueChange(newNodeId, JSON.stringify({ image: image, description: '', softPrompt: false }));
            setFullSizeImage(newNodeId, 0, fullRes);
        } else if (targetType === NodeType.IMAGE_EDITOR) {
            const defaultEditorState = {
                inputImages: [image],
                prompt: prompt || '',
                outputImage: null,
                aspectRatio: '1:1',
                enableAspectRatio: false,
                enableOutpainting: false, // Disabled by default as requested
                outpaintingPrompt: '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.',
                model: 'gemini-2.5-flash-image',
                autoDownload: true,
                autoCrop169: false,
                leftPaneWidth: 280,
                topPaneHeight: 320,
            };
            onValueChange(newNodeId, JSON.stringify(defaultEditorState));
            setFullSizeImage(newNodeId, 1, fullRes); 
        }

        if (setSelectedNodeIds) {
            setSelectedNodeIds([newNodeId]);
        }

        if (e.shiftKey && deleteNode) {
            deleteNode(node.id);
        }
    };

    const handleToggleControls = (e: React.MouseEvent) => {
        e.stopPropagation();
        const targetHeight = showControls ? 340 : 560;

        if (context?.setNodes) {
            context.setNodes((prevNodes) => prevNodes.map((n) => {
                if (n.id === node.id) {
                    return { ...n, height: targetHeight };
                }
                return n;
            }));
        }
    };

    return (
        <div className="flex flex-col h-full space-y-2" data-node-id={node.id}>
            <ImageEditorModal 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onApply={handleApplyEdit}
                imageSrc={getFullSizeImage(node.id, 0) || image}
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            
            {/* Image Container - Grows to fill space */}
            <div className="flex-grow min-h-0 relative group rounded-md overflow-hidden bg-gray-700">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full h-full flex items-center justify-center cursor-pointer transition-all relative ${isDragOver ? 'bg-gray-600 ring-2 ring-accent' : 'hover:bg-gray-600'}`}
                >
                    {image ? (
                        <>
                            <img
                                src={image || getFullSizeImage(node.id, 0)}
                                alt="Input"
                                className="object-contain w-full h-full"
                                draggable={true}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={handleImageClick}
                                onDragStart={(e) => {
                                    const imageToDrag = getFullSizeImage(node.id, 0) || image;
                                    if (imageToDrag) {
                                        e.dataTransfer.setData('application/prompt-modifier-drag-image', imageToDrag);
                                        e.dataTransfer.effectAllowed = 'copy';
                                        e.stopPropagation();
                                    }
                                }}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            
                            {/* Original Resolution Info */}
                            {originalDimensions && (
                                <div className="absolute bottom-2 left-2 z-20 bg-black/60 text-gray-300 text-[10px] px-1.5 py-0.5 rounded pointer-events-none backdrop-blur-sm font-mono">
                                    {originalDimensions.width}x{originalDimensions.height}
                                </div>
                            )}

                            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/60 backdrop-blur-sm p-1 rounded-md">
                                <ActionButton title={t('node.action.download')} onClick={handleDownload}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </ActionButton>
                                <ActionButton title={t('node.action.copy')} onClick={handleCopyImage}>
                                    <CopyIcon className="h-4 w-4" />
                                </ActionButton>
                                <ActionButton title={t('node.action.clear')} onClick={handleClearImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </ActionButton>
                            </div>
                        </>
                    ) : (
                        <span className="text-gray-400 pointer-events-none">{t('node.content.dropImage')}</span>
                    )}
                </div>

                {/* Compact View Toggle - Positioned inside relative container at bottom right */}
                <div className="absolute bottom-2 right-2 z-20">
                    <Tooltip content={showControls ? "Свернуть кнопки" : "Показать кнопки"}>
                        <button
                            onClick={handleToggleControls}
                            className="p-1 bg-gray-900/60 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors shadow-sm"
                        >
                            {showControls ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            {/* Controls Section */}
            {showControls && (
                <div className="flex-shrink-0 flex flex-col space-y-2 h-[220px] overflow-hidden">
                    
                    {/* Top Controls Grid */}
                    <div className="flex gap-2 shrink-0 h-[80px]">
                        
                        {/* LEFT COLUMN (Process + Small Tools) */}
                        <div className="flex-[1.2] flex flex-col gap-2 min-w-0">
                            {/* Process Button */}
                            <Tooltip content={t('node.action.processImageTitle')} className="w-full">
                                <button
                                    onClick={() => onProcessImage(node.id)}
                                    disabled={isProcessingImage || !image || !!transformingRatio}
                                    className="w-full h-9 px-3 text-sm font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 truncate flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                                    <span className="truncate">{isProcessingImage ? t('node.content.processing') : t('node.action.processImage')}</span>
                                </button>
                            </Tooltip>

                             {/* 4-Button Grid */}
                             <div className="grid grid-cols-4 gap-1 h-9">
                                {/* Analyzer Icon */}
                                <Tooltip content={t('node.action.openInAnalyzer')}>
                                    <button
                                        onClick={(e) => handleOpenInNode(e, NodeType.IMAGE_ANALYZER)}
                                        disabled={!image}
                                        className="w-full h-full flex items-center justify-center bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.792V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h7.55" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 18.375L21 21" />
                                        </svg>
                                    </button>
                                </Tooltip>
                                
                                {/* Image to Text Icon */}
                                <Tooltip content={t('node.content.imageToText')}>
                                    <button
                                        onClick={() => onImageToText && onImageToText(node.id)}
                                        disabled={!image || isAnalyzingImage || !onImageToText}
                                        className="w-full h-full flex items-center justify-center bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                                    >
                                        {isAnalyzingImage ? (
                                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>

                                {/* 16:9 Button */}
                                <Tooltip content={t('node.action.expand169')}>
                                    <button
                                        onClick={() => handleRatioExpand('16:9')}
                                        disabled={!image || isProcessingImage || !!transformingRatio}
                                        className="w-full h-full px-1 text-[10px] font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1"
                                    >
                                        {transformingRatio === '16:9' ? <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hidden sm:block"><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
                                                <span>16:9</span>
                                            </>
                                        )}
                                    </button>
                                </Tooltip>
                                
                                {/* 9:16 Button */}
                                <Tooltip content={t('node.action.expand916')}>
                                    <button
                                        onClick={() => handleRatioExpand('9:16')}
                                        disabled={!image || isProcessingImage || !!transformingRatio}
                                        className="w-full h-full px-1 text-[10px] font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1"
                                    >
                                        {transformingRatio === '9:16' ? <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hidden sm:block"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
                                                <span>9:16</span>
                                            </>
                                        )}
                                    </button>
                                </Tooltip>
                             </div>
                        </div>

                        {/* RIGHT COLUMN (Editors) */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0">
                            {/* Raster Editor */}
                            <Tooltip content={t('node.action.rasterEditor')} className="w-full">
                                <button
                                    onClick={() => setIsEditorOpen(true)}
                                    disabled={!image}
                                    className="w-full h-9 px-2 text-xs font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                    <span className="truncate">{t('node.action.rasterEditor')}</span>
                                </button>
                            </Tooltip>

                            {/* Open in AI Editor Button */}
                            <Tooltip content={t('node.action.openInAIEditor')} className="w-full">
                                <button
                                    onClick={(e) => handleOpenInNode(e, NodeType.IMAGE_EDITOR)}
                                    disabled={!image}
                                    className="w-full h-9 px-2 text-xs font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" />
                                    </svg>
                                    <span className="truncate">{t('node.action.openInAIEditor')}</span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {metadataPrompt && (
                        <div className="flex-shrink-0 relative">
                             <div className="absolute top-0 right-0 z-10">
                                <button onClick={() => { handleValueUpdate({ prompt: `${prompt ? prompt + ', ' : ''}${metadataPrompt}` }); setMetadataPrompt(null); }} className="px-2 py-0.5 text-[10px] font-bold bg-accent hover:bg-accent-hover text-white rounded shadow-sm" title={t('node.action.copyPrompt')}>
                                    Use
                                </button>
                             </div>
                            <textarea readOnly value={metadataPrompt} placeholder={t('node.content.metadataPromptPlaceholder')} className="w-full p-2 text-xs bg-input/50 rounded-md resize-none focus:outline-none text-gray-400 italic border border-gray-600/50" rows={2} onWheel={e => e.stopPropagation()} onFocus={deselectAllNodes} />
                        </div>
                    )}
                    
                    <div className="flex-grow min-h-0 flex flex-col relative">
                        <textarea
                            value={prompt || ''}
                            onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                            placeholder={t('node.content.prompt')}
                            className="w-full h-full p-2 bg-[#18202f] border border-gray-600 rounded-md resize-none focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none custom-scrollbar text-sm"
                            onWheel={e => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onFocus={deselectAllNodes}
                        />
                         <div className="absolute bottom-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
                            <ActionButton title={t('node.action.copy')} onClick={() => navigator.clipboard.writeText(prompt || '')}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
