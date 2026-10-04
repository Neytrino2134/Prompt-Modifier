import { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';

export const useHeaderWindowControls = () => {
    const context = useAppContext();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

    const isElectron = Boolean(typeof window !== 'undefined' && (window as any).electronAPI);

    // Sync fullscreen state
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Sync Electron window maximize and alwaysOnTop (PIN) states
    useEffect(() => {
        if (!isElectron) return;
        const api = (window as any).electronAPI;
        if (api?.isMaximized) {
            api.isMaximized().then((max: boolean) => setIsMaximized(max)).catch(() => {});
        }
        if (api?.isAlwaysOnTop) {
            api.isAlwaysOnTop().then((top: boolean) => setIsAlwaysOnTop(Boolean(top))).catch(() => {});
        }
        let unsubMax: (() => void) | undefined;
        let unsubTop: (() => void) | undefined;
        if (api?.onMaximizedChange) {
            unsubMax = api.onMaximizedChange((max: boolean) => {
                setIsMaximized(max);
            });
        }
        if (api?.onAlwaysOnTopChange) {
            unsubTop = api.onAlwaysOnTopChange((top: boolean) => {
                setIsAlwaysOnTop(Boolean(top));
            });
        }
        return () => {
            if (typeof unsubMax === 'function') unsubMax();
            if (typeof unsubTop === 'function') unsubTop();
        };
    }, [isElectron]);

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
                    context?.addToast(
                        next
                            ? (context?.t('titlebar.pinnedToast') || 'Окно закреплено поверх остальных окон')
                            : (context?.t('titlebar.unpinnedToast') || 'Окно откреплено от режима поверх всех'),
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
            context?.addToast(
                next
                    ? (context?.t('titlebar.pinnedToast') || 'Окно закреплено поверх остальных окон')
                    : (context?.t('titlebar.unpinnedToast') || 'Окно откреплено от режима поверх всех'),
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

    const handleTitleBarDoubleClick = (e: React.MouseEvent) => {
        if (!isElectron) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, a, [role="button"], [draggable="true"], .header-dropdown-menu-container, [data-interactive="true"], .tab-item, .custom-scrollbar, .app-region-no-drag')) {
            return;
        }
        handleWindowMaximize();
    };

    const handleExitApp = () => {
        const api = (window as any).electronAPI;
        if (api?.close) {
            api.close();
            return;
        }

        if (!context) return;

        context.setConfirmInfo({
            title: context.t('dialog.exitApp.title'),
            message: context.t('dialog.exitApp.message'),
            confirmLabel: context.t('dialog.exitApp.saveAndClose'),
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
                    context.setShowWelcome(true);
                }
            },
            secondaryAction: {
                label: context.t('dialog.exitApp.dontSave'),
                onAction: () => {
                    if (api?.forceClose) {
                        api.forceClose();
                    } else {
                        context.setShowWelcome(true);
                    }
                },
                className: 'px-4 py-2 font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 hover:text-rose-200 rounded-lg transition-colors border border-rose-800/60'
            },
            cancelLabel: context.t('dialog.confirmDelete.cancel')
        });
    };

    const handleReloadApp = () => {
        if (!context) return;
        context.setConfirmInfo({
            title: context.t('dialog.reload.title'),
            message: context.t('dialog.reload.message'),
            onConfirm: () => {
                context.loadCanvasState({
                    nodes: [],
                    connections: [],
                    groups: [],
                    viewTransform: { scale: 1, translate: { x: 0, y: 0 } },
                    nodeIdCounter: 1,
                    fullSizeImageCache: {}
                });
                if (context.resetTabs) {
                   context.resetTabs('en'); 
                }
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        });
    };

    return {
        isElectron,
        isFullscreen,
        isMaximized,
        isAlwaysOnTop,
        toggleFullScreen,
        handleToggleAlwaysOnTop,
        handleWindowMinimize,
        handleWindowMaximize,
        handleTitleBarDoubleClick,
        handleExitApp,
        handleReloadApp
    };
};
