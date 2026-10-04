import React from 'react';
import { PanelBackgroundIcon } from '../icons/AppIcons';
import { Tooltip } from '../Tooltip';
import { PanelAnimation } from '../../types';
import { PANEL_ANIMATION_GROUPS } from '../settings/appearance/panelAnimationDefinitions';

interface PanelBgDropdownMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    panelAnimation: PanelAnimation;
    onSelectAnimation: (anim: PanelAnimation) => void;
    isAdaptive: boolean;
    onToggleAdaptive: () => void;
    t: (key: any) => string;
}

export const PanelBgDropdownMenu: React.FC<PanelBgDropdownMenuProps> = ({
    isOpen,
    onToggle,
    panelAnimation,
    onSelectAnimation,
    isAdaptive,
    onToggleAdaptive,
    t
}) => {
    return (
        <div className="relative header-dropdown-menu-container">
            <Tooltip content={t('settings.panelAnimationLabel') || 'Фон и анимация панели'} position="bottom">
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
                    aria-label={t('settings.panelAnimationLabel') || 'Фон панели'}
                >
                    <PanelBackgroundIcon className="h-4 w-4" />
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
                            {t('settings.panelAnimationLabel') || 'Фон панели'}
                        </span>
                        <button
                            type="button"
                            onClick={onToggleAdaptive}
                            className={`app-region-no-drag text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors border cursor-pointer ${
                                isAdaptive 
                                    ? 'bg-accent/20 text-accent border-accent/40' 
                                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
                            }`}
                            title={t('settings.panelAnimationAdaptiveDesc')}
                        >
                            {isAdaptive 
                                ? (t('settings.panelAnimationAdaptiveLabel') || 'Адаптивный')
                                : (t('common.disabled') || 'Стандарт')
                            }
                        </button>
                    </div>
                    <div className="overflow-y-auto max-h-[340px] space-y-2 pr-1 custom-scrollbar">
                        {PANEL_ANIMATION_GROUPS.map(group => (
                            <div key={group.id} className="space-y-1">
                                <div className="text-[10px] font-semibold text-gray-400 px-1 uppercase tracking-wider">
                                    {t(group.titleKey as any)}
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                    {group.items.map(opt => {
                                        const isSelected = panelAnimation === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    onSelectAnimation(opt.id);
                                                }}
                                                className={`app-region-no-drag relative overflow-hidden flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all border cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-gray-800 border-accent text-white font-medium shadow-sm'
                                                        : 'bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-750 hover:text-white hover:border-gray-600'
                                                }`}
                                            >
                                                <span className={`text-xs ${isSelected ? 'text-accent font-semibold' : 'text-gray-300'}`}>
                                                    {t(opt.labelKey as any)}
                                                </span>
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse" />
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
