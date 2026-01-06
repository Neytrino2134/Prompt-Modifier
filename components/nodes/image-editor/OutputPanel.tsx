
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ActionButton } from '../../ActionButton';
import CustomSelect from '../../CustomSelect';
import { ImageEditorState, ImageSlot } from './types';
import { CopyIcon } from '../../../components/icons/AppIcons';
import { Tooltip } from '../../Tooltip';
import JSZip from 'jszip';

// Helper component for input with stylish spinners
const InputWithSpinners: React.FC<{
    value: string;
    placeholder?: string;
    onChange: (val: string) => void;
    min?: number;
    className?: string;
    title?: string;
}> = ({ value, placeholder, onChange, min, className, title }) => {
    const handleStep = (step: number) => {
        const currentVal = parseInt(value, 10);
        let nextVal = isNaN(currentVal) ? (min || 1) : currentVal + step;
        if (min !== undefined && nextVal < min) nextVal = min;
        onChange(nextVal.toString());
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            onChange('');
            return;
        }
        const num = parseInt(val, 10);
        if (!isNaN(num) && min !== undefined && num < min) {
             return; 
        }
        onChange(val);
    };

    return (
        <div className={`relative flex items-center bg-gray-800 rounded border border-gray-600 h-6 ${className}`} title={title}>
             <input
                type="number"
                min={min}
                value={value}
                placeholder={placeholder}
                onChange={handleChange}
                className="appearance-none w-full h-full bg-transparent text-[10px] text-white text-center focus:outline-none px-1 placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
            />
             <div className="flex flex-col h-full border-l border-gray-600 w-3 flex-shrink-0">
                <button 
                    className="h-1/2 flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleStep(1); }}
                >
                    <svg width="6" height="3" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0L8 4H0L4 0Z" fill="currentColor"/></svg>
                </button>
                <button 
                    className="h-1/2 flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border-t border-gray-600"
                    onClick={(e) => { e.stopPropagation(); handleStep(-1); }}
                >
                    <svg width="6" height="3" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L0 0H8L4 4Z" fill="currentColor"/></svg>
                </button>
             </div>
        </div>
    );
};

interface OutputPanelProps {
    state: ImageEditorState;
    imageSlots: ImageSlot[];
    hasInputImages: boolean;
    isEditing: boolean;
    isStopping: boolean;
    isGlobalProcessing: boolean;
    totalFrames: number;
    doneCount: number;
    currentGeneratingDisplay: string | number;
    fullSizeOutputForCopy: string | null;
    imageForEditor: string | null;
    modelOptions: { value: string; label: string }[];
    isNanoBanana: boolean;
    onUpdateState: (updates: Partial<ImageEditorState>) => void;
    onRunSelected: () => void;
    onDownloadSelected: () => void;
    onStartQueue: () => void;
    onStop: () => void;
    onEdit: () => void;
    onOpenEditor: () => void;
    onSetOutputToInput: () => void;
    onDownload: () => void;
    onCopy: () => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
    onInvertSelection: () => void;
    onManualRefresh: () => void;
    onOutputClick: () => void;
    onSequenceOutputClick: (index: number, src: string) => void;
    onCheckOutput: (index: number) => void;
    onCopyFrame: (e: React.MouseEvent, index: number) => void;
    onDownloadFrame: (e: React.MouseEvent, index: number) => void;
    onRegenerateFrame: (e: React.MouseEvent, index: number) => void;
    onStopFrame: (e: React.MouseEvent, index: number) => void;
    getFullSizeImage: (frameIndex: number) => string | undefined;
    t: (key: string) => string;
    upstreamPrompt?: string;
    isTextConnected?: boolean;
    // New Props for Editing
    onEditPrompt: (index: number) => void;
    onEditInSource: (index: number) => void;
}

const ITEM_SIZE = 160;
const GAP = 8; // gap-2 is 0.5rem = 8px

