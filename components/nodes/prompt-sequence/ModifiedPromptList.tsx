
import React, { useRef, useState, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { PromptCard } from './PromptCard';
import { usePromptVirtualization } from './usePromptVirtualization';

interface ModifiedPromptListProps {
    prompts: any[];
    collapsedScenes: number[];
    isLinked: boolean;
    onUpdatePrompts: (updates: any) => void;
    t: (key: string) => string;
    onToggleCollapse: (frame: number) => void;
    onToggleScene: (scene: number) => void;
    // Specific Actions
    onMoveToSource: (frame: number) => void;
    onMoveAllToSource: () => void;
    onClear: () => void;
}

export const ModifiedPromptList: React.FC<ModifiedPromptListProps> = ({
    prompts,
    collapsedScenes,
    isLinked,
    onUpdatePrompts,
    t,
    onToggleCollapse,
    onToggleScene,
    onMoveToSource,
    onMoveAllToSource,
    onClear
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(800);

    // Track container height for virtualization
    useEffect(() => {
        if (!listRef.current) return;
        const updateHeight = () => {
            if (listRef.current) {
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
        visibleItems 
    } = usePromptVirtualization(prompts, collapsedScenes, scrollTop, containerHeight);

    // Batch Actions
    const areAllScenesCollapsed = groupedPrompts.length > 0 && groupedPrompts.every(g => collapsedScenes.includes(g.scene));
    const handleToggleAllScenes = () => {
        const allScenes = groupedPrompts.map(g => g.scene);
        onUpdatePrompts({ collapsedModifiedScenes: areAllScenesCollapsed ? [] : allScenes });
    };

    const areAllPromptsCollapsed = prompts.every(p => p.isCollapsed);
    const handleToggleAllPrompts = () => {
        onUpdatePrompts({ modifiedPrompts: prompts.map(p => ({ ...p, isCollapsed: !areAllPromptsCollapsed })) });
    };

    const handleUpdatePrompt = (frameNumber: number, updates: any) => {
        const newPrompts = prompts.map(p => p.frameNumber === frameNumber ? { ...p, ...updates } : p);
        onUpdatePrompts({ modifiedPrompts: newPrompts });
    };

    return (
        <div className="flex-grow flex flex-col space-y-2 min-h-0">
             <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="text-sm font-bold text-gray-300">{t('prompt_sequence_editor.finalPrompts')}</h3>
                <div className="flex items-center space-x-1">
                    <ActionButton title="Move All to Source" onClick={onMoveAllToSource} disabled={prompts.length === 0 || !!isLinked}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </ActionButton>
                     <ActionButton title={areAllScenesCollapsed ? "Expand Scenes" : "Collapse Scenes"} onClick={handleToggleAllScenes}>
                        {areAllScenesCollapsed 
                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                        }
                    </ActionButton>
                    <ActionButton title={areAllPromptsCollapsed ? "Expand Prompts" : "Collapse Prompts"} onClick={handleToggleAllPrompts} disabled={areAllScenesCollapsed}>
                         {areAllPromptsCollapsed 
                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                        }
                    </ActionButton>
                    <ActionButton title="Clear Modified" onClick={onClear} disabled={prompts.length === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </ActionButton>
                </div>
            </div>

            <div 
                ref={listRef}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                className="flex-grow min-h-0 bg-gray-900/50 p-2 rounded-md overflow-y-auto scrollbar-gutter-stable"
                onWheel={e => e.stopPropagation()}
            >
                {prompts.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">Результат появится здесь.</div>
                ) : (
                    <div style={{ height: totalHeight, position: 'relative' }}>
                         {visibleItems.map((item: any) => {
                            if (item.type === 'scene_header') {
                                const group = item.data;
                                const isSceneCollapsed = collapsedScenes.includes(group.scene);
                                return (
                                    <div 
                                        key={`mod-header-${group.scene}`} 
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
                            } else {
                                 const p = item.data;
                                 return (
                                   <div 
                                       key={`modified-${p.frameNumber}`}
                                       style={{ position: 'absolute', top: item.top, left: 0, right: 0, height: item.h }}
                                       className="pl-2 border-l-2 border-gray-700 ml-2"
                                   >
                                       <PromptCard
                                            index={p.frameNumber}
                                            frameNumber={p.frameNumber}
                                            sceneNumber={p.sceneNumber}
                                            prompt={p.prompt}
                                            videoPrompt={p.videoPrompt}
                                            shotType={p.shotType}
                                            characters={p.characters}
                                            duration={p.duration || 0}
                                            isModified={true}
                                            isSelected={false}
                                            isCollapsed={p.isCollapsed ?? false}
                                            onSelect={() => {}}
                                            onChange={handleUpdatePrompt}
                                            onCopy={(txt) => navigator.clipboard.writeText(txt)}
                                            t={t}
                                            readOnly={false}
                                            onToggleCollapse={() => onToggleCollapse(p.frameNumber)}
                                            onMoveToSource={() => onMoveToSource(p.frameNumber)}
                                       />
                                   </div>
                               );
                            }
                         })}
                    </div>
                )}
            </div>
        </div>
    );
};
