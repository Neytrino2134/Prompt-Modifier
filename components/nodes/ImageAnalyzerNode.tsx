
import React, { useMemo, useRef, useState, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import { NodeType } from '../../types';
import { ActionButton } from '../ActionButton';
import { useAppContext } from '../../contexts/AppContext';
import { CopyIcon } from '../../components/icons/AppIcons';
import { CustomCheckbox } from '../CustomCheckbox';

export const ImageAnalyzerNode: React.FC<NodeContentProps> = ({ 
    node, 
    onValueChange, 
    onAnalyzeImage, 
    onImageToText, // Destructure new prop
    isAnalyzingImage, 
    t, 
    deselectAllNodes, 
    connectedImageSources, 
    setImageViewer, 
    getFullSizeImage, 
    onSaveToLibrary,
    onCopyImageToClipboard,
    addToast,
    onPasteImage,
    onOutputHandleMouseDown,
    onOutputHandleTouchStart,
    getHandleColor,
    handleCursor
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    
    // Access global context for graph manipulation
    const context = useAppContext();
    const onAddNode = context?.onAddNode;
    const setConnections = context?.setConnections;
    const handleAnalyzePrompt = context?.handleAnalyzePrompt;
    const connections = context?.connections || [];
    const allNodes = context?.nodes || [];

    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { image: null, description: '', softPrompt: false };
        }
    }, [node.value]);

    const { image, description, softPrompt = false } = parsedValue;
    const isConnected = connectedImageSources && connectedImageSources.length > 0;
    const finalImage = isConnected ? connectedImageSources![0] : image;


    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
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

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!finalImage && isConnected) return; // Nothing to show
        if (!finalImage && !isConnected) {
            fileInputRef.current?.click();
            return;
        }

        // Determine the best quality source
        let sourceToView = finalImage;
        if (!isConnected) {
            // Try to get high-res from cache if local
            sourceToView = getFullSizeImage(node.id, 0) || image;
        }

        if (sourceToView) {
            setImageViewer({
                sources: [{
                    src: sourceToView,
                    frameNumber: 0,
                    prompt: description || 'Analyzed Image'
                }],
                initialIndex: 0
            });
        }
    };

    const handleCopyImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Determine the best quality source for copy
        let sourceToCopy = finalImage;
        if (!isConnected) {
            sourceToCopy = getFullSizeImage(node.id, 0) || image;
        }
        if (sourceToCopy && onCopyImageToClipboard) {
            onCopyImageToClipboard(sourceToCopy);
        }
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ image: null });
        if (addToast) addToast(t('toast.contentCleared'));
    };

    const handleCopyText = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (description) {
            navigator.clipboard.writeText(description);
            if (addToast) addToast(t('toast.copiedToClipboard'));
        }
    };

    const handleSaveToLibrary = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (description && onSaveToLibrary) {
            onSaveToLibrary(description, "Image Analyzer Prompts");
        }
    };

    const handleChainAnalysis = useCallback(() => {
        if (!onAddNode || !setConnections || !handleAnalyzePrompt || !description) return;

        // Check if 'text' handle is already connected to a Prompt Analyzer
        const textConnection = connections.find(c => 
            c.fromNodeId === node.id && c.fromHandleId === 'text'
        );

        let targetNodeId: string | null = null;

        if (textConnection) {
            const targetNode = allNodes.find(n => n.id === textConnection.toNodeId);
            if (targetNode && targetNode.type === NodeType.PROMPT_ANALYZER) {
                targetNodeId = targetNode.id;
            }
        }

        if (targetNodeId) {
            // 1a. If connected, just trigger analysis
            handleAnalyzePrompt(targetNodeId);
        } else {
            // 1b. If not connected, create new node and connect
            const newPos = { x: node.position.x + node.width + 50, y: node.position.y };
            const newNodeId = onAddNode(NodeType.PROMPT_ANALYZER, newPos);

            setConnections(prev => [...prev, {
                id: `conn-${Date.now()}-${Math.random()}`,
                fromNodeId: node.id,
                fromHandleId: 'text',
                toNodeId: newNodeId,
                toHandleId: undefined
            }]);

            // Trigger Analysis (with small delay to ensure connection state update propagates)
            setTimeout(() => {
                handleAnalyzePrompt(newNodeId);
            }, 100);
        }

    }, [onAddNode, setConnections, handleAnalyzePrompt, node, description, connections, allNodes]);

    return (
        <div className="flex flex-col h-full space-y-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex-1 flex flex-col min-h-0 space-y-2 relative group">
                 <div className="flex-grow min-h-0 relative">
                     <div
                        onClick={handleImageClick}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`w-full h-full bg-gray-700 rounded-md flex items-center justify-center transition-all cursor-pointer ${isDragOver ? 'bg-gray-600 ring-2 ring-accent-text' : 'hover:bg-gray-600'}`}
                    >
                        {finalImage ? (
                            <img 
                                src={finalImage} 
                                alt="Input" 
                                className="object-contain w-full h-full" 
                                draggable={true}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDragStart={(e) => {
                                    // Determine high-res source for dragging
                                    let sourceToDrag = finalImage;
                                    if (!isConnected) {
                                        sourceToDrag = getFullSizeImage(node.id, 0) || image;
                                    }

                                    if (sourceToDrag) {
                                        e.dataTransfer.setData('application/prompt-modifier-drag-image', sourceToDrag);
                                        e.dataTransfer.effectAllowed = 'copy';
                                        e.stopPropagation();
                                    }
                                }}
                            />
                        ) : (
                            !isConnected && <span className="text-gray-400 pointer-events-none">{t('node.content.dropImage')}</span>
                        )}
                    </div>
                    {isConnected && (
                        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-md pointer-events-none group-hover:bg-gray-900/30 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <div className="absolute top-full mt-2 px-2 py-1 bg-slate-700 text-slate-200 text-sm rounded-md shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                {t('node.content.connectedPlaceholder')}
                            </div>
                        </div>
                    )}
                    
                    {finalImage && (
                        <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <ActionButton title={t('node.action.copy')} onClick={handleCopyImage}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            {!isConnected && (
                                <ActionButton title={t('node.action.clear')} onClick={handleClearImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </ActionButton>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col gap-2 shrink-0">
                    <button
                        onClick={() => onAnalyzeImage(node.id)}
                        disabled={isAnalyzingImage || !finalImage}
                        className="w-full px-4 py-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center whitespace-nowrap"
                    >
                        {isAnalyzingImage ? t('node.content.analyzing') : t('node.content.analyzeImage')}
                    </button>
                    {onImageToText && (
                        <button
                            onClick={() => onImageToText(node.id)}
                            disabled={isAnalyzingImage || !finalImage}
                            className="w-full px-4 py-2 font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center whitespace-nowrap"
                        >
                            {t('node.content.imageToText')}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 space-y-2 relative group">
                <div className="flex-grow min-h-0 flex flex-col relative">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-400">{t('node.content.prompt')}</label>
                        <div className="flex space-x-1">
                            <ActionButton 
                                title={t('node.action.copy')} 
                                onClick={handleCopyText}
                                disabled={!description}
                            >
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton 
                                title={t('catalog.saveTo')} 
                                onClick={handleSaveToLibrary} 
                                disabled={!description}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
                                </svg>
                            </ActionButton>
                        </div>
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => handleValueUpdate({ description: e.target.value })}
                        placeholder={t('node.content.descriptionHere')}
                        className="w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-accent focus:outline-none flex-grow"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <CustomCheckbox
                        id={`soft-prompt-toggle-${node.id}`}
                        checked={softPrompt}
                        onChange={(checked) => handleValueUpdate({ softPrompt: checked })}
                        disabled={isAnalyzingImage || !finalImage}
                        label="Мягкий промпт"
                    />
                </div>
                <button
                    onClick={handleChainAnalysis}
                    disabled={!description || isAnalyzingImage}
                    className="w-full px-4 py-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                >
                    {t('node.content.analyzePrompt')}
                </button>
            </div>
        </div>
    );
};
