
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { NodeContentProps } from '../../types';
import { ActionButton } from '../ActionButton';
import CustomSelect from '../CustomSelect';
import { translateText } from '../../services/geminiService';
import { useLanguage, languages } from '../../localization';

// --- Stylish Number Input Component ---
const InputWithSpinners: React.FC<{
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    label?: string;
}> = ({ value, onChange, min = 1, max = 10, label }) => {
    
    const handleStep = (step: number) => {
        let nextVal = value + step;
        if (min !== undefined && nextVal < min) nextVal = min;
        if (max !== undefined && nextVal > max) nextVal = max;
        onChange(nextVal);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        if (min !== undefined && val < min) return; 
        if (max !== undefined && val > max) return;
        onChange(val);
    };

    return (
        <div>
            {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
            <div className="relative flex items-center bg-gray-700 rounded-md border border-gray-600 h-[38px] overflow-hidden group hover:border-gray-500 transition-colors">
                <input
                    type="number"
                    value={value}
                    onChange={handleChange}
                    className="appearance-none w-full h-full bg-transparent text-sm text-white text-center focus:outline-none px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                    onMouseDown={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                />
                <div className="flex flex-col h-full border-l border-gray-600 w-5 flex-shrink-0 bg-gray-800">
                    <button 
                        className="h-1/2 flex items-center justify-center hover:bg-cyan-600 text-gray-400 hover:text-white transition-colors active:bg-cyan-700"
                        onClick={(e) => { e.stopPropagation(); handleStep(1); }}
                    >
                        <svg width="8" height="4" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0L8 4H0L4 0Z" fill="currentColor"/></svg>
                    </button>
                    <button 
                        className="h-1/2 flex items-center justify-center hover:bg-cyan-600 text-gray-400 hover:text-white transition-colors border-t border-gray-600 active:bg-cyan-700"
                        onClick={(e) => { e.stopPropagation(); handleStep(-1); }}
                    >
                        <svg width="8" height="4" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L0 0H8L4 4Z" fill="currentColor"/></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditableCharacterDescription: React.FC<{
    fullDescription: string;
    onDescriptionChange: (newDescription: string) => void;
    t: (key: string) => string;
    onFocus?: () => void;
}> = ({ fullDescription, onDescriptionChange, t, onFocus }) => {
    const [sections, setSections] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const parsed: { [key: string]: string } = { 'Appearance': '', 'Personality': '', 'Clothing': '' };
        // Use lowercase keys for mapping to handle potential case differences from AI or Regex
        const keyMap: { [key: string]: 'Appearance' | 'Personality' | 'Clothing' } = {
            'внешность': 'Appearance',
            'личность': 'Personality',
            'характер': 'Personality',
            'одежда': 'Clothing',
            'apariencia': 'Appearance',
            'personalidad': 'Personality',
            'ropa': 'Clothing',
            'appearance': 'Appearance',
            'personality': 'Personality',
            'clothing': 'Clothing'
        };
        const sectionRegex = /####\s*(Appearance|Personality|Clothing|Внешность|Личность|Характер|Одежда|Apariencia|Personalidad|Ropa)\s*([\s\S]*?)(?=####|$)/gi;
    
        let match;
        let foundMatch = false;
        while ((match = sectionRegex.exec(fullDescription)) !== null) {
            foundMatch = true;
            const header = match[1].trim().toLowerCase(); // Normalize
            const key = keyMap[header];
            const value = match[2].trim();
            if (key) {
                parsed[key] = value;
            }
        }

        if (!foundMatch && fullDescription.trim()) {
            parsed['Appearance'] = fullDescription.trim();
        }
        
        setSections(parsed);
    }, [fullDescription]);
    
    const handleSectionChange = (key: string, value: string) => {
        const newSections = { ...sections, [key]: value };
        setSections(newSections);
        
        // Reconstruct full description
        // Note: This reconstructs with English headers to maintain internal consistency
        const newFullDescription = `#### Appearance\n${newSections['Appearance'] || ''}\n\n#### Personality\n${newSections['Personality'] || ''}\n\n#### Clothing\n${newSections['Clothing'] || ''}`;
        
        onDescriptionChange(newFullDescription);
    };

    return (
        <div className="space-y-2 text-sm h-full flex flex-col overflow-y-auto custom-scrollbar pr-1 pb-1">
            {(['Appearance', 'Personality', 'Clothing'] as const).map(key => (
                <div key={key} className="flex-shrink-0 flex flex-col">
                    <h5 className="font-semibold text-gray-400 text-xs uppercase tracking-wider flex-shrink-0 mb-1">{t(`node.content.${key.toLowerCase()}` as any) || key}</h5>
                    <textarea
                        value={sections[key] || ''}
                        onChange={e => handleSectionChange(key, e.target.value)}
                        className="w-full text-sm p-2 bg-gray-900/50 border-none rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500 custom-scrollbar h-[100px] min-h-[80px]"
                        onWheel={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()} 
                        onFocus={onFocus}
                    />
                </div>
            ))}
        </div>
    );
};

