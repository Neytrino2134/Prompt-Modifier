
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import { CustomCheckbox } from '../CustomCheckbox';
import { CopyIcon } from '../../components/icons/AppIcons';

export const PromptAnalyzerNode: React.FC<NodeContentProps> = ({ node, onValueChange, onAnalyze, isAnalyzing, onOutputHandleMouseDown, getHandleColor, handleCursor, t, deselectAllNodes, onSaveToLibrary }) => {
    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { environment: '', characters: [], action: '', emotion: '', style: '', softPrompt: false };
        }
    }, [node.value]);

    const { environment, characters = [], action, emotion, style, softPrompt = false } = parsedValue;
    const charactersToRenderCount = Math.max(1, characters.length);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
    };
    
    const handleCharacterChange = (index: number, value: string) => {
        const newCharacters = [...characters];
        newCharacters[index] = value;
        handleValueUpdate({ characters: newCharacters });
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handleId: string) => {
        e.stopPropagation();
        onOutputHandleMouseDown(e, node.id, handleId);
    };
    
    const renderSubPanel = (key: string, value: string, onChange: (value: string) => void, handleId: string, index?: number) => {
        const title = key.startsWith('character') ? `${t('node.content.character')} ${index! + 1}` : t(`node.content.${key}`);
        const placeholder = t(`node.content.${key}Placeholder`);
        
        const handleSave = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onSaveToLibrary && value) {
                onSaveToLibrary(value, "Analyzer Prompts");
            }
        };

        return (
            <div key={handleId} className="relative flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-400">{title}</label>
                    <div className="flex items-center space-x-1">
                        <ActionButton
                            tooltipPosition="left"
                            title={t('catalog.saveTo')}
                            onClick={handleSave}
                            disabled={!value}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
                            </svg>
                        </ActionButton>
                        <ActionButton
                            tooltipPosition="left"
                            title={t('node.action.copy')}
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value || ''); }}
                        >
                            <CopyIcon className="h-4 w-4" />
                        </ActionButton>
                    </div>
                </div>
                <div className="flex-grow min-h-0">
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-accent focus:outline-none"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                </div>
                <div 
                    onMouseDown={(e) => handleMouseDown(e, handleId)} 
                    style={{ cursor: handleCursor }} 
                    className={`absolute top-1/2 -right-2.5 w-5 h-5 rounded-full border-2 border-gray-900 transform -translate-y-1/2 ${getHandleColor('text', handleId)} group`}
                >
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {title}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Removed overflow-y-auto and overflow-x-hidden to disable internal scrolling */}
            <div className="flex-grow flex flex-col space-y-2 px-2">
                {renderSubPanel('environment', environment, (v) => handleValueUpdate({ environment: v }), 'environment')}
                {Array.from({ length: charactersToRenderCount }).map((_, i) =>
                    renderSubPanel('character', characters[i] || '', (v) => handleCharacterChange(i, v), `character-${i}`, i)
                )}
                {renderSubPanel('action', action, (v) => handleValueUpdate({ action: v }), 'action')}
                {renderSubPanel('emotion', emotion, (v) => handleValueUpdate({ emotion: v }), 'emotion')}
                {renderSubPanel('style', style, (v) => handleValueUpdate({ style: v }), 'style')}
            </div>
            <div className="flex items-center space-x-2 mt-2 px-2">
                <CustomCheckbox
                    id={`soft-prompt-toggle-${node.id}`}
                    checked={softPrompt}
                    onChange={(checked) => handleValueUpdate({ softPrompt: checked })}
                    disabled={isAnalyzing}
                    label="Мягкий промпт"
                />
            </div>
            <div className="px-2">
                <button
                    onClick={() => onAnalyze(node.id)}
                    disabled={isAnalyzing}
                    className="w-full px-4 py-2 mt-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                >
                    {isAnalyzing ? t('node.content.analyzing') : t('node.content.analyzePrompt')}
                </button>
            </div>
        </div>
    );
};
