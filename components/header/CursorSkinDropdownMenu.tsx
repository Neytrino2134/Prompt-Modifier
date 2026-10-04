import React from 'react';
import { CursorSkinIcon } from '../icons/AppIcons';
import { Tooltip } from '../Tooltip';
import { CursorSkin, Theme } from '../../types';
import { CURSOR_SKIN_GROUPS } from '../settings/appearance/CursorSkinSettings';
import { getActiveCursorDefinition } from '../cursors/cursorDefinitions';

interface CursorSkinDropdownMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    cursorSkin: CursorSkin;
    onSelectCursorSkin: (skin: CursorSkin) => void;
    currentTheme: Theme;
    t: (key: any) => string;
}

export const CursorSkinDropdownMenu: React.FC<CursorSkinDropdownMenuProps> = ({
    isOpen,
    onToggle,
    cursorSkin,
    onSelectCursorSkin,
    currentTheme,
    t
}) => {
    return (
        <div className="relative header-dropdown-menu-container">
            <Tooltip content={t('settings.cursorSkinLabel') || 'Скины курсора'} position="bottom">
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
                    aria-label={t('settings.cursorSkinLabel') || 'Скины курсора'}
                >
                    <CursorSkinIcon className="h-4 w-4" />
                </button>
            </Tooltip>
            {isOpen && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ top: 'calc(var(--app-header-height, 74px) - 4px + 6px)' }}
                    className="absolute right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-2.5 z-[120] flex flex-col gap-2 min-w-[260px] max-w-[300px] animate-fade-in-drop origin-top-right app-region-no-drag pointer-events-auto select-none"
                >
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-800 px-0.5">
                        <span className="text-xs font-semibold text-gray-200">
                            {t('settings.cursorSkinLabel') || 'Скин курсора'}
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] space-y-2 pr-1 custom-scrollbar">
                        {CURSOR_SKIN_GROUPS.map(group => (
                            <div key={group.id} className="space-y-1">
                                <div className="text-[10px] font-semibold text-gray-400 px-1 uppercase tracking-wider">
                                    {t(group.titleKey as any)}
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                    {group.skins.map(({ key: skinKey }) => {
                                        const skinDef = getActiveCursorDefinition(skinKey, currentTheme);
                                        const isSelected = cursorSkin === skinKey;
                                        return (
                                            <button
                                                key={skinKey}
                                                type="button"
                                                onClick={() => {
                                                    onSelectCursorSkin(skinKey);
                                                }}
                                                className={`app-region-no-drag flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all border cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-200 font-medium shadow-sm'
                                                        : 'bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-750 hover:text-white hover:border-gray-600'
                                                }`}
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden ${
                                                        isSelected ? 'bg-cyan-900/60 text-cyan-300' : 'bg-gray-950 text-gray-400'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: skinDef.rawSvgs.default }}
                                                />
                                                <span className={`text-xs truncate flex-1 ${isSelected ? 'text-cyan-300 font-semibold' : 'text-gray-300'}`}>
                                                    {t(skinDef.nameKey as any)}
                                                </span>
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
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
