const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, webcrypto } = require('node:crypto');
const { loadTypeScript } = require('./helpers/load-typescript.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');
const image = 'data:image/png;base64,aW1hZ2U=';
const thumb = 'data:image/png;base64,dGh1bWI=';
const types = { NodeType: { IMAGE_EDITOR: 'IMAGE_EDITOR', IMAGE_OUTPUT: 'IMAGE_OUTPUT', NOTE: 'NOTE' } };

async function fixture(t) {
    const { createBatchCache } = await import('../electron/batchCache.js');
    const parent = path.resolve('work/cache-tests');
    await fs.mkdir(parent, { recursive: true });
    const root = await fs.mkdtemp(path.join(parent, 'case-'));
    t.after(async () => {
        assert.ok(path.resolve(root).startsWith(parent + path.sep));
        await fs.rm(root, { recursive: true, force: true });
    });
    return { root, cache: createBatchCache(root), reopen: () => createBatchCache(root) };
}
function loadTS(file, mocks = {}, globals = {}) {
    return loadTypeScript(file, mocks, { crypto: webcrypto, ...globals });
}
const referencesModule = () => loadTS('utils/cacheReferences.ts', { '../types': types });
const archiveModule = cache => loadTS('services/batchResultsCache.ts', {}, { window: { electronAPI: {
    readBatchArchive: key => cache.get(key),
    writeBatchArchive: (...args) => cache.put(...args),
    clearUnusedBatchArchives: refs => cache.prune(refs)
} } });

test('disk archive survives a new cache instance and opaque keys cannot escape its folder', async t => {
    const { cache, reopen, root } = await fixture(t);
    const payload = { items: [{ id: 'item', resultUrl: image }] };
    await cache.put('results:../../outside', payload, [hash(image)]);
    assert.deepEqual(await reopen().get('results:../../outside'), payload);
    const files = await fs.readdir(root);
    assert.equal(files.length, 1);
    assert.match(files[0], /^[a-f0-9]{64}\.json\.gz$/);
});

test('cleanup retains job references, image references and related raw files; removes only unused archives', async t => {
    const { cache, root } = await fixture(t);
    await cache.put('results:live', {}, []);
    await cache.put('results:history', {}, [hash(image)], ['openai-output:history']);
    await cache.put('openai-output:history', { text: 'raw response' });
    await cache.put('results:unused', {});
    await fs.writeFile(path.join(root, 'user-file.txt'), 'do not delete');
    await fs.writeFile(path.join(root, 'f'.repeat(64) + '.json.gz'), 'corrupted archive');
    const result = await cache.prune({ keys: ['results:live'], imageHashes: [hash(image)], before: Number.MAX_SAFE_INTEGER });
    assert.equal(result.removed, 1);
    assert.equal(result.skipped, 1);
    assert.ok(result.bytes > 0);
    assert.equal(await cache.get('results:unused'), null);
    assert.ok(await cache.get('results:live'));
    assert.ok(await cache.get('openai-output:history'));
    assert.equal(await fs.readFile(path.join(root, 'user-file.txt'), 'utf8'), 'do not delete');
});

test('atomic overwrite, concurrent readers and cleanup retain newly written archives', async t => {
    const { cache, root } = await fixture(t);
    const before = Date.now();
    await Promise.all([cache.put('results:job', { version: 1 }), cache.put('results:job', { version: 2 })]);
    assert.deepEqual(await cache.get('results:job'), { version: 2 });
    assert.equal((await cache.prune({ keys: [], imageHashes: [], before })).removed, 0);
    assert.equal((await fs.readdir(root)).filter(file => file.endsWith('.tmp')).length, 0);
});

test('clearing the last references removes results and their original response archive', async t => {
    const { cache } = await fixture(t);
    await cache.put('results:job', {}, [], ['openai-output:job']);
    await cache.put('openai-output:job', { text: 'original response' });
    assert.equal((await cache.prune({ keys: ['results:job'], imageHashes: [], before: Number.MAX_SAFE_INTEGER })).removed, 0);
    assert.equal((await cache.prune({ keys: [], imageHashes: [], before: Number.MAX_SAFE_INTEGER })).removed, 2);
});

