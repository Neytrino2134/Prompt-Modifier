
import React from 'react';
import { PromptLibraryToolbar } from '../../PromptLibraryToolbar';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { LibraryItem } from '../../../types';
import { NoteStyle } from '../NoteNode';
import { AlignLeftIcon, AlignCenterXIcon, AlignRightIcon } from '../../icons/AppIcons';

interface NoteTabProps {
    text: string;
    style: NoteStyle;
    onTextChange: (text: string) => void;
    onStyleChange: (styleUpdates: Partial<NoteStyle>) => void;
    libraryItems: LibraryItem[];
    t: (key: string) => string;
    deselectAllNodes: () => void;
    isMinimal: boolean;
}

// Compact Color Dot
const ColorDot: React.FC<{ color: string; selected: boolean; onClick: () => void }> = ({ color, selected, onClick }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-4 h-4 rounded-full border border-gray-600 transition-transform ${selected ? 'scale-125 ring-2 ring-white border-transparent' : 'hover:scale-110'}`}
        style={{ backgroundColor: color }}
    />
);

export const NoteTab: React.FC<NoteTabProps> = ({
    text,
    style,
    onTextChange,
    onStyleChange,
    libraryItems,
    t,
    deselectAllNodes,
    isMinimal
}) => {
    const colors = [
        '#ffffff', // White
        '#9ca3af', // Gray
        '#ef4444', // Red
        '#f97316', // Orange
        '#facc15', // Yellow
        '#22d3ee', // Cyan
        '#3b82f6', // Blue
        '#a855f7', // Purple
        '#10b981', // Green
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Area */}
            {!isMinimal && (
                <div className="flex-shrink-0 flex flex-col gap-1 mb-1">
                     <PromptLibraryToolbar
                        libraryItems={libraryItems}
                        onPromptInsert={(promptText: string) => {
                            const newText = text ? `${text}\n${promptText}` : promptText;
                            onTextChange(newText);
                        }}
                    />

                    {/* Formatting Toolbar */}
                    <div className="flex items-center justify-between bg-gray-800/80 p-1.5 rounded-md border border-gray-700/50">
                        {/* Font Size */}
                        <div className="flex items-center gap-1 bg-gray-900 rounded p-0.5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onStyleChange({ fontSize: Math.max(10, style.fontSize - 2) }); }}
                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700 transition-colors text-xs"
                            >
                                -
                            </button>
                            <span className="text-[10px] w-5 text-center text-gray-300 font-mono select-none">{style.fontSize}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onStyleChange({ fontSize: Math.min(72, style.fontSize + 2) }); }}
                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 rounded hover:bg-gray-700 transition-colors text-xs"
                            >
                                +
                            </button>
                        </div>

                        <div className="w-px h-4 bg-gray-700 mx-1"></div>

                        {/* Styles */}
                        <div className="flex items-center gap-1">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onStyleChange({ isBold: !style.isBold }); }}
                                className={`w-5 h-5 flex items-center justify-center rounded text-xs font-serif font-bold transition-colors ${style.isBold ? 'bg-gray-200 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            >
                                B
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onStyleChange({ isItalic: !style.isItalic }); }}
                                className={`w-5 h-5 flex items-center justify-center rounded text-xs font-serif italic transition-colors ${style.isItalic ? 'bg-gray-200 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            >
                                I
                            </button>
                        </div>

                         <div className="w-px h-4 bg-gray-700 mx-1"></div>

                         {/* Alignment */}
                         <div className="flex items-center gap-0.5">
                             <button onClick={(e) => {e.stopPropagation(); onStyleChange({ textAlign: 'left' })}} className={`p-1 rounded ${style.textAlign === 'left' ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'}`}><AlignLeftIcon /></button>
                             <button onClick={(e) => {e.stopPropagation(); onStyleChange({ textAlign: 'center' })}} className={`p-1 rounded ${style.textAlign === 'center' ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'}`}><AlignCenterXIcon /></button>
                             <button onClick={(e) => {e.stopPropagation(); onStyleChange({ textAlign: 'right' })}} className={`p-1 rounded ${style.textAlign === 'right' ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'}`}><AlignRightIcon /></button>
                         </div>

                         <div className="w-px h-4 bg-gray-700 mx-1"></div>

                         {/* Colors */}
                         <div className="flex items-center gap-1">
                             {colors.slice(0, 5).map(c => (
                                 <ColorDot key={c} color={c} selected={style.color === c} onClick={() => onStyleChange({ color: c })} />
                             ))}
                             {/* Show remaining colors only on larger nodes or implement a dropdown/popover if needed. For now sticking to essentials to fit. */}
                             {/* Or just show first 5 and maybe cycle? Let's just fit as many as possible */}
                             {colors.slice(5).map(c => (
                                 <ColorDot key={c} color={c} selected={style.color === c} onClick={() => onStyleChange({ color: c })} />
                             ))}
                         </div>
                    </div>
                </div>
            )}
            
            <DebouncedTextarea
                value={text}
                onDebouncedChange={onTextChange}
                placeholder={t('node.content.notePlaceholder')}
                className="w-full h-full p-2 bg-transparent border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none leading-relaxed transition-all"
                style={{
                    fontSize: `${style.fontSize}px`,
                    color: style.color,
                    fontWeight: style.isBold ? 'bold' : 'normal',
                    fontStyle: style.isItalic ? 'italic' : 'normal',
                    textAlign: style.textAlign
                }}
                onWheel={e => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={deselectAllNodes}
            />
        </div>
    );
};
