const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Keep hook state and dependency semantics while replacing browser image decoding.
function harness() {
    const slots = [];
    let cursor = 0;
    let dirty = false;
    let effects = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const react = {
        useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
        useState(initial) {
            const i = cursor++;
            if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
            const slot = slots[i];
            slot.set ||= value => {
                const next = typeof value === 'function' ? value(slot.value) : value;
                if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; }
            };
            return [slot.value, slot.set];
        },
        useMemo(fn, deps) {
            const i = cursor++;
            if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps };
            return slots[i].value;
        },
        useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
        useEffect(fn, deps) {
            const i = cursor++;
            if (!slots[i] || !same(slots[i].deps, deps)) {
                const previous = slots[i];
                slots[i] = { deps };
                effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
            }
        },
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } })
    };
    return { react: { ...react, default: react }, render(fn) {
        let result;
        for (let attempt = 0; attempt < 20; attempt++) {
            cursor = 0; dirty = false; effects = [];
            result = fn();
            effects.forEach(fn => fn());
            if (!dirty) return result;
        }
        throw new Error('Render did not settle');
    } };
}

function modules(react, mocks = {}, globals = {}) {
    const cache = new Map();
    function load(file) {
        file = path.resolve(__dirname, '..', file);
        if (cache.has(file)) return cache.get(file);
        const exports = {};
        cache.set(file, exports);
        const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
        }).outputText;
        vm.runInNewContext(code, { exports, console, setTimeout, clearTimeout, ...globals, require(name) {
            if (name === 'react') return react;
            if (name in mocks) return mocks[name];
            if (!name.startsWith('.')) throw new Error('Unexpected dependency: ' + name);
            let target = path.resolve(path.dirname(file), name);
            const key = path.relative(path.resolve(__dirname, '..'), target).replaceAll('\\', '/');
            if (key in mocks) return mocks[key];
            if (key.startsWith('components/') && !key.includes('/hooks') && !key.endsWith('ImageInputNode')) {
                const component = path.basename(target);
                return { default: component, [component]: component };
            }
            target = [target + '.ts', target + '.tsx', path.join(target, 'index.ts')].find(fs.existsSync);
            if (!target) throw new Error('Unresolved import: ' + name);
            return load(target);
        } }, { filename: file });
        return exports;
    }
    return load;
}

function find(tree, type) {
    if (!tree || typeof tree !== 'object') return;
    if (tree.type === type) return tree.props;
    for (const child of tree.props?.children?.flat(Infinity) || []) {
        const match = find(child, type);
        if (match) return match;
    }
}

function imageInput(value) {
    const runner = harness();
    const writes = [];
    const upstreamCalls = [];
    const images = new Map([[0, 'original']]);
    const load = modules(runner.react, {
        jszip: {},
        types: { NodeType: new Proxy({}, { get: (_, name) => name }) },
        'contexts/AppContext': { useAppContext: () => ({}) },
        'utils/pngMetadata': { readPromptFromPNG: async () => null },
        'services/imageActions': {},
        'utils/imageUtils': {
            generateThumbnail: async src => 'thumb:' + src,
            cropImageNormalized: async src => 'crop:' + src,
            sliceImageGrid: async () => ({ slices: [], thumbs: [] }),
            getEffectiveDividers: count => Array.from({ length: count + 1 }, (_, i) => i / count),
            getIntervalsFromDividers: divs => divs.slice(0, -1).map((start, i) => ({ start, end: divs[i + 1] })),
            getImageTimestampString: () => 'timestamp'
        }
    }, { window: { addEventListener() {}, removeEventListener() {} }, Image: class {
        naturalWidth = 1600;
        naturalHeight = 900;
        set src(value) { this.onload?.(); }
    } });
    const { ImageInputNode } = load('components/nodes/ImageInputNode.tsx');
    const props = {
        node: { id: 'input', value: JSON.stringify({ image: 'old-thumb', ...value }), position: { x: 0, y: 0 }, width: 400 },
        onValueChange: (_, json) => writes.push(JSON.parse(json)),
        getFullSizeImage: (_, index) => images.get(index),
        setFullSizeImage: (_, index, image) => images.set(index, image),
        getUpstreamNodeValues: (...args) => { upstreamCalls.push(args); return []; },
        t: key => key
    };
    return { writes, images, upstreamCalls, tree: runner.render(() => ImageInputNode(props)) };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const frame = { id: 'frame', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } };

test('Image Input aspect presets use original dimensions and filter the image input port', async () => {
    const input = imageInput({ mode: 'single', croppedImage: 'crop-thumb' });
    assert.equal(input.upstreamCalls[0][1], 'image');
    assert.equal(input.upstreamCalls[0][3], false);
    find(input.tree, 'CropPresetsBar').onApplyAspectCrop('1:1');
    await flush();
    const crop = input.writes.at(-1).cropRect;
    assert.ok(Math.abs(crop.width * 1600 - crop.height * 900) < 0.001);
});

test('Image Input frame dimensions stay in pixels and edited images update master and slice previews', async () => {
    const input = imageInput({ mode: 'frames', framesConfig: { frames: [frame], selectedFrameIndex: 0 }, frameImages: ['old-frame'] });
    const toolbar = find(input.tree, 'FramesToolbar');
    assert.equal(toolbar.originalDimensions.width, 1600);
    toolbar.onUpdateSelectedFrameDimensions(800, 450);
    await flush();
    const rect = input.writes.at(-1).framesConfig.frames[0].rect;
    assert.equal(rect.width, 0.5);
    assert.equal(rect.height, 0.5);
    await find(input.tree, 'ImageEditorModal').onApply('edited-original');
    assert.equal(input.images.get(0), 'edited-original');
    assert.equal(input.images.get(1), 'crop:edited-original');
    assert.equal(input.writes.at(-1).image, 'thumb:edited-original');
    assert.equal(input.writes.at(-1).frameImages[0], 'thumb:crop:edited-original');
});

test('applying an individual batch grid to all files preserves global row and column counts', () => {
    const bounds = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    const input = imageInput({ mode: 'batch', grid: { cols: 4, rows: 3, bounds }, batchConfig: { subMode: 'grid', individualGridSettings: true },
        batchFiles: [{ id: 'a', dataUrl: 'original', gridConfig: { cols: 1, rows: 1, bounds } }, { id: 'b', dataUrl: 'other' }] });
    find(input.tree, 'BatchProcessingPanel').onApplyCurrentGridToAll();
    assert.equal(input.writes.at(-1).grid.cols, 4);
    assert.equal(input.writes.at(-1).grid.rows, 3);
    assert.ok(input.writes.at(-1).batchFiles.every(item => item.gridConfig.cols === 4 && item.gridConfig.rows === 3));
});

test('retained media action callbacks read the latest nodes and canvas scale', () => {
    const runner = harness();
    const writes = [];
    let latestTranslate;
    const load = modules(runner.react, { types: {}, 'utils/pngMetadata': {}, 'utils/nodeUtils': {} }, { window: { innerWidth: 1000, innerHeight: 800 } });
    const { useMediaAndImageActions } = load('contexts/app-context/useMediaAndImageActions.ts');
    const props = { nodes: [], viewTransform: { scale: 1 }, setSelectedNodeIds() {},
        setViewTransform: updater => { latestTranslate = updater({ scale: 2 }).translate; },
        handleValueChange: (_, value) => writes.push(JSON.parse(value)),
        getUpstreamNodeValues: (_, __, nodes) => [nodes[0].title]
    };
    const callbacks = runner.render(() => useMediaAndImageActions(props));
    props.nodes = [{ id: 'new', title: 'Latest text', position: { x: 100, y: 20 }, width: 200, value: '{}' }];
    props.viewTransform = { scale: 2 };
    runner.render(() => useMediaAndImageActions(props));
    callbacks.onReadData('new');
    assert.equal(writes.at(-1).text, 'Latest text');
    callbacks.handleNavigateToNodeFrame('new', 5);
    assert.equal(writes.at(-1).selectedFrameNumber, 5);
    assert.equal(latestTranslate.x, 100);
    assert.equal(latestTranslate.y, -240);
});

test('extracted session hook restores tabs, saves current originals and retains inactive canvases', async () => {
    const runner = harness();
    const writes = [];
    const timers = [];
    const autosaves = [];
    const load = modules(runner.react, {
        hooks: { saveSessionToDB: async (...args) => writes.push(args) },
        'hooks/useTabs': { normalizeTabs: (tabs, activeTabId) => ({ tabs, activeTabId }) },
        'services/sessionAutosave': { startSessionAutosave: (interval, ready, save) => { autosaves.push({ interval, ready, save }); return () => {}; } },
        'utils/imageMemoryCache': {},
        'services/soundNotificationService': { playAutosaveSound() {} },
        'utils/canvasScreenshot': { generateCanvasScreenshot: () => 'preview' }
    }, { window: { location: { search: '' } }, URLSearchParams, setTimeout: fn => timers.push(fn) });
    const { useSessionSyncAndAutosave } = load('contexts/app-context/useSessionSyncAndAutosave.ts');
    const canvas = id => ({ nodes: [{ id }], connections: [], groups: [], viewTransform: { scale: 1, translate: { x: 0, y: 0 } },
        nodeIdCounter: 1, fullSizeImageCache: { [id]: { 0: 'original:' + id } } });
    const initial = canvas('a');
    const inactive = canvas('b');
    const props = { tabs: [{ id: 'a', state: initial }, { id: 'b', state: inactive }], activeTabId: 'a', isTabsLoaded: true,
        nodes: [], connections: [], groups: [], viewTransform: initial.viewTransform, nodeIdCounter: { current: 0 }, fullSizeImageCache: {},
        autoSaveInterval: 30, setNextAutoSaveTime() {}, setIsAutoSaving() {}, addToast() {}, t: key => key
    };
    for (const [setter, field] of Object.entries({ setTabs: 'tabs', setActiveTabId: 'activeTabId', setNodes: 'nodes',
        setConnections: 'connections', setGroups: 'groups', setViewTransform: 'viewTransform', setFullSizeImageCache: 'fullSizeImageCache' })) {
        props[setter] = next => { props[field] = typeof next === 'function' ? next(props[field]) : next; };
    }
    let actions = runner.render(() => useSessionSyncAndAutosave(props));
    assert.equal(props.nodes[0].id, 'a');
    assert.equal(writes.length, 0, 'restoration must not replay a save');
    assert.equal(autosaves[0].interval, 30000);
    assert.equal(autosaves[0].ready(), false);
    timers.splice(0).forEach(fn => fn());
    props.nodes = [{ id: 'a', title: 'edited' }];
    props.fullSizeImageCache = { a: { 0: 'latest-original' } };
    actions = runner.render(() => useSessionSyncAndAutosave(props));
    await actions.forceSaveSession();
    assert.equal(writes.at(-1)[0][0].state.nodes[0].title, 'edited');
    assert.equal(writes.at(-1)[0][0].state.fullSizeImageCache.a[0], 'latest-original');
    assert.equal(writes.at(-1)[0][1].state, inactive);
    actions.handleSwitchTab('b');
    assert.equal(props.activeTabId, 'b');
    assert.equal(props.nodes[0].id, 'b');
    assert.equal(props.fullSizeImageCache.b[0], 'original:b');
    assert.equal(props.tabs[0].state.fullSizeImageCache.a[0], 'latest-original');
});
