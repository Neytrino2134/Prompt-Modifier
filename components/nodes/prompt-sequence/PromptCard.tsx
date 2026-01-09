
import React, { useCallback, useState } from 'react';
import { ActionButton } from '../../ActionButton';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { SyntaxHighlightedTextarea } from '../../SyntaxHighlightedTextarea';
import { CARD_EXPANDED_HEIGHT, CARD_COLLAPSED_HEIGHT, CARD_EXPANDED_HEIGHT_NO_VIDEO, SHOT_TYPE_INSTRUCTIONS } from './Constants';
import { CopyIcon } from '../../icons/AppIcons';
import { InputWithSpinners } from './SharedUI';
import { CustomCheckbox } from '../../CustomCheckbox';

interface PromptCardProps {
    index: number;
    frameNumber: number;
    sceneNumber?: number;
    prompt: string;
    videoPrompt?: string;
    shotType?: string;
    characters?: string[];
    duration: number;
    isSelected: boolean;
    isCollapsed: boolean;
    onToggleCollapse: (frameNumber: number) => void;
    onSelect: (frameNumber: number) => void;
    onChange: (frameNumber: number, updates: { prompt?: string; videoPrompt?: string; duration?: number; characters?: string[]; shotType?: string }) => void;
    onDelete?: (frameNumber: number) => void;
    onAddAfter?: (frameNumber: number) => void;
    onCopy: (prompt: string) => void;
    onCopyVideo?: (prompt: string) => void;
    onMoveUp?: (index: number) => void;
    onMoveDown?: (index: number) => void;
    onMoveToStart?: (index: number) => void;
    onMoveToEnd?: (index: number) => void;
    onMoveToSource?: (frameNumber: number) => void;
    isFirst?: boolean;
    isLast?: boolean;
    t: (key: string) => string;
    readOnly?: boolean;
    isChecked?: boolean;
    onCheck?: (frameNumber: number, isShiftHeld: boolean) => void;
    isModified?: boolean;
    style?: React.CSSProperties;
    onRegenerate?: (frameNumber: number) => void;
    isAnyGenerationInProgress?: boolean;
    maxCharacters?: number;
    onEditInSource?: (frameNumber: number) => void;
    onEditPrompt?: (frameNumber: number) => void;
    showVideoPrompts?: boolean;
    showSceneInfo?: boolean; 
}

const SHOT_OPTIONS = ['WS', 'MS', 'CU', 'ECU', 'LS'];

