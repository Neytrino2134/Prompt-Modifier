
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';
import { ReloadIcon, GoogleDriveIcon, SettingsIcon, FolderIcon, DeleteIcon, CopyIcon } from './icons/AppIcons';
import { CustomCheckbox } from './CustomCheckbox';
import { useAppContext } from '../contexts/AppContext';
import { Theme, Point } from '../types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  setIsInstantCloseEnabled: (enabled: boolean) => void;
  anchorPosition?: Point | null;
}

const LOCAL_STORAGE_POS_KEY = 'settingsDialogPosition';

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, addToast, setIsInstantCloseEnabled, anchorPosition }) => {
  const { t } = useLanguage();
  const context = useAppContext();
  
  const [isVisible, setIsVisible] = useState(false);
  
  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const positionRef = useRef(position);
  
  const [currentOrigin, setCurrentOrigin] = useState('');

  // Sync ref for event handlers
  useEffect(() => {
      positionRef.current = position;
  }, [position]);

  // Initialize position (restore or use anchor or center)
  useEffect(() => {
      if (isOpen) {
          setIsVisible(true);
          setCurrentOrigin(window.location.origin);
          
          const saved = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
          if (saved) {
              try {
                  const parsed = JSON.parse(saved);
                  if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                       setPosition(parsed);
                       return;
                  }
              } catch (e) {}
          }
          
          if (anchorPosition) {
              // Align top-left of dialog to bottom-left of anchor
              // Adjust if it goes off screen
              const width = 512; // approximate max-w-lg
              const height = 650; // approximate
              let x = anchorPosition.x;
              let y = anchorPosition.y + 10;
              
              if (x + width > window.innerWidth) x = window.innerWidth - width - 20;
              if (y + height > window.innerHeight) y = window.innerHeight - height - 20;
              if (x < 20) x = 20;
              
              setPosition({ x, y });
          } else {
              setPosition({ 
                  x: Math.max(0, window.innerWidth / 2 - 256), 
                  y: Math.max(0, window.innerHeight / 2 - 325) 
              });
          }
      } else {
          const timer = setTimeout(() => setIsVisible(false), 200);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  if (!context) return null;

  const { 
      setNodeAnimationMode, 
      nodeAnimationMode, 
      googleClientId, 
      setGoogleClientId, 
      handleGoogleSignIn, 
      isGoogleDriveReady,
      isGoogleDriveSaving,
      handleSyncCatalogs,
      handleCleanupDuplicates, // Use new hook function
      currentTheme,
      setTheme,
      setConfirmInfo,
      loadCanvasState,
      resetTabs,
      setIsHoverHighlightEnabled, 
      isHoverHighlightEnabled,
      isConnectionAnimationEnabled,
      setIsConnectionAnimationEnabled,
      connectionOpacity,
      setConnectionOpacity
  } = context;

  const [apiKey, setApiKey] = useState('');
  const [googleDriveClientId, setGoogleDriveClientId] = useState('');
  const [useDevKey, setUseDevKey] = useState(true);
  const [instantNodeClose, setInstantNodeClose] = useState(false);
  const [hoverHighlight, setHoverHighlight] = useState(true);
  const [animMode, setAnimMode] = useState<string>('pulse');
  const [downloadPath, setDownloadPath] = useState('');

  // Check if running in Electron context
  const isElectron = !!(window as any).electronAPI;

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('settings_userApiKey') || '';
      const storedUseDev = localStorage.getItem('settings_useDevKey');
      const storedInstantClose = localStorage.getItem('settings_instantNodeClose');
      const storedAnimMode = localStorage.getItem('settings_nodeAnimationMode');
      const storedHoverHighlight = localStorage.getItem('settings_hoverHighlight'); 
      const storedDownloadPath = localStorage.getItem('settings_downloadPath') || '';
      
      const legacyAnim = localStorage.getItem('settings_nodeAnimation');
      
      setApiKey(storedKey);
      setGoogleDriveClientId(googleClientId || '');
      setUseDevKey(storedUseDev === null ? true : storedUseDev === 'true');
      setInstantNodeClose(storedInstantClose === 'true');
      setHoverHighlight(storedHoverHighlight === null ? true : storedHoverHighlight === 'true'); 
      setDownloadPath(storedDownloadPath);
      
      if (storedAnimMode) {
          setAnimMode(storedAnimMode);
      } else if (legacyAnim === 'false') {
          setAnimMode('none');
      } else {
          setAnimMode(nodeAnimationMode || 'pulse');
      }
    }
  }, [isOpen, nodeAnimationMode, googleClientId]);

  // Handler for API Key Input changes
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setApiKey(value);
      
      // Auto-switch to custom key mode if user types something
      if (value && useDevKey) {
          setUseDevKey(false);
      }
  };
  
  const handleSelectDownloadFolder = async () => {
      if ((window as any).electronAPI) {
          const path = await (window as any).electronAPI.selectFolder();
          if (path) {
              setDownloadPath(path);
          }
      }
  };
  
  const handleResetDownloadFolder = () => {
      setDownloadPath('');
  };

  const handleSave = () => {
    localStorage.setItem('settings_userApiKey', apiKey);
    localStorage.setItem('settings_useDevKey', String(useDevKey));
    localStorage.setItem('settings_instantNodeClose', String(instantNodeClose));
    localStorage.setItem('settings_nodeAnimationMode', animMode);
    localStorage.setItem('settings_hoverHighlight', String(hoverHighlight)); 
    localStorage.setItem('settings_downloadPath', downloadPath);
    
    // Notify Electron about the new path
    if ((window as any).electronAPI) {
        (window as any).electronAPI.setDownloadPath(downloadPath);
    }
    
    // Also save Google Client ID if it changed but user didn't click "Update" button
    if (setGoogleClientId && googleDriveClientId !== googleClientId) {
        setGoogleClientId(googleDriveClientId.trim());
    }
    
    setIsInstantCloseEnabled(instantNodeClose);
    if (setNodeAnimationMode) {
        setNodeAnimationMode(animMode);
    }
    if (setIsHoverHighlightEnabled) { 
        setIsHoverHighlightEnabled(hoverHighlight);
    }

    addToast(t('toast.apiKeySaved'), 'success');
    onClose();
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
  
  // Logic to determine if Google Client ID input differs from active context
  const isGoogleIdDirty = googleDriveClientId.trim() !== (googleClientId || '');

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input')) return;

      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      dragStart.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y
      };
      e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      e.preventDefault();
      e.stopPropagation();
      setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
      });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      isDragging.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      // Save position on drag end
      localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(positionRef.current));
  };

  const copyOrigin = () => {
      navigator.clipboard.writeText(currentOrigin);
      addToast(t('toast.copiedToClipboard'), 'success');
  };

  if (!isOpen && !isVisible) return null;

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

  const animModeKeyMap: Record<string, string> = {
    'pulse': 'pulse',
    'blade-runner': 'bladeRunner',
    'none': 'none'
  };

  return (
    <div className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ease-out ${isVisible && isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className="absolute bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col cursor-default max-h-[95vh] overflow-hidden pointer-events-auto border border-gray-700 transition-transform duration-200 ease-out"
        style={{
            left: position.x,
            top: position.y,
            transform: isVisible && isOpen ? 'scale(1)' : 'scale(0.95)'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div 
            className="px-6 py-4 flex justify-between items-center bg-[#18202f] cursor-move border-b border-gray-600"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
          <h2 className="text-xl font-bold text-accent-text flex items-center gap-2 pointer-events-none">
            <SettingsIcon />
            {t('dialog.settings.title')}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
            onPointerDown={(e) => e.stopPropagation()}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-gray-800">
          <p className="text-sm text-gray-400 mb-2">
            {t('dialog.settings.description')}
          </p>

          {/* Group 1: API & Access */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-1 mb-2">
                 {t('settings.group.api')}
             </h3>
             <div className="bg-gray-900/50 p-4 rounded-lg space-y-3">
                  <div className={`space-y-2 transition-opacity duration-200`}>
                    <div className="flex justify-between">
                         <label htmlFor="apiKey" className="block text-xs font-medium text-gray-400">
                           {t('dialog.settings.apiKeyLabel')}
                         </label>
                         <a 
                              href="https://aistudio.google.com/app/apikey" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                          >
                              {t('dialog.settings.getKeyLink')}
                          </a>
                    </div>
                    <input
                      type="password"
                      id="apiKey"
                      value={apiKey}
                      onChange={handleApiKeyChange}
                      placeholder={useDevKey ? "Using Free/Dev Key" : "AIzaSy..."}
                      className={`w-full p-2.5 rounded-md text-sm border focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none placeholder-gray-600 transition-colors
                        ${useDevKey 
                            ? 'bg-gray-800 border-gray-700 text-gray-500' 
                            : 'bg-gray-900 border-gray-600 text-white'
                        }
                      `}
                    />
                  </div>

                  <div className="pt-1">
                    <CustomCheckbox
                        id="useDevKey"
                        checked={useDevKey}
                        onChange={(checked) => {
                             setUseDevKey(checked);
                        }}
                        label={t('dialog.settings.useDevKeyLabel')}
                        className="text-sm text-gray-400"
                    />
                  </div>
             </div>
          </div>

          {/* Group 2: Appearance & Behavior */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-1 mb-2">
                 {t('settings.group.style')}
             </h3>
             <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
                 
                 {/* Theme Selector */}
                 <div className="space-y-2">
                     <label className="block text-xs font-medium text-gray-400">{t('settings.themeLabel')}</label>
                     <div className="flex flex-wrap gap-3">
                         {themes.map(theme => (
                             <button
                                key={theme.id}
                                onClick={() => setTheme(theme.id)}
                                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${currentTheme === theme.id ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: theme.color }}
                                title={theme.label}
                             >
                                 {currentTheme === theme.id && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white drop-shadow-md" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Animation Mode */}
                 <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-400">
                          {t('dialog.settings.animationModeLabel')}
                      </label>
                      <div className="flex bg-gray-800 rounded-md p-1 border border-gray-700">
                          {['pulse', 'blade-runner', 'none'].map((mode) => (
                              <button
                                  key={mode}
                                  onClick={() => setAnimMode(mode)}
                                  className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${animMode === mode ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                  {t(`dialog.settings.anim.${animModeKeyMap[mode] || mode}` as any)}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="pt-1 flex flex-col gap-2">
                    <CustomCheckbox
                        id="instantNodeClose"
                        checked={instantNodeClose}
                        onChange={(checked) => setInstantNodeClose(checked)}
                        label={t('dialog.settings.instantNodeCloseLabel')}
                        className="text-sm text-gray-400"
                    />
                     <CustomCheckbox
                        id="hoverHighlight"
                        checked={hoverHighlight}
                        onChange={(checked) => setHoverHighlight(checked)}
                        label={t('dialog.settings.hoverHighlightLabel')}
                        className="text-sm text-gray-400"
                    />
                  </div>

                 {/* Connection Settings */}
                 <div className="space-y-2">
                     <label className="block text-xs font-medium text-gray-400">
                         {t('dialog.settings.connectionsLabel')}
                     </label>
                     <div className="flex flex-col gap-2 p-2 bg-gray-800 rounded-md border border-gray-700">
                         <CustomCheckbox
                            id="connectionAnimation"
                            checked={isConnectionAnimationEnabled}
                            onChange={(checked) => setIsConnectionAnimationEnabled(checked)}
                            label={t('dialog.settings.connectionAnimationLabel')}
                            className="text-sm text-gray-300"
                        />
                         <div className="space-y-1 pt-1">
                             <div className="flex justify-between text-xs text-gray-400">
                                 <span>{t('dialog.settings.connectionOpacityLabel')}</span>
                                 <span>{Math.round(connectionOpacity * 100)}%</span>
                             </div>
                             <input 
                                type="range" 
                                min="0.1" 
                                max="1" 
                                step="0.1" 
                                value={connectionOpacity} 
                                onChange={(e) => setConnectionOpacity(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent"
                             />
                         </div>
                     </div>
                 </div>
                 
                 {/* Download Path (Electron Only) */}
                 {isElectron && (
                     <div className="space-y-2 pt-2 border-t border-gray-700/50">
                         <label className="block text-xs font-medium text-gray-400">
                             {t('dialog.settings.downloadPathLabel')}
                         </label>
                         <div className="flex gap-2">
                             <div className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-xs text-gray-300 truncate" title={downloadPath || "Default"}>
                                 {downloadPath || <span className="text-gray-500 italic">Downloads Folder (Default)</span>}
                             </div>
                             <button
                                 onClick={handleSelectDownloadFolder}
                                 className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md border border-gray-600"
                                 title={t('dialog.settings.selectFolder')}
                             >
                                 <FolderIcon className="w-4 h-4" />
                             </button>
                             {downloadPath && (
                                 <button
                                     onClick={handleResetDownloadFolder}
                                     className="p-2 bg-gray-700 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-md border border-gray-600 hover:border-red-800"
                                     title={t('dialog.settings.resetPath')}
                                 >
                                     <DeleteIcon className="w-4 h-4" />
                                 </button>
                             )}
                         </div>
                     </div>
                 )}
             </div>
          </div>

          {/* Group 3: Cloud Storage */}
          <div className="space-y-3">
             <div className="flex justify-between items-end border-b border-gray-700 pb-1 mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('settings.group.drive')}</h3>
             </div>
             
             <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
                  
                  {/* Origin Display Helper */}
                  <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-500">
                          Detected Origin (For Google Cloud Console):
                      </label>
                      <div className="flex items-center gap-2">
                          <code className="flex-grow bg-black/30 p-1.5 rounded text-[10px] text-gray-300 font-mono truncate border border-gray-700">
                              {currentOrigin}
                          </code>
                          <button onClick={copyOrigin} className="p-1.5 text-gray-400 hover:text-white bg-gray-700 rounded hover:bg-gray-600" title="Copy Origin">
                              <CopyIcon className="h-3.5 w-3.5" />
                          </button>
                      </div>
                      <p className="text-[10px] text-gray-600 italic">
                          Add this URL to "Authorized JavaScript origins" in your Google Cloud Project if Auth fails.
                      </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-700/30">
                    <label htmlFor="googleClientId" className="block text-xs font-medium text-gray-400">
                      {t('settings.googleClientIdLabel')}
                    </label>
                    <input
                      type="text"
                      id="googleClientId"
                      value={googleDriveClientId}
                      onChange={(e) => setGoogleDriveClientId(e.target.value)}
                      placeholder="Google Cloud Client ID"
                      className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none placeholder-gray-600"
                    />
                  </div>

                  {/* Smart Contextual Action Button */}
                  {isGoogleIdDirty ? (
                     <button
                        onClick={() => {
                            if (setGoogleClientId) setGoogleClientId(googleDriveClientId.trim());
                        }}
                        className="w-full py-2 px-4 rounded-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
                     >
                        <GoogleDriveIcon className="w-4 h-4" />
                        {t('settings.updateId')}
                     </button>
                  ) : !isGoogleDriveReady ? (
                     <button
                        className="w-full py-2 px-4 rounded-md text-sm font-bold text-gray-400 bg-gray-700 cursor-not-allowed flex items-center justify-center gap-2"
                        disabled
                     >
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('settings.connecting')}
                     </button>
                  ) : (
                      <div className="flex flex-col gap-2">
                        <button
                            onClick={() => handleGoogleSignIn && handleGoogleSignIn()}
                            className={`w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-900/20`}
                        >
                            <GoogleDriveIcon className="w-4 h-4" />
                            {t('settings.signInWithGoogle')}
                        </button>
                        
                         {/* Cleanup Button */}
                         {handleCleanupDuplicates && (
                             <button
                                onClick={handleCleanupDuplicates}
                                disabled={isGoogleDriveSaving}
                                className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 shadow-md"
                             >
                                {isGoogleDriveSaving ? (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <span className="flex items-center gap-2">Cleanup Duplicates in Cloud</span>
                                )}
                             </button>
                         )}

                         {/* Sync Button */}
                         {handleSyncCatalogs && (
                             <button
                                onClick={handleSyncCatalogs}
                                disabled={isGoogleDriveSaving}
                                className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 shadow-md"
                             >
                                {isGoogleDriveSaving ? (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                                Sync Catalogs from Drive
                             </button>
                         )}
                      </div>
                  )}
             </div>
          </div>

        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-between items-center">
          <button
              onClick={handleReloadApp}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-900/50"
              title={t('dialog.settings.reload')}
          >
              <ReloadIcon />
              <span className="text-sm font-bold">{t('dialog.settings.reload')}</span>
          </button>
          
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg transition-all shadow-lg shadow-accent/40 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('dialog.settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
