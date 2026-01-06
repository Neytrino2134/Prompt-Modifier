
import React, { useMemo } from 'react';
import type { NodeContentProps } from '../../types';

export const CharacterAnalyzerNode: React.FC<NodeContentProps> = ({ node, onValueChange, onAnalyzeCharacter, isAnalyzingCharacter, t, onSelectNode }) => {
    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { character: '', clothing: '' };
        }
    }, [node.value]);

    const handleValueUpdate = (updates: Partial<typeof parsedValue>) => {
        onValueChange(node.id, JSON.stringify({ ...parsedValue, ...updates }));
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-rows-2 gap-2 flex-grow min-h-0">
                <div className="min-h-0">
                    <textarea
                        value={parsedValue.character || ''}
                        onChange={(e) => handleValueUpdate({ character: e.target.value })}
                        placeholder={t('node.content.characterPlaceholder')}
                        className="w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                        onKeyDown={(e) => e.stopPropagation()} 
                    />
                </div>
                <div className="min-h-0">
                    <textarea
                        value={parsedValue.clothing || ''}
                        onChange={(e) => handleValueUpdate({ clothing: e.target.value })}
                        placeholder={t('node.content.clothingPlaceholder')}
                        className="w-full h-full p-2 bg-gray-700 border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                        onKeyDown={(e) => e.stopPropagation()} 
                    />
                </div>
            </div>
            <button
                onClick={() => onAnalyzeCharacter(node.id)}
                disabled={isAnalyzingCharacter}
                className="w-full px-4 py-2 mt-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
            >
                {isAnalyzingCharacter ? t('node.content.analyzing') : t('node.content.analyzeCharacter')}
            </button>
        </div>
    );
};
