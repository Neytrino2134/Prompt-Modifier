const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers/load-typescript.cjs');

function hooks() {
    let cursor = 0;
    let effects = [];
    const slots = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const react = {
        useRef(initial) { return slots[cursor++] ||= { current: initial }; },
        useState(initial) {
            const i = cursor++;
            const slot = slots[i] ||= { value: typeof initial === 'function' ? initial() : initial };
            slot.set ||= next => { slot.value = typeof next === 'function' ? next(slot.value) : next; };
            return [slot.value, slot.set];
        },
        useCallback(fn, deps) {
            const i = cursor++;
            if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn, deps };
            return slots[i].value;
        },
        useEffect(fn, deps) {
            const i = cursor++;
            if (!slots[i] || !same(slots[i].deps, deps)) {
                const previous = slots[i];
                slots[i] = { deps };
                effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
            }
        }
    };
    return { react, render(fn) {
        cursor = 0; effects = [];
        const result = fn();
        effects.forEach(fn => fn());
        return result;
    }, unmount() { slots.forEach(slot => slot.cleanup?.()); } };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('batch polling starts once, survives changing callbacks and uses latest handlers on the interval', async t => {
    const runner = hooks();
    t.after(() => runner.unmount());
    let discoveries = 0;
    const intervals = new Map();
    let timersCreated = 0;
    const load = loadTypeScript('hooks/batch-manager/useBatchPolling.ts', {
        react: runner.react,
        '../../services/geminiService': {
            listAllRemoteBatchJobs: async () => { discoveries++; return []; },
            getBatchJobStatus: async () => ({ state: 'SUCCEEDED' })
        },
        '../../utils/deviceId': { getDeviceId: () => 'test', isDeviceIsolationEnabled: () => false },
        '../../services/soundNotificationService': {},
        '../../types': {}
    }, {
        setInterval: (fn, delay) => {
            assert.equal(delay, 30000);
            const id = ++timersCreated;
            intervals.set(id, fn);
            return id;
        },
        clearInterval: id => intervals.delete(id)
    });
    const props = {
        batchJobsRef: { current: [] }, fetchingJobIdsRef: { current: {} },
        autoDownloadFromServerRef: { current: true },
        restoreFinishedCardsRef: { current: true }, restoreFailedCardsRef: { current: true },
        persistBatchJobs: updater => { props.batchJobsRef.current = updater(props.batchJobsRef.current); }
    };
    let latestFetch = 0;
    for (let render = 0; render < 10; render++) {
        // Mirrors the new callback created by AppContext on each render.
        props.fetchBatchJobResults = async () => { latestFetch = render + 1; };
        runner.render(() => load.useBatchPolling(props));
        await flush();
    }
    assert.equal(discoveries, 1, 'rerenders must not repeat initial remote discovery');
    assert.equal(timersCreated, 1, 'rerenders must not reinstall the timer');

    intervals.get(1)();
    await flush();
    assert.equal(discoveries, 1, 'idle intervals must not request remote jobs');

    props.batchJobsRef.current = [{ id: 'job', name: 'batches/job', state: 'RUNNING', items: [] }];
    intervals.get(1)();
    await flush();
    assert.equal(discoveries, 2);
    assert.equal(latestFetch, 10, 'the timer must invoke the latest callback');
    assert.equal(props.batchJobsRef.current[0].state, 'SUCCEEDED');
    runner.unmount();
    assert.equal(intervals.size, 0, 'unmount must remove the timer');
});
