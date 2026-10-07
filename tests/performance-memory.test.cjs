const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { loadTypeScript } = require('./helpers/load-typescript.cjs');
const original = 'data:image/png;base64,' + Buffer.alloc(8192, 37).toString('base64');
const second = 'data:image/webp;base64,' + Buffer.alloc(8192, 77).toString('base64');
const preview = 'data:image/webp;base64,cHJldmlldw==';
function storageFixture(file = 'services/canvasOriginalStore.ts') {
    const entries = new Map();
    let failWrite = false;
    const archive = {
        readBatchArchive: async key => entries.get(key) || null,
        writeBatchArchive: async (key, payload) => {
            if (failWrite) throw new Error('disk full');
            entries.set(key, structuredClone(payload));
        }
    };
    return { entries, fail: () => { failWrite = true; },
        api: loadTypeScript(file, { './batchResultsCache': archive }, { crypto: webcrypto }) };
}
const canvas = () => ({ nodes: [
    { id: 'a', value: JSON.stringify({ image: original, files: [{ dataUrl: original }, { dataUrl: second }], prompt: 'keep me' }) },
    { id: 'b', value: original }
], connections: [], groups: [], fullSizeImageCache: { a: { 0: original, 1: second }, b: { 0: original } } });

test('inactive canvas drops inline image bytes and deduplicates exact originals across nodes and cache', async () => {
    const { api, entries } = storageFixture();
    const warm = canvas();
    const cold = await api.coolCanvasOriginals(warm);
    assert.equal(JSON.stringify(cold).includes(original), false);
    assert.equal(JSON.stringify(cold).includes(second), false);
    assert.equal(Object.keys(cold.fullSizeImageCache).length, 0);
    assert.equal(entries.get(cold.canvasOriginalArchiveKey).images.length, 2);
    const restored = await api.hydrateCanvasOriginals(cold);
    assert.deepEqual(JSON.parse(JSON.stringify(restored)), warm);
    assert.equal(warm.nodes[1].value, original, 'input must not be mutated');
});

test('warming canvas preserves background output, reordered references, prompt edits and deletion', async () => {
    const { api } = storageFixture();
    const cold = await api.coolCanvasOriginals(canvas());
    const value = JSON.parse(cold.nodes[0].value);
    value.prompt = 'edited while inactive';
    value.files.reverse();
    const edited = { ...cold, nodes: [{ ...cold.nodes[0], value: JSON.stringify(value) }], fullSizeImageCache: { a: { 9: second } } };
    const warm = await api.hydrateCanvasOriginals(edited);
    const restored = JSON.parse(warm.nodes[0].value);
    assert.equal(restored.prompt, value.prompt);
    assert.equal(restored.files[0].dataUrl, second);
    assert.equal(restored.files[1].dataUrl, original);
    assert.equal(warm.fullSizeImageCache.a[9], second);
    assert.equal(warm.fullSizeImageCache.b, undefined);
});

test('failed durable write never removes originals; missing archive stops restoration', async () => {
    const fixture = storageFixture();
    const warm = canvas(); const before = JSON.stringify(warm);
    fixture.fail();
    await assert.rejects(fixture.api.coolCanvasOriginals(warm), /disk full/);
    assert.equal(JSON.stringify(warm), before);
    await assert.rejects(fixture.api.hydrateCanvasOriginals({ ...warm, canvasOriginalArchiveKey: 'missing' }), /could not be loaded/);
});

test('MultiView retrieves exact server original and rejects legacy preview or missing durable source', async () => {
    const fixture = storageFixture('services/originalImageStore.ts');
    const source = await fixture.api.prepareStoredImage(original, preview);
    assert.equal(source.image, preview);
    assert.equal(source.originalImage, original);
    assert.equal(await fixture.api.acquireOriginalImage(source), original);
    await assert.rejects(fixture.api.acquireOriginalImage({ image: preview }), /legacy/);
    fixture.entries.clear();
    await assert.rejects(fixture.api.acquireOriginalImage(source), /unavailable/);
});