export const OutputPanel: React.FC<OutputPanelProps> = ({
    state, imageSlots, hasInputImages, isEditing, isStopping, isGlobalProcessing,
    totalFrames, doneCount, currentGeneratingDisplay, fullSizeOutputForCopy, imageForEditor,
    modelOptions, isNanoBanana,
    onUpdateState, onRunSelected, onDownloadSelected, onStartQueue, onStop, onEdit, onOpenEditor, onSetOutputToInput,
    onDownload, onCopy, onSelectAll, onSelectNone, onInvertSelection, onManualRefresh,
    onOutputClick, onSequenceOutputClick, onCheckOutput, onCopyFrame, onDownloadFrame, onRegenerateFrame, onStopFrame,
    getFullSizeImage, t, upstreamPrompt, isTextConnected,
    onEditPrompt, onEditInSource
}) => {
    const { isSequenceMode, sequenceOutputs, checkedSequenceOutputIndices, model, autoCrop169, autoDownload, checkedInputIndices, prompt, outputImage, resolution, isSequentialEditingWithPrompts, createZip } = state;
    
    // Range State
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');

    // Virtualization State
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!isSequenceMode || !containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isSequenceMode]);

    // Layout Calculations
    const layout = useMemo(() => {
        if (!isSequenceMode) return { columns: 0, totalHeight: 0, items: [] };

        const effectiveWidth = Math.max(0, containerWidth - 16); // p-2 is 8px * 2
        const columns = Math.max(1, Math.floor((effectiveWidth + GAP) / (ITEM_SIZE + GAP)));
        
        // Use totalFrames in Sequential Editing mode, otherwise match input slots
        const totalItems = isSequentialEditingWithPrompts ? totalFrames : imageSlots.length;
        
        const totalRows = Math.ceil(totalItems / columns);
        const totalHeight = totalRows * (ITEM_SIZE + GAP) + GAP; // Add bottom padding

        return { columns, totalHeight, totalItems };
    }, [containerWidth, imageSlots.length, isSequenceMode, isSequentialEditingWithPrompts, totalFrames]);

    const getVisibleItems = () => {
        const { columns, totalItems } = layout;
        const buffer = 400; // pixels to render offscreen
        const visibleStart = Math.max(0, scrollTop - buffer);
        const visibleEnd = scrollTop + (containerRef.current?.clientHeight || 500) + buffer;

        const startRow = Math.floor(visibleStart / (ITEM_SIZE + GAP));
        const endRow = Math.ceil(visibleEnd / (ITEM_SIZE + GAP));
        
        const visibleIndices = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = 0; c < columns; c++) {
                const index = (r * columns) + c;
                if (index < totalItems) {
                    visibleIndices.push({
                        index,
                        top: r * (ITEM_SIZE + GAP),
                        left: c * (ITEM_SIZE + GAP)
                    });
                }
            }
        }
        return visibleIndices;
    };

    const handleSelectRange = () => {
        const start = parseInt(rangeStart, 10);
        const end = parseInt(rangeEnd, 10);
        
        if (isNaN(start)) return;
        
        // Total valid inputs for sequence
        const maxFrames = isSequentialEditingWithPrompts ? totalFrames : imageSlots.length;

        const effectiveEnd = isNaN(end) ? maxFrames : Math.min(end, maxFrames);
        const effectiveStart = Math.max(1, start);
        
        if (effectiveStart > effectiveEnd) return;

        const newIndices: number[] = [];
        // Convert 1-based input to 0-based index
        for(let i = effectiveStart - 1; i < effectiveEnd; i++) {
            newIndices.push(i);
        }
        onUpdateState({ checkedSequenceOutputIndices: newIndices });
    };
    
    const handlePage = (direction: 'prev' | 'next') => {
        const currentStart = parseInt(rangeStart, 10) || 1;
        const pageSize = 5;
        // Logic: Snap to next/prev block of 5
        let pageNum = Math.ceil(currentStart / pageSize);
        if (direction === 'next') pageNum++;
        else pageNum--;
        
        if (pageNum < 1) pageNum = 1;
        
        const maxFrames = isSequentialEditingWithPrompts ? totalFrames : imageSlots.length;

        const newStart = (pageNum - 1) * pageSize + 1;
        const newEnd = Math.min(newStart + pageSize - 1, maxFrames);
        
        setRangeStart(newStart.toString());
        setRangeEnd(newEnd.toString());
        
        // Apply Selection immediately
        const newIndices: number[] = [];
        for(let i = newStart - 1; i < newEnd; i++) {
            newIndices.push(i);
        }
        onUpdateState({ checkedSequenceOutputIndices: newIndices });
    };
    
    const LargeCopyIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="8" y="8" width="12" height="12" rx="2" ry="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
    );

    return (
        <div className="h-full flex flex-col space-y-2 flex-grow min-w-0 pl-1">
             
             {/* Header Row: Title and Stats */}
             <div className="flex justify-between items-center bg-gray-900/50 p-1 rounded-md border border-gray-700">
                <div className="flex items-center gap-3">
                     <label className="text-xs font-medium text-gray-400 pl-1">{isSequenceMode ? t('image_sequence.output_images_title') : t('node.content.outputImage')}</label>
                     {isSequenceMode && (
                         <div className="text-[10px] text-gray-500 flex space-x-2 border-l border-gray-600 pl-3">
                             <span>Total: <span className="text-gray-300">{totalFrames}</span></span>
                             <span className={doneCount > 0 ? "text-cyan-400" : ""}>Done: {doneCount}</span>
                             <span className="text-emerald-400">Selected: {checkedSequenceOutputIndices.length}</span>
                             {isEditing && <span className="text-cyan-400 animate-pulse">Processing: {currentGeneratingDisplay} of {totalFrames}</span>}
                         </div>
                     )}
                </div>
             </div>

             {/* Second Row: Toolbar (Only visible in Sequence Mode) */}
             {isSequenceMode && (
                 <div className="flex justify-between items-center bg-gray-900/50 p-1 rounded-md border border-gray-700">
                     {/* Left: Range Selector */}
                     <div className="flex items-center space-x-1 pl-1">
                         {/* Removed 'border border-gray-700' from the container as requested */}
                         <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
                                <InputWithSpinners 
                                    value={rangeStart}
                                    onChange={setRangeStart}
                                    placeholder="1"
                                    title="Start Index"
                                    className="w-12 border-none" 
                                    min={1}
                                />
                                <span className="text-[10px] text-gray-500">-</span>
                                <InputWithSpinners 
                                    value={rangeEnd}
                                    onChange={setRangeEnd}
                                    placeholder={isSequentialEditingWithPrompts ? totalFrames.toString() : imageSlots.length.toString()}
                                    title="End Index"
                                    className="w-12 border-none" 
                                    min={1}
                                />
                                
                                {/* Grouped Arrows Right Side */}
                                <div className="flex items-center ml-1 border-l border-gray-600 pl-1">
                                     <button 
                                        className="p-0.5 text-gray-400 hover:text-white transition-colors"
                                        onClick={(e) => { e.stopPropagation(); handlePage('prev'); }}
                                        title="Previous 5"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                     <button 
                                        className="p-0.5 text-gray-400 hover:text-white transition-colors"
                                        onClick={(e) => { e.stopPropagation(); handlePage('next'); }}
                                        title="Next 5"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                </div>

                                <div className="w-px h-3 bg-gray-600 mx-1"></div>
                                <button 
                                    onClick={handleSelectRange} 
                                    className="p-0.5 text-gray-400 hover:text-white transition-colors"
                                    title="Select Range"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                         </div>
                     </div>

                     {/* Right: Actions */}
                     <div className="flex items-center space-x-1">
                            <ActionButton title={t('image_sequence.select_all')} onClick={onSelectAll} disabled={totalFrames === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${totalFrames === 0 ? 'text-gray-600' : 'text-green-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </ActionButton>
                            <ActionButton title={t('image_sequence.select_none')} onClick={onSelectNone} disabled={checkedSequenceOutputIndices.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${checkedSequenceOutputIndices.length === 0 ? 'text-gray-600' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </ActionButton>
                            <ActionButton title={t('image_sequence.invert_selection')} onClick={onInvertSelection} disabled={totalFrames === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${totalFrames === 0 ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </ActionButton>

                            <div className="w-px h-4 bg-gray-600 mx-1"></div>

                            <ActionButton title={t('image_sequence.run_selected')} onClick={onRunSelected} disabled={isEditing || checkedSequenceOutputIndices.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${(isEditing || checkedSequenceOutputIndices.length === 0) ? 'text-gray-600' : 'text-emerald-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            </ActionButton>

                            <ActionButton title={`${t('image_sequence.download_selected')} (${checkedSequenceOutputIndices.length})`} onClick={async () => {
                                 // Handle ZIP logic here if needed or let parent handle
                                 const sorted = [...checkedSequenceOutputIndices].sort((a, b) => a - b);
                                 const now = new Date();
                                 const date = now.toISOString().split('T')[0];

                                 if (createZip) {
                                     try {
                                         const JSZipConstructor = (JSZip as any).default || JSZip;
                                         const zip = new JSZipConstructor();
                                         
                                         for (const idx of sorted) {
                                             const src = getFullSizeImage(1000 + idx) || sequenceOutputs[idx]?.thumbnail;
                                             if (src && src.startsWith('data:image')) {
                                                 const paddedFrame = String(idx + 1).padStart(3, '0');
                                                 const ext = src.match(/image\/(png|jpeg|jpg)/)?.[1] || 'png';
                                                 const filename = `Image_Editor_Frame_${paddedFrame}.${ext}`;
                                                 
                                                 // Optimize: Convert to blob instead of string split to avoid main thread freeze
                                                 const blob = await (await fetch(src)).blob();
                                                 zip.file(filename, blob);
                                             }
                                         }
                                         
                                         // USE 'STORE' compression to speed up archiving
                                         const content = await zip.generateAsync({ 
                                             type: 'blob',
                                             compression: 'STORE'
                                         });
                                         
                                         const link = document.createElement('a');
                                         link.href = URL.createObjectURL(content);
                                         link.download = `Image_Editor_Sequence_${date}.zip`;
                                         link.click();
                                         URL.revokeObjectURL(link.href);
                                     } catch (e) {
                                         console.error("ZIP Error", e);
                                     }
                                 } else {
                                     onDownloadSelected();
                                 }
                            }} disabled={checkedSequenceOutputIndices.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${(checkedSequenceOutputIndices.length === 0) ? 'text-gray-600' : 'text-sky-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </ActionButton>

                            <div className="w-px h-4 bg-gray-600 mx-1"></div>

                            <ActionButton title={t('node.action.clear')} onClick={() => onUpdateState({ sequenceOutputs: [] })} disabled={isEditing || sequenceOutputs.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isEditing || sequenceOutputs.length === 0 ? 'text-gray-600' : 'text-gray-300 hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </ActionButton>
                            
                            <div className="w-px h-4 bg-gray-600 mx-1"></div>

                            <ActionButton title="Force Refresh" onClick={onManualRefresh}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                            </ActionButton>
                     </div>
                 </div>
             )}
            
            {!isSequenceMode && (
                <div onClick={onOutputClick} onWheel={(e) => e.stopPropagation()} className="relative w-full flex-grow bg-gray-900/50 rounded-md flex items-center justify-center overflow-hidden group cursor-pointer">
                    {outputImage ? <img src={outputImage} alt="Output" className="object-contain w-full h-full" onMouseDown={(e) => e.stopPropagation()} draggable={true} onDragStart={(e) => { const imageToDrag = fullSizeOutputForCopy || outputImage; if (imageToDrag) { e.dataTransfer.setData('application/prompt-modifier-drag-image', imageToDrag); e.dataTransfer.effectAllowed = 'copy'; e.stopPropagation(); }}}/> : <span className="text-gray-400">{t('node.content.imageHere')}</span>}
                    {outputImage && !isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none gap-4">
                            <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors pointer-events-auto" aria-label={t('node.action.copy')} title={t('node.action.copy')}>
                                {LargeCopyIcon}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60 transition-colors pointer-events-auto" aria-label={t('node.action.download')} title={t('node.action.download')}><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                        </div>
                    )}
                    {isEditing && <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center text-white"><svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span className="mt-2 font-semibold">{t('node.content.generating')}</span></div>}
                    {outputImage && (
                        <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopy(); }}>
                                <CopyIcon />
                            </ActionButton>
                            <ActionButton title={t('node.action.download')} onClick={(e) => { e.stopPropagation(); onDownload(); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></ActionButton>
                        </div>
                    )}
                </div>
            )}

            {isSequenceMode && (
                <div className="flex-grow min-h-0 flex flex-col space-y-2">
                    <div 
                        ref={containerRef}
                        className="flex-grow bg-gray-900/50 rounded-md overflow-y-auto p-2 custom-scrollbar relative"
                        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                        onWheel={e => e.stopPropagation()}
                    >
                        <div style={{ height: layout.totalHeight, width: '100%', position: 'relative' }}>
                        {getVisibleItems().map(({ index, top, left }) => {
                            const isInputChecked = isSequentialEditingWithPrompts || (!checkedInputIndices || checkedInputIndices.includes(index));
                            if (!isInputChecked) return null;

                            const slot = imageSlots[index];
                            // Allow slot to be undefined in Sequential Editing mode (we just need index existence)
                            if (!slot && !isSequentialEditingWithPrompts) return null;

                            const output = sequenceOutputs[index];
                            const isChecked = checkedSequenceOutputIndices.includes(index);
                            const isPending = output && output.status === 'pending';
                            const isGenerating = output && output.status === 'generating';
                            const isError = output && output.status === 'error';
                            const isGenerated = output && output.status === 'done' && output.thumbnail;
                            const fullSizeUrl = getFullSizeImage(1000 + index);
                            
                            // Visual Fallback Logic
                            let displaySrc = isGenerated ? output.thumbnail : (slot ? slot.src : null);
                            
                            // If in Sequential Editing With Prompts mode and we don't have a generated image yet
                            // AND there is no source image for this slot (because input B list is shorter than frames)
                            // Fallback to the first image from Input B (slot 0)
                            if (!isGenerated && isSequentialEditingWithPrompts && !displaySrc && imageSlots.length > 0) {
                                displaySrc = imageSlots[0].src;
                            }
                            
                            const isPreview = !isGenerated && !isPending && !isGenerating && !isError && displaySrc;
                            const srcToView = fullSizeUrl || displaySrc;

                            // Calculate if this frame has an upstream connection for edit (if applicable)
                            const showEditActions = isSequentialEditingWithPrompts;

                            return (
                                <div 
                                    key={index} 
                                    className={`absolute rounded-lg border-2 overflow-hidden cursor-pointer border-gray-700 bg-gray-800 group`}
                                    style={{ top, left, width: ITEM_SIZE, height: ITEM_SIZE }}
                                    onClick={(e) => { e.stopPropagation(); onSequenceOutputClick(index, srcToView || ''); }}
                                >
                                    {displaySrc ? (
                                        <img 
                                            src={displaySrc} 
                                            alt={`Output ${index + 1}`} 
                                            className={`w-full h-full object-contain ${isPreview ? 'opacity-60' : ''}`}
                                            draggable={true}
                                            onDragStart={(e) => {
                                                const srcToDrag = fullSizeUrl || displaySrc;
                                                if (srcToDrag) {
                                                    e.dataTransfer.setData('application/prompt-modifier-drag-image', srcToDrag);
                                                    e.dataTransfer.effectAllowed = 'copy';
                                                    e.stopPropagation();
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                                            Frame {index + 1}
                                        </div>
                                    )}
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none" />

                                    {isPending && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><span className="text-xs text-gray-400 font-medium">{t('imageEditor.status.queued')}</span></div>}
                                    {isGenerating && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                                            <svg className="animate-spin h-6 w-6 text-cyan-500 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span className="text-xs text-white font-medium mb-2">{t('imageEditor.status.generating')}</span>
                                            <button onClick={(e) => { e.stopPropagation(); onStopFrame(e, index); }} className="px-2 py-0.5 bg-red-600/90 hover:bg-red-700 text-white text-[10px] font-bold rounded shadow-sm border border-red-500/50">Stop Queue</button>
                                        </div>
                                    )}
                                    {isError && <div className="absolute inset-0 flex items-center justify-center bg-red-900/50"><span className="text-xs text-red-200 font-medium">Error</span></div>}
                                    
                                    <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                                        <ActionButton title={t('node.action.copy')} onClick={(e) => onCopyFrame(e, index)} className="p-1 text-gray-200 hover:text-white rounded hover:bg-gray-600 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <rect x="8" y="8" width="12" height="12" rx="2" ry="2" />
                                                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                                            </svg>
                                        </ActionButton>
                                        {isGenerated && <ActionButton title={t('node.action.download')} onClick={(e) => onDownloadFrame(e, index)} className="p-1 text-gray-200 hover:text-white rounded hover:bg-gray-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></ActionButton>}
                                        <ActionButton title={t('imageEditor.action.regenerate')} onClick={(e) => onRegenerateFrame(e, index)} disabled={isEditing} className="p-1 text-gray-200 hover:text-white rounded hover:bg-gray-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></ActionButton>

                                        {showEditActions && (
                                            <ActionButton 
                                                title={isTextConnected ? t('image_sequence.edit_in_source') : t('image_sequence.edit_prompt')} 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (isTextConnected) onEditInSource(index);
                                                    else onEditPrompt(index);
                                                }} 
                                                className="p-1 text-gray-200 hover:text-white rounded hover:bg-gray-600 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </ActionButton>
                                        )}
                                    </div>
                                    
                                    <div className="absolute top-1 left-1 z-20" onClick={(e) => { e.stopPropagation(); onCheckOutput(index); }}>
                                        <input type="checkbox" checked={isChecked} readOnly className="h-4 w-4 rounded bg-gray-900/50 border-gray-500 text-accent focus:ring-accent cursor-pointer" />
                                    </div>
                                    <div className="absolute bottom-1 left-1 right-1 flex justify-between items-end pointer-events-none z-20">
                                        <div>{/* placeholder for aspect ratio badge */}</div>
                                        <div className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">{index + 1}</div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Controls Area: Integrated Model Switcher & Single Mode Buttons */}
            <div className="flex-shrink-0 flex items-center gap-2 mt-2 pt-2 border-t border-gray-700/50">
                {/* Model Switch Toggle (Flash / Pro) */}
                <div className="flex bg-gray-700 rounded-md p-1 space-x-1 h-[36px] flex-shrink-0">
                     <Tooltip content="Gemini 2.5 image (Nano banana)" className="h-full">
                         <button 
                             onClick={() => onUpdateState({ model: 'gemini-2.5-flash-image' })}
                             disabled={isEditing}
                             className={`px-2 text-xs font-bold rounded flex items-center transition-colors h-full ${model === 'gemini-2.5-flash-image' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                         >
                             Flash
                         </button>
                     </Tooltip>
                     <Tooltip content="Gemini 3.0 image (Nano banana pro)" className="h-full">
                         <button 
                             onClick={() => onUpdateState({ model: 'gemini-3-pro-image-preview' })}
                             disabled={isEditing}
                             className={`px-2 text-xs font-bold rounded flex items-center transition-colors h-full ${model === 'gemini-3-pro-image-preview' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                         >
                             Pro
                         </button>
                     </Tooltip>
                </div>

                <div className="flex-1 flex space-x-2">
                    {/* Main Action Button */}
                    {isEditing && isSequenceMode ? (
                        <button onClick={onStop} className="flex-1 h-[36px] font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">{isStopping ? t('node.action.stopping') : t('node.action.stop')}</button>
                    ) : (
                        <button 
                            onClick={isSequenceMode ? onRunSelected : onEdit}
                            disabled={isEditing || (!hasInputImages && !isSequentialEditingWithPrompts) || (!(isTextConnected ? upstreamPrompt : prompt) && !isSequenceMode)} 
                            className="flex-1 h-[36px] font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        >
                            {isEditing ? t('node.content.editing') : (isSequenceMode ? t('image_sequence.run_selected') : t('node.content.applyEdit'))}
                        </button>
                    )}
                    
                    {/* Single Mode: Edit in Canvas Button */}
                    {!isSequenceMode && (
                         <Tooltip content="Edit in Canvas">
                             <button onClick={onOpenEditor} disabled={!outputImage && !imageForEditor} className="h-[36px] px-3 font-bold text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            </button>
                        </Tooltip>
                    )}
                    
                    {/* Sequence Mode: Download Button */}
                    {isSequenceMode && (
                        <button onClick={onDownloadSelected} disabled={checkedSequenceOutputIndices.length === 0} className="flex-1 h-[36px] py-2 text-sm font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                             {createZip ? 'Download ZIP' : `${t('image_sequence.download_selected')} (${checkedSequenceOutputIndices.length})`}
                        </button>
                    )}
                </div>
                
                {/* Single Mode: Output to Input */}
                {!isSequenceMode && outputImage && <ActionButton title={t('node.action.outputToInput')} onClick={onSetOutputToInput} className="h-[36px]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg></ActionButton>}
            </div>
        </div>
    );
};
