
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';
import { ReloadIcon, GoogleDriveIcon, SettingsIcon, FolderIcon, DeleteIcon, CopyIcon, PaletteIcon } from './icons/AppIcons';
import { CustomCheckbox } from './CustomCheckbox';
import CustomSelect from './CustomSelect';
import { useAppContext } from '../contexts/AppContext';
import { Theme, Point, PanelAnimation } from '../types';
import { 
    getAvailableFlashModels, 
    getAvailableProModels, 
    getAvailableTranscribeModels,
    getAvailableVideoModels,
    getConfiguredFlashModel, 
    getConfiguredProModel, 
    getConfiguredTranscribeModel,
    getConfiguredVideoModel,
    getConfiguredImageModel,
    setConfiguredImageModel,
    getConfiguredImageEditorModel,
    setConfiguredImageEditorModel,
    getImageModelOptions,
    getImageEditorModelOptions,
    setConfiguredFlashModel, 
    setConfiguredProModel,
    setConfiguredTranscribeModel,
    setConfiguredVideoModel,
    addCustomModel,
    ModelOption,
    VideoModelOption,
    ImageModelOption,
    isOpenAiEnabled,
    setOpenAiEnabled,
    getOpenAiApiKey,
    setOpenAiApiKey
} from '../services/modelConfig';
import { MicrophoneSettingsTab } from './MicrophoneSettingsTab';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  setIsInstantCloseEnabled: (enabled: boolean) => void;
  anchorPosition?: Point | null;
}

