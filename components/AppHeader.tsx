import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ExpandIcon, CollapseIcon, HomeIcon, ClearCacheIcon, SettingsIcon, ResetCanvasIcon, FullScreenIcon, ExitFullScreenIcon, ExitIcon, PaletteIcon, ReloadIcon, PromptModifierIcon } from './icons/AppIcons';
import HelpPanel from './HelpPanel';
import LanguageSelector from './LanguageSelector';
import TabsBar from './TabsBar';
import WelcomeScreen from './WelcomeScreen';
import { Tooltip } from './Tooltip';
import { APP_VERSION } from '../version';
import { Theme, TaskStatus, BatchJobRecord, ActiveOperation } from '../types';
import { PanelAnimationBackground } from './settings/appearance/PanelAnimationBackground';

const useFps = () => {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const animationFrameId = useRef(0);

  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      frameCount.current++;
      if (now >= lastFrameTime.current + 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastFrameTime.current = now;
      }
      animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return fps;
};

const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10); 
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
};

const AppHeader: React.FC = () => {
    const context = useAppContext();
    const fps = useFps();
    const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    // Timer State
    const [elapsedTime, setElapsedTime] = useState(0);
    const [lastResult, setLastResult] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const timerRafRef = useRef<number | null>(null);

    // Auto-Save Countdown State
    const [secondsToSave, setSecondsToSave] = useState<number | null>(null);
    const [showSavedState, setShowSavedState] = useState(false);
    const prevAutoSavingRef = useRef(false);

    const isElectron = Boolean(typeof window !== 'undefined' && (window as any).electronAPI);

    // Sync fullscreen state
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Sync Electron window maximize state
    useEffect(() => {
        if (!isElectron) return;
        const api = (window as any).electronAPI;
        if (api?.isMaximized) {
            api.isMaximized().then((max: boolean) => setIsMaximized(max)).catch(() => {});
        }
        if (api?.isAlwaysOnTop) {
            api.isAlwaysOnTop().then((top: boolean) => setIsAlwaysOnTop(Boolean(top))).catch(() => {});
        }
        if (api?.onMaximizedChange) {
            const unsubscribe = api.onMaximizedChange((max: boolean) => {
                setIsMaximized(max);
            });
            return () => {
                if (typeof unsubscribe === 'function') unsubscribe();
            };
        }
    }, [isElectron]);
    
    // Close theme menu on outside click
    useEffect(() => {
        if (!isThemeMenuOpen) return;
        const handleClickOutside = () => setIsThemeMenuOpen(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isThemeMenuOpen]);

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
        loadCanvasState,
        setConfirmInfo,
        currentTheme,
        setTheme,
        resetTabs,
        isStatusBarOpen,
        setIsStatusBarOpen,
        setHeaderHeight,
        // Active Operations
        activeOperations = new Map(),
        logs = [],
        isDebugConsoleOpen,
        setIsDebugConsoleOpen,
        // Task Queue & Batch API state
        tasks = [],
        activeTaskCount = 0,
        isTaskQueuePanelOpen,
        setIsTaskQueuePanelOpen,
        isBatchMode,
        setIsBatchMode,
        batchJobs = [],
        pollActiveBatchJobs,
        isBatchPolling,
        nextAutoSaveTime,
        isAutoSaving,
        panelAnimation = 'shimmer',
        isPanelAnimationAdaptive = true,
    } = context;

    const operations: ActiveOperation[] = Array.from(activeOperations.values());
    const currentOp = operations.length > 0 ? operations[operations.length - 1] : null;
    const isProcessing = operations.length > 0;
    const errorCount = logs.filter(l => l.level === 'error').length;

    // Timer Loop
    useEffect(() => {
        if (isProcessing) {
            if (startTimeRef.current === null) {
                startTimeRef.current = performance.now();
                setElapsedTime(0);
            }
            const loop = () => {
                if (startTimeRef.current !== null) {
                    setElapsedTime(performance.now() - startTimeRef.current);
                    timerRafRef.current = requestAnimationFrame(loop);
                }
            };
            timerRafRef.current = requestAnimationFrame(loop);
        } else {
            if (startTimeRef.current !== null) {
                const finalTime = performance.now() - startTimeRef.current;
                setLastResult(finalTime);
                setElapsedTime(0);
                startTimeRef.current = null;
            }
            if (timerRafRef.current) {
                cancelAnimationFrame(timerRafRef.current);
                timerRafRef.current = null;
            }
        }
        return () => {
            if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
        };
    }, [isProcessing]);

    const timeDisplay = isProcessing ? elapsedTime : lastResult;

    // Auto-Save countdown tracker
    useEffect(() => {
        if (!nextAutoSaveTime) {
            setSecondsToSave(null);
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = nextAutoSaveTime - now;
            if (diff > 0 && diff <= 10000) {
                 setSecondsToSave(Math.ceil(diff / 1000));
            } else {
                setSecondsToSave(null);
            }
        }, 200);
        return () => clearInterval(interval);
    }, [nextAutoSaveTime]);

    // Handle "Saved" status flash
    useEffect(() => {
        if (prevAutoSavingRef.current && !isAutoSaving) {
            setShowSavedState(true);
            const timer = setTimeout(() => setShowSavedState(false), 2000);
            return () => clearTimeout(timer);
        }
        prevAutoSavingRef.current = isAutoSaving;
    }, [isAutoSaving]);

    // Calculate Realtime Task Queue Stats
    const queueStats = useMemo(() => {
        let running = 0;
        let queued = 0;
        let completed = 0;
        let failed = 0;
        let currentRunningTask: any = null;

        for (const task of tasks) {
            if (task.status === 'running') {
                running++;
                if (!currentRunningTask) currentRunningTask = task;
            } else if (task.status === 'queued') {
                queued++;
            } else if (task.status === 'completed') {
                completed++;
            } else if (task.status === 'failed') {
                failed++;
            }
        }

        return {
            running,
            queued,
            completed,
            failed,
            total: tasks.length,
            currentRunningTask,
        };
    }, [tasks]);

    // Calculate Batch API Stats
    const batchStats = useMemo(() => {
        let pending = 0;
        let running = 0;
        let succeeded = 0;
        let failed = 0;
        let totalItems = 0;
        let readyToDownload = 0;

        for (const job of (batchJobs as BatchJobRecord[])) {
            if (!job) continue;
            const itemCount = Array.isArray(job.items) ? job.items.length : 0;
            if (job.state === 'PENDING') {
                pending++;
                totalItems += itemCount;
            } else if (job.state === 'RUNNING') {
                running++;
                totalItems += itemCount;
            } else if (job.state === 'SUCCEEDED') {
                succeeded++;
                const hasPendingDownloads = Array.isArray(job.items) && job.items.some(it => !it.resultUrl);
                if (hasPendingDownloads) {
                    readyToDownload++;
                }
            } else if (job.state === 'FAILED') {
                failed++;
            }
        }

        return {
            pending,
            running,
            activeJobs: pending + running,
            succeeded,
            failed,
            totalItems,
            readyToDownload,
            totalJobs: batchJobs.length,
        };
    }, [batchJobs]);

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

    const handleToggleAlwaysOnTop = async () => {
        if (isElectron) {
            const api = (window as any).electronAPI;
            if (api?.toggleAlwaysOnTop) {
                try {
                    const next = await api.toggleAlwaysOnTop();
                    setIsAlwaysOnTop(Boolean(next));
                    context.addToast(
                        next
                            ? (t('titlebar.pinnedToast') || 'Окно закреплено поверх остальных окон')
                            : (t('titlebar.unpinnedToast') || 'Окно откреплено от режима поверх всех'),
                        'info'
                    );
                    return;
                } catch (e) {
                    console.error("Failed to toggle always on top", e);
                }
            }
        }

        setIsAlwaysOnTop(prev => {
            const next = !prev;
            context.addToast(
                next
                    ? (t('titlebar.pinnedToast') || 'Окно закреплено поверх остальных окон')
                    : (t('titlebar.unpinnedToast') || 'Окно откреплено от режима поверх всех'),
                'info'
            );
            return next;
        });
    };

    const handleWindowMinimize = () => {
        const api = (window as any).electronAPI;
        if (api?.minimize) {
            api.minimize();
        }
    };

    const handleWindowMaximize = () => {
        const api = (window as any).electronAPI;
        if (api?.maximize) {
            api.maximize();
        } else {
            toggleFullScreen();
        }
    };

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

    const handleExitApp = () => {
        const api = (window as any).electronAPI;
        if (api?.close) {
            api.close();
            return;
        }

        setConfirmInfo({
            title: t('dialog.exitApp.title'),
            message: t('dialog.exitApp.message'),
            confirmLabel: t('dialog.exitApp.saveAndClose'),
            confirmVariant: 'accent',
            onConfirm: async () => {
                if (context?.forceSaveSession) {
                    await context.forceSaveSession();
                }
                if (api?.forceClose) {
                    setTimeout(() => {
                        api.forceClose();
                    }, 200);
                } else {
                    setShowWelcome(true);
                }
            },
            secondaryAction: {
                label: t('dialog.exitApp.dontSave'),
                onAction: () => {
                    if (api?.forceClose) {
                        api.forceClose();
                    } else {
                        setShowWelcome(true);
                    }
                },
                className: 'px-4 py-2 font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 hover:text-rose-200 rounded-lg transition-colors border border-rose-800/60'
            },
            cancelLabel: t('dialog.confirmDelete.cancel')
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

    const hasAnyActiveWork = queueStats.running > 0 || queueStats.queued > 0 || batchStats.activeJobs > 0 || batchStats.readyToDownload > 0;
    
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
            
            <header ref={headerRef} id="app-header" className={`fixed top-0 left-0 w-full z-40 select-none flex flex-col top-panel-unified top-panel-anim-${panelAnimation} border-b border-white/20 shadow-[0_14px_36px_rgba(0,0,0,0.75),0_6px_16px_rgba(0,0,0,0.55)] backdrop-blur-md transition-all duration-200`}>
                {/* Dynamic Panel Animation Background with Theme Adaptive support */}
                <PanelAnimationBackground
                    animation={panelAnimation}
                    theme={currentTheme}
                    isAdaptive={isPanelAnimationAdaptive}
                />
                
                {/* ========================================================================= */}
                {/* ROW 1: Main Application Header & Window Title Bar                        */}
                {/* ========================================================================= */}
                <div className="relative z-30 w-full flex items-center justify-between px-2.5 h-9 bg-transparent gap-2 app-region-drag">
                    
                    {/* Left Section: App Logo, Title (Draggable window region) & Header Quick Actions (Help, Settings, Clear Cache) */}
                    <div className="flex items-center gap-2 flex-shrink-0 app-region-drag">
                        {/* Title & Logo: Native window drag region, click does not invoke welcome screen */}
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

                        {/* Language Selector, Help, Clear Cache & Settings beside app title in top panel (interactive: app-region-no-drag) */}
                        <div className="flex items-center gap-1 app-region-no-drag">
                            {/* Language Selector */}
                            <LanguageSelector />

                            {/* Help & Documentation (in unified top panel style) */}
                            <HelpPanel 
                                buttonClassName="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                                iconClassName="h-3.5 w-3.5"
                            />

                            {/* Clear Cache Button */}
                            <Tooltip content={t('toolbar.clearCache')} position="bottom">
                                <button
                                    onClick={clearUnusedFullSizeImages}
                                    className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                                    aria-label={t('toolbar.clearCache')}
                                >
                                    <ClearCacheIcon />
                                </button>
                            </Tooltip>

                            {/* Settings Button */}
                            <Tooltip content={t('toolbar.settings')} position="bottom">
                                <button
                                    onClick={openSettings}
                                    className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                                    aria-label={t('toolbar.settings')}
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
                            {/* Mode Icon & Name */}
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

                            {/* Switch Pill Toggle Track */}
                            <div className={`w-7 h-3.5 rounded-full relative transition-colors duration-200 flex-shrink-0 ${isBatchMode ? 'bg-accent-secondary' : 'bg-gray-700'}`}>
                                <div className={`absolute top-0.5 bottom-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isBatchMode ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                            </div>

                            {/* Badges for active tasks/jobs */}
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
                                onClick={() => context.setIsHistoryPanelOpen?.(prev => !prev)}
                                className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 border ${
                                    context.isHistoryPanelOpen 
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
                        <div className="relative">
                            <Tooltip content={t('settings.themeLabel')} position="bottom">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsThemeMenuOpen(!isThemeMenuOpen); }}
                                    className={`p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 border ${
                                        isThemeMenuOpen 
                                            ? 'bg-accent text-white border-accent' 
                                            : 'bg-gray-800/70 text-gray-300 hover:bg-accent hover:text-white border-gray-700/50'
                                    }`}
                                >
                                    <PaletteIcon />
                                </button>
                            </Tooltip>
                            {isThemeMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-750 border-gray-700 rounded-lg shadow-2xl p-2 z-[100] flex flex-col gap-1 min-w-[130px] animate-fade-in-drop origin-top-right">
                                    {themes.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setTheme(theme.id)}
                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-gray-800 w-full text-left transition-colors ${currentTheme === theme.id ? 'bg-gray-800 border border-gray-600/50' : ''}`}
                                        >
                                            <div 
                                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
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

                        {/* Fullscreen Button */}
                        <Tooltip content={isFullscreen ? t('toolbar.exitFullScreen') : t('toolbar.enterFullScreen')} position="bottom">
                            <button
                                onClick={toggleFullScreen}
                                className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                                aria-label={isFullscreen ? t('toolbar.exitFullScreen') : t('toolbar.enterFullScreen')}
                            >
                                {isFullscreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
                            </button>
                        </Tooltip>

                        {/* Reload Project Button */}
                        <Tooltip content={t('dialog.settings.reload')} position="bottom">
                            <button
                                onClick={handleReloadApp}
                                className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-7 w-7 bg-gray-800/70 text-gray-300 hover:bg-red-600 hover:text-white border border-gray-700/50"
                                aria-label={t('dialog.settings.reload')}
                            >
                                <ReloadIcon />
                            </button>
                        </Tooltip>

                        <div className="w-px h-4 bg-gray-700/60 mx-1"></div>

                        {/* Electron Frameless Window Controls */}
                        <div className="flex items-center">
                            {/* PIN (Always on Top) Button */}
                            <button
                                onClick={handleToggleAlwaysOnTop}
                                className={`h-7 w-8 flex items-center justify-center transition-all rounded-sm focus:outline-none ${
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
                                className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-sm focus:outline-none"
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
                                className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-sm focus:outline-none"
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
                                className="h-7 w-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition-colors rounded-sm focus:outline-none"
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

                {/* ========================================================================= */}
                {/* ROW 2: STATUS BAR: Dual-Mode Task Queue & Batch API Status Line           */}
                {/* Unified seamless panel row, dynamically toggled                           */}
                {/* ========================================================================= */}
                {isStatusBarOpen && (
                    <div className="relative z-20 w-full bg-transparent px-3 py-1 flex items-center justify-between text-xs gap-3 overflow-x-auto hide-scrollbar app-region-drag">
                        
                        {/* Mode 1: Real-time Generation Queue Section */}
                        <div 
                            onClick={() => openTaskQueueTab('queue')}
                            className={`flex items-center gap-2.5 px-2.5 py-1 rounded-md cursor-pointer transition-all border app-region-no-drag ${
                                queueStats.running > 0 
                                    ? 'bg-cyan-950/40 border-cyan-500/40 hover:bg-cyan-950/60 shadow-sm' 
                                    : 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800 hover:border-gray-600'
                            }`}
                            title={`${t('titlebar.statusRealtime')}: ${t('queue.title')}`}
                        >
                            {/* Running Indicator Icon */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {queueStats.running > 0 ? (
                                    <div className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                                    </div>
                                ) : (
                                    <span className="text-cyan-400 font-bold text-xs">⚡</span>
                                )}
                                <span className="font-semibold text-gray-200 whitespace-nowrap">
                                    {t('titlebar.statusRealtime') || 'Генерация (Очередь)'}
                                </span>
                            </div>

                            {/* Live Task Counters */}
                            <div className="flex items-center gap-1.5">
                                {queueStats.running > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse whitespace-nowrap">
                                        {t('titlebar.realtimeRunning', { count: queueStats.running }) || `${queueStats.running} выполняется`}
                                    </span>
                                ) : null}

                                {queueStats.queued > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                        {t('titlebar.realtimeQueued', { count: queueStats.queued }) || `${queueStats.queued} в очереди`}
                                    </span>
                                )}

                                {queueStats.completed > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                        {t('titlebar.realtimeCompleted', { count: queueStats.completed }) || `${queueStats.completed} готово`}
                                    </span>
                                )}

                                {queueStats.failed > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                        {t('titlebar.realtimeFailed', { count: queueStats.failed }) || `${queueStats.failed} ошибок`}
                                    </span>
                                )}

                                {queueStats.running === 0 && queueStats.queued === 0 && queueStats.completed === 0 && queueStats.failed === 0 && (
                                    <span className="text-gray-400 text-[11px] whitespace-nowrap">
                                        {t('titlebar.realtimeIdle') || 'Очередь свободна'}
                                    </span>
                                )}
                            </div>

                            {/* Active Task Name Snippet */}
                            {queueStats.currentRunningTask && (
                                <div className="hidden lg:flex items-center gap-1 max-w-[200px] xl:max-w-[280px] pl-1.5 border-l border-cyan-800/40">
                                    <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold flex-shrink-0">
                                        {queueStats.currentRunningTask.nodeTitle || 'Node'}:
                                    </span>
                                    <span className="text-[11px] text-gray-300 truncate font-mono">
                                        {queueStats.currentRunningTask.prompt || queueStats.currentRunningTask.id}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-5 bg-gray-800 flex-shrink-0"></div>

                        {/* Mode 2: Deferred Batch API Section */}
                        <div 
                            onClick={() => openTaskQueueTab('batch')}
                            className={`flex items-center gap-2.5 px-2.5 py-1 rounded-md cursor-pointer transition-all border app-region-no-drag ${
                                batchStats.activeJobs > 0 || batchStats.readyToDownload > 0
                                    ? 'bg-gray-800/90 border-gray-700 hover:bg-gray-800 hover:border-gray-600 shadow-sm' 
                                    : 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800 hover:border-gray-600'
                            }`}
                            title={`${t('titlebar.statusBatch')}: ${t('batch.title')}`}
                        >
                            {/* Batch Indicator Icon */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {batchStats.activeJobs > 0 ? (
                                    <div className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-secondary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-secondary"></span>
                                    </div>
                                ) : (
                                    <span className="text-accent-secondary font-bold text-xs">📦</span>
                                )}
                                <span className="font-semibold text-gray-200 whitespace-nowrap">
                                    {t('titlebar.statusBatch') || 'Отложенный Batch API'}
                                </span>
                            </div>

                            {/* Batch Status Metrics */}
                            <div className="flex items-center gap-1.5">
                                {batchStats.activeJobs > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-accent-secondary border border-gray-700 animate-pulse whitespace-nowrap">
                                        {t('titlebar.batchRunning', { count: batchStats.activeJobs }) || `${batchStats.activeJobs} в обработке`} ({batchStats.totalItems} кадр.)
                                    </span>
                                ) : null}

                                {batchStats.readyToDownload > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 animate-bounce whitespace-nowrap flex items-center gap-1">
                                        <span>⬇</span>
                                        <span>{t('titlebar.batchReady', { count: batchStats.readyToDownload }) || `${batchStats.readyToDownload} готово к загрузке`}</span>
                                    </span>
                                )}

                                {batchStats.activeJobs === 0 && batchStats.readyToDownload === 0 && (
                                    <span className="text-gray-400 text-[11px] whitespace-nowrap">
                                        {t('titlebar.batchIdle') || 'Нет активных пакетов'}
                                    </span>
                                )}
                            </div>

                            {/* Manual Server Poll Trigger */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (pollActiveBatchJobs) pollActiveBatchJobs();
                                }}
                                disabled={isBatchPolling}
                                className={`p-1 rounded hover:bg-gray-700 text-accent-secondary transition-colors ${isBatchPolling ? 'animate-spin opacity-75' : ''}`}
                                title={t('batch.pollNow') || 'Проверить статус на сервере'}
                                aria-label={t('batch.pollNow') || 'Проверить статус'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                            </button>
                        </div>

                        {/* Right Area: Auto-Save Status Pill */}
                        <div className="flex items-center gap-2 ml-auto flex-shrink-0 app-region-no-drag">
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gray-800/80 border border-gray-700/60">
                                {isAutoSaving ? (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-accent animate-ping"></div>
                                        <span className="text-[10px] font-mono text-accent-text">{t('system.saving') || 'Saving...'}</span>
                                    </>
                                ) : showSavedState ? (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-mono text-emerald-400">{t('system.saved') || 'Saved'}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-mono text-gray-400">
                                            {secondsToSave !== null ? `Auto-save: ${secondsToSave}s` : 'Saved'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* ROW 3: Navigation Toolbar, Project Tabs & Live System Status              */}
                {/* ========================================================================= */}
                <div className="relative z-10 w-full flex items-center justify-between px-2.5 py-1 min-h-[38px] bg-transparent gap-2 overflow-x-auto hide-scrollbar app-region-drag">
                    
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
                                {/* Reset Canvas Button (обновить-сбросить холст) */}
                                <Tooltip content={t('toolbar.resetCanvas')} position="bottom">
                                    <button
                                        onClick={handleResetCanvas}
                                        className="p-1.5 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-8 w-8 bg-gray-800/70 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/50"
                                        aria-label={t('toolbar.resetCanvas')}
                                    >
                                        <ResetCanvasIcon />
                                    </button>
                                </Tooltip>

                                {/* Delete / Clear Canvas Button (удалить холст) */}
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

                    {/* Middle Draggable Area */}
                    <div className="flex-1 min-w-[20px] h-full app-region-drag"></div>

                    {/* Right Section: Migrated System Ready, Timer, FPS, and Debug Console */}
                    <div className="flex items-center gap-2 flex-shrink-0 app-region-no-drag">
                        
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
            </header>
        </>
    );
};

export default AppHeader;
