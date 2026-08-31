


import React, { useMemo } from 'react';
import CustomSelect from '../../CustomSelect';
import { CustomCheckbox } from '../../CustomCheckbox';
import { useOpenAiEnabled, getImageEditorModelOptions, isGptImage2Model, isOpenAiImageModel } from '../../../services/modelConfig';

interface GenerationControlsProps {
    model: string;
    quality?: string;
    outputFormat?: string;
    size?: string;
    aspectRatio?: string;
    resolution?: string;
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
    quality,
    outputFormat,
    size,
    aspectRatio,
    resolution,
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
    
    const isOpenAiActive = useOpenAiEnabled();
    const modelOptions = useMemo(() => getImageEditorModelOptions(), [isOpenAiActive]);

    const isGpt2 = isGptImage2Model(model);
    const isDalle3 = model === 'dall-e-3';
    const isDalle2 = model === 'dall-e-2';

    const gpt2QualityOptions = [
        { value: 'standard', label: 'Standard' },
        { value: 'hd', label: 'HD' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
    ];
    const dalle3QualityOptions = [
        { value: 'standard', label: 'Standard' },
        { value: 'hd', label: 'HD' },
    ];
    const gpt2SizeOptions = [
        { value: '1024x1024', label: '1024 × 1024 (1:1)' },
        { value: '1536x1024', label: '1536 × 1024 (3:2)' },
        { value: '1024x1536', label: '1024 × 1536 (2:3)' },
        { value: 'auto', label: 'Auto' },
    ];
    const dalle2SizeOptions = [
        { value: '1024x1024', label: '1024 × 1024' },
        { value: '512x512', label: '512 × 512' },
        { value: '256x256', label: '256 × 256' },
    ];
    const gpt2FormatOptions = [
        { value: 'png', label: 'PNG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'webp', label: 'WebP' },
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

            {/* Quality selection for GPT-Image-2 and DALL-E 3 */}
            {isGpt2 && (
                <>
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Quality</label>
                        <CustomSelect
                            value={quality || 'high'}
                            onChange={(value) => onUpdateState({ quality: value })}
                            disabled={isGeneratingSequence}
                            options={gpt2QualityOptions}
                        />
                    </div>
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Resolution / Size</label>
                        <CustomSelect
                            value={size || '1024x1024'}
                            onChange={(value) => onUpdateState({ size: value })}
                            disabled={isGeneratingSequence}
                            options={gpt2SizeOptions}
                        />
                    </div>
                    <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Output Format</label>
                        <CustomSelect
                            value={outputFormat || 'png'}
                            onChange={(value) => onUpdateState({ outputFormat: value })}
                            disabled={isGeneratingSequence}
                            options={gpt2FormatOptions}
                        />
                    </div>
                </>
            )}

            {isDalle3 && (
                <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Quality</label>
                    <CustomSelect
                        value={quality || 'standard'}
                        onChange={(value) => onUpdateState({ quality: value })}
                        disabled={isGeneratingSequence}
                        options={dalle3QualityOptions}
                    />
                </div>
            )}

            {isDalle2 && (
                <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Resolution / Size</label>
                    <CustomSelect
                        value={size || '1024x1024'}
                        onChange={(value) => onUpdateState({ size: value })}
                        disabled={isGeneratingSequence}
                        options={dalle2SizeOptions}
                    />
                </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                    <CustomCheckbox
                        id={`auto-crop-169`}
                        checked={!!autoCrop169}
                        onChange={(checked) => onUpdateState({ autoCrop169: checked })}
                        label={t('image_sequence.auto_crop')}
                        title={t('image_sequence.tooltip.autoCrop')}
                        className="text-sm text-gray-300"
                    />
                </div>
                 <div className="flex items-center space-x-2">
                     <CustomCheckbox
                        id={`auto-download`}
                        checked={autoDownload}
                        onChange={(checked) => onUpdateState({ autoDownload: checked })}
                        label={t('node.content.autoDownload')}
                        title={t('image_sequence.tooltip.autoDownload')}
                        className="text-sm text-gray-300"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <CustomCheckbox
                        id={`create-zip`}
                        checked={!!createZip}
                        onChange={(checked) => onUpdateState({ createZip: checked })}
                        label={t('image_sequence.create_zip')}
                        title={t('image_sequence.tooltip.createZip')}
                        className="text-sm text-gray-300"
                    />
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
                
                {/* Batch Expand Buttons */}
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