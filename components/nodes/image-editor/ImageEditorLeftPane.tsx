
import React, { useRef, useCallback, ReactNode, forwardRef, useImperativeHandle } from 'react';
import { ImageInputList } from './ImageInputList';
import { ImageEditorSettings } from './ImageEditorSettings';
import { SequencedPromptList, SequencedPromptListRef } from './SequencedPromptList';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { PromptLibraryToolbar } from '../../PromptLibraryToolbar';
import { ActionButton } from '../../ActionButton';
import { ImageEditorState, ImageSlot, MIN_TOP_PANE_HEIGHT, MIN_BOTTOM_PANE_HEIGHT, MIN_BOTTOM_PANE_HEIGHT_WITH_PREVIEW } from './types';
import { ActionButton as CopyActionButton } from '../../ActionButton';
import { CopyIcon } from '../../../components/icons/AppIcons';
import { Tooltip } from '../../Tooltip';

interface ImageEditorLeftPaneProps {
    nodeId: string;
    state: ImageEditorState;
    leftPaneWidth: number;
    viewScale: number;
    
    // Inputs
    imageSlots: ImageSlot[];
    imageSlotsB: ImageSlot[];
    
    // Actions
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    onCleanupInputB: () => void;
    onEditImage: (indices?: number[]) => void;
    
    // Input List Actions
    inputListActions: {
        getFullSizeImage: (idx: number) => string | undefined;
        onCheck: (idx: number, isB: boolean) => void;
        onSelectAll: (isB: boolean) => void;
        onSelectNone: (isB: boolean) => void;
        onClear: (isB: boolean) => void;
        onClick: (idx: number, isB: boolean) => void;
        onMove: (fromIndex: number, toIndex: number, isB: boolean) => void;
        onRemove: (idx: number, isB: boolean) => void;
        onMoveToB?: (idx: number) => void;
        onFileClick: (isB: boolean) => void;
        onDropFiles: (files: File[], isB: boolean) => void;
        onDropData: (data: string, isB: boolean) => void;
        onSlotDrop: (idx: number, f: File | string, isB: boolean) => void;
    };

    // Props for rendering previews, prompts etc
    previewElement?: ReactNode;
    libraryItems: any[];
    upstreamPrompt: string;
    upstreamPromptsMap?: Map<number, string>;
    isTextConnected: boolean;
    isInputConnected: boolean;
    isEditing: boolean;
    seqTotalFrames: number;
    
    // Handlers
    handleDetachAndPasteInput: () => void;
    handleManualRefresh: () => void;
    t: (key: string) => string;
    deselectAllNodes: () => void;
    onCopyImageToClipboard: (src: string) => void;
    onDetachImageToNode: (src: string, nodeId: string) => void;
    
    // New Handlers
    onSyncPrompts?: () => void;
    onDeleteFrame?: (index: number) => void;
    onMoveFrame?: (from: number, to: number) => void;
    onSelectFrame?: (index: number) => void;
    onClearFrames?: () => void;
    selectedFrameIndex?: number | null;
}

