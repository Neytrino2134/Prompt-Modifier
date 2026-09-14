import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../localization';
import { useAppContext } from '../../contexts/AppContext';
import { ThemeAndAutoSaveSettings } from './appearance/ThemeAndAutoSaveSettings';
import { PanelStyleSettings } from './appearance/PanelStyleSettings';
import { PanelAnimationSettings } from './appearance/PanelAnimationSettings';
import { CursorSkinSettings } from './appearance/CursorSkinSettings';
import { NodeControlsSettings } from './appearance/NodeControlsSettings';
import { ElectronStorageSettings } from './appearance/ElectronStorageSettings';

interface AppearanceSettingsSectionProps {
  isOpen: boolean;
  setIsInstantCloseEnabled: (enabled: boolean) => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  isOpen,
  setIsInstantCloseEnabled,
  addToast,
}) => {
  const { t } = useLanguage();
  const {
    nodeAnimationMode,
    setNodeAnimationMode,
    isHoverHighlightEnabled,
    setIsHoverHighlightEnabled,
    isBringToFrontOnHoverEnabled,
    setIsBringToFrontOnHoverEnabled,
    setTabs,
  } = useAppContext();

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const [instantNodeClose, setInstantNodeClose] = useState(false);
  const [hoverHighlight, setHoverHighlight] = useState(true);
  const [bringToFrontOnHover, setBringToFrontOnHover] = useState(true);
  const [animMode, setAnimMode] = useState<string>('pulse');

  const [downloadPath, setDownloadPath] = useState<string>('');
  const [sessionBackups, setSessionBackups] = useState<Array<{ filename: string; path: string; savedAt: string; tabCount: number }>>([]);
  const [showBackupsList, setShowBackupsList] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Collapsible states for appearance sub-panels
  const [collapsedAppearance, setCollapsedAppearance] = useState<{
    panelAnimation: boolean;
    cursorSkin: boolean;
    nodeControls: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('settingsCollapsedAppearance');
      return saved ? JSON.parse(saved) : { panelAnimation: true, cursorSkin: true, nodeControls: true };
    } catch {
      return { panelAnimation: true, cursorSkin: true, nodeControls: true };
    }
  });

  const toggleAppearanceSection = (section: 'panelAnimation' | 'cursorSkin' | 'nodeControls') => {
    setCollapsedAppearance((prev) => {
      const updated = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem('settingsCollapsedAppearance', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save appearance collapse state', e);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (isOpen) {
      setInstantNodeClose(localStorage.getItem('settings_instantNodeClose') === 'true');
      setHoverHighlight(isHoverHighlightEnabled);
      setBringToFrontOnHover(isBringToFrontOnHoverEnabled);
      setAnimMode(nodeAnimationMode);

      if (isElectron) {
        const api = (window as any).electronAPI;
        if (api && typeof api.getDownloadPath === 'function') {
          api.getDownloadPath()
            .then((path: string) => {
              setDownloadPath(path || '');
            })
            .catch(() => {
              setDownloadPath(localStorage.getItem('settings_downloadPath') || '');
            });
        } else {
          setDownloadPath(localStorage.getItem('settings_downloadPath') || '');
        }
      }
    }
  }, [isOpen, isHoverHighlightEnabled, isBringToFrontOnHoverEnabled, nodeAnimationMode, isElectron]);

  const handleInstantNodeCloseChange = (checked: boolean) => {
    setInstantNodeClose(checked);
    setIsInstantCloseEnabled(checked);
    localStorage.setItem('settings_instantNodeClose', String(checked));
  };

  const handleHoverHighlightChange = (checked: boolean) => {
    setHoverHighlight(checked);
    setIsHoverHighlightEnabled(checked);
  };

  const handleBringToFrontOnHoverChange = (checked: boolean) => {
    setBringToFrontOnHover(checked);
    setIsBringToFrontOnHoverEnabled(checked);
  };

  const handleAnimModeChange = (mode: string) => {
    setAnimMode(mode);
    setNodeAnimationMode(mode as any);
  };

  const handleSelectDownloadFolder = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api) return;
    try {
      const selectFn = api.selectDownloadFolder || api.selectFolder;
      if (typeof selectFn === 'function') {
        const path = await selectFn();
        if (path) {
          setDownloadPath(path);
          if (typeof api.setDownloadPath === 'function') {
            api.setDownloadPath(path);
          }
          localStorage.setItem('settings_downloadPath', path);
          addToast(t('dialog.settings.downloadPathUpdated' as any) || 'Download path updated', 'success');
        }
      }
    } catch (e) {
      console.error('Failed to select download folder', e);
      addToast('Error selecting folder', 'error');
    }
  };

  const handleResetDownloadFolder = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    try {
      if (api && typeof api.setDownloadPath === 'function') {
        await api.setDownloadPath('');
      }
      localStorage.removeItem('settings_downloadPath');
      setDownloadPath('');
      addToast(t('dialog.settings.downloadPathReset' as any) || 'Download path reset to default', 'info');
    } catch (e) {
      console.error('Failed to reset download folder', e);
    }
  };

  const handleOpenAutosaveFolder = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api || typeof api.openAutosaveFolder !== 'function') return;
    try {
      await api.openAutosaveFolder();
    } catch (e) {
      console.error(e);
      addToast('Could not open folder', 'error');
    }
  };

  const handleToggleBackupsList = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api || typeof api.listSessionBackups !== 'function') return;
    if (!showBackupsList) {
      setIsLoadingBackups(true);
      try {
        const backups = await api.listSessionBackups();
        setSessionBackups(backups || []);
      } catch (e) {
        console.error(e);
        addToast('Failed to load session backups', 'error');
      } finally {
        setIsLoadingBackups(false);
      }
    }
    setShowBackupsList(!showBackupsList);
  };

  const handleRestoreBackup = async (backupPath: string) => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api) return;
    try {
      const restoreFn = api.restoreSessionBackup || api.readSessionBackup;
      if (typeof restoreFn === 'function') {
        const data = await restoreFn(backupPath);
        const tabsData = data?.session?.tabs || (Array.isArray(data?.tabs) ? data.tabs : null);
        if (tabsData && Array.isArray(tabsData)) {
          setTabs(tabsData);
          addToast(t('settings.sessionRestoredSuccess'), 'success');
          setShowBackupsList(false);
        } else {
          addToast('Invalid session backup format', 'error');
        }
      }
    } catch (e) {
      console.error(e);
      addToast(t('settings.sessionRestoredError'), 'error');
    }
  };

  return (
    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-4">
      {/* Top 2-Column Grid: Interface Theme & Auto-Save */}
      <ThemeAndAutoSaveSettings />

      {/* Panel Style (Classic / Modern) & Auto-Hide */}
      <PanelStyleSettings />

      {/* Panel Animation Effect (Collapsible) */}
      <PanelAnimationSettings
        isCollapsed={collapsedAppearance.panelAnimation}
        onToggle={() => toggleAppearanceSection('panelAnimation')}
      />

      {/* Cursor Skin Selector (Collapsible) */}
      <CursorSkinSettings
        isCollapsed={collapsedAppearance.cursorSkin}
        onToggle={() => toggleAppearanceSection('cursorSkin')}
      />

      {/* Node Controls, Animation & Connectors (Collapsible) */}
      <NodeControlsSettings
        isCollapsed={collapsedAppearance.nodeControls}
        onToggle={() => toggleAppearanceSection('nodeControls')}
        instantNodeClose={instantNodeClose}
        onInstantNodeCloseChange={handleInstantNodeCloseChange}
        hoverHighlight={hoverHighlight}
        onHoverHighlightChange={handleHoverHighlightChange}
        bringToFrontOnHover={bringToFrontOnHover}
        onBringToFrontOnHoverChange={handleBringToFrontOnHoverChange}
        animMode={animMode}
        onAnimModeChange={handleAnimModeChange}
      />

      {/* Download Path & Session Backups (Electron Only) */}
      {isElectron && (
        <ElectronStorageSettings
          downloadPath={downloadPath}
          onSelectDownloadFolder={handleSelectDownloadFolder}
          onResetDownloadFolder={handleResetDownloadFolder}
          onOpenAutosaveFolder={handleOpenAutosaveFolder}
          onToggleBackupsList={handleToggleBackupsList}
          showBackupsList={showBackupsList}
          isLoadingBackups={isLoadingBackups}
          sessionBackups={sessionBackups}
          onRestoreBackup={handleRestoreBackup}
        />
      )}
    </div>
  );
};
