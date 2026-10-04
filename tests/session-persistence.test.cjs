const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    const exports = {};
    vm.runInNewContext(output, { exports, require: name => {
        if (name in mocks) return mocks[name];
        throw Error('Unexpected dependency ' + name);
    }, console: { warn() {}, error() {} }, Date, URLSearchParams, ...globals });
    return exports;
}
const candidate = (savedAt, nodes = []) => ({ savedAt, activeTabId: 'tab', tabs: [{ id: 'tab', state: { nodes, fullSizeImageCache: { image: 'data:image/png;base64,full' } } }] });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));

function renderer(api = {}, initial) {
    let stored = initial;
    const local = new Map();
    const localStorage = { getItem: k => local.get(k) ?? null, setItem: (k, v) => local.set(k, v) };
    const window = { electronAPI: api, location: { search: '' }, localStorage, dispatchEvent() {} };
    const indexedDB = { open() {
        const request = {};
        queueMicrotask(() => {
            request.result = { close() {}, transaction() {
                const transaction = { objectStore() { return {
                    put(value) { stored = structuredClone(value); queueMicrotask(() => transaction.oncomplete?.()); },
                    get() { const read = {}; queueMicrotask(() => { read.result = stored; read.onsuccess(); }); return read; }
                }; } };
                return transaction;
            } };
            request.onsuccess();
        });
        return request;
    } };
    const module = load('hooks/useTabs.ts', {
        react: {}, '../types': { NodeType: {} }, '../utils/imageMemoryCache': {},
        '../localization': { getTranslation: (_, key) => key },
        '../services/sessionRecovery': load('services/sessionRecovery.ts'),
        '../utils/canvasScreenshot': { generateCanvasScreenshot: () => 'preview' }
    }, { window, localStorage, indexedDB, CustomEvent: class {}, });
    return { module, window, stored: () => stored, local };
}

test('restart picks newer IndexedDB data over disk; empty latest canvas remains empty', async () => {
    const latest = candidate(200);
    const r = renderer({ loadSession: async () => candidate(100, [{ id: 'old' }]) }, latest);
    const result = await r.module.loadSessionFromDB();
    assert.equal(result.tabs[0].state.nodes.length, 0);
    assert.equal(result.tabs[0].state.fullSizeImageCache.image, latest.tabs[0].state.fullSizeImageCache.image);
});

test('corrupt candidates are ignored and full disk copy wins ties with lightweight fallback', () => {
    const { selectLatestSession } = load('services/sessionRecovery.ts');
    const full = candidate(200);
    const lightweight = { ...candidate(200), tabs: [{ id: 'tab', state: { nodes: [] } }] };
    assert.equal(selectLatestSession([{ savedAt: 300, tabs: [{}] }, full, lightweight]), full);
});

test('renderer serializes saves and persists full images in snapshots with increasing timestamps', async () => {
    const gate = deferred();
    const writes = [];
    const r = renderer({ saveSession: async data => { writes.push(data); if (writes.length === 1) await gate.promise; return { success: true }; } });
    const a = candidate(1, [{ id: 'first' }]); const b = candidate(2, [{ id: 'latest' }]);
    const first = r.module.saveSessionToDB(a.tabs, a.activeTabId, undefined, true);
    const second = r.module.saveSessionToDB(b.tabs, b.activeTabId, undefined, true);
    await flush(); assert.equal(writes.length, 1);
    gate.resolve(); await Promise.all([first, second]);
    assert.equal(writes.length, 2);
    assert.ok(writes[1].savedAt > writes[0].savedAt);
    assert.equal(writes[1].isSnapshot, true);
    assert.equal(r.stored().tabs[0].state.nodes[0].id, 'latest');
    assert.equal(r.stored().tabs[0].state.fullSizeImageCache.image, b.tabs[0].state.fullSizeImageCache.image);
});

test('disk failure is reported, recovery copy still persists and a subsequent save succeeds', async () => {
    let fail = true;
    const r = renderer({ saveSession: async () => fail ? { success: false, error: 'Disk full' } : { success: true } });
    const data = candidate(1);
    await assert.rejects(r.module.saveSessionToDB(data.tabs, 'tab'), /Disk full/);
    assert.ok(r.stored()); fail = false;
    await r.module.saveSessionToDB(data.tabs, 'tab');
});

test('detached node windows cannot overwrite the main session', async () => {
    let writes = 0;
    const r = renderer({ saveSession: async () => { writes++; return { success: true }; } });
    r.window.location.search = '?detachedNodeId=node-1';
    await r.module.saveSessionToDB(candidate(1).tabs, 'tab');
    assert.equal(writes, 0); assert.equal(r.stored(), undefined);
});

test('native queue waits for older slow writes, skips stale writes, and survives failure', async () => {
    const { createSessionWriteQueue } = await import('../electron/sessionPersistence.js');
    const queue = createSessionWriteQueue(); const gate = deferred(); const writes = [];
    const first = queue.run({ savedAt: 1 }, async () => { await gate.promise; writes.push(1); return { success: true }; });
    const second = queue.run({ savedAt: 2 }, async () => { writes.push(2); return { success: true }; });
    await flush(); assert.equal(writes.length, 0);
    gate.resolve(); await Promise.all([first, second]); await queue.idle();
    assert.deepEqual(writes, [1, 2]);
    assert.equal((await queue.run({ savedAt: 1 }, () => { throw Error('Stale write executed'); })).skipped, true);
    await assert.rejects(queue.run({ savedAt: 3 }, async () => { throw Error('Disk'); }), /Disk/);
    assert.equal((await queue.run({ savedAt: 4 }, async () => ({ success: true }))).success, true);
});

