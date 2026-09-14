import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';
import { ReloadIcon, GoogleDriveIcon, SettingsIcon, PaletteIcon } from './icons/AppIcons';
import { useAppContext } from '../contexts/AppContext';
import { Point } from '../types';
import { MicrophoneSettingsTab } from './MicrophoneSettingsTab';
import { SettingsSectionHeader } from './settings/SettingsSectionHeader';
import { ApiSettingsSection } from './settings/ApiSettingsSection';
import { ModelsSettingsSection } from './settings/ModelsSettingsSection';
import { AppearanceSettingsSection } from './settings/AppearanceSettingsSection';
import { CloudSettingsSection } from './settings/CloudSettingsSection';

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

type SettingsTab = 'all' | 'api' | 'llm' | 'microphone' | 'appearance' | 'cloud';

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  addToast,
  setIsInstantCloseEnabled,
  anchorPosition,
}) => {
  const { t } = useLanguage();
  const context = useAppContext();

  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('all');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const positionRef = useRef(position);

  // Cross-section state synchronization
  const [openAiEnabled, setOpenAiEnabled] = useState(false);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    api: false,
    llm: false,
    microphone: false,
    appearance: false,
    cloud: false,
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    const targetTabEl = tabRefs.current[tab];
    if (targetTabEl) {
      targetTabEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
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

  // Sync ref for event handlers
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Initialize position (restore or use anchor or center)
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);

      const saved = localStorage.getItem(LOCAL_STORAGE_POS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            setPosition(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved position', e);
        }
      }

      if (anchorPosition) {
        const width = 620;
        const height = 500;
        let x = anchorPosition.x;
        let y = anchorPosition.y + 10;

        if (x + width > window.innerWidth) x = window.innerWidth - width - 20;
        if (y + height > window.innerHeight) y = window.innerHeight - height - 20;
        if (x < 20) x = 20;
        if (y < 20) y = 20;

        setPosition({ x, y });
      } else {
        const dialogWidth = Math.min(620, window.innerWidth - 32);
        setPosition({
          x: Math.max(16, Math.round(window.innerWidth / 2 - dialogWidth / 2)),
          y: Math.max(16, Math.round(window.innerHeight / 2 - 250)),
        });
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, anchorPosition]);

  if (!context) return null;

  const { setConfirmInfo, loadCanvasState, resetTabs } = context;

  const handleResetAllSettings = () => {
    setConfirmInfo({
      title: t('dialog.resetSettings.title'),
      message: t('dialog.resetSettings.message'),
      onConfirm: () => {
        // Reset appearance, behavior & themes to defaults
        try {
          context.setTheme?.('cyan');
          context.setPanelStyle?.('modern');
          context.setIsPanelAutoHide?.(true);
          context.setPanelAnimation?.('shimmer');
          context.setCursorSkin?.('default');
          context.setIsCursorEffectEnabled?.(false);
          context.setIsConnectionAnimationEnabled?.(true);
          context.setConnectionOpacity?.(0.4);
          context.setAutoSaveInterval?.(60);
          context.setNodeAnimationMode?.('pulse');
          context.setIsHoverHighlightEnabled?.(true);
          context.setIsBringToFrontOnHoverEnabled?.(true);
          setIsInstantCloseEnabled(false);

          // Clear setting keys from localStorage
          localStorage.removeItem('settings_theme');
          localStorage.removeItem('settings_panelStyle');
          localStorage.removeItem('settings_panelAutoHide');
          localStorage.removeItem('settings_panelAnimation');
          localStorage.removeItem('settings_cursorSkin');
          localStorage.removeItem('settings_cursorEffect');
          localStorage.removeItem('settings_connectionAnimation');
          localStorage.removeItem('settings_connectionOpacity');
          localStorage.removeItem('settings_autoSaveInterval');
          localStorage.removeItem('settings_nodeAnimationMode');
          localStorage.removeItem('settings_hoverHighlight');
          localStorage.removeItem('settings_bringToFrontOnHover');
          localStorage.removeItem('settings_instantNodeClose');
          localStorage.removeItem('settingsCollapsedAppearance');
          localStorage.removeItem(LOCAL_STORAGE_POS_KEY);

          // Center dialog position
          const dialogWidth = Math.min(620, window.innerWidth - 32);
          const centeredX = Math.max(16, Math.round(window.innerWidth / 2 - dialogWidth / 2));
          const centeredY = Math.max(16, Math.round(window.innerHeight / 2 - 250));
          setPosition({ x: centeredX, y: centeredY });

          // Reset collapsed sections
          setCollapsedSections({
            api: false,
            llm: false,
            microphone: false,
            appearance: false,
            cloud: false,
          });

          addToast(t('dialog.resetSettings.success'), 'success');
        } catch (err) {
          console.error('Failed to reset settings:', err);
          addToast(t('dialog.resetSettings.success'), 'info');
        }
      },
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
          fullSizeImageCache: {},
        });

        if (resetTabs) {
          resetTabs('en');
        }

        setTimeout(() => {
          window.location.reload();
        }, 100);
      },
    });
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    localStorage.setItem(LOCAL_STORAGE_POS_KEY, JSON.stringify(positionRef.current));
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200 ease-out ${
        isVisible && isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="absolute bg-gray-800 rounded-xl shadow-2xl w-[calc(100vw-32px)] sm:w-[620px] max-w-[620px] flex flex-col cursor-default max-h-[82vh] overflow-hidden pointer-events-auto border border-gray-700 transition-transform duration-200 ease-out app-region-no-drag"
        style={{
          left: position.x,
          top: position.y,
          transform: isVisible && isOpen ? 'scale(1)' : 'scale(0.95)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header (Draggable) */}
        <div
          className="px-5 py-3.5 flex justify-between items-center bg-[#18202f] cursor-move border-b border-gray-700 select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <h2 className="text-lg font-bold text-accent-text flex items-center gap-2 pointer-events-none">
            <SettingsIcon />
            {t('dialog.settings.title')}
          </h2>
          <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleResetAllSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-800/90 hover:bg-red-500/20 hover:border-red-500/40 border border-gray-700 rounded-lg transition-all shadow-sm active:scale-95"
              title={t('settings.resetDefaultsTooltip')}
            >
              <ReloadIcon className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">{t('settings.resetDefaults')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
              title={t('dialog.common.close' as any) || 'Close'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar bg-gray-800 flex-1">
          <p className="text-xs text-gray-400 mb-1 leading-normal">
            {t('dialog.settings.description')}
          </p>

          {/* Category Tabs */}
          <div
            ref={tabsContainerRef}
            onWheel={handleTabsWheel}
            className="flex items-center gap-1.5 p-1.5 bg-gray-900/90 rounded-lg border border-gray-700/60 overflow-x-auto no-scrollbar scroll-smooth"
          >
            <button
              type="button"
              ref={(el) => { tabRefs.current['all'] = el; }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none border ${
                activeTab === 'all'
                  ? 'bg-gray-700 text-white shadow-sm border-gray-600'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border-transparent'
              }`}
            >
              {t('settings.tab.all')}
            </button>
            <button
              type="button"
              ref={(el) => { tabRefs.current['api'] = el; }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectTab('api')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
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
              ref={(el) => { tabRefs.current['llm'] = el; }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectTab('llm')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
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
              ref={(el) => { tabRefs.current['microphone'] = el; }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectTab('microphone')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
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
              ref={(el) => { tabRefs.current['appearance'] = el; }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectTab('appearance')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
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
              ref={(el) => { tabRefs.current['cloud'] = el; }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectTab('cloud')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus:ring-0 outline-none select-none flex items-center gap-1.5 border ${
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
              <SettingsSectionHeader
                title={t('settings.group.api')}
                icon={<KeyIcon />}
                iconColorClass="text-cyan-400"
                isCollapsed={collapsedSections.api}
                onToggle={() => toggleSection('api')}
              />
              {!collapsedSections.api && (
                <ApiSettingsSection
                  isOpen={isOpen}
                  onOpenAiToggleChange={setOpenAiEnabled}
                />
              )}
            </div>
          )}

          {/* Group 2: LLM Models Selection */}
          {(activeTab === 'all' || activeTab === 'llm') && (
            <div className="space-y-1.5">
              <SettingsSectionHeader
                title={t('settings.group.llm')}
                icon={<span className="text-amber-400">⚡</span>}
                iconColorClass="text-amber-400"
                isCollapsed={collapsedSections.llm}
                onToggle={() => toggleSection('llm')}
              />
              {!collapsedSections.llm && (
                <ModelsSettingsSection
                  isOpen={isOpen}
                  addToast={addToast}
                  openAiEnabled={openAiEnabled}
                />
              )}
            </div>
          )}

          {/* Group 3: Microphone */}
          {(activeTab === 'all' || activeTab === 'microphone') && (
            <div className="space-y-1.5">
              <SettingsSectionHeader
                title={t('settings.group.microphone')}
                icon={<MicIcon />}
                iconColorClass="text-emerald-400"
                isCollapsed={collapsedSections.microphone}
                onToggle={() => toggleSection('microphone')}
              />
              {!collapsedSections.microphone && (
                <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50">
                  <MicrophoneSettingsTab />
                </div>
              )}
            </div>
          )}

          {/* Group 4: Style & Appearance */}
          {(activeTab === 'all' || activeTab === 'appearance') && (
            <div className="space-y-1.5">
              <SettingsSectionHeader
                title={t('settings.group.appearance')}
                icon={<PaletteIcon />}
                iconColorClass="text-purple-400"
                isCollapsed={collapsedSections.appearance}
                onToggle={() => toggleSection('appearance')}
              />
              {!collapsedSections.appearance && (
                <AppearanceSettingsSection
                  isOpen={isOpen}
                  setIsInstantCloseEnabled={setIsInstantCloseEnabled}
                  addToast={addToast}
                />
              )}
            </div>
          )}

          {/* Group 5: Cloud Storage */}
          {(activeTab === 'all' || activeTab === 'cloud') && (
            <div className="space-y-1.5">
              <SettingsSectionHeader
                title={t('settings.group.drive')}
                icon={<GoogleDriveIcon className="w-4 h-4" />}
                iconColorClass="text-emerald-400"
                isCollapsed={collapsedSections.cloud}
                onToggle={() => toggleSection('cloud')}
              />
              {!collapsedSections.cloud && (
                <CloudSettingsSection
                  isOpen={isOpen}
                  addToast={addToast}
                />
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