test('portable project export materializes both cold canvas and MultiView originals without storage keys', async () => {
    const fixture = storageFixture('services/originalImageStore.ts');
    const source = await fixture.api.prepareStoredImage(second, preview);
    const cold = { ...canvas(), canvasOriginalArchiveKey: 'cold', fullSizeImageCache: {}, nodes: [{ id: 'a', value: JSON.stringify({ image: 'pm-node-image:0', multiviewItems: [source] }) }] };
    fixture.entries.set('cold', { cache: { a: { 0: 'pm-canvas-image:0' } }, images: [original], nodeImages: { a: [0] } });
    const exported = await fixture.api.inlineStoredOriginals({ tabs: [{ state: cold }] });
    const state = exported.tabs[0].state, value = JSON.parse(state.nodes[0].value);
    assert.equal(state.fullSizeImageCache.a[0], original);
    assert.equal(value.image, original);
    assert.equal(value.multiviewItems[0].originalImage, second);
    assert.equal(value.multiviewItems[0].originalArchiveKey, undefined);
    assert.equal(state.canvasOriginalArchiveKey, undefined);
    assert.equal(cold.canvasOriginalArchiveKey, 'cold');
});

test('storage failure retains exact inline source rather than using thumbnail as original', async () => {
    const fixture = storageFixture('services/originalImageStore.ts'); fixture.fail();
    const source = await fixture.api.prepareStoredImage(original, preview);
    assert.equal(source.image, original);
    assert.equal(source.thumbnailUrl, preview);
    assert.equal(await fixture.api.acquireOriginalImage(source), original);
});

test('image work concurrency is bounded and cancellation removes queued source without decoding', async () => {
    const api = loadTypeScript('utils/imageWorkQueue.ts');
    const release = []; let count = 0, peak = 0, cancelledWork = false;
    const work = () => new Promise(resolve => { count++; peak = Math.max(peak, count); release.push(() => { count--; resolve(); }); });
    const first = api.scheduleImageWork(work), secondJob = api.scheduleImageWork(work);
    const cancellation = new AbortController();
    const cancelled = api.scheduleImageWork(async () => { cancelledWork = true; }, cancellation.signal);
    const rejected = assert.rejects(cancelled, { name: 'AbortError' });
    cancellation.abort();
    await new Promise(setImmediate);
    assert.equal(api.imageWorkQueueStats().running, 2);
    assert.equal(api.imageWorkQueueStats().queued, 0);
    release.forEach(fn => fn());
    await Promise.all([first, secondJob, rejected]);
    await new Promise(setImmediate);
    assert.equal(peak, 2); assert.equal(cancelledWork, false);
    assert.equal(api.imageWorkQueueStats().running, 0);
});

test('MultiView task survives listener unmount and cancellation ignores pending response', async () => {
    const api = loadTypeScript('services/multiviewTasks.ts');
    const patches = []; let resolve;
    const unsubscribe = api.subscribeMultiviewTasks(() => {});
    const task = api.runMultiviewTask('tab:node', [{ id: 'one', index: 1 }, { id: 'two', index: 2 }], () => new Promise(r => { resolve = r; }), (id, updates) => patches.push({ id, ...updates }));
    unsubscribe();
    assert.equal(api.getMultiviewTask('tab:node').index, 1);
    api.cancelMultiviewTask('tab:node'); resolve('discard this response'); await task;
    assert.equal(patches.length, 2);
    assert.equal(patches[1].status, 'idle');
    assert.equal(patches.some(patch => patch.prompt), false);
    assert.equal(api.getMultiviewTask('tab:node'), null);
});