test('save-and-exit deduplicates requests and closes only after confirmed completion', async () => {
    const { createSaveAndExit } = load('services/saveAndExit.ts');
    const gate = deferred(); let saves = 0, closes = 0;
    const exit = createSaveAndExit(async () => { saves++; await gate.promise; }, () => { closes++; }, () => assert.fail('Unexpected failure'));
    const first = exit(); assert.equal(exit(), first);
    await flush(); assert.equal(saves, 1); assert.equal(closes, 0);
    gate.resolve(); await first; assert.equal(closes, 1);
});

test('failed save keeps app open and allows retry', async () => {
    const { createSaveAndExit } = load('services/saveAndExit.ts');
    let fail = true, closes = 0, errors = 0;
    const exit = createSaveAndExit(async () => { if (fail) throw Error('Disk full'); }, () => closes++, () => errors++);
    await exit(); assert.equal(closes, 0); assert.equal(errors, 1);
    fail = false; await exit(); assert.equal(closes, 1);
});

test('autosave starts after restoration ref becomes ready without reinstalling timer; slow saves do not overlap', async () => {
    let tick, ready = false, calls = 0, cleared = false; const gate = deferred();
    const { startSessionAutosave } = load('services/sessionAutosave.ts', {}, {
        setInterval: callback => { tick = callback; return 1; }, clearInterval: () => { cleared = true; }
    });
    const stop = startSessionAutosave(120000, () => ready, async () => { calls++; await gate.promise; });
    await tick(); assert.equal(calls, 0);
    ready = true; const save = tick(); await tick(); assert.equal(calls, 1);
    gate.resolve(); await save; await tick(); assert.equal(calls, 2);
    stop(); assert.equal(cleared, true);
});

test('actual Electron save writes full files; backup listing includes latest saves and deduplicates mirrors', async t => {
    const path = require('node:path');
    const parent = path.resolve('work/session-tests');
    await fs.promises.mkdir(parent, { recursive: true });
    const root = await fs.promises.mkdtemp(path.join(parent, 'case-'));
    t.after(async () => {
        assert.ok(path.resolve(root).startsWith(parent + path.sep));
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const user = path.join(root, 'user'); const docs = path.join(root, 'docs');
    const launch = '2026-10-03_12-00-00';
    const primary = path.join(root, 'primary.json');
    const handlers = {};
    const context = vm.createContext({ fs, path, console: { log() {}, warn() {}, error() {} }, Date, Math, Set,
        ipcMain: { handle: (name, handler) => { handlers[name] = handler; } },
        app: { getPath: () => root }, launchFolderName: launch,
        currentMaxStatesPerLaunch: 5, currentSessionLimit: 2, lastSavedSessionAt: 0,
        getUserAutosaveRootDir: () => user, getDocumentsAutosaveRootDir: () => docs,
        getCurrentUserLaunchDir: () => path.join(user, launch), getCurrentDocsLaunchDir: () => path.join(docs, launch),
        getPrimarySessionFilePath: () => primary, getPrimaryBackupFilePath: () => path.join(root, 'backup.json'),
        getDocumentsSessionFilePath: () => path.join(docs, 'session.json'), getDocumentsBackupFilePath: () => path.join(docs, 'backup.json'),
        pruneStateFilesInDir: async () => {}, cleanOldLaunchArchives: async () => {},
        isValidSession: (await import('../electron/sessionPersistence.js')).isValidSession,
        isSubstantialSession: () => true,
        sessionWriteQueue: { idle: async () => {} },
        getAllCandidateSessionPaths: () => [primary, path.join(root, 'backup.json'), path.join(user, launch, 'latest_session.json')],
    });
    // Exercise the real main-process implementations with only paths redirected.
    const source = ts.createSourceFile('main.js', fs.readFileSync('electron/main.js', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const statement of source.statements) {
        if (ts.isFunctionDeclaration(statement) && ['atomicWriteFile', 'saveStateToLaunchDir', 'persistDesktopSession'].includes(statement.name?.text)) vm.runInContext(statement.getText(source), context);
        if (["ipcMain.handle('session:list-backups'", "ipcMain.handle('session:load'"].some(prefix => statement.getText(source).startsWith(prefix))) vm.runInContext(statement.getText(source), context);
    }
    const data = { ...candidate(100), isSnapshot: false };
    assert.equal((await context.persistDesktopSession({}, data)).success, true);
    assert.deepEqual(JSON.parse(await fs.promises.readFile(primary, 'utf8')).tabs, data.tabs);
    const backups = await handlers['session:list-backups']();
    assert.equal(backups.length, 1); assert.equal(backups[0].filename, 'latest_session.json');
    const snapshot = { ...candidate(200, [{ id: 'new' }]), isSnapshot: true };
    assert.equal((await context.persistDesktopSession({}, snapshot)).success, true);
    const updated = await handlers['session:list-backups']();
    assert.equal(updated.length, 1); assert.equal(updated[0].savedAt, 200);
    assert.equal(JSON.parse(await fs.promises.readFile(primary, 'utf8')).tabs[0].state.nodes[0].id, 'new');
    const restored = await handlers['session:load']();
    assert.equal(restored.savedAt, 200);
    assert.equal(restored.tabs[0].state.fullSizeImageCache.image, snapshot.tabs[0].state.fullSizeImageCache.image);
    await fs.promises.writeFile(path.join(root, 'blocker'), 'file');
    context.getCurrentUserLaunchDir = () => path.join(root, 'blocker', 'child');
    assert.equal((await context.persistDesktopSession({}, { ...candidate(300), isSnapshot: true })).success, false);
    assert.equal(JSON.parse(await fs.promises.readFile(primary, 'utf8')).savedAt, 200);
});
