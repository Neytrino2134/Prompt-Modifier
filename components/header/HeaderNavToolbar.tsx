import React from 'react';
import { ExpandIcon, CollapseIcon, HomeIcon, ResetCanvasIcon } from '../icons/AppIcons';
import { Tooltip } from '../Tooltip';
import TabsBar from '../TabsBar';
import { HeaderNotificationBar } from '../HeaderNotificationBar';
import { Tab, ActiveOperation } from '../../types';
import { formatTime } from './useHeaderTimersAndStats';

interface HeaderNavToolbarProps {
    isTopPanelCollapsed: boolean;
    setIsTopPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    handleHomeClick: () => void;
    handleResetCanvas: () => void;
    handleClearCanvas: () => void;
    tabs: Tab[];
    activeTabId: string;
    handleSwitchTab: (id: string) => void;
    handleAddTab: () => void;
    handleCloseTab: (id: string, e?: React.MouseEvent) => void;
    handleRenameTab: (id: string, name: string) => void;
    handleReorderTabs?: (sourceIndex: number, targetIndex: number) => void;
    // Status metrics
    currentOp: ActiveOperation | null;
    isAutoSaving?: boolean;
    showSavedState: boolean;
    secondsToSave: number | null;
    timeDisplay: number;
    isProcessing: boolean;
    fps: number;
    isDebugConsoleOpen: boolean;
    setIsDebugConsoleOpen: (val: boolean) => void;
    errorCount: number;
    handleTitleBarDoubleClick: (e: React.MouseEvent) => void;
    t: (key: any, options?: any) => string;
}