export const ImageEditorLeftPane = forwardRef<SequencedPromptListRef, ImageEditorLeftPaneProps>(({
    nodeId,
    state,
    leftPaneWidth,
    viewScale,
    imageSlots,
    imageSlotsB,
    onUpdateState,
    onCleanupInputB,
    inputListActions,
    previewElement,
    libraryItems,
    upstreamPrompt,
    upstreamPromptsMap,
    isTextConnected,
    isInputConnected,
    isEditing,
    seqTotalFrames,
    handleDetachAndPasteInput,
    handleManualRefresh,
    t,
    deselectAllNodes,
    onSyncPrompts,
    onDeleteFrame,
    onMoveFrame,
    onSelectFrame,
    onClearFrames,
    selectedFrameIndex
}, ref) => {
    const { topPaneHeight, inputImages, inputImagesB, checkedInputIndices, isSequenceMode, isSequentialCombinationMode, isSequentialPromptMode, isSequentialEditingWithPrompts, enableAspectRatio, framePrompts, prompt, enableOutpainting, outpaintingPrompt } = state;
    
    const contentRef = useRef<HTMLDivElement>(null);
    const { getFullSizeImage, onCheck, onSelectAll, onSelectNone, onClear, onClick, onMove, onRemove, onMoveToB, onFileClick, onDropFiles, onDropData, onSlotDrop } = inputListActions;

    const maxInputImages = state.model === 'gemini-3-pro-image-preview' ? 8 : 4;
    const inputPanelHeader = t('node.content.inputImage');
    const inputSubtitleA = isSequenceMode && isSequentialCombinationMode ? t('imageEditor.inputA') : t('imageEditor.input'); 
    const inputSubtitleB = `${t('imageEditor.inputB')} (Max ${maxInputImages - 1})`;

    const handleVerticalResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const startY = e.clientY;
        const startHeight = topPaneHeight;
        const scale = viewScale;

        const handleDrag = (moveEvent: MouseEvent) => {
             const dy = (moveEvent.clientY - startY) / scale;
             if (contentRef.current) {
                 const contentHeight = contentRef.current.offsetHeight;
                 const minBottomSpace = enableAspectRatio 
                    ? MIN_BOTTOM_PANE_HEIGHT_WITH_PREVIEW 
                    : MIN_BOTTOM_PANE_HEIGHT;
                 const newHeight = Math.max(MIN_TOP_PANE_HEIGHT, Math.min(startHeight + dy, contentHeight - minBottomSpace));
                 onUpdateState({ topPaneHeight: newHeight });
             }
        };
        const handleDragEnd = () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', handleDragEnd);
    }, [topPaneHeight, onUpdateState, viewScale, enableAspectRatio]);

    return (
        <div ref={contentRef} style={{ width: `${leftPaneWidth}px` }} className="h-full flex flex-col flex-shrink-0 pr-1">
            <div className="flex flex-col flex-shrink-0" style={{ height: `${topPaneHeight}px` }}>
                <div className="flex justify-between items-center mb-1">
                     <div className="flex items-center space-x-1">
                         {isInputConnected && (
                            <Tooltip content={t('node.action.detachAndPaste')}>
                                <button 
                                    className="p-0.5 text-gray-400 hover:text-white rounded transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleDetachAndPasteInput(); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                                </button>
                            </Tooltip>
                         )}
                         <label className="text-xs font-medium text-gray-400 flex-shrink-0">{inputPanelHeader}</label>
                     </div>
                     <ActionButton title="Обновить данные" onClick={(e) => { e.stopPropagation(); handleManualRefresh(); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                     </ActionButton>
                </div>
                
                <div className="flex-grow flex flex-col gap-1 min-h-0">
                    {!isSequentialEditingWithPrompts && (
                        <ImageInputList
                            title={inputSubtitleA}
                            slots={imageSlots}
                            isB={false}
                            isEditing={isEditing}
                            checkedIndices={checkedInputIndices}
                            getFullSizeImage={(idx) => getFullSizeImage(idx)}
                            onCheck={(i) => onCheck(i, false)}
                            onSelectAll={() => onSelectAll(false)}
                            onSelectNone={() => onSelectNone(false)}
                            onClear={() => onClear(false)}
                            onClick={(i) => onClick(i, false)}
                            onReorder={(from, to) => onMove(from, to, false)}
                            onRemove={(i) => onRemove(i, false)}
                            onMoveToB={isSequentialCombinationMode ? onMoveToB : undefined}
                            onFileClick={() => onFileClick(false)}
                            onDropFiles={(files) => onDropFiles(files, false)}
                            onDropData={(d) => onDropData(d, false)}
                            onSlotDrop={(i, f) => onSlotDrop(i, f, false)}
                            t={t}
                            isSequentialCombinationMode={isSequentialCombinationMode}
                            onSetCheckedIndices={(indices) => onUpdateState({ checkedInputIndices: indices })}
                            onInvertSelection={() => {
                                const allIndices = imageSlots.map((_, i) => i);
                                const newChecked = allIndices.filter(i => !checkedInputIndices.includes(i));
                                onUpdateState({ checkedInputIndices: newChecked });
                            }}
                        />
                    )}
                    
                    {(isSequentialEditingWithPrompts || (isSequenceMode && isSequentialCombinationMode)) && (
                        <ImageInputList
                            title={inputSubtitleB}
                            slots={imageSlotsB}
                            isB={true}
                            isEditing={isEditing}
                            checkedIndices={[]} 
                            getFullSizeImage={(idx) => getFullSizeImage(2000 + idx)}
                            onCheck={() => {}}
                            onSelectAll={() => {}}
                            onSelectNone={() => {}}
                            onClear={() => onClear(true)}
                            onClick={(i) => onClick(i, true)}
                            onReorder={(from, to) => onMove(from, to, true)}
                            onRemove={(i) => onRemove(i, true)}
                            onFileClick={() => onFileClick(true)}
                            onDropFiles={(files) => onDropFiles(files, true)}
                            onDropData={(d) => onDropData(d, true)}
                            onSlotDrop={(i, f) => onSlotDrop(i, f, true)}
                            t={t}
                            isSequentialCombinationMode={true}
                        />
                    )}
                </div>
            </div>

            <div onMouseDown={handleVerticalResize} className="h-2 w-full bg-gray-700/50 hover:bg-cyan-600 cursor-row-resize rounded transition-colors flex-shrink-0 my-1"></div>
            
             <div className="flex-grow min-h-0 flex flex-col space-y-2">
                 <div className="flex-shrink-0 space-y-2">
                    <ImageEditorSettings 
                        state={state}
                        onUpdateState={onUpdateState}
                        onCleanupInputB={onCleanupInputB}
                        isEditing={isEditing}
                        t={t}
                        nodeId={nodeId}
                        deselectAllNodes={deselectAllNodes}
                    />
                </div>

                {previewElement}

                <div className="flex-grow flex flex-col min-h-0 mt-2 space-y-2 relative">
                    <div className="relative flex-grow min-h-0 flex flex-col overflow-hidden">
                         {/* Show clear prompt button only in normal mode */}
                         {!isSequentialPromptMode && !isSequentialEditingWithPrompts && (
                            <div className="flex-shrink-0 flex items-center space-x-1 mb-1">
                                <div className="flex-grow min-w-0">
                                    <PromptLibraryToolbar libraryItems={libraryItems} onPromptInsert={(text) => onUpdateState({ prompt: prompt ? `${prompt.trim()}, ${text}` : text })} />
                                </div>
                                <ActionButton title={t('node.action.clear')} onClick={() => onUpdateState({ prompt: '' })}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </ActionButton>
                            </div>
                        )}

                        <div className="flex-grow min-h-0 mt-1 relative">
                            {(isSequentialPromptMode && isSequenceMode) || isSequentialEditingWithPrompts ? (
                                <SequencedPromptList 
                                    ref={ref}
                                    totalFrames={isSequentialEditingWithPrompts ? seqTotalFrames : imageSlots.length}
                                    framePrompts={framePrompts || {}}
                                    globalPrompt={prompt}
                                    onChange={(idx, val) => onUpdateState({ framePrompts: { ...(framePrompts || {}), [idx]: val } })}
                                    upstreamPrompts={upstreamPromptsMap}
                                    t={t}
                                    visibleIndices={isSequentialEditingWithPrompts ? undefined : checkedInputIndices}
                                    onAddFrame={isSequentialEditingWithPrompts ? () => {
                                         const nextIdx = Object.keys(framePrompts || {}).length;
                                         onUpdateState({ framePrompts: { ...(framePrompts || {}), [nextIdx]: '' } });
                                    } : undefined}
                                    onSync={onSyncPrompts}
                                    onDeleteFrame={onDeleteFrame}
                                    onMoveFrame={onMoveFrame}
                                    onSelectFrame={onSelectFrame}
                                    onClearAll={onClearFrames} // Passed here
                                    selectedFrameIndex={selectedFrameIndex}
                                />
                            ) : (
                                <DebouncedTextarea 
                                    value={isTextConnected ? upstreamPrompt : prompt} 
                                    onDebouncedChange={(v) => onUpdateState({ prompt: v })} 
                                    placeholder={isTextConnected ? upstreamPrompt || t('node.content.connectedPlaceholder') : t('node.content.editPromptPlaceholder')} 
                                    className="w-full h-full p-2 bg-gray-900/50 rounded-md resize-none border border-gray-600 focus:border-cyan-500 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500" 
                                    readOnly={isTextConnected} 
                                    onFocus={deselectAllNodes} 
                                    onWheel={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                    </div>
                    
                    {/* Outpainting Controls - Moved Here */}
                    {enableAspectRatio && (
                        <div className="flex-shrink-0 space-y-2 pt-1 border-t border-gray-700/50">
                             <div className="flex items-center space-x-2">
                                <input 
                                    id={`outpainting-toggle-${nodeId}`}
                                    type="checkbox" 
                                    checked={enableOutpainting} 
                                    onChange={(e) => onUpdateState({ enableOutpainting: e.target.checked })} 
                                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 bg-gray-700 cursor-pointer" 
                                    onMouseDown={(e) => e.stopPropagation()} 
                                />
                                <label htmlFor={`outpainting-toggle-${nodeId}`} className="text-sm text-gray-300 select-none cursor-pointer">{t('node.content.enableOutpainting')}</label>
                            </div>
                            {enableOutpainting && (
                                <DebouncedTextarea 
                                    value={outpaintingPrompt} 
                                    onDebouncedChange={(v) => onUpdateState({ outpaintingPrompt: v })} 
                                    placeholder={t('node.content.outpaintingPromptPlaceholder')} 
                                    className="w-full p-2 bg-gray-900/50 rounded-md resize-none border border-gray-600 focus:border-cyan-500 focus:outline-none text-xs" 
                                    style={{ height: '60px' }} 
                                    onFocus={deselectAllNodes} 
                                    onWheel={(e) => e.stopPropagation()} 
                                    onMouseDown={(e) => e.stopPropagation()} 
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
