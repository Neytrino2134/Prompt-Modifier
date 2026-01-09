
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { OutputFrame } from './OutputFrame';
import { GRID_ITEM_WIDTH, GRID_ITEM_HEIGHT, GRID_GAP } from './Constants';
import { InputWithSpinners } from './SharedUI';
import { CustomCheckbox } from '../../CustomCheckbox';

interface OutputGalleryPanelProps {
    prompts: any[];
    images: Record<number, string>;
    frameStatuses: Record<number, string>;
    selectedFrameNumber: number | null;
    checkedFrameNumbers: number[];
    collapsedOutputScenes: number[];
    isGeneratingSequence: boolean;
    isAnyFrameGenerating: boolean;
    t: (key: string, options?: any) => string;
    onUpdateState: (updates: any) => void;
    groupedPrompts: { scene: number, title: string, prompts: any[] }[]; // Passed for sync
    // Actions
    onRegenerate: (frame: number) => void;
    onDownload: (frame: number, prompt: string) => void;
    onCopy: (frame: number) => void;
    onCopyPrompt: (text: string) => void;
    onCopyVideoPrompt: (text: string) => void;
    onStopFrame: (frame: number) => void;
    onFrameSelect: (frame: number) => void;
    onFrameDoubleClick: (frame: number) => void;
    onCheckFrame: (frame: number, shift: boolean) => void;
    onOpenRaster: (frameNumber: number, imageUrl: string) => void;
    onOpenAI: (imageUrl: string) => void;
    onReplaceImage: (frame: number, url: string) => void;
    onEditPrompt?: (frame: number) => void;
    onEditInSource: (frame: number) => void;
    readOnlyPrompt: boolean;
    getFullSizeImage: (id: number) => string | undefined;
    onSelectByAspectRatio: (type: 'square' | 'landscape' | 'portrait') => void;
    onSelectSceneByAspectRatio: (sceneNumber: number, type: 'square' | 'landscape' | 'portrait') => void;
    // Batch Actions
    onSelectAll: () => void;
    onSelectNone: () => void;
    onInvertSelection: () => void;
    onRunSelected: () => void;
    onDownloadSelected: () => void;
    onForceRefresh: () => void;
    onExpandFrame: (frameNumber: number, ratio: string) => void;
    onExpandSelected: (ratio: string) => void;
    onReportDimensions: (frameNumber: number, width: number, height: number) => void;
    // New prop
    onClearImages?: () => void;
    onCopyCombinedPrompt?: (frameNumber: number) => void; // New prop
}

