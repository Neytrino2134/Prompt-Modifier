import React, { useMemo, useEffect, useRef, useState } from 'react';
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
import { useLLMModelConfig } from '../../hooks/useLLMModelConfig';
import { DEFAULT_MULTIVIEW_PROMPT } from '../../services/gemini/constants';
import { generateThumbnail } from '../../utils/imageUtils';

export const PromptProcessorNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    onEnhance,
    isEnhancing,
    onProcessChainForward,
    isExecutingChain,
    t,
    onSelectNode,
    onSavePromptToLibrary,
    addToast,
    connectedInputs,
    getUpstreamNodeValues
}) => {
    const { language } = useLanguage();
    const { flashModel, proModel, flashLabel, proLabel } = useLLMModelConfig();
    const context = useAppContext();
    const { tutorialStep, tutorialTargetId, advanceTutorial, skipTutorial } = context || {};
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

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
                let model = parsed.model || 'flash';
                if (model === 'gemini-3-flash-preview' || model === 'gemini-3.6-flash') model = 'flash';
                if (model === 'gemini-3-pro-preview' || model === 'gemini-3.1-pro-preview') model = 'pro';

                let multiviewModel = parsed.multiviewModel || model || 'flash';
                if (multiviewModel === 'gemini-3-flash-preview' || multiviewModel === 'gemini-3.6-flash') multiviewModel = 'flash';
                if (multiviewModel === 'gemini-3-pro-preview' || multiviewModel === 'gemini-3.1-pro-preview') multiviewModel = 'pro';

                return {
                    activeTab: (parsed.activeTab === 'multiview' || parsed.mode === 'multiview') ? 'multiview' : 'standard',
                    // Standard Enhancer fields
                    inputPrompt: parsed.inputPrompt || '',
                    prompt: parsed.prompt || '',
                    safePrompt: parsed.safePrompt !== false,
                    technicalPrompt: parsed.technicalPrompt === true,
                    model,
                    // Multiview Generator fields
                    multiviewInputImage: parsed.multiviewInputImage || parsed.image || null,
                    multiviewPrompt: parsed.multiviewPrompt !== undefined ? parsed.multiviewPrompt : DEFAULT_MULTIVIEW_PROMPT,
                    multiviewOutput: parsed.multiviewOutput || (parsed.activeTab === 'multiview' ? parsed.prompt : '') || '',
                    multiviewModel
                };
            }
            return {
                activeTab: 'standard',
                inputPrompt: '',
                prompt: node.value || '',
                safePrompt: true,
                technicalPrompt: false,
                model: 'flash',
                multiviewInputImage: null,
                multiviewPrompt: DEFAULT_MULTIVIEW_PROMPT,
                multiviewOutput: '',
                multiviewModel: 'flash'
            };
        } catch (e) {
            return {
                activeTab: 'standard',
                inputPrompt: '',
                prompt: node.value || '',
                safePrompt: true,
                technicalPrompt: false,
                model: 'flash',
                multiviewInputImage: null,
                multiviewPrompt: DEFAULT_MULTIVIEW_PROMPT,
                multiviewOutput: '',
                multiviewModel: 'flash'
            };
        }
    }, [node.value]);

    const activeTab = parsedValue.activeTab;

    // Upstream text checks
    const isTextInputConnected = connectedInputs?.has(undefined) || connectedInputs?.has('text');
    const upstreamText = useMemo(() => {
        if (!isTextInputConnected) return '';
        const values = getUpstreamNodeValues(node.id, 'text');
        return values
            .filter(v => typeof v === 'string' && v.trim() !== '')
            .join(', ');
    }, [isTextInputConnected, getUpstreamNodeValues, node.id, node.value]);

    // Upstream image checks
    const isImageInputConnected = connectedInputs?.has('image');
    const upstreamImage = useMemo(() => {
        const values = getUpstreamNodeValues(node.id, 'image');
        const found = values.find(v => typeof v === 'object' && v !== null && 'base64ImageData' in v) as { base64ImageData: string; mimeType: string } | undefined;
        if (found) {
            return `data:${found.mimeType || 'image/png'};base64,${found.base64ImageData}`;
        }
        return null;
    }, [getUpstreamNodeValues, node.id, node.value, connectedInputs]);

    const effectiveMultiviewImage = upstreamImage || parsedValue.multiviewInputImage;

    const isFlash = activeTab === 'multiview'
        ? (parsedValue.multiviewModel === 'flash' || parsedValue.multiviewModel.includes('flash') || (!parsedValue.multiviewModel.includes('pro') && parsedValue.multiviewModel !== 'pro'))
        : (parsedValue.model === 'flash' || parsedValue.model.includes('flash') || (!parsedValue.model.includes('pro') && parsedValue.model !== 'pro'));

    const handleTabChange = (newTab: 'standard' | 'multiview') => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            activeTab: newTab
        }));
    };

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
        if (activeTab === 'multiview') {
            onValueChange(node.id, JSON.stringify({
                ...parsedValue,
                multiviewModel: model
            }));
        } else {
            onValueChange(node.id, JSON.stringify({
                ...parsedValue,
                model
            }));
        }
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

    const handleMultiviewPromptChange = (newPrompt: string) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            multiviewPrompt: newPrompt
        }));
    };

    const handleMultiviewOutputChange = (newOutput: string) => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            multiviewOutput: newOutput,
            prompt: newOutput
        }));
    };

    const handleResetMultiviewPrompt = () => {
        handleMultiviewPromptChange(DEFAULT_MULTIVIEW_PROMPT);
        if (addToast) addToast("Reset prompt to default 3D Turnaround Architect specification", "info");
    };

    const handlePasteImage = async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const dataUrl = e.target?.result as string;
                            if (dataUrl) {
                                try {
                                    const thumb = await generateThumbnail(dataUrl, 512, 512);
                                    onValueChange(node.id, JSON.stringify({
                                        ...parsedValue,
                                        multiviewInputImage: thumb
                                    }));
                                } catch {
                                    onValueChange(node.id, JSON.stringify({
                                        ...parsedValue,
                                        multiviewInputImage: dataUrl
                                    }));
                                }
                                if (addToast) addToast(t('toast.pastedFromClipboard'), "success");
                            }
                        };
                        reader.readAsDataURL(blob);
                        return;
                    }
                }
            }
            if (addToast) addToast("No image found on clipboard", "error");
        } catch {
            if (addToast) addToast("Could not read image from clipboard", "error");
        }
    };

    const handleClearLocalImage = () => {
        onValueChange(node.id, JSON.stringify({
            ...parsedValue,
            multiviewInputImage: null
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
                try {
                    const thumb = await generateThumbnail(dataUrl, 512, 512);
                    onValueChange(node.id, JSON.stringify({
                        ...parsedValue,
                        multiviewInputImage: thumb
                    }));
                } catch {
                    onValueChange(node.id, JSON.stringify({
                        ...parsedValue,
                        multiviewInputImage: dataUrl
                    }));
                }
                if (addToast) addToast("Image loaded successfully", "success");
            }
        };
        reader.readAsDataURL(file);
        if (e.target) e.target.value = '';
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target?.result as string;
                if (dataUrl) {
                    try {
                        const thumb = await generateThumbnail(dataUrl, 512, 512);
                        onValueChange(node.id, JSON.stringify({
                            ...parsedValue,
                            multiviewInputImage: thumb
                        }));
                    } catch {
                        onValueChange(node.id, JSON.stringify({
                            ...parsedValue,
                            multiviewInputImage: dataUrl
                        }));
                    }
                    if (addToast) addToast("Image dropped successfully", "success");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                if (activeTab === 'multiview') {
                    handleMultiviewPromptChange(text);
                } else {
                    const newValue = parsedValue.inputPrompt ? `${parsedValue.inputPrompt}, ${text}` : text;
                    handleInputChange(newValue);
                }
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
        const textToSave = activeTab === 'multiview' ? parsedValue.multiviewOutput : parsedValue.prompt;
        if (onSavePromptToLibrary && textToSave) {
            onSavePromptToLibrary(textToSave);
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const textToCopy = activeTab === 'multiview' ? parsedValue.multiviewOutput : parsedValue.prompt;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            if (addToast) addToast(t('toast.copiedToClipboard'));
        }
    };

    const handleCopyInputPrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        const textToCopy = activeTab === 'multiview' ? parsedValue.multiviewPrompt : parsedValue.inputPrompt;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            if (addToast) addToast(t('toast.copiedToClipboard'));
        }
    };

    return (
        <div className="flex flex-col h-full space-y-2 select-none">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* Mode Switcher Tabs */}
            <div className="flex bg-gray-900/80 p-1 rounded-lg border border-gray-800 space-x-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
                <button
                    onClick={() => handleTabChange('standard')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 ${
                        activeTab === 'standard'
                            ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-500/30'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <span>{language === 'ru' ? 'Улучшение промпта' : 'Prompt Enhancer'}</span>
                </button>
                <button
                    onClick={() => handleTabChange('multiview')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 ${
                        activeTab === 'multiview'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/30'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                    <span>{language === 'ru' ? 'Multiview Prompt Generator' : 'Multiview Prompt Generator'}</span>
                </button>
            </div>

            {/* TAB 1: STANDARD PROMPT ENHANCER */}
            {activeTab === 'standard' && (
                <>
                    {/* Input Section */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-1">
                                {isTextInputConnected && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                )}
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                    {isTextInputConnected ? t('node.content.connectedNode') : (language === 'ru' ? 'Входные промпты' : 'Input Prompts')}
                                </label>
                            </div>

                            {!isTextInputConnected && (
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
                            value={isTextInputConnected ? upstreamText : parsedValue.inputPrompt}
                            onDebouncedChange={handleInputChange}
                            placeholder={t('node.content.editPromptPlaceholder')}
                            className={`w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-accent focus:outline-none text-xs ${isTextInputConnected ? 'text-gray-400 cursor-default' : 'text-white'}`}
                            onWheel={e => e.stopPropagation()}
                            onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                            readOnly={isTextInputConnected}
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
                            className="w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-accent focus:outline-none text-xs"
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
                </>
            )}

            {/* TAB 2: MULTIVIEW PROMPT GENERATOR (3-PART LAYOUT) */}
            {activeTab === 'multiview' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Top Part: Input Image Preview & Controls (Expands when node is enlarged) */}
                    <div
                        className={`relative rounded-lg border bg-gray-950/70 p-2 flex flex-col transition-all flex-1 min-h-0 ${
                            isDraggingOver ? 'border-purple-500 bg-purple-950/30' : 'border-gray-800'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={handleFileDrop}
                        onMouseDown={e => { e.stopPropagation(); onSelectNode(); }}
                    >
                        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                            <div className="flex items-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                                    {language === 'ru' ? 'Входное изображение (<Image 1>)' : 'Input Image (<Image 1>)'}
                                </label>
                                {isImageInputConnected && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 font-medium">
                                        Connected
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-1">
                                {!isImageInputConnected && (
                                    <>
                                        <ActionButton title="Paste image from clipboard" onClick={handlePasteImage}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </ActionButton>
                                        <ActionButton title="Upload image file" onClick={() => fileInputRef.current?.click()}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </ActionButton>
                                    </>
                                )}
                                {effectiveMultiviewImage && !isImageInputConnected && (
                                    <ActionButton title="Clear Image" onClick={handleClearLocalImage}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </ActionButton>
                                )}
                            </div>
                        </div>

                        {effectiveMultiviewImage ? (
                            <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded bg-black/40 border border-gray-800/80 group min-h-0">
                                <img
                                    src={effectiveMultiviewImage}
                                    alt="Multiview Input 3D Source"
                                    className="max-h-full max-w-full object-contain drop-shadow"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(effectiveMultiviewImage);
                                                const blob = await res.blob();
                                                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                                                if (addToast) addToast(t('toast.copiedToClipboard'));
                                            } catch {
                                                if (addToast) addToast("Failed to copy image", "error");
                                            }
                                        }}
                                        className="p-1.5 rounded-full bg-gray-800 text-white hover:bg-gray-700 shadow"
                                        title="Copy Image to Clipboard"
                                    >
                                        <CopyIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-700 hover:border-purple-500 rounded bg-gray-900/30 hover:bg-purple-950/20 cursor-pointer transition-colors p-2 text-center min-h-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {language === 'ru' ? 'Вставьте изображение (Ctrl+V), перетащите файл или подключите узел' : 'Paste image (Ctrl+V), drop file or connect node'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Part: Split into 2 Columns (Left: Input Prompt, Right: Output Prompt) - Fixed height */}
                    <div className="h-44 flex-shrink-0 grid grid-cols-2 gap-2 min-h-0">
                        {/* Left: Input Prompt (Prefilled with Turnaround Architect Specification) */}
                        <div className="flex flex-col min-h-0 relative bg-gray-950/40 rounded-lg border border-gray-800 p-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                                    {language === 'ru' ? 'Входной промпт (Архитектор)' : 'Input Prompt (Architect)'}
                                </label>
                                <div className="flex items-center space-x-1">
                                    <ActionButton title="Reset to default architect prompt" onClick={handleResetMultiviewPrompt}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </ActionButton>
                                    <ActionButton title={t('node.action.paste')} onClick={handlePaste}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </ActionButton>
                                    <ActionButton title={t('node.action.copy')} onClick={handleCopyInputPrompt}>
                                        <CopyIcon className="h-3.5 w-3.5" />
                                    </ActionButton>
                                </div>
                            </div>
                            <DebouncedTextarea
                                value={parsedValue.multiviewPrompt}
                                onDebouncedChange={handleMultiviewPromptChange}
                                placeholder="Architect instructions for 3D turnaround..."
                                className="w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none text-[11px] leading-relaxed text-gray-200"
                                onWheel={e => e.stopPropagation()}
                                onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                            />
                        </div>

                        {/* Right: Output Turnaround Prompt Result */}
                        <div className="flex flex-col min-h-0 relative bg-gray-950/40 rounded-lg border border-purple-900/30 p-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-tighter truncate">
                                    {language === 'ru' ? 'Полученный ответ (Мультивью)' : 'Generated Turnaround Prompt'}
                                </label>
                                <div className="flex items-center space-x-1">
                                    <ActionButton title={t('node.action.copy')} onClick={handleCopy} disabled={!parsedValue.multiviewOutput}>
                                        <CopyIcon className="h-3.5 w-3.5 text-purple-300" />
                                    </ActionButton>
                                    <ActionButton title={t('catalog.saveTo')} onClick={handleSave} disabled={!parsedValue.multiviewOutput}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
                                        </svg>
                                    </ActionButton>
                                </div>
                            </div>
                            <DebouncedTextarea
                                value={parsedValue.multiviewOutput}
                                onDebouncedChange={handleMultiviewOutputChange}
                                placeholder={language === 'ru' ? 'Здесь появится сгенерированный промпт для 4-ракурсного листа...' : 'The generated 4-view turnaround prompt will appear here...'}
                                className="w-full h-full p-2 bg-input border-none rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none text-[11px] leading-relaxed text-white"
                                onWheel={e => e.stopPropagation()}
                                onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Action Bar */}
            <div className="flex space-x-2 h-10 flex-shrink-0" onMouseDown={e => { e.stopPropagation(); onSelectNode(); }}>
                <div className="flex bg-gray-700 rounded-md p-1 space-x-1 h-10 flex-shrink-0 w-28">
                    <Tooltip content={`Flash (${flashLabel || flashModel})`} className="h-full flex-1">
                        <button
                            onClick={() => handleModelChange('flash')}
                            disabled={isEnhancing || isExecutingChain}
                            className={`flex-1 rounded text-[10px] font-bold transition-colors h-full ${
                                isFlash ? (activeTab === 'multiview' ? 'bg-purple-600 text-white shadow' : 'bg-accent text-white shadow') : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Flash
                        </button>
                    </Tooltip>
                    <Tooltip content={`Pro (${proLabel || proModel})`} className="h-full flex-1">
                        <button
                            onClick={() => handleModelChange('pro')}
                            disabled={isEnhancing || isExecutingChain}
                            className={`flex-1 rounded text-[10px] font-bold transition-colors h-full ${
                                !isFlash ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                            }`}
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
                        content={activeTab === 'multiview' ? (language === 'ru' ? 'Анализирует изображение и генерирует промпт для 4 ракурсов' : 'Analyze image and generate 4-view turnaround prompt') : t('node.promptProcessor.enhanceTooltip')}
                        position="top"
                        className="w-full h-full"
                        usePortal={false}
                    >
                        <button
                            onClick={handleEnhanceClick}
                            disabled={isEnhancing || isExecutingChain}
                            className={`w-full h-full px-4 font-bold text-white rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow flex items-center justify-center space-x-2 ${
                                activeTab === 'multiview'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                                    : 'bg-accent hover:bg-accent-hover'
                            }`}
                        >
                            {isEnhancing ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{activeTab === 'multiview' ? (language === 'ru' ? 'Анализ и генерация...' : 'Generating Multiview Prompt...') : t('node.content.enhancing')}</span>
                                </>
                            ) : (
                                <>
                                    {activeTab === 'multiview' ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                            <span>{language === 'ru' ? 'Сгенерировать мультивью промпт' : 'Generate Multiview Prompt'}</span>
                                        </>
                                    ) : (
                                        <span>{t('node.content.enhancePrompt')}</span>
                                    )}
                                </>
                            )}
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
