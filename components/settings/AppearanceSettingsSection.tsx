import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ThemeAndAutoSaveSettings } from './appearance/ThemeAndAutoSaveSettings';
import { PanelStyleSettings } from './appearance/PanelStyleSettings';
import { PanelAnimationSettings } from './appearance/PanelAnimationSettings';
import { CursorSkinSettings } from './appearance/CursorSkinSettings';
import { ConnectionStyleSettings } from './appearance/ConnectionStyleSettings';
import { NodeControlsSettings } from './appearance/NodeControlsSettings';
import { TextContextMenuSettings } from './appearance/TextContextMenuSettings';
import { TraySettings } from './appearance/TraySettings';

interface AppearanceSettingsSectionProps {
  isOpen: boolean;
  setIsInstantCloseEnabled: (enabled: boolean) => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  isOpen,
  setIsInstantCloseEnabled,
}) => {
  const {
    nodeAnimationMode,
    setNodeAnimationMode,
    isHoverHighlightEnabled,
    setIsHoverHighlightEnabled,
    isBringToFrontOnHoverEnabled,
    setIsBringToFrontOnHoverEnabled,
  } = useAppContext();

  const [instantNodeClose, setInstantNodeClose] = useState(false);
  const [hoverHighlight, setHoverHighlight] = useState(true);
  const [bringToFrontOnHover, setBringToFrontOnHover] = useState(true);
  const [animMode, setAnimMode] = useState<string>('pulse');

  // Collapsible states for appearance sub-panels
  const [collapsedAppearance, setCollapsedAppearance] = useState<{
    panelAnimation: boolean;
    cursorSkin: boolean;
    connectionStyle: boolean;
    nodeControls: boolean;
    textMenu: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('settingsCollapsedAppearance');
      return saved ? JSON.parse(saved) : { panelAnimation: true, cursorSkin: true, connectionStyle: false, nodeControls: true, textMenu: false };
    } catch {
      return { panelAnimation: true, cursorSkin: true, connectionStyle: false, nodeControls: true, textMenu: false };
    }
  });

  const toggleAppearanceSection = (section: 'panelAnimation' | 'cursorSkin' | 'connectionStyle' | 'nodeControls' | 'textMenu') => {
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
    }
  }, [isOpen, isHoverHighlightEnabled, isBringToFrontOnHoverEnabled, nodeAnimationMode]);

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

  return (
    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-4">
      {/* Themes, Canvas Background & Text Fields Mode */}
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

      {/* Connection Style & Animation (Collapsible) */}
      <ConnectionStyleSettings
        isCollapsed={collapsedAppearance.connectionStyle}
        onToggle={() => toggleAppearanceSection('connectionStyle')}
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

      {/* Text Context Menu & Spellcheck (Collapsible) */}
      <TextContextMenuSettings
        isCollapsed={collapsedAppearance.textMenu}
        onToggle={() => toggleAppearanceSection('textMenu')}
      />

      {/* System Tray (Electron Only) */}
      <TraySettings />
    </div>
  );
};
