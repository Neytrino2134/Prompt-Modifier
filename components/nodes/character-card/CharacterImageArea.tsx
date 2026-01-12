
import React from 'react';
import { ActionButton } from '../../ActionButton';
import { Tooltip } from '../../Tooltip';
import { CopyIcon } from '../../../components/icons/AppIcons';
import { RATIO_INDICES } from '../../../utils/nodeUtils';
import { CharacterData } from './types';

interface CharacterImageAreaProps {
    char: CharacterData;
    cardIdx: number;
    nodeId: string;
    isDragOver: boolean;
    setIsDragOver: (val: boolean) => void;
    // Handlers
    onRatioChange: (ratio: string) => void;
    onPasteImage: () => void;
    onClearImage: () => void;
    onCopyImage: () => void;
    onGenerateImage: () => void;
    onEditRaster: () => void;
    onEditAI: () => void;
    onCrop1x1: () => void;
    onExpandRatio: (ratio: string) => void;
    onSetEditingIndex: () => void;
    // Helpers
    getFullSizeImage: (idx: number) => string | undefined;
    setImageViewer: (state: any) => void;
    onCopyImageToClipboard: (src: string) => void;
    processNewImage: (data: string) => void;
    transformingRatio: string | null;
    isGeneratingImage: boolean;
    t: (key: string) => string;
}