test('reference traversal protects serialized nodes, history, tasks, libraries and backups, excluding orphaned cache slots', () => {
    const { collectCacheReferences, pruneCanvasImageCache } = referencesModule();
    const node = { id: 'editor', type: 'IMAGE_EDITOR', value: JSON.stringify({ inputImages: [thumb], outputImage: thumb, sequenceOutputs: [{ thumbnail: thumb }] }) };
    const cache = { editor: { 0: image, 1: 'input', 2: 'obsolete input', 1000: 'frame', 1001: 'obsolete frame' }, orphan: { 0: 'orphan image' } };
    const pruned = pruneCanvasImageCache([node], cache);
    assert.equal(pruned.removed, 3);
    assert.equal(pruned.cache.editor[1], 'input');
    assert.equal(pruned.cache.editor[1001], undefined);
    const refs = collectCacheReferences([{ nodes: [node], fullSizeImageCache: cache }, { history: [{ url: image }] }, { tasks: [{ batchJobName: 'batches/live' }] }, { library: [{ content: JSON.stringify({ image: 'data:image/png;base64,library' }) }] }]);
    assert.ok(refs.images.has(image));
    assert.ok(refs.images.has('data:image/png;base64,library'));
    assert.ok(refs.keys.has('results:batches/live'));
    assert.ok(!refs.images.has('orphan image'));
    assert.equal(pruneCanvasImageCache([], { orphan: { 0: image } }, refs.images).removed, 0);
});

