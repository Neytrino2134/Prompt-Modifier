
import React from 'react';
import type { NodeContentProps } from '../../types';
import { useLanguage } from '../../localization';
import { getRandomWord } from '../../utils/wordBank';
import { PromptLibraryToolbar } from '../PromptLibraryToolbar';
import { ActionButton } from '../ActionButton';
import { DebouncedTextarea } from '../DebouncedTextarea';
import { useAppContext } from '../../contexts/AppContext';
import { TutorialTooltip } from '../TutorialTooltip';

export const TextInputNode: React.FC<NodeContentProps> = ({ node, onValueChange, libraryItems, t, onSelectNode }) => {
    const { language } = useLanguage();
    const context = useAppContext();
    const { tutorialStep, tutorialTargetId, advanceTutorial, skipTutorial } = context || {};

    // Check if this node is the current target of the tutorial
    const isTutorialActive = tutorialTargetId === node.id && (
        tutorialStep === 'text_input_0' || 
        tutorialStep === 'text_input_1' || 
        tutorialStep === 'text_input_2'
    );

    const handleAddRandomWord = () => {
        const randomWord = getRandomWord(language);
        const newText = node.value ? `${node.value}, ${randomWord}` : randomWord;
        onValueChange(node.id, newText);
        
        // Advance tutorial if active
        if (isTutorialActive && advanceTutorial) {
            advanceTutorial();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-1 flex-shrink-0 space-x-2">
                <div className="flex-grow">
                    <PromptLibraryToolbar
                        libraryItems={libraryItems}
                        onPromptInsert={(promptText: string) => {
                            const newText = node.value ? `${node.value}, ${promptText}` : promptText;
                            onValueChange(node.id, newText);
                        }}
                    />
                </div>
                
                <TutorialTooltip content={t('tutorial.step1')} isActive={!!isTutorialActive} position="left" onSkip={skipTutorial}>
                    <ActionButton title={t('node.action.randomWord')} onClick={handleAddRandomWord}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </ActionButton>
                </TutorialTooltip>
            </div>
            <div className="flex-grow min-h-0">
                <DebouncedTextarea
                    value={node.value}
                    onDebouncedChange={(val) => onValueChange(node.id, val)}
                    placeholder={t('node.content.notePlaceholder')}
                    className="w-full h-full p-2 bg-input border border-gray-600 rounded-md resize-none focus:border-accent focus:outline-none"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                />
            </div>
        </div>
    );
};