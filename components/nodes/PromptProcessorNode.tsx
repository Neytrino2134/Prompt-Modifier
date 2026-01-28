


import React, { useMemo, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import { DebouncedTextarea } from '../DebouncedTextarea';
import { CopyIcon } from '../../components/icons/AppIcons';
import { useAppContext } from '../../contexts/AppContext';
import { TutorialTooltip } from '../TutorialTooltip';
import { Tooltip } from '../Tooltip';
import { getRandomWord } from '../../utils/wordBank';
import { useLanguage } from '../../localization';
import { CustomCheckbox } from '../CustomCheckbox';

export const PromptProcessorNode: React.FC<NodeContentProps> = ({ node, onValueChange, onEnhance, isEnhancing, onProcessChainForward, isExecutingChain, t, onSelectNode, onSavePromptToLibrary, addToast, connectedInputs, getUpstreamNodeValues }) => {
    const { language } = useLanguage();
    const context = useAppContext();
    const { tutorialStep, tutorialTargetId, advanceTutorial, skipTutorial } = context || {};

    const isTutorialActive = tutorialTargetId === node.id && tutorialStep === 'prompt_processor_enhance';
    const isTutorialWaiting = tutorialTargetId === node.id && tutorialStep === 'prompt_processor_waiting';

    const handleEnhanceClick = () => {
        onEnhance(node.id);
        if (isTutorialActive && advanceTutorial) {
            advanceTutorial();
        }
    };

    useEffect(() => {
        if (isTutorialWaiting && !isEnhancing && advanceTutorial) {
            advanceTutorial();
        }
    }, [isEnhancing, isTutorialWaiting, advanceTutorial]);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            if (typeof parsed === 'object' && parsed !== null) {
                return { 
                    inputPrompt: parsed.inputPrompt || '',
                    prompt: parsed.prompt || '', 
                    safePrompt: parsed.safePrompt !== false,
                    technicalPrompt: parsed.technicalPrompt === true,
                    model: parsed.model || 'gemini-3-flash-preview'
                };
            }
            return { inputPrompt: '', prompt: node.value, safePrompt: true, technicalPrompt: false, model: 'gemini-3-flash-preview' };
        } catch (e) {
            return { inputPrompt: '', prompt: node.value, safePrompt: true, technicalPrompt: false, model: 'gemini-3-flash-preview' };
        }
    }, [node.value]);

    const isInputConnected = connectedInputs?.has(undefined);
    
    const upstreamText = useMemo(() => {
        if (!isInputConnected) return '';
        const values = getUpstreamNodeValues(node.id);
        return values
            .filter(v => typeof v === 'string' && v.trim() !== '')
            .join(', ');
    }, [isInputConnected, getUpstreamNodeValues, node.id, node.value]);

    const handleCheckboxChange = (checked: boolean) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            safePrompt: checked
        }));
    };

    const handleTechnicalCheckboxChange = (checked: boolean) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            technicalPrompt: checked
        }));
    };
    
    const handleModelChange = (model: string) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            model
        }));
    };

    const handleInputChange = (newInput: string) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            inputPrompt: newInput
        }));
    };

    const handleOutputChange = (newOutput: string) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            prompt: newOutput
        }));
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                const newValue = parsedValue.inputPrompt ? `${parsedValue.inputPrompt}, ${text}` : text;
                handleInputChange(newValue);
                if (addToast) addToast(t('toast.pastedFromClipboard'));
            }
        } catch (err) {
            if (addToast) addToast(t('toast.pasteFailed'), 'error');
        }
    };

    const handleRandomWord = () => {
        const word = getRandomWord(language);
        const newValue = parsedValue.inputPrompt ? `${parsedValue.inputPrompt}, ${word}` : word;
        handleInputChange(newValue);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSavePromptToLibrary && parsedValue.prompt) {
            onSavePromptToLibrary(parsedValue.prompt);
        }
    };
    
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (parsedValue.prompt) {
            navigator.clipboard.writeText(parsedValue.prompt);
            if (addToast) addToast(t('toast.copiedToClipboard'));
        }
    };
    
    return (
        <div className="flex flex-col h-full space-y-2">
            {/* Input Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                        {isInputConnected && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        )}
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            {isInputConnected ? t('node.content.connectedNode') : 'Входные промпты'}
                        </label>
                    </div>
                    
                    {!isInputConnected && (
                        <div className="flex items-center space-x-1">
                            <ActionButton title={t('node.action.randomWord')} onClick={handleRandomWord}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.paste')} onClick={handlePaste}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </ActionButton>
                        </div>
                    )}
                </div>
                <DebouncedTextarea
                    value={isInputConnected ? upstreamText : parsedValue.inputPrompt}
                    onDebouncedChange={handleInputChange}
                    placeholder={t('node.content.editPromptPlaceholder')}
                    className={`w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-accent focus:outline-none ${isInputConnected ? 'text-gray-400 cursor-default' : 'text-white'}`}
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    readOnly={isInputConnected}
                />
            </div>

            {/* Output Section */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t('node.content.enhancedResult')}
                    </label>
                    <div className="flex items-center space-x-1">
                        <ActionButton title={t('node.action.copy')} onClick={handleCopy} disabled={!parsedValue.prompt}>
                             <CopyIcon className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton title={t('catalog.saveTo')} onClick={handleSave} disabled={!parsedValue.prompt}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
                            </svg>
                        </ActionButton>
                    </div>
                </div>
                <DebouncedTextarea
                    value={parsedValue.prompt}
                    onDebouncedChange={handleOutputChange}
                    placeholder={t('node.content.enhancedPromptHere')}
                    className="w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-accent focus:outline-none"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                />
            </div>

            <div className="flex flex-col gap-1 pt-1 items-start" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                <Tooltip 
                    content={t('node.promptProcessor.safePromptTooltip')} 
                    position="top" 
                    align="start"
                    usePortal={false}
                >
                    <CustomCheckbox
                        checked={parsedValue.safePrompt}
                        onChange={handleCheckboxChange}
                        disabled={isEnhancing || isExecutingChain}
                        label={t('node.content.safePrompt')}
                    />
                </Tooltip>
                
                <Tooltip 
                    content={t('node.promptProcessor.technicalPromptTooltip')} 
                    position="top" 
                    align="start"
                    usePortal={false}
                >
                    <CustomCheckbox
                        checked={parsedValue.technicalPrompt}
                        onChange={handleTechnicalCheckboxChange}
                        disabled={isEnhancing || isExecutingChain}
                        label={t('node.content.technicalPrompt')}
                    />
                </Tooltip>
            </div>
            
            <div className="flex space-x-2 h-10">
                <div className="flex bg-gray-700 rounded-md p-1 space-x-1 h-10 flex-shrink-0 w-24">
                     <Tooltip content="Gemini 3.0 Flash" className="h-full flex-1">
                         <button
                             onClick={() => handleModelChange('gemini-3-flash-preview')}
                             disabled={isEnhancing || isExecutingChain}
                             className={`flex-1 rounded text-[10px] font-bold transition-colors h-full ${parsedValue.model === 'gemini-3-flash-preview' ? 'bg-accent text-white shadow' : 'text-gray-400 hover:text-white'}`}
                         >
                             Flash
                         </button>
                     </Tooltip>
                     <Tooltip content="Gemini 3.0 Pro" className="h-full flex-1">
                         <button
                             onClick={() => handleModelChange('gemini-3-pro-preview')}
                             disabled={isEnhancing || isExecutingChain}
                             className={`flex-1 rounded text-[10px] font-bold transition-colors h-full ${parsedValue.model === 'gemini-3-pro-preview' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                         >
                             Pro
                         </button>
                     </Tooltip>
                </div>
                
                <TutorialTooltip 
                    content={isTutorialWaiting ? t('tutorial.step2_waiting') : t('tutorial.step2')} 
                    isActive={!!isTutorialActive || !!isTutorialWaiting} 
                    position="top"
                    pulseColor={isTutorialWaiting ? 'rgba(234, 179, 8, 0.8)' : undefined}
                    onSkip={skipTutorial}
                    className="flex-grow h-full"
                >
                    <Tooltip 
                        content={t('node.promptProcessor.enhanceTooltip')}
                        position="top"
                        className="w-full h-full"
                        usePortal={false}
                    >
                        <button
                            onClick={handleEnhanceClick}
                            disabled={isEnhancing || isExecutingChain}
                            className="w-full h-full px-4 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isEnhancing ? t('node.content.enhancing') : t('node.content.enhancePrompt')}
                        </button>
                    </Tooltip>
                </TutorialTooltip>
                
                <Tooltip 
                    content={t('node.promptProcessor.chainTooltip')}
                    position="top"
                    className="h-10 w-10 flex-shrink-0"
                    usePortal={false}
                >
                    <button
                        onClick={() => onProcessChainForward(node.id)}
                        disabled={isEnhancing || isExecutingChain}
                        className="h-10 w-10 flex items-center justify-center font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {isExecutingChain ? (
                             <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        )}
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};