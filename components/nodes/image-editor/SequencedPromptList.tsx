
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { ActionButton } from '../../ActionButton';

export interface SequencedPromptListRef {
    scrollToIndex: (index: number) => void;
}

interface SequencedPromptListProps {
    totalFrames: number;
    framePrompts: Record<number, string>;
    globalPrompt: string;
    onChange: (index: number, val: string) => void;
    upstreamPrompts?: Map<number, string>;
    t: (key: string) => string;
    visibleIndices?: number[];
    onAddFrame?: () => void;
    onSync?: () => void;
    onDeleteFrame?: (index: number) => void;
    onMoveFrame?: (from: number, to: number) => void;
    onSelectFrame?: (index: number) => void;
    onClearAll?: () => void; // New Prop
    selectedFrameIndex?: number | null;
}

export const SequencedPromptList = forwardRef<SequencedPromptListRef, SequencedPromptListProps>(({
    totalFrames,
    framePrompts,
    globalPrompt,
    onChange,
    upstreamPrompts,
    t,
    visibleIndices,
    onAddFrame,
    onSync,
    onDeleteFrame,
    onMoveFrame,
    onSelectFrame,
    onClearAll, // Destructured
    selectedFrameIndex
}, ref) => {
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isUpstreamConnected = upstreamPrompts && upstreamPrompts.size > 0;

    useImperativeHandle(ref, () => ({
        scrollToIndex: (index: number) => {
            const el = itemRefs.current[index];
            if (el && listRef.current) {
                // Scroll into view logic
                const container = listRef.current;
                const top = el.offsetTop;
                const bottom = top + el.offsetHeight;
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;

                if (top < containerTop || bottom > containerBottom) {
                     el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }));

    // Create a range of indices to render
    const frames = Array.from({ length: Math.max(1, totalFrames) }, (_, i) => i);
    
    // Filter frames based on visibility (checkboxes in input), UNLESS we are in prompt-editing mode where we usually want to see all or specific
    const framesToRender = visibleIndices 
        ? frames.filter(i => visibleIndices.includes(i))
        : frames;

    return (
        <div className="flex-grow flex flex-col bg-gray-900/30 rounded-md border border-gray-700/50 overflow-hidden h-full">
             <div className="flex justify-between items-center p-1 bg-gray-800/80 border-b border-gray-700/50 flex-shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase px-1">{t('prompt_sequence_editor.sourcePrompts') || "Source Prompts"}</span>
                  
                  {isUpstreamConnected ? (
                      <div className="flex items-center">
                           <ActionButton 
                                title="Copy Upstream Prompts to Local" 
                                onClick={(e) => { e.stopPropagation(); onSync && onSync(); }}
                                className="p-1 hover:bg-cyan-900/50 rounded text-cyan-400 hover:text-cyan-200 transition-colors"
                           >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                           </ActionButton>
                      </div>
                  ) : (
                      <div className="flex items-center space-x-1">
                          {/* Delete Selected Button */}
                          {onDeleteFrame && (
                              <ActionButton 
                                title="Delete Selected Frame" 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (selectedFrameIndex !== null && selectedFrameIndex !== undefined) {
                                        onDeleteFrame(selectedFrameIndex);
                                    }
                                }}
                                disabled={selectedFrameIndex === null || selectedFrameIndex === undefined}
                                className={`p-1 rounded transition-colors ${selectedFrameIndex !== null && selectedFrameIndex !== undefined ? 'hover:bg-red-900/50 text-gray-400 hover:text-red-400' : 'text-gray-600 cursor-not-allowed'}`}
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                              </ActionButton>
                          )}

                          {/* Clear All Button */}
                          {onClearAll && (
                              <ActionButton 
                                title="Clear All Prompts" 
                                onClick={(e) => { e.stopPropagation(); onClearAll(); }}
                                className="p-1 hover:bg-red-900/50 rounded text-gray-500 hover:text-red-500 transition-colors"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                              </ActionButton>
                          )}
                          
                          <div className="w-px h-3 bg-gray-600 mx-1"></div>
                          
                          {/* Add Frame Button */}
                          {onAddFrame && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddFrame(); }}
                                className="p-1 hover:bg-gray-700 rounded text-cyan-400 hover:text-white transition-colors"
                                title="Add Prompt Slot"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                          )}
                      </div>
                  )}
             </div>
            
            <div 
                ref={listRef}
                className="overflow-y-auto custom-scrollbar p-2 space-y-2 flex-grow min-h-0"
                onWheel={(e) => e.stopPropagation()}
            >
                {framesToRender.map((index) => {
                    // Resolution Priority: Upstream -> Local Frame -> Global
                    const upstreamVal = upstreamPrompts?.get(index + 1); // Upstream is 1-based usually
                    const localVal = framePrompts[index];
                    
                    const displayValue = isUpstreamConnected ? (upstreamVal || '') : (localVal !== undefined ? localVal : globalPrompt);
                    const isPlaceholder = !isUpstreamConnected && localVal === undefined && !!globalPrompt;
                    
                    const isSelected = selectedFrameIndex === index;

                    return (
                        <div 
                            key={index} 
                            ref={el => { itemRefs.current[index] = el; }}
                            className={`flex flex-col bg-gray-800 rounded border transition-colors ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-gray-700'}`}
                            onClick={() => onSelectFrame && onSelectFrame(index)}
                        >
                            <div className="flex items-center justify-between px-2 py-1 bg-gray-700/50 border-b border-gray-600/30 h-7">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Frame {index + 1}</span>
                                
                                {!isUpstreamConnected && onMoveFrame && onDeleteFrame && (
                                    <div className="flex items-center space-x-0.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onMoveFrame(index, 0); }} 
                                            className="p-0.5 text-gray-500 hover:text-white rounded" 
                                            title="Move to Top"
                                        >
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onMoveFrame(index, index - 1); }} 
                                            disabled={index === 0}
                                            className="p-0.5 text-gray-500 hover:text-white rounded disabled:opacity-30" 
                                            title="Move Up"
                                        >
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onMoveFrame(index, index + 1); }} 
                                            disabled={index === totalFrames - 1}
                                            className="p-0.5 text-gray-500 hover:text-white rounded disabled:opacity-30" 
                                            title="Move Down"
                                        >
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onMoveFrame(index, totalFrames); }} 
                                            className="p-0.5 text-gray-500 hover:text-white rounded" 
                                            title="Move to Bottom"
                                        >
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                        </button>
                                        <div className="w-px h-3 bg-gray-600 mx-1"></div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteFrame(index); }} 
                                            className="p-0.5 text-gray-500 hover:text-red-400 rounded" 
                                            title="Delete Frame"
                                        >
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <DebouncedTextarea
                                value={displayValue}
                                onDebouncedChange={(val) => !isUpstreamConnected && onChange(index, val)}
                                placeholder={globalPrompt || t('node.content.editPromptPlaceholder')}
                                className={`w-full p-2 bg-transparent border-none rounded-b resize-none focus:outline-none text-xs min-h-[60px] ${isPlaceholder ? 'text-gray-500 italic' : 'text-gray-200'}`}
                                readOnly={isUpstreamConnected}
                                onWheel={e => e.stopPropagation()}
                                onMouseDown={e => e.stopPropagation()}
                            />
                        </div>
                    );
                })}
                {totalFrames === 0 && (
                    <div className="text-center text-gray-500 text-xs py-4">
                        Add input images or prompts to define frames.
                    </div>
                )}
            </div>
        </div>
    );
});
