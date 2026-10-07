const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ts = require('typescript');

function fixture() {
  const root = path.resolve('test-download-root');
  const selected = path.resolve('test-selected-root');
  const ipcMain = new EventEmitter(), downloads = new EventEmitter();
  const handlers = new Map(), directories = [], existing = new Set(), messages = [];
  ipcMain.handle = (name, handler) => handlers.set(name, handler);
  const mocks = {
    electron: { app: { getPath: () => root }, ipcMain, session: { defaultSession: downloads } },
    'node:path': path, 'node:fs': { existsSync: name => existing.has(name.toLowerCase()), mkdirSync: name => directories.push(name) }, './batchCache.js': {}
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../electron/fileHandlers.js'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(code, { exports, console, require: name => mocks[name] });
  exports.setupFileAndDialogIPC(() => null);
  const download = (filename, mime = '') => {
    const item = new EventEmitter();
    item.getFilename = () => filename; item.getMimeType = () => mime;
    item.setSavePath = value => { item.savePath = value; }; item.getSavePath = () => item.savePath;
    downloads.emit('will-download', {}, item, { isDestroyed: () => false, send: (...args) => messages.push(args) });
    return item;
  };
  return { root, selected, ipcMain, handlers, directories, existing, messages, download, ...exports };
}

test('all requested formats route into subfolders of the configured download root', () => {
  const fixtureState = fixture();
  fixtureState.ipcMain.emit('app:setDownloadPath', {}, fixtureState.selected);
  for (const [name, folder] of [
    ['generated.PNG', 'Image'], ['download.jpeg', 'Image'], ['transparent.webp', 'Image'], ['render.avif', 'Image'],
    ['batch.ZIP', 'ZIP'], ['canvas.json', 'JSON'], ['prompt.txt', 'TXT'], ['batch.jsonl', 'JSONL'], ['batch.ndjson', 'JSONL'],
    ['model.gltf', '3d Models'], ['model.GLB', '3d Models'], ['tripo.fbx', '3d Models'], ['mesh.obj', '3d Models']
  ]) {
    const item = fixtureState.download(name);
    assert.equal(item.savePath, path.join(fixtureState.selected, folder, name));
    assert.ok(fixtureState.directories.includes(path.join(fixtureState.selected, folder)));
    item.emit('done', {}, 'completed');
    assert.equal(fixtureState.messages.at(-1)[1].path, item.savePath);
  }
  assert.equal(fixtureState.handlers.get('app:getDownloadPath')(), fixtureState.selected, 'settings still expose the root, not a format subfolder');
});

test('default folder and MIME fallback work without changing unrelated formats', () => {
  const { download, root, ipcMain, selected } = fixture();
  ipcMain.emit('app:setDownloadPath', {}, selected);
  ipcMain.emit('app:setDownloadPath', {}, '');
  for (const [name, mime, folder] of [
    ['generated', 'image/png', 'Image'], ['export', 'application/zip', 'ZIP'], ['batch', 'application/x-ndjson', 'JSONL'],
    ['metadata', 'application/json; charset=utf-8', 'JSON'], ['prompt', 'text/plain', 'TXT'], ['model', 'model/gltf-binary', '3d Models'],
    ['movie.mp4', 'video/mp4', ''], ['sound.wav', 'audio/wav', ''], ['opaque.bin', 'application/octet-stream', '']
  ]) assert.equal(download(name, mime).savePath, path.join(root, folder, name));
  assert.equal(download('model.glb', 'application/octet-stream').savePath, path.join(root, '3d Models', 'model.glb'));
  assert.equal(download('requests.jsonl', 'application/json').savePath, path.join(root, 'JSONL', 'requests.jsonl'));
});

test('existing and concurrently downloading files are not overwritten; cancellation releases reserved path', () => {
  const { download, root, existing } = fixture();
  existing.add(path.join(root, 'Image', 'result.png').toLowerCase());
  const one = download('result.png'), two = download('result.png');
  assert.equal(one.savePath, path.join(root, 'Image', 'result (1).png'));
  assert.equal(two.savePath, path.join(root, 'Image', 'result (2).png'));
  one.emit('done', {}, 'cancelled');
  assert.equal(download('result.png').savePath, path.join(root, 'Image', 'result (1).png'));
});

test('download filename cannot escape the configured root using parent paths', () => {
  const { download, root } = fixture();
  assert.equal(download('../outside/result.png').savePath, path.join(root, 'Image', 'result.png'));
  assert.equal(download('..\\outside\\model.gltf').savePath, path.join(root, '3d Models', 'model.gltf'));
});
