
import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { PromptCard } from './PromptCard';
import { usePromptVirtualization } from './usePromptVirtualization';
import { InputWithSpinners } from './SharedUI';
import { DebouncedTextarea } from '../../DebouncedTextarea';

interface SourcePromptListProps {
    prompts: any[];
    collapsedScenes: number[];
    checkedFrameNumbers: number[];
    selectedFrameNumber: number | null;
    isLinked: boolean;
    onUpdatePrompts: (updates: any) => void;
    onLoadFile: () => void;
    onSaveToCatalog: () => void;
    onSaveToDisk: () => void;
    t: (key: string) => string;
    onAddNode?: any; // Context/Callback
    setError?: (msg: string) => void;
    // Actions passed from parent
    onSelect: (frame: number) => void;
    onToggleCollapse: (frame: number) => void;
    onToggleScene: (scene: number) => void;
    groupedPrompts?: any[]; 
    // Additional handlers for actions
    onDetachToEditor?: () => void;
    onClearAll: () => void;
    onAddPrompt: (index: number) => void;
    onAddScene: () => void;
    onDeletePrompt: (index: number) => void;
    onMovePromptUp: (index: number) => void;
    onMovePromptDown: (index: number) => void;
    onMoveToStart: (index: number) => void;
    onMoveToEnd: (index: number) => void;
    onRegenerate: (frame: number) => void;
    isAnyGenerationInProgress: boolean;
    onEditInSource: (frame: number) => void;
    onEditPrompt: (frame: number) => void;
    isGeneratingSequence: boolean;
    allConceptsLength: number;
    selectionKey?: string; // New prop to customize state key
    onUnlink?: () => void;
    addToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
    // New prop for clearing text only
    onClearTextOnly?: () => void;
    // New Props for Context
    sceneContexts?: Record<string, string>;
    onUpdateSceneContext?: (scene: number, text: string) => void;
    expandedSceneContexts?: number[];
    onToggleSceneContext?: (scene: number) => void;
}

export interface SourcePromptListRef {
    scrollToFrame: (frameNumber: number) => void;
    scrollToBottom: () => void;
}