const LoadingSpinner = () => (
    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const CharacterImageArea: React.FC<CharacterImageAreaProps> = ({
    char, cardIdx, nodeId, isDragOver, setIsDragOver,
    onRatioChange, onPasteImage, onClearImage, onCopyImage, onGenerateImage,
    onEditRaster, onEditAI, onCrop1x1, onExpandRatio, onSetEditingIndex,
    getFullSizeImage, setImageViewer, onCopyImageToClipboard, processNewImage,
    transformingRatio, isGeneratingImage, t
}) => {
    
    const hasImage = !!(char.thumbnails[char.selectedRatio] || char.image);

    // Helper to determine button class based on loading state
    const getButtonClass = (isLoadingThis: boolean) => {
        if (isLoadingThis) {
            // Lighter gray for active loading state (gray-600 vs disabled gray-700), full opacity, wait cursor
            return "bg-gray-600 text-white cursor-wait";
        }
        // Standard state (active or disabled)
        return "bg-accent hover:bg-accent-hover text-white disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500";
    };

    return (
        <div className="flex flex-col flex-shrink-0">
            <div 
                onClick={onSetEditingIndex} 
                onDragEnter={(e) => { 
                    if (e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
                    e.preventDefault(); e.stopPropagation(); setIsDragOver(true); 
                }}
                onDragOver={(e) => { 
                    if (e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
                    e.preventDefault(); e.stopPropagation(); setIsDragOver(true); 
                }}
                className={`flex-shrink-0 h-[256px] bg-gray-700/50 rounded-xl flex items-center justify-center cursor-pointer transition-all group relative overflow-hidden z-10 hover:z-20 hover:bg-gray-800/60 ${isDragOver ? 'border-2 border-accent ring-2 ring-accent/20' : ''}`} 
                onDragLeave={() => setIsDragOver(false)} 
                onDrop={(e) => { 
                        if (e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
                        e.preventDefault(); e.stopPropagation(); setIsDragOver(false); 
                        const data = e.dataTransfer.getData('application/prompt-modifier-drag-image'); 
                        if (data) { processNewImage(data); return; } 
                        const file = e.dataTransfer.files?.[0]; 
                        if (file?.type.startsWith('image/')) { 
                            const reader = new FileReader(); 
                            reader.onload = (ev) => processNewImage(ev.target?.result as string); 
                            reader.readAsDataURL(file); 
                        } 
                }}
            >
                {char.thumbnails[char.selectedRatio] || char.image ? (
                    <>
                        <img 
                            src={char.thumbnails[char.selectedRatio] || char.image!} 
                            className="object-contain w-full h-full transition-opacity group-hover:opacity-80" 
                            style={{ imageRendering: 'auto' }} 
                            draggable={true} 
                            onDragStart={(e) => { 
                                const src = getFullSizeImage((cardIdx * 10) + (RATIO_INDICES[char.selectedRatio] || 1)) || char.image; 
                                if(src) { e.dataTransfer.setData('application/prompt-modifier-drag-image', src); e.stopPropagation(); } 
                            }} 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setImageViewer({ sources: [{ src: getFullSizeImage((cardIdx * 10) + (RATIO_INDICES[char.selectedRatio] || 1)) || char.image!, frameNumber: 0 }], initialIndex: 0 }); 
                            }} 
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopyImage(); }} className="bg-black/60 p-1.5 rounded text-accent-text hover:text-white" tooltipPosition="left">
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton title={t('node.action.paste')} onClick={(e) => { e.stopPropagation(); onPasteImage(); }} className="bg-black/60 p-1.5 rounded text-accent-text hover:text-white" tooltipPosition="left">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.clear')} onClick={(e) => { e.stopPropagation(); onClearImage(); }} className="bg-black/60 p-1.5 rounded text-red-400 hover:text-white" tooltipPosition="left">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" /></svg>
                            </ActionButton>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <div className="flex flex-col items-center justify-center text-[10px] text-gray-500 uppercase font-bold text-center px-4 leading-normal gap-1 max-w-[200px]">
                            <span className="text-balance">{t('node.content.dropImage')}</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPasteImage(); }}
                            className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs font-bold rounded border border-gray-600 transition-colors flex items-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {t('node.action.paste')}
                        </button>
                    </div>
                )}
            </div>
            <div className="h-4"></div>

            <div className="flex gap-1 flex-shrink-0 mb-2 items-center px-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onGenerateImage(); }} 
                    disabled={isGeneratingImage || !char.prompt} 
                    className={`flex-grow h-8 font-bold rounded text-[10px] uppercase transition-colors shadow-sm flex items-center justify-center gap-2 ${getButtonClass(isGeneratingImage)}`}
                >
                    {isGeneratingImage ? <><LoadingSpinner /><span>{t('node.content.generating')}</span></> : t('node.content.generateImage')}
                </button>
                
                <div className="flex gap-1 shrink-0">
                    {char.selectedRatio === '1:1' && <Tooltip content="Crop to 1:1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onCrop1x1(); }} 
                            disabled={!!transformingRatio || !hasImage} 
                            className={`w-12 h-8 rounded text-[10px] font-bold transition-colors flex items-center justify-center ${getButtonClass(transformingRatio === '1:1')}`}
                        >
                            {transformingRatio === '1:1' ? <LoadingSpinner /> : '1:1'}
                        </button>
                    </Tooltip>}
                    
                    {char.selectedRatio === '16:9' && <Tooltip content={t('node.action.expand169')}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onExpandRatio('16:9'); }} 
                            disabled={!!transformingRatio || !hasImage} 
                            className={`w-12 h-8 rounded text-[10px] font-bold transition-colors flex items-center justify-center ${getButtonClass(transformingRatio === '16:9')}`}
                        >
                            {transformingRatio === '16:9' ? <LoadingSpinner /> : '16:9'}
                        </button>
                    </Tooltip>}
                    
                    {char.selectedRatio === '9:16' && <Tooltip content={t('node.action.expand916')}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onExpandRatio('9:16'); }} 
                            disabled={!!transformingRatio || !hasImage} 
                            className={`w-12 h-8 rounded text-[10px] font-bold transition-colors flex items-center justify-center ${getButtonClass(transformingRatio === '9:16')}`}
                        >
                            {transformingRatio === '9:16' ? <LoadingSpinner /> : '9:16'}
                        </button>
                    </Tooltip>}
                </div>

                <div className="flex gap-1 shrink-0">
                    <Tooltip content={t('node.action.rasterEditor')}><button onClick={(e) => { e.stopPropagation(); onEditRaster(); }} disabled={!(char.thumbnails[char.selectedRatio] || char.image)} className="w-9 h-8 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded flex items-center justify-center disabled:opacity-50 transition-colors disabled:bg-gray-700 disabled:text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg></button></Tooltip>
                    <Tooltip content={t('node.action.openInAIEditor')}><button onClick={(e) => { e.stopPropagation(); onEditAI(); }} disabled={!char.image} className="w-9 h-8 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded flex items-center justify-center disabled:opacity-50 transition-colors disabled:bg-gray-700 disabled:text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg></button></Tooltip>
                </div>
            </div>
        </div>
    );
};