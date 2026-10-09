const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { loadTypeScript } = require('./helpers/load-typescript.cjs');
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(check) { for (let i = 0; i < 100 && !check(); i++) await pause(); assert.ok(check()); }
const react = { memo: fn => fn };

test('screen margin retains images beyond border with hysteresis at any zoom', () => {
    const api = loadTypeScript('utils/imageVisibility.ts');
    const rect = { left: -650, right: -620, top: 10, bottom: 30 };
    assert.equal(api.isImageNearViewport(rect, 1200, 800, true), true);
    assert.equal(api.isImageNearViewport(rect, 1200, 800, false), false);
    assert.equal(api.isImageNearViewport({ ...rect, right: -950 }, 1200, 800, true), false);
    assert.equal(api.isImageNearViewport({ left: 20, right: 20, top: 20, bottom: 20 }, 1200, 800, false), true, 'zero intrinsic img size cannot block initial load');
});

function cacheFixture(generateThumbnail) {
    return loadTypeScript('components/nodes/image-editor/OptimizedThumbnail.tsx', {
        react: { ...react, default: react }, '../../../utils/imageUtils': { generateThumbnail }, '../../../hooks/useImageVisibility': {}
    }, { crypto: webcrypto });
}

test('tiny encoded source is still resized; same source shares one in-flight decode', async () => {
    const calls = []; const results = []; let resolve;
    const api = cacheFixture((...args) => { calls.push(args); return new Promise(done => { resolve = done; }); });
    const source = 'data:image/png;base64,dGlueS1jb21wcmVzc2VkLWJ1dC1oaWdoLXJlc29sdXRpb24=';
    const first = api.createCachedThumbnail(source, 256, url => results.push(url));
    const second = api.createCachedThumbnail(source, 256, url => results.push(url));
    await until(() => calls.length === 1); await pause();
    assert.equal(calls[0][1], 256); assert.equal(calls[0][2], 256);
    resolve('256px-preview'); await until(() => results.length === 2);
    assert.deepEqual(results, ['256px-preview', '256px-preview']);
    first(); second();
});

test('shared decode cancels when last consumer leaves and never publishes original after abort', async () => {
    let reject, signal; const results = []; let errors = 0;
    const api = cacheFixture((src, width, height, abortSignal) => { signal = abortSignal; return new Promise((done, fail) => { reject = fail; }); });
    const source = 'data:image/png;base64,c2hhcmVk';
    const first = api.createCachedThumbnail(source, 256, url => results.push(url), () => errors++);
    const second = api.createCachedThumbnail(source, 256, url => results.push(url), () => errors++);
    await until(() => signal); await pause(); first();
    assert.equal(signal.aborted, false); second(); assert.equal(signal.aborted, true);
    reject(new DOMException('cancelled', 'AbortError')); await pause();
    assert.equal(results.length, 0); assert.equal(errors, 0);
});

test('full content digest distinguishes sources differing outside old sampled key positions', async () => {
    let count = 0; const results = [];
    const api = cacheFixture(async () => `preview-${++count}`);
    const source = 'data:image/png;base64,' + 'A'.repeat(6000);
    const changed = source.slice(0, 1001) + 'B' + source.slice(1002);
    api.createCachedThumbnail(source, 256, url => results.push(url));
    api.createCachedThumbnail(changed, 256, url => results.push(url));
    await until(() => results.length === 2);
    assert.equal(count, 2); assert.notEqual(results[0], results[1]);
});

test('invalid preview reports failure rather than placing original in DOM', async () => {
    const results = []; let errors = 0;
    const api = cacheFixture(async () => { throw new Error('invalid image'); });
    api.createCachedThumbnail('data:image/png;base64,invalid', 256, url => results.push(url), () => errors++);
    await until(() => errors === 1); assert.equal(results.length, 0);
});

test('visibility observes container geometry, shares one timer and cleans up all listeners', () => {
    const effects = [], states = [], listeners = new Set(); let timers = 0, cleared = 0;
    const box = { left: 10, right: 100, top: 10, bottom: 100 };
    const mockedReact = { useRef: () => ({ current: { parentElement: { getBoundingClientRect: () => box }, getBoundingClientRect() { throw new Error('empty image intrinsic geometry must not be used'); } } }),
        useState: () => [false, value => states.push(value)], useLayoutEffect: effect => effects.push(effect) };
    const api = loadTypeScript('hooks/useImageVisibility.ts', { react: mockedReact }, {
        window: { innerWidth: 1200, innerHeight: 800, addEventListener: name => listeners.add(name), removeEventListener: name => listeners.delete(name) },
        setInterval: check => { timers++; api.check = check; return 1; }, clearInterval: () => cleared++
    });
    api.useImageVisibility(); api.useImageVisibility();
    const cleanups = effects.map(effect => effect());
    assert.equal(timers, 1); assert.deepEqual(states, [true, true]);
    box.right = -650; box.left = -700; api.check(); assert.equal(states.length, 2);
    box.right = -1000; box.left = -1050; api.check(); assert.deepEqual(states.slice(-2), [false, false]);
    cleanups.forEach(cleanup => cleanup()); assert.equal(cleared, 1); assert.equal(listeners.size, 0);
});

test('broken preferred thumbnail regenerates from original at 256px without displaying original URL', async () => {
    let cursor = 0; const slots = [], effects = [], calls = [];
    const mockedReact = { memo: fn => fn, createElement: (type, props) => ({ type, props }),
        useState: initial => { const index = cursor++; slots[index] ??= { value: initial }; return [slots[index].value, value => { slots[index].value = value; }]; },
        useEffect: (effect, deps) => { const index = cursor++; const old = slots[index];
            if (!old || deps.some((dep, i) => dep !== old.deps[i])) { old?.cleanup?.(); slots[index] = { deps }; effects.push(() => { slots[index].cleanup = effect(); }); }
        } };
    const source = 'data:image/png;base64,broken', original = 'data:image/png;base64,original';
    const api = loadTypeScript('components/nodes/image-editor/OptimizedThumbnail.tsx', {
        react: { ...mockedReact, default: mockedReact },
        '../../../hooks/useImageVisibility': { useImageVisibility: () => ({ ref: {}, visible: true }) },
        '../../../utils/imageUtils': { generateThumbnail: async (src, width, height) => {
            calls.push({ src, width, height }); if (src === source) throw new Error('bad preview'); return 'data:image/webp;base64,new-preview';
        } }
    }, { crypto: webcrypto });
    const render = () => { cursor = 0; const tree = api.OptimizedThumbnail({ src: source, fallbackSrc: original, size: 256 }); effects.splice(0).forEach(effect => effect()); return tree; };
    assert.equal(render().props.src, undefined);
    await until(() => slots[0].value !== null); assert.equal(render().props.src, undefined);
    await until(() => slots[1].value !== null);
    assert.equal(render().props.src, 'data:image/webp;base64,new-preview');
    assert.deepEqual(calls.map(call => call.src), [source, original]);
    assert.ok(calls.every(call => call.width === 256 && call.height === 256));
    for (const slot of slots) slot.cleanup?.();
});

test('Image Input creates a 512px UI preview from original in every mode and drag still uses original', () => {
    const Thumbnail = () => {}; let dragged;
    const jsx = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useRef: () => ({ current: null }), useState: initial => [initial, () => {}], useLayoutEffect() {} };
    const { ImageCanvasContainer } = loadTypeScript('components/nodes/image-input/ImageCanvasContainer.tsx', {
        react: { ...jsx, default: jsx }, '../image-editor/OptimizedThumbnail': { OptimizedThumbnail: Thumbnail },
        '../../../types': { NodeType: {} }, '../../ActionButton': { ActionButton: () => {} }, '../../Tooltip': { Tooltip: () => {} }, '../../icons/AppIcons': { CopyIcon: () => {} },
        '../../../utils/imageUtils': { setupImageDragData: (event, source) => { dragged = source; } },
        './ImageCropOverlay': { ImageCropOverlay: () => {} }, './ImageGridOverlay': { ImageGridOverlay: () => {} }, './ImageFramesOverlay': { ImageFramesOverlay: () => {} }
    });
    const find = tree => { if (!tree || typeof tree !== 'object') return; if (tree.type === Thumbnail) return tree;
        for (const child of (tree.props?.children || []).flat(Infinity)) { const found = find(child); if (found) return found; }
    };
    for (const mode of ['full', 'single', 'grid', 'frames', 'batch']) {
        const tree = ImageCanvasContainer({ nodeId: 'input', image: 'stored-preview', mode, batchSubMode: 'crop', batchFiles: [],
            getFullSizeImage: () => 'exact-original', extractedImages: [], frameImages: [], showControls: false, t: key => key });
        const thumbnail = find(tree); assert.ok(thumbnail, mode);
        assert.equal(thumbnail.props.src, 'exact-original'); assert.equal(thumbnail.props.fallbackSrc, 'stored-preview'); assert.equal(thumbnail.props.size, 512);
        thumbnail.props.onDragStart({ stopPropagation() {} }); assert.equal(dragged, 'exact-original');
    }
});

test('image surface fits window in both directions, upscales preview and preserves crop coordinate aspect', () => {
    const { containedImageSize } = loadTypeScript('utils/containedImageSize.ts');
    const size = (w, h, image) => JSON.parse(JSON.stringify(containedImageSize(w, h, image)));
    assert.deepEqual(size(800, 600, { width: 1024, height: 512 }), { width: 800, height: 400 });
    assert.deepEqual(size(800, 600, { width: 512, height: 1024 }), { width: 300, height: 600 });
    assert.deepEqual(size(800, 600, { width: 512, height: 512 }), { width: 600, height: 600 });
    assert.deepEqual(size(200, 100, { width: 4000, height: 2000 }), { width: 200, height: 100 });
    assert.equal(size(0, 100, { width: 1, height: 1 }), null);
});
