import React from 'react';
import { PaletteIcon } from '../icons/AppIcons';
import { Tooltip } from '../Tooltip';
import { Theme } from '../../types';
import { THEME_GROUPS } from '../settings/appearance/ThemeAndAutoSaveSettings';

interface ThemeDropdownMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    currentTheme: Theme;
    onSelectTheme: (theme: Theme) => void;
    t: (key: any) => string;
}

export const ThemeDropdownMenu: React.FC<ThemeDropdownMenuProps> = ({
    isOpen,
    onToggle,
    currentTheme,
    onSelectTheme,
    t
}) => {
    return (
        <div className="relative header-dropdown-menu-container">
            <Tooltip content={t('settings.themeLabel')} position="bottom">
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onToggle();
                    }}
                    className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 border cursor-pointer app-region-no-drag ${
                        isOpen 
                            ? 'bg-accent text-white border-accent' 
                            : 'bg-gray-800/70 text-gray-300 hover:bg-accent hover:text-white border-gray-700/50'
                    }`}
                    aria-label={t('settings.themeLabel')}
                >
                    <PaletteIcon />
                </button>
            </Tooltip>
            {isOpen && (
                <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ top: 'calc(var(--app-header-height, 74px) - 4px + 6px)' }}
                    className="absolute right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-2.5 z-[120] flex flex-col gap-2 min-w-[240px] max-w-[280px] animate-fade-in-drop origin-top-right app-region-no-drag pointer-events-auto select-none"
                >
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-800 px-0.5">
                        <span className="text-xs font-semibold text-gray-200">
                            {t('settings.themeLabel') || 'Тема оформления'}
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[360px] space-y-2.5 pr-1 custom-scrollbar">
                        {THEME_GROUPS.map(group => (
                            <div key={group.id} className="space-y-1">
                                <div className="text-[10px] font-semibold text-gray-400 px-1 uppercase tracking-wider flex items-center gap-1.5">
                                    {group.icon}
                                    <span>{t(group.titleKey as any)}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                    {group.themes.map(theme => {
                                        const isSelected = currentTheme === theme.id;
                                        const localized = t(theme.labelKey as any);
                                        const labelText = localized && localized !== theme.labelKey ? localized : theme.fallbackLabel;

                                        return (
                                            <button
                                                key={theme.id}
                                                type="button"
                                                onClick={() => {
                                                    onSelectTheme(theme.id);
                                                }}
                                                className={`app-region-no-drag flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all border cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200 font-medium shadow-sm'
                                                        : 'bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-750 hover:text-white hover:border-gray-600'
                                                }`}
                                            >
                                                <div 
                                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border border-white/20"
                                                    style={{ backgroundColor: theme.color }}
                                                />
                                                <span className={`text-xs truncate flex-1 ${isSelected ? 'text-cyan-300 font-semibold' : 'text-gray-300'}`}>
                                                    {labelText}
                                                </span>
                                                {isSelected && (
                                                    <span 
                                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                                                        style={{ backgroundColor: theme.color }}
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
