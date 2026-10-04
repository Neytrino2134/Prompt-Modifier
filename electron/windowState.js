import { app, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export const getWindowStateFilePath = () => path.join(app.getPath('userData'), 'window_state.json');

export function loadSavedWindowState() {
  try {
    const filePath = getWindowStateFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load window state from disk:', err);
  }
  return null;
}

export function saveWindowStateSync(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = (isMaximized && win.getNormalBounds) ? win.getNormalBounds() : win.getBounds();
    const currentDisplay = screen.getDisplayMatching(bounds);
    const stateToSave = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
      displayId: currentDisplay ? currentDisplay.id : undefined,
    };
    fs.writeFileSync(getWindowStateFilePath(), JSON.stringify(stateToSave), 'utf-8');
  } catch (err) {
    console.warn('Failed to save window state synchronously:', err);
  }
}

export function getValidInitialBounds(savedState) {
  const defaultBounds = {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
  };

  if (!savedState) {
    return defaultBounds;
  }

  const displays = screen.getAllDisplays();
  
  // Try to find if the saved display or any display contains the saved window center/bounds
  const centerX = savedState.x + savedState.width / 2;
  const centerY = savedState.y + savedState.height / 2;

  const displayMatchingCenter = displays.find(display => {
    const b = display.bounds;
    return (
      centerX >= b.x &&
      centerX <= b.x + b.width &&
      centerY >= b.y &&
      centerY <= b.y + b.height
    );
  });

  const displayMatchingBounds = displayMatchingCenter || displays.find(display => {
    const b = display.bounds;
    // Check if at least 100x100 overlap exists
    const overlapX = Math.max(0, Math.min(savedState.x + savedState.width, b.x + b.width) - Math.max(savedState.x, b.x));
    const overlapY = Math.max(0, Math.min(savedState.y + savedState.height, b.y + b.height) - Math.max(savedState.y, b.y));
    return overlapX >= 100 && overlapY >= 100;
  });

  if (displayMatchingBounds) {
    // Ensure width and height are within min/max bounds and fit on the display
    const width = Math.max(900, Math.min(savedState.width, displayMatchingBounds.workArea.width));
    const height = Math.max(600, Math.min(savedState.height, displayMatchingBounds.workArea.height));
    
    // Clamp x and y so window is not positioned off-screen
    const maxX = displayMatchingBounds.workArea.x + displayMatchingBounds.workArea.width - 100;
    const minX = displayMatchingBounds.workArea.x - width + 100;
    const maxY = displayMatchingBounds.workArea.y + displayMatchingBounds.workArea.height - 100;
    const minY = displayMatchingBounds.workArea.y;

    const x = Math.max(minX, Math.min(savedState.x, maxX));
    const y = Math.max(minY, Math.min(savedState.y, maxY));

    return {
      x,
      y,
      width,
      height,
      minWidth: 900,
      minHeight: 600,
      isMaximized: Boolean(savedState.isMaximized)
    };
  }

  // Display was removed / disconnected -> center on primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const width = Math.min(Math.max(savedState.width || 1280, 900), primaryDisplay.workArea.width);
  const height = Math.min(Math.max(savedState.height || 800, 600), primaryDisplay.workArea.height);
  const x = primaryDisplay.workArea.x + Math.floor((primaryDisplay.workArea.width - width) / 2);
  const y = primaryDisplay.workArea.y + Math.floor((primaryDisplay.workArea.height - height) / 2);

  return {
    x,
    y,
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    isMaximized: Boolean(savedState.isMaximized)
  };
}
