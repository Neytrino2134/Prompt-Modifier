


import React from 'react';
import { ActionButton } from '../../ActionButton';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { CopyIcon } from '../../icons/AppIcons';

interface ReferenceItemCardProps {
    id: string;
    index: number;
    image: string | null;
    caption: string;
    manualOrderValue: string;
    isLocked: boolean; // True if connected to upstream
    isDragging: boolean;
    isSelected: boolean;
    top: number;
    left: number;
    width: number;
    height: number;
    
    // Handlers
    onSelect: (id: string) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void; // Added onDragEnd
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onManualOrderChange: (id: string, val: string) => void;
    onManualOrderSubmit: (id: string, index: number, val: string) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    onMoveToStart: () => void;
    onMoveToEnd: () => void;
    onRemove: (id: string) => void;
    onCaptionChange: (id: string, val: string) => void;
    onViewImage: (index: number) => void;
    onCopyImage: (image: string) => void;
    onImageDragStart: (e: React.DragEvent, image: string) => void;
    deselectAllNodes: () => void;
    isFirst: boolean;
    isLast: boolean;
    insertionIndex: number | null;
    t: (key: string) => string;
}

export const ReferenceItemCard: React.FC<ReferenceItemCardProps> = ({
    id, index, image, caption, manualOrderValue, isLocked, isDragging, isSelected,
    top, left, width, height,
    onSelect, onDragStart, onDragEnd, onDrop, onDragOver, onManualOrderChange, onManualOrderSubmit,
    onMove, onMoveToStart, onMoveToEnd, onRemove, onCaptionChange, onViewImage, onCopyImage, onImageDragStart,
    deselectAllNodes, isFirst, isLast, insertionIndex, t
}) => {
    return (
        <div 
            style={{ position: 'absolute', top, left, width: `${width}px`, height: `${height}px` }}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
            onClick={(e) => { e.stopPropagation(); onSelect(id); }}
            className={`bg-gray-800 rounded-md overflow-visible border-2 group flex flex-col shadow-sm transition-colors ${isDragging ? 'opacity-40 border-dashed border-cyan-500' : (isSelected ? 'border-cyan-500' : 'border-gray-700 hover:border-gray-500')}`}
        >
            {insertionIndex === index && !isLocked && (
                <div className="absolute left-[-10px] top-0 bottom-0 w-1.5 bg-cyan-500 rounded z-50 pointer-events-none"></div>
            )}

            <div 
                draggable={!isLocked}
                onDragStart={(e) => onDragStart(e, index)}
                onDragEnd={onDragEnd}
                className={`h-7 bg-gray-900/80 border-b border-gray-700 flex items-center justify-between px-2 ${isLocked ? 'cursor-default' : 'cursor-move hover:bg-gray-700/50'} transition-colors shrink-0 rounded-t-sm`}
            >
                <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 font-mono">#</span>
                    <input
                        type="text"
                        value={manualOrderValue}
                        onChange={(e) => onManualOrderChange(id, e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') onManualOrderSubmit(id, index, manualOrderValue); }}
                        disabled={isLocked}
                        className={`w-8 bg-gray-900 border border-gray-600 rounded text-[10px] text-center text-gray-300 focus:border-cyan-500 focus:outline-none px-0.5 py-0.5 ${isLocked ? 'opacity-50' : ''}`}
                        onMouseDown={e => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                    {!isLocked && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onManualOrderSubmit(id, index, manualOrderValue); }}
                            className="text-gray-500 hover:text-cyan-400 p-0.5 rounded transition-colors"
                            title="Apply Order"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    )}
                </div>
                
                <div className="flex items-center space-x-1">
                     {image && (
                         <button 
                             onClick={(e) => { e.stopPropagation(); onCopyImage(image); }}
                             className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
                             title={t('node.action.copy')}
                         >
                            <CopyIcon className="h-3 w-3" />
                         </button>
                     )}
                     
                     {!isLocked && (
                        <>
                             <button onClick={(e) => { e.stopPropagation(); onMoveToStart(); }} disabled={isFirst} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5" title="Move to Top">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }} disabled={isFirst} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5" title="Move Up">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }} disabled={isLast} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5" title="Move Down">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); onMoveToEnd(); }} disabled={isLast} className="text-gray-500 hover:text-white disabled:opacity-30 p-0.5" title="Move to Bottom">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                             </button>
                             <div className="w-px h-3 bg-gray-700 mx-1"></div>
                             <button onClick={(e) => { e.stopPropagation(); onRemove(id); }} className="text-gray-500 hover:text-red-400 p-0.5" title={t('node.action.delete')}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                        </>
                     )}
                </div>
            </div>

            <div 
                className="h-[170px] bg-gray-900 relative cursor-pointer flex items-center justify-center shrink-0 border-b border-gray-700 overflow-hidden" 
                onClick={() => onViewImage(index)}
            >
                {image ? (
                    <img 
                        src={image} 
                        alt="Reference" 
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); onImageDragStart(e, image); }}
                        className="w-full h-full object-contain" 
                    />
                ) : (
                    <span className="text-xs text-gray-600">No Image</span>
                )}
            </div>
            <div className="flex-grow p-1">
                <DebouncedTextarea
                    value={caption}
                    onDebouncedChange={(val) => onCaptionChange(id, val)}
                    placeholder={t('node.note.addCaption')}
                    className={`w-full h-full bg-transparent text-xs text-gray-300 border-none focus:ring-0 p-1 placeholder-gray-600 resize-none leading-tight focus:outline-none transition-colors ${isLocked ? 'cursor-default opacity-80' : ''}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={deselectAllNodes}
                    readOnly={isLocked}
                />
            </div>
        </div>
    );
};