import React from 'react';
import { ImageBatchItem, ImageBatchSubMode, ImageInputGridConfig, ImageInputFramesConfig, ImageInputMode } from './types';

interface ModeSelectorBarProps {
    mode: ImageInputMode;
    onSetMode: (mode: ImageInputMode) => void;
    batchFiles: ImageBatchItem[];
    batchSubMode: ImageBatchSubMode;
    grid?: ImageInputGridConfig;
    framesConfig?: ImageInputFramesConfig;
}

export const ModeSelectorBar: React.FC<ModeSelectorBarProps> = ({
    mode,
    onSetMode,
    batchFiles,
    batchSubMode,
    grid,
    framesConfig,
}) => {
    return (
        <div className="flex items-center justify-between bg-gray-900/90 border border-gray-700/80 p-1 rounded-md text-xs">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetMode('full');
                    }}
                    className={`px-2 py-1 rounded font-medium transition-all ${
                        mode === 'full' 
                            ? 'bg-accent text-white shadow-sm font-semibold' 
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }`}
                >
                    Обычный
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetMode('single');
                    }}
                    className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                        mode === 'single' 
                            ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                    }`}
                >
                    <span>✂ Single Crop</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetMode('frames');
                    }}
                    className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                        mode === 'frames' 
                            ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                    }`}
                >
                    <span>⬚ Multiple Frames</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetMode('grid');
                    }}
                    className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                        mode === 'grid' 
                            ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                    }`}
                >
                    <span>▦ Multiple Grid</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetMode('batch');
                    }}
                    className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                        mode === 'batch' 
                            ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                            : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                    }`}
                >
                    <span>📦 Batch</span>
                </button>
            </div>

            {/* Mode Status Pill */}
            <div className="text-[10px] text-gray-400 font-mono pr-1 truncate max-w-[140px]">
                {mode === 'full' && (batchFiles.length > 0 ? `${batchFiles.length} files in pack` : 'Full image')}
                {mode === 'single' && 'Active selection -> output'}
                {mode === 'grid' && `${(grid?.cols || 2) * (grid?.rows || 1)} assets pack`}
                {mode === 'frames' && `${framesConfig?.frames?.length || 0} frames pack`}
                {mode === 'batch' && (batchFiles.length > 0 ? `${batchFiles.length} files (${batchSubMode})` : 'Batch mode')}
            </div>
        </div>
    );
};