export const PromptCard: React.FC<PromptCardProps> = React.memo(({ index, frameNumber, sceneNumber, prompt, videoPrompt, shotType, characters, duration, isSelected, isCollapsed, onToggleCollapse, onSelect, onChange, onDelete, onAddAfter, onCopy, onCopyVideo, onMoveUp, onMoveDown, onMoveToSource, onMoveToStart, onMoveToEnd, isFirst, isLast, t, readOnly = false, isChecked, onCheck, style, onEditInSource, onEditPrompt, showVideoPrompts = true, showSceneInfo = true }) => {
    
    const handleUpdateCharacter = useCallback((charIndexInArray: number, newCharNumber: number) => {
        if (readOnly || newCharNumber < 1) return;
        const oldCharId = (characters || [])[charIndexInArray];
        const newCharId = `Entity-${newCharNumber}`;
        
        const newCharacters = [...(characters || [])];
        newCharacters[charIndexInArray] = newCharId;
        
        // Dynamic regex to replace the old ID in the prompt with the new ID
        // Handles cases like (Character-1) or (Entity-1)
        const escapedOldId = oldCharId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\(${escapedOldId}\\)`, 'gi');
        const newPrompt = prompt.replace(regex, `(${newCharId})`);

        onChange(frameNumber, { characters: newCharacters, prompt: newPrompt });
    }, [readOnly, characters, prompt, onChange, frameNumber]);

    const handleRemoveCharacter = useCallback((charIndexInArray: number) => {
        if (readOnly) return;
        const charToRemove = (characters || [])[charIndexInArray];
        
        const newCharacters = (characters || []).filter((_, i) => i !== charIndexInArray);
        
        const escapedCharToRemove = charToRemove.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\s*\\(${escapedCharToRemove}\\)`, 'gi');
        const newPrompt = prompt.replace(regex, '').trim().replace(/,\s*$/, "");
        
        onChange(frameNumber, { characters: newCharacters, prompt: newPrompt });
    }, [readOnly, characters, prompt, onChange, frameNumber]);

    const handleInsertEntity = useCallback((charId: string) => {
        if (readOnly) return;
        const newPrompt = `[${charId}] ${prompt}`;
        onChange(frameNumber, { prompt: newPrompt });
    }, [readOnly, prompt, onChange, frameNumber]);

    const handleAddCharacter = useCallback(() => {
        if (readOnly) return;
        const currentChars = characters || [];
        const existingNumbers = currentChars.map(c => parseInt(c.replace(/(?:character|entity)-/i, ''), 10)).filter(n => !isNaN(n));
        let newCharNumber = 1;
        while(existingNumbers.includes(newCharNumber)) {
            newCharNumber++;
        }
        
        const newCharId = `Entity-${newCharNumber}`;
        const newCharacters = [...currentChars, newCharId];
        
        onChange(frameNumber, { characters: newCharacters });
    }, [readOnly, characters, onChange, frameNumber]);

    const handlePromptTextChange = (newVal: string) => {
        if (readOnly) return;
        const newPromptText = newVal;
        
        // Use generalized regex to find character tags in both old and new text
        const getCharTags = (text: string) => {
             const found = text.match(/(?:character|entity)-\d+/gi) || [];
             return found.map(t => t.toLowerCase()).sort().join(',');
        };

        const oldCharacterTags = getCharTags(prompt);
        const newCharacterTags = getCharTags(newPromptText);
        
        const tagsInTextWereModified = oldCharacterTags !== newCharacterTags;
        const updates: any = { prompt: newPromptText };

        if (tagsInTextWereModified) {
            // Scan for tags, prioritizing the new format but accepting old input
            const foundTags = newPromptText.match(/(?:character|entity)-\d+/gi) || [];
            
            // Normalize all found tags to Entity-N format for storage
            const newUniqueCharacters = [...new Set(foundTags.map(tag => {
                // Normalize to Entity-N
                return tag.replace(/character-/i, 'Entity-').replace(/entity-/i, 'Entity-');
            }))];
            
            updates.characters = newUniqueCharacters;
        }
        onChange(frameNumber, updates);
    };

    const handleVideoPromptTextChange = (newVal: string) => {
        if (readOnly) return;
        onChange(frameNumber, { videoPrompt: newVal });
    };

    const handleShotTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (readOnly) return;
        onChange(frameNumber, { shotType: e.target.value });
    };
    
    const frameIndexStr = String(frameNumber).padStart(3, '0');
    // Updated title: Scene number removed, ShotType added if present
    const title = `FRAME-${frameIndexStr}${shotType ? `, [${shotType}]` : ''}`;

    const shotInstruction = shotType ? SHOT_TYPE_INSTRUCTIONS[shotType] : undefined;

    return (
        <div
            onClick={() => onSelect(frameNumber)}
            style={{
                ...style,
                height: isCollapsed 
                    ? `${CARD_COLLAPSED_HEIGHT}px` 
                    : (showVideoPrompts 
                        ? (shotInstruction ? `${CARD_EXPANDED_HEIGHT + 30}px` : `${CARD_EXPANDED_HEIGHT}px`)
                        : (shotInstruction ? `${CARD_EXPANDED_HEIGHT_NO_VIDEO + 30}px` : `${CARD_EXPANDED_HEIGHT_NO_VIDEO}px`)),
            }}
            className={`relative group bg-gray-700 p-2 rounded-lg border-2 overflow-hidden mb-1 ${isSelected ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-transparent hover:border-gray-600'}`}
        >
            <div 
                className="flex justify-between items-center mb-1 h-[28px] gap-2 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(frameNumber); }}
            >
                 <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                    {onCheck && (
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()} title="Select frame for batch modification">
                            <CustomCheckbox
                                checked={!!isChecked}
                                onChange={(_, e) => onCheck(frameNumber, e.shiftKey)}
                                className="h-5 w-5"
                            />
                        </div>
                    )}
                    <ActionButton tooltipPosition="right" title={isCollapsed ? t('node.action.expand') : t('node.action.collapse')} onClick={(e) => { e.stopPropagation(); onToggleCollapse(frameNumber); }}>
                        {isCollapsed 
                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7M19 5l-7 7-7-7" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        }
                    </ActionButton>
                    
                    <h4 className="text-[10px] font-black text-gray-200 flex-shrink-0 whitespace-nowrap uppercase tracking-tighter" title={title}>
                        {title}
                    </h4>

                    <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase">ENT:</span>
                        {(characters || []).map((charId, charIndex) => {
                            // Support both Entity- and Character- for display, preferring Entity
                            const num = parseInt(charId.replace(/(?:character|entity)-/i, ''), 10);
                            if (isNaN(num)) return null;
                            return (
                                <div key={charIndex} className="flex items-center bg-gray-600 rounded text-gray-200 border border-gray-500" onClick={(e) => e.stopPropagation()}>
                                    <span className="text-[10px] font-semibold px-1.5">{num}</span>
                                    <div className="flex flex-col border-l border-gray-500">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateCharacter(charIndex, num + 1); }}
                                            className="px-0.5 text-gray-300 hover:text-white text-[8px] middle-none disabled:text-gray-500 disabled:cursor-not-allowed"
                                            disabled={readOnly}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateCharacter(charIndex, num - 1); }}
                                            className="px-0.5 text-gray-300 hover:text-white text-[8px] border-t border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            disabled={readOnly || num <= 1}
                                        >
                                            ▼
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleInsertEntity(charId); }}
                                        disabled={readOnly}
                                        className="px-1 text-cyan-300 hover:text-cyan-100 border-l border-gray-500 text-[10px] disabled:text-gray-500 disabled:cursor-not-allowed"
                                        title="Insert at start: [Entity-N]"
                                    >
                                        ↲
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveCharacter(charIndex); }}
                                        disabled={readOnly}
                                        className="px-1 text-red-300 hover:text-red-100 border-l border-gray-500 text-[10px] disabled:text-gray-500 disabled:cursor-not-allowed"
                                    >
                                        &times;
                                    </button>
                                </div>
                            );
                        })}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAddCharacter(); }}
                            disabled={readOnly}
                            className="flex items-center justify-center w-4 h-4 bg-gray-600 hover:bg-gray-500 rounded text-[10px] text-gray-300 disabled:bg-gray-700 disabled:cursor-not-allowed"
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="flex items-center flex-shrink-0 space-x-1">
                    {onMoveToSource && (
                         <ActionButton tooltipPosition="left" title="Move to Source" onClick={(e) => { e.stopPropagation(); onMoveToSource(frameNumber); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </ActionButton>
                    )}
                    
                    {!readOnly && (
                        <div className="flex p-0.5">
                            {onMoveToStart && <ActionButton tooltipPosition="left" title="Move to Start" onClick={(e) => { e.stopPropagation(); onMoveToStart(index); }} disabled={isFirst}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                            </ActionButton>}
                            {onMoveUp && <ActionButton tooltipPosition="left" title="Move Up" onClick={(e) => { e.stopPropagation(); onMoveUp(index); }} disabled={isFirst}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            </ActionButton>}
                            {onMoveDown && <ActionButton tooltipPosition="left" title="Move Down" onClick={(e) => { e.stopPropagation(); onMoveDown(index); }} disabled={isLast}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </ActionButton>}
                            {onMoveToEnd && <ActionButton tooltipPosition="left" title="Move to End" onClick={(e) => { e.stopPropagation(); onMoveToEnd(index); }} disabled={isLast}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                            </ActionButton>}
                        </div>
                    )}
                    
                    {!readOnly && onAddAfter && (
                        <ActionButton tooltipPosition="left" title="Add Frame After" onClick={(e) => { e.stopPropagation(); onAddAfter(frameNumber); }} className="p-1 rounded-md text-[#dad5cf] hover:bg-gray-600 hover:text-white transition-colors focus:outline-none">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </ActionButton>
                    )}

                    <ActionButton tooltipPosition="left" title={t('node.action.copyImagePrompt')} onClick={(e) => { e.stopPropagation(); onCopy(prompt); }}>
                        <CopyIcon className="h-4 w-4" />
                    </ActionButton>
                    
                    <ActionButton tooltipPosition="left" title={t('node.action.copyVideoPrompt')} onClick={(e) => { e.stopPropagation(); if (videoPrompt && onCopyVideo) onCopyVideo(videoPrompt); }}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                    </ActionButton>
                    
                    {!readOnly && onDelete && <ActionButton tooltipPosition="left" title={t('image_sequence.delete_frame')} onClick={(e) => { e.stopPropagation(); onDelete(frameNumber); }} className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-gray-600 transition-colors focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </ActionButton>}
                    
                    {((!readOnly && onEditPrompt) || (readOnly && onEditInSource)) && (
                        <ActionButton title={readOnly ? t('image_sequence.edit_in_source') : t('image_sequence.edit_prompt')} tooltipPosition="left" onClick={(e) => { 
                            e.stopPropagation(); 
                            if (readOnly && onEditInSource) {
                                onEditInSource(frameNumber);
                            } else if (onEditPrompt) {
                                onEditPrompt(frameNumber);
                            }
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </ActionButton>
                    )}
                </div>
            </div>
            {!isCollapsed && (
                <div className="flex flex-col space-y-1 mt-1">
                     <div className="flex items-center gap-2 mb-1 bg-gray-800 p-1 rounded">
                         <select 
                             value={shotType || 'WS'} 
                             onChange={handleShotTypeChange}
                             disabled={readOnly}
                             className="bg-gray-700 text-white text-[10px] rounded border border-gray-600 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-20 shrink-0"
                             onClick={e => e.stopPropagation()}
                             onMouseDown={e => e.stopPropagation()}
                         >
                             {SHOT_OPTIONS.map(opt => (
                                 <option key={opt} value={opt}>{opt}</option>
                             ))}
                         </select>
                         
                         <div className="text-[10px] text-gray-400 italic flex-grow truncate" title={shotInstruction || "No Shot Type"}>
                            {shotInstruction || <span className="opacity-50">No shot type selected</span>}
                         </div>

                         {!readOnly && (
                             <div className="flex items-center flex-shrink-0 border-l border-gray-600 pl-2">
                                <InputWithSpinners 
                                    value={duration.toString()}
                                    onChange={(val) => onChange(frameNumber, { duration: Math.max(0, parseInt(val, 10) || 0) })}
                                    min={0}
                                />
                                <span className="text-[9px] text-gray-500 ml-1">s</span>
                            </div>
                        )}
                     </div>
                     
                    <div className="flex flex-col h-full">
                         <label className="text-[10px] font-bold text-gray-400 uppercase">IMAGE PROMPT</label>
                         {/* Using SyntaxHighlightedTextarea for Entity Highlighting */}
                         <SyntaxHighlightedTextarea
                            value={prompt}
                            onDebouncedChange={handlePromptTextChange}
                            readOnly={readOnly}
                            style={{height: showVideoPrompts ? '100px' : '120px'}}
                            className={`w-full text-xs p-1 bg-gray-800 rounded resize-none border-none focus:outline-none transition-shadow focus:ring-2 focus:ring-cyan-500 ${readOnly ? 'cursor-default' : 'cursor-text'}`}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            onWheel={e => e.stopPropagation()}
                        />
                    </div>
                    {showVideoPrompts && (
                         <div className="flex flex-col mt-1 pt-1 border-t border-gray-600/30">
                             <div className="flex justify-between items-center mb-0.5">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase">VIDEO PROMPT</label>
                             </div>
                             {/* Using SyntaxHighlightedTextarea for Entity Highlighting in Video Prompt */}
                             <SyntaxHighlightedTextarea
                                value={videoPrompt || ''}
                                onDebouncedChange={handleVideoPromptTextChange}
                                readOnly={readOnly}
                                style={{height: '60px'}}
                                className={`w-full text-xs p-1 bg-gray-800 rounded resize-none border-none focus:outline-none transition-shadow focus:ring-2 focus:ring-cyan-500 ${readOnly ? 'cursor-default' : 'cursor-text'}`}
                                onClick={e => e.stopPropagation()}
                                onMouseDown={e => e.stopPropagation()}
                                onWheel={e => e.stopPropagation()}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
