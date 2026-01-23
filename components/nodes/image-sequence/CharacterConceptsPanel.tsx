
import React, { useRef, useState } from 'react';
import { CharacterConceptEditor } from './CharacterConceptEditor';
import { CharacterConcept } from '../../../types';
import { ActionButton } from '../../ActionButton';

interface CharacterConceptsPanelProps {
    allConcepts: any[];
    characterConcepts: CharacterConcept[]; // Local state
    conceptSortOrder: string[];
    onUpdateConcept: (index: number, updates: Partial<CharacterConcept>, isConnected: boolean, uniqueKey?: string) => void;
    onDeleteConcept: (index: number) => void;
    onMoveConcept: (index: number, direction: 'up' | 'down') => void;
    onAddConcept: () => void;
    onDetachConnectedConcept: (concept: any) => void;
    onClearConcepts: () => void; 
    handleViewImage: (url: string) => void;
    t: (key: string) => string;
    deselectAllNodes: () => void;
    conceptsMode?: 'normal' | 'collapsed' | 'expanded';
    onToggleMode?: (mode: 'normal' | 'collapsed' | 'expanded') => void;
    duplicateIndices?: Set<string>;
    onCopyImageToClipboard?: (src: string) => void; // Added
    onDownloadImageFromUrl?: (url: string, frameNumber: number, prompt: string, filename?: string) => void; // Added
}

export const CharacterConceptsPanel: React.FC<CharacterConceptsPanelProps> = ({
    allConcepts,
    onUpdateConcept,
    onDeleteConcept,
    onMoveConcept,
    onAddConcept,
    onDetachConnectedConcept,
    onClearConcepts,
    handleViewImage,
    t,
    deselectAllNodes,
    conceptsMode = 'normal',
    onToggleMode,
    duplicateIndices = new Set(),
    onCopyImageToClipboard,
    onDownloadImageFromUrl
}) => {
    const [isDragOverAdd, setIsDragOverAdd] = useState(false);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragOverAdd(true);
    };

    const handleDropOnAddConcept = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverAdd(false);
        onAddConcept(); 
    };

    // Header click handler for collapsing/expanding
    const handleHeaderClick = (e: React.MouseEvent) => {
        if (!onToggleMode) return;
        // If user clicks directly on the header background (not buttons)
        if (conceptsMode === 'collapsed') {
            onToggleMode('normal');
        } else {
            onToggleMode('collapsed');
        }
    };

    // Calculate start index of local items for move logic
    const firstLocalIndex = allConcepts.findIndex(c => !c.isConnected);

    return (
        <div className="flex-shrink-0 flex flex-col h-full bg-gray-900/30 rounded-t-md overflow-hidden">
             {/* Header */}
            <div 
                className="flex items-center justify-between p-2 bg-gray-800/80 border-b border-gray-700 select-none cursor-pointer hover:bg-gray-700/80 transition-colors"
                onClick={handleHeaderClick}
                title="Click to toggle collapse"
            >
                 <div className="flex items-center space-x-2">
                    <h3 className={`text-sm font-bold ${duplicateIndices.size > 0 ? 'text-red-400' : 'text-gray-300'} flex-shrink-0`}>
                        {t('node.content.characterConcepts')}
                        {duplicateIndices.size > 0 && <span className="ml-2 text-[10px] bg-red-900/40 px-1 rounded uppercase">предупреждение одинаковый индекс</span>}
                    </h3>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ActionButton title="Clear All (Local & Connected)" onClick={onClearConcepts}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </ActionButton>
                    </div>
                 </div>
                 
                 {onToggleMode && (
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        {conceptsMode === 'expanded' ? (
                             <button onClick={() => onToggleMode('normal')} className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors" title="Restore size">
                                {/* Restore Icon - Inward Arrows */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                             </button>
                        ) : (
                             <button onClick={() => onToggleMode('expanded')} className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors" title="Expand to full height">
                                {/* Expand Icon - Outward Arrows */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                             </button>
                        )}
                        
                        {conceptsMode === 'collapsed' ? (
                            <button onClick={() => onToggleMode('normal')} className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors" title="Expand Panel">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        ) : (
                            <button onClick={() => onToggleMode('collapsed')} className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors" title="Collapse Panel">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            </button>
                        )}
                    </div>
                 )}
            </div>

            {conceptsMode !== 'collapsed' && (
                <div 
                    className="bg-gray-900/50 p-2 overflow-y-auto grid gap-2 custom-scrollbar flex-grow min-h-0"
                    style={{
                        gridTemplateColumns: 'repeat(auto-fill, 240px)',
                        gridAutoRows: '340px',
                        justifyContent: 'start'
                    }}
                    onWheel={e => e.stopPropagation()}
                >
                    {allConcepts.map((concept: any, index: number) => {
                        // Check ID instead of name for duplication
                        const hasError = duplicateIndices.has((concept.id || '').trim());
                        
                        return (
                        <div key={concept.uniqueKey || index} className="h-full w-full">
                            <CharacterConceptEditor 
                                concept={{
                                    id: concept.id,
                                    name: concept.name,
                                    prompt: concept.prompt,
                                    image: concept.image,
                                    fullDescription: concept.fullDescription,
                                    isConnected: concept.isConnected
                                }}
                                displayImage={concept.image}
                                fullResImage={concept._fullResImage || concept.image} 
                                isReadOnly={false} 
                                onUpdate={(updates) => onUpdateConcept(index, updates, concept.isConnected, concept.uniqueKey)}
                                onDelete={() => onDeleteConcept(index)}
                                onMoveUp={() => onMoveConcept(index, 'up')}
                                onMoveDown={() => onMoveConcept(index, 'down')}
                                // Disable Move Up if it's the first *local* item (can't move above upstream)
                                isFirst={index === 0 || (index === firstLocalIndex && !concept.isConnected)}
                                isLast={index === allConcepts.length - 1}
                                onDetach={() => onDetachConnectedConcept(concept)}
                                onViewImage={handleViewImage}
                                t={t}
                                hasError={hasError}
                                onCopyImage={() => {
                                    const src = concept._fullResImage || concept.image;
                                    if(src && onCopyImageToClipboard) onCopyImageToClipboard(src);
                                }}
                                onDownloadImage={() => {
                                    const src = concept._fullResImage || concept.image;
                                    if(src && onDownloadImageFromUrl) {
                                        const safeName = (concept.name || 'concept').replace(/\s+/g, '_');
                                        onDownloadImageFromUrl(src, 0, concept.prompt || safeName, `${safeName}.png`);
                                    }
                                }}
                            />
                        </div>
                    )})}
                    <button
                        onClick={onAddConcept}
                        onDragEnter={handleDragEnter}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverAdd(true); }}
                        onDragLeave={() => setIsDragOverAdd(false)}
                        onDrop={handleDropOnAddConcept}
                        className={`h-[340px] bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center text-gray-400 text-4xl transition-all ${isDragOverAdd ? 'ring-2 ring-cyan-400' : ''}`}
                    >+</button>
                </div>
            )}
        </div>
    );
};