export const OutputGalleryPanel: React.FC<OutputGalleryPanelProps> = ({
    prompts, images, frameStatuses, selectedFrameNumber, checkedFrameNumbers, collapsedOutputScenes,
    isGeneratingSequence, isAnyFrameGenerating, t, onUpdateState, groupedPrompts,
    onRegenerate, onDownload, onCopy, onCopyPrompt, onCopyVideoPrompt, onStopFrame,
    onFrameSelect, onFrameDoubleClick, onCheckFrame, onOpenRaster, onOpenAI, onReplaceImage,
    onEditPrompt, onEditInSource, readOnlyPrompt, getFullSizeImage, onSelectByAspectRatio, onSelectSceneByAspectRatio,
    onSelectAll, onSelectNone, onInvertSelection, onRunSelected, onDownloadSelected, onForceRefresh,
    onExpandFrame, onExpandSelected, onReportDimensions, onClearImages, onCopyCombinedPrompt
}) => {
    const framesGridRef = useRef<HTMLDivElement>(null);
    const [framesGridScrollTop, setFramesGridScrollTop] = useState(0);
    const [containerWidth, setContainerWidth] = useState(800);
    const [containerHeight, setContainerHeight] = useState(600);
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [sceneInput, setSceneInput] = useState('');

    const generatedFrames = Object.keys(images).length;
    const queueCount = Object.values(frameStatuses).filter((s: any) => s === 'pending' || s === 'generating').length;
    const totalFrames = prompts.length;

    // Monitor container size for virtualization and layout
    useEffect(() => {
        if (!framesGridRef.current) return;
        const updateDimensions = () => {
            if (framesGridRef.current) {
                // Use requestAnimationFrame to prevent ResizeObserver loop error
                requestAnimationFrame(() => {
                    if (framesGridRef.current) {
                        setContainerWidth(framesGridRef.current.clientWidth);
                        setContainerHeight(framesGridRef.current.clientHeight);
                    }
                });
            }
        };
        const observer = new ResizeObserver(updateDimensions);
        observer.observe(framesGridRef.current);
        updateDimensions();
        return () => observer.disconnect();
    }, []);

    // Virtualization Logic for Output Images Grid
    const outputGridVirtualItems = useMemo(() => {
         const effectiveWidth = Math.max(0, containerWidth - 20); 
         const columns = Math.floor(effectiveWidth / (GRID_ITEM_WIDTH + GRID_GAP)) || 1;
         const flattenItems: { type: 'scene_header' | 'scene_grid', h: number, top: number, data: any, scene: number }[] = [];
         let y = 0;
         groupedPrompts.forEach(g => {
              flattenItems.push({ type: 'scene_header', h: 40, top: y, data: g, scene: g.scene });
              y += 40;
              if (!collapsedOutputScenes.includes(g.scene)) {
                  const rows = Math.ceil(g.prompts.length / columns);
                  // Fix: Ensure grid height calculation doesn't produce negative values if rows is 0
                  const gridHeight = rows > 0 ? (rows * GRID_ITEM_HEIGHT) + (Math.max(0, rows - 1) * GRID_GAP) + 24 : 0; 
                  flattenItems.push({ type: 'scene_grid', h: Math.max(0, gridHeight), top: y, data: g, scene: g.scene });
                  y += Math.max(0, gridHeight);
              }
         });
         return { items: flattenItems, totalHeight: y };
    }, [groupedPrompts, collapsedOutputScenes, containerWidth]);

    const getVisibleGridItems = () => {
        const buffer = 800; // Render buffer
        const visibleRangeStart = Math.max(0, framesGridScrollTop - buffer);
        const visibleRangeEnd = framesGridScrollTop + containerHeight + buffer;
        
        return outputGridVirtualItems.items.filter((item) => {
            const itemBottom = item.top + item.h;
            return itemBottom > visibleRangeStart && item.top < visibleRangeEnd;
        });
    };

    const handleSelectRange = () => {
        const start = rangeStart === '' ? 1 : parseInt(rangeStart, 10);
        const end = rangeEnd === '' ? totalFrames : parseInt(rangeEnd, 10);
        if (isNaN(start) || isNaN(end)) return;
        const s = Math.max(1, start);
        const e = Math.min(totalFrames, end);
        if (s > e) return;
        const rangeIndices: number[] = [];
        for (let i = s; i <= e; i++) { rangeIndices.push(i); }
        onUpdateState({ checkedFrameNumbers: rangeIndices });
    };

    const scrollToScene = (sceneNum: number) => {
        setTimeout(() => {
             const index = groupedPrompts.findIndex(g => g.scene === sceneNum);
             if (index !== -1 && framesGridRef.current) {
                 // 40 is the hardcoded header height in the virtualizer logic
                 // If all previous scenes are collapsed, their height is just 40.
                 // However, we rely on the virtualizer's calculated top position for this item index.
                 // But we can't easily access the virtual items list here directly without recaculating.
                 // Heuristic: If we collapsed everything else, the position is simply index * 40.
                 const top = index * 40; 
                 framesGridRef.current.scrollTo({ top, behavior: 'smooth' });
             }
         }, 50);
    };

    const handleSelectSpecificScene = (sceneNum?: number) => {
        const targetScene = sceneNum !== undefined ? sceneNum : (sceneInput === '' ? 1 : parseInt(sceneInput, 10));
        if (isNaN(targetScene)) return;
        const sceneGroup = groupedPrompts.find(g => g.scene === targetScene);
        if (!sceneGroup) return;
        const framesInScene = sceneGroup.prompts.map((p: any) => p.frameNumber);
        
        // Collapse all other scenes
        const allScenes = groupedPrompts.map(g => g.scene);
        const scenesToCollapse = allScenes.filter(s => s !== targetScene);
        
        onUpdateState({ checkedFrameNumbers: framesInScene, collapsedOutputScenes: scenesToCollapse });
        if (sceneNum !== undefined) setSceneInput(sceneNum.toString());
        
        scrollToScene(targetScene);
    };

    const handleNextScene = () => {
        const currentScene = parseInt(sceneInput, 10) || 1;
        const uniqueScenes = groupedPrompts.map(g => g.scene).sort((a,b) => a-b);
        const idx = uniqueScenes.indexOf(currentScene);
        if (idx !== -1 && idx < uniqueScenes.length - 1) handleSelectSpecificScene(uniqueScenes[idx + 1]);
        else if (idx === -1 && uniqueScenes.length > 0) handleSelectSpecificScene(uniqueScenes[0]);
    };

    const handlePrevScene = () => {
        const currentScene = parseInt(sceneInput, 10) || 1;
        const uniqueScenes = groupedPrompts.map(g => g.scene).sort((a,b) => a-b);
        const idx = uniqueScenes.indexOf(currentScene);
        if (idx > 0) handleSelectSpecificScene(uniqueScenes[idx - 1]);
        else if (idx === -1 && uniqueScenes.length > 0) handleSelectSpecificScene(uniqueScenes[uniqueScenes.length - 1]);
    };
    
    const areAllOutputScenesCollapsed = groupedPrompts.length > 0 && groupedPrompts.every(g => collapsedOutputScenes.includes(g.scene));
    const handleToggleAllOutputScenes = () => {
        const allSceneNumbers = groupedPrompts.map(g => g.scene);
        const newCollapsed = areAllOutputScenesCollapsed ? [] : allSceneNumbers;
        onUpdateState({ collapsedOutputScenes: newCollapsed });
    };
    
    const handleClearClick = () => {
        if (onClearImages) {
            onClearImages();
        } else {
            // Fallback for compatibility
            onUpdateState({ sequenceOutputs: [] });
        }
    };

    // Toggle Scene Selection (Select All Frames in Scene / Deselect All)
    const handleToggleSceneSelection = (sceneNum: number) => {
        const group = groupedPrompts.find(g => g.scene === sceneNum);
        if (!group) return;
        const sceneFrameIds = group.prompts.map((p: any) => p.frameNumber);
        
        // Check if all frames in this scene are currently selected
        const allSelected = sceneFrameIds.every(id => checkedFrameNumbers.includes(id));
        
        let newChecked;
        if (allSelected) {
            // Deselect all frames in this scene
            newChecked = checkedFrameNumbers.filter(id => !sceneFrameIds.includes(id));
        } else {
            // Add all frames in this scene to selection (preserve existing non-scene selections)
            newChecked = [...new Set([...checkedFrameNumbers, ...sceneFrameIds])];
        }
        
        onUpdateState({ checkedFrameNumbers: newChecked });
    };

    // Helper to check if ALL frames in a scene are selected
    const isSceneFullySelected = (sceneNum: number) => {
        const group = groupedPrompts.find(g => g.scene === sceneNum);
        if (!group) return false;
        if (group.prompts.length === 0) return false;
        return group.prompts.every((p: any) => checkedFrameNumbers.includes(p.frameNumber));
    };

    return (
        <div className="flex-grow flex flex-col space-y-2 min-h-0 pl-1">
             <div className="flex justify-between items-center flex-shrink-0 bg-gray-900/50 p-1 rounded-md border border-gray-700 mb-1">
                <div className="flex items-center space-x-3 px-1">
                     <h3 className="text-sm font-bold text-gray-300 flex-shrink-0">{t('image_sequence.output_images_title')}</h3>
                     <div className="text-[10px] text-gray-400 flex space-x-2 border-l border-gray-600 pl-3">
                         <span>{t('image_sequence.stats.total', { count: totalFrames })}</span>
                         {/* Updated to text-accent */}
                         <span className={generatedFrames > 0 ? "text-accent" : ""}>{t('image_sequence.stats.generated', { count: generatedFrames })}</span>
                         {/* Updated to text-accent */}
                         {queueCount > 0 && <span className="text-accent animate-pulse">{t('image_sequence.stats.queue', { count: queueCount })}</span>}
                    </div>
                </div>
                <ActionButton title={t('image_sequence.force_refresh')} onClick={onForceRefresh}>
                    {/* Updated to text-accent */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </ActionButton>
             </div>

             <div className="flex items-center justify-between gap-2 bg-gray-900/50 p-1 rounded-md border border-gray-700 mb-1">
                 <div className="flex items-center space-x-1 flex-shrink-0">
                     <div className="flex items-center space-x-1 bg-gray-800 rounded border border-gray-600 px-1 py-0.5">
                        <span className="text-[10px] text-gray-400 pr-1 whitespace-nowrap">{t('image_sequence.range_from')}</span>
                        <InputWithSpinners value={rangeStart} placeholder="1" onChange={setRangeStart} min={1} className="w-12 border-none" />
                        <div className="w-px h-3 bg-gray-600 mx-1"></div>
                        <span className="text-[10px] text-gray-400 pr-1 whitespace-nowrap">{t('image_sequence.range_to')}</span>
                        <InputWithSpinners value={rangeEnd} placeholder="Last" onChange={setRangeEnd} min={1} className="w-12 border-none" />
                        <ActionButton title={t('image_sequence.select_range')} onClick={(e) => { e.stopPropagation(); handleSelectRange(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </ActionButton>
                    </div>

                    <div className="w-px h-4 bg-gray-600 mx-1"></div>

                    <div className="flex items-center space-x-1 bg-gray-800 rounded border border-gray-600 px-1 py-0.5">
                        <span className="text-[10px] text-gray-400 px-1 whitespace-nowrap">{t('image_sequence.scene_input_label')}</span>
                        {/* WIDENED INPUT HERE */}
                        <InputWithSpinners value={sceneInput} placeholder="1" onChange={setSceneInput} min={1} className="w-14 border-none" />
                        <ActionButton title={t('image_sequence.select_scene')} onClick={(e) => { e.stopPropagation(); handleSelectSpecificScene(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </ActionButton>
                        <div className="w-px h-3 bg-gray-600 mx-1"></div>
                         <button className="p-0.5 text-gray-400 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); handlePrevScene(); }} title={t('image_sequence.prev_scene')}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <button className="p-0.5 text-gray-400 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); handleNextScene(); }} title={t('image_sequence.next_scene')}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                    </div>
                 </div>

                 <div className="flex items-center space-x-1 flex-shrink-0 ml-auto">
                    {/* Aspect Ratio Fast Selection Group */}
                    <div className="flex items-center space-x-1 bg-gray-800 rounded p-0.5">
                        <ActionButton title={t('image_sequence.select_square')} onClick={() => onSelectByAspectRatio('square')} disabled={generatedFrames === 0}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
                        </ActionButton>
                        <ActionButton title={t('image_sequence.select_landscape')} onClick={() => onSelectByAspectRatio('landscape')} disabled={generatedFrames === 0}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="1" /></svg>
                        </ActionButton>
                        <ActionButton title={t('image_sequence.select_portrait')} onClick={() => onSelectByAspectRatio('portrait')} disabled={generatedFrames === 0}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="1" /></svg>
                        </ActionButton>
                    </div>

                    <div className="w-px h-4 bg-gray-600 mx-1"></div>

                    <ActionButton title={t('image_sequence.select_all')} onClick={onSelectAll} disabled={prompts.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${prompts.length === 0 ? 'text-gray-600' : 'text-green-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></ActionButton>
                    <ActionButton title={t('image_sequence.select_none')} onClick={onSelectNone} disabled={checkedFrameNumbers.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${checkedFrameNumbers.length === 0 ? 'text-gray-600' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></ActionButton>
                    <ActionButton title={t('image_sequence.invert_selection')} onClick={onInvertSelection} disabled={prompts.length === 0}><svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${prompts.length === 0 ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></ActionButton>
                    
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>

                     <ActionButton title={t('image_sequence.run_selected')} onClick={onRunSelected} disabled={isGeneratingSequence || isAnyFrameGenerating || checkedFrameNumbers.length === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${(isGeneratingSequence || isAnyFrameGenerating || checkedFrameNumbers.length === 0) ? 'text-gray-600' : 'text-emerald-400'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    </ActionButton>
                    <ActionButton title={`${t('image_sequence.download_selected')} (${checkedFrameNumbers.length})`} onClick={onDownloadSelected} disabled={checkedFrameNumbers.length === 0}>
                       <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${(checkedFrameNumbers.length === 0) ? 'text-gray-600' : 'text-sky-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </ActionButton>
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                    <ActionButton title={t('node.action.clear')} onClick={handleClearClick} disabled={Object.keys(images).length === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${Object.keys(images).length === 0 ? 'text-gray-600' : 'text-gray-300 hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </ActionButton>
                 </div>
                 <ActionButton title={areAllOutputScenesCollapsed ? "Развернуть все сцены" : "Свернуть все сцены"} onClick={handleToggleAllOutputScenes}>
                    {areAllOutputScenesCollapsed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>}
                </ActionButton>
             </div>

            <div 
                ref={framesGridRef}
                onScroll={(e) => setFramesGridScrollTop(e.currentTarget.scrollTop)}
                className="flex-grow bg-gray-900/50 rounded-md p-2 overflow-y-auto custom-scrollbar overflow-x-hidden scrollbar-gutter-stable" 
                onWheel={e => e.stopPropagation()}
                style={{ overscrollBehaviorY: 'contain' }}
            >
                <div style={{ height: outputGridVirtualItems.totalHeight, position: 'relative' }}>
                {getVisibleGridItems().map((item: any) => {
                    const group = item.data;
                    if (item.type === 'scene_header') {
                         const isOutputSceneCollapsed = collapsedOutputScenes.includes(group.scene);
                         
                         const firstFrame = group.prompts[0]?.frameNumber;
                         const lastFrame = group.prompts[group.prompts.length - 1]?.frameNumber;
                         const frameRange = (firstFrame !== undefined && lastFrame !== undefined) ? `(${firstFrame}-${lastFrame})` : '';

                         return (
                            <div key={`grid-header-${group.scene}`} style={{ position: 'absolute', top: item.top, left: 0, right: 0, height: item.h, paddingBottom: 4 }}>
                                <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 rounded transition-colors p-1 h-full" onClick={() => { const newCollapsed = collapsedOutputScenes.includes(group.scene) ? collapsedOutputScenes.filter(s => s !== group.scene) : [...collapsedOutputScenes, group.scene]; onUpdateState({ collapsedOutputScenes: newCollapsed }); }}>
                                    
                                    {/* Left: Chevron and Title */}
                                    <div className="flex items-center gap-2 overflow-hidden flex-grow mr-2">
                                         <div className="text-gray-400 flex-shrink-0">
                                             {isOutputSceneCollapsed 
                                                 ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg> 
                                                 : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                             }
                                         </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-800 px-2 py-1 rounded truncate" title={`${t('image_sequence.scene_input_label')} ${group.scene}${group.title ? `: ${group.title}` : ''}`}>
                                            {t('image_sequence.scene_input_label')} {group.scene}{group.title ? `: ${group.title}` : ''}
                                        </span>
                                    </div>
                                    
                                    {/* Right: Meta and Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        
                                        {/* Hidden Count / Frame Count */}
                                        <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                            {isOutputSceneCollapsed
                                                ? t('image_sequence.frames_hidden', { count: group.prompts.length })
                                                : t('image_sequence.frames_count', { count: group.prompts.length })
                                            }
                                        </span>
                                        
                                        {/* Frame Range */}
                                        <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">{frameRange}</span>

                                        <div className="flex items-center gap-1">
                                            {/* SCENE SPECIFIC ASPECT RATIO SELECTION */}
                                            <ActionButton title={t('image_sequence.select_square')} onClick={(e) => { e.stopPropagation(); onSelectSceneByAspectRatio(group.scene, 'square'); }} disabled={false}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1" /></svg>
                                            </ActionButton>
                                            <ActionButton title={t('image_sequence.select_landscape')} onClick={(e) => { e.stopPropagation(); onSelectSceneByAspectRatio(group.scene, 'landscape'); }} disabled={false}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="1" /></svg>
                                            </ActionButton>
                                            <ActionButton title={t('image_sequence.select_portrait')} onClick={(e) => { e.stopPropagation(); onSelectSceneByAspectRatio(group.scene, 'portrait'); }} disabled={false}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="1" /></svg>
                                            </ActionButton>

                                            <div className="w-px h-4 bg-gray-600 mx-1"></div>

                                             <ActionButton title="Focus Scene (Collapse others)" tooltipPosition="left" onClick={(e) => { e.stopPropagation(); handleSelectSpecificScene(group.scene); }}>
                                                {/* Updated to text-accent */}
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent hover:text-accent-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                             </ActionButton>
                                             <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                             
                                             {/* New Focus/Select Scene Checkbox */}
                                             <CustomCheckbox
                                                 checked={isSceneFullySelected(group.scene)}
                                                 onChange={() => handleToggleSceneSelection(group.scene)}
                                                 title="Select All Frames in Scene"
                                                 className="text-accent" // Explicit class for theme control
                                             />
                                        </div>
                                    </div>
                                </div>
                            </div>
                         );
                    } else {
                         const group = item.data;
                         return (
                            <div key={`grid-content-${group.scene}`} style={{ position: 'absolute', top: item.top, left: 0, right: 0, height: item.h }}>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 pl-2">
                                    {group.prompts.map((p: any) => {
                                         const charIndices: string[] = [];
                                         if (p.characters && Array.isArray(p.characters)) {
                                             p.characters.forEach((charId: string) => { 
                                                 const match = charId.match(/(?:character|entity)-(\d+)/i); 
                                                 if (match) charIndices.push(match[1]); 
                                             });
                                         }
                                         
                                         // Prioritize thumbnail from node state for faster UI
                                         const thumbnail = images[p.frameNumber];
                                         const fullSizeUrl = getFullSizeImage(1000 + p.frameNumber);
                                         const imageUrl = thumbnail || fullSizeUrl;

                                         return (
                                            <div key={p.frameNumber} className="w-full h-[200px]">
                                                <OutputFrame
                                                    index={p.frameNumber}
                                                    frameNumber={p.frameNumber}
                                                    imageUrl={imageUrl}
                                                    fullSizeImageUrl={fullSizeUrl || imageUrl}
                                                    status={(frameStatuses[p.frameNumber] as any) || 'idle'}
                                                    isSelected={selectedFrameNumber === p.frameNumber}
                                                    onSelect={onFrameSelect}
                                                    onDoubleClick={onFrameDoubleClick}
                                                    onRegenerate={onRegenerate}
                                                    onDownload={(f, pr) => onDownload(f, pr)}
                                                    onCopy={onCopy}
                                                    onCopyTextPrompt={onCopyPrompt}
                                                    onCopyVideo={onCopyVideoPrompt}
                                                    onStop={onStopFrame}
                                                    isGeneratingSequence={!!isGeneratingSequence}
                                                    isAnyGenerationInProgress={!!isGeneratingSequence || isAnyFrameGenerating}
                                                    t={t}
                                                    isChecked={checkedFrameNumbers.includes(p.frameNumber)}
                                                    onCheck={onCheckFrame}
                                                    prompt={p.prompt}
                                                    videoPrompt={p.videoPrompt}
                                                    onOpenRaster={onOpenRaster}
                                                    onOpenAI={onOpenAI}
                                                    onReplaceImage={onReplaceImage}
                                                    onEditPrompt={onEditPrompt}
                                                    readOnlyPrompt={readOnlyPrompt}
                                                    onEditInSource={onEditInSource}
                                                    characterIndices={charIndices}
                                                    onExpandFrame={onExpandFrame}
                                                    shotType={p.shotType}
                                                    onReportDimensions={onReportDimensions}
                                                    onCopyCombinedPrompt={onCopyCombinedPrompt} // New prop
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                         );
                    }
                })}
                </div>
            </div>
        </div>
    );
};
