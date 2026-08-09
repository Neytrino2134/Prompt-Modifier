
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { languages, LanguageCode } from '../../localization';
import CustomSelect from '../CustomSelect';
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../../components/icons/AppIcons';
import { Tooltip } from '../Tooltip';

export const TranslatorNode: React.FC<NodeContentProps> = ({ node, onValueChange, onTranslate, isTranslating, connectedInputs, t, onSelectNode, onPasteImage, getFullSizeImage, setImageViewer }) => {
    const parsedValue = useMemo(() => {
        try {
            const val = JSON.parse(node.value || '{}');
            let model = val.model || 'gemini-3.6-flash';
            if (model === 'gemini-3-flash-preview') model = 'gemini-3.6-flash';
            if (model === 'gemini-3-pro-preview') model = 'gemini-3.1-pro-preview';
            return { ...val, model };
        } catch {
            return { inputText: '', targetLanguage: 'ru', translatedText: '', image: null, model: 'gemini-3.6-flash' };
        }
    }, [node.value]);

    const { inputText = '', targetLanguage = 'ru', translatedText = '', image = null, model = 'gemini-3.6-flash' } = parsedValue;
    const isInputConnected = connectedInputs?.has(undefined);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        delete (newValue as any).inputHeight; // Clean up old property
        onValueChange(node.id, JSON.stringify(newValue));
    };

    const handlePaste = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPasteImage(node.id);
    };

    const handleClearInput = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ inputText: '' });
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ image: null });
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (image) {
            setImageViewer({
                sources: [{ src: image, frameNumber: 0, prompt: 'Input Image' }],
                initialIndex: 0
            });
        }
    };

    const languageList = Object.entries(languages) as [LanguageCode, { name: string }][];

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-2 flex items-end space-x-2" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                <div className="flex-grow min-w-0">
                    <label htmlFor={`lang-select-${node.id}`} className="block text-xs font-medium text-gray-400 mb-1">
                        {t('node.content.targetLanguage')}
                    </label>
                    <CustomSelect
                        id={`lang-select-${node.id}`}
                        value={targetLanguage}
                        onChange={(value) => handleValueUpdate({ targetLanguage: value })}
                        disabled={isTranslating}
                        options={languageList.map(([code, { name }]) => ({ value: code, label: name }))}
                    />
                </div>
                
                <div className="flex bg-gray-800 rounded-md p-0.5 border border-gray-700 h-[38px] items-center space-x-0.5 flex-shrink-0">
                    <Tooltip content="Gemini 3.6 Flash" position="top">
                        <button
                            type="button"
                            onClick={() => handleValueUpdate({ model: 'gemini-3.6-flash' })}
                            disabled={isTranslating}
                            className={`px-2 h-full rounded text-[10px] font-bold transition-colors ${model === 'gemini-3.6-flash' ? 'bg-accent text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Flash
                        </button>
                    </Tooltip>
                    <Tooltip content="Gemini 3.1 Pro" position="top">
                        <button
                            type="button"
                            onClick={() => handleValueUpdate({ model: 'gemini-3.1-pro-preview' })}
                            disabled={isTranslating}
                            className={`px-2 h-full rounded text-[10px] font-bold transition-colors ${model === 'gemini-3.1-pro-preview' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Pro
                        </button>
                    </Tooltip>
                </div>

                <button 
                    onClick={handlePaste}
                    className="h-[38px] px-3 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors flex items-center justify-center shadow-sm flex-shrink-0"
                    title={t('node.action.paste')}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </button>

                <Tooltip content={`Model: ${model === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : 'Gemini 3.6 Flash'}`} position="top">
                    <button
                        onClick={() => onTranslate(node.id)}
                        disabled={isTranslating || (!isInputConnected && !inputText.trim() && !image)}
                        className="h-[38px] px-4 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0 shadow-sm"
                    >
                        {isTranslating ? t('node.content.translating') : t('node.content.translate')}
                    </button>
                </Tooltip>
            </div>

            <div className="flex-1 min-h-0 mb-2 flex flex-col gap-2">
                {image && (
                    <div className="relative h-24 w-full bg-gray-900/50 rounded-md border border-gray-600 flex-shrink-0 group overflow-hidden">
                        <img 
                            src={image} 
                            alt="Input" 
                            className="w-full h-full object-contain cursor-pointer" 
                            onClick={handleImageClick}
                        />
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <ActionButton title={t('node.action.clear')} onClick={handleClearImage}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </ActionButton>
                        </div>
                    </div>
                )}
                
                <div className="relative flex-grow h-full">
                    <textarea
                        value={inputText}
                        onChange={(e) => handleValueUpdate({ inputText: e.target.value })}
                        placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('node.content.translatePlaceholder')}
                        className="w-full h-full p-2 bg-input border border-gray-700/50 rounded-md resize-none focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                        // Input remains enabled during translation to allow edits or copy, only locked if connected
                        disabled={isInputConnected}
                    />
                    {!isInputConnected && inputText && (
                         <div className="absolute top-1 right-1 opacity-50 hover:opacity-100 transition-opacity">
                            <ActionButton title={t('node.action.clear')} onClick={handleClearInput}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </ActionButton>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                <textarea
                    value={translatedText}
                    onChange={(e) => handleValueUpdate({ translatedText: e.target.value })}
                    placeholder={t('node.content.translatedTextPlaceholder')}
                    className="w-full h-full p-2 bg-input border border-gray-700/50 rounded-md resize-none focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none custom-scrollbar"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                />
                 <div className="absolute top-1 right-1 opacity-50 hover:opacity-100 transition-opacity">
                    <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(translatedText); }}>
                        <CopyIcon className="h-4 w-4" />
                    </ActionButton>
                </div>
            </div>
        </div>
    );
};
