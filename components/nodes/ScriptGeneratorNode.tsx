
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { languages, LanguageCode } from '../../localization';

export const ScriptGeneratorNode: React.FC<NodeContentProps> = ({ node, onValueChange, connectedInputs, isGeneratingScript, onGenerateScript, t, deselectAllNodes }) => {
    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { type: 'script-generator-data', prompt: '', summary: '', detailedCharacters: [], scenes: [], targetLanguage: 'en' };
        }
    }, [node.value]);

    const { prompt = '', summary = '', detailedCharacters = [], scenes = [], targetLanguage = 'en' } = parsedValue;
    const isInputConnected = connectedInputs?.has(undefined);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, type: 'script-generator-data', ...updates }));
    };

    const languageList = Object.entries(languages) as [LanguageCode, { name: string }][];

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-2 mb-2">
                <textarea
                    value={prompt}
                    onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                    placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('node.content.scriptPromptPlaceholder')}
                    className="w-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={isInputConnected}
                    rows={3}
                    onFocus={deselectAllNodes}
                />
                <div className="flex items-end space-x-2">
                    <div className="flex-grow">
                        <label htmlFor={`lang-select-${node.id}`} className="block text-xs font-medium text-gray-400 mb-1">{t('node.content.targetLanguage')}</label>
                        <select
                            id={`lang-select-${node.id}`}
                            value={targetLanguage}
                            onChange={(e) => handleValueUpdate({ targetLanguage: e.target.value })}
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={isGeneratingScript}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                        >
                            {languageList.map(([code, { name }]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => onGenerateScript(node.id)}
                        disabled={isGeneratingScript || (!isInputConnected && !prompt.trim())}
                        className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {isGeneratingScript ? t('node.content.generating') : t('node.content.generateScript')}
                    </button>
                </div>
            </div>
            <div className="flex-grow min-h-0 overflow-y-auto space-y-4 pr-2" onWheel={e => e.stopPropagation()}>
                {summary && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <h3 className="font-bold text-cyan-400 mb-1">Summary</h3>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{summary}</p>
                    </div>
                )}
                {detailedCharacters.length > 0 && detailedCharacters.map((char: { name: string, fullDescription: string }, index: number) => (
                    <div key={`char-${index}`} className="bg-gray-700/50 p-3 rounded-lg">
                        <h3 className="font-bold text-cyan-400 mb-1">{char.name}</h3>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{char.fullDescription}</p>
                    </div>
                ))}
                {scenes.length > 0 && scenes.map((scene: { sceneNumber: number, description: string }, index: number) => (
                    <div key={`scene-${index}`} className="bg-gray-700/50 p-3 rounded-lg">
                        <h3 className="font-bold text-cyan-400 mb-1">Scene {scene.sceneNumber}</h3>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{scene.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};