import React from 'react';
import { ImageInputMode } from './types';

interface CropPresetsBarProps {
    mode: ImageInputMode;
    onApplyAspectCrop: (ratioStr: string) => void;
    onResetCrop: () => void;
}

export const CropPresetsBar: React.FC<CropPresetsBarProps> = ({
    mode,
    onApplyAspectCrop,
    onResetCrop,
}) => {
    return (
        <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-800/40 px-2 py-1 rounded-md text-[11px] text-cyan-200 animate-fadeIn">
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-cyan-300">Пресеты {mode === 'batch' ? 'для пакета' : ''}:</span>
                <button type="button" onClick={() => onApplyAspectCrop('1:1')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">1:1</button>
                <button type="button" onClick={() => onApplyAspectCrop('16:9')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">16:9</button>
                <button type="button" onClick={() => onApplyAspectCrop('9:16')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">9:16</button>
                <button type="button" onClick={() => onApplyAspectCrop('4:3')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">4:3</button>
                <button type="button" onClick={() => onApplyAspectCrop('3:4')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">3:4</button>
                <button type="button" onClick={onResetCrop} className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded">Весь кадр</button>
            </div>
            <span className="text-[10px] text-cyan-400/80 font-mono hidden sm:inline">Качество 100% (Без сжатия)</span>
        </div>
    );
};
