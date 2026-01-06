
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ExpandIcon, CollapseIcon, HomeIcon, ClearCacheIcon, SettingsIcon, ResetCanvasIcon, FullScreenIcon, ExitFullScreenIcon, ExitIcon } from './icons/AppIcons';
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

const ThemeSelector: React.FC<{ currentTheme: Theme; setTheme: (t: Theme) => void }> = ({ currentTheme, setTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const themes: { id: Theme; label: string; color: string }[] = [
        { id: 'cyan', label: 'Cyan (Default)', color: '#0891b2' },
        { id: 'orange', label: 'Orange', color: '#ea580c' },
        { id: 'pink', label: 'Pink', color: '#db2777' },
        { id: 'gray', label: 'Monochrome', color: '#52525b' },
    ];

    return (
        <div className="relative flex items-center" ref={menuRef}>
            <TooltipWrapper title="Change Theme">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-gray-600 hover:text-white text-gray-300 ml-2"
                >
                    {/* Theme Icon (Paint Brush style) */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                </button>
            </TooltipWrapper>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 py-1 min-w-[150px] animate-fade-in-drop origin-top-right">
                    {themes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => { setTheme(theme.id); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-700 transition-colors ${currentTheme === theme.id ? 'bg-gray-700/50 text-white' : 'text-gray-300'}`}
                        >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }}></div>
                            <span>{theme.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const AppHeader: React.FC = () => {
    const context = useAppContext();
    const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

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
        setTheme
    } = context;

    const openSettings = () => window.dispatchEvent(new CustomEvent('open-settings'));

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

    const canResume = nodes && nodes.length > 0 && localStorage.getItem('hasVisited') === 'true';

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
                                    {isFullscreen ? <ExitFullScreenIcon className="h-5 w-5" /> : <FullScreenIcon className="h-5 w-5" />}
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

                            <div className="px-2 py-0.5 bg-gray-800 rounded border border-gray-600 text-[10px] font-mono text-gray-400 select-none ml-2">
                                {APP_VERSION}
                            </div>
                            
                            <ThemeSelector currentTheme={currentTheme} setTheme={setTheme} />

                            <TooltipWrapper title={t('toolbar.exitApp')} align="right">
                                <button
                                    onClick={handleExitApp}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-red-600 hover:text-white text-gray-300 ml-2"
                                    aria-label={t('toolbar.exitApp')}
                                >
                                    <ExitIcon />
                                </button>
                            </TooltipWrapper>
                        </>
                    )}
                </div>
            </header>
        </>
    );
};

export default AppHeader;
