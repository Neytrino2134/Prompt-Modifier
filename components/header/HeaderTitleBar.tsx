import React from 'react';
import { PromptModifierIcon, ClearCacheIcon, SettingsIcon, FullScreenIcon, ExitFullScreenIcon, ReloadIcon } from '../icons/AppIcons';
import { Tooltip } from '../Tooltip';
import LanguageSelector from '../LanguageSelector';
import HelpPanel from '../HelpPanel';
import { ThemeDropdownMenu } from './ThemeDropdownMenu';
import { PanelBgDropdownMenu } from './PanelBgDropdownMenu';
import { CursorSkinDropdownMenu } from './CursorSkinDropdownMenu';
import { APP_VERSION } from '../../version';
import { Theme, PanelAnimation, CursorSkin } from '../../types';
import { QueueStats, BatchStats } from './types';

interface HeaderTitleBarProps {
    hasAnyActiveWork: boolean;
    clearUnusedFullSizeImages: () => void;
    openSettings: (e: React.MouseEvent) => void;
    isBatchMode: boolean;
    setIsBatchMode: (val: boolean) => void;
    queueStats: QueueStats;
    batchStats: BatchStats;
    isStatusBarOpen: boolean;
    setIsStatusBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isHistoryPanelOpen?: boolean;
    setIsHistoryPanelOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    isTaskQueuePanelOpen: boolean;
    setIsTaskQueuePanelOpen: (val: boolean) => void;
    activeTaskCount: number;
    // Menus
    isThemeMenuOpen: boolean;
    setIsThemeMenuOpen: (val: boolean) => void;
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
    isPanelBgMenuOpen: boolean;
    setIsPanelBgMenuOpen: (val: boolean) => void;
    panelAnimation: PanelAnimation;
    setPanelAnimation: (anim: PanelAnimation) => void;
    isPanelAnimationAdaptive: boolean;
    setIsPanelAnimationAdaptive: (val: boolean) => void;
    isCursorSkinMenuOpen: boolean;
    setIsCursorSkinMenuOpen: (val: boolean) => void;
    cursorSkin: CursorSkin;
    setCursorSkin: (skin: CursorSkin) => void;
    // Window controls
    isFullscreen: boolean;
    toggleFullScreen: () => void;
    handleReloadApp: () => void;
    isAlwaysOnTop: boolean;
    handleToggleAlwaysOnTop: () => void;
    handleWindowMinimize: () => void;
    isMaximized: boolean;
    handleWindowMaximize: () => void;
    handleExitApp: () => void;
    handleTitleBarDoubleClick: (e: React.MouseEvent) => void;
    t: (key: any, options?: any) => string;
}

