import React from 'react';
import { useLanguage } from '../../../localization';
import { Scissors, RotateCcw, Grid, Eye, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { ImageGridOverlay } from '../image-input/ImageGridOverlay';
import { setupImageDragData } from '../../../utils/imageUtils';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import { BatchPrepareNodeState, GridPreset } from './types';

interface BatchPrepareSliceColumnProps {
    gridConfig: BatchPrepareNodeState['gridConfig'];
    localBorderWidth: number;
    onLocalBorderWidthChange: (val: number) => void;
    onCommitBorderWidth: (val: number) => void;
    onSetGridPreset: (preset: '1x2' | '1x3' | '1x4' | '2x2' | '2x1' | '3x1') => void;
    onPerformSlice: () => void;
    onResetGrid: () => void;
    onToggleBorderMode: () => void;
    onChangeGridOverlayConfig: (newCfg: any) => void;
    activeSourceImage: string | null;
    sourceNaturalSize: { width: number; height: number } | null;
    slicedImages: string[];
    isSlicing: boolean;
    isBatchSlicing: boolean;
    batchProgress: { current: number; total: number } | null;
    allInputImagesCount: number;
    autoSendToViews: boolean;
    onToggleAutoSend: () => void;
    onSendTo3DViews: () => void;
    onBatchSliceAll: () => void;
    onOpenImageViewer?: (src: string, frameNumber: number) => void;
}

const BatchPrepareSliceColumnComponent: React.FC<BatchPrepareSliceColumnProps> = ({
    gridConfig,
    localBorderWidth,
    onLocalBorderWidthChange,
    onCommitBorderWidth,
    onSetGridPreset,
    onPerformSlice,
    onResetGrid,
    onToggleBorderMode,
    onChangeGridOverlayConfig,
    activeSourceImage,
    sourceNaturalSize,
    slicedImages,
    isSlicing,
    isBatchSlicing,
    batchProgress,
    allInputImagesCount,
    autoSendToViews,
    onToggleAutoSend,
    onSendTo3DViews,
    onBatchSliceAll,
    onOpenImageViewer,
}) => {
    const { t } = useLanguage();

    const presets: { id: GridPreset; label: string }[] = [
        { id: '1x2', label: '1x2' },
        { id: '1x3', label: '1x3' },
        { id: '1x4', label: '1x4 (FBLR)' },
        { id: '2x2', label: '2x2' },
        { id: '2x1', label: '2x1' },
        { id: '3x1', label: '3x1' },
    ];

    return (
        <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                    2. {t('batchprep.col2.title') || 'Нарезка (Grid Slice)'}
                </span>
                {slicedImages.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                        {slicedImages.length} частей
                    </span>
                )}
            </div>

            {/* Presets & Border Options Settings Bar */}
            <div className="p-2 border-b border-gray-800/80 bg-gray-950/40 shrink-0 space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-gray-400">Сетка нарезки:</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                        {gridConfig.cols}x{gridConfig.rows}
                    </span>
                </div>

                {/* Presets + Slice 1 + Reset buttons */}
                <div className="grid grid-cols-4 gap-1">
                    {presets.map((preset) => {
                        const isAct = gridConfig.preset === preset.id;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => onSetGridPreset(preset.id as any)}
                                className={`px-1.5 py-1 text-[10px] font-medium rounded border transition-all ${
                                    isAct 
                                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm' 
                                        : 'bg-gray-800/80 text-gray-300 border-gray-700/60 hover:bg-gray-700'
                                }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                    <button
                        onClick={onPerformSlice}
                        disabled={!activeSourceImage || isSlicing || isBatchSlicing}
                        className="px-1.5 py-1 text-[10px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center space-x-1 shadow-sm"
                        title="Нарезать текущее выбранное изображение"
                    >
                        <Scissors className="w-3 h-3" />
                        <span>{isSlicing ? '...' : '1 Кадр'}</span>
                    </button>
                    <button
                        onClick={onResetGrid}
                        className="px-1.5 py-1 text-[10px] font-semibold rounded bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white border border-gray-700/60 flex items-center justify-center space-x-1 transition-colors"
                        title="Сбросить границы, рамку и разделители сетки по умолчанию"
                    >
                        <RotateCcw className="w-3 h-3 text-cyan-400" />
                        <span>Сброс</span>
                    </button>
                </div>

                {/* Border Thickness with RELEASE ONLY COMMIT */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/60 text-[10px]">
                    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                        <span className="text-gray-400 shrink-0">Рамка:</span>
                        <input
                            type="range"
                            min="0"
                            max="40"
                            step="1"
                            value={localBorderWidth}
                            onChange={(e) => onLocalBorderWidthChange(Number(e.target.value))}
                            onMouseUp={() => onCommitBorderWidth(localBorderWidth)}
                            onTouchEnd={() => onCommitBorderWidth(localBorderWidth)}
                            onPointerUp={() => onCommitBorderWidth(localBorderWidth)}
                            onKeyUp={() => onCommitBorderWidth(localBorderWidth)}
                            className="flex-1 accent-cyan-500 h-1.5 bg-gray-800 rounded cursor-pointer"
                        />
                        <span className="font-mono text-cyan-300 w-7 text-right shrink-0">{localBorderWidth}px</span>
                    </div>

                    <button
                        onClick={onToggleBorderMode}
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-medium transition-colors ${
                            gridConfig.borderMode === 'all' 
                                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300' 
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}
                        title={gridConfig.borderMode === 'all' ? 'Режим границы: Внутренние + Внешние (All)' : 'Режим границы: Только между ячейками (Inner)'}
                    >
                        {gridConfig.borderMode === 'all' ? 'Внутр.+Внешн.' : 'Только внутр.'}
                    </button>
                </div>
            </div>

            {/* Source Image Slice Overlay Preview: Strictly bounded to image rectangle */}
            <div className="relative flex-1 min-h-[140px] bg-black/90 border-b border-gray-800/80 flex items-center justify-center overflow-hidden p-2">
                {activeSourceImage && sourceNaturalSize ? (
                    <div 
                        className="relative select-none flex items-center justify-center"
                        style={{
                            aspectRatio: `${sourceNaturalSize.width} / ${sourceNaturalSize.height}`,
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                        }}
                    >
                        <img 
                            src={activeSourceImage} 
                            alt="" 
                            className="w-full h-full object-contain pointer-events-none select-none block rounded" 
                        />
                        
                        <ImageGridOverlay
                            gridConfig={{
                                cols: gridConfig.cols,
                                rows: gridConfig.rows,
                                bounds: gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 },
                                enableBorder: (gridConfig.borderWidth || 0) > 0,
                                borderWidth: gridConfig.borderWidth || 0,
                                borderMode: gridConfig.borderMode || 'inner',
                                customDividers: true,
                                colDividers: gridConfig.colDividers,
                                rowDividers: gridConfig.rowDividers,
                            }}
                            onChangeGridConfig={onChangeGridOverlayConfig}
                            imageNaturalSize={sourceNaturalSize}
                        />
                    </div>
                ) : activeSourceImage ? (
                    <img src={activeSourceImage} alt="" className="max-w-full max-h-full object-contain rounded" />
                ) : (
                    <span className="text-[11px] text-gray-500">Выберите кадр в Колонке 1</span>
                )}
            </div>

            {/* Generated Slices Grid with 64x64 Previews */}
            <div className="shrink-0 h-28 flex flex-col overflow-hidden bg-gray-950/70 border-t border-gray-800">
                <div className="flex items-center justify-between px-2 py-0.5 bg-gray-900 border-b border-gray-800 shrink-0">
                    <span className="text-[10px] font-semibold text-gray-400">Нарезанные части (Slices):</span>
                    <span className="text-[9px] text-gray-500">
                        {slicedImages.length > 0 ? `${slicedImages.length} шт.` : 'пусто'}
                    </span>
                </div>

                <div className="flex-1 min-h-0 p-1.5 grid grid-cols-4 gap-1 overflow-x-auto overflow-y-hidden no-scrollbar">
                    {slicedImages.length === 0 ? (
                        <div className="col-span-4 flex flex-col items-center justify-center h-full text-gray-500 text-center p-1">
                            <Grid className="w-4 h-4 mb-0.5 text-gray-600" />
                            <span className="text-[9px]">Нажмите "1 Кадр" или "Нарезать ВСЕ"</span>
                        </div>
                    ) : (
                        slicedImages.map((sliceData, sliceIdx) => (
                            <div
                                key={`slice-${sliceIdx}`}
                                draggable
                                onDragStart={(e) => {
                                    setupImageDragData(e, sliceData, `Slice_${sliceIdx + 1}.png`);
                                }}
                                className="relative group rounded bg-gray-800/80 border border-gray-700/80 overflow-hidden cursor-grab active:cursor-grabbing hover:border-cyan-400/80 transition-all p-1 flex flex-col items-center justify-between h-full"
                            >
                                <div className="w-full flex-1 min-h-0 bg-black/60 rounded flex items-center justify-center overflow-hidden">
                                    <OptimizedThumbnail
                                        src={sliceData}
                                        size={64}
                                        alt={`Slice ${sliceIdx + 1}`}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="w-full mt-0.5 flex items-center justify-between text-[8px] text-gray-400 px-0.5 shrink-0">
                                    <span className="font-bold text-cyan-300">#{sliceIdx + 1}</span>
                                    <button
                                        onClick={() => {
                                            onOpenImageViewer?.(sliceData, sliceIdx + 1);
                                        }}
                                        className="hover:text-white p-0.5"
                                    >
                                        <Eye className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="p-2 border-t border-gray-800 bg-gray-900/90 shrink-0 flex flex-col space-y-2">
                {/* Row 1: Auto-send toggle on Left + Send to 3D Views on Right */}
                <div className="flex items-center space-x-2">
                    {/* Auto-send toggle on the LEFT */}
                    <div 
                        onClick={onToggleAutoSend}
                        className={`h-[32px] px-2.5 rounded-md border flex items-center justify-center space-x-1.5 cursor-pointer select-none transition-all shrink-0 ${
                            autoSendToViews 
                                ? 'bg-cyan-950/70 border-cyan-500/60 shadow-sm shadow-cyan-950/50' 
                                : 'bg-gray-800/80 border-gray-700 hover:border-gray-600'
                        }`}
                        title={autoSendToViews ? 'Авто-отправка в 3D Views: ВКЛ (нарезка сразу обновляет ракурсы)' : 'Авто-отправка в 3D Views: ВЫКЛ (нажмите для включения)'}
                    >
                        <Zap className={`w-3.5 h-3.5 ${autoSendToViews ? 'text-amber-400 animate-pulse' : 'text-gray-400'}`} />
                        <span className="text-[10px] font-medium text-gray-300">Авто</span>
                        <div className={`w-5 h-3 rounded-full p-0.5 flex items-center transition-colors ${
                            autoSendToViews ? 'bg-cyan-500 justify-end' : 'bg-gray-600 justify-start'
                        }`}>
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                        </div>
                    </div>

                    {/* Send to 3D Views button on the RIGHT */}
                    <button
                        onClick={onSendTo3DViews}
                        disabled={!activeSourceImage && slicedImages.length === 0}
                        className="flex-1 py-1.5 px-2 text-xs font-bold rounded-md bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:from-cyan-700 active:to-indigo-700 text-white disabled:opacity-40 flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-950/40 transition-all border border-cyan-400/40"
                        title="Отправить нарезанные фрагменты в 4 ракурса 3D (Front, Back, Left, Right)"
                    >
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                        <span>Отправить в 3D Views</span>
                    </button>
                </div>

                {/* Row 2: BATCH SLICE ALL at the VERY BOTTOM */}
                <button
                    onClick={onBatchSliceAll}
                    disabled={allInputImagesCount === 0 || isBatchSlicing || isSlicing}
                    className="w-full py-2 px-2.5 text-xs font-bold rounded-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:from-emerald-700 active:to-cyan-700 text-white disabled:opacity-40 flex items-center justify-center space-x-2 shadow-md shadow-emerald-950/50 border border-emerald-400/40 transition-all"
                    title={`Нарезать ВСЕ входящие изображения (${allInputImagesCount} шт.) по сетке ${gridConfig.cols}x${gridConfig.rows} и отправить в Пак Буфер`}
                >
                    {isBatchSlicing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Нарезка {batchProgress?.current || 0}/{batchProgress?.total || allInputImagesCount}...</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4 text-yellow-300" />
                            <span>Нарезать ВСЕ ({allInputImagesCount}) в Пак Буфер</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export const BatchPrepareSliceColumn = React.memo(BatchPrepareSliceColumnComponent);
