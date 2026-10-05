const test = require('node:test');
const assert = require('node:assert/strict');
const { File } = require('node:buffer');
const { loadTypeScript } = require('./helpers/load-typescript.cjs');
const NodeType = new Proxy({}, { get: (_, name) => name });
const original = 'data:image/png;base64,' + Buffer.from('original bytes at full resolution').toString('base64');
const thumbnail = 'data:image/jpeg;base64,' + Buffer.from('small preview').toString('base64');
function load(file, mocks, globals = {}) {
    return loadTypeScript(file, mocks, { File, ...globals });
}
function reactHarness() {
    let cursor = 0; const refs = [];
    const react = { useRef: initial => refs[cursor++] ||= { current: initial }, useMemo: fn => fn(), useCallback: fn => fn,
        useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {}, memo: x => x,
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
    return { react: { ...react, default: react }, reset: () => { cursor = 0; } };
}
function derived(nodes, connections, images) {
    const harness = reactHarness();
    const { useDerivedMemo } = load('hooks/useDerivedMemo.ts', {
        react: harness.react, '../types': { NodeType }, '../utils/nodeUtils': { RATIO_INDICES: { '1:1': 1 }, getOutputHandleType: () => 'image' }
    });
    const render = (nextNodes = nodes, nextConnections = connections, getter = (id, frame) => images[id]?.[frame]) => {
        harness.reset(); return useDerivedMemo({ nodes: nextNodes, connections: nextConnections, selectedNodeIds: [], getFullSizeImage: getter });
    };
    return { render };
}
const node = (type, value, id = 'source') => ({ id, type, value: typeof value === 'string' ? value : JSON.stringify(value), position: { x: 0, y: 0 }, width: 400, height: 300 });
const connection = (fromNodeId = 'source', toNodeId = 'target', fromHandleId = 'image') => ({ id: fromNodeId + toNodeId, fromNodeId, toNodeId, fromHandleId, toHandleId: 'image' });
function dataUrl(value) { return typeof value === 'string' ? value : `data:${value.mimeType};base64,${value.base64ImageData}`; }

for (const [type, value, cache] of [
    ['IMAGE_INPUT', { image: thumbnail, mode: 'full' }, { 0: original }],
    ['IMAGE_INPUT', { image: thumbnail, mode: 'single', croppedImage: thumbnail, cropRect: {} }, { 0: 'master', 1: original }],
    ['IMAGE_INPUT', { mode: 'grid', grid: { cols: 2, rows: 1, selectedCells: [1] }, extractedImages: [thumbnail, thumbnail] }, { 2: original }],
    ['IMAGE_INPUT', { mode: 'frames', framesConfig: { frames: [{}] }, frameImages: [thumbnail] }, { 1: original }],
    ['IMAGE_EDITOR', { outputImage: thumbnail }, { 0: original }],
    ['IMAGE_EDITOR', { isSequenceMode: true, sequenceOutputs: [{ thumbnail, status: 'done' }], checkedSequenceOutputIndices: [0] }, { 1000: original }],
    ['NOTE', { activeTab: 'reference', references: [{ image: thumbnail }] }, { 0: original }],
    ['IMAGE_OUTPUT', thumbnail, { 0: original }],
    ['IMAGE_ANALYZER', { image: thumbnail }, { 0: original }],
]) test(`${type} ${value.mode || ''} sends original through connections and reserves thumbnail for UI`, () => {
    const hook = derived([node(type, value)], [connection()], { source: cache }).render();
    assert.equal(dataUrl(hook.getUpstreamNodeValues('target')[0]), original);
    assert.equal(dataUrl(hook.getUpstreamNodeValues('target', 'image', undefined, true)[0]), thumbnail);
});

test('OpenAI edit upload retains exact input bytes and MIME without thumbnail conversion', async () => {
    let upload;
    const { generateOpenAiImage } = load('services/openaiService.ts', {
        './batchResultsCache': {}, '../utils/pngMetadata': { addMetadataToPNG: url => url },
        '../utils/imageUtils': { convertToPNG: async url => url }, '../utils/deviceId': {}
    }, { Blob, FormData, ArrayBuffer,
        localStorage: { getItem: () => 'synthetic-test-key' },
        fetch: async (url, request) => { upload = request.body; return { ok: true, json: async () => ({ data: [{ b64_json: 'generated' }] }) }; }
    });
    const bytes = Buffer.from('unchanged JPEG input bytes');
    await generateOpenAiImage('Edit image', { model: 'gpt-image', images: [{ mimeType: 'image/jpeg', base64ImageData: bytes.toString('base64') }] });
    const uploaded = upload.get('image');
    assert.equal(uploaded.type, 'image/jpeg');
    assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), bytes);
});

