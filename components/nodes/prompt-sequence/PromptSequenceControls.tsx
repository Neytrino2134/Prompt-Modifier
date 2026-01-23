
import React from 'react';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { useLanguage, languages } from '../../../localization';
import { Tooltip } from '../../Tooltip';

interface PromptSequenceControlsProps {
    instruction: string;
    onInstructionChange: (val: string) => void;
    targetLanguage: string;
    onLanguageChange: (lang: string) => void;
    modificationModel: string;
    onModelChange: (model: string) => void;
    includeVideoPrompts: boolean;
    onToggleVideoPrompts: () => void;
    includeSceneContext: boolean; // Deprecated/Unused but kept in interface to avoid breaking callers immediately
    onToggleSceneContextOption: () => void; // Deprecated
    isModifying: boolean;
    onModify: () => void;
    checkedCount: number;
    checkedContextCount?: number; // Added
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
    checkedContextCount = 0,
    totalPrompts,
    instructionInputId,
    t
}) => {
    const { secondaryLanguage } = useLanguage();

    // Enable button if frames are selected OR context scenes are selected
    const isModifyDisabled = isModifying || totalPrompts === 0 || (checkedCount === 0 && checkedContextCount === 0);

    return (
        <div className="flex-shrink-0 space-y-2">
            <DebouncedTextarea 
                id={instructionInputId}
                value={instruction} 
                onDebouncedChange={onInstructionChange} 
                placeholder={t('prompt_sequence_editor.instructionPlaceholder')}
                className="w-full p-2 bg-gray-700 border-none rounded-md resize-y focus:ring-2 focus:ring-accent focus:outline-none"
                rows={2}
                style={{ minHeight: '80px', maxHeight: '200px' }}
                onWheel={(e) => e.stopPropagation()}
            />
            
            <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 h-10">
                    {/* Language Buttons - Swapped Order */}
                    <Tooltip content="English Language">
                        <button
                            onClick={() => onLanguageChange('en')}
                            className={`h-10 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center ${targetLanguage === 'en' ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            EN
                        </button>
                    </Tooltip>

                    <Tooltip content={languages[secondaryLanguage]?.name || secondaryLanguage.toUpperCase()}>
                        <button
                            onClick={() => onLanguageChange(secondaryLanguage)}
                            className={`h-10 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center ${targetLanguage === secondaryLanguage ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            title={languages[secondaryLanguage].name}
                        >
                            {languages[secondaryLanguage].short}
                        </button>
                    </Tooltip>
                    
                    {/* Model Buttons */}
                    <Tooltip content="Gemini 3.0 Flash (Fast & Efficient)">
                        <button
                            onClick={() => onModelChange('gemini-3-flash-preview')}
                            className={`h-10 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center ${modificationModel === 'gemini-3-flash-preview' ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            Flash
                        </button>
                    </Tooltip>

                    <Tooltip content="Gemini 3.0 Pro (High Reasoning)">
                        <button
                            onClick={() => onModelChange('gemini-3-pro-preview')}
                            className={`h-10 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center ${modificationModel === 'gemini-3-pro-preview' ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            Pro
                        </button>
                    </Tooltip>
                    
                    <Tooltip content={t('node.action.copyVideoPrompt') + " / Generate"}>
                        <button
                            onClick={onToggleVideoPrompts}
                            className={`h-10 w-10 rounded-md transition-colors flex items-center justify-center ${includeVideoPrompts ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            title="Generate/Modify Video Prompts"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </Tooltip>

                    <Tooltip content={t('prompt_sequence_editor.modifySelected', { count: checkedCount })}>
                        <button 
                            onClick={onModify}
                            disabled={isModifyDisabled}
                            className="flex-grow h-10 px-4 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isModifying ? t('prompt_sequence_editor.modifying') : t('prompt_sequence_editor.modifySelected', { count: checkedCount })}
                        </button>
                    </Tooltip>
                </div>
            </div>
         </div>
    );
};