test('virtual list bounds mounted cards for 30 images and keeps focused offscreen row', () => {
    let cursor = 0;
    const states = [];
    const react = { useRef: value => ({ current: value }), useMemo: fn => fn(), useLayoutEffect() {},
        useState: value => { const index = cursor++; states[index] ??= value; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
        createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
    const { VirtualList } = loadTypeScript('components/VirtualList.tsx', { react: { ...react, default: react } });
    const props = { items: Array.from({ length: 30 }, (_, id) => ({ id })), estimatedRowHeight: 100, getKey: item => item.id, renderItem: item => item.id };
    const first = VirtualList(props);
    const rows = first.children[0].children[0];
    assert.equal(rows.length, 8);
    rows[0].props.onFocusCapture();
    states[1] = { top: 2200, height: 400 }; cursor = 0;
    const later = VirtualList(props).children[0].children[0];
    assert.equal(later.some(row => row.props.key === 0), true);
    assert.ok(later.length < 15);
});

test('thumbnail worker uses display dimensions, retains transparency and releases bitmap/canvas', async () => {
    const scope = { postMessage: value => { scope.result = value; } };
    let closed = false, drawn, surface;
    class Surface {
        constructor(width, height) { this.width = width; this.height = height; surface = this; }
        getContext() { return { drawImage: (...args) => { drawn = args; } }; }
        async convertToBlob(options) { assert.equal(options.type, 'image/webp'); return new Blob(['preview'], { type: options.type }); }
    }
    loadTypeScript('workers/thumbnail.worker.ts', {}, { self: scope, OffscreenCanvas: Surface,
        fetch: async src => { assert.equal(src, original); return { blob: async () => new Blob(['original']) }; },
        createImageBitmap: async () => ({ width: 4096, height: 2048, close() { closed = true; } }) });
    await scope.onmessage({ data: { src: original, width: 128, height: 128 } });
    assert.equal(drawn[3], 128); assert.equal(drawn[4], 64);
    assert.equal(closed, true); assert.equal(surface.width, 0); assert.equal(surface.height, 0);
    assert.equal(scope.result.blob.type, 'image/webp');
});

test('worker cancellation terminates decoder, unsupported workers return canvas fallback', async () => {
    const fallback = loadTypeScript('utils/thumbnailWorker.ts');
    assert.equal(await fallback.tryWorkerThumbnail(original, 128, 128, new AbortController().signal), null);
    let worker;
    class FakeWorker {
        constructor() { worker = this; }
        postMessage(message) { this.source = message.src; }
        terminate() { this.terminated = true; }
    }
    const api = loadTypeScript('utils/thumbnailWorker.ts', {}, { Worker: FakeWorker, OffscreenCanvas: class {}, URL });
    const controller = new AbortController();
    const pending = api.tryWorkerThumbnail(original, 128, 128, controller.signal);
    assert.equal(worker.source, original);
    const rejected = assert.rejects(pending, { name: 'AbortError' }); controller.abort(); await rejected;
    assert.equal(worker.terminated, true); assert.equal(worker.onmessage, null);
});

test('cleanup protects durable original references inside inactive canvases and serialized cards', () => {
    const { collectCacheReferences } = loadTypeScript('utils/cacheReferences.ts', { '../types': { NodeType: {} } });
    const references = collectCacheReferences([{ state: { canvasOriginalArchiveKey: 'canvas-originals:cold', nodes: [{ value: JSON.stringify({ multiviewItems: [{ originalArchiveKey: 'original-image:source' }] }) }] } }]);
    assert.equal(references.keys.has('canvas-originals:cold'), true);
    assert.equal(references.keys.has('original-image:source'), true);
});

test('export state retains metadata only, loads exact ZIP on demand and releases temporary files', async () => {
    const records = new Map(); let closed = 0;
    const db = { close() { closed++; }, transaction() {
        const transaction = { objectStore: () => ({
            put(value, key) { records.set(key, value); },
            delete(key) { records.delete(key); },
            get(key) { const request = {}; setImmediate(() => { request.result = records.get(key); request.onsuccess(); }); return request; }
        }) };
        setImmediate(() => transaction.oncomplete?.());
        return transaction;
    } };
    const indexedDB = { open() { const request = {}; setImmediate(() => { request.result = db; request.onsuccess(); }); return request; } };
    const api = loadTypeScript('services/batchExportStore.ts', {}, { indexedDB, crypto: webcrypto });
    const zipBlob = new Blob(['exact ZIP bytes']);
    const result = { zipBlob, filename: 'test.zip', totalImages: 1, totalSlices: 1, folders: [{ name: 'one', files: [{ dataUrl: original }] }] };
    const stored = await api.persistBatchExport(result);
    assert.equal(stored.zipBlob, undefined); assert.equal(stored.folders, undefined);
    assert.equal(stored.filename, 'test.zip'); assert.equal(JSON.stringify(stored).includes(original), false);
    assert.equal(await (await api.acquireBatchExportBlob(stored)).text(), 'exact ZIP bytes');
    assert.equal((await api.acquireBatchExportFolders(stored))[0].files[0].dataUrl, original);
    await api.deleteBatchExport(stored.archiveKey);
    assert.equal(records.size, 0);
    await assert.rejects(api.acquireBatchExportBlob(stored), /unavailable/);
    assert.equal(closed, 5);
});
