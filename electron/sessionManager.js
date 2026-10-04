import { app, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createSessionWriteQueue, isValidSession } from './sessionPersistence.js';

export const sessionWriteQueue = createSessionWriteQueue();
export let lastSavedSessionAt = 0;

// Unique folder per launch based on launch date and time
export const launchStartTime = new Date();
export const launchFolderName = `${launchStartTime.getFullYear()}-${String(launchStartTime.getMonth() + 1).padStart(2, '0')}-${String(launchStartTime.getDate()).padStart(2, '0')}_${String(launchStartTime.getHours()).padStart(2, '0')}-${String(launchStartTime.getMinutes()).padStart(2, '0')}-${String(launchStartTime.getSeconds()).padStart(2, '0')}`;

export let currentMaxStatesPerLaunch = 5;
export let currentSessionLimit = 2; // Default 2 sessions (1-5)

export function getUserAutosaveRootDir() {
  return path.join(app.getPath('userData'), 'autosave');
}

export function getDocumentsAutosaveRootDir() {
  try {
    const docPath = app.getPath('documents');
    return path.join(docPath, 'Prompt Modifier', 'autosave');
  } catch (e) {
    return null;
  }
}

export function getCurrentUserLaunchDir() {
  return path.join(getUserAutosaveRootDir(), launchFolderName);
}

export function getCurrentDocsLaunchDir() {
  const docsRoot = getDocumentsAutosaveRootDir();
  return docsRoot ? path.join(docsRoot, launchFolderName) : null;
}

export function getPrimarySessionFilePath() {
  return path.join(app.getPath('userData'), 'prompt_modifier_session.json');
}

export function getPrimaryBackupFilePath() {
  return path.join(app.getPath('userData'), 'prompt_modifier_session.backup.json');
}

export function getDocumentsAutosaveDir() {
  return getDocumentsAutosaveRootDir();
}

export function getDocumentsSessionFilePath() {
  const dir = getDocumentsAutosaveRootDir();
  return dir ? path.join(dir, 'prompt_modifier_session.json') : null;
}

export function getDocumentsBackupFilePath() {
  const dir = getDocumentsAutosaveRootDir();
  return dir ? path.join(dir, 'prompt_modifier_session.backup.json') : null;
}

