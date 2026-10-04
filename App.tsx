import React, { useCallback, ReactNode, useState, useEffect, useRef } from 'react';
import { LanguageContext, LanguageCode, getTranslation, TranslationKey } from './localization';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { TextContextMenuProvider } from './contexts/TextContextMenuContext';

// UI Layers
import CanvasLayer from './components/CanvasLayer';
import AppHeader from './components/AppHeader';
import DialogLayer from './components/DialogLayer';
import ImageViewer from './components/ImageViewer';
import { DockingMenu } from './components/DockingMenu';
import { SideDockingPanels } from './components/SideDockingPanels';
import { BottomMediaPanel } from './components/BottomMediaPanel';
import { DetachedNodeMiniApp } from './components/DetachedNodeMiniApp';
import { CursorEffects } from './components/cursors/CursorEffects';
import { createSaveAndExit } from './services/saveAndExit';
import { 
  matchesDeviceFilter, 
  getDeviceId, 
  isDeviceIsolationEnabled, 
  getDeviceFilterMode 
} from './utils/deviceId';

const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // secondaryLanguage is the user's preferred "native" language (e.g., RU, ES)
  const [secondaryLanguage, setSecondaryLanguage] = useState<LanguageCode>('ru');
  
  // language is what is currently displayed (toggles between 'en' and secondaryLanguage)
  // Default to 'en' per user request
  const [language, setLanguage] = useState<LanguageCode>('en');

  // Initialize from storage
  useEffect(() => {
      const storedSecondary = localStorage.getItem('settings_secondaryLanguage') as LanguageCode;
      if (storedSecondary && ['ru', 'es'].includes(storedSecondary)) {
          setSecondaryLanguage(storedSecondary);
      }
      
      // We do NOT auto-set 'language' here to storedSecondary, 
      // allowing the app to start in EN by default or maintain the explicit selection logic.
  }, []);

  // Sync Secondary changes to storage
  useEffect(() => {
      localStorage.setItem('settings_secondaryLanguage', secondaryLanguage);
  }, [secondaryLanguage]);

  const t = useCallback((key: TranslationKey | string, options?: { [key: string]: string | number }) => {
    return getTranslation(language, key as TranslationKey, options);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, secondaryLanguage, setSecondaryLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Main Editor Component - Orchestrates Layout
const Editor: React.FC = () => {
  const context = useAppContext();
  const contextRef = useRef(context);
  contextRef.current = context;
  const saveAndExitRef = useRef<ReturnType<typeof createSaveAndExit> | null>(null);
  if (!saveAndExitRef.current) saveAndExitRef.current = createSaveAndExit(
      async () => {
          if (!contextRef.current?.forceSaveSession) throw new Error('Session is not ready');
          await contextRef.current.forceSaveSession();
      },
      () => window.electronAPI?.forceClose(),
      error => {
          console.error('Save before exit failed:', error);
          window.electronAPI?.cancelSaveAndExit?.();
          window.electronAPI?.bringToFront?.();
          contextRef.current?.addToast(contextRef.current.t('settings.sessionSaveFailed'), 'error');
      }
  );

  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const hasContentRef = useRef(false);

  // Safe access for effects
  const addToast = context?.addToast;
  const t = context?.t;
  const setConfirmInfo = context?.setConfirmInfo;

  // Update hasContentRef whenever context updates
  useEffect(() => {
      if (context) {
          // Warn if there are nodes in the current tab or if there are multiple tabs
          // This covers most cases where a user might lose work
          hasContentRef.current = context.nodes.length > 0 || context.tabs.length > 1;
      }
  }, [context]);

  // Handle Close Events (Browser & Electron)
  useEffect(() => {
      const isElectron = !!(window as any).electronAPI;

      // 1. Browser Native Handler (beforeunload)
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          // Electron waits for a confirmed save before closing. Do not start a
          // second unawaited write while its renderer is being destroyed.
          if (isElectron) return;
          if (contextRef.current?.forceSaveSession) {
              contextRef.current.forceSaveSession().catch(err => console.warn('Unload save failed:', err));
          }

          // If in Electron, prevent browser default dialog as we rely on the IPC message 'app:close-request'
          if (isElectron) return;

          if (hasContentRef.current) {
              e.preventDefault();
              e.returnValue = ''; // Required for Chrome to show the standard dialog
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      // 2. Electron Handler (Custom Dialog for window close & Direct Save and Exit for Tray)
      let removeElectronListener: (() => void) | undefined;
      let removeSaveAndExitListener: (() => void) | undefined;

      if (isElectron) {
          // Listen for Save and Exit requested directly from the system tray
          if ((window as any).electronAPI.onSaveAndExitRequested) {
              removeSaveAndExitListener = (window as any).electronAPI.onSaveAndExitRequested(() => saveAndExitRef.current!());
          }

          if (setConfirmInfo && t && (window as any).electronAPI.onCloseRequested) {
              removeElectronListener = (window as any).electronAPI.onCloseRequested(() => {
                  if (hasContentRef.current) {
                      // Ensure Electron window is brought to front, un-minimized and focused
                      (window as any).electronAPI?.bringToFront?.();

                      let alwaysMinimize = false;
                      const checkAlwaysMinimize = (checked: boolean) => {
                          alwaysMinimize = checked;
                          if ((window as any).electronAPI?.setTraySettings) {
                              (window as any).electronAPI.setTraySettings({
                                  minimizeToTrayOnClose: checked,
                                  closeAction: checked ? 'tray' : 'ask'
                              });
                          }
                      };

                      // Show in-app custom dialog with Minimize to Tray, Save & Close, Close without Saving, and Cancel
                      setConfirmInfo({
                          title: t('dialog.exitApp.title'),
                          message: t('dialog.exitApp.message'),
                          confirmLabel: t('dialog.exitApp.saveAndClose'),
                          confirmVariant: 'accent',
                          onConfirm: async () => {
                              if (alwaysMinimize && (window as any).electronAPI?.setTraySettings) {
                                  await (window as any).electronAPI.setTraySettings({
                                      minimizeToTrayOnClose: true,
                                      closeAction: 'tray'
                                  });
                              }
                              await saveAndExitRef.current!();
                          },
                          secondaryAction: {
                              label: t('dialog.exitApp.dontSave'),
                              onAction: async () => {
                                  if (alwaysMinimize && (window as any).electronAPI?.setTraySettings) {
                                      await (window as any).electronAPI.setTraySettings({
                                          minimizeToTrayOnClose: true,
                                          closeAction: 'tray'
                                      });
                                  }
                                  (window as any).electronAPI.forceClose();
                              },
                              className: 'whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-lg transition-colors border border-gray-600'
                          },
                          extraAction: {
                              label: t('dialog.exitApp.minimizeToTray') || 'Minimize to Tray',
                              onAction: async () => {
                                  if (alwaysMinimize && (window as any).electronAPI?.setTraySettings) {
                                      await (window as any).electronAPI.setTraySettings({
                                          minimizeToTrayOnClose: true,
                                          closeAction: 'tray'
                                      });
                                  }
                                  (window as any).electronAPI?.minimizeToTray?.();
                              },
                              className: 'whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-semibold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 hover:text-cyan-200 rounded-lg transition-colors border border-cyan-700/60'
                          },
                          checkbox: {
                              label: t('dialog.exitApp.alwaysMinimizeToTray') || 'Always minimize to tray on close',
                              checked: false,
                              onChange: (checked: boolean) => {
                                  checkAlwaysMinimize(checked);
                              }
                          },
                          cancelLabel: t('dialog.confirmDelete.cancel')
                      });
                  } else {
                      // No content, close immediately
                      (window as any).electronAPI.forceClose();
                  }
              });
          }
      }

      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          if (removeElectronListener) removeElectronListener();
          if (removeSaveAndExitListener) removeSaveAndExitListener();
      };
  }, [setConfirmInfo, t]);

  // Handle external file load (e.g. from Nativefier double-click)
  useEffect(() => {
    const handleExternalFileLoad = (event: CustomEvent) => {
        const content = event.detail;
        // Use handleLoadFromExternal to properly manage new tabs for incoming files
        if (content && context?.handleLoadFromExternal) {
            console.log("Received external file content");
            context.handleLoadFromExternal(content);
        }
    };

    window.addEventListener('prompt-modifier-open-file', handleExternalFileLoad as EventListener);
    return () => window.removeEventListener('prompt-modifier-open-file', handleExternalFileLoad as EventListener);
  }, [context]);

  // Sync Download Path from LocalStorage to Electron
  useEffect(() => {
    const savedPath = localStorage.getItem('settings_downloadPath');
    if (savedPath && (window as any).electronAPI) {
        (window as any).electronAPI.setDownloadPath(savedPath);
    }
  }, []);

  // Listen for download completion from Electron
  useEffect(() => {
    if ((window as any).electronAPI && (window as any).electronAPI.onDownloadComplete) {
        const removeListener = (window as any).electronAPI.onDownloadComplete((dataOrEvent: any, maybeData?: any) => {
            const payload = (dataOrEvent && dataOrEvent.state) ? dataOrEvent : (maybeData && maybeData.state ? maybeData : dataOrEvent);
            if (payload && payload.state === 'completed' && payload.path) {
                const filePath: string = payload.path;
                const fileName = filePath.split(/[/\\]/).pop() || '';
                const isZip = /\.zip$/i.test(fileName);
                const isImage = /\.(png|jpe?g|webp|gif|bmp|svg|tiff|avif)$/i.test(fileName);

                let msg = t('toast.downloadSuccess') || 'Файл скачан';
                if (isZip) {
                    msg = `${t('toast.archiveDownloaded') || 'Архив скачан'}: ${fileName}`;
                } else if (isImage) {
                    msg = `${t('toast.imageDownloaded') || 'Изображение скачано'}: ${fileName}`;
                } else if (fileName) {
                    msg = `${t('toast.downloadSuccess') || 'Файл скачан'}: ${fileName}`;
                }

                addToast(msg, 'success', {
                    label: t('toast.openFolder') || 'Открыть папку',
                    onClick: () => {
                        if ((window as any).electronAPI?.showItemInFolder) {
                            (window as any).electronAPI.showItemInFolder(filePath);
                        }
                    }
                });
            }
        });
        return () => removeListener();
    }
  }, [addToast, t]);

  // Listen for Tray actions from Electron
  useEffect(() => {
    if ((window as any).electronAPI && (window as any).electronAPI.onTrayAction) {
        const removeListener = (window as any).electronAPI.onTrayAction(({ action }: { action: string }) => {
            if (action === 'new-tab') {
                contextRef.current?.handleAddTab?.();
            } else if (action === 'open-settings') {
                window.dispatchEvent(new CustomEvent('open-settings'));
            } else if (action === 'poll-batch') {
                contextRef.current?.pollActiveBatchJobs?.();
            } else if (action === 'toggle-batch-mode') {
                if (contextRef.current?.setIsBatchMode) {
                    contextRef.current.setIsBatchMode(!contextRef.current.isBatchMode);
                }
            } else if (action === 'save-and-exit') {
                saveAndExitRef.current!();
            }
        });
        return () => removeListener();
    }
  }, []);

  // Sync Batch API Status to Electron Tray in real time
  useEffect(() => {
    if (!(window as any).electronAPI?.syncBatchStatus || !context) return;

    const effectiveDeviceId = context.deviceId || getDeviceId();
    const effectiveIsolationEnabled = context.deviceIsolationEnabled ?? isDeviceIsolationEnabled();
    const effectiveFilterMode = context.deviceFilterMode || getDeviceFilterMode();

    const jobs = Array.isArray(context.batchJobs) ? context.batchJobs : [];
    let pending = 0;
    let running = 0;
    let succeeded = 0;
    let failed = 0;
    let totalItems = 0;
    let readyToDownload = 0;
    let totalFilteredJobs = 0;

    for (const job of jobs) {
      if (!job) continue;

      // Check Device ID & Isolate Batches filter
      if (effectiveIsolationEnabled) {
        if (job.deviceId && job.deviceId !== effectiveDeviceId) {
          continue;
        }
      } else if (!matchesDeviceFilter(job.deviceId, effectiveDeviceId, effectiveFilterMode)) {
        continue;
      }

      totalFilteredJobs++;
      const itemCount = Array.isArray(job.items) ? job.items.length : 0;
      if (job.state === 'PENDING') {
        pending++;
        totalItems += itemCount;
      } else if (job.state === 'RUNNING') {
        running++;
        totalItems += itemCount;
      } else if (job.state === 'SUCCEEDED') {
        succeeded++;
        const hasPendingDownloads = Array.isArray(job.items) && job.items.some((it: any) => !it.resultUrl);
        if (hasPendingDownloads) {
          readyToDownload++;
        }
      } else if (job.state === 'FAILED') {
        failed++;
      }
    }

    (window as any).electronAPI.syncBatchStatus({
      isBatchMode: Boolean(context.isBatchMode),
      isPolling: Boolean(context.isBatchPolling),
      pending,
      running,
      activeJobs: pending + running,
      succeeded,
      failed,
      totalItems,
      readyToDownload,
      totalJobs: totalFilteredJobs,
    });
  }, [
    context?.batchJobs, 
    context?.isBatchMode, 
    context?.isBatchPolling,
    context?.deviceId,
    context?.deviceIsolationEnabled,
    context?.deviceFilterMode
  ]);

  // Deferred loading effect for Canvas
  useEffect(() => {
    const timer = setTimeout(() => {
        setIsCanvasReady(true);
    }, 150); 
    
    // Global Load Delay to prevent flickering
    const globalTimer = setTimeout(() => {
        setIsAppLoaded(true);
    }, 500);

    return () => {
        clearTimeout(timer);
        clearTimeout(globalTimer);
    }
  }, []);

  if (!context) return null;

  const { 
    fileInputRef, handleFileChange, catalogFileInputRef, handleCatalogFileChange, 
    libraryFileInputRef, handleLibraryFileChange, imageSequenceFileInputRef, 
    handleImageSequenceFileChange, promptSequenceEditorFileInputRef, 
    handlePromptSequenceFileChange, characterCardFileInputRef, 
    handleCharacterCardFileChange, scriptFileInputRef, handleScriptFileChange,
    toasts,
    imageViewer, setImageViewer,
    onDownloadImageFromUrl, onCopyImageToClipboard,
    isDockingMenuVisible, dockHoverMode, clientPointerPositionRef,
  } = context;

  return (
    <>
      {/* Loading Overlay (Curtain) */}
      <div 
          className={`fixed inset-0 bg-[#111827] z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 pointer-events-none ${isAppLoaded ? 'opacity-0' : 'opacity-100'}`}
      >
           <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <div className="text-cyan-400 font-bold tracking-widest uppercase text-sm animate-pulse">Загрузка...</div>
           </div>
      </div>

      <div 
        className={`relative w-screen h-screen flex flex-col overflow-hidden bg-canvas transition-opacity duration-700 delay-300 ${isAppLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundImage: 'radial-gradient(hsla(215, 14%, 34%, 0.5) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* 1. Canvas Layer - Renders Nodes, Connections, Groups */}
        {/* Wrapped in transition opacity for smooth entry after delay */}
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isCanvasReady ? 'opacity-100' : 'opacity-0'}`}
        >
            {isCanvasReady && <CanvasLayer />}
        </div>

        {/* 2. UI Chrome Layer - Headers, Panels, Overlays - Rendered Immediately */}
        <AppHeader />
        
        {/* Global Media Player Control Panel */}
        <BottomMediaPanel />

        {/* Author Watermark */}
        <div className="absolute bottom-2 right-4 pointer-events-none z-[5] text-xs text-white/10 hover:text-white/50 transition-colors duration-300 flex flex-col items-end leading-tight select-none font-mono">
            <span className="font-bold">{t('help.author')}: MeowMaster</span>
            <span>MeowMasterArt@gmail.com</span>
            <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="pointer-events-auto hover:text-cyan-400 transition-colors mt-1">
              Powered by Netlify
            </a>
        </div>

        {/* 3. Docking Menu (Floating Top) */}
        <DockingMenu 
            isVisible={isDockingMenuVisible} 
            hoveredMode={dockHoverMode} 
            mousePosition={clientPointerPositionRef.current} 
        />
        
        {/* 3.1 Side Docking Panels (Left/Right) */}
        <SideDockingPanels />

        {/* 4. Global Modals & Dialogs */}
        <DialogLayer />
        
        {/* Dynamic Tactile Cursor Reaction Effects */}
        <CursorEffects />
        
        {/* 5. Image Viewer Overlay */}
        {imageViewer && (
          <ImageViewer
            sources={imageViewer.sources}
            initialIndex={imageViewer.initialIndex}
            initialPosition={{ x: (window.innerWidth / 2) - 512, y: (window.innerHeight / 2) - 400 }}
            onClose={() => setImageViewer(null)}
            onDownloadImageFromUrl={onDownloadImageFromUrl}
            onCopyImageToClipboard={onCopyImageToClipboard}
            addToast={addToast}
          />
        )}

        {/* 6. Hidden Inputs for File Operations */}
        <input type="file" ref={fileInputRef} className="hidden" accept=".json,.PMC,.PMP" onChange={handleFileChange} />
        <input type="file" ref={catalogFileInputRef} className="hidden" accept=".json" onChange={handleCatalogFileChange} />
        <input type="file" ref={libraryFileInputRef} className="hidden" accept=".json,.txt" onChange={handleLibraryFileChange} />
        <input type="file" ref={imageSequenceFileInputRef} className="hidden" accept=".json" onChange={handleImageSequenceFileChange} />
        <input type="file" ref={promptSequenceEditorFileInputRef} className="hidden" accept=".json" onChange={handlePromptSequenceFileChange} />
        <input type="file" ref={characterCardFileInputRef} className="hidden" accept=".json,.CHAR" onChange={handleCharacterCardFileChange} />
        <input type="file" ref={scriptFileInputRef} className="hidden" accept=".json" onChange={handleScriptFileChange} />
      </div>
    </>
  );
};

const App: React.FC = () => {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const detachedNodeId = urlParams ? urlParams.get('detachedNodeId') : null;

  return (
    <LanguageProvider>
      <AppProvider>
        <TextContextMenuProvider>
          {detachedNodeId ? (
            <DetachedNodeMiniApp nodeId={detachedNodeId} />
          ) : (
            <Editor />
          )}
        </TextContextMenuProvider>
      </AppProvider>
    </LanguageProvider>
  );
};

export default App;