test('Tripo 3D upload preserves image bytes exactly', async () => {
    let upload;
    const { uploadTripoFile } = load('services/tripoService.ts', { react: {} }, {
        Blob, FormData, Headers, AbortController, DOMException, setTimeout, clearTimeout,
        localStorage: { getItem: () => 'synthetic-test-key' },
        fetch: async (url, request) => { upload = request.body; return { ok: true, status: 200, text: async () => JSON.stringify({ code: 0, data: { file_token: 'uploaded-original' } }) }; }
    });
    const bytes = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('unchanged full resolution bytes')]);
    assert.equal(await uploadTripoFile('data:image/png;base64,' + bytes.toString('base64'), 'Original.png'), 'uploaded-original');
    assert.deepEqual(Buffer.from(await upload.get('file').arrayBuffer()), bytes);
});

test('batch Image Input sends each file original, regardless of selected master and slice cache slots', () => {
    const second = original + 'second';
    const value = { mode: 'full', batchFiles: [{ dataUrl: original, thumbnailUrl: thumbnail }, { dataUrl: second, thumbnailUrl: thumbnail }] };
    const hook = derived([node('IMAGE_INPUT', value)], [connection()], { source: { 0: second, 1: 'slice' } }).render();
    assert.deepEqual(Array.from(hook.getUpstreamNodeValues('target'), dataUrl), [original, second]);
});

test('replacing only full-resolution cache invalidates chain and analyzer sources even with unchanged thumbnail', () => {
    const nodes = [node('IMAGE_INPUT', { image: thumbnail }), node('IMAGE_ANALYZER', {}, 'target')];
    const edges = [connection()]; const state = derived(nodes, edges, {});
    const first = state.render(nodes, edges, () => original);
    assert.equal(dataUrl(first.getUpstreamNodeValues('target')[0]), original);
    assert.equal(first.connectedImageSources.get('target')[0], original);
    const updated = original + 'replacement';
    const second = state.render(nodes, edges, () => updated);
    assert.equal(dataUrl(second.getUpstreamNodeValues('target')[0]), updated);
    assert.equal(second.connectedImageSources.get('target')[0], updated);
});

test('reroute preserves originals and updates when a remote upstream source changes', () => {
    const edges = [connection('source', 'reroute'), connection('reroute', 'target')];
    const reroute = node('REROUTE_DOT', '{}', 'reroute');
    const getter = () => undefined;
    const nodes = [node('BATCH_PREPARE', { activeViews: { front: original }, mutedViews: {} }), reroute];
    edges[0].fromHandleId = 'front';
    const state = derived(nodes, edges, {});
    assert.equal(dataUrl(state.render(nodes, edges, getter).getUpstreamNodeValues('target')[0]), original);
    const changed = [node('BATCH_PREPARE', { activeViews: { front: original + 'new' }, mutedViews: {} }), reroute];
    assert.equal(dataUrl(state.render(changed, edges, getter).getUpstreamNodeValues('target')[0]), original + 'new');
});

test('3D multiview ports retain original bytes, order and muted slots', () => {
    const views = { front: original, back: original + 'back', left: original + 'left', right: original + 'right' };
    const source = node('BATCH_PREPARE', { activeViews: views, mutedViews: { left: true } });
    const hook = derived([source], [connection('source', 'target', undefined)], {}).render();
    const values = hook.getUpstreamNodeValues('target');
    assert.equal(dataUrl(values[0]), original); assert.equal(dataUrl(values[1]), views.back);
    assert.equal(values[2], null); assert.equal(dataUrl(values[3]), views.right);
});

