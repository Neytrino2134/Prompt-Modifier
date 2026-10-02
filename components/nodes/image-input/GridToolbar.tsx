import React from 'react';
import { ImageInputGridConfig } from './types';

interface GridToolbarProps {
    grid?: ImageInputGridConfig;
    localBorderWidth: string;
    onUpdateGridDims: (cols: number, rows: number) => void;
    onResetGridBounds: () => void;
    onToggleBorder: () => void;
    onBorderWidthChange: (val: string) => void;
    onBorderWidthCommit: () => void;
    onSetBorderWidthQuick: (px: number) => void;
    onSetBorderMode: (mode: 'inner' | 'all') => void;
    onToggleCustomDividers: () => void;
    onResetDividers: () => void;
}

export const GridToolbar: React.FC<GridToolbarProps> = ({
    grid,
    localBorderWidth,
    onUpdateGridDims,
    onResetGridBounds,
    onToggleBorder,
    onBorderWidthChange,
    onBorderWidthCommit,
    onSetBorderWidthQuick,
    onSetBorderMode,
    onToggleCustomDividers,
    onResetDividers,
}) => {
    return (
        <div className="flex flex-col gap-1.5 bg-cyan-950/40 border border-cyan-800/40 p-2 rounded-md text-xs text-cyan-200 animate-fadeIn">
            {/* Row 1: Grid Dimensions (Rows/Cols) and Presets */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Rows (Y) */}
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-cyan-300 text-[11px]">Строки (Y):</span>
                        <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                            <button
                                type="button"
                                onClick={() => onUpdateGridDims(grid?.cols || 2, (grid?.rows || 1) - 1)}
                                className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                            >
                                -
                            </button>
                            <span className="px-2 py-0.5 text-center font-mono font-bold text-cyan-200 text-xs">
                                {grid?.rows || 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => onUpdateGridDims(grid?.cols || 2, (grid?.rows || 1) + 1)}
                                className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Columns (X) */}
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-cyan-300 text-[11px]">Столбцы (X):</span>
                        <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                            <button
                                type="button"
                                onClick={() => onUpdateGridDims((grid?.cols || 2) - 1, grid?.rows || 1)}
                                className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                            >
                                -
                            </button>
                            <span className="px-2 py-0.5 text-center font-mono font-bold text-cyan-200 text-xs">
                                {grid?.cols || 2}
                            </span>
                            <button
                                type="button"
                                onClick={() => onUpdateGridDims((grid?.cols || 2) + 1, grid?.rows || 1)}
                                className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Presets (Sorted Ascending, Row×Col) */}
                <div className="flex items-center gap-1 text-[11px] flex-wrap">
                    {[
                        { rows: 1, cols: 2, label: '1×2' },
                        { rows: 1, cols: 3, label: '1×3' },
                        { rows: 2, cols: 1, label: '2×1' },
                        { rows: 2, cols: 2, label: '2×2' },
                        { rows: 3, cols: 3, label: '3×3' },
                        { rows: 3, cols: 4, label: '3×4' },
                        { rows: 4, cols: 3, label: '4×3' },
                        { rows: 4, cols: 4, label: '4×4' },
                        { rows: 4, cols: 5, label: '4×5' },
                        { rows: 5, cols: 4, label: '5×4' },
                        { rows: 5, cols: 5, label: '5×5' },
                    ].map((preset) => {
                        const isActive = (grid?.rows || 1) === preset.rows && (grid?.cols || 2) === preset.cols;
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => onUpdateGridDims(preset.cols, preset.rows)}
                                className={`px-1.5 py-0.5 font-mono rounded transition-colors ${
                                    isActive
                                        ? 'bg-cyan-600 text-white font-bold shadow-sm ring-1 ring-cyan-400'
                                        : 'bg-cyan-900/60 hover:bg-cyan-700 text-cyan-200'
                                }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                    <button 
                        type="button"
                        onClick={onResetGridBounds} 
                        className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
                        title="Сбросить внешние границы сетки"
                    >
                        Сброс границ
                    </button>
                </div>
            </div>

            {/* Row 2: Border Thickness & Border Mode Controls */}
            <div className="flex items-center justify-between border-t border-cyan-800/30 pt-1.5 flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Toggle Enable Border */}
                    <button
                        type="button"
                        onClick={onToggleBorder}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-colors ${
                            grid?.enableBorder
                                ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                                : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-700'
                            }`}
                    >
                        <span className="w-3.5 h-3.5 flex items-center justify-center rounded border border-current text-[10px] font-bold">
                            {grid?.enableBorder ? '✓' : ''}
                        </span>
                        <span>Толщина границы</span>
                    </button>

                    {/* When Border Enabled: Pixel Thickness Stepper & Presets */}
                    {grid?.enableBorder && (
                        <div className="flex items-center gap-1.5 bg-gray-900/90 border border-cyan-700/60 px-1.5 py-0.5 rounded">
                            <span className="text-cyan-300 text-[10px] font-semibold">px:</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = grid?.borderWidth ?? 24;
                                    onSetBorderWidthQuick(Math.max(0, current - 4));
                                }}
                                className="px-1.5 py-0.2 hover:bg-cyan-800/70 text-cyan-300 font-bold rounded"
                                title="-4 px"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                min={0}
                                max={300}
                                value={localBorderWidth}
                                onChange={(e) => onBorderWidthChange(e.target.value)}
                                onBlur={onBorderWidthCommit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onBorderWidthCommit();
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="w-10 text-center font-mono font-bold bg-transparent text-cyan-200 focus:outline-none focus:bg-gray-800 rounded text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const current = grid?.borderWidth ?? 24;
                                    onSetBorderWidthQuick(Math.min(300, current + 4));
                                }}
                                className="px-1.5 py-0.2 hover:bg-cyan-800/70 text-cyan-300 font-bold rounded"
                                title="+4 px"
                            >
                                +
                            </button>

                            <div className="flex items-center gap-0.5 pl-1 border-l border-gray-700 font-mono text-[10px]">
                                {[24, 32, 48, 64, 96].map((px) => (
                                     <button
                                        key={px}
                                        type="button"
                                        onClick={() => onSetBorderWidthQuick(px)}
                                        className={`px-1 py-0.2 rounded hover:bg-cyan-800/70 ${
                                            (grid?.borderWidth ?? 24) === px
                                                ? 'bg-cyan-700 text-white font-bold'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        {px}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Border Scope Mode (Inner Only vs All Borders) */}
                {grid?.enableBorder && (
                    <div className="flex items-center bg-gray-900/90 border border-cyan-700/60 p-0.5 rounded gap-0.5">
                        <button
                            type="button"
                            onClick={() => onSetBorderMode('inner')}
                            className={`px-2 py-0.5 rounded transition-all ${
                                (grid?.borderMode || 'inner') === 'inner'
                                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Обрезать только внутренние разделители между ячейками"
                        >
                            Только центральные
                        </button>
                        <button
                            type="button"
                            onClick={() => onSetBorderMode('all')}
                            className={`px-2 py-0.5 rounded transition-all ${
                                grid?.borderMode === 'all'
                                    ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Обрезать все границы: внутренние рамки и внешнюю окантовку"
                        >
                            Все границы
                        </button>
                    </div>
                )}
            </div>

            {/* Row 3: Custom / Editable Table Boundaries */}
            <div className="flex items-center justify-between border-t border-cyan-800/30 pt-1.5 flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={onToggleCustomDividers}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-colors ${
                            grid?.customDividers
                                ? 'bg-accent-secondary text-white font-semibold shadow-sm'
                                : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-700'
                        }`}
                        title="Включить ручное перемещение внутренних линий колонок и строк мышкой"
                    >
                        <span className="w-3.5 h-3.5 flex items-center justify-center rounded border border-current text-[10px] font-bold">
                            {grid?.customDividers ? '✓' : ''}
                        </span>
                        <span>Редактируемые границы (Таблица)</span>
                    </button>

                    {(grid?.customDividers || (grid?.colDividers && grid.colDividers.length > 0) || (grid?.rowDividers && grid.rowDividers.length > 0)) && (
                        <button
                            type="button"
                            onClick={onResetDividers}
                            className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-[10px] border border-gray-700 font-mono transition-colors"
                            title="Выровнять все столбцы и строки до одинаковой ширины и высоты"
                        >
                            ⟲ Выровнять ячейки
                        </button>
                    )}
                </div>

                <div className="text-[10px] text-gray-400 font-mono">
                    {grid?.customDividers ? (
                        <span className="text-accent-secondary/90 font-sans">
                            Потяните линии <span className="font-mono text-accent-secondary font-bold">⇿ ⇳</span> между ячейками мышкой
                        </span>
                    ) : (
                        <span>Линии можно двигать в любой момент</span>
                    )}
                </div>
            </div>
        </div>
    );
};