export const SourcePromptList = forwardRef<SourcePromptListRef, SourcePromptListProps>(({
    prompts,
    collapsedScenes,
    checkedFrameNumbers,
    selectedFrameNumber,
    isLinked,
    onUpdatePrompts,
    onLoadFile,
    onSaveToCatalog,
    onSaveToDisk,
    t,
    onSelect,
    onToggleCollapse,
    onToggleScene,
    onDetachToEditor,
    onClearAll,
    onAddPrompt,
    onAddScene,
    onDeletePrompt,
    onMovePromptUp,
    onMovePromptDown,
    onMoveToStart,
    onMoveToEnd,
    onRegenerate,
    isAnyGenerationInProgress,
    onEditInSource,
    onEditPrompt,
    isGeneratingSequence,
    allConceptsLength,
    selectionKey = 'checkedSourceFrameNumbers', // Default for Prompt Editor
    onUnlink,
    addToast,
    onClearTextOnly,
    sceneContexts = {},
    onUpdateSceneContext,
    expandedSceneContexts = [],
    onToggleSceneContext
}, ref) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(800);
    const [isDragOver, setIsDragOver] = useState(false);
    const [searchFrame, setSearchFrame] = useState('');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [showVideoPrompts, setShowVideoPrompts] = useState(true);
    const [showSceneHeaders, setShowSceneHeaders] = useState(true);

    // Track container height for virtualization
    useEffect(() => {
        if (!listRef.current) return;
        const updateHeight = () => {
            if (listRef.current) {
                // Use requestAnimationFrame to smooth out updates
                requestAnimationFrame(() => {
                     if (listRef.current) {
                        setContainerHeight(listRef.current.clientHeight);
                        setScrollTop(listRef.current.scrollTop);
                     }
                });
            }
        };
        const observer = new ResizeObserver(updateHeight);
        observer.observe(listRef.current);
        updateHeight();
        return () => observer.disconnect();
    }, []);

    const { 
        groupedPrompts, 
        totalHeight, 
        visibleItems,
        getScrollPositionForFrame
    } = usePromptVirtualization(
        prompts, 
        collapsedScenes, 
        scrollTop, 
        containerHeight, 
        showVideoPrompts,
        showSceneHeaders,
        sceneContexts,
        expandedSceneContexts
    );

    useImperativeHandle(ref, () => ({
        scrollToFrame: (frameNumber: number) => {
            // Need to ensure the virtualizer recalculates positions with current props
            // The hook recalculates on render, so if props change (like expanding a scene), we need a slight delay
            // or forced updated. 
            // In PromptSequenceEditorNode handleEditPrompt, we expand the scene/prompt before calling this.
            
            setTimeout(() => {
                 const top = getScrollPositionForFrame(frameNumber);
                 if (top !== null && listRef.current) {
                    // Adjusted scroll margin to show context/header above
                    // The Scene Context + Header is roughly ~200px or ~70px (collapsed context)
                    // Let's aim to center it or give ample top buffer
                    const buffer = 150; 
                    listRef.current.scrollTo({ top: Math.max(0, top - buffer), behavior: 'smooth' });
                }
            }, 50); // Slight delay to allow render cycle to update expanded states
        },
        scrollToBottom: () => {
             if (listRef.current) listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        }
    }));

    const handleSearchFrame = (val?: string) => {
        const frameNum = parseInt(val || searchFrame, 10);
        if (isNaN(frameNum)) return;
        
        const target = prompts.find(p => p.frameNumber === frameNum);
        if (!target) return;
        
        // Expand scene if needed
        const scene = target.sceneNumber || 1;
        let newCollapsed = [...collapsedScenes];
        if (newCollapsed.includes(scene)) {
            newCollapsed = newCollapsed.filter(s => s !== scene);
        }

        // Expand prompt
        const newPrompts = prompts.map(p => p.frameNumber === frameNum ? { ...p, isCollapsed: false } : p);

        onUpdatePrompts({
            prompts: newPrompts, // Ensure 'prompts' key is used generically or matched by parent
            sourcePrompts: newPrompts, // Backward compat for Editor
            collapsedScenes: newCollapsed, // Generator key
            collapsedSourceScenes: newCollapsed, // Editor key
            selectedFrameNumber: frameNum
        });

        setTimeout(() => {
             const top = getScrollPositionForFrame(frameNum);
             if (top !== null && listRef.current) {
                listRef.current.scrollTo({ top: Math.max(0, top - 150), behavior: 'smooth' });
            }
        }, 100);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        if (isLinked) return;

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/json') {
             const reader = new FileReader();
             reader.onload = (ev) => {
                 if (ev.target?.result) {
                     try {
                        const json = JSON.parse(ev.target.result as string);
                        let newPrompts = json.finalPrompts || json.prompts || (Array.isArray(json) ? json : []);
                        let newContexts = json.sceneContexts || {};
                        
                        if (newPrompts.length > 0) {
                            onUpdatePrompts({ 
                                sourcePrompts: newPrompts, 
                                prompts: newPrompts,
                                sceneContexts: newContexts
                            });
                        }
                     } catch (e) { console.error(e); }
                 }
             };
             reader.readAsText(file);
        }
    };
    
    const handleSelectRange = () => {
        const start = parseInt(rangeStart, 10);
        const end = parseInt(rangeEnd, 10);
        if (isNaN(start) || isNaN(end)) return;
        const s = Math.max(1, start);
        const e = Math.min(prompts.length, end);
        if (s > e) return;

        const rangeIndices: number[] = [];
        for (let i = s; i <= e; i++) { rangeIndices.push(i); }
        onUpdatePrompts({ [selectionKey]: rangeIndices });
    };

    const handleSelectAll = () => onUpdatePrompts({ [selectionKey]: prompts.map(p => p.frameNumber) });
    const handleSelectNone = () => onUpdatePrompts({ [selectionKey]: [] });
    const handleInvert = () => {
        const all = prompts.map(p => p.frameNumber);
        const newChecked = all.filter(n => !checkedFrameNumbers.includes(n));
        onUpdatePrompts({ [selectionKey]: newChecked });
    };
    
    const areAllScenesCollapsed = groupedPrompts.length > 0 && groupedPrompts.every(g => collapsedScenes.includes(g.scene));
    const handleToggleAllScenes = () => {
        const allScenes = groupedPrompts.map(g => g.scene);
        const newState = areAllScenesCollapsed ? [] : allScenes;
        onUpdatePrompts({ collapsedScenes: newState, collapsedSourceScenes: newState });
    };
    
    const areAllPromptsCollapsed = prompts.every(p => p.isCollapsed);
    const handleToggleAllPrompts = () => {
        const newPrompts = prompts.map(p => ({ ...p, isCollapsed: !areAllPromptsCollapsed }));
        onUpdatePrompts({ prompts: newPrompts, sourcePrompts: newPrompts });
    };

    const handleChangePrompt = (frameNumber: number, updates: any) => {
        if (isLinked) return;
        const newPrompts = prompts.map(p => p.frameNumber === frameNumber ? { ...p, ...updates } : p);
        onUpdatePrompts({ prompts: newPrompts, sourcePrompts: newPrompts });
    };

    const handleCheck = (frameNumber: number, isShift: boolean) => {
        if (isShift) {
             onUpdatePrompts({ [selectionKey]: [frameNumber] });
             return;
        }
        const newChecked = checkedFrameNumbers.includes(frameNumber)
            ? checkedFrameNumbers.filter(n => n !== frameNumber)
            : [...checkedFrameNumbers, frameNumber];
        onUpdatePrompts({ [selectionKey]: newChecked });
    };

    const handleCopyText = (txt: string) => {
        navigator.clipboard.writeText(txt);
        if (addToast) addToast(t('toast.copiedToClipboard'));
    };
    
    const handleClearTextOnly = () => {
        if (onClearTextOnly) {
            onClearTextOnly();
        } else {
            // Fallback to legacy clear all if not provided (should be provided in new implementation)
            onClearAll();
        }
    }

    return (
        <div className="flex-grow flex flex-col space-y-2 min-h-0">
             {/* Header Toolbar */}
             <div 
                className="flex justify-between items-center flex-shrink-0 bg-gray-900/50 p-1 rounded-md border border-gray-700 h-9"
                onWheel={e => e.stopPropagation()}
             >
                <div className="flex items-center space-x-1 h-full">
                     {isLinked && (
                        <button 
                            className="text-cyan-400 hover:text-white transition-colors" 
                            title="Linked to Upstream (Click to Unlink and Copy)"
                            onClick={(e) => { e.stopPropagation(); if(onUnlink) onUnlink(); }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        </button>
                    )}
                    
                    {!isLinked && prompts.length > 0 && onDetachToEditor && (
                        <ActionButton title="Detach and Edit" onClick={onDetachToEditor}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </ActionButton>
                    )}
                    
                    <h3 className="text-sm font-bold text-gray-300 px-1 whitespace-nowrap">{t('image_sequence.prompts_list_title') || 'Prompts'}</h3>
                    
                    {/* Search Frame Input */}
                    <div className="flex items-center">
                         <InputWithSpinners
                            value={searchFrame}
                            placeholder="#"
                            onChange={(val) => { setSearchFrame(val); handleSearchFrame(val); }}
                            min={1}
                            className="w-12 border-none"
                            title="Go to Frame"
                         />
                    </div>

                    <div className="w-px h-3 bg-gray-600 mx-1"></div>

                    {/* Range Selection */}
                    <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5 h-6">
                        <span className="text-[9px] text-gray-400 px-1 whitespace-nowrap">{t('image_sequence.range_from')}</span>
                        <InputWithSpinners
                            value={rangeStart}
                            placeholder="1"
                            onChange={setRangeStart}
                            min={1}
                            className="w-10 border-none"
                        />
                        <span className="text-[9px] text-gray-400 px-1 whitespace-nowrap">{t('image_sequence.range_to')}</span>
                        <InputWithSpinners
                            value={rangeEnd}
                            placeholder="N"
                            onChange={setRangeEnd}
                            min={1}
                            className="w-10 border-none"
                        />
                         <ActionButton title="Select range" onClick={(e) => { e.stopPropagation(); handleSelectRange(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </ActionButton>
                    </div>

                    <div className="w-px h-3 bg-gray-600 mx-1"></div>

                    {/* Selection Group */}
                    <div className="flex items-center space-x-1 bg-gray-800 rounded p-0.5 h-6">
                        <ActionButton title={t('image_sequence.select_all')} onClick={handleSelectAll} disabled={prompts.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></ActionButton>
                        <div className="w-px h-3 bg-gray-600"></div>
                        <ActionButton title={t('image_sequence.select_none')} onClick={handleSelectNone} disabled={checkedFrameNumbers.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></ActionButton>
                        <div className="w-px h-3 bg-gray-600"></div>
                        <ActionButton title={t('image_sequence.invert_selection')} onClick={handleInvert} disabled={prompts.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></ActionButton>
                    </div>
                </div>

                <div className="flex items-center space-x-1 h-full">
                     <div className="flex items-center space-x-1 bg-gray-900/50 rounded p-0.5">
                        <ActionButton title="Add Scene" onClick={onAddScene} disabled={isLinked}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m-3-3h6" /></svg></ActionButton>
                        <ActionButton title={t('image_sequence.add_frame')} onClick={() => onAddPrompt(-1)} disabled={isLinked}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></ActionButton>
                    </div>
                    
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                    
                    <ActionButton title={showVideoPrompts ? "Скрыть видео-промпты" : "Показать видео-промпты"} onClick={() => setShowVideoPrompts(!showVideoPrompts)}>
                         {showVideoPrompts 
                             ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                         }
                    </ActionButton>
                    
                    <ActionButton title={showSceneHeaders ? "Скрыть сцены" : "Показать сцены"} onClick={() => setShowSceneHeaders(!showSceneHeaders)}>
                         {showSceneHeaders 
                             ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                         }
                    </ActionButton>

                    <div className="w-px h-4 bg-gray-600 mx-1"></div>

                    <ActionButton title={areAllScenesCollapsed ? "Expand Scenes" : "Collapse Scenes"} onClick={handleToggleAllScenes}>
                        {areAllScenesCollapsed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>}
                    </ActionButton>
                    <ActionButton title={areAllPromptsCollapsed ? "Expand Prompts" : "Collapse Prompts"} onClick={handleToggleAllPrompts} disabled={areAllScenesCollapsed}>
                        {areAllPromptsCollapsed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>}
                    </ActionButton>
                    
                    {!isLinked && (
                        <ActionButton title={t('image_sequence.clear_prompts_only')} onClick={handleClearTextOnly} disabled={prompts.length === 0}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </ActionButton>
                    )}
                </div>
            </div>

            {/* List */}
             <div 
                ref={listRef}
                className={`flex-grow min-h-0 bg-gray-900/50 p-2 rounded-md border-2 border-dashed transition-colors overflow-y-auto scrollbar-gutter-stable ${isDragOver ? 'border-cyan-500 bg-gray-700/50' : 'border-transparent'} ${isDragOver ? 'bg-cyan-900/20' : ''}`}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onWheel={e => e.stopPropagation()}
                style={{ overscrollBehaviorY: 'contain' }}
            >
                {prompts.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4 cursor-pointer" onClick={() => !isLinked && onAddPrompt(-1)}>
                        {isLinked ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                <p className="font-semibold text-sm">Linked to References</p>
                                <p className="text-xs">Waiting for data...</p>
                            </>
                        ) : (
                            <>
                                <h4 className="font-semibold text-sm">{t('image_sequence.drop_or_add_title')}</h4>
                                <p className="text-xs">{t('image_sequence.drop_or_add_desc')}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div style={{ height: totalHeight, position: 'relative' }}>
                        {visibleItems.map((item: any) => {
                            if (item.type === 'scene_header') {
                                const group = item.data;
                                const isSceneCollapsed = collapsedScenes.includes(group.scene);
                                return (
                                    <div 
                                        key={`header-${group.scene}`} 
                                        style={{ position: 'absolute', top: item.top, left: 0, right: 0, height: item.h, paddingBottom: 4 }}
                                    >
                                        <div 
                                            className="flex items-center justify-between bg-gray-800 p-1 rounded select-none cursor-pointer hover:bg-gray-700 transition-colors h-full"
                                            onClick={(e) => { e.stopPropagation(); onToggleScene(group.scene); }}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="text-gray-400">
                                                    {isSceneCollapsed 
                                                        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                        : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                    }
                                                </div>
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider bg-gray-800 px-2 py-1 rounded">
                                                    {t('image_sequence.scene_input_label')} {group.scene}{group.title ? `: ${group.title}` : ''}
                                                </span>
                                                <span className="text-[10px] text-gray-500">({group.prompts.length} frames)</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else if (item.type === 'scene_context') {
                                // Scene Context Card
                                const contextText = item.data;
                                const sceneNum = item.scene;
                                const isExpanded = expandedSceneContexts.includes(sceneNum); // Check visibility
                                
                                return (
                                    <div 
                                        key={`context-${sceneNum}`}
                                        style={{ position: 'absolute', top: item.top, left: 0, right: 0, height: item.h }}
                                        className="pl-2 border-l-2 border-orange-500/50 ml-2 pb-2"
                                    >
                                        <div className="bg-gray-800/80 rounded border border-orange-500/30 p-2 h-full flex flex-col">
                                             <div 
                                                className="flex justify-between items-center cursor-pointer select-none"
                                                onClick={(e) => { e.stopPropagation(); onToggleSceneContext && onToggleSceneContext(sceneNum); }}
                                             >
                                                 <div className="flex items-center gap-2">
                                                    <div className="text-orange-500">
                                                        {isExpanded 
                                                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                        }
                                                    </div>
                                                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-wider cursor-pointer">SCENE CONTEXT</label>
                                                 </div>
                                             </div>
                                             
                                             {isExpanded && (
                                                 <div className="flex-grow min-h-0 mt-2">
                                                     <DebouncedTextarea 
                                                        value={contextText}
                                                        onDebouncedChange={(val) => onUpdateSceneContext && onUpdateSceneContext(sceneNum, val)}
                                                        readOnly={isLinked}
                                                        className={`w-full h-full text-xs p-1.5 bg-gray-900/50 rounded resize-none border-none focus:outline-none transition-shadow focus:ring-1 focus:ring-orange-500 ${isLinked ? 'cursor-default' : 'cursor-text'}`}
                                                        placeholder="Describe scene environment and context..."
                                                        onMouseDown={e => e.stopPropagation()}
                                                        onWheel={e => e.stopPropagation()}
                                                     />
                                                 </div>
                                             )}
                                        </div>
                                    </div>
                                );
                            } else {
                                const p = item.data;
                                const index = prompts.findIndex((item: any) => item.frameNumber === p.frameNumber);
                                const isSelected = selectedFrameNumber === p.frameNumber;
                                return (
                                    <div 
                                        key={`prompt-${p.frameNumber}`}
                                        style={{ position: 'absolute', top: item.top, left: 0, right: 0, height: item.h }}
                                        className="pl-2 border-l-2 border-gray-700 ml-2"
                                    >
                                        <PromptCard
                                            index={index}
                                            frameNumber={p.frameNumber}
                                            sceneNumber={p.sceneNumber}
                                            prompt={p.prompt}
                                            videoPrompt={p.videoPrompt}
                                            shotType={p.shotType}
                                            characters={p.characters}
                                            duration={p.duration || 0}
                                            isSelected={isSelected}
                                            isCollapsed={p.isCollapsed ?? false}
                                            onToggleCollapse={() => onToggleCollapse(p.frameNumber)}
                                            onSelect={() => onSelect(p.frameNumber)}
                                            onChange={handleChangePrompt}
                                            onCopy={(txt) => handleCopyText(txt)}
                                            onCopyVideo={(txt) => handleCopyText(txt)}
                                            t={t}
                                            readOnly={isLinked}
                                            isChecked={checkedFrameNumbers.includes(p.frameNumber)}
                                            onCheck={(frameNum, isShift) => handleCheck(frameNum, isShift)}
                                            onDelete={() => onDeletePrompt(p.frameNumber)}
                                            onAddAfter={() => onAddPrompt(p.frameNumber)}
                                            onMoveUp={() => onMovePromptUp(index)}
                                            onMoveDown={() => onMovePromptDown(index)}
                                            onMoveToStart={() => onMoveToStart(index)}
                                            onMoveToEnd={() => onMoveToEnd(index)}
                                            isFirst={index === 0}
                                            isLast={index === prompts.length - 1}
                                            showVideoPrompts={showVideoPrompts}
                                            onRegenerate={onRegenerate}
                                            isAnyGenerationInProgress={isAnyGenerationInProgress || isGeneratingSequence}
                                            onEditInSource={onEditInSource}
                                            onEditPrompt={onEditPrompt}
                                            maxCharacters={allConceptsLength}
                                        />
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}
            </div>
            
            {/* Footer Buttons */}
             {!isLinked && (
                <div className="flex-shrink-0 flex space-x-2">
                    <div className="flex-1 flex space-x-1">
                        <button onClick={onLoadFile} className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md">{t('image_sequence.load_prompts')}</button>
                    </div>
                    <button
                        onClick={onSaveToCatalog}
                        disabled={prompts.length === 0}
                        className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        title={t('catalog.saveTo')}
                    >
                        {t('catalog.saveTo')}
                    </button>
                    <ActionButton title={t('group.saveToDisk')} onClick={onSaveToDisk} disabled={prompts.length === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </ActionButton>
                </div>
            )}
        </div>
    );
});
