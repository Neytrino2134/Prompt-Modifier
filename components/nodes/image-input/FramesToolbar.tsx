import React from 'react';
import { ImageInputFramesConfig } from './types';

interface FramesToolbarProps {
    framesConfig?: ImageInputFramesConfig;
    selectedFrameIndex: number;
    originalDimensions: { width: number; height: number } | null;
    onAddFrame: () => void;
    onDuplicateFrame: () => void;
    onDeleteSelectedFrame: () => void;
    onClearAllFrames: () => void;
    onApplyFramesPresetLayout: (rows: number, cols: number) => void;
    onUpdateSelectedFrameDimensions: (widthPx: number, heightPx: number) => void;
    onApplyAspectToSelectedFrame: (ratioStr: string) => void;
    onUpdateSelectedFrameGrid: (cols: number, rows: number) => void;
    onResetSelectedFrameDividers: () => void;
}

export const FramesToolbar: React.FC<FramesToolbarProps> = ({
    framesConfig,
    selectedFrameIndex,
    originalDimensions,
    onAddFrame,
    onDuplicateFrame,
    onDeleteSelectedFrame,
    onClearAllFrames,
    onApplyFramesPresetLayout,
    onUpdateSelectedFrameDimensions,
    onApplyAspectToSelectedFrame,
    onUpdateSelectedFrameGrid,
    onResetSelectedFrameDividers,
}) => {
    return (
        <div className="flex flex-col gap-1.5 bg-cyan-950/50 border border-cyan-800/50 p-2 rounded-md text-xs text-cyan-200 animate-fadeIn">
            {/* Row 1: Actions: Add Frame, Duplicate, Delete, Clear & Presets */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={onAddFrame}
                        className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded flex items-center gap-1 shadow-sm transition-colors text-[11px]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Добавить рамку</span>
                    </button>

                    <button
                        type="button"
                        onClick={onDuplicateFrame}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-cyan-300 rounded border border-cyan-700/50 text-[11px] transition-colors"
                        title="Дублировать выбранную рамку"
                    >
                        Дублировать
                    </button>

                    <button
                        type="button"
                        onClick={() => onDeleteSelectedFrame()}
                        disabled={!framesConfig?.frames?.length}
                        className="px-2 py-1 bg-gray-800 hover:bg-red-950/80 hover:border-red-600/60 text-red-300 rounded border border-gray-700 text-[11px] transition-colors disabled:opacity-40"
                        title="Удалить выбранную рамку"
                    >
                        Удалить
                    </button>

                    <button
                        type="button"
                        onClick={onClearAllFrames}
                        disabled={!framesConfig?.frames?.length}
                        className="px-1.5 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800/80 rounded text-[11px] transition-colors disabled:opacity-40"
                        title="Очистить все рамки"
                    >
                        Очистить
                    </button>
                </div>

                {/* Layout Presets */}
                <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px]">Шаблоны:</span>
                    {[
                        { label: '1×2', r: 1, c: 2 },
                        { label: '1×3', r: 1, c: 3 },
                        { label: '2×1', r: 2, c: 1 },
                        { label: '2×2', r: 2, c: 2 },
                        { label: '3×3', r: 3, c: 3 }
                    ].map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => onApplyFramesPresetLayout(preset.r, preset.c)}
                            className="px-1.5 py-0.5 bg-gray-900/80 hover:bg-cyan-800 text-cyan-300 rounded text-[10px] font-mono border border-cyan-800/40"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Row 2: Aspect Ratio Presets for Selected Frame & Width/Height Editing */}
            {framesConfig?.frames && framesConfig.frames.length > 0 && (() => {
                const targetFrame = framesConfig.frames[selectedFrameIndex] || framesConfig.frames[0];
                const curW = originalDimensions ? Math.round(targetFrame.rect.width * originalDimensions.width) : Math.round(targetFrame.rect.width * 100);
                const curH = originalDimensions ? Math.round(targetFrame.rect.height * originalDimensions.height) : Math.round(targetFrame.rect.height * 100);
                const step = originalDimensions ? 10 : 2;

                return (
                    <div className="flex items-center justify-between border-t border-cyan-800/30 pt-1.5 flex-wrap gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-cyan-300 font-semibold text-[10px]">Размер #{selectedFrameIndex + 1}:</span>
                            
                            {/* Width Stepper & Input */}
                            <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                                <span className="px-1 text-cyan-400 font-bold select-none text-[9px]" title="Ширина рамки">Ш:</span>
                                <button
                                    type="button"
                                    onClick={() => onUpdateSelectedFrameDimensions(curW - step, curH)}
                                    className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    title="Уменьшить ширину"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={curW}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val > 0) onUpdateSelectedFrameDimensions(val, curH);
                                    }}
                                    className="w-12 bg-transparent text-center font-mono font-bold text-cyan-200 text-xs focus:outline-none focus:bg-cyan-950/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => onUpdateSelectedFrameDimensions(curW + step, curH)}
                                    className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    title="Увеличить ширину"
                                >
                                    +
                                </button>
                            </div>

                            {/* Height Stepper & Input */}
                            <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                                <span className="px-1 text-cyan-400 font-bold select-none text-[9px]" title="Высота рамки">В:</span>
                                <button
                                    type="button"
                                    onClick={() => onUpdateSelectedFrameDimensions(curW, curH - step)}
                                    className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    title="Уменьшить высоту"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={curH}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val > 0) onUpdateSelectedFrameDimensions(curW, val);
                                    }}
                                    className="w-12 bg-transparent text-center font-mono font-bold text-cyan-200 text-xs focus:outline-none focus:bg-cyan-950/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => onUpdateSelectedFrameDimensions(curW, curH + step)}
                                    className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    title="Увеличить высоту"
                                >
                                    +
                                </button>
                            </div>

                            {/* Aspect Ratio Presets */}
                            <div className="flex items-center gap-1 font-mono text-[10px]">
                                <button type="button" onClick={() => onApplyAspectToSelectedFrame('1:1')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono text-[10px] text-cyan-200">1:1</button>
                                <button type="button" onClick={() => onApplyAspectToSelectedFrame('16:9')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono text-[10px] text-cyan-200">16:9</button>
                                <button type="button" onClick={() => onApplyAspectToSelectedFrame('9:16')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono text-[10px] text-cyan-200">9:16</button>
                                <button type="button" onClick={() => onApplyAspectToSelectedFrame('4:3')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono text-[10px] text-cyan-200">4:3</button>
                                <button type="button" onClick={() => onApplyAspectToSelectedFrame('3:4')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono text-[10px] text-cyan-200">3:4</button>
                                <button type="button" onClick={() => onApplyAspectToSelectedFrame('full')} className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]">Весь кадр</button>
                            </div>
                        </div>

                        <div className="text-[10px] text-gray-400 font-mono">
                            Рамок: <span className="text-cyan-300 font-bold">{framesConfig?.frames?.length || 0}</span> | Перетаскивайте и масштабируйте рамки на холсте
                        </div>
                    </div>
                );
            })()}

            {/* Row 3: Sub-Grid Division for Selected Frame (+/- Horiz & Vert) */}
            {framesConfig?.frames && framesConfig.frames.length > 0 && (() => {
                const targetFrame = framesConfig.frames[selectedFrameIndex] || framesConfig.frames[0];
                const targetCols = Math.max(1, targetFrame?.cols || 1);
                const targetRows = Math.max(1, targetFrame?.rows || 1);
                const hasSub = targetCols > 1 || targetRows > 1;
                const hasCustomDivs = Boolean(targetFrame?.colDividers?.length || targetFrame?.rowDividers?.length);

                return (
                    <div className="flex items-center justify-between border-t border-cyan-800/30 pt-1.5 flex-wrap gap-2 text-[11px]">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-cyan-300 font-semibold text-[10px] flex items-center gap-1">
                                <span>Сетка рамки #{selectedFrameIndex + 1}:</span>
                                {hasSub && (
                                    <span className="text-cyan-300 font-bold bg-cyan-900/60 px-1 py-0.2 rounded border border-cyan-500/40 text-[9px]">
                                        {targetCols}×{targetRows} ({targetCols * targetRows} ассет.)
                                    </span>
                                )}
                            </span>

                            {/* Horizontal Stepper (X/Cols) */}
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-[10px]">По гор. (X):</span>
                                <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                                    <button
                                        type="button"
                                        disabled={targetCols <= 1}
                                        onClick={() => onUpdateSelectedFrameGrid(targetCols - 1, targetRows)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 disabled:opacity-30 text-cyan-300 font-bold"
                                        title="Уменьшить колонки по горизонтали"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 py-0.5 text-center font-mono font-bold text-cyan-200 text-xs">
                                        {targetCols}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={targetCols >= 20}
                                        onClick={() => onUpdateSelectedFrameGrid(targetCols + 1, targetRows)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 disabled:opacity-30 text-cyan-300 font-bold"
                                        title="Разделить рамку по горизонтали"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Vertical Stepper (Y/Rows) */}
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-[10px]">По верт. (Y):</span>
                                <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                                    <button
                                        type="button"
                                        disabled={targetRows <= 1}
                                        onClick={() => onUpdateSelectedFrameGrid(targetCols, targetRows - 1)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 disabled:opacity-30 text-cyan-300 font-bold"
                                        title="Уменьшить строки по вертикали"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 py-0.5 text-center font-mono font-bold text-cyan-200 text-xs">
                                        {targetRows}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={targetRows >= 20}
                                        onClick={() => onUpdateSelectedFrameGrid(targetCols, targetRows + 1)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 disabled:opacity-30 text-cyan-300 font-bold"
                                        title="Разделить рамку по вертикали"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Frame Grid Presets */}
                            <div className="flex items-center gap-1 font-mono text-[10px]">
                                {[
                                    { label: '1×1', c: 1, r: 1 },
                                    { label: '1×2', c: 2, r: 1 },
                                    { label: '2×1', c: 1, r: 2 },
                                    { label: '2×2', c: 2, r: 2 },
                                    { label: '3×3', c: 3, r: 3 },
                                ].map((p) => {
                                    const isActive = targetCols === p.c && targetRows === p.r;
                                    return (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => onUpdateSelectedFrameGrid(p.c, p.r)}
                                            className={`px-1.5 py-0.5 rounded transition-colors ${
                                                isActive
                                                    ? 'bg-cyan-600 text-white font-bold ring-1 ring-cyan-400'
                                                    : 'bg-gray-900 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-800/40'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Reset custom dividers button */}
                            {hasSub && hasCustomDivs && (
                                <button
                                    type="button"
                                    onClick={onResetSelectedFrameDividers}
                                    className="px-1.5 py-0.5 bg-amber-950 hover:bg-amber-700 text-amber-200 rounded border border-amber-600/70 text-[10px] font-mono whitespace-nowrap transition-colors"
                                    title="Сбросить линии разделения сетки к равномерным"
                                >
                                    Сброс
                                </button>
                            )}
                        </div>

                        {hasSub && (
                            <button
                                type="button"
                                onClick={() => onUpdateSelectedFrameGrid(1, 1)}
                                className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
                                title="Сбросить деление рамки к 1×1"
                            >
                                Сброс сетки рамки
                            </button>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};
