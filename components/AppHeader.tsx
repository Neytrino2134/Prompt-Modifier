import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import WelcomeScreen from './WelcomeScreen';
import { PanelAnimationBackground } from './settings/appearance/PanelAnimationBackground';
import {
    useHeaderWindowControls,
    useHeaderTimersAndStats,
    HeaderTitleBar,
    HeaderStatusBar,
    HeaderNavToolbar
} from './header';

const AppHeader: React.FC = () => {
    const context = useAppContext();
    const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isPanelBgMenuOpen, setIsPanelBgMenuOpen] = useState(false);
    const [isCursorSkinMenuOpen, setIsCursorSkinMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    // Custom Hooks for window control, timers, real-time queues & Batch API stats
    const windowControls = useHeaderWindowControls();
    const stats = useHeaderTimersAndStats();

    // Close dropdown menus on outside click/mousedown
    useEffect(() => {
        if (!isThemeMenuOpen && !isPanelBgMenuOpen && !isCursorSkinMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && target.closest('.header-dropdown-menu-container')) {
                return;
            }
            setIsThemeMenuOpen(false);
            setIsPanelBgMenuOpen(false);
            setIsCursorSkinMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isThemeMenuOpen, isPanelBgMenuOpen, isCursorSkinMenuOpen]);

    if (!context) return null;

    const {
        t,
        clearUnusedFullSizeImages,
        handleResetCanvas,
        handleClearCanvas,
        tabs,
        activeTabId,
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleReorderTabs,
        showWelcome,
        setShowWelcome,
        nodes,
        currentTheme,
        setTheme,
        isStatusBarOpen,
        setIsStatusBarOpen,
        setHeaderHeight,
        isDebugConsoleOpen,
        setIsDebugConsoleOpen,
        activeTaskCount = 0,
        isTaskQueuePanelOpen,
        setIsTaskQueuePanelOpen,
        isBatchMode,
        setIsBatchMode,
        pollActiveBatchJobs,
        isBatchPolling,
        isAutoSaving,
        panelAnimation = 'shimmer',
        setPanelAnimation,
        isPanelAnimationAdaptive = true,
        setIsPanelAnimationAdaptive,
        cursorSkin = 'default',
        setCursorSkin,
        isHistoryPanelOpen,
        setIsHistoryPanelOpen,
    } = context;

    const openSettings = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent('open-settings', {
            detail: { x: rect.left, y: rect.bottom }
        }));
    };

    const handleHomeClick = () => {
        setShowWelcome(true);
    };

    const openTaskQueueTab = (tab: 'queue' | 'batch') => {
        setIsTaskQueuePanelOpen(true);
        window.dispatchEvent(new CustomEvent('open-task-queue', { detail: { tab } }));
    };

    const canResume = Boolean(localStorage.getItem('hasVisited') === 'true' || (tabs && tabs.length > 0) || (nodes && nodes.length > 0));

    // Dynamically measure AppHeader height and export to CSS variable and context
    useEffect(() => {
        if (!headerRef.current) return;
        const updateHeight = () => {
            if (headerRef.current) {
                const height = headerRef.current.offsetHeight;
                document.documentElement.style.setProperty('--app-header-height', `${height}px`);
                if (setHeaderHeight) {
                    setHeaderHeight(height);
                }
            }
        };

        updateHeight();
        const ro = new ResizeObserver(updateHeight);
        ro.observe(headerRef.current);
        return () => ro.disconnect();
    }, [isStatusBarOpen, isTopPanelCollapsed, setHeaderHeight]);

    return (
        <>
            {showWelcome && <WelcomeScreen onClose={() => setShowWelcome(false)} isResumable={canResume} />}

            <header
                ref={headerRef}
                id="app-header"
                onDoubleClick={windowControls.handleTitleBarDoubleClick}
                className={`fixed top-0 left-0 w-full z-40 select-none flex flex-col top-panel-unified top-panel-anim-${panelAnimation} border-b border-white/20 shadow-[0_14px_36px_rgba(0,0,0,0.75),0_6px_16px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-200 app-region-drag`}
            >
                {/* Dynamic Panel Animation Background with Theme Adaptive support */}
                <PanelAnimationBackground
                    animation={panelAnimation}
                    theme={currentTheme}
                    isAdaptive={isPanelAnimationAdaptive}
                />

                {/* ROW 1: Main Application Header & Window Title Bar */}
                <HeaderTitleBar
                    hasAnyActiveWork={stats.hasAnyActiveWork}
                    clearUnusedFullSizeImages={clearUnusedFullSizeImages}
                    openSettings={openSettings}
                    isBatchMode={isBatchMode}
                    setIsBatchMode={setIsBatchMode}
                    queueStats={stats.queueStats}
                    batchStats={stats.batchStats}
                    isStatusBarOpen={isStatusBarOpen}
                    setIsStatusBarOpen={setIsStatusBarOpen}
                    isHistoryPanelOpen={isHistoryPanelOpen}
                    setIsHistoryPanelOpen={setIsHistoryPanelOpen}
                    isTaskQueuePanelOpen={isTaskQueuePanelOpen}
                    setIsTaskQueuePanelOpen={setIsTaskQueuePanelOpen}
                    activeTaskCount={activeTaskCount}
                    isThemeMenuOpen={isThemeMenuOpen}
                    setIsThemeMenuOpen={setIsThemeMenuOpen}
                    currentTheme={currentTheme}
                    setTheme={setTheme}
                    isPanelBgMenuOpen={isPanelBgMenuOpen}
                    setIsPanelBgMenuOpen={setIsPanelBgMenuOpen}
                    panelAnimation={panelAnimation}
                    setPanelAnimation={setPanelAnimation}
                    isPanelAnimationAdaptive={isPanelAnimationAdaptive}
                    setIsPanelAnimationAdaptive={setIsPanelAnimationAdaptive}
                    isCursorSkinMenuOpen={isCursorSkinMenuOpen}
                    setIsCursorSkinMenuOpen={setIsCursorSkinMenuOpen}
                    cursorSkin={cursorSkin}
                    setCursorSkin={setCursorSkin}
                    isFullscreen={windowControls.isFullscreen}
                    toggleFullScreen={windowControls.toggleFullScreen}
                    handleReloadApp={windowControls.handleReloadApp}
                    isAlwaysOnTop={windowControls.isAlwaysOnTop}
                    handleToggleAlwaysOnTop={windowControls.handleToggleAlwaysOnTop}
                    handleWindowMinimize={windowControls.handleWindowMinimize}
                    isMaximized={windowControls.isMaximized}
                    handleWindowMaximize={windowControls.handleWindowMaximize}
                    handleExitApp={windowControls.handleExitApp}
                    handleTitleBarDoubleClick={windowControls.handleTitleBarDoubleClick}
                    t={t}
                />

                {/* ROW 2: STATUS BAR: Dual-Mode Task Queue & Batch API Status Line */}
                <HeaderStatusBar
                    isStatusBarOpen={isStatusBarOpen}
                    queueStats={stats.queueStats}
                    batchStats={stats.batchStats}
                    openTaskQueueTab={openTaskQueueTab}
                    pollActiveBatchJobs={pollActiveBatchJobs}
                    isBatchPolling={isBatchPolling}
                    isAutoSaving={isAutoSaving}
                    showSavedState={stats.showSavedState}
                    secondsToSave={stats.secondsToSave}
                    handleTitleBarDoubleClick={windowControls.handleTitleBarDoubleClick}
                    t={t}
                />

                {/* ROW 3: Navigation Toolbar, Project Tabs & Live System Status */}
                <HeaderNavToolbar
                    isTopPanelCollapsed={isTopPanelCollapsed}
                    setIsTopPanelCollapsed={setIsTopPanelCollapsed}
                    handleHomeClick={handleHomeClick}
                    handleResetCanvas={handleResetCanvas}
                    handleClearCanvas={handleClearCanvas}
                    tabs={tabs}
                    activeTabId={activeTabId}
                    handleSwitchTab={handleSwitchTab}
                    handleAddTab={handleAddTab}
                    handleCloseTab={handleCloseTab}
                    handleRenameTab={handleRenameTab}
                    handleReorderTabs={handleReorderTabs}
                    currentOp={stats.currentOp}
                    isAutoSaving={isAutoSaving}
                    showSavedState={stats.showSavedState}
                    secondsToSave={stats.secondsToSave}
                    timeDisplay={stats.timeDisplay}
                    isProcessing={stats.isProcessing}
                    fps={stats.fps}
                    isDebugConsoleOpen={isDebugConsoleOpen}
                    setIsDebugConsoleOpen={setIsDebugConsoleOpen}
                    errorCount={stats.errorCount}
                    handleTitleBarDoubleClick={windowControls.handleTitleBarDoubleClick}
                    t={t}
                />
            </header>
        </>
    );
};

export default AppHeader;
