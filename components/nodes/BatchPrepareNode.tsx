import React, { memo } from 'react';
import type { NodeContentProps } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../localization';
import { BatchPreparePack, BatchPrepareNodeState } from './batch-prepare/types';
import { BatchPrepareHeader } from './batch-prepare/BatchPrepareHeader';
import { BatchPrepareInputColumn } from './batch-prepare/BatchPrepareInputColumn';
import { BatchPrepareSliceColumn } from './batch-prepare/BatchPrepareSliceColumn';
import { BatchPrepareViewsColumn } from './batch-prepare/BatchPrepareViewsColumn';
import { BatchPreparePacksColumn } from './batch-prepare/BatchPreparePacksColumn';
import {
    useBatchPrepareStateAndInputs,
    useBatchPrepareSlicing,
    useBatchPrepareViews,
    useBatchPreparePacksAndBatch
} from './batch-prepare/hooks';

export type { BatchPreparePack, BatchPrepareNodeState };

export const BatchPrepareNode: React.FC<NodeContentProps> = memo(({
    node,
    onValueChange,
    addToast,
    setImageViewer,
    getUpstreamNodeValues,
}) => {
    const context = useAppContext();
    const { t } = useLanguage();

    // 1. State & Input Images Resolution
    const {
        state,
        stateRef,
        updateState,
        updateActiveViewsAndSyncPack,
        allInputImages,
        activeSourceImage,
        sourceNaturalSize,
        hasIncomingConnections,
        handleBakeAndDisconnectInput,
        handleUploadInputFiles,
        handleDropInputFiles,
        handlePasteFromClipboard
    } = useBatchPrepareStateAndInputs({
        nodeId: node.id,
        nodeValue: node.value,
        onValueChange,
        addToast,
        getUpstreamNodeValues,
        connections: context?.connections,
        setConnections: context?.setConnections
    });

    // 2. Grid Slicing & Batch Slicing
    const {
        isSlicing,
        isBatchSlicing,
        batchProgress,
        localBorderWidth,
        setLocalBorderWidth,
        commitBorderWidth,
        handlePerformSlice,
        handleBatchSliceAllToPackBuffer,
        handleSetGridPreset,
        handleResetGrid
    } = useBatchPrepareSlicing({
        state,
        stateRef,
        updateState,
        activeSourceImage,
        allInputImages,
        addToast,
        t
    });

    // 3. 4-View Multiview Slots & Drag-and-Drop
    const {
        draggedSlot,
        setDraggedSlot,
        isDropOverSlot,
        setIsDropOverSlot,
        filledActiveViewCount,
        handleAutoAssignToViews,
        handleSetSingleView,
        handleToggleMuteView,
        handleSwapLeftRight,
        handleSwapFrontBack,
        handleRotateViews,
        handleFlipView,
        handleClearAllViews,
        handleDropOnViewSlot
    } = useBatchPrepareViews({
        state,
        updateActiveViewsAndSyncPack,
        addToast,
        t
    });

    // 4. Pack Buffer Management, ZIP Exports & 3D Batch Execution
    const {
        activePack,
        handleBaseNameChange,
        handleClearAllPacks,
        handleSaveCurrentToPack,
        handleSelectActivePack,
        handleDeletePack,
        handleDuplicatePack,
        handleTogglePackEnabled,
        handleSelectAllPacks,
        handleDeselectAllPacks,
        handleInvertPackSelection,
        handleSelectPackRange,
        handleDownloadPackZip,
        handleDownloadAllPacksZip,
        handleStart3DBatch,
        handleStop3DBatch
    } = useBatchPreparePacksAndBatch({
        nodeId: node.id,
        state,
        stateRef,
        updateState,
        addToast,
        nodes: context?.nodes,
        connections: context?.connections,
        activeTabId: context?.activeTabId,
        handleValueChange: context?.handleValueChange,
        addToHistory: context?.addToHistory
    });

    return (
        <div className="flex flex-col w-full h-full text-gray-200 select-none overflow-hidden bg-gray-950/90 font-sans">
            {/* Main Header / Status Ribbon */}
            <BatchPrepareHeader
                filledActiveViewCount={filledActiveViewCount}
                activePack={activePack}
                packsCount={state.packs.length}
                onDownloadAllPacksZip={handleDownloadAllPacksZip}
            />

            {/* 4-Column Layout */}
            <div className="grid grid-cols-4 gap-2 p-2.5 flex-1 min-h-0 w-full overflow-hidden">
                {/* COLUMN 1: INPUT IMAGES WITH VIRTUAL BUFFERING & 64x64 PREVIEWS */}
                <BatchPrepareInputColumn
                    allInputImages={allInputImages}
                    selectedInputIndex={state.selectedInputIndex}
                    hasIncomingConnections={hasIncomingConnections}
                    hasLocalInputs={state.inputImages.length > 0}
                    onSelectInput={(idx) => updateState({ selectedInputIndex: idx })}
                    onBakeAndDisconnect={handleBakeAndDisconnectInput}
                    onUploadFiles={handleUploadInputFiles}
                    onPasteFromClipboard={handlePasteFromClipboard}
                    onClearLocalInputs={() => updateState({ inputImages: [], selectedInputIndex: 0 })}
                    onAutoAssignToViews={handleAutoAssignToViews}
                    onDropFiles={handleDropInputFiles}
                    onOpenImageViewer={(src, index) => {
                        setImageViewer?.({
                            sources: [{ src, frameNumber: index }],
                            initialIndex: 0
                        });
                    }}
                />

                {/* COLUMN 2: MULTIPLE GRID & BATCH SLICING */}
                <BatchPrepareSliceColumn
                    gridConfig={state.gridConfig}
                    localBorderWidth={localBorderWidth}
                    onLocalBorderWidthChange={setLocalBorderWidth}
                    onCommitBorderWidth={commitBorderWidth}
                    onSetGridPreset={handleSetGridPreset}
                    onPerformSlice={handlePerformSlice}
                    onResetGrid={handleResetGrid}
                    onToggleBorderMode={() => {
                        const nextMode = state.gridConfig.borderMode === 'all' ? 'inner' : 'all';
                        updateState(prev => ({
                            gridConfig: {
                                ...prev.gridConfig,
                                borderMode: nextMode
                            }
                        }));
                    }}
                    onChangeGridOverlayConfig={(newCfg) => {
                        updateState(prev => ({
                            gridConfig: {
                                ...prev.gridConfig,
                                cols: newCfg.cols,
                                rows: newCfg.rows,
                                bounds: newCfg.bounds,
                                borderWidth: newCfg.borderWidth,
                                borderMode: newCfg.borderMode,
                                enableBorder: (newCfg.borderWidth || 0) > 0,
                                colDividers: newCfg.colDividers,
                                rowDividers: newCfg.rowDividers,
                                customDividers: true,
                            }
                        }));
                    }}
                    activeSourceImage={activeSourceImage}
                    sourceNaturalSize={sourceNaturalSize}
                    slicedImages={state.slicedImages}
                    isSlicing={isSlicing}
                    isBatchSlicing={isBatchSlicing}
                    batchProgress={batchProgress}
                    allInputImagesCount={allInputImages.length}
                    autoSendToViews={Boolean(state.autoSendToViews)}
                    onToggleAutoSend={() => {
                        const nextVal = !state.autoSendToViews;
                        updateState({ autoSendToViews: nextVal });
                        if (nextVal && state.slicedImages.length > 0) {
                            handleAutoAssignToViews(state.slicedImages);
                        }
                        addToast(nextVal ? 'Авто-отправка в 3D Views: ВКЛ' : 'Авто-отправка в 3D Views: ВЫКЛ', 'info');
                    }}
                    onSendTo3DViews={() => {
                        if (state.slicedImages.length > 0) {
                            handleAutoAssignToViews(state.slicedImages);
                        } else if (activeSourceImage) {
                            handlePerformSlice(activeSourceImage).then(() => {
                                if (!state.autoSendToViews && stateRef.current.slicedImages.length > 0) {
                                    handleAutoAssignToViews(stateRef.current.slicedImages);
                                }
                            });
                        } else {
                            addToast('Выберите входящее изображение для нарезки', 'info');
                        }
                    }}
                    onBatchSliceAll={handleBatchSliceAllToPackBuffer}
                    onOpenImageViewer={(src, frameNumber) => {
                        setImageViewer?.({
                            sources: [{ src, frameNumber }],
                            initialIndex: 0
                        });
                    }}
                />

                {/* COLUMN 3: 4-VIEW MULTIVIEW SLOTS (128x128 PREVIEWS FOR 3D VIEWS) */}
                <BatchPrepareViewsColumn
                    activeViews={state.activeViews}
                    mutedViews={state.mutedViews}
                    activePack={activePack}
                    isDropOverSlot={isDropOverSlot}
                    draggedSlot={draggedSlot}
                    setDraggedSlot={setDraggedSlot}
                    setIsDropOverSlot={setIsDropOverSlot}
                    onSwapLeftRight={handleSwapLeftRight}
                    onSwapFrontBack={handleSwapFrontBack}
                    onRotateViews={handleRotateViews}
                    onClearAllViews={handleClearAllViews}
                    onToggleMuteView={handleToggleMuteView}
                    onFlipView={handleFlipView}
                    onSetSingleView={handleSetSingleView}
                    onDropOnViewSlot={handleDropOnViewSlot}
                    onSaveCurrentToPack={handleSaveCurrentToPack}
                    onOpenImageViewer={(src, label) => {
                        setImageViewer?.({
                            sources: [{ src, frameNumber: 1, prompt: label }],
                            initialIndex: 0
                        });
                    }}
                />

                {/* COLUMN 4: PACK BUFFER WITH VIRTUAL BUFFERING & 64x64 PREVIEWS */}
                <BatchPreparePacksColumn
                    packs={state.packs}
                    activePackId={state.activePackId}
                    assetBaseName={state.assetBaseName !== undefined ? state.assetBaseName : 'Asset_Name'}
                    onBaseNameChange={handleBaseNameChange}
                    onSaveCurrentToPack={handleSaveCurrentToPack}
                    onClearAllPacks={handleClearAllPacks}
                    onSelectActivePack={handleSelectActivePack}
                    onDuplicatePack={handleDuplicatePack}
                    onDownloadPackZip={handleDownloadPackZip}
                    onDeletePack={handleDeletePack}
                    onTogglePackEnabled={handleTogglePackEnabled}
                    onSelectAllPacks={handleSelectAllPacks}
                    onDeselectAllPacks={handleDeselectAllPacks}
                    onInvertPackSelection={handleInvertPackSelection}
                    onSelectPackRange={handleSelectPackRange}
                    isBatchRunning={Boolean(state.isBatchRunning)}
                    onStart3DBatch={handleStart3DBatch}
                    onStop3DBatch={handleStop3DBatch}
                    addToast={addToast}
                />
            </div>
        </div>
    );
});