function managerHarness(cache, storage, node, extracted) {
    const states = [], refs = [], effects = []; let si = 0, ri = 0, network = 0, downloads = 0, inserted = 0;
    const react = {
        useState: init => { const i = si++; if (!(i in states)) states[i] = typeof init === 'function' ? init() : init; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
        useRef: init => { const i = ri++; return refs[i] ||= { current: init }; }, useCallback: fn => fn, useEffect: effect => effects.push(effect)
    };
    const noop = () => {};
    const device = new Proxy({ getDeviceId: () => 'test', getDeviceName: () => 'test', isDeviceIsolationEnabled: () => false }, { get: (o, k) => o[k] || noop });
    const module = loadTS('hooks/useBatchManager.ts', {
        react, '../types': types, '../services/batchResultsCache': archiveModule(cache), '../utils/cacheReferences': referencesModule(),
        '../services/geminiService': { listAllRemoteBatchJobs: async () => [], getBatchJobStatus: async () => { network++; return { state: 'SUCCEEDED' }; }, extractImagesFromBatchJob: async () => extracted },
        '../services/openaiService': {}, '../utils/imageUtils': { generateThumbnail: async () => thumb },
        '../utils/generationStats': {}, '../utils/pngMetadata': { addMetadataToPNG: url => url },
        '../services/soundNotificationService': { playBatchSuccessSound: noop, playBatchErrorSound: noop }, '../utils/deviceId': device
    }, {
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
        window: { addEventListener: noop, removeEventListener: noop }, setInterval: () => 0, clearInterval: noop,
        document: { createElement: () => ({ click: () => downloads++, remove: noop }), body: { appendChild: noop } }
    });
    const render = () => { si = 0; ri = 0; return module.useBatchManager({ getTargetNode: () => node, updateNodeInStorage: () => inserted++ }); };
    return { render, mount: () => effects.splice(0).map(effect => effect()), counts: () => ({ network, downloads, inserted }) };
}
const job = () => ({ id: 'job', name: 'batches/job', nodeId: 'editor', tabId: 'inactive', nodeTitle: 'Editor', model: 'test', state: 'SUCCEEDED', isSequence: true, items: [{ id: 'good', prompt: 'prompt', status: 'queued' }, { id: 'bad', prompt: 'prompt', status: 'queued' }] });
const node = insert => ({ id: 'editor', type: 'IMAGE_EDITOR', value: JSON.stringify({ autoInsertResults: insert, autoSaveImages: true }) });
const results = [{ id: 'good', imageUrl: image }, { id: 'bad', error: 'failed generation' }];

test('startup hydrates archives automatically without server calls or node insertion', async t => {
    const { cache } = await fixture(t);
    const archivedItems = [{ id: 'good', prompt: 'p', status: 'completed', resultUrl: image }];
    await cache.put('results:batches/job', { items: archivedItems });
    const storage = new Map([['gemini_batch_jobs_v1', JSON.stringify([{ ...job(), resultsCached: true }])]]);
    const restarted = managerHarness(cache, storage, node(true), []);
    restarted.render();
    const cleanups = restarted.mount();
    t.after(() => cleanups.forEach(cleanup => cleanup?.()));
    for (let attempt = 0; attempt < 100; attempt++) {
        if (restarted.render().batchJobs[0].items[0].resultUrl) break;
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert.equal(restarted.render().batchJobs[0].items[0].resultUrl, image);
    assert.deepEqual(restarted.counts(), { network: 0, downloads: 0, inserted: 0 });
});

test('cold restart loads mixed success/error results from disk without server requests or duplicate autosaves', async t => {
    const { cache, reopen } = await fixture(t);
    const initialJob = job();
    initialJob.rawJsonl = 'original request JSONL';
    initialJob.items[0].images = [{ base64ImageData: 'input-image', mimeType: 'image/png' }];
    const storage = new Map([['gemini_batch_jobs_v1', JSON.stringify([initialJob])]]);
    const first = managerHarness(cache, storage, node(true), results);
    await first.render().fetchBatchJobResults('job');
    assert.deepEqual(first.counts(), { network: 1, downloads: 1, inserted: 2 });
    const metadata = JSON.parse(storage.get('gemini_batch_jobs_v1'))[0];
    assert.equal(metadata.resultsCached, true);
    assert.equal(metadata.items[0].resultUrl, undefined);
    assert.equal(metadata.items[0].images, undefined);
    assert.equal(metadata.rawJsonl, undefined);
    const restarted = managerHarness(reopen(), storage, node(true), []);
    await restarted.render().fetchBatchJobResults('job', { forceRestore: true });
    assert.deepEqual(restarted.counts(), { network: 0, downloads: 0, inserted: 2 });
    assert.equal(restarted.render().batchJobs[0].items[1].error, 'failed generation');
    assert.equal(restarted.render().getBatchJobJsonl('job'), 'original request JSONL');
    assert.equal(restarted.render().batchJobs[0].items[0].images[0].base64ImageData, 'input-image');
});

test('download-only results persist and later manual insertion saves only the destination node', async t => {
    const { cache, reopen } = await fixture(t);
    const storage = new Map([['gemini_batch_jobs_v1', JSON.stringify([job()])]]);
    const first = managerHarness(cache, storage, node(false), results);
    await first.render().fetchBatchJobResults('job');
    assert.equal(first.counts().downloads, 0);
    const restarted = managerHarness(reopen(), storage, node(false), []);
    await restarted.render().fetchBatchJobResults('job', { forceRestore: true });
    assert.deepEqual(restarted.counts(), { network: 0, downloads: 1, inserted: 2 });
});

test('an archive containing only failed items also loads offline', async t => {
    const { cache, reopen } = await fixture(t);
    const failed = job();
    failed.items = failed.items.map(item => ({ ...item, status: 'failed', error: 'failed generation' }));
    await cache.put('results:batches/job', { items: failed.items });
    const storage = new Map([['gemini_batch_jobs_v1', JSON.stringify([{ ...failed, resultsCached: true }])]]);
    const restarted = managerHarness(reopen(), storage, node(true), []);
    await restarted.render().fetchBatchJobResults('job');
    assert.equal(restarted.counts().network, 0);
    assert.equal(restarted.render().batchJobs[0].state, 'FAILED');
});

test('OpenAI status checks do not download output files; cached raw output is usable offline', async t => {
    const { cache } = await fixture(t);
    const storedBatch = { id: 'openai_batch_test', nativeBatchId: 'batch_native', state: 'RUNNING', items: [{ id: 'good', prompt: 'p', status: 'queued' }] };
    const storage = new Map([['openai_batch_store_v1', JSON.stringify([storedBatch])], ['settings_openai_api_key', 'mock-test-key']]);
    let calls = 0;
    const service = loadTS('services/openaiService.ts', {
        './batchResultsCache': archiveModule(cache), '../utils/pngMetadata': {}, '../utils/imageUtils': {}, '../utils/deviceId': {}
    }, { process: { env: {} }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, fetch: async url => {
        calls++; assert.ok(url.includes('/batches/')); return { ok: true, json: async () => ({ status: 'completed', output_file_id: 'file_output' }) };
    } });
    const status = await service.getOpenAiBatchJobStatus('openai_batch_test', { downloadResults: false });
    assert.equal(status.state, 'JOB_STATE_SUCCEEDED');
    assert.equal(calls, 1);
    await cache.put('openai-output:openai_batch_test', { text: JSON.stringify({ custom_id: 'request__good', response: { body: { data: [{ b64_json: 'aW1hZ2U=' }] } } }) });
    storage.delete('settings_openai_api_key');
    const offline = await service.getOpenAiBatchJobStatus('openai_batch_test');
    assert.equal(calls, 1);
    assert.equal(offline.batch.items[0].resultUrl, image);
    assert.equal(JSON.parse(storage.get('openai_batch_store_v1'))[0].items[0].resultUrl, undefined);
});
