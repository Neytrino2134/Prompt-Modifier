
import React, { useState, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { CopyIcon, AppearanceIcon, PersonalityIcon, ClothingIcon } from '../../../components/icons/AppIcons';

interface CharacterDescriptionAreaProps {
    fullDescription: string;
    onDescriptionChange: (newDescription: string) => void;
    t: (key: string) => string;
    onFocus?: () => void;
    // New props for updates
    isUpdatingPersonality?: boolean;
    onUpdatePersonality?: () => void;
    isUpdatingAppearance?: boolean;
    onUpdateAppearance?: () => void;
    isUpdatingClothing?: boolean;
    onUpdateClothing?: () => void;
}

export const CharacterDescriptionArea: React.FC<CharacterDescriptionAreaProps> = ({ 
    fullDescription, 
    onDescriptionChange, 
    t, 
    onFocus, 
    isUpdatingPersonality, 
    onUpdatePersonality,
    isUpdatingAppearance,
    onUpdateAppearance,
    isUpdatingClothing,
    onUpdateClothing
}) => {
    const [sections, setSections] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const parsed: { [key: string]: string } = { 'Appearance': '', 'Personality': '', 'Clothing': '' };
        const keyMap: { [key: string]: 'Appearance' | 'Personality' | 'Clothing' } = {
            'внешность': 'Appearance',
            'личность': 'Personality',
            'характер': 'Personality',
            'одежда': 'Clothing',
            'apariencia': 'Appearance',
            'personalidad': 'Personality',
            'ropa': 'Clothing',
            'appearance': 'Appearance',
            'personality': 'Personality',
            'clothing': 'Clothing'
        };
        const sectionRegex = /####\s*(Appearance|Personality|Clothing|Внешность|Личность|Характер|Одежда|Apariencia|Personalidad|Ropa)\s*([\s\S]*?)(?=####|$)/gi;
    
        let match;
        let foundMatch = false;
        while ((match = sectionRegex.exec(fullDescription)) !== null) {
            foundMatch = true;
            const header = match[1].trim().toLowerCase(); 
            const key = keyMap[header];
            let value = match[2];

            // If we are not at the end of the string, it means there's another header following.
            // We assume we injected '\n\n' as a separator, so we remove it to recover the exact user input.
            if (sectionRegex.lastIndex < fullDescription.length) {
                if (value.endsWith('\n\n')) {
                    value = value.slice(0, -2);
                }
            }
            
            if (key) {
                parsed[key] = value;
            }
        }

        if (!foundMatch && fullDescription.trim()) {
            parsed['Appearance'] = fullDescription; // Preserve exact content if no headers found
        }
        
        setSections(parsed);
    }, [fullDescription]);
    
    const handleSectionChange = (key: string, value: string) => {
        const newSections = { ...sections, [key]: value };
        setSections(newSections);
        const newFullDescription = `#### Appearance\n${newSections['Appearance'] || ''}\n\n#### Personality\n${newSections['Personality'] || ''}\n\n#### Clothing\n${newSections['Clothing'] || ''}`;
        onDescriptionChange(newFullDescription);
    };

    const headerConfigs = {
        'Appearance': { icon: <AppearanceIcon className="h-3.5 w-3.5" />, color: 'text-gray-400' },
        'Personality': { icon: <PersonalityIcon className="h-3.5 w-3.5" />, color: 'text-gray-400' },
        'Clothing': { icon: <ClothingIcon className="h-3.5 w-3.5" />, color: 'text-gray-400' }
    };

    const getPlaceholder = (key: string) => {
        if (key === 'Appearance') return t('node.content.appearancePlaceholder' as any);
        if (key === 'Personality') return t('node.content.personalityPlaceholder' as any);
        if (key === 'Clothing') return t('node.content.clothingPlaceholder' as any);
        return "";
    };

    const getUpdateButton = (key: string) => {
        if (key === 'Personality' && onUpdatePersonality) {
            return {
                 title: t('node.action.updatePersonality' as any),
                 onClick: onUpdatePersonality,
                 isLoading: isUpdatingPersonality
            }
        }
        if (key === 'Appearance' && onUpdateAppearance) {
             return {
                 title: t('node.action.updateAppearance' as any),
                 onClick: onUpdateAppearance,
                 isLoading: isUpdatingAppearance
            }
        }
        if (key === 'Clothing' && onUpdateClothing) {
             return {
                 title: t('node.action.updateClothing' as any),
                 onClick: onUpdateClothing,
                 isLoading: isUpdatingClothing
            }
        }
        return null;
    }

    return (
        <div className="space-y-4 p-4 pb-2 text-sm flex flex-col pr-1 overflow-x-hidden">
            {(['Appearance', 'Personality', 'Clothing'] as const).map(key => {
                const config = headerConfigs[key];
                const updateBtn = getUpdateButton(key);

                return (
                    <div key={key} className="flex-shrink-0 flex flex-col items-start w-full">
                        <div className="flex flex-row items-center justify-between mb-1.5 w-full">
                            <div className="flex flex-row items-center gap-1.5">
                                <span className={config.color}>{config.icon}</span>
                                <h5 className={`font-bold ${config.color} text-[11px] uppercase tracking-wider flex-shrink-0`}>
                                    {t(`node.content.${key.toLowerCase()}` as any) || key}
                                </h5>
                                {updateBtn && (
                                    <ActionButton 
                                        title={updateBtn.title || "Update"}
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            updateBtn.onClick();
                                        }}
                                        disabled={updateBtn.isLoading}
                                        className="p-1 ml-1 text-gray-500 hover:text-accent-text transition-colors disabled:opacity-50"
                                        tooltipPosition="right"
                                    >
                                        {updateBtn.isLoading ? (
                                            <svg className="animate-spin h-3 w-3 text-accent-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        )}
                                    </ActionButton>
                                )}
                            </div>
                            <ActionButton 
                                title={t('node.action.copy')} 
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(sections[key] || ''); }}
                                className="p-1 text-gray-500 hover:text-accent-text transition-colors"
                                tooltipPosition="left"
                            >
                                <CopyIcon className="h-3 w-3" />
                            </ActionButton>
                        </div>
                        <textarea
                            value={sections[key] || ''}
                            onChange={e => handleSectionChange(key, e.target.value)}
                            className="w-full text-sm p-2 bg-gray-900/60 border border-gray-700 rounded-md resize-y focus:outline-none focus:ring-1 focus:ring-accent custom-scrollbar min-h-[60px] transition-colors text-gray-200 text-left"
                            onWheel={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()} 
                            onFocus={onFocus}
                            placeholder={getPlaceholder(key)}
                        />
                    </div>
                );
            })}
        </div>
    );
};