test('connected AI Editor input drag uses original for all formats and file bytes while rendering a preview', async () => {
    const harness = reactHarness();
    const utils = load('utils/imageUtils.ts', {});
    const OptimizedThumbnail = () => {};
    const { ImageInputList } = load('components/nodes/image-editor/ImageInputList.tsx', {
        react: harness.react, '../../ActionButton': { ActionButton: () => {} }, 'lucide-react': { StickyNote: () => {} },
        '../../../utils/imageUtils': utils, './OptimizedThumbnail': { OptimizedThumbnail }
    });
    const tree = ImageInputList({ slots: [{ type: 'connected', index: 0, src: thumbnail, getOriginal: () => original }], checkedIndices: [0], getFullSizeImage: () => undefined, t: key => key });
    function find(value) {
        if (!value || typeof value !== 'object') return;
        if (value.type === OptimizedThumbnail) return value;
        for (const child of value.props?.children?.flat(Infinity) || []) { const result = find(child); if (result) return result; }
    }
    const element = find(tree); assert.ok(element); assert.equal(element.props.src, thumbnail);
    const formats = {}; const files = [];
    element.props.onDragStart({ stopPropagation() {}, dataTransfer: { setData: (k, v) => { formats[k] = v; }, items: { add: file => files.push(file) } } });
    assert.equal(formats['application/prompt-modifier-drag-image'], original);
    assert.equal(formats['text/uri-list'], original);
    assert.ok(formats['text/html'].includes(original));
    assert.equal(Buffer.from(await files[0].arrayBuffer()).toString(), 'original bytes at full resolution');
});

test('node duplication preserves sequence frames, B inputs and references past index 100', () => {
    const harness = reactHarness(); const copied = {};
    const { useNodes } = load('hooks/useNodes.ts', { react: harness.react, '../types': { NodeType }, '../utils/pngMetadata': {},
        '../utils/nodeUtils': {}, '../utils/imageUtils': {} });
    const cache = { source: { 0: original, 150: original + 'ref', 1000: original + 'frame', 2001: original + 'B' } };
    const hook = useNodes([node('IMAGE_EDITOR', {})], 0, () => {}, key => key,
        (id, slot, image) => { (copied[id] ||= {})[slot] = image; }, (id, slot) => cache[id]?.[slot], cache);
    const id = hook.handleDuplicateNodeWithContent('source');
    assert.deepEqual(copied[id], cache.source);
});

test('chain callbacks held before generation read new originals synchronously before the next React render', () => {
    const harness = reactHarness();
    const { useFullSizeImageCache } = load('hooks/useFullSizeImageCache.ts', { react: harness.react });
    const cache = useFullSizeImageCache();
    const oldGetter = cache.getFullSizeImage;
    cache.setFullSizeImage('source', 0, original);
    assert.equal(oldGetter('source', 0), original);
    cache.setFullSizeImage('source', 1000, original + 'frame');
    assert.equal(oldGetter('source', 1000), original + 'frame');
    cache.setFullSizeImageCache({ source: { 0: original + 'restored' } });
    assert.equal(oldGetter('source', 0), original + 'restored');
    assert.equal(oldGetter('source', 1000), undefined);
});

test('real chain processor receives originals generated in the preceding step', async () => {
    const nodes = [node('IMAGE_EDITOR', { inputImages: [thumbnail], prompt: 'first' }), node('IMAGE_EDITOR', { inputImages: [], prompt: 'second' }, 'target')];
    const edges = [connection()];
    const graph = derived(nodes, edges, {}).render();
    const harness = reactHarness(); const received = [];
    const generated = original + 'generated';
    const { useGeminiChainExecution } = load('hooks/useGeminiChainExecution.ts', {
        react: harness.react, '../types': { NodeType }, '../utils/pngMetadata': {},
        '../services/processors': { getProcessor: () => undefined,
            processImageEditor: async (node, text, upstream, local, localB, upstreamB, save) => {
                received.push({ upstream, local }); save(0, generated);
                return { value: { ...JSON.parse(node.value), outputImage: thumbnail } };
            }
        }
    }, { AbortController });
    const hook = useGeminiChainExecution({ nodes, connections: edges, activeTabId: 'tab', activeTabName: 'Canvas', fullSizeImageCache: { source: { 1: original } },
        getUpstreamNodeValues: graph.getUpstreamNodeValues, getFullSizeImage: () => thumbnail,
        setFullSizeImage() {}, setNodes() {}, setTabs() {}, t: key => key, registerOperation() {}, unregisterOperation() {}, setError: error => assert.fail(error) });
    await hook.handleProcessChainForward('source');
    assert.equal(received.length, 2);
    assert.equal(dataUrl(received[0].local[0]), original);
    assert.equal(dataUrl(received[1].upstream[0]), generated);
});

