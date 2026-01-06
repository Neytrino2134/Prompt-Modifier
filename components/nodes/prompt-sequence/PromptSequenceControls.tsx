
import React from 'react';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { useLanguage, languages } from '../../../localization';

interface PromptSequenceControlsProps {
    instruction: string;
    onInstructionChange: (val: string) => void;
    targetLanguage: string;
    onLanguageChange: (lang: string) => void;
    modificationModel: string;
    onModelChange: (model: string) => void;
    includeVideoPrompts: boolean;
    onToggleVideoPrompts: () => void;
    isModifying: boolean;
    onModify: () => void;
    checkedCount: number;
    totalPrompts: number;
    instructionInputId?: string;
    t: (key: string, options?: any) => string;
}

export const PromptSequenceControls: React.FC<PromptSequenceControlsProps> = ({
    instruction,
    onInstructionChange,
    targetLanguage,
    onLanguageChange,
    modificationModel,
    onModelChange,
    includeVideoPrompts,
    onToggleVideoPrompts,
    isModifying,
    onModify,
    checkedCount,
    totalPrompts,
    instructionInputId,
    t
}) => {
    const { secondaryLanguage } = useLanguage();

    return (
        <div className="flex-shrink-0 space-y-2">
            <DebouncedTextarea 
                id={instructionInputId}
                value={instruction} 
                onDebouncedChange={onInstructionChange} 
                placeholder={t('prompt_sequence_editor.instructionPlaceholder')}
                className="w-full p-2 bg-gray-700 border-none rounded-md resize-y focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                rows={2}
                style={{ minHeight: '80px', maxHeight: '200px' }}
                onWheel={(e) => e.stopPropagation()}
            />
            
            <div className="flex items-center space-x-2 h-10">
                {/* Language Group */}
                <div className="flex bg-gray-900 rounded-md p-1 shrink-0 h-10 items-center border border-gray-700">
                    {/* Dynamic Secondary Language (RU/ES etc) */}
                    <button
                        onClick={() => onLanguageChange(secondaryLanguage)}
                        className={`h-full px-3 rounded text-xs font-bold transition-colors flex items-center ${targetLanguage === secondaryLanguage ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title={languages[secondaryLanguage].name}
                    >
                        {languages[secondaryLanguage].short}
                    </button>
                    {/* EN */}
                    <button
                        onClick={() => onLanguageChange('en')}
                        className={`h-full px-3 rounded text-xs font-bold transition-colors flex items-center ${targetLanguage === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        EN
                    </button>
                </div>
                {/* Model Group */}
                <div className="flex bg-gray-900 rounded-md p-1 shrink-0 h-10 items-center border border-gray-700">
                    <button
                        onClick={() => onModelChange('gemini-3-flash-preview')}
                        className={`h-full px-3 rounded text-xs font-bold transition-colors flex items-center ${modificationModel === 'gemini-3-flash-preview' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Gemini 3.0 Flash"
                    >
                        Flash
                    </button>
                    <button
                        onClick={() => onModelChange('gemini-3-pro-preview')}
                        className={`h-full px-3 rounded text-xs font-bold transition-colors flex items-center ${modificationModel === 'gemini-3-pro-preview' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Gemini 3.0 Pro"
                    >
                        Pro
                    </button>
                </div>
                 
                 <button
                    onClick={onToggleVideoPrompts}
                    className={`h-10 w-10 rounded-md transition-colors flex items-center justify-center border border-gray-700 ${includeVideoPrompts ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    title="Generate/Modify Video Prompts"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>

                <button 
                    onClick={onModify}
                    disabled={isModifying || totalPrompts === 0 || checkedCount === 0}
                    className="flex-grow h-10 px-4 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isModifying ? t('prompt_sequence_editor.modifying') : t('prompt_sequence_editor.modifySelected', { count: checkedCount })}
                </button>
            </div>
         </div>
    );
};
