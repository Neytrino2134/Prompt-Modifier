import React from 'react';
import { ImageBatchItem, ImageBatchSubMode, ImageInputGridConfig } from './types';

interface BatchSubModeSelectorProps {
    batchSubMode: ImageBatchSubMode;
    onChangeSubMode: (subMode: ImageBatchSubMode) => void;
    batchFiles: ImageBatchItem[];
    grid?: ImageInputGridConfig;
}

export const BatchSubModeSelector: React.FC<BatchSubModeSelectorProps> = ({
    batchSubMode,
    onChangeSubMode,
    batchFiles,
    grid,
}) => {
    return (
        <div className="flex items-center justify-between bg-cyan-950/60 border border-cyan-700/60 px-2 py-1.5 rounded-md text-xs animate-fadeIn">
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-cyan-300 font-semibold text-[11px] mr-1">Режим обработки:</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChangeSubMode('crop');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                        batchSubMode === 'crop'
                            ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                            : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    <span>✂ Кадрирование (Crop)</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChangeSubMode('grid');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                        batchSubMode === 'grid'
                            ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                            : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    <span>▦ Сетка ({grid?.cols || 2}×{grid?.rows || 1})</span>
                </button>
            </div>

            <div className="text-[10px] text-cyan-400 font-mono hidden sm:inline">
                {batchFiles.length > 0 ? `Файлов: ${batchFiles.length}` : 'Пакетный режим'}
            </div>
        </div>
    );
};