test('copying/duplicating a group and undoing node deletion retain every original cache slot', async () => {
    const harness = reactHarness(); const transferred = {}; let clipboard;
    const images = { 0: original, 101: original + 'ref', 1000: original + 'sequence', 2001: original + 'B' };
    const { useEntityActions } = load('hooks/useEntityActions.ts', {
        react: harness.react, '../types': { NodeType }, '../utils/nodeUtils': {}, '../utils/imageUtils': {}
    }, { navigator: { clipboard: { writeText: async text => { clipboard = JSON.parse(text); } } }, setTimeout: () => 1, clearTimeout() {} });
    const hook = useEntityActions({ nodes: [node('IMAGE_EDITOR', {})], connections: [], groups: [{ id: 'group', nodeIds: ['source'], position: { x: 0, y: 0 } }],
        nodeIdCounter: { current: 0 }, fullSizeImageCache: { source: images },
        getFullSizeImage: (id, slot) => images[slot], setFullSizeImage: (id, slot, image) => { (transferred[id] ||= {})[slot] = image; },
        setNodes() {}, setConnections() {}, setGroups() {}, clearImagesForNodeFromCache() {}, t: key => key, addToast() {}, tabId: 'tab' });
    await hook.copyGroup('group'); assert.deepEqual(clipboard.fullSizeImages.source, images);
    hook.duplicateGroup('group'); assert.deepEqual(Object.values(transferred)[0], images);
    hook.deleteNodeAndConnections('source'); hook.restoreDeletedNode('source'); assert.deepEqual(transferred.source, images);
});

test('Note clipboard export embeds original reference images', async () => {
    const harness = reactHarness(); let clipboard;
    const { useNodes } = load('hooks/useNodes.ts', { react: harness.react, '../types': { NodeType }, '../utils/pngMetadata': {}, '../utils/nodeUtils': {}, '../utils/imageUtils': {} },
        { navigator: { clipboard: { writeText: async text => { clipboard = JSON.parse(text); } } } });
    const cache = { source: { 0: original } };
    const hook = useNodes([node('NOTE', { references: [{ image: thumbnail, caption: 'Reference' }] })], 0, () => {}, key => key, () => {}, (id, slot) => cache[id]?.[slot], cache);
    await hook.handleCopyNodeValue('source');
    assert.equal(clipboard.references[0].image, original);
});

test('AI Editor sequence input preview opens original in viewer and drags original while showing thumbnail', () => {
    const harness = reactHarness(); const OptimizedThumbnail = () => {}; let opened;
    const { OutputPanel } = load('components/nodes/image-editor/OutputPanel.tsx', {
        react: harness.react, '../../ActionButton': {}, 'lucide-react': {}, '../../CustomSelect': {},
        '../../../components/icons/AppIcons': {}, '../../Tooltip': {}, './EditorTooltip': {}, jszip: {},
        '../../CustomCheckbox': {}, '../../DebouncedTextarea': {}, '../../ConfirmDialog': {},
        '../../../utils/imageUtils': load('utils/imageUtils.ts', {}),
        '../../../contexts/AppContext': { useAppContext: () => ({ isBatchMode: false }) },
        '../../../services/modelConfig': { resolveImageEditorModel: value => value, isGptImage2Model: () => false, isOpenAiImageModel: () => false },
        './OptimizedThumbnail': { OptimizedThumbnail }
    });
    const tree = OutputPanel({ state: { isSequenceMode: true, sequenceOutputs: [], checkedSequenceOutputIndices: [0], checkedInputIndices: [0], model: 'gemini', prompt: 'test', framePrompts: {} },
        imageSlots: [{ type: 'connected', index: 0, src: thumbnail, getOriginal: () => original }], totalFrames: 1, modelOptions: [],
        getFullSizeImage: () => undefined, t: key => key, onSequenceOutputClick: (index, src) => { opened = src; } });
    function find(value) {
        if (!value || typeof value !== 'object') return;
        const children = value.props?.children?.flat(Infinity) || [];
        if (value.props?.onClick && children.some(child => child?.type === OptimizedThumbnail)) return value;
        for (const child of children) { const result = find(child); if (result) return result; }
    }
    const wrapper = find(tree); assert.ok(wrapper);
    wrapper.props.onClick({ stopPropagation() {} }); assert.equal(opened, original);
    const image = wrapper.props.children.flat(Infinity).find(child => child?.type === OptimizedThumbnail);
    assert.equal(image.props.src, thumbnail);
    const formats = {};
    image.props.onDragStart({ stopPropagation() {}, dataTransfer: { setData: (k, v) => { formats[k] = v; }, items: { add() {} } } });
    assert.equal(formats['application/prompt-modifier-drag-image'], original);
});
