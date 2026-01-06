
import React from 'react';
import { PromptLibraryToolbar } from '../../PromptLibraryToolbar';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { LibraryItem } from '../../../types';

interface NoteTabProps {
    text: string;
    onTextChange: (text: string) => void;
    libraryItems: LibraryItem[];
    t: (key: string) => string;
    deselectAllNodes: () => void;
    isMinimal: boolean;
}

export const NoteTab: React.FC<NoteTabProps> = ({
    text,
    onTextChange,
    libraryItems,
    t,
    deselectAllNodes,
    isMinimal
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* Only show Library Toolbar if NOT minimal */}
            {!isMinimal && (
                <div className="flex-shrink-0 mb-1">
                     <PromptLibraryToolbar
                        libraryItems={libraryItems}
                        onPromptInsert={(promptText: string) => {
                            const newText = text ? `${text}\n${promptText}` : promptText;
                            onTextChange(newText);
                        }}
                    />
                </div>
            )}
            
            <DebouncedTextarea
                value={text}
                onDebouncedChange={onTextChange}
                placeholder={t('node.content.notePlaceholder')}
                className="w-full h-full p-2 bg-transparent border-none rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none text-sm leading-relaxed"
                onWheel={e => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={deselectAllNodes}
            />
        </div>
    );
};
