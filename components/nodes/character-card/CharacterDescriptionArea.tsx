
import React, { useState, useEffect } from 'react';
import { ActionButton } from '../../ActionButton';
import { CopyIcon, AppearanceIcon, PersonalityIcon, ClothingIcon } from '../../../components/icons/AppIcons';

interface CharacterDescriptionAreaProps {
    fullDescription: string;
    onDescriptionChange: (newDescription: string) => void;
    t: (key: string) => string;
    onFocus?: () => void;
}

export const CharacterDescriptionArea: React.FC<CharacterDescriptionAreaProps> = ({ fullDescription, onDescriptionChange, t, onFocus }) => {
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
            const value = match[2].trim();
            if (key) {
                parsed[key] = value;
            }
        }

        if (!foundMatch && fullDescription.trim()) {
            parsed['Appearance'] = fullDescription.trim();
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

    return (
        <div className="space-y-4 p-4 pb-2 text-sm flex flex-col pr-1 overflow-x-hidden">
            {(['Appearance', 'Personality', 'Clothing'] as const).map(key => {
                const config = headerConfigs[key];
                return (
                    <div key={key} className="flex-shrink-0 flex flex-col items-start w-full">
                        <div className="flex flex-row items-center justify-between mb-1.5 w-full">
                            <div className="flex flex-row items-center gap-1.5">
                                <span className={config.color}>{config.icon}</span>
                                <h5 className={`font-bold ${config.color} text-[11px] uppercase tracking-wider flex-shrink-0`}>
                                    {t(`node.content.${key.toLowerCase()}` as any) || key}
                                </h5>
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
                            className="w-full text-sm p-2 bg-gray-900/60 border border-gray-700 rounded-md resize-y focus:outline-none focus:ring-1 focus:ring-accent custom-scrollbar min-h-[60px] transition-colors hover:bg-gray-800/80 text-gray-200 text-left"
                            onWheel={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()} 
                            onFocus={onFocus}
                        />
                    </div>
                );
            })}
        </div>
    );
};
