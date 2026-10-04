const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ts = require('typescript');

function load(file, mocks) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, console, require(name) {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  } }, { filename: file });
  return exports;
}

test('startup waits for Electron readiness before installing downloads and creating windows', async () => {
  let ready = false;
  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });
  const handlers = new Map();
  const ipcMain = new EventEmitter();
  ipcMain.handle = (name, handler) => {
    assert.ok(!handlers.has(name), 'duplicate IPC handler: ' + name);
    handlers.set(name, handler);
  };
  const app = new EventEmitter();
  app.getPath = () => path.join(__dirname, 'downloads');
  app.requestSingleInstanceLock = () => true;
  app.whenReady = () => readyPromise;
  const defaultSession = new EventEmitter();
  defaultSession.webRequest = { onBeforeSendHeaders() {} };
  const session = { get defaultSession() {
    assert.ok(ready, 'Session can only be received when app is ready');
    return defaultSession;
  } };
  const electron = { app, ipcMain, session, BrowserWindow: {} };
  const fileHandlers = load('electron/fileHandlers.js', {
    electron, 'node:path': path, 'node:fs': fs, './batchCache.js': {}
  });
  let windowCount = 0;
  const sent = [];
  const mainWindow = { isDestroyed: () => false, webContents: { send: (...args) => sent.push(args) } };
  load('electron/main.js', {
    electron,
    './config.js': { setupAppEnvironment() {}, FAKE_USER_AGENT: 'test' },
    './windowState.js': {},
    './windowManager.js': {
      getMainWindow: () => mainWindow,
      setupWindowIPC() {},
      createMainWindow() {
        assert.ok(ready);
        assert.equal(defaultSession.listenerCount('will-download'), 1);
        assert.ok(handlers.has('app:getDownloadPath'));
        windowCount++;
      }
    },
    './trayManager.js': { setupTrayIPC() {}, loadSavedTraySettings() {}, createTray() {} },
    './sessionManager.js': { setupSessionIPC() {} },
    './fileHandlers.js': fileHandlers
  });
  assert.equal(windowCount, 0);
  assert.equal(defaultSession.listenerCount('will-download'), 0);
  ready = true;
  resolveReady();
  await readyPromise;
  assert.equal(windowCount, 1);
  assert.equal(defaultSession.listenerCount('will-download'), 1);

  // A completed download still uses the renderer's folder and notifies both windows.
  ipcMain.emit('app:setDownloadPath', {}, __dirname);
  const item = new EventEmitter();
  let savePath;
  item.getFilename = () => 'result.png';
  item.setSavePath = value => { savePath = value; };
  item.getSavePath = () => savePath;
  const downloadNotifications = [];
  const webContents = { isDestroyed: () => false, send: (...args) => downloadNotifications.push(args) };
  defaultSession.emit('will-download', {}, item, webContents);
  assert.equal(savePath, path.join(__dirname, 'result.png'));
  item.emit('done', {}, 'completed');
  assert.equal(sent.length, 1);
  assert.equal(downloadNotifications.length, 1);
  assert.equal(sent[0][0], 'app:download-complete');
  assert.equal(sent[0][1].path, savePath);
});