export const HeaderTitleBar: React.FC<HeaderTitleBarProps> = ({
    hasAnyActiveWork,
    clearUnusedFullSizeImages,
    openSettings,
    isBatchMode,
    setIsBatchMode,
    queueStats,
    batchStats,
    isStatusBarOpen,
    setIsStatusBarOpen,
    isHistoryPanelOpen,
    setIsHistoryPanelOpen,
    isTaskQueuePanelOpen,
    setIsTaskQueuePanelOpen,
    activeTaskCount,
    isThemeMenuOpen,
    setIsThemeMenuOpen,
    currentTheme,
    setTheme,
    isPanelBgMenuOpen,
    setIsPanelBgMenuOpen,
    panelAnimation,
    setPanelAnimation,
    isPanelAnimationAdaptive,
    setIsPanelAnimationAdaptive,
    isCursorSkinMenuOpen,
    setIsCursorSkinMenuOpen,
    cursorSkin,
    setCursorSkin,
    isFullscreen,
    toggleFullScreen,
    handleReloadApp,
    isAlwaysOnTop,
    handleToggleAlwaysOnTop,
    handleWindowMinimize,
    isMaximized,
    handleWindowMaximize,
    handleExitApp,
    handleTitleBarDoubleClick,
    t
}) => {
    return (
        <div
            onDoubleClick={handleTitleBarDoubleClick}
            className="relative z-30 w-full flex items-center justify-between px-2.5 h-9 bg-transparent gap-2 app-region-drag select-none"
        >
            {/* Left Section: App Logo, Title & Header Quick Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 app-region-drag">
                <div
                    className="flex items-center gap-2 px-1.5 py-0.5 rounded-md select-none app-region-drag group"
                    title="Prompt Modifier"
                >
                    <div className="relative flex items-center justify-center">
                        <PromptModifierIcon className="w-4 h-4" withGlow={false} />
                        {hasAnyActiveWork && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline tracking-tight font-sans text-xs whitespace-nowrap">
                        <span
                            className="font-extrabold text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                            style={{ fontFamily: "'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif" }}
                        >
                            Prompt
                        </span>
                        <span className="w-1"></span>
                        <span
                            className="font-extrabold text-[#00d2ff] tracking-tight drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]"
                            style={{ fontFamily: "'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif" }}
                        >
                            Modifier
                        </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-800 text-gray-400 rounded border border-gray-700/80">
                        {APP_VERSION}
                    </span>
                </div>

                <div className="w-px h-4 bg-gray-700/60 mx-0.5"></div>

                <div className="flex items-center gap-1 app-region-no-drag">
                    <LanguageSelector />

                    <HelpPanel
                        buttonClassName="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                        iconClassName="h-3.5 w-3.5"
                    />

                    <Tooltip content={t('toolbar.clearCache')} position="bottom">
                        <button
                            onClick={clearUnusedFullSizeImages}
                            className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                            aria-label={t('toolbar.clearCache')}
                        >
                            <ClearCacheIcon />
                        </button>
                    </Tooltip>

                    <Tooltip content={`${t('toolbar.settings')} (Ctrl + K)`} position="bottom">
                        <button
                            onClick={openSettings}
                            className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                            aria-label={`${t('toolbar.settings')} (Ctrl + K)`}
                        >
                            <SettingsIcon />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Center Section: Drag Region & Unified Single Mode Switcher */}
            <div className="flex-1 flex items-center justify-center min-w-[30px] px-2 h-full app-region-drag">
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsBatchMode(!isBatchMode)}
                    className={`app-region-no-drag px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 flex items-center gap-2.5 shadow-inner select-none cursor-pointer focus:outline-none focus:ring-0 outline-none ${
                        isBatchMode
                            ? 'bg-gray-950/90 text-white shadow-accent-secondary/10 hover:bg-gray-900'
                            : 'bg-gray-950/80 text-gray-300 hover:bg-gray-900 hover:text-white'
                    }`}
                    title={isBatchMode
                        ? (t('titlebar.switchToNormalTooltip') || 'Переключить в Обычный режим (Прямая генерация)')
                        : (t('titlebar.switchToBatchTooltip') || 'Переключить в Режим Batch API (Скидка -50%, отложенная обработка)')
                    }
                >
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs">{isBatchMode ? '📦' : '⚡'}</span>
                        <span className={`font-semibold tracking-wide ${isBatchMode ? 'text-accent-secondary' : 'text-gray-200'}`}>
                            {isBatchMode ? 'Batch API' : (t('stats.normalMode') || 'Realtime')}
                        </span>
                        {isBatchMode ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-secondary/20 text-accent-secondary font-mono font-bold">
                                -50%
                            </span>
                        ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                                Direct
                            </span>
                        )}
                    </div>

                    <div className={`w-7 h-3.5 rounded-full relative transition-colors duration-200 flex-shrink-0 ${isBatchMode ? 'bg-accent-secondary' : 'bg-gray-700'}`}>
                        <div className={`absolute top-0.5 bottom-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isBatchMode ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                    </div>

                    {isBatchMode && batchStats.activeJobs > 0 && (
                        <span className="px-1.5 py-0.1 text-[9px] bg-white text-gray-900 rounded-full font-bold animate-pulse">
                            {batchStats.activeJobs}
                        </span>
                    )}
                    {!isBatchMode && queueStats.running > 0 && (
                        <span className="px-1.5 py-0.1 text-[9px] bg-accent text-white rounded-full font-bold">
                            {queueStats.running}
                        </span>
                    )}
                </button>
            </div>

            {/* Right Section: Toolbar Controls, Status Toggle & Windows Window Controls */}
            <div className="flex items-center gap-1 flex-shrink-0 app-region-no-drag">
                {/* Status Bar Visibility Toggle Button */}
                <Tooltip content={t('titlebar.statusBarToggle') || 'Статусная строка'} position="bottom">
                    <button
                        onClick={() => setIsStatusBarOpen(prev => !prev)}
                        className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 border relative ${
                            isStatusBarOpen
                                ? 'bg-gray-800 text-accent-text border-gray-700/60'
                                : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 border-gray-700/50'
                        }`}
                        aria-label="Toggle Status Line"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                        {hasAnyActiveWork && !isStatusBarOpen && (
                            <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                            </span>
                        )}
                    </button>
                </Tooltip>

                {/* Generation History & Stats Button */}
                <Tooltip content={t('toolbar.historyStats') || 'История и Статистика'} position="bottom">
                    <button
                        onClick={() => setIsHistoryPanelOpen?.(prev => !prev)}
                        className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 border ${
                            isHistoryPanelOpen
                                ? 'bg-accent text-white border-accent'
                                : 'bg-gray-800/70 text-gray-300 hover:bg-gray-800 hover:text-white border-gray-700/50'
                        }`}
                        aria-label={t('toolbar.historyStats')}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </Tooltip>

                {/* Task Queue Drawer Button */}
                <Tooltip content={`${t('queue.title') || 'Task Queue'} (Ctrl + T)`} position="bottom">
                    <button
                        onClick={() => setIsTaskQueuePanelOpen(!isTaskQueuePanelOpen)}
                        className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 border relative ${
                            isTaskQueuePanelOpen
                                ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                                : 'bg-gray-800/70 text-gray-300 hover:bg-gray-800 hover:text-white border-gray-700/50'
                        }`}
                        aria-label={t('queue.title') || 'Task Queue'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        {activeTaskCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                        )}
                    </button>
                </Tooltip>

                {/* Theme Palette Picker */}
                <ThemeDropdownMenu
                    isOpen={isThemeMenuOpen}
                    onToggle={() => {
                        setIsThemeMenuOpen(!isThemeMenuOpen);
                        setIsPanelBgMenuOpen(false);
                        setIsCursorSkinMenuOpen(false);
                    }}
                    currentTheme={currentTheme}
                    onSelectTheme={(theme) => {
                        setTheme(theme);
                        setIsThemeMenuOpen(false);
                    }}
                    t={t}
                />

                {/* Panel Background & Animation Picker */}
                <PanelBgDropdownMenu
                    isOpen={isPanelBgMenuOpen}
                    onToggle={() => {
                        setIsPanelBgMenuOpen(!isPanelBgMenuOpen);
                        setIsThemeMenuOpen(false);
                        setIsCursorSkinMenuOpen(false);
                    }}
                    panelAnimation={panelAnimation}
                    onSelectAnimation={(anim) => {
                        setPanelAnimation(anim);
                        setIsPanelBgMenuOpen(false);
                    }}
                    isAdaptive={isPanelAnimationAdaptive}
                    onToggleAdaptive={() => setIsPanelAnimationAdaptive(!isPanelAnimationAdaptive)}
                    t={t}
                />

                {/* Cursor Skin Picker */}
                <CursorSkinDropdownMenu
                    isOpen={isCursorSkinMenuOpen}
                    onToggle={() => {
                        setIsCursorSkinMenuOpen(!isCursorSkinMenuOpen);
                        setIsThemeMenuOpen(false);
                        setIsPanelBgMenuOpen(false);
                    }}
                    cursorSkin={cursorSkin}
                    onSelectCursorSkin={(skin) => {
                        setCursorSkin(skin);
                        setIsCursorSkinMenuOpen(false);
                    }}
                    currentTheme={currentTheme}
                    t={t}
                />

                {/* Fullscreen Button */}
                <Tooltip content={isFullscreen ? t('toolbar.exitFullScreen') : t('toolbar.enterFullScreen')} position="bottom">
                    <button
                        onClick={toggleFullScreen}
                        className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50 cursor-pointer app-region-no-drag"
                        aria-label={isFullscreen ? t('toolbar.exitFullScreen') : t('toolbar.enterFullScreen')}
                    >
                        {isFullscreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
                    </button>
                </Tooltip>

                {/* Reload Project Button */}
                <Tooltip content={t('dialog.settings.reload')} position="bottom">
                    <button
                        onClick={handleReloadApp}
                        className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 text-gray-300 hover:bg-red-600 hover:text-white border border-gray-700/50 cursor-pointer app-region-no-drag"
                        aria-label={t('dialog.settings.reload')}
                    >
                        <ReloadIcon />
                    </button>
                </Tooltip>

                <div className="w-px h-4 bg-gray-700/60 mx-1"></div>

                {/* Electron Frameless Window Controls */}
                <div className="flex items-center app-region-no-drag">
                    {/* PIN (Always on Top) Button */}
                    <button
                        onClick={handleToggleAlwaysOnTop}
                        className={`h-7 w-8 flex items-center justify-center transition-all rounded-sm focus:outline-none cursor-pointer app-region-no-drag ${
                            isAlwaysOnTop
                                ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.35)]'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                        title={isAlwaysOnTop ? (t('titlebar.unpinAlwaysOnTop') || 'Открепить поверх окон') : (t('titlebar.pinAlwaysOnTop') || 'PIN - закрепить поверх остальных окон')}
                        aria-label={isAlwaysOnTop ? t('titlebar.unpinAlwaysOnTop') : t('titlebar.pinAlwaysOnTop')}
                    >
                        <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isAlwaysOnTop ? 'rotate-[-45deg] scale-110 text-cyan-400' : ''}`}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                    </button>

                    {/* Minimize Button */}
                    <button
                        onClick={handleWindowMinimize}
                        className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-sm focus:outline-none cursor-pointer app-region-no-drag"
                        title={t('titlebar.minimize')}
                        aria-label={t('titlebar.minimize')}
                    >
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                            <rect y="5.5" width="12" height="1.2" rx="0.6" />
                        </svg>
                    </button>

                    {/* Maximize / Restore Button */}
                    <button
                        onClick={handleWindowMaximize}
                        className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-sm focus:outline-none cursor-pointer app-region-no-drag"
                        title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
                        aria-label={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
                    >
                        {isMaximized ? (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <rect x="2.5" y="0.5" width="8.5" height="8.5" rx="0.5" />
                                <path d="M0.5 3.5v7.5a0.5 0.5 0 0 0 0.5 0.5h7.5" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <rect x="1" y="1" width="10" height="10" rx="0.5" />
                            </svg>
                        )}
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={handleExitApp}
                        className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition-colors rounded-sm focus:outline-none cursor-pointer app-region-no-drag"
                        title={t('titlebar.close')}
                        aria-label={t('titlebar.close')}
                    >
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
