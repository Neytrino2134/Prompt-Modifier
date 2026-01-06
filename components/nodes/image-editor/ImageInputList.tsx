
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { ImageSlot } from './types';

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

interface ImageInputListProps {
    title: string;
    slots: ImageSlot[];
    isB: boolean;
    isEditing: boolean;
    checkedIndices: number[];
    getFullSizeImage: (frameIndex: number) => string | undefined;
    onCheck: (index: number) => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
    onClear: () => void;
    onClick: (index: number) => void;
    // New signature for onReorder
    onReorder: (fromIndex: number, toIndex: number) => void;
    onRemove: (index: number) => void;
    onMoveToB?: (index: number) => void;
    onFileClick: () => void;
    onDropFiles: (files: File[]) => void;
    onDropData: (data: string) => void;
    onSlotDrop: (index: number, fileOrData: File | string) => void;
    t: (key: string) => string;
    isSequentialCombinationMode: boolean;
    onSetCheckedIndices?: (indices: number[]) => void;
    onInvertSelection?: () => void;
}

// Updated Item Size to accommodate header
const ITEM_WIDTH = 120;
const ITEM_HEIGHT = 150; // Header ~24px + Image area
const GAP = 4;

export const ImageInputList: React.FC<ImageInputListProps> = ({
    title,
    slots,
    isB,
    isEditing,
    checkedIndices,
    getFullSizeImage,
    onCheck,
    onSelectAll,
    onSelectNone,
    onClear,
    onClick,
    onReorder,
    onRemove,
    onMoveToB,
    onFileClick,
    onDropFiles,
    onDropData,
    onSlotDrop,
    t,
    isSequentialCombinationMode,
    onSetCheckedIndices,
    onInvertSelection
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    
    // Drag Reorder State
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    // Virtualization State
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Layout Calculations
    const layout = useMemo(() => {
        // Effective width inside padding
        const effectiveWidth = Math.max(0, containerWidth - 8); 
        const columns = Math.max(1, Math.floor((effectiveWidth + GAP) / (ITEM_WIDTH + GAP)));
        const totalItems = slots.length + 1; // +1 for the drop placeholder
        const totalRows = Math.ceil(totalItems / columns);
        const totalHeight = totalRows * (ITEM_HEIGHT + GAP) + GAP;
        return { columns, totalHeight, totalItems };
    }, [containerWidth, slots.length]);

    const getVisibleItems = () => {
        const { columns, totalItems } = layout;
        const buffer = 400; // pixels to render offscreen
        const visibleStart = Math.max(0, scrollTop - buffer);
        const visibleEnd = scrollTop + (containerRef.current?.clientHeight || 500) + buffer;

        const startRow = Math.floor(visibleStart / (ITEM_HEIGHT + GAP));
        const endRow = Math.ceil(visibleEnd / (ITEM_HEIGHT + GAP));
        
        const visibleIndices = [];
        for (let r = startRow; r <= endRow; r++) {
            for (let c = 0; c < columns; c++) {
                const index = (r * columns) + c;
                if (index < totalItems) {
                    visibleIndices.push({
                        index,
                        top: r * (ITEM_HEIGHT + GAP),
                        left: c * (ITEM_WIDTH + GAP)
                    });
                }
            }
        }
        return visibleIndices;
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(true);
        const el = document.getElementById('app-container');
        if (el) el.classList.remove('ring-2', 'ring-cyan-500', 'ring-inset');
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            onDropData(dragImageData);
            return;
        }
        
        const reorderData = e.dataTransfer.getData('image-input-reorder-index');
        if (reorderData) {
            const sourceIndex = parseInt(reorderData, 10);
            if (!isNaN(sourceIndex)) {
                // If dropped on container but not specific slot, move to end
                onReorder(sourceIndex, slots.length);
            }
            setDraggingIndex(null);
            return;
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
            if (files.length > 0) {
                onDropFiles(files);
            }
        }
    };

    const handleSlotDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); e.stopPropagation(); setDragOverSlotIndex(index);
    };
    
    const handleSlotDragLeave = (e: React.DragEvent, index: number) => { 
        e.preventDefault(); e.stopPropagation(); setDragOverSlotIndex(null); 
    };
    
    const handleSlotDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault(); e.stopPropagation(); setDragOverSlotIndex(null);
        
        // Handle Reorder
        const reorderData = e.dataTransfer.getData('image-input-reorder-index');
        if (reorderData) {
            const sourceIndex = parseInt(reorderData, 10);
            if (!isNaN(sourceIndex)) {
                onReorder(sourceIndex, index);
            }
            setDraggingIndex(null);
            return;
        }

        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            onSlotDrop(index, dragImageData);
            return;
        }
        const file = e.dataTransfer.files?.[0];
        if (file && (file as File).type.startsWith('image/')) {
            onSlotDrop(index, file);
        }
    };

    const handleItemDragStart = (e: React.DragEvent, index: number) => {
        if (isEditing) return;
        e.stopPropagation();
        setDraggingIndex(index);
        e.dataTransfer.setData('image-input-reorder-index', index.toString());
        e.dataTransfer.effectAllowed = 'move';
        
        // Create custom drag image ghost? Browser default usually OK.
    };

    const handleSelectRange = () => {
        if (!onSetCheckedIndices) return;
        const start = parseInt(rangeStart, 10);
        const end = parseInt(rangeEnd, 10);
        
        if (isNaN(start)) return;
        
        const effectiveEnd = isNaN(end) ? slots.length : Math.min(end, slots.length);
        const effectiveStart = Math.max(1, start);
        
        if (effectiveStart > effectiveEnd) return;

        const newIndices: number[] = [];
        for(let i = effectiveStart - 1; i < effectiveEnd; i++) {
            newIndices.push(i);
        }
        onSetCheckedIndices(newIndices);
    };
    
    const handlePage = (direction: 'prev' | 'next') => {
        const currentStart = parseInt(rangeStart, 10) || 1;
        const pageSize = 5;
        let pageNum = Math.ceil(currentStart / pageSize);
        if (direction === 'next') pageNum++;
        else pageNum--;
        
        if (pageNum < 1) pageNum = 1;
        
        const newStart = (pageNum - 1) * pageSize + 1;
        const newEnd = Math.min(newStart + pageSize - 1, slots.length);
        
        setRangeStart(newStart.toString());
        setRangeEnd(newEnd.toString());
        
        if (onSetCheckedIndices) {
            const newIndices: number[] = [];
            for(let i = newStart - 1; i < newEnd; i++) {
                newIndices.push(i);
            }
            onSetCheckedIndices(newIndices);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-900/30 p-1 rounded-md border border-gray-700/50">
             <div className="flex flex-col gap-1 mb-1 px-1">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</label>
                    <div className="flex items-center space-x-1">
                        {!isB ? (
                            <>
                                {/* Range Selector */}
                                <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5 border border-gray-700 mr-2">
                                    <button 
                                        className="p-0.5 text-gray-400 hover:text-white transition-colors border-r border-gray-600 pr-1"
                                        onClick={(e) => { e.stopPropagation(); handlePage('prev'); }}
                                        title="Previous 5"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                    <InputWithSpinners 
                                        value={rangeStart}
                                        onChange={setRangeStart}
                                        placeholder="1"
                                        title="Start Index"
                                        className="w-10 border-none" 
                                        min={1}
                                    />
                                    <span className="text-[10px] text-gray-500">-</span>
                                    <InputWithSpinners 
                                        value={rangeEnd}
                                        onChange={setRangeEnd}
                                        placeholder={slots.length.toString()}
                                        title="End Index"
                                        className="w-10 border-none" 
                                        min={1}
                                    />
                                    <button 
                                        className="p-0.5 text-gray-400 hover:text-white transition-colors border-l border-gray-600 pl-1"
                                        onClick={(e) => { e.stopPropagation(); handlePage('next'); }}
                                        title="Next 5"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
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

                                    <div className="w-px h-3 bg-gray-600 mx-1"></div>

                                    <ActionButton title={t('image_sequence.select_all')} onClick={onSelectAll} disabled={slots.length === 0 || isEditing}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${slots.length === 0 || isEditing ? 'text-gray-600' : 'text-gray-300 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </ActionButton>
                                    <ActionButton title={t('image_sequence.select_none')} onClick={onSelectNone} disabled={!checkedIndices || checkedIndices.length === 0 || isEditing}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${(!checkedIndices || checkedIndices.length === 0 || isEditing) ? 'text-gray-600' : 'text-gray-300 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </ActionButton>
                                    {onInvertSelection && (
                                        <ActionButton title={t('image_sequence.invert_selection')} onClick={onInvertSelection} disabled={slots.length === 0 || isEditing}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${slots.length === 0 || isEditing ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        </ActionButton>
                                    )}

                                    <div className="w-px h-3 bg-gray-600 mx-1"></div>
                                    
                                    <ActionButton title={t('node.action.clear')} onClick={onClear} disabled={slots.length === 0 || isEditing}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${slots.length === 0 || isEditing ? 'text-gray-600' : 'text-gray-300 hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </ActionButton>
                                </div>
                            </>
                        ) : (
                             <ActionButton title={t('node.action.clear')} onClick={onClear} disabled={slots.length === 0 || isEditing}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${slots.length === 0 || isEditing ? 'text-gray-600' : 'text-gray-300 hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </ActionButton>
                        )}
                     </div>
                 </div>
             </div>
             
             {/* Virtualized Grid */}
             <div
                ref={containerRef}
                className="bg-gray-900/50 rounded-md overflow-y-auto p-1 min-h-0 flex-grow custom-scrollbar relative"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                onWheel={e => e.stopPropagation()}
            >
                <div style={{ height: layout.totalHeight, width: '100%', position: 'relative' }}>
                    {getVisibleItems().map(({ index, top, left }) => {
                        // Render Placeholder as the last item
                        if (index === slots.length) {
                             return (
                                <div
                                    key="placeholder"
                                    style={{ position: 'absolute', top, left, width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                                    onClick={() => !isEditing && onFileClick()}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`bg-transparent rounded-md flex items-center justify-center cursor-pointer border-2 border-dashed transition-colors ${isDragOver ? 'border-cyan-500 bg-gray-700/50' : 'border-gray-600 hover:border-cyan-500 hover:bg-gray-700/50'} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="text-center text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        <span className="text-[10px] mt-1 block">{t('node.content.dropOrClick')}</span>
                                    </div>
                                </div>
                             );
                        }

                        const slot = slots[index];
                        const isChecked = !isB ? (!checkedIndices || checkedIndices.includes(index)) : true;
                        const cacheIndex = (isB ? 2000 : 0) + slot.index + 1;
                        const fullRes = slot.type === 'local' ? getFullSizeImage(cacheIndex) : slot.src;

                        // Unified Rendering for Local & Connected (Similar UI for dragging connected images if supported)
                        const isOver = dragOverSlotIndex === slot.index && (!isB || slot.type === 'local');
                        
                        return (
                            <div 
                                key={`${slot.type}-${isB ? 'b' : 'a'}-${slot.index}`} 
                                style={{ position: 'absolute', top, left, width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                                className={`relative group border-2 flex flex-col rounded-md overflow-visible bg-gray-800 transition-colors ${isOver ? 'border-cyan-500 z-10' : 'border-gray-700 hover:border-gray-600'}`}
                                onDragOver={(e) => handleSlotDragOver(e, slot.index)}
                                onDragLeave={(e) => handleSlotDragLeave(e, slot.index)}
                                onDrop={(e) => handleSlotDrop(e, slot.index)}
                            >
                                {/* Header / Handle */}
                                <div 
                                    className={`h-6 bg-gray-900/80 border-b border-gray-700 flex items-center justify-between px-1 cursor-grab active:cursor-grabbing`}
                                    draggable={slot.type === 'local' && !isEditing}
                                    onDragStart={(e) => slot.type === 'local' ? handleItemDragStart(e, index) : e.preventDefault()}
                                >
                                     <div className="flex items-center space-x-1">
                                        {!isB && slot.type === 'local' && (
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                disabled={isEditing}
                                                readOnly
                                                onClick={(e) => { e.stopPropagation(); onCheck(index); }}
                                                className="h-3 w-3 rounded bg-gray-900 border-gray-500 text-accent focus:ring-0 cursor-pointer disabled:opacity-50"
                                            />
                                        )}
                                        <span className="text-[10px] font-mono text-gray-400">#{index + 1}</span>
                                     </div>
                                     
                                     {slot.type === 'local' && !isEditing && (
                                         <div className="flex items-center gap-0.5">
                                             <button onClick={(e) => { e.stopPropagation(); onReorder(index, 0); }} className="text-gray-500 hover:text-white p-0.5" title="Top">
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                                             </button>
                                             <button onClick={(e) => { e.stopPropagation(); onReorder(index, index - 1); }} className="text-gray-500 hover:text-white p-0.5" title="Up">
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 15l7-7 7 7" /></svg>
                                             </button>
                                             <button onClick={(e) => { e.stopPropagation(); onReorder(index, index + 1); }} className="text-gray-500 hover:text-white p-0.5" title="Down">
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
                                             </button>
                                             <button onClick={(e) => { e.stopPropagation(); onReorder(index, slots.length); }} className="text-gray-500 hover:text-white p-0.5" title="Bottom">
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                             </button>
                                             <div className="w-px h-3 bg-gray-700 mx-0.5"></div>
                                             <button onClick={(e) => { e.stopPropagation(); onRemove(slot.index); }} className="text-gray-500 hover:text-red-400 p-0.5" title="Remove">
                                                 <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                             </button>
                                         </div>
                                     )}
                                </div>

                                {/* Image Content */}
                                <div 
                                    className="flex-grow relative cursor-pointer overflow-hidden bg-black/40"
                                    onClick={() => onClick(index)} 
                                >
                                    {slot.src ? (
                                        <img 
                                            src={slot.src || ''} 
                                            alt={`Input ${index + 1}`} 
                                            className={`object-contain w-full h-full ${!isChecked && slot.type === 'local' ? 'opacity-50' : ''}`}
                                            onMouseDown={(e) => e.stopPropagation()} 
                                            draggable={true} 
                                            onDragStart={(e) => { 
                                                const dragSrc = fullRes || slot.src;
                                                if (dragSrc) {
                                                    e.dataTransfer.setData('application/prompt-modifier-drag-image', dragSrc); 
                                                    e.dataTransfer.effectAllowed = 'copy'; 
                                                    e.stopPropagation(); 
                                                }
                                            }} 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs">No Image</div>
                                    )}
                                    
                                    {/* Additional Overlays for Connected type if needed */}
                                    {slot.type === 'connected' && (
                                         <div className="absolute top-1 right-1 pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        </div>
                                    )}

                                    {!isB && isSequentialCombinationMode && onMoveToB && slot.type === 'local' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onMoveToB(slot.index); }} 
                                            disabled={isEditing} 
                                            className="absolute bottom-1 right-1 p-1 bg-gray-900/80 rounded text-gray-300 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                                            title="Move to Input B"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