const SUFFIX_CHAR = "Full body character concept on a gray background";
const SUFFIX_OBJ = "Full-length conceptual object on a grey background";

export const CharacterGeneratorNode: React.FC<NodeContentProps> = ({
    node, onValueChange, onGenerateCharacters, isGeneratingCharacters, isStopping, onStopGeneration, t, deselectAllNodes, 
    connectedInputs, clearSelectionsSignal, onGenerateCharacterImage, 
    isGeneratingCharacterImage, onDetachCharacter, onSaveGeneratedCharacterToCatalog,
    getUpstreamNodeValues, addToast
}) => {
    const { secondaryLanguage } = useLanguage();
    
    const isLoading = isGeneratingCharacters;
    const isInputConnected = connectedInputs?.has(undefined);
    const [isTranslatingInput, setIsTranslatingInput] = useState(false);
    
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
    const [collapsedCharacters, setCollapsedCharacters] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (clearSelectionsSignal > 0) {
            setSelectedCharacters(new Set());
        }
    }, [clearSelectionsSignal]);

    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                prompt: parsed.prompt || '',
                numberOfCharacters: parsed.numberOfCharacters || 1,
                targetLanguage: parsed.targetLanguage || secondaryLanguage,
                characterType: parsed.characterType || 'simple',
                style: parsed.style || 'simple',
                customStyle: parsed.customStyle || '',
                characters: Array.isArray(parsed.characters) ? parsed.characters : [],
                additionalPrompt: parsed.additionalPrompt !== undefined ? parsed.additionalPrompt : SUFFIX_CHAR,
                error: parsed.error || null,
            };
        } catch {
            return { prompt: '', numberOfCharacters: 1, targetLanguage: secondaryLanguage, characterType: 'simple', style: 'simple', customStyle: '', characters: [], additionalPrompt: SUFFIX_CHAR, error: null };
        }
    }, [node.value, secondaryLanguage]);

    const { prompt, numberOfCharacters, targetLanguage, characterType, style, customStyle, characters, additionalPrompt, error } = parsedValue;

    const handleValueUpdate = useCallback((updates: Partial<typeof parsedValue>) => {
        const newValue = { ...parsedValue, ...updates };
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange, parsedValue]);
    
    const handleCharacterClick = (e: React.MouseEvent, id: string) => {
        const target = e.target as HTMLElement;
        if (target.closest('textarea, input, button, [role="listbox"]')) return;
        if (document.activeElement && (document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement)) {
            (document.activeElement as HTMLElement).blur();
        }
        setSelectedCharacters(prev => {
            const newSet = new Set(e.shiftKey ? prev : []);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    const handleToggleCharacterCollapse = (id: string) => {
        setCollapsedCharacters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const updateCharacter = (idToUpdate: string, field: 'name' | 'fullDescription' | 'index' | 'prompt', value: string) => {
        const newChars = characters.map((c: any) => 
            c.id === idToUpdate ? { ...c, [field]: value } : c
        );
        handleValueUpdate({ characters: newChars });
    };

    const deleteCharacter = (idToDelete: string) => {
        handleValueUpdate({ characters: characters.filter((c: any) => c.id !== idToDelete) });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };
    
    const handleSaveCharacter = (char: any) => {
        const imageSources: Record<string, string | null> = {};
        if (char.imageBase64) {
            imageSources['1:1'] = `data:image/png;base64,${char.imageBase64}`;
        }
        
        // Ensure index is Entity-N format
        let charIndex = char.index || char.alias || 'Entity-1';
        charIndex = charIndex.replace(/^Character-/, 'Entity-');

        const characterData = {
            type: 'character-card',
            name: char.name,
            index: charIndex,
            image: char.imageBase64 ? `data:image/png;base64,${char.imageBase64}` : null,
            selectedRatio: '1:1',
            prompt: char.prompt,
            fullDescription: char.fullDescription,
            imageSources: imageSources,
            // Include additional prompt from generator if available
            additionalPrompt: additionalPrompt
        };
        const dataStr = JSON.stringify(characterData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(char.name || 'entity').replace(/ /g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSaveToCatalog = (char: any) => {
         if (onSaveGeneratedCharacterToCatalog) {
             const charData = { 
                 ...char, 
                 alias: (char.index || char.alias || 'Entity-1').replace(/^Character-/, 'Entity-'),
                 additionalPrompt: additionalPrompt
             };
             onSaveGeneratedCharacterToCatalog(charData);
         }
    };

    const handleDetach = (char: any) => {
        if (onDetachCharacter) {
             const charData = { 
                 ...char, 
                 index: (char.index || char.alias || 'Entity-1').replace(/^Character-/, 'Entity-'),
                 additionalPrompt: additionalPrompt
             };
             onDetachCharacter(charData, node);
        }
    };

    const handleSyncFromConnection = () => {
        if (!isInputConnected || !getUpstreamNodeValues) return;
        const upstreamValues = getUpstreamNodeValues(node.id);
        const textValue = upstreamValues.find((v: any) => typeof v === 'string') as string || '';
        if (textValue) {
            handleValueUpdate({ prompt: textValue });
            addToast?.("Prompt synced from connection", "success");
        } else {
            addToast?.("No text found in connection", "info");
        }
    };
    
    // Auto-migrate Character- indices to Entity-
    useEffect(() => {
        const updatedCharacters = characters.map((c: any, i: number) => {
            let idx = c.index || c.alias;
            if (!idx) {
                idx = `Entity-${i + 1}`;
            } else if (idx.startsWith('Character-')) {
                idx = idx.replace('Character-', 'Entity-');
            }
            
            if (idx !== c.index) {
                 return { ...c, index: idx };
            }
            return c;
        });
        
        const hasChanges = JSON.stringify(updatedCharacters) !== JSON.stringify(characters);
        if (hasChanges) {
            handleValueUpdate({ characters: updatedCharacters });
        }
    }, [characters.length]); 

    const handleTranslatePrompt = async () => {
        if (!prompt || isTranslatingInput) return;
        setIsTranslatingInput(true);
        try {
            const translated = await translateText(prompt, 'en');
            handleValueUpdate({ prompt: translated });
        } catch (e) {
            console.error("Translation failed", e);
        } finally {
            setIsTranslatingInput(false);
        }
    };

    return (
        <div className="flex flex-col h-full" onWheel={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 space-y-2 mb-2">
                <div className="relative">
                    <textarea
                        value={prompt}
                        onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                        placeholder={isInputConnected ? t('node.content.connectedPlaceholder') : t('node.content.characterPromptPlaceholder')}
                        disabled={isInputConnected || isLoading}
                        className="w-full p-2 bg-gray-700 border-none rounded-md resize-y min-h-[80px] max-h-[300px] focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-gray-800 disabled:text-gray-500 custom-scrollbar overflow-y-scroll pb-8"
                        rows={2}
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()} 
                        onFocus={deselectAllNodes}
                    />
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                        {isInputConnected && (
                             <button 
                                onClick={handleSyncFromConnection}
                                className="p-1 bg-gray-600 hover:bg-cyan-600 text-gray-300 hover:text-white rounded transition-colors"
                                title="Sync from connection"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        )}
                        {!isInputConnected && (
                            <button 
                                onClick={handleTranslatePrompt}
                                disabled={!prompt || isTranslatingInput}
                                className="p-1 bg-gray-600 hover:bg-cyan-600 text-gray-300 hover:text-white rounded transition-colors disabled:opacity-50"
                                title={isTranslatingInput ? t('node.content.translating') : t('node.content.translate')}
                            >
                                {isTranslatingInput ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Additional Prompt Suffix */}
                <div className="flex flex-col gap-1 mb-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t('node.content.additionalPromptSuffix')}</label>
                        <div className="flex gap-0.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleValueUpdate({ additionalPrompt: SUFFIX_CHAR }); }}
                                className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${additionalPrompt === SUFFIX_CHAR ? 'text-cyan-400' : 'text-gray-500 hover:text-white'}`}
                                title="Character Concept"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleValueUpdate({ additionalPrompt: SUFFIX_OBJ }); }}
                                className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${additionalPrompt === SUFFIX_OBJ ? 'text-cyan-400' : 'text-gray-500 hover:text-white'}`}
                                title="Object Concept"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={additionalPrompt}
                        onChange={e => handleValueUpdate({ additionalPrompt: e.target.value })}
                        className="w-full p-1 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-400 focus:border-accent outline-none"
                        onMouseDown={e => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                     <div>
                         <label className="block text-xs text-gray-400 mb-1">{t('node.content.characterTypeShort')}</label>
                         <CustomSelect
                             value={characterType}
                             onChange={(value) => handleValueUpdate({ characterType: value })}
                             disabled={isLoading}
                             options={[
                                 { value: 'simple', label: t('node.content.characterType.simple' as any) },
                                 { value: 'anthro', label: t('node.content.characterType.anthro' as any) },
                                 { value: 'chibi', label: t('node.content.characterType.chibi' as any) },
                                 { value: 'key_item', label: t('node.content.characterType.key_item' as any) }
                             ]}
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-gray-400 mb-1">{t('node.content.style')}</label>
                         <CustomSelect
                             value={style}
                             onChange={(value) => handleValueUpdate({ style: value })}
                             disabled={isLoading}
                             options={[
                                 { value: 'simple', label: t('node.content.style.simple' as any) },
                                 { value: 'realistic', label: t('node.content.style.realistic' as any) },
                                 { value: '3d_cartoon', label: t('node.content.style.3d_cartoon' as any) },
                                 { value: '3d_realistic', label: t('node.content.style.3d_realistic' as any) },
                                 { value: '2d_animation', label: t('node.content.style.2d_animation' as any) },
                                 { value: 'anime', label: t('node.content.style.anime' as any) },
                                 { value: 'comics', label: t('node.content.style.comics' as any) },
                                 { value: 'custom', label: t('node.content.style.custom' as any) }
                             ]}
                         />
                     </div>
                    <div>
                        <InputWithSpinners 
                            label={t('node.content.numberOfCharactersShort')}
                            value={numberOfCharacters}
                            onChange={(val) => handleValueUpdate({ numberOfCharacters: val })}
                            min={1}
                            max={10}
                        />
                    </div>
                </div>

                {style === 'custom' && (
                    <div className="flex items-center space-x-2 bg-gray-700 rounded-md p-1">
                        <label htmlFor={`custom-style-input-${node.id}`} className="text-xs text-gray-400 pl-1 flex-shrink-0">{t('node.content.style.custom' as any)}</label>
                        <textarea
                            id={`custom-style-input-${node.id}`}
                            value={customStyle}
                            onChange={e => handleValueUpdate({ customStyle: e.target.value })}
                            onMouseDown={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()} 
                            onFocus={deselectAllNodes}
                            rows={2}
                            className="w-full p-1 bg-gray-800 text-white rounded-md text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none custom-scrollbar"
                            placeholder="..."
                        />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-700 rounded-md p-1 space-x-1 h-10">
                        {/* Dynamic Secondary Language Button */}
                        <button 
                            onClick={() => handleValueUpdate({ targetLanguage: secondaryLanguage })} 
                            className={`px-2 py-1 rounded text-xs font-bold w-10 h-full transition-colors ${targetLanguage === secondaryLanguage ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                            title={languages[secondaryLanguage].name}
                        >
                            {languages[secondaryLanguage].short}
                        </button>
                        
                        <button 
                            onClick={() => handleValueUpdate({ targetLanguage: 'en' })} 
                            className={`px-2 py-1 rounded text-xs font-bold w-10 h-full transition-colors ${targetLanguage === 'en' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                        >
                            EN
                        </button>
                    </div>
                    <button
                        onClick={() => onGenerateCharacters(node.id)}
                        disabled={isLoading || isStopping || (!isInputConnected && !prompt.trim())}
                        className={`flex-grow h-10 px-4 py-2 font-bold text-white rounded-md transition-colors duration-200 flex items-center justify-center space-x-2 ${isLoading ? 'bg-gray-600 cursor-not-allowed opacity-75' : 'bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed'}`}
                    >
                         {isLoading ? (
                             <>
                                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 <span>{t('node.content.generating')}</span>
                             </>
                         ) : (
                             t('node.content.generateCharacters')
                         )}
                    </button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto overflow-x-hidden space-y-2 pr-2 custom-scrollbar scrollbar-gutter-stable">
                {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded border border-red-800">{error}</div>}
                {characters.map((char: any) => (
                    <div key={char.id} className={`bg-gray-800 rounded-md border-2 transition-colors ${selectedCharacters.has(char.id) ? 'border-cyan-500' : 'border-gray-700'}`} onClick={(e) => handleCharacterClick(e, char.id)}>
                         <div 
                             className="flex justify-between items-center p-2 cursor-pointer bg-gray-700/50 select-none" 
                             onClick={(e) => { if(e.target === e.currentTarget) handleToggleCharacterCollapse(char.id); }}
                         >
                             <div className="flex items-center space-x-2 overflow-hidden" onClick={(e) => handleToggleCharacterCollapse(char.id)}>
                                 <ActionButton title={collapsedCharacters.has(char.id) ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); handleToggleCharacterCollapse(char.id); }}>
                                     {collapsedCharacters.has(char.id) ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>}
                                 </ActionButton>
                                 <input type="text" value={char.name} onChange={(e) => updateCharacter(char.id, 'name', e.target.value)} className="bg-transparent font-bold text-sm text-white focus:outline-none truncate" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onFocus={deselectAllNodes} />
                             </div>
                             <div className="flex items-center space-x-1">
                                 <ActionButton title={t('catalog.saveTo')} tooltipPosition="left" onClick={(e) => { e.stopPropagation(); handleSaveToCatalog(char); }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" /></svg>
                                 </ActionButton>
                                 <ActionButton title={t('node.action.saveCharacter')} tooltipPosition="left" onClick={(e) => { e.stopPropagation(); handleSaveCharacter(char); }}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                 </ActionButton>
                                 <ActionButton title="Detach and Copy" tooltipPosition="left" onClick={(e) => { e.stopPropagation(); handleDetach(char); }}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                 </ActionButton>
                                 <ActionButton title={t('node.action.deleteItem')} tooltipPosition="left" onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                 </ActionButton>
                             </div>
                         </div>
                         
                         {!collapsedCharacters.has(char.id) && (
                            <div className="p-2 space-y-2 border-t border-gray-700 flex flex-col">
                                <div className="flex space-x-2 h-[140px] flex-shrink-0">
                                    <div className="w-1/3 h-full flex-shrink-0">
                                         <div className="aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden relative group h-full w-full">
                                            {char.imageBase64 ? (
                                                <>
                                                <img src={`data:image/png;base64,${char.imageBase64}`} alt={char.name} className="w-full h-full object-cover" />
                                                 <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ActionButton title={t('node.action.copy')} onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (char.imageBase64) {
                                                            const blob = new Blob([Uint8Array.from(atob(char.imageBase64), c => c.charCodeAt(0))], { type: 'image/png' });
                                                            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); 
                                                        }
                                                    }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    </ActionButton>
                                                 </div>
                                                </>
                                            ) : (
                                                <div className="text-gray-500 text-xs text-center px-2">
                                                    {isGeneratingCharacterImage === `${node.id}-${char.id}` ? (
                                                        <svg className="animate-spin h-6 w-6 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    ) : (
                                                        <button onClick={(e) => { e.stopPropagation(); onGenerateCharacterImage && onGenerateCharacterImage(node.id, char.id); }} className="text-cyan-400 hover:text-cyan-300 underline">Generate Image</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-2/3 flex flex-col space-y-1 h-full min-w-0">
                                        <div className="flex justify-between items-center flex-shrink-0">
                                            <label className="text-xs text-gray-400 font-medium">{t('node.content.characterIndex')}</label>
                                            <input type="text" value={char.index || char.alias || ''} onChange={(e) => updateCharacter(char.id, 'index', e.target.value)} className="text-xs bg-gray-900 rounded px-1 border border-gray-600 w-24 focus:ring-1 focus:ring-cyan-500 focus:outline-none" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onFocus={deselectAllNodes} />
                                        </div>
                                        <div className="flex justify-between items-center flex-shrink-0">
                                            <label className="text-xs text-gray-400 font-medium">{t('node.content.imagePrompt')}</label>
                                            <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); copyToClipboard(char.prompt || ''); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </ActionButton>
                                        </div>
                                        <textarea
                                            value={char.prompt || ''}
                                            onChange={(e) => updateCharacter(char.id, 'prompt', e.target.value)}
                                            className="w-full flex-grow h-full min-h-[80px] text-xs p-1 bg-gray-900 rounded resize-none border-none focus:ring-1 focus:ring-cyan-500 focus:outline-none custom-scrollbar"
                                            onWheel={e => e.stopPropagation()}
                                            onMouseDown={e => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()} 
                                            onFocus={deselectAllNodes}
                                        />
                                    </div>
                                </div>
                                <div className="flex-grow flex flex-col min-h-[360px]">
                                    <EditableCharacterDescription 
                                        fullDescription={char.fullDescription || ''} 
                                        onDescriptionChange={(val) => updateCharacter(char.id, 'fullDescription', val)}
                                        t={t}
                                        onFocus={deselectAllNodes}
                                    />
                                </div>
                            </div>
                         )}
                    </div>
                ))}
            </div>
        </div>
    );
};