export const HeaderNavToolbar: React.FC<HeaderNavToolbarProps> = ({
    isTopPanelCollapsed,
    setIsTopPanelCollapsed,
    handleHomeClick,
    handleResetCanvas,
    handleClearCanvas,
    tabs,
    activeTabId,
    handleSwitchTab,
    handleAddTab,
    handleCloseTab,
    handleRenameTab,
    handleReorderTabs,
    currentOp,
    isAutoSaving,
    showSavedState,
    secondsToSave,
    timeDisplay,
    isProcessing,
    fps,
    isDebugConsoleOpen,
    setIsDebugConsoleOpen,
    errorCount,
    handleTitleBarDoubleClick,
    t
}) => {
    return (
        <div
            onDoubleClick={handleTitleBarDoubleClick}
            className="relative z-10 w-full flex items-center justify-between px-2.5 py-1 min-h-[38px] bg-transparent gap-2 overflow-x-auto hide-scrollbar app-region-drag select-none"
        >
            {/* Left Section: Toolbar buttons, Home & Project Tabs */}
            <div className="flex items-center gap-1.5 flex-shrink-0 app-region-no-drag">
                {/* Collapse/Expand Toolbar Toggle */}
                <Tooltip content={isTopPanelCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')} position="bottom">
                    <button
                        onClick={() => setIsTopPanelCollapsed(p => !p)}
                        className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-8 w-8 bg-gray-800/80 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/60"
                        aria-label={isTopPanelCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')}
                    >
                        {isTopPanelCollapsed ? <ExpandIcon /> : <CollapseIcon />}
                    </button>
                </Tooltip>

                {/* Home Button */}
                <Tooltip content={t('toolbar.home')} position="bottom">
                    <button
                        onClick={handleHomeClick}
                        className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-8 w-8 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                        aria-label={t('toolbar.home')}
                    >
                        <HomeIcon />
                    </button>
                </Tooltip>

                {!isTopPanelCollapsed && (
                    <>
                        {/* Reset Canvas Button */}
                        <Tooltip content={t('toolbar.resetCanvas')} position="bottom">
                            <button
                                onClick={handleResetCanvas}
                                className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-8 w-8 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                                aria-label={t('toolbar.resetCanvas')}
                            >
                                <ResetCanvasIcon />
                            </button>
                        </Tooltip>

                        {/* Delete / Clear Canvas Button */}
                        <Tooltip content={t('toolbar.clearCanvas')} position="bottom">
                            <button
                                onClick={handleClearCanvas}
                                className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-8 w-8 bg-gray-800/70 hover:bg-red-600/80 hover:text-white text-gray-300 border border-gray-700/50"
                                aria-label={t('toolbar.clearCanvas')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </Tooltip>

                        <div className="w-px h-5 bg-gray-700/60 mx-0.5"></div>

                        {/* Project Tabs Bar */}
                        <TabsBar
                            tabs={tabs}
                            activeTabId={activeTabId}
                            onSwitchTab={handleSwitchTab}
                            onAddTab={handleAddTab}
                            onCloseTab={handleCloseTab}
                            onRenameTab={handleRenameTab}
                            onReorderTabs={handleReorderTabs}
                        />
                    </>
                )}
            </div>

            {/* Middle Spacer Area */}
            <div className="flex-1 min-w-[12px] h-full app-region-drag"></div>

            {/* Sliding Header Notification Bar */}
            <div className="relative z-10 flex items-center overflow-visible app-region-no-drag">
                <HeaderNotificationBar />
            </div>

            {/* Right Section: System Ready, Timer, FPS, and Debug Console */}
            <div className="flex items-center gap-2 flex-shrink-0 app-region-no-drag relative z-20">
                {/* System Status / Processing / Saving indicator */}
                <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-gray-800/70 border border-gray-700/60 min-w-[130px]">
                    {currentOp ? (
                        <>
                            <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                            </div>
                            <div className="flex flex-col leading-tight min-w-0">
                                <span className="text-[9px] font-bold text-accent-text uppercase tracking-wider truncate">Processing</span>
                                <span className="text-[11px] text-gray-300 whitespace-nowrap truncate max-w-[140px]" title={currentOp.description}>
                                    {currentOp.description}
                                </span>
                            </div>
                        </>
                    ) : isAutoSaving ? (
                        <>
                            <div className="relative flex h-3 w-3 flex-shrink-0 text-accent-text animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                    <path fillRule="evenodd" d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15zm-6.75-10.5a.75.75 0 00-1.5 0v4.19l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V10.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-[9px] font-bold text-accent-text uppercase tracking-wider">System</span>
                                <span className="text-[11px] text-accent-text">{t('system.saving') || 'Saving...'}</span>
                            </div>
                        </>
                    ) : showSavedState ? (
                        <>
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0"></div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">System</span>
                                <span className="text-[11px] text-emerald-300 font-medium">{t('system.saved') || 'Saved'}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0"></div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">System</span>
                                <span className="text-[11px] text-gray-300">
                                    {secondsToSave !== null ? `Save in ${secondsToSave}s` : 'Ready'}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Execution Time */}
                <div className="flex flex-col items-center justify-center px-2 py-0.5 rounded-md bg-gray-800/70 border border-gray-700/60 min-w-[62px]">
                    <span className={`text-xs font-bold font-mono leading-none ${isProcessing ? 'text-accent-text' : 'text-gray-300'}`}>
                        {formatTime(timeDisplay)}
                    </span>
                    <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider leading-none mt-0.5">Time</span>
                </div>

                {/* FPS Indicator */}
                <div className="flex flex-col items-center justify-center px-2 py-0.5 rounded-md bg-gray-800/70 border border-gray-700/60 min-w-[48px]">
                    <span className="text-xs font-bold text-accent-text font-mono leading-none">
                        {fps}
                    </span>
                    <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider leading-none mt-0.5">FPS</span>
                </div>

                {/* Debug Console Button */}
                <Tooltip content="Debug Console" position="bottom">
                    <button
                        onClick={() => setIsDebugConsoleOpen(!isDebugConsoleOpen)}
                        className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-8 w-8 border relative ${
                            isDebugConsoleOpen
                                ? 'text-accent-text bg-gray-800 border-accent/40'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800 border-gray-700/50'
                        }`}
                        aria-label="Debug Console"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {errorCount > 0 && !isDebugConsoleOpen && (
                            <span className="absolute top-1 right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
