

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { NodeType } from '../../types';
import { ActionButton } from '../ActionButton';
import { DebouncedTextarea } from '../DebouncedTextarea';
import { useAppContext } from '../../contexts/AppContext';
import { PromptSequenceControls } from './prompt-sequence/PromptSequenceControls';
import { SourcePromptList, SourcePromptListRef } from './prompt-sequence/SourcePromptList';
import { ModifiedPromptList } from './prompt-sequence/ModifiedPromptList';
import { MultiviewSequenceView } from './prompt-sequence/MultiviewSequenceView';
import { CopyIcon } from '../icons/AppIcons'; // Added import

const MIN_LEFT_PANE_WIDTH = 620;
const MIN_RIGHT_PANE_WIDTH = 400;

export const PromptSequenceEditorNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    onModifyPromptSequence,
    isModifyingPromptSequence,
    t,
    onLoadPromptSequenceFile,
    onSaveSequenceToCatalog,
    onSaveScriptToDisk,
    setError,
    connectedInputs,
    getUpstreamNodeValues,
    addToast,
    viewTransform,
    onSelectNode,
    onSavePromptToLibrary
}) => {
    const { setConnections } = useAppContext();
    const contentRef = useRef<HTMLDivElement>(null);
    const sourceListRef = useRef<SourcePromptListRef>(null);
    const dragStartRef = useRef<{ startX: number, startWidth: number } | null>(null);
    const instructionInputId = `instruction-input-${node.id}`;

    const isReferenceDataConnected = connectedInputs?.has('prompts_sequence');
    
    const parsedValue = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                activeTab: (parsed.activeTab === 'multiview' || parsed.mode === 'multiview') ? 'multiview' : 'sequence',
                instruction: parsed.instruction || '',
                sourcePrompts: parsed.sourcePrompts || [],
                modifiedPrompts: parsed.modifiedPrompts || [],
                leftPaneWidth: parsed.leftPaneWidth || MIN_LEFT_PANE_WIDTH,
                leftPaneRatio: parsed.leftPaneRatio || undefined,
                checkedSourceFrameNumbers: parsed.checkedSourceFrameNumbers || [],
                selectedFrameNumber: parsed.selectedFrameNumber || null,
                styleOverride: parsed.styleOverride || '',
                isStyleSelected: parsed.isStyleSelected || false,
                isStyleCollapsed: parsed.isStyleCollapsed !== false,
                isUsedCharsCollapsed: parsed.isUsedCharsCollapsed !== false,
                usedCharacters: parsed.usedCharacters || [],
                collapsedSourceScenes: parsed.collapsedSourceScenes || [],
                collapsedModifiedScenes: parsed.collapsedModifiedScenes || [],
                targetLanguage: parsed.targetLanguage || 'en',
                modificationModel: parsed.modificationModel || 'gemini-3-flash-preview',
                includeVideoPrompts: parsed.includeVideoPrompts || false,
                sceneContexts: parsed.sceneContexts || {},
                modifiedSceneContexts: parsed.modifiedSceneContexts || {},
                expandedSceneContexts: parsed.expandedSceneContexts || [],
                checkedContextScenes: parsed.checkedContextScenes || [],
                // Multiview fields
                multiviewPrompt: parsed.multiviewPrompt,
                multiviewItems: parsed.multiviewItems || [],
                multiviewModel: parsed.multiviewModel || 'flash'
            };
        } catch {
            return {
                activeTab: 'sequence',
                instruction: '',
                sourcePrompts: [],
                modifiedPrompts: [],
                leftPaneWidth: MIN_LEFT_PANE_WIDTH,
                leftPaneRatio: undefined,
                checkedSourceFrameNumbers: [],
                selectedFrameNumber: null,
                styleOverride: '',
                isStyleSelected: false,
                isStyleCollapsed: true,
                isUsedCharsCollapsed: true,
                usedCharacters: [],
                collapsedSourceScenes: [],
                collapsedModifiedScenes: [],
                targetLanguage: 'en',
                modificationModel: 'gemini-3-flash-preview',
                includeVideoPrompts: false,
                sceneContexts: {},
                modifiedSceneContexts: {},
                expandedSceneContexts: [],
                checkedContextScenes: [],
                multiviewItems: [],
                multiviewModel: 'flash'
            };
        }
    }, [node.value]);

    const parsedValueRef = useRef(parsedValue);
    useEffect(() => { parsedValueRef.current = parsedValue; }, [parsedValue]);

    const activeTab = parsedValue.activeTab;

    let initialWidth = parsedValue.leftPaneWidth;
    if (!initialWidth && parsedValue.leftPaneRatio) {
        initialWidth = Math.max(MIN_LEFT_PANE_WIDTH, (node.width || 1200) * parsedValue.leftPaneRatio);
    } else if (!initialWidth) {
        initialWidth = MIN_LEFT_PANE_WIDTH;
    }

    const { instruction = '', sourcePrompts = [], modifiedPrompts = [], checkedSourceFrameNumbers = [], selectedFrameNumber = null, styleOverride = '', isStyleCollapsed = true, isUsedCharsCollapsed = true, usedCharacters = [], collapsedSourceScenes = [], collapsedModifiedScenes = [], targetLanguage = 'en', modificationModel = 'gemini-3-flash-preview', includeVideoPrompts = false, sceneContexts = {}, modifiedSceneContexts = {}, expandedSceneContexts = [], checkedContextScenes = [] } = parsedValue;
    const leftPaneWidth = initialWidth;

    const handleValueUpdate = useCallback((updates: any) => {
        const current = parsedValueRef.current;
        const newValue = { ...current, ...updates };
        parsedValueRef.current = newValue;
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange]);

    const handleModeChange = (mode: 'sequence' | 'multiview') => {
        handleValueUpdate({ activeTab: mode });
    };

    // Auto-scroll to selected frame when it changes (e.g. from "Edit in Source")
    useEffect(() => {
        if (selectedFrameNumber !== null) {
            setTimeout(() => {
                 sourceListRef.current?.scrollToFrame(selectedFrameNumber);
            }, 100);
        }
    }, [selectedFrameNumber]);

    const handleAddPrompt = useCallback((afterFrame?: number) => {
        const current = [...(parsedValueRef.current.sourcePrompts || [])];
        const nextFrame = current.length > 0 ? Math.max(...current.map((p:any) => p.frameNumber)) + 1 : 1;
        const lastScene = current.length > 0 ? current[current.length - 1].sceneNumber : 1;
        
        const newItem = {
            frameNumber: nextFrame,
            sceneNumber: lastScene,
            sceneTitle: '',
            prompt: '',
            videoPrompt: '',
            shotType: 'MS',
            characters: [],
            duration: 3,
            isCollapsed: false
        };

        if (afterFrame !== undefined && afterFrame !== -1) {
            const idx = current.findIndex(p => p.frameNumber === afterFrame);
            if (idx !== -1) {
                 current.splice(idx + 1, 0, newItem);
                 const reindexed = current.map((p, i) => ({ ...p, frameNumber: i + 1 }));
                 handleValueUpdate({ sourcePrompts: reindexed });
                 return;
            }
        }
        handleValueUpdate({ sourcePrompts: [...current, newItem] });
    }, [handleValueUpdate]);

    const handleAddScene = useCallback(() => {
        const current = [...(parsedValueRef.current.sourcePrompts || [])];
        const lastScene = current.length > 0 ? Math.max(...current.map((p: any) => p.sceneNumber || 1)) : 0;
        const nextScene = lastScene + 1;
        const nextFrame = current.length > 0 ? Math.max(...current.map((p: any) => p.frameNumber)) + 1 : 1;
        
        const newPrompt = {
            frameNumber: nextFrame,
            sceneNumber: nextScene,
            sceneTitle: `Scene ${nextScene}`,
            prompt: '',
            videoPrompt: '',
            shotType: 'MS',
            characters: [],
            duration: 3,
            isCollapsed: false
        };
        
        handleValueUpdate({ sourcePrompts: [...current, newPrompt] });
    }, [handleValueUpdate]);

    const handleDeletePrompt = useCallback((frameNumber: number) => {
        const current = parsedValueRef.current.sourcePrompts || [];
        const filtered = current.filter((p: any) => p.frameNumber !== frameNumber);
        const reindexed = filtered.map((p: any, i: number) => ({ ...p, frameNumber: i + 1 }));
        handleValueUpdate({ sourcePrompts: reindexed });
    }, [handleValueUpdate]);

    const handleMovePromptUp = useCallback((index: number) => {
        if (index <= 0) return;
        const current = parsedValueRef.current.sourcePrompts || [];
        const newPrompts = [...current];
        [newPrompts[index - 1], newPrompts[index]] = [newPrompts[index], newPrompts[index - 1]];
        handleValueUpdate({ sourcePrompts: newPrompts.map((p, i) => ({ ...p, frameNumber: i + 1 })) });
    }, [handleValueUpdate]);

    const handleMovePromptDown = useCallback((index: number) => {
        const current = parsedValueRef.current.sourcePrompts || [];
        if (index >= current.length - 1) return;
        const newPrompts = [...current];
        [newPrompts[index], newPrompts[index + 1]] = [newPrompts[index + 1], newPrompts[index]];
        handleValueUpdate({ sourcePrompts: newPrompts.map((p, i) => ({ ...p, frameNumber: i + 1 })) });
    }, [handleValueUpdate]);

    const handleMoveToStart = useCallback((index: number) => {
        const current = parsedValueRef.current.sourcePrompts || [];
        const newPrompts = [...current];
        const [item] = newPrompts.splice(index, 1);
        newPrompts.unshift(item);
        handleValueUpdate({ sourcePrompts: newPrompts.map((p, i) => ({ ...p, frameNumber: i + 1 })) });
    }, [handleValueUpdate]);

    const handleMoveToEnd = useCallback((index: number) => {
        const current = parsedValueRef.current.sourcePrompts || [];
        const newPrompts = [...current];
        const [item] = newPrompts.splice(index, 1);
        newPrompts.push(item);
        handleValueUpdate({ sourcePrompts: newPrompts.map((p, i) => ({ ...p, frameNumber: i + 1 })) });
    }, [handleValueUpdate]);

    const handleEditPrompt = useCallback((frameNumber: number) => {
        if (sourceListRef.current) {
            sourceListRef.current.scrollToFrame(frameNumber);
            handleValueUpdate({ selectedFrameNumber: frameNumber });
        }
    }, [handleValueUpdate]);

    const handleMoveModifiedToSource = useCallback((frameNumber: number) => {
        const currentSource = parsedValueRef.current.sourcePrompts || [];
        const currentModified = parsedValueRef.current.modifiedPrompts || [];
        const mod = currentModified.find((p: any) => p.frameNumber === frameNumber);
        if (!mod) return;
        const newSource = currentSource.map((p: any) => p.frameNumber === frameNumber ? { ...(p as any), ...(mod as any) } : p);
        const newModified = currentModified.filter((p: any) => p.frameNumber !== frameNumber);
        handleValueUpdate({ sourcePrompts: newSource, modifiedPrompts: newModified });
    }, [handleValueUpdate]);

    const handleMoveAllModifiedToSource = useCallback(() => {
        const currentSource = parsedValueRef.current.sourcePrompts || [];
        const currentModified = parsedValueRef.current.modifiedPrompts || [];
        const modMap = new Map(currentModified.map((p: any) => [p.frameNumber, p]));
        const newSource = currentSource.map((p: any) => {
            const mod = modMap.get(p.frameNumber);
            return mod ? { ...(p as any), ...(mod as any) } : p;
        });
        
        // Also update scene contexts if modified
        const currentContexts = parsedValueRef.current.sceneContexts || {};
        const modContexts = parsedValueRef.current.modifiedSceneContexts || {};
        const newContexts = { ...currentContexts, ...modContexts };
        
        handleValueUpdate({ sourcePrompts: newSource, modifiedPrompts: [], sceneContexts: newContexts, modifiedSceneContexts: {} });
    }, [handleValueUpdate]);

    useEffect(() => {
        if (!node.width) return;
        const maxLeftWidth = node.width - MIN_RIGHT_PANE_WIDTH;
        if (leftPaneWidth > maxLeftWidth) {
             handleValueUpdate({ leftPaneWidth: Math.max(MIN_LEFT_PANE_WIDTH, maxLeftWidth) });
        } else if (leftPaneWidth < MIN_LEFT_PANE_WIDTH) {
             handleValueUpdate({ leftPaneWidth: MIN_LEFT_PANE_WIDTH });
        }
    }, [node.width, leftPaneWidth, handleValueUpdate]);

    useEffect(() => {
        if (isReferenceDataConnected) {
            const upstreamValues = getUpstreamNodeValues(node.id, 'prompts_sequence');
            const val = upstreamValues[0];
            if (typeof val === 'string' && val.trim() !== '') {
                try {
                    const parsed = JSON.parse(val);
                    if (parsed.type === 'script-prompt-modifier-data' && Array.isArray(parsed.finalPrompts)) {
                         const incomingPrompts = parsed.finalPrompts;
                         const incomingUsedChars = parsed.usedCharacters || [];
                         const incomingSceneContexts = parsed.sceneContexts || {};

                         const newSourcePrompts: any[] = [];
                         let hasChanges = false;
                         incomingPrompts.forEach((inc: any) => {
                             const existing = sourcePrompts.find((p:any) => p.frameNumber === inc.frameNumber);
                             const newPrompt = {
                                 frameNumber: inc.frameNumber,
                                 sceneNumber: inc.sceneNumber || 1,
                                 sceneTitle: inc.sceneTitle || '',
                                 prompt: inc.prompt || '',
                                 videoPrompt: inc.videoPrompt || '',
                                 shotType: inc.shotType || inc.ShotType || 'MS',
                                 characters: inc.characters || [],
                                 duration: inc.duration || 3,
                                 isCollapsed: existing ? existing.isCollapsed : true
                             };
                             if (!existing || existing.prompt !== newPrompt.prompt || existing.videoPrompt !== newPrompt.videoPrompt || existing.shotType !== newPrompt.shotType || JSON.stringify(existing.characters) !== JSON.stringify(newPrompt.characters)) hasChanges = true;
                             newSourcePrompts.push(newPrompt);
                         });
                         
                         // Check global changes
                         if (sourcePrompts.length !== newSourcePrompts.length || JSON.stringify(usedCharacters) !== JSON.stringify(incomingUsedChars) || JSON.stringify(sceneContexts) !== JSON.stringify(incomingSceneContexts)) hasChanges = true;
                         
                         if (hasChanges) {
                             handleValueUpdate({ 
                                 sourcePrompts: newSourcePrompts, 
                                 usedCharacters: incomingUsedChars,
                                 sceneContexts: incomingSceneContexts
                             });
                         }
                    }
                } catch (e) { }
            }
        }
    }, [isReferenceDataConnected, getUpstreamNodeValues, node.id, handleValueUpdate, sourcePrompts, usedCharacters, sceneContexts]); 
    
    const handleHorizontalResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const scale = viewTransform?.scale || 1;
        dragStartRef.current = { startX: e.clientX, startWidth: parsedValueRef.current.leftPaneWidth || MIN_LEFT_PANE_WIDTH };
        const handleMouseMove = (ev: MouseEvent) => {
            const start = dragStartRef.current;
            if (!start) return;
            const deltaX = (ev.clientX - start.startX) / scale;
            const newWidth = start.startWidth + deltaX;
            const maxLeftWidth = node.width - MIN_RIGHT_PANE_WIDTH;
            const clampedWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(newWidth, maxLeftWidth));
            handleValueUpdate({ leftPaneWidth: clampedWidth });
        };
        const handleMouseUp = () => {
            dragStartRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleValueUpdate, viewTransform, node.width]);

    const handleToggleStyleCollapse = () => handleValueUpdate({ isStyleCollapsed: !isStyleCollapsed });
    const handleToggleUsedCharsCollapse = () => handleValueUpdate({ isUsedCharsCollapsed: !isUsedCharsCollapsed });

    const handleUpdateUsedCharacterName = (idx: number, newName: string) => {
        const newChars = [...usedCharacters];
        newChars[idx] = { ...newChars[idx], name: newName };
        handleValueUpdate({ usedCharacters: newChars });
    };

    const handleUpdateSceneContext = (sceneNum: number, text: string) => {
        const newContexts = { ...sceneContexts, [sceneNum]: text };
        handleValueUpdate({ sceneContexts: newContexts });
    };

    const handleUpdateModifiedSceneContext = (sceneNum: number, text: string) => {
        const currentModified = parsedValueRef.current.modifiedSceneContexts || {};
        const newContexts = { ...currentModified, [sceneNum]: text };
        handleValueUpdate({ modifiedSceneContexts: newContexts });
    };

    const handleToggleSceneContext = (sceneNum: number) => {
        const current = expandedSceneContexts || [];
        const newExpanded = current.includes(sceneNum)
            ? current.filter((s: number) => s !== sceneNum)
            : [...current, sceneNum];
        handleValueUpdate({ expandedSceneContexts: newExpanded });
    };

    const handleToggleSceneContextCheck = (sceneNum: number) => {
        const current = checkedContextScenes || [];
        const newChecked = current.includes(sceneNum)
            ? current.filter((s: number) => s !== sceneNum)
            : [...current, sceneNum];
        handleValueUpdate({ checkedContextScenes: newChecked });
    };

    if (activeTab === 'multiview') {
        return (
            <div 
                ref={contentRef} 
                className="relative h-full w-full flex flex-col space-y-2" 
                onMouseDown={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* Mode Switcher Bar */}
                <div className="flex bg-gray-900/90 p-1 rounded-lg border border-gray-800 space-x-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
                    <button
                        onClick={() => handleModeChange('sequence')}
                        className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        <span>{t('prompt_sequence_editor.title') || 'Редактор сценария'}</span>
                    </button>
                    <button
                        onClick={() => handleModeChange('multiview')}
                        className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/30"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                        </svg>
                        <span>Multiview Prompt Generator</span>
                    </button>
                </div>

                <div className="flex-1 min-h-0">
                    <MultiviewSequenceView
                        nodeId={node.id}
                        parsedValue={parsedValue}
                        onValueUpdate={handleValueUpdate}
                        connectedInputs={connectedInputs}
                        getUpstreamNodeValues={getUpstreamNodeValues}
                        addToast={addToast}
                        onSelectNode={onSelectNode}
                        onSavePromptToLibrary={onSavePromptToLibrary}
                        leftPaneWidth={leftPaneWidth}
                        onResizeLeftPane={handleHorizontalResize}
                        t={t}
                    />
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={contentRef} 
            className="relative h-full w-full flex space-x-2" 
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            <div className="h-full flex flex-col space-y-2 flex-shrink-0" style={{ width: `${leftPaneWidth}px` }}>
                <PromptSequenceControls 
                    instruction={instruction}
                    onInstructionChange={(val) => handleValueUpdate({ instruction: val })}
                    targetLanguage={targetLanguage}
                    onLanguageChange={(lang) => handleValueUpdate({ targetLanguage: lang })}
                    modificationModel={modificationModel}
                    onModelChange={(model) => handleValueUpdate({ modificationModel: model })}
                    includeVideoPrompts={includeVideoPrompts}
                    onToggleVideoPrompts={() => handleValueUpdate({ includeVideoPrompts: !includeVideoPrompts })}
                    includeSceneContext={false} // Removed global context usage
                    onToggleSceneContextOption={() => {}} // No-op
                    isModifying={isModifyingPromptSequence}
                    onModify={() => onModifyPromptSequence(node.id)}
                    checkedCount={checkedSourceFrameNumbers.length}
                    checkedContextCount={checkedContextScenes.length} // Pass checked contexts count
                    totalPrompts={sourcePrompts.length}
                    instructionInputId={instructionInputId}
                    activeTab={activeTab}
                    onModeChange={handleModeChange}
                    t={t}
                />

                 {/* Used Characters Panel */}
                 <div className="flex flex-col space-y-1 mb-1 flex-shrink-0">
                     <div 
                        className="flex justify-between items-center cursor-pointer hover:bg-gray-700/50 rounded-md px-1 transition-colors group"
                        onClick={handleToggleUsedCharsCollapse}
                     >
                        <label className="text-[10px] font-bold text-connection-text uppercase cursor-pointer py-1 flex-grow">Используемые персонажи</label>
                        <div className="text-gray-500 group-hover:text-gray-300 p-1">
                            {isUsedCharsCollapsed 
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            }
                        </div>
                     </div>
                     {!isUsedCharsCollapsed && (
                        <div className="bg-gray-700/50 p-2 rounded-md border border-gray-600 max-h-40 overflow-y-auto custom-scrollbar">
                             {usedCharacters.length > 0 ? usedCharacters.map((char: any, i: number) => (
                                 <div key={i} className="flex items-center gap-1 mb-1 last:mb-0 group/item">
                                     <div className="flex items-center gap-1 min-w-[100px] shrink-0 bg-gray-800/50 rounded px-1 border border-gray-600/50">
                                         {/* Updated color to text-connection-text */}
                                         <span className="text-[10px] font-mono text-connection-text truncate w-16">{char.index}:</span>
                                         <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                navigator.clipboard.writeText(`[${char.index}]`); 
                                                if(addToast) addToast(t('toast.copiedToClipboard')); 
                                            }}
                                            className="text-gray-500 hover:text-white p-0.5 transition-colors opacity-0 group-hover/item:opacity-100"
                                            title="Copy as [Tag]"
                                         >
                                            <CopyIcon className="h-3 w-3" />
                                         </button>
                                     </div>
                                     <div className="flex-grow flex items-center bg-gray-800 border-none rounded px-1.5 py-0.5 relative">
                                        <input 
                                            type="text" 
                                            value={char.name} 
                                            onChange={(e) => handleUpdateUsedCharacterName(i, e.target.value)}
                                            placeholder="Имя персонажа..."
                                            className="w-full bg-transparent border-none text-[10px] text-gray-200 focus:outline-none focus:ring-0"
                                            onMouseDown={e => e.stopPropagation()}
                                        />
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                navigator.clipboard.writeText(char.name); 
                                                if(addToast) addToast(t('toast.copiedToClipboard')); 
                                            }}
                                            className="text-gray-500 hover:text-white p-0.5 transition-colors opacity-0 group-hover/item:opacity-100 absolute right-1"
                                            title="Copy Name"
                                        >
                                            <CopyIcon className="h-3 w-3" />
                                        </button>
                                     </div>
                                 </div>
                             )) : <div className="text-[10px] text-gray-500 italic">Персонажи не указаны.</div>}
                        </div>
                     )}
                </div>

                 <div className="flex flex-col space-y-1 mb-2 flex-shrink-0">
                     <div 
                        className="flex justify-between items-center cursor-pointer hover:bg-gray-700/50 rounded-md px-1 transition-colors group"
                        onClick={handleToggleStyleCollapse}
                     >
                        <label className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer py-1 flex-grow">{t('node.content.style')}</label>
                        <div className="text-gray-500 group-hover:text-gray-300 p-1">
                            {isStyleCollapsed 
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            }
                        </div>
                     </div>
                     {!isStyleCollapsed && (
                        <DebouncedTextarea
                            value={styleOverride}
                            onDebouncedChange={(v) => handleValueUpdate({ styleOverride: v })}
                            className="w-full p-2 bg-gray-700 border-none rounded-md resize-none focus:outline-none text-xs"
                            style={{ minHeight: '60px' }}
                            onMouseDown={e => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                        />
                     )}
                </div>

                <SourcePromptList
                    ref={sourceListRef}
                    prompts={sourcePrompts}
                    collapsedScenes={collapsedSourceScenes}
                    checkedFrameNumbers={checkedSourceFrameNumbers}
                    selectedFrameNumber={selectedFrameNumber}
                    selectionKey="checkedSourceFrameNumbers"
                    isLinked={!!isReferenceDataConnected}
                    onUpdatePrompts={handleValueUpdate}
                    onLoadFile={() => onLoadPromptSequenceFile(node.id)}
                    onSaveToCatalog={() => onSaveSequenceToCatalog(node.id)}
                    onSaveToDisk={() => onSaveScriptToDisk(node.id)}
                    t={t}
                    setError={setError}
                    onSelect={(f) => handleValueUpdate({ selectedFrameNumber: f })}
                    onToggleCollapse={(f) => {
                         const newPrompts = sourcePrompts.map((p: any) => p.frameNumber === f ? {...p, isCollapsed: !p.isCollapsed} : p);
                         handleValueUpdate({ sourcePrompts: newPrompts });
                    }}
                    onToggleScene={(scene) => {
                        const newCollapsed = collapsedSourceScenes.includes(scene) ? collapsedSourceScenes.filter((s: number) => s !== scene) : [...collapsedSourceScenes, scene];
                        handleValueUpdate({ collapsedSourceScenes: newCollapsed });
                    }}
                    onClearAll={() => handleValueUpdate({ sourcePrompts: [], styleOverride: '', usedCharacters: [], sceneContexts: {} })}
                    onAddPrompt={handleAddPrompt}
                    onAddScene={handleAddScene}
                    onDeletePrompt={handleDeletePrompt}
                    onMovePromptUp={handleMovePromptUp}
                    onMovePromptDown={handleMovePromptDown}
                    onMoveToStart={handleMoveToStart}
                    onMoveToEnd={handleMoveToEnd}
                    onRegenerate={() => {}} 
                    isAnyGenerationInProgress={isModifyingPromptSequence}
                    onEditInSource={() => {}} 
                    onEditPrompt={handleEditPrompt}
                    isGeneratingSequence={isModifyingPromptSequence}
                    allConceptsLength={0}
                    // New props
                    sceneContexts={sceneContexts}
                    onUpdateSceneContext={handleUpdateSceneContext}
                    expandedSceneContexts={expandedSceneContexts}
                    onToggleSceneContext={handleToggleSceneContext}
                    // Pass checked contexts and handler
                    checkedContextScenes={checkedContextScenes}
                    onToggleContextCheck={handleToggleSceneContextCheck}
                />
            </div>
            
            <div onMouseDown={handleHorizontalResize} className="w-2 h-full bg-gray-700/50 hover:bg-cyan-600 cursor-col-resize rounded transition-colors flex-shrink-0"></div>
            
            <div className="h-full flex flex-col space-y-2 min-w-0" style={{ width: '0', flexGrow: 1 }}>
                <ModifiedPromptList
                    prompts={modifiedPrompts}
                    collapsedScenes={collapsedModifiedScenes}
                    isLinked={!!isReferenceDataConnected}
                    onUpdatePrompts={handleValueUpdate}
                    t={t}
                    onMoveAllToSource={handleMoveAllModifiedToSource}
                    onClear={() => handleValueUpdate({ modifiedPrompts: [] })}
                    onMoveToSource={handleMoveModifiedToSource}
                    onToggleCollapse={(f) => {
                        const newPrompts = modifiedPrompts.map((p: any) => p.frameNumber === f ? {...p, isCollapsed: !p.isCollapsed} : p);
                        handleValueUpdate({ modifiedPrompts: newPrompts });
                    }}
                    onToggleScene={(scene) => {
                         const newCollapsed = collapsedModifiedScenes.includes(scene) ? collapsedModifiedScenes.filter((s: number) => s !== scene) : [...collapsedModifiedScenes, scene];
                        handleValueUpdate({ collapsedModifiedScenes: newCollapsed });
                    }}
                    sceneContexts={sceneContexts} 
                    modifiedSceneContexts={modifiedSceneContexts} // Pass modified contexts
                    expandedSceneContexts={expandedSceneContexts}
                    onToggleSceneContext={handleToggleSceneContext}
                    onUpdateSceneContext={handleUpdateModifiedSceneContext} // Pass the specific modifier handler
                />
            </div>
        </div>
    );
};