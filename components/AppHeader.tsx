
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ExpandIcon, CollapseIcon, HomeIcon, ClearCacheIcon, SettingsIcon, ResetCanvasIcon, FullScreenIcon, ExitFullScreenIcon, ExitIcon, PaletteIcon, ReloadIcon } from './icons/AppIcons';
import HelpPanel from './HelpPanel';
import LanguageSelector from './LanguageSelector';
import TabsBar from './TabsBar';
import WelcomeScreen from './WelcomeScreen';
import { APP_VERSION } from '../version';
import { Theme } from '../types';

// Helper Wrapper
const TooltipWrapper: React.FC<{ title: string; children: React.ReactNode; align?: 'center' | 'left' | 'right' }> = ({ title, children, align = 'center' }) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    
    let positionClasses = 'left-1/2 -translate-x-1/2 top-full mt-2 origin-top';
    
    if (align === 'left') positionClasses = 'left-0 top-full mt-2 origin-top-left';
    if (align === 'right') positionClasses = 'right-0 top-full mt-2 origin-top-right';

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
        >
            {children}
            <div
              className={`absolute px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-lg shadow-xl z-50 transition-all duration-200 ease-out transform ${positionClasses} ${isTooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              role="tooltip"
            >
              {title}
            </div>
        </div>
    );
};

const AppHeader: React.FC = () => {
    const context = useAppContext();
    const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Theme Menu State
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);
    
    // Close theme menu on outside click
    useEffect(() => {
        if (!isThemeMenuOpen) return;
        const handleClickOutside = () => setIsThemeMenuOpen(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isThemeMenuOpen]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    if (!context) return null;
    
    const { 
        t, 
        clearUnusedFullSizeImages, 
        handleResetCanvas,
        tabs, 
        activeTabId, 
        handleSwitchTab, 
        handleAddTab, 
        handleCloseTab, 
        handleRenameTab,
        showWelcome,    
        setShowWelcome, 
        nodes,
        loadCanvasState,
        setConfirmInfo,
        currentTheme,
        setTheme,
        resetTabs
    } = context;

    const openSettings = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Dispatch event with coordinates
        window.dispatchEvent(new CustomEvent('open-settings', { 
            detail: { x: rect.left, y: rect.bottom } 
        }));
    };

    const handleHomeClick = () => {
        setShowWelcome(true);
    };

    const handleExitApp = () => {
        setConfirmInfo({
            title: t('dialog.exitApp.title'),
            message: t('dialog.exitApp.message'),
            onConfirm: () => {
                loadCanvasState({
                    nodes: [],
                    connections: [],
                    groups: [],
                    viewTransform: { scale: 1, translate: { x: 0, y: 0 } },
                    nodeIdCounter: 1,
                    fullSizeImageCache: {}
                });
                setShowWelcome(true);
            }
        });
    };
    
    const handleReloadApp = () => {
        setConfirmInfo({
            title: t('dialog.reload.title'),
            message: t('dialog.reload.message'),
            onConfirm: () => {
                loadCanvasState({
                    nodes: [],
                    connections: [],
                    groups: [],
                    viewTransform: { scale: 1, translate: { x: 0, y: 0 } },
                    nodeIdCounter: 1,
                    fullSizeImageCache: {}
                });
                if (resetTabs) {
                   resetTabs('en'); 
                }
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        });
    };

    const canResume = nodes && nodes.length > 0 && localStorage.getItem('hasVisited') === 'true';

    const themes: { id: Theme; color: string; label: string }[] = [
      { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
      { id: 'azure', color: '#0ea5e9', label: 'Azure' },
      { id: 'purple', color: '#9333ea', label: 'Purple' },
      { id: 'pink', color: '#ec4899', label: 'Pink' },
      { id: 'red', color: '#dc2626', label: 'Red' },
      { id: 'orange', color: '#f97316', label: 'Orange' },
      { id: 'lime', color: '#84cc16', label: 'Lime' },
      { id: 'emerald', color: '#10b981', label: 'Emerald' },
      { id: 'gray', color: '#71717a', label: 'Gray' },
    ];
    
    return (
        <>
            {showWelcome && <WelcomeScreen onClose={() => setShowWelcome(false)} isResumable={canResume} />}
            
            <header className="absolute top-0 left-0 w-full flex justify-start p-2 z-30 pointer-events-none">
                <div className="bg-gray-900 rounded-lg shadow-lg p-1 flex items-center gap-1 pointer-events-auto border border-gray-700" onMouseDown={(e) => e.stopPropagation()}>
                    <TooltipWrapper title={isTopPanelCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')} align="left">
                        <button
                            onClick={() => setIsTopPanelCollapsed(p => !p)}
                            className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                            aria-label={isTopPanelCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')}
                        >
                            {isTopPanelCollapsed ? <ExpandIcon /> : <CollapseIcon />}
                        </button>
                    </TooltipWrapper>
                    
                    {!isTopPanelCollapsed && (
                        <>
                            <TooltipWrapper title={t('toolbar.home')}>
                                <button
                                    onClick={handleHomeClick}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                                    aria-label={t('toolbar.home')}
                                >
                                    <HomeIcon />
                                </button>
                            </TooltipWrapper>
                            <HelpPanel />
                            
                            <TooltipWrapper title={t('toolbar.clearCache')}>
                                <button
                                    onClick={clearUnusedFullSizeImages}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                                    aria-label={t('toolbar.clearCache')}
                                >
                                    <ClearCacheIcon />
                                </button>
                            </TooltipWrapper>

                            <TooltipWrapper title={t('toolbar.settings')}>
                                <button
                                    onClick={openSettings}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                                    aria-label={t('toolbar.settings')}
                                >
                                    <SettingsIcon />
                                </button>
                            </TooltipWrapper>
                            
                            <TooltipWrapper title={isFullscreen ? t('toolbar.exitFullScreen') : t('toolbar.enterFullScreen')}>
                                <button
                                    onClick={toggleFullScreen}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                                    aria-label={isFullscreen ? t('toolbar.exitFullScreen') : t('toolbar.enterFullScreen')}
                                >
                                    {isFullscreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
                                </button>
                            </TooltipWrapper>

                            <TooltipWrapper title={t('toolbar.resetCanvas')}>
                                <button
                                    onClick={handleResetCanvas}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                                    aria-label={t('toolbar.resetCanvas')}
                                >
                                    <ResetCanvasIcon />
                                </button>
                            </TooltipWrapper>
                            
                            <LanguageSelector />
                            <TabsBar 
                                tabs={tabs} 
                                activeTabId={activeTabId} 
                                onSwitchTab={handleSwitchTab} 
                                onAddTab={handleAddTab} 
                                onCloseTab={handleCloseTab} 
                                onRenameTab={handleRenameTab}
                            />
                            <h1 className="text-lg font-bold text-accent-text whitespace-nowrap flex items-center space-x-2 select-none ml-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <path d="M21 15l-5-5L5 21"></path>
                                </svg>
                                <span>{t('app.title')}</span>
                            </h1>

                            <div className="flex items-center gap-1 ml-2">
                                <div className="px-2 py-0.5 bg-gray-800 rounded border border-gray-600 text-[10px] font-mono text-gray-400 select-none">
                                    {APP_VERSION}
                                </div>
                                
                                {/* Theme Selector */}
                                <div className="relative">
                                    <TooltipWrapper title={t('settings.themeLabel')}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsThemeMenuOpen(!isThemeMenuOpen); }}
                                            className={`p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 ${isThemeMenuOpen ? 'bg-accent text-white' : 'bg-gray-700 text-gray-300 hover:bg-accent hover:text-white'}`}
                                        >
                                            <PaletteIcon />
                                        </button>
                                    </TooltipWrapper>
                                    {isThemeMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 z-50 flex flex-col gap-1 min-w-[120px] animate-fade-in-drop origin-top-right">
                                            {themes.map(theme => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => setTheme(theme.id)}
                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 w-full text-left transition-colors ${currentTheme === theme.id ? 'bg-gray-700' : ''}`}
                                                >
                                                    <div 
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: theme.color }}
                                                    />
                                                    <span className={`text-xs ${currentTheme === theme.id ? 'text-white font-bold' : 'text-gray-300'}`}>
                                                        {theme.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Restart Button */}
                                <TooltipWrapper title={t('dialog.settings.reload')}>
                                    <button
                                        onClick={handleReloadApp}
                                        className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white"
                                        aria-label={t('dialog.settings.reload')}
                                    >
                                        <ReloadIcon />
                                    </button>
                                </TooltipWrapper>

                                {/* Exit Button */}
                                <TooltipWrapper title={t('toolbar.exitApp')} align="right">
                                    <button
                                        onClick={handleExitApp}
                                        className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-red-600 hover:text-white text-gray-300"
                                        aria-label={t('toolbar.exitApp')}
                                    >
                                        <ExitIcon />
                                    </button>
                                </TooltipWrapper>
                            </div>
                        </>
                    )}
                </div>
            </header>
        </>
    );
};

export default AppHeader;
