
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { languages, LanguageCode } from '../../localization';
import CustomSelect from '../CustomSelect';

export const TranslatorNode: React.FC<NodeContentProps> = ({ node, onValueChange, onTranslate, isTranslating, connectedInputs, t, onSelectNode }) => {
    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { inputText: '', targetLanguage: 'ru', translatedText: '' };
        }
    }, [node.value]);

    const { inputText = '', targetLanguage = 'ru', translatedText = '' } = parsedValue;
    const isInputConnected = connectedInputs?.has(undefined);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        delete (newValue as any).inputHeight; // Clean up old property
        onValueChange(node.id, JSON.stringify(newValue));
    };

    const languageList = Object.entries(languages) as [LanguageCode, { name: string }][];

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-2 flex items-end space-x-2" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                <div className="flex-grow">
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
                <button
                    onClick={() => onTranslate(node.id)}
                    disabled={isTranslating || (!isInputConnected && !inputText.trim())}
                    className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                >
                    {isTranslating ? t('node.content.translating') : t('node.content.translate')}
                </button>
            </div>

            <div className="flex-1 min-h-0 mb-2">
                <textarea
                    value={inputText}
                    onChange={(e) => handleValueUpdate({ inputText: e.target.value })}
                    placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('node.content.translatePlaceholder')}
                    className="w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    disabled={isInputConnected || isTranslating}
                />
            </div>

            <div className="flex-1 min-h-0">
                <textarea
                    value={translatedText}
                    onChange={(e) => handleValueUpdate({ translatedText: e.target.value })}
                    placeholder={t('node.content.translatedTextPlaceholder')}
                    className="w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                />
            </div>
        </div>
    );
};
