import React from 'react';
import { NodeType } from '../../../types';
import { ActionButton } from '../../ActionButton';
import { Tooltip } from '../../Tooltip';
import { CopyIcon } from '../../icons/AppIcons';
import { ImageInputMode } from './types';

interface ImageControlsSectionProps {
    showControls: boolean;
    isBatchMode?: boolean;
    setIsBatchMode?: (val: boolean) => void;
    t: (key: string) => string;
    onProcessImage: () => void;
    isProcessingImage: boolean;
    image: string | null;
    transformingRatio: string | null;
    onOpenInNode: (e: React.MouseEvent, type: NodeType) => void;
    onImageToText?: () => void;
    isAnalyzingImage?: boolean;
    onRatioExpand: (ratio: string) => void;
    onOpenRasterEditor: () => void;
    mode: ImageInputMode;
    metadataPrompt: string | null;
    onUseMetadataPrompt: () => void;
    deselectAllNodes?: () => void;
    prompt: string;
    onPromptChange: (val: string) => void;
}

export const ImageControlsSection: React.FC<ImageControlsSectionProps> = ({
    showControls,
    isBatchMode,
    setIsBatchMode,
    t,
    onProcessImage,
    isProcessingImage,
    image,
    transformingRatio,
    onOpenInNode,
    onImageToText,
    isAnalyzingImage,
    onRatioExpand,
    onOpenRasterEditor,
    mode,
    metadataPrompt,
    onUseMetadataPrompt,
    deselectAllNodes,
    prompt,
    onPromptChange,
}) => {
    return (
        <div 
            className={`flex-shrink-0 flex flex-col space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${
                showControls 
                    ? 'max-h-[300px] opacity-100 translate-y-0' 
                    : 'max-h-0 opacity-0 translate-y-8 pointer-events-none'
            }`}
        >
            {/* Batch API Synchronized Mode Toggle & Status Indicator */}
            <div 
                onClick={() => {
                    if (setIsBatchMode) {
                        setIsBatchMode(!isBatchMode);
                    }
                }}
                className={`p-2 rounded-md border cursor-pointer select-none transition-all ${
                    isBatchMode 
                        ? 'bg-gray-900 border-gray-700 text-gray-200' 
                        : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600 text-gray-300'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium">
                        <span className={`w-2 h-2 rounded-full ${isBatchMode ? 'bg-accent-secondary animate-pulse' : 'bg-gray-500'}`}></span>
                        <span>{t('batch.mode') || 'Batch API Mode'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-mono font-semibold">
                            -50% Cost
                        </span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${isBatchMode ? 'bg-accent-secondary' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 bottom-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${isBatchMode ? 'translate-x-[16px]' : 'translate-x-[2px]'}`}></div>
                    </div>
                </div>
                <div className={`mt-1.5 text-[11px] leading-tight flex items-start gap-1 transition-colors ${
                    isBatchMode ? 'text-accent-secondary font-medium' : 'text-gray-400'
                }`}>
                    <span className={isBatchMode ? '' : 'opacity-70'}>⏳</span>
                    <span>{t('batch.statusDelayed') || 'Batch API Active (Delayed ~24h, -50% cost)'}</span>
                </div>
            </div>
            
            {/* Top Controls Grid */}
            <div className="flex gap-2 shrink-0 h-[80px]">
                
                {/* LEFT COLUMN (Process + Small Tools) */}
                <div className="flex-[1.2] flex flex-col gap-2 min-w-0">
                    {/* Process Button */}
                    <Tooltip content={t('node.action.processImageTitle')} className="w-full">
                        <button
                            type="button"
                            onClick={onProcessImage}
                            disabled={isProcessingImage || !image || !!transformingRatio}
                            className="w-full h-9 px-3 text-sm font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 truncate flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg>
                            <span className="truncate">{isProcessingImage ? t('node.content.processing') : t('node.action.processImage')}</span>
                        </button>
                    </Tooltip>

                     {/* 4-Button Grid */}
                     <div className="grid grid-cols-4 gap-1 h-9">
                        {/* Analyzer Icon */}
                        <Tooltip content={t('node.action.openInAnalyzer')}>
                            <button
                                type="button"
                                onClick={(e) => onOpenInNode(e, NodeType.IMAGE_ANALYZER)}
                                disabled={!image}
                                className="w-full h-full flex items-center justify-center bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.792V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h7.55" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 18.375L21 21" />
                                </svg>
                            </button>
                        </Tooltip>
                        
                        {/* Image to Text Icon */}
                        <Tooltip content={t('node.content.imageToText')}>
                            <button
                                type="button"
                                onClick={() => onImageToText && onImageToText()}
                                disabled={!image || isAnalyzingImage || !onImageToText}
                                className="w-full h-full flex items-center justify-center bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {isAnalyzingImage ? (
                                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                )}
                            </button>
                        </Tooltip>

                        {/* 16:9 Button */}
                        <Tooltip content={t('node.action.expand169')}>
                            <button
                                type="button"
                                onClick={() => onRatioExpand('16:9')}
                                disabled={!image || isProcessingImage || !!transformingRatio}
                                className="w-full h-full px-1 text-[10px] font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1"
                            >
                                {transformingRatio === '16:9' ? <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hidden sm:block"><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
                                        <span>16:9</span>
                                    </>
                                )}
                            </button>
                        </Tooltip>
                        
                        {/* 9:16 Button */}
                        <Tooltip content={t('node.action.expand916')}>
                            <button
                                type="button"
                                onClick={() => onRatioExpand('9:16')}
                                disabled={!image || isProcessingImage || !!transformingRatio}
                                className="w-full h-full px-1 text-[10px] font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1"
                            >
                                {transformingRatio === '9:16' ? <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hidden sm:block"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
                                        <span>9:16</span>
                                    </>
                                )}
                            </button>
                        </Tooltip>
                     </div>
                </div>

                {/* RIGHT COLUMN (Editors) */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {/* Raster Editor */}
                    <Tooltip content={t('node.action.rasterEditor')} className="w-full">
                        <button
                            type="button"
                            onClick={onOpenRasterEditor}
                            disabled={!image}
                            className="w-full h-9 px-2 text-xs font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                            <span className="truncate">{t('node.action.rasterEditor')}</span>
                        </button>
                    </Tooltip>

                    {/* Open in AI Editor Button */}
                    <Tooltip content={mode === 'grid' ? "Открыть все ассеты сетки в AI Editor" : t('node.action.openInAIEditor')} className="w-full">
                        <button
                            type="button"
                            onClick={(e) => onOpenInNode(e, NodeType.IMAGE_EDITOR)}
                            disabled={!image}
                            className={`w-full h-9 px-2 text-xs font-bold text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-1.5 disabled:bg-gray-500 disabled:cursor-not-allowed ${
                                mode === 'grid' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-md ring-1 ring-cyan-400/50' : 'bg-accent hover:bg-accent-hover'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" />
                            </svg>
                            <span className="truncate">{mode === 'grid' ? 'В AI Editor (Сетка)' : t('node.action.openInAIEditor')}</span>
                        </button>
                    </Tooltip>
                </div>
            </div>

            {metadataPrompt && (
                <div className="flex-shrink-0 relative">
                     <div className="absolute top-0 right-0 z-10">
                        <button type="button" onClick={onUseMetadataPrompt} className="px-2 py-0.5 text-[10px] font-bold bg-accent hover:bg-accent-hover text-white rounded shadow-sm" title={t('node.action.copyPrompt')}>
                            Use
                        </button>
                     </div>
                    <textarea readOnly value={metadataPrompt} placeholder={t('node.content.metadataPromptPlaceholder')} className="w-full p-2 text-xs bg-input/50 rounded-md resize-none focus:outline-none text-gray-400 italic border border-gray-600/50" rows={2} onWheel={e => e.stopPropagation()} onFocus={deselectAllNodes} />
                </div>
            )}
            
            <div className="flex-grow min-h-0 flex flex-col relative">
                <textarea
                    value={prompt || ''}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder={t('node.content.prompt')}
                    className="w-full h-full p-2 bg-[#18202f] border border-gray-600 rounded-md resize-none focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none custom-scrollbar text-sm"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={deselectAllNodes}
                />
                 <div className="absolute bottom-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
                    <ActionButton title={t('node.action.copy')} onClick={() => navigator.clipboard.writeText(prompt || '')}>
                        <CopyIcon className="h-4 w-4" />
                    </ActionButton>
                 </div>
            </div>
        </div>
    );
};
