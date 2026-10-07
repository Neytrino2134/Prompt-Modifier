
import React from 'react';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { useLanguage, languages } from '../../../localization';
import { Tooltip } from '../../Tooltip';
import { useLLMModelConfig } from '../../../hooks/useLLMModelConfig';

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
    activeTab?: string;
    onModeChange?: (mode: 'sequence' | 'multiview') => void;
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
    activeTab = 'sequence',
    onModeChange,
    t
}) => {
    const { language, secondaryLanguage } = useLanguage();
    const { flashModel, proModel, flashLabel, proLabel } = useLLMModelConfig();

    const isFlash = modificationModel === 'flash' || modificationModel.includes('flash') || (!modificationModel.includes('pro') && modificationModel !== 'pro');

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
                    <Tooltip content={`Flash (${flashLabel || flashModel})`}>
                        <button
                            onClick={() => onModelChange('flash')}
                            className={`h-10 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center ${isFlash ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            Flash
                        </button>
                    </Tooltip>

                    <Tooltip content={`Pro (${proLabel || proModel})`}>
                        <button
                            onClick={() => onModelChange('pro')}
                            className={`h-10 px-3 rounded-md text-xs font-bold transition-colors flex items-center justify-center ${!isFlash ? 'bg-accent text-white' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700'}`}
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

                {/* Mode Switcher Tabs under Language & Model selection */}
                {onModeChange && (
                    <div className="flex bg-gray-900/90 p-1 rounded-lg border border-gray-800 space-x-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
                        <button
                            onClick={() => onModeChange('sequence')}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 ${
                                activeTab !== 'multiview'
                                    ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-500/30'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            <span>{language === 'ru' ? 'Редактор сценария' : 'Script Sequence Modifier'}</span>
                        </button>
                        <button
                            onClick={() => onModeChange('multiview')}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 ${
                                activeTab === 'multiview'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/30'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                            </svg>
                            <span>Multiview Prompt Generator</span>
                        </button>
                    </div>
                )}
            </div>
         </div>
    );
};
