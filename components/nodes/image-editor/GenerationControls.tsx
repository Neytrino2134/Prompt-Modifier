
import React from 'react';
import CustomSelect from '../../CustomSelect';
import { CustomCheckbox } from '../../CustomCheckbox';

interface GenerationControlsProps {
    model: string;
    autoCrop169: boolean;
    autoDownload: boolean;
    createZip: boolean;
    isGeneratingSequence: boolean;
    isAnyFrameGenerating: boolean;
    checkedCount: number;
    promptsLength: number;
    onUpdateState: (updates: any) => void;
    onGenerateSelected: () => void;
    onDownloadSelected: () => void;
    onStartQueue: () => void;
    onExpandSelected: (ratio: string) => void;
    t: (key: string) => string;
}

export const GenerationControls: React.FC<GenerationControlsProps> = ({
    model,
    autoCrop169,
    autoDownload,
    createZip,
    isGeneratingSequence,
    isAnyFrameGenerating,
    checkedCount,
    promptsLength,
    onUpdateState,
    onGenerateSelected,
    onDownloadSelected,
    onStartQueue,
    onExpandSelected,
    t
}) => {
    
    const modelOptions = [
        { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
        { value: 'imagen-4.0-generate-001', label: 'Imagen 4.0' }
    ];

    return (
        <div className="flex-shrink-0 space-y-2 mt-2">
            <div className="mb-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('node.content.generationMode')}</label>
                <CustomSelect
                    value={model}
                    onChange={(value) => onUpdateState({ model: value })}
                    disabled={isGeneratingSequence}
                    options={modelOptions}
                />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id={`auto-crop-169`} checked={!!autoCrop169} onChange={(e) => onUpdateState({ autoCrop169: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent bg-gray-700 cursor-pointer" />
                    <label htmlFor={`auto-crop-169`} className="text-sm text-gray-300 cursor-pointer">Авто-кадрирование 16:9</label>
                </div>
                 <div className="flex items-center space-x-2">
                    <input type="checkbox" id={`auto-download`} checked={autoDownload} onChange={(e) => onUpdateState({ autoDownload: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent bg-gray-700 cursor-pointer" />
                    <label htmlFor={`auto-download`} className="text-sm text-gray-300 cursor-pointer select-none">{t('node.content.autoDownload')}</label>
                </div>
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id={`create-zip`} checked={!!createZip} onChange={(e) => onUpdateState({ createZip: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent bg-gray-700 cursor-pointer" />
                    <label htmlFor={`create-zip`} className="text-sm text-gray-300 cursor-pointer select-none">Создать Zip архив</label>
                </div>
            </div>
            <div className="flex space-x-2 mb-2">
                <button 
                    onClick={onGenerateSelected} 
                    disabled={isGeneratingSequence || isAnyFrameGenerating || checkedCount === 0} 
                    className="flex-1 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {t('image_sequence.run_selected')} ({checkedCount})
                </button>
                
                {/* NEW: Batch Expand Buttons */}
                <button 
                    onClick={() => onExpandSelected('16:9')}
                    disabled={isGeneratingSequence || isAnyFrameGenerating || checkedCount === 0}
                    className="flex-shrink-0 w-20 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-md disabled:bg-gray-700 disabled:text-gray-500 transition-colors flex items-center justify-center gap-2"
                    title="Expand Selected to 16:9"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="8" rx="1" /></svg>
                    16:9
                </button>
                <button 
                    onClick={() => onExpandSelected('9:16')}
                    disabled={isGeneratingSequence || isAnyFrameGenerating || checkedCount === 0}
                    className="flex-shrink-0 w-20 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-md disabled:bg-gray-700 disabled:text-gray-500 transition-colors flex items-center justify-center gap-2"
                    title="Expand Selected to 9:16"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="20" rx="1" /></svg>
                    9:16
                </button>

                <button 
                    onClick={onDownloadSelected} 
                    disabled={checkedCount === 0} 
                    className="flex-1 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {createZip ? 'Download ZIP' : `${t('image_sequence.download_selected')} (${checkedCount})`}
                </button>
            </div>
            <div>
               <button 
                   onClick={onStartQueue} 
                   disabled={isGeneratingSequence || isAnyFrameGenerating || promptsLength === 0} 
                   className={`w-full py-2 rounded-md font-semibold transition-colors ${
                       isGeneratingSequence || isAnyFrameGenerating 
                           ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                           : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                   }`}
               >
                   {(isGeneratingSequence || isAnyFrameGenerating) ? t('node.content.generating') : t('image_sequence.start_queue')}
               </button>
            </div>
        </div>
    );
};