// Safely write JSON atomically
export async function atomicWriteFile(targetPath, dataStr) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
  try {
    const handle = await fs.promises.open(tempPath, 'wx');
    try { await handle.writeFile(dataStr, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    await fs.promises.rename(tempPath, targetPath);
  } finally { await fs.promises.unlink(tempPath).catch(() => {}); }
}

// Prune state snapshot files in a directory to keep only the newest maxStates snapshots
export async function pruneStateFilesInDir(dirPath, maxStates = currentMaxStatesPerLaunch) {
  if (!dirPath || !fs.existsSync(dirPath) || maxStates <= 0) return;
  try {
    const files = await fs.promises.readdir(dirPath);
    const stateFiles = files.filter(f => f.startsWith('state_') && f.endsWith('.json'));
    if (stateFiles.length > maxStates) {
      stateFiles.sort((a, b) => {
        const timeA = parseInt(a.replace('state_', '').replace('.json', ''), 10) || 0;
        const timeB = parseInt(b.replace('state_', '').replace('.json', ''), 10) || 0;
        return timeA - timeB; // Oldest first
      });
      const toDelete = stateFiles.slice(0, stateFiles.length - maxStates);
      for (const oldFile of toDelete) {
        await fs.promises.unlink(path.join(dirPath, oldFile)).catch(() => {});
      }
    }
  } catch (e) {}
}

// Clean launch archive folders to keep only the newest N sessions (default 2, configurable 1-5)
export async function cleanOldLaunchArchives(rootDir, sessionLimit = currentSessionLimit, maxStates = currentMaxStatesPerLaunch) {
  if (!rootDir || !fs.existsSync(rootDir)) return;
  try {
    const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
    const dirList = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name;
        if (dirName === 'history') continue;

        const dirPath = path.join(rootDir, dirName);
        try {
          const stats = await fs.promises.stat(dirPath);
          let dirTime = stats.mtimeMs || stats.ctimeMs || stats.birthtimeMs || 0;

          // Parse timestamp from folder name: YYYY-MM-DD_HH-mm-ss
          const match = dirName.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
          if (match) {
            const folderDate = new Date(
              parseInt(match[1], 10),
              parseInt(match[2], 10) - 1,
              parseInt(match[3], 10),
              parseInt(match[4], 10),
              parseInt(match[5], 10),
              parseInt(match[6], 10)
            );
            if (!isNaN(folderDate.getTime())) {
              dirTime = folderDate.getTime();
            }
          }
          dirList.push({ dirName, dirPath, dirTime, isCurrent: dirName === launchFolderName });
        } catch (e) {}
      }
    }

    // Sort folders newest first
    dirList.sort((a, b) => b.dirTime - a.dirTime);

    // Keep up to sessionLimit sessions (always preserving current launch folder)
    let count = 1;
    for (const item of dirList) {
      if (item.dirName === launchFolderName) {
        if (maxStates > 0) {
          await pruneStateFilesInDir(item.dirPath, maxStates);
        }
        continue;
      }
      if (count < sessionLimit) {
        if (maxStates > 0) {
          await pruneStateFilesInDir(item.dirPath, maxStates);
        }
        count++;
      } else {
        // Prune older session folder
        console.log(`[Autosave] Pruning excess session folder beyond limit (${sessionLimit}): ${item.dirPath}`);
        await fs.promises.rm(item.dirPath, { recursive: true, force: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[Autosave] Error during archive cleanup:', err);
  }
}

// Save state snapshot inside a specific launch folder and prune to maximum maxStates snapshots
export async function saveStateToLaunchDir(targetDir, jsonStr, savedAt, maxStates = currentMaxStatesPerLaunch) {
  if (!targetDir) return;
  try {
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    // 1. Save timestamped state snapshot in this launch folder
    const stateFile = path.join(targetDir, `state_${savedAt}.json`);
    await atomicWriteFile(stateFile, jsonStr);

    // 2. Save latest_session.json in this launch folder
    const latestFile = path.join(targetDir, 'latest_session.json');
    await atomicWriteFile(latestFile, jsonStr);

    // 3. Keep maximum maxStates states in this launch folder (0 = unlimited)
    if (maxStates > 0) {
      await pruneStateFilesInDir(targetDir, maxStates);
    }
  } catch (err) {
    console.warn(`[Autosave] Error saving to launch dir ${targetDir}:`, err);
    throw err;
  }
}

export function getAllCandidateSessionPaths() {
  const candidates = [];
  const userData = app.getPath('userData');
  const appData = app.getPath('appData');
  
  // 1. Primary paths in current userData (%APPDATA%/Prompt Modifier)
  candidates.push(path.join(userData, 'prompt_modifier_session.json'));
  candidates.push(path.join(userData, 'prompt_modifier_session.backup.json'));

  // 2. Personal Documents Autosave
  const docsSession = getDocumentsSessionFilePath();
  const docsBackup = getDocumentsBackupFilePath();
  if (docsSession) candidates.push(docsSession);
  if (docsBackup) candidates.push(docsBackup);

  // 3. Scan all Launch directories in UserData & Documents
  const autosaveRoots = [
    getUserAutosaveRootDir(),
    getDocumentsAutosaveRootDir(),
  ].filter(Boolean);

  for (const rootDir of autosaveRoots) {
    if (fs.existsSync(rootDir)) {
      try {
        const entries = fs.readdirSync(rootDir, { withFileTypes: true });
        // Sort folders newest first
        const folderNames = entries
          .filter(e => e.isDirectory())
          .map(e => e.name)
          .sort()
          .reverse();

        for (const fName of folderNames) {
          const folderPath = path.join(rootDir, fName);
          try {
            const innerFiles = fs.readdirSync(folderPath);
            // Latest session first
            if (innerFiles.includes('latest_session.json')) {
              candidates.push(path.join(folderPath, 'latest_session.json'));
            }
            // All state files sorted newest first
            const stateFiles = innerFiles
              .filter(f => (f === 'latest_session.json' || f.startsWith('state_') || f.startsWith('session_backup_')) && f.endsWith('.json'))
              .sort()
              .reverse();
            for (const sf of stateFiles) {
              candidates.push(path.join(folderPath, sf));
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  // 4. Scan legacy history folders in Documents and UserData
  const historyDirs = [
    path.join(userData, 'history'),
    getDocumentsAutosaveRootDir() ? path.join(getDocumentsAutosaveRootDir(), 'history') : null,
  ].filter(Boolean);

  for (const hDir of historyDirs) {
    if (fs.existsSync(hDir)) {
      try {
        const files = fs.readdirSync(hDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            candidates.push(path.join(hDir, file));
          }
        }
      } catch (e) {}
    }
  }

  // 5. Check legacy or alternate folder names in AppData (e.g. prompt-modifier vs Prompt Modifier)
  const appNames = ['Prompt Modifier', 'prompt-modifier'];
  for (const name of appNames) {
    const dir = path.join(appData, name);
    candidates.push(path.join(dir, 'prompt_modifier_session.json'));
    candidates.push(path.join(dir, 'prompt_modifier_session.backup.json'));
    candidates.push(path.join(dir, 'Partitions', 'main', 'prompt_modifier_session.json'));
    candidates.push(path.join(dir, 'Partitions', 'main', 'prompt_modifier_session.backup.json'));
  }

  // Deduplicate paths
  return Array.from(new Set(candidates));
}

// Check if a session has substantial user content (more than 1 tab, or nodes, or renamed tabs, or non-default state)
export function isSubstantialSession(sessionObj) {
  if (!sessionObj || !Array.isArray(sessionObj.tabs) || sessionObj.tabs.length === 0) return false;
  if (sessionObj.tabs.length > 1) return true;
  const firstTab = sessionObj.tabs[0];
  if (!firstTab) return false;
  if (firstTab.name && firstTab.name !== 'Canvas 1') return true;
  if (firstTab.state) {
    const nodes = firstTab.state.nodes;
    if (Array.isArray(nodes)) {
      // Check if any node has user value, custom position, or non-default setup
      if (nodes.length > 0) {
        const hasCustomContent = nodes.some(n => {
          if (!n) return false;
          if (n.value && n.value !== '{"messages":[],"currentInput":""}' && n.value !== '{"inputText":"","targetLanguage":"ru","translatedText":"","inputHeight":197}' && n.value !== '') {
            return true;
          }
          return false;
        });
        if (hasCustomContent) return true;
        // If node count differs from default 7
        if (nodes.length !== 7) return true;
      }
    }
    const connections = firstTab.state.connections;
    if (Array.isArray(connections) && connections.length !== 4) return true;
    const groups = firstTab.state.groups;
    if (Array.isArray(groups) && groups.length > 0) return true;
  }
  return false;
}

export async function persistDesktopSession(event, sessionData) {
  try {
    const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    if (!isValidSession(parsed)) {
      return { success: false, error: 'Invalid session structure' };
    }

    // Ensure timestamp
    if (!parsed.savedAt) {
      parsed.savedAt = Date.now();
    }

    // Update dynamic limits if provided by client
    if (typeof parsed.historyLimit === 'number') {
      currentMaxStatesPerLaunch = parsed.historyLimit;
    }
    if (typeof parsed.sessionLimit === 'number') {
      currentSessionLimit = Math.max(1, Math.min(5, parsed.sessionLimit));
    }

    const isSnapshot = Boolean(parsed.isSnapshot);
    const jsonStr = JSON.stringify(parsed, null, 2);

    // 1. Save to the current launch directory in UserData (%APPDATA%/Prompt Modifier/autosave/YYYY-MM-DD_HH-mm-ss)
    const userLaunchDir = getCurrentUserLaunchDir();
    if (isSnapshot) {
      await saveStateToLaunchDir(userLaunchDir, jsonStr, parsed.savedAt, currentMaxStatesPerLaunch);
    } else if (userLaunchDir) {
      if (!fs.existsSync(userLaunchDir)) await fs.promises.mkdir(userLaunchDir, { recursive: true });
      await atomicWriteFile(path.join(userLaunchDir, 'latest_session.json'), jsonStr);
    }

    // 2. Save to the current launch directory in Documents (Prompt Modifier/autosave/YYYY-MM-DD_HH-mm-ss)
    const docsLaunchDir = getCurrentDocsLaunchDir();
    if (docsLaunchDir) {
      if (isSnapshot) {
        await saveStateToLaunchDir(docsLaunchDir, jsonStr, parsed.savedAt, currentMaxStatesPerLaunch);
      } else {
        if (!fs.existsSync(docsLaunchDir)) await fs.promises.mkdir(docsLaunchDir, { recursive: true });
        await atomicWriteFile(path.join(docsLaunchDir, 'latest_session.json'), jsonStr);
      }
    }

    // 3. Write to Primary AppData path and rotate backup
    const primaryFile = getPrimarySessionFilePath();
    const primaryBackup = getPrimaryBackupFilePath();

    let existingSession = null;
    if (fs.existsSync(primaryFile)) {
      try {
        const existingData = await fs.promises.readFile(primaryFile, 'utf-8');
        existingSession = JSON.parse(existingData);
      } catch (e) {}
    }

    if (existingSession && isSubstantialSession(existingSession)) {
      try {
        await atomicWriteFile(primaryBackup, JSON.stringify(existingSession, null, 2));
      } catch (e) {
        console.warn('Could not rotate primary session to backup:', e);
      }
    }

    await atomicWriteFile(primaryFile, jsonStr);

    // 4. Write to Documents root session file and rotate backup
    const docsFile = getDocumentsSessionFilePath();
    const docsBackup = getDocumentsBackupFilePath();

    if (docsFile) {
      if (fs.existsSync(docsFile)) {
        try {
          const existingDocsData = await fs.promises.readFile(docsFile, 'utf-8');
          const existingDocsSession = JSON.parse(existingDocsData);
          if (docsBackup && isSubstantialSession(existingDocsSession)) {
            await atomicWriteFile(docsBackup, JSON.stringify(existingDocsSession, null, 2));
          }
        } catch (e) {}
      }
      await atomicWriteFile(docsFile, jsonStr);
    }

    // 5. Clean archive folders and prune states according to limits
    await cleanOldLaunchArchives(getUserAutosaveRootDir(), currentSessionLimit, currentMaxStatesPerLaunch);
    await cleanOldLaunchArchives(getDocumentsAutosaveRootDir(), currentSessionLimit, currentMaxStatesPerLaunch);
    lastSavedSessionAt = parsed.savedAt;

    return { success: true, savedAt: parsed.savedAt, launchFolder: launchFolderName, path: primaryFile };
  } catch (err) {
    console.error('Failed to save session to disk in Electron:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function setupSessionIPC(getMainWindow) {
  ipcMain.handle('session:save', (event, sessionData) => {
    const mainWindow = getMainWindow();
    if (mainWindow && event.sender !== mainWindow.webContents) {
      return { success: false, error: 'Only the main window can save the project session' };
    }
    const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    return sessionWriteQueue.run(parsed, () => persistDesktopSession(event, parsed));
  });

  ipcMain.handle('session:load', async () => {
    await sessionWriteQueue.idle();
    try {
      const candidatePaths = getAllCandidateSessionPaths();
      let bestSession = null;
      let bestSavedAt = -1;
      let bestPath = null;

      for (const filePath of candidatePaths) {
        try {
          if (!fs.existsSync(filePath)) continue;
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
            const stats = await fs.promises.stat(filePath);
            const timestamp = Number(parsed.savedAt) || stats.mtimeMs || 0;
            
            if (isValidSession(parsed) && (!bestSession || timestamp > bestSavedAt)) {
              bestSession = parsed;
              bestSavedAt = timestamp;
              bestPath = filePath;
            }
          }
        } catch (err) {
          // Continue checking other candidates
        }
      }

      if (bestSession) {
        lastSavedSessionAt = bestSavedAt;
        console.log(`[Session] Restored session with ${bestSession.tabs.length} tabs from: ${bestPath}`);
        return bestSession;
      }

      return null;
    } catch (err) {
      console.error('Failed to load session from disk in Electron:', err);
      return null;
    }
  });

  // Get session and launch folder metadata
  ipcMain.handle('session:get-info', () => {
    return {
      launchFolderName,
      launchStartTime: launchStartTime.getTime(),
      maxStatesPerLaunch: currentMaxStatesPerLaunch,
      sessionLimit: currentSessionLimit,
      userAutosaveDir: getCurrentUserLaunchDir(),
      docsAutosaveDir: getCurrentDocsLaunchDir(),
      primarySessionFile: getPrimarySessionFilePath(),
      lastSavedAt: lastSavedSessionAt || null,
    };
  });

  // Open autosave folder in file explorer (current launch folder or root)
  ipcMain.handle('session:open-folder', async () => {
    try {
      const userLaunchDir = getCurrentUserLaunchDir();
      if (fs.existsSync(userLaunchDir)) {
        await shell.openPath(userLaunchDir);
        return { success: true, path: userLaunchDir };
      }

      const docsLaunchDir = getCurrentDocsLaunchDir();
      if (docsLaunchDir && fs.existsSync(docsLaunchDir)) {
        await shell.openPath(docsLaunchDir);
        return { success: true, path: docsLaunchDir };
      }

      const userRoot = getUserAutosaveRootDir();
      if (!fs.existsSync(userRoot)) {
        await fs.promises.mkdir(userRoot, { recursive: true });
      }
      await shell.openPath(userRoot);
      return { success: true, path: userRoot };
    } catch (e) {
      console.error('Failed to open autosave folder:', e);
      return { success: false, error: e?.message || String(e) };
    }
  });

  // List all session backups found across AppData and Documents, tagged with launch folders and deduplicated
  ipcMain.handle('session:list-backups', async () => {
    try {
      const results = [];
      const seenSnapshots = new Set();
      const autosaveRoots = [
        getUserAutosaveRootDir(),
        getDocumentsAutosaveRootDir(),
      ].filter(Boolean);

      // 1. Include both historical snapshots and the latest ordinary save.
      for (const rootDir of autosaveRoots) {
        if (fs.existsSync(rootDir)) {
          try {
            const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
            const folderNames = entries
              .filter(e => e.isDirectory() && e.name !== 'history')
              .map(e => e.name)
              .sort()
              .reverse();

            for (const fName of folderNames) {
              const folderPath = path.join(rootDir, fName);
              try {
                const innerFiles = await fs.promises.readdir(folderPath);
                const stateFiles = innerFiles
                  .filter(f => (f === 'latest_session.json' || f.startsWith('state_') || f.startsWith('session_backup_')) && f.endsWith('.json'))
                  .sort((a, b) => {
                    const timeA = parseInt(a.replace(/\D/g, ''), 10) || 0;
                    const timeB = parseInt(b.replace(/\D/g, ''), 10) || 0;
                    return timeB - timeA;
                  });

                for (const sf of stateFiles) {
                  const filePath = path.join(folderPath, sf);
                  try {
                    const stats = await fs.promises.stat(filePath);
                    const raw = await fs.promises.readFile(filePath, 'utf-8');
                    const parsed = JSON.parse(raw);
                    if (parsed && Array.isArray(parsed.tabs)) {
                      const savedAt = Number(parsed.savedAt) || stats.mtimeMs;
                      // Deduplicate by launch folder and timestamp so mirrored Documents copy isn't listed twice
                      const dedupKey = `${fName}_${savedAt}`;
                      if (seenSnapshots.has(dedupKey)) continue;
                      seenSnapshots.add(dedupKey);

                      const isCurrentLaunch = fName === launchFolderName;

                      results.push({
                        path: filePath,
                        filename: sf,
                        directory: folderPath,
                        launchFolder: fName,
                        isCurrentLaunch,
                        size: stats.size,
                        savedAt,
                        tabCount: parsed.tabs.length,
                        tabNames: parsed.tabs.map(t => t.name || 'Untitled'),
                        screenshot: parsed.screenshot || null,
                      });
                    }
                  } catch (e) {}
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
      }

      // 2. Scan legacy history folders if any
      const userData = app.getPath('userData');
      const legacyHistoryDirs = [
        path.join(userData, 'history'),
        getDocumentsAutosaveRootDir() ? path.join(getDocumentsAutosaveRootDir(), 'history') : null,
      ].filter(Boolean);

      for (const hDir of legacyHistoryDirs) {
        if (fs.existsSync(hDir)) {
          try {
            const files = await fs.promises.readdir(hDir);
            for (const file of files) {
              if (file.endsWith('.json')) {
                const filePath = path.join(hDir, file);
                try {
                  const stats = await fs.promises.stat(filePath);
                  const raw = await fs.promises.readFile(filePath, 'utf-8');
                  const parsed = JSON.parse(raw);
                  if (parsed && Array.isArray(parsed.tabs)) {
                    const savedAt = Number(parsed.savedAt) || stats.mtimeMs;
                    const dedupKey = `history_${savedAt}`;
                    if (seenSnapshots.has(dedupKey)) continue;
                    seenSnapshots.add(dedupKey);

                    results.push({
                      path: filePath,
                      filename: file,
                      directory: hDir,
                      launchFolder: 'history',
                      isCurrentLaunch: false,
                      size: stats.size,
                      savedAt,
                      tabCount: parsed.tabs.length,
                      tabNames: parsed.tabs.map(t => t.name || 'Untitled'),
                      screenshot: parsed.screenshot || null,
                    });
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        }
      }

      // Sort newest first
      results.sort((a, b) => b.savedAt - a.savedAt);
      return results;
    } catch (e) {
      console.error('Failed to list session backups:', e);
      return [];
    }
  });

  // Restore a specific session file
  ipcMain.handle('session:restore-backup', async (event, targetPath) => {
    try {
      if (!targetPath || !fs.existsSync(targetPath)) {
        return { success: false, error: 'Backup file does not exist' };
      }
      const raw = await fs.promises.readFile(targetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
        return { success: false, error: 'Invalid backup format' };
      }
      return { success: true, session: parsed };
    } catch (e) {
      return { success: false, error: e?.message || String(e) };
    }
  });

  // Clear all session backup files (archives) while preserving primary state
  ipcMain.handle('session:clear-backups', async () => {
    try {
      const autosaveRoots = [
        getUserAutosaveRootDir(),
        getDocumentsAutosaveRootDir(),
      ].filter(Boolean);

      for (const rootDir of autosaveRoots) {
        if (fs.existsSync(rootDir)) {
          try {
            const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
            for (const entry of entries) {
              const entryPath = path.join(rootDir, entry.name);
              if (entry.isDirectory()) {
                await fs.promises.rm(entryPath, { recursive: true, force: true }).catch(() => {});
              } else if (entry.name !== 'prompt_modifier_session.json') {
                await fs.promises.unlink(entryPath).catch(() => {});
              }
            }
          } catch (e) {}
        }
      }

      const userData = app.getPath('userData');
      const historyDir = path.join(userData, 'history');
      if (fs.existsSync(historyDir)) {
        await fs.promises.rm(historyDir, { recursive: true, force: true }).catch(() => {});
      }

      const primaryBackup = getPrimaryBackupFilePath();
      if (fs.existsSync(primaryBackup)) {
        await fs.promises.unlink(primaryBackup).catch(() => {});
      }
      const docsBackup = getDocumentsBackupFilePath();
      if (docsBackup && fs.existsSync(docsBackup)) {
        await fs.promises.unlink(docsBackup).catch(() => {});
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to clear session backups in Electron:', err);
      return { success: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle('session:read-backup', async (_, targetPath) => {
    const roots = [getUserAutosaveRootDir(), getDocumentsAutosaveRootDir()].filter(Boolean);
    const resolved = await fs.promises.realpath(targetPath);
    if (!roots.some(root => {
      const relative = path.relative(path.resolve(root), resolved);
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    })) throw new Error('Backup is outside the session folders');
    const session = JSON.parse(await fs.promises.readFile(resolved, 'utf8'));
    if (!Array.isArray(session.tabs)) throw new Error('Invalid session backup');
    return { success: true, session };
  });
}