const LOCAL_STORAGE_POS_KEY = 'settingsDialogPosition';

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, addToast, setIsInstantCloseEnabled, anchorPosition }) => {
  const { t } = useLanguage();
  const context = useAppContext();
  
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'api' | 'llm' | 'microphone' | 'appearance' | 'cloud'>('all');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleSelectTab = (tab: 'all' | 'api' | 'llm' | 'microphone' | 'appearance' | 'cloud') => {
    setActiveTab(tab);
    const targetTabEl = tabRefs.current[tab];
    if (targetTabEl) {
      targetTabEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) || e.deltaY !== 0) {
        tabsContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };
  
  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const positionRef = useRef(position);
  
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    api: false,
    llm: false,
    microphone: false,
    appearance: false,
    cloud: false,
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

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
              const width = 512;
              const height = 480;
              let x = anchorPosition.x;
              let y = anchorPosition.y + 10;
              
              if (x + width > window.innerWidth) x = window.innerWidth - width - 20;
              if (y + height > window.innerHeight) y = window.innerHeight - height - 20;
              if (x < 20) x = 20;
              if (y < 20) y = 20;
              
              setPosition({ x, y });
          } else {
              setPosition({ 
                  x: Math.max(20, Math.round(window.innerWidth / 2 - 256)), 
                  y: Math.max(20, Math.round(window.innerHeight / 2 - 240)) 
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
      handleCleanupDuplicates,
      currentTheme,
      setTheme,
      setConfirmInfo,
      loadCanvasState,
      resetTabs,
      setIsHoverHighlightEnabled, 
      isHoverHighlightEnabled,
      setIsBringToFrontOnHoverEnabled,
      isBringToFrontOnHoverEnabled,
      isConnectionAnimationEnabled,
      setIsConnectionAnimationEnabled,
      connectionOpacity,
      setConnectionOpacity,
      autoSaveInterval,
      setAutoSaveInterval,
      panelStyle,
      setPanelStyle,
      isPanelAutoHide,
      setIsPanelAutoHide,
      panelAnimation = 'shimmer',
      setPanelAnimation
  } = context;

  const [apiKey, setApiKey] = useState('');
  const [openAiEnabled, setOpenAiEnabledState] = useState(false);
  const [openAiApiKey, setOpenAiApiKeyState] = useState('');
  const [showOpenAiApiKey, setShowOpenAiApiKey] = useState(false);
  const [googleDriveClientId, setGoogleDriveClientId] = useState('');
  const [instantNodeClose, setInstantNodeClose] = useState(false);
  const [hoverHighlight, setHoverHighlight] = useState(true);
  const [bringToFrontOnHover, setBringToFrontOnHover] = useState(true);
  const [animMode, setAnimMode] = useState<string>('pulse');
  const [downloadPath, setDownloadPath] = useState('');

  // LLM Models State
  const [flashModel, setFlashModel] = useState<string>(getConfiguredFlashModel);
  const [proModel, setProModel] = useState<string>(getConfiguredProModel);
  const [transcribeModel, setTranscribeModel] = useState<string>(getConfiguredTranscribeModel);
  const [videoModel, setVideoModel] = useState<string>(getConfiguredVideoModel);
  const [imageModel, setImageModel] = useState<string>(getConfiguredImageModel);
  const [imageEditorModel, setImageEditorModel] = useState<string>(getConfiguredImageEditorModel);
  const [availableFlash, setAvailableFlash] = useState<ModelOption[]>(getAvailableFlashModels);
  const [availablePro, setAvailablePro] = useState<ModelOption[]>(getAvailableProModels);
  const [availableTranscribe, setAvailableTranscribe] = useState<ModelOption[]>(getAvailableTranscribeModels);
  const [availableVideo, setAvailableVideo] = useState<VideoModelOption[]>(getAvailableVideoModels);
  const [availableImage, setAvailableImage] = useState<ImageModelOption[]>(() => getImageModelOptions(isOpenAiEnabled()));
  const [availableImageEditor, setAvailableImageEditor] = useState<ImageModelOption[]>(() => getImageEditorModelOptions(isOpenAiEnabled()));
  const [customModelInput, setCustomModelInput] = useState('');
  const [customModelTier, setCustomModelTier] = useState<'flash' | 'pro' | 'video'>('flash');

  // Check if running in Electron context
  const isElectron = !!(window as any).electronAPI;

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('settings_userApiKey') || '';
      const storedInstantClose = localStorage.getItem('settings_instantNodeClose');
      const storedAnimMode = localStorage.getItem('settings_nodeAnimationMode');
      const storedHoverHighlight = localStorage.getItem('settings_hoverHighlight'); 
      const storedBringToFront = localStorage.getItem('settings_bringToFrontOnHover');
      const storedDownloadPath = localStorage.getItem('settings_downloadPath') || '';
      
      const legacyAnim = localStorage.getItem('settings_nodeAnimation');
      
      setApiKey(storedKey);
      setOpenAiEnabledState(isOpenAiEnabled());
      setOpenAiApiKeyState(getOpenAiApiKey());
      setGoogleDriveClientId(googleClientId || '');
      setInstantNodeClose(storedInstantClose === 'true');
      setHoverHighlight(storedHoverHighlight === null ? true : storedHoverHighlight === 'true'); 
      setBringToFrontOnHover(storedBringToFront === null ? true : storedBringToFront === 'true');
      setDownloadPath(storedDownloadPath);
      
      setFlashModel(getConfiguredFlashModel());
      setProModel(getConfiguredProModel());
      setTranscribeModel(getConfiguredTranscribeModel());
      setVideoModel(getConfiguredVideoModel());
      setImageModel(getConfiguredImageModel());
      setImageEditorModel(getConfiguredImageEditorModel());
      setAvailableFlash(getAvailableFlashModels());
      setAvailablePro(getAvailableProModels());
      setAvailableTranscribe(getAvailableTranscribeModels());
      setAvailableVideo(getAvailableVideoModels());
      setAvailableImage(getImageModelOptions(isOpenAiEnabled()));
      setAvailableImageEditor(getImageEditorModelOptions(isOpenAiEnabled()));

      if (storedAnimMode) {
          setAnimMode(storedAnimMode);
      } else if (legacyAnim === 'false') {
          setAnimMode('none');
      } else {
          setAnimMode(nodeAnimationMode || 'pulse');
      }
    }
  }, [isOpen, nodeAnimationMode, googleClientId]);

  const handleAddCustomModel = () => {
      const trimmed = customModelInput.trim();
      if (!trimmed) return;
      
      if (customModelTier === 'video') {
          const newVideoModel: VideoModelOption = {
              id: trimmed,
              name: trimmed,
              description: 'Custom Video Model',
              provider: 'google',
              tier: 'flash',
              supportedAspectRatios: ['16:9', '9:16', '1:1'],
              supportedResolutions: ['720p', '1080p'],
              supportedDurations: ['5s', '10s']
          };
          // Also persist as custom model
          addCustomModel({
              id: trimmed,
              name: trimmed,
              description: 'Custom Video Model',
              tier: 'flash'
          });
          setVideoModel(trimmed);
          setConfiguredVideoModel(trimmed);
          setAvailableVideo(getAvailableVideoModels());
      } else {
          const newModel: ModelOption = {
              id: trimmed,
              name: trimmed,
              description: `Custom ${customModelTier.toUpperCase()} Model`,
              tier: customModelTier
          };

          addCustomModel(newModel);
          setAvailableFlash(getAvailableFlashModels());
          setAvailablePro(getAvailableProModels());
          
          if (customModelTier === 'flash') {
              setFlashModel(trimmed);
              setConfiguredFlashModel(trimmed);
          } else {
              setProModel(trimmed);
              setConfiguredProModel(trimmed);
          }
      }
      
      setCustomModelInput('');
      addToast(`Added model ${trimmed} to pool`, 'success');
  };

  // Handler for Gemini API Key Input changes (instant save)
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setApiKey(val);
      localStorage.setItem('settings_userApiKey', val.trim());
  };

  // Handler for OpenAI Toggle (instant save)
  const handleOpenAiToggle = (checked: boolean) => {
      setOpenAiEnabledState(checked);
      setOpenAiEnabled(checked);
      setAvailableImage(getImageModelOptions(checked));
      setAvailableImageEditor(getImageEditorModelOptions(checked));
  };

  // Handler for OpenAI API Key (instant save)
  const handleOpenAiApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setOpenAiApiKeyState(val);
      setOpenAiApiKey(val.trim());
  };

  // Handler for Animation Mode (instant save)
  const handleAnimModeChange = (mode: string) => {
      setAnimMode(mode);
      localStorage.setItem('settings_nodeAnimationMode', mode);
      if (setNodeAnimationMode) {
          setNodeAnimationMode(mode);
      }
  };

  // Handler for Instant Node Close (instant save)
  const handleInstantNodeCloseChange = (checked: boolean) => {
      setInstantNodeClose(checked);
      localStorage.setItem('settings_instantNodeClose', String(checked));
      setIsInstantCloseEnabled(checked);
  };

  // Handler for Hover Highlight (instant save)
  const handleHoverHighlightChange = (checked: boolean) => {
      setHoverHighlight(checked);
      localStorage.setItem('settings_hoverHighlight', String(checked));
      if (setIsHoverHighlightEnabled) {
          setIsHoverHighlightEnabled(checked);
      }
  };

  // Handler for Bring to Front on Hover (instant save)
  const handleBringToFrontOnHoverChange = (checked: boolean) => {
      setBringToFrontOnHover(checked);
      localStorage.setItem('settings_bringToFrontOnHover', String(checked));
      if (setIsBringToFrontOnHoverEnabled) {
          setIsBringToFrontOnHoverEnabled(checked);
      }
  };

  // Handler for Connection Animation (instant save)
  const handleConnectionAnimationChange = (checked: boolean) => {
      setIsConnectionAnimationEnabled(checked);
      localStorage.setItem('settings_connectionAnimation', String(checked));
  };

  // Handler for Connection Opacity (instant save)
  const handleConnectionOpacityChange = (val: number) => {
      setConnectionOpacity(val);
      localStorage.setItem('settings_connectionOpacity', String(val));
  };
  
  const handleSelectDownloadFolder = async () => {
      if ((window as any).electronAPI) {
          const path = await (window as any).electronAPI.selectFolder();
          if (path) {
              setDownloadPath(path);
              localStorage.setItem('settings_downloadPath', path);
              (window as any).electronAPI.setDownloadPath(path);
          }
      }
  };
  
  const handleResetDownloadFolder = () => {
      setDownloadPath('');
      localStorage.setItem('settings_downloadPath', '');
      if ((window as any).electronAPI) {
          (window as any).electronAPI.setDownloadPath('');
      }
  };

  // Handler for Google Drive Client ID
  const handleGoogleDriveClientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setGoogleDriveClientId(val);
      if (setGoogleClientId) {
          setGoogleClientId(val.trim());
      }
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
        className="absolute bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col cursor-default max-h-[82vh] overflow-hidden pointer-events-auto border border-gray-700 transition-transform duration-200 ease-out"
        style={{
            left: position.x,
            top: position.y,
            transform: isVisible && isOpen ? 'scale(1)' : 'scale(0.95)'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
            className="px-5 py-3.5 flex justify-between items-center bg-[#18202f] cursor-move border-b border-gray-700"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
          <h2 className="text-lg font-bold text-accent-text flex items-center gap-2 pointer-events-none">
            <SettingsIcon />
            {t('dialog.settings.title')}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
            onPointerDown={(e) => e.stopPropagation()}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto custom-scrollbar bg-gray-800 flex-1">
          <p className="text-xs text-gray-400 mb-1 leading-normal">
            {t('dialog.settings.description')}
          </p>

          {/* Category Tabs */}
          <div 
            ref={tabsContainerRef}
            onWheel={handleTabsWheel}
            className="flex items-center gap-1 p-1 bg-gray-900/90 rounded-lg border border-gray-700/60 overflow-x-auto no-scrollbar scroll-smooth"
          >
              <button
                  type="button"
                  ref={el => { tabRefs.current['all'] = el; }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectTab('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none border ${
                      activeTab === 'all'
                          ? 'bg-gray-700 text-white shadow-sm border-gray-600'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
                  }`}
              >
                  {t('settings.tab.all')}
              </button>
              <button
                  type="button"
                  ref={el => { tabRefs.current['api'] = el; }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectTab('api')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
                      activeTab === 'api'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
                  }`}
              >
                  <KeyIcon />
                  <span>{t('settings.tab.api')}</span>
              </button>
              <button
                  type="button"
                  ref={el => { tabRefs.current['llm'] = el; }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectTab('llm')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
                      activeTab === 'llm'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
                  }`}
              >
                  <span className="text-xs">⚡</span>
                  <span>{t('settings.tab.models')}</span>
              </button>
              <button
                  type="button"
                  ref={el => { tabRefs.current['microphone'] = el; }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectTab('microphone')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
                      activeTab === 'microphone'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
                  }`}
              >
                  <MicIcon />
                  <span>{t('settings.tab.microphone')}</span>
              </button>
              <button
                  type="button"
                  ref={el => { tabRefs.current['appearance'] = el; }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectTab('appearance')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
                      activeTab === 'appearance'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
                  }`}
              >
                  <PaletteIcon />
                  <span>{t('settings.tab.appearance')}</span>
              </button>
              <button
                  type="button"
                  ref={el => { tabRefs.current['cloud'] = el; }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectTab('cloud')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
                      activeTab === 'cloud'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
                  }`}
              >
                  <GoogleDriveIcon className="w-3.5 h-3.5" />
                  <span>{t('settings.tab.cloud')}</span>
              </button>
          </div>

          {/* Group 1: API & Access */}
          {(activeTab === 'all' || activeTab === 'api') && (
            <div className="space-y-1.5">
             <button 
                type="button"
                onClick={() => toggleSection('api')}
                className="w-full flex justify-between items-center px-3.5 py-2.5 bg-gray-900/80 hover:bg-gray-700/60 rounded-lg border border-gray-700/70 transition-all text-left group select-none shadow-sm"
             >
                <div className="flex items-center gap-2.5">
                    <span className="text-cyan-400 group-hover:scale-110 transition-transform">
                        <KeyIcon />
                    </span>
                    <span className="text-xs font-bold text-gray-200 group-hover:text-white uppercase tracking-wider">
                        {t('settings.group.api')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-200">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.api ? 'rotate-180 text-cyan-400' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
             </button>
             
             {!collapsedSections.api && (
                 <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                             <label htmlFor="apiKey" className="block text-xs font-medium text-gray-300">
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
                        <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              id="apiKey"
                              value={apiKey}
                              onChange={handleApiKeyChange}
                              placeholder="AIzaSy..."
                              className="w-full p-2.5 pr-9 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none placeholder-gray-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                              title={showApiKey ? "Hide Key" : "Show Key"}
                            >
                              {showApiKey ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                        </div>
                      </div>

                      {/* OpenAI API Configuration */}
                      <div className="border-t border-gray-700/60 pt-3">
                         <div className="p-3 bg-gray-950/40 rounded-lg border border-gray-700/40 space-y-2.5">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                     <CustomCheckbox
                                         id="openai-enabled-toggle"
                                         checked={openAiEnabled}
                                         onChange={handleOpenAiToggle}
                                         label={t('settings.openaiEnabled')}
                                         className="font-semibold text-xs text-gray-200"
                                     />
                                 </div>
                                 <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                     openAiEnabled 
                                         ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                         : 'bg-gray-800 text-gray-400 border border-gray-700'
                                 }`}>
                                     {openAiEnabled ? t('settings.openaiActive') : t('settings.openaiInactive')}
                                 </span>
                             </div>

                             <p className="text-[11px] text-gray-400 leading-tight">
                                 {t('settings.openaiEnabledDesc')}
                             </p>

                             {openAiEnabled && (
                                 <div className="space-y-1.5 pt-1">
                                     <div className="flex justify-between items-center">
                                         <label htmlFor="openAiApiKey" className="block text-xs font-medium text-gray-300">
                                             {t('settings.openaiApiKeyLabel')}
                                         </label>
                                         <a 
                                              href="https://platform.openai.com/api-keys" 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                                          >
                                              {t('settings.openaiGetKeyLink')}
                                          </a>
                                     </div>
                                     <div className="relative">
                                         <input
                                           type={showOpenAiApiKey ? "text" : "password"}
                                           id="openAiApiKey"
                                           value={openAiApiKey}
                                           onChange={handleOpenAiApiKeyChange}
                                           placeholder="sk-proj-..."
                                           className="w-full p-2.5 pr-9 bg-gray-900 border border-gray-600 rounded-md text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none placeholder-gray-500 transition-colors"
                                         />
                                         <button
                                           type="button"
                                           onClick={() => setShowOpenAiApiKey(!showOpenAiApiKey)}
                                           className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                                           title={showOpenAiApiKey ? "Hide Key" : "Show Key"}
                                         >
                                           {showOpenAiApiKey ? (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                               <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                             </svg>
                                           ) : (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                               <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                               <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                             </svg>
                                           )}
                                         </button>
                                     </div>
                                 </div>
                             )}
                         </div>
                      </div>
                 </div>
             )}
          </div>
          )}

          {/* Group: LLM Models Selection */}
          {(activeTab === 'all' || activeTab === 'llm') && (
          <div className="space-y-1.5">
             <button 
                type="button"
                onClick={() => toggleSection('llm')}
                className="w-full flex justify-between items-center px-3.5 py-2.5 bg-gray-900/80 hover:bg-gray-700/60 rounded-lg border border-gray-700/70 transition-all text-left group select-none shadow-sm"
             >
                <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </span>
                    <span className="text-xs font-bold text-gray-200 group-hover:text-white uppercase tracking-wider">
                        {t('settings.group.llm')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-200">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.llm ? 'rotate-180 text-amber-400' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
             </button>
             
             {!collapsedSections.llm && (
                 <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3.5">
                     {/* Flash Model Selection */}
                     <div className="space-y-1">
                         <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                 <span className="text-amber-400">⚡</span>
                                 {t('settings.llmFlashModelLabel')}
                             </label>
                             <span className="text-[10px] text-amber-400/80 font-mono">{flashModel}</span>
                         </div>
                         <p className="text-[11px] text-gray-400 leading-tight">
                             {t('settings.llmFlashModelDesc')}
                         </p>
                         <CustomSelect
                             value={flashModel}
                             onChange={(val) => {
                                 setFlashModel(val);
                                 setConfiguredFlashModel(val);
                             }}
                             options={availableFlash.map(m => ({
                                 value: m.id,
                                 label: `${m.name} (${m.id})`
                             }))}
                         />
                     </div>

                     {/* Pro Model Selection */}
                     <div className="space-y-1 pt-2 border-t border-gray-800">
                         <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                 <span className="text-purple-400">✨</span>
                                 {t('settings.llmProModelLabel')}
                             </label>
                             <span className="text-[10px] text-purple-400/80 font-mono">{proModel}</span>
                         </div>
                         <p className="text-[11px] text-gray-400 leading-tight">
                             {t('settings.llmProModelDesc')}
                         </p>
                         <CustomSelect
                             value={proModel}
                             onChange={(val) => {
                                 setProModel(val);
                                 setConfiguredProModel(val);
                             }}
                             options={availablePro.map(m => ({
                                 value: m.id,
                                 label: `${m.name} (${m.id})`
                             }))}
                         />
                     </div>

                     {/* Audio Transcription Model Selection */}
                     <div className="space-y-1 pt-2 border-t border-gray-800">
                         <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                 <span className="text-cyan-400">🎙️</span>
                                 {t('settings.llmTranscribeModelLabel')}
                             </label>
                             <span className="text-[10px] text-cyan-400/80 font-mono">{transcribeModel}</span>
                         </div>
                         <p className="text-[11px] text-gray-400 leading-tight">
                             {t('settings.llmTranscribeModelDesc')}
                         </p>
                         <CustomSelect
                             value={transcribeModel}
                             onChange={(val) => {
                                 setTranscribeModel(val);
                                 setConfiguredTranscribeModel(val);
                             }}
                             options={availableTranscribe.map(m => ({
                                 value: m.id,
                                 label: `${m.name} (${m.id})`
                             }))}
                         />
                     </div>

                     {/* Default Image Generation Model Selection */}
                     <div className="space-y-1 pt-2 border-t border-gray-800">
                         <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                 <span className="text-emerald-400">🖼️</span>
                                 {t('settings.llmImageModelLabel')}
                             </label>
                             <span className="text-[10px] text-emerald-400/80 font-mono">{imageModel}</span>
                         </div>
                         <p className="text-[11px] text-gray-400 leading-tight">
                             {t('settings.llmImageModelDesc')}
                         </p>
                         <CustomSelect
                             value={imageModel}
                             onChange={(val) => {
                                 setImageModel(val);
                                 setConfiguredImageModel(val);
                             }}
                             options={availableImage.map(m => ({
                                 value: m.value,
                                 label: m.label
                             }))}
                         />
                     </div>

                     {/* Default AI Image Editor Model Selection */}
                     <div className="space-y-1 pt-2 border-t border-gray-800">
                         <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                 <span className="text-sky-400">🎨</span>
                                 {t('settings.llmImageEditorModelLabel')}
                             </label>
                             <span className="text-[10px] text-sky-400/80 font-mono">{imageEditorModel}</span>
                         </div>
                         <p className="text-[11px] text-gray-400 leading-tight">
                             {t('settings.llmImageEditorModelDesc')}
                         </p>
                         <CustomSelect
                             value={imageEditorModel}
                             onChange={(val) => {
                                 setImageEditorModel(val);
                                 setConfiguredImageEditorModel(val);
                             }}
                             options={availableImageEditor.map(m => ({
                                 value: m.value,
                                 label: m.label
                             }))}
                         />
                     </div>

                     {/* Video Generation Model Selection */}
                     <div className="space-y-1 pt-2 border-t border-gray-800">
                         <div className="flex items-center justify-between">
                             <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                 <span className="text-rose-400">🎬</span>
                                 {t('settings.llmVideoModelLabel')}
                             </label>
                             <span className="text-[10px] text-rose-400/80 font-mono">{videoModel}</span>
                         </div>
                         <p className="text-[11px] text-gray-400 leading-tight">
                             {t('settings.llmVideoModelDesc')}
                         </p>
                         <CustomSelect
                             value={videoModel}
                             onChange={(val) => {
                                 setVideoModel(val);
                                 setConfiguredVideoModel(val);
                             }}
                             options={availableVideo.map(m => ({
                                 value: m.id,
                                 label: `${m.name} (${m.id})`
                             }))}
                         />
                     </div>

                     {/* Add Custom Model to Pool */}
                     <div className="space-y-1.5 pt-2 border-t border-gray-800">
                         <label className="block text-[11px] font-medium text-gray-400">
                             {t('settings.llmCustomModel')}
                         </label>
                         <div className="flex gap-2">
                             <input
                                 type="text"
                                 value={customModelInput}
                                 onChange={(e) => setCustomModelInput(e.target.value)}
                                 placeholder="e.g. gemini-3.7-flash, gemini-omni-1.1-flash or veo-2.0"
                                 className="flex-1 p-2 bg-gray-900 border border-gray-700 rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
                             />
                             <select
                                 value={customModelTier}
                                 onChange={(e) => setCustomModelTier(e.target.value as 'flash' | 'pro' | 'video')}
                                 className="bg-gray-900 border border-gray-700 rounded-md text-xs text-gray-300 px-2 focus:outline-none"
                             >
                                 <option value="flash">Flash</option>
                                 <option value="pro">Pro</option>
                                 <option value="video">Video</option>
                             </select>
                             <button
                                 type="button"
                                 disabled={!customModelInput.trim()}
                                 onClick={handleAddCustomModel}
                                 className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-md disabled:bg-gray-700 disabled:text-gray-500 transition-colors shadow-sm whitespace-nowrap"
                             >
                                 {t('settings.llmAddCustom')}
                             </button>
                         </div>
                     </div>
                 </div>
             )}
          </div>
          )}

          {/* Group 3: Microphone Settings & Live Testing */}
          {(activeTab === 'all' || activeTab === 'microphone') && (
            <div className="space-y-1.5">
              {activeTab === 'all' ? (
                <>
                  <button 
                    type="button"
                    onClick={() => toggleSection('microphone')}
                    className="w-full flex justify-between items-center px-3.5 py-2.5 bg-gray-900/80 hover:bg-gray-700/60 rounded-lg border border-gray-700/70 transition-all text-left group select-none shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-emerald-400 group-hover:scale-110 transition-transform">
                        <MicIcon />
                      </span>
                      <span className="text-xs font-bold text-gray-200 group-hover:text-white uppercase tracking-wider">
                        {t('settings.group.microphone')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-200">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.microphone ? 'rotate-180 text-emerald-400' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {!collapsedSections.microphone && (
                    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50">
                      <MicrophoneSettingsTab />
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/60 shadow-md">
                  <MicrophoneSettingsTab />
                </div>
              )}
            </div>
          )}

          {/* Group: Appearance & Behavior */}
          {(activeTab === 'all' || activeTab === 'appearance') && (
          <div className="space-y-1.5">
             <button 
                type="button"
                onClick={() => toggleSection('appearance')}
                className="w-full flex justify-between items-center px-3.5 py-2.5 bg-gray-900/80 hover:bg-gray-700/60 rounded-lg border border-gray-700/70 transition-all text-left group select-none shadow-sm"
             >
                <div className="flex items-center gap-2.5">
                    <span className="text-purple-400 group-hover:scale-110 transition-transform">
                        <PaletteIcon />
                    </span>
                    <span className="text-xs font-bold text-gray-200 group-hover:text-white uppercase tracking-wider">
                        {t('settings.group.style')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-200">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.appearance ? 'rotate-180 text-purple-400' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
             </button>

             {!collapsedSections.appearance && (
                 <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3.5">
                     
                     {/* Panel Style Selector */}
                     <div className="space-y-1.5">
                         <div className="flex justify-between items-center">
                             <label className="block text-xs font-semibold text-gray-300">
                                 {t('settings.panelStyleLabel')}
                             </label>
                             <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-mono">
                                 {panelStyle === 'modern' ? 'Edge-Docked' : 'Floating'}
                             </span>
                         </div>
                         <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900 rounded-lg border border-gray-700">
                             <button
                                 type="button"
                                 onClick={() => setPanelStyle('modern')}
                                 className={`flex flex-col items-center justify-center p-2.5 rounded-md text-left transition-all ${
                                     panelStyle === 'modern'
                                         ? 'bg-accent text-white shadow-md shadow-accent/20 border border-white/20'
                                         : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 border border-transparent'
                                 }`}
                             >
                                 <div className="flex items-center gap-1.5 font-bold text-xs">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M4 16h16M8 4v16" />
                                     </svg>
                                     <span>{t('settings.panelStyle.modern')}</span>
                                 </div>
                                 <p className={`text-[10px] mt-1 text-center leading-tight line-clamp-2 ${panelStyle === 'modern' ? 'text-white/80' : 'text-gray-500'}`}>
                                     {t('settings.panelStyle.modernDesc')}
                                 </p>
                             </button>
                             <button
                                 type="button"
                                 onClick={() => setPanelStyle('classic')}
                                 className={`flex flex-col items-center justify-center p-2.5 rounded-md text-left transition-all ${
                                     panelStyle === 'classic'
                                         ? 'bg-accent text-white shadow-md shadow-accent/20 border border-white/20'
                                         : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 border border-transparent'
                                 }`}
                             >
                                 <div className="flex items-center gap-1.5 font-bold text-xs">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                         <rect x="3" y="3" width="18" height="18" rx="4" />
                                         <circle cx="12" cy="12" r="3" />
                                     </svg>
                                     <span>{t('settings.panelStyle.classic')}</span>
                                 </div>
                                 <p className={`text-[10px] mt-1 text-center leading-tight line-clamp-2 ${panelStyle === 'classic' ? 'text-white/80' : 'text-gray-500'}`}>
                                     {t('settings.panelStyle.classicDesc')}
                                 </p>
                             </button>
                         </div>
                     </div>

                     {/* Panel Auto-hide Checkbox */}
                     {panelStyle === 'modern' && (
                         <div className="p-2.5 bg-gray-900/80 rounded-lg border border-gray-700/70 space-y-1">
                             <CustomCheckbox
                                 id="panelAutoHide"
                                 checked={isPanelAutoHide}
                                 onChange={setIsPanelAutoHide}
                                 label={t('settings.panelAutoHideLabel')}
                                 className="text-xs font-medium text-gray-200"
                             />
                             <p className="text-[11px] text-gray-400 pl-6 leading-relaxed">
                                 {t('settings.panelAutoHideDesc')}
                             </p>
                         </div>
                     )}

                     {/* Panel Animation Effect Setting */}
                     <div className="space-y-2 p-3 bg-gray-900/90 rounded-lg border border-gray-700/70">
                         <div className="flex justify-between items-start gap-2">
                             <div>
                                 <label className="block text-xs font-semibold text-gray-200">
                                     {t('settings.panelAnimationLabel')}
                                 </label>
                                 <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                                     {t('settings.panelAnimationDesc')}
                                 </p>
                             </div>
                             <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium border flex-shrink-0 ${
                                 panelAnimation === 'none'
                                     ? 'bg-gray-800 text-gray-400 border-gray-700'
                                     : 'bg-accent/15 text-accent border-accent/30 shadow-sm shadow-accent/10'
                             }`}>
                                 {t(`settings.panelAnimation.${panelAnimation}` as any)}
                             </span>
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                             {[
                                 {
                                     id: 'pulse' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.pulse',
                                     descKey: 'settings.panelAnimation.pulseDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                         </svg>
                                     )
                                 },
                                 {
                                     id: 'breath' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.breath',
                                     descKey: 'settings.panelAnimation.breathDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-4a5 5 0 100-10 5 5 0 000 10z" />
                                         </svg>
                                     )
                                 },
                                 {
                                     id: 'wave' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.wave',
                                     descKey: 'settings.panelAnimation.waveDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M3 12c3-4 6-4 9 0s6 4 9 0M3 17c3-4 6-4 9 0s6 4 9 0M3 7c3-4 6-4 9 0s6 4 9 0" />
                                         </svg>
                                     )
                                 },
                                 {
                                     id: 'aurora' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.aurora',
                                     descKey: 'settings.panelAnimation.auroraDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                         </svg>
                                     )
                                 },
                                 {
                                     id: 'neon' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.neon',
                                     descKey: 'settings.panelAnimation.neonDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                         </svg>
                                     )
                                 },
                                 {
                                     id: 'shimmer' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.shimmer',
                                     descKey: 'settings.panelAnimation.shimmerDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                         </svg>
                                     )
                                 },
                                 {
                                     id: 'none' as PanelAnimation,
                                     labelKey: 'settings.panelAnimation.none',
                                     descKey: 'settings.panelAnimation.noneDesc',
                                     icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                             <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                         </svg>
                                     )
                                 }
                             ].map((opt) => {
                                 const isSelected = panelAnimation === opt.id;
                                 return (
                                     <button
                                         key={opt.id}
                                         type="button"
                                         onClick={() => setPanelAnimation(opt.id)}
                                         className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-all border ${
                                             isSelected
                                                 ? 'bg-accent/20 border-accent text-white shadow-sm ring-1 ring-accent/40'
                                                 : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/60 hover:border-gray-600 hover:text-white'
                                         }`}
                                     >
                                         <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${
                                             isSelected
                                                 ? 'bg-accent text-white shadow-sm shadow-accent/30'
                                                 : 'bg-gray-700/60 text-gray-400'
                                         }`}>
                                             {opt.icon}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between gap-1">
                                                 <span className="text-xs font-semibold truncate">
                                                     {t(opt.labelKey as any)}
                                                 </span>
                                                 {isSelected && (
                                                     <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
                                                 )}
                                             </div>
                                             <p className={`text-[10px] leading-tight mt-0.5 line-clamp-2 ${
                                                 isSelected ? 'text-white/80' : 'text-gray-400'
                                             }`}>
                                                 {t(opt.descKey as any)}
                                             </p>
                                         </div>
                                     </button>
                                 );
                             })}
                         </div>
                     </div>

                     {/* Theme Selector */}
                     <div className="space-y-1.5">
                         <label className="block text-xs font-medium text-gray-400">{t('settings.themeLabel')}</label>
                         <CustomSelect
                            value={currentTheme}
                            onChange={(val) => setTheme(val as Theme)}
                            options={themes.map(th => ({
                                value: th.id,
                                label: th.label,
                                icon: <div className="w-3 h-3 rounded-full border border-gray-500" style={{ backgroundColor: th.color }} />
                            }))}
                         />
                     </div>

                     {/* Auto-Save Interval Selector */}
                     <div className="space-y-1.5">
                         <label className="block text-xs font-medium text-gray-400">{t('settings.autoSaveLabel')}</label>
                         <CustomSelect
                            value={autoSaveInterval.toString()}
                            onChange={(val) => setAutoSaveInterval(parseInt(val, 10))}
                            options={[
                                { value: '30', label: t('settings.autoSave.30s') },
                                { value: '60', label: t('settings.autoSave.1m') },
                                { value: '120', label: t('settings.autoSave.2m') },
                                { value: '300', label: t('settings.autoSave.5m') },
                                { value: '600', label: t('settings.autoSave.10m') },
                                { value: '0', label: t('settings.autoSave.off') }
                            ]}
                         />
                     </div>

                     {/* Animation Mode */}
                     <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-400">
                              {t('dialog.settings.animationModeLabel')}
                          </label>
                          <div className="flex bg-gray-800 rounded-md p-1 border border-gray-700">
                              {['pulse', 'blade-runner', 'none'].map((mode) => (
                                  <button
                                      key={mode}
                                      type="button"
                                      onClick={() => handleAnimModeChange(mode)}
                                      className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${animMode === mode ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                  >
                                      {t(`dialog.settings.anim.${animModeKeyMap[mode] || mode}` as any)}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-0.5">
                        <CustomCheckbox
                            id="instantNodeClose"
                            checked={instantNodeClose}
                            onChange={handleInstantNodeCloseChange}
                            label={t('dialog.settings.instantNodeCloseLabel')}
                            className="text-sm text-gray-400"
                        />
                         <CustomCheckbox
                            id="hoverHighlight"
                            checked={hoverHighlight}
                            onChange={handleHoverHighlightChange}
                            label={t('dialog.settings.hoverHighlightLabel')}
                            className="text-sm text-gray-400"
                        />
                         <CustomCheckbox
                            id="bringToFrontOnHover"
                            checked={bringToFrontOnHover}
                            onChange={handleBringToFrontOnHoverChange}
                            label={t('dialog.settings.bringToFrontOnHoverLabel')}
                            className="text-sm text-gray-400"
                        />
                      </div>

                     {/* Connection Settings */}
                     <div className="space-y-1.5">
                         <label className="block text-xs font-medium text-gray-400">
                             {t('dialog.settings.connectionsLabel')}
                         </label>
                         <div className="flex flex-col gap-2 p-2.5 bg-gray-800 rounded-md border border-gray-700">
                             <CustomCheckbox
                                id="connectionAnimation"
                                checked={isConnectionAnimationEnabled}
                                onChange={handleConnectionAnimationChange}
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
                                    onChange={(e) => handleConnectionOpacityChange(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent"
                                 />
                             </div>
                         </div>
                     </div>
                     
                     {/* Download Path (Electron Only) */}
                     {isElectron && (
                         <div className="space-y-1.5 pt-2 border-t border-gray-700/50">
                             <label className="block text-xs font-medium text-gray-400">
                                 {t('dialog.settings.downloadPathLabel')}
                             </label>
                             <div className="flex gap-2">
                                 <div className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-xs text-gray-300 truncate" title={downloadPath || "Default"}>
                                     {downloadPath || <span className="text-gray-500 italic">Downloads Folder (Default)</span>}
                                 </div>
                                 <button
                                     type="button"
                                     onClick={handleSelectDownloadFolder}
                                     className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md border border-gray-600"
                                     title={t('dialog.settings.selectFolder')}
                                 >
                                     <FolderIcon className="w-4 h-4" />
                                 </button>
                                 {downloadPath && (
                                     <button
                                         type="button"
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
             )}
          </div>
          )}

          {/* Group 5: Cloud Storage */}
          {(activeTab === 'all' || activeTab === 'cloud') && (
          <div className="space-y-1.5">
             <button 
                type="button"
                onClick={() => toggleSection('cloud')}
                className="w-full flex justify-between items-center px-3.5 py-2.5 bg-gray-900/80 hover:bg-gray-700/60 rounded-lg border border-gray-700/70 transition-all text-left group select-none shadow-sm"
             >
                <div className="flex items-center gap-2.5">
                    <span className="text-emerald-400 group-hover:scale-110 transition-transform">
                        <GoogleDriveIcon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-gray-200 group-hover:text-white uppercase tracking-wider">
                        {t('settings.group.drive')}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-200">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${!collapsedSections.cloud ? 'rotate-180 text-emerald-400' : 'rotate-0'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
             </button>
             
             {!collapsedSections.cloud && (
                 <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-3">
                      
                      {/* Origin Display Helper */}
                      <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-400">
                              Detected Origin (For Google Cloud Console):
                          </label>
                          <div className="flex items-center gap-2">
                              <code className="flex-grow bg-black/30 p-1.5 rounded text-[10px] text-gray-300 font-mono truncate border border-gray-700">
                                  {currentOrigin}
                              </code>
                              <button type="button" onClick={copyOrigin} className="p-1.5 text-gray-400 hover:text-white bg-gray-700 rounded hover:bg-gray-600 transition-colors" title="Copy Origin">
                                  <CopyIcon className="h-3.5 w-3.5" />
                              </button>
                          </div>
                          <p className="text-[10px] text-gray-500 italic">
                              Add this URL to "Authorized JavaScript origins" in your Google Cloud Project if Auth fails.
                          </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-gray-700/30">
                        <label htmlFor="googleClientId" className="block text-xs font-medium text-gray-400">
                          {t('settings.googleClientIdLabel')}
                        </label>
                        <input
                          type="text"
                          id="googleClientId"
                          value={googleDriveClientId}
                          onChange={handleGoogleDriveClientIdChange}
                          placeholder="Google Cloud Client ID"
                          className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none placeholder-gray-600"
                        />
                      </div>

                      {/* Smart Contextual Action Button */}
                      {isGoogleIdDirty ? (
                         <button
                            type="button"
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
                            type="button"
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
                                type="button"
                                onClick={() => handleGoogleSignIn && handleGoogleSignIn()}
                                className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-blue-600 shadow-md"
                            >
                                <GoogleDriveIcon className="w-4 h-4" />
                                {t('settings.signInWithGoogle')}
                            </button>
                            
                             {handleCleanupDuplicates && (
                                 <button
                                    type="button"
                                    onClick={handleCleanupDuplicates}
                                    disabled={isGoogleDriveSaving}
                                    className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-red-600 shadow-md"
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

                             {handleSyncCatalogs && (
                                 <button
                                    type="button"
                                    onClick={handleSyncCatalogs}
                                    disabled={isGoogleDriveSaving}
                                    className="w-full py-2 px-4 rounded-md text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-teal-600 shadow-md"
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
             )}
          </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-900 border-t border-gray-700/80 flex justify-between items-center">
          <button
              type="button"
              onClick={handleReloadApp}
              className="flex items-center gap-2 px-3.5 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-900/50"
              title={t('dialog.settings.reload')}
          >
              <ReloadIcon />
              <span className="text-xs sm:text-sm font-bold">{t('dialog.settings.reload')}</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-accent/40 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;

