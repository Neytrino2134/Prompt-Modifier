const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers/load-typescript.cjs');

test('desktop notification uses one silent transport and preserves click action', async () => {
    const { showDesktopNotification } = await import('../electron/desktopNotifications.js');
    let shown = 0, balloons = 0, clicked = 0, instance;
    class Notification {
        static isSupported() { return true; }
        constructor(options) { this.options = options; instance = this; }
        on(event, callback) { this.click = callback; }
        show() { shown++; }
    }
    showDesktopNotification({ Notification, tray: { isDestroyed: () => false, displayBalloon: () => balloons++ },
        title: 'Done', message: 'Task', onClick: () => clicked++ });
    assert.equal(shown, 1);
    assert.equal(balloons, 0);
    assert.equal(instance.options.silent, true);
    instance.click();
    assert.equal(clicked, 1);
});

test('unsupported desktop notifications fall back to a single silent balloon', async () => {
    const { showDesktopNotification } = await import('../electron/desktopNotifications.js');
    const balloons = [];
    showDesktopNotification({ Notification: { isSupported: () => false },
        tray: { isDestroyed: () => false, displayBalloon: options => balloons.push(options) },
        title: 'Done', message: 'Task', type: 'warning' });
    assert.equal(balloons.length, 1);
    assert.equal(balloons[0].noSound, true);
    assert.equal(balloons[0].iconType, 'warning');
});

for (const muted of [false, true]) {
    test(`queued image completion emits one notification and ${muted ? 'no sound when muted' : 'one app sound'}`, async () => {
        const slots = [];
        let cursor = 0, effects = [], sounds = 0, notifications = 0;
        const react = {
            useState(initial) {
                const i = cursor++;
                slots[i] ??= initial;
                return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
            },
            useRef(initial) { return slots[cursor++] ??= { current: initial }; },
            useCallback(fn) { cursor++; return fn; },
            useEffect(fn) { cursor++; effects.push(fn); }
        };
        const soundService = { playTaskSuccessSound: () => sounds++, playTaskErrorSound() {}, playInfoSound() {}, playBatchSuccessSound() {} };
        const notify = loadTypeScript('services/trayNotificationService.ts', { './soundNotificationService': soundService }, {
            localStorage: { getItem: () => JSON.stringify({ enableSound: !muted }) },
            window: { electronAPI: { showTrayNotification: () => notifications++ } }
        });
        const queue = loadTypeScript('hooks/useTaskQueue.ts', { react, '../types': {}, '../services/soundNotificationService': soundService }, { setTimeout: () => 0 });
        const render = () => { cursor = 0; effects = []; const result = queue.useTaskQueue(); effects.forEach(fn => fn()); return result; };
        let api = render();
        api.enqueueTask({ nodeId: 'editor', prompt: 'test', successSoundHandled: true,
            execute: async () => 'original-image',
            onSuccess: () => notify.notifyImageEditorSuccess({ nodeTitle: 'Editor', prompt: 'test' }) });
        render();
        await new Promise(resolve => setImmediate(resolve));
        api = render();
        assert.equal(api.tasks[0].status, 'completed');
        assert.equal(api.tasks[0].resultUrl, 'original-image');
        assert.equal(notifications, 1);
        assert.equal(sounds, muted ? 0 : 1);
        // Tasks without a completion notification still retain their queue sound.
        api.enqueueTask({ nodeId: 'other', prompt: 'test', execute: async () => 'original-2' });
        render();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(sounds, muted ? 1 : 2);
    });
}

test('browser completion uses a silent OS notification and one application sound', () => {
    let sounds = 0;
    const delivered = [];
    function Notification(title, options) { delivered.push({ title, options }); }
    Notification.permission = 'granted';
    const notify = loadTypeScript('services/trayNotificationService.ts', {
        './soundNotificationService': { playTaskSuccessSound: () => sounds++ }
    }, { Notification, window: { Notification }, localStorage: { getItem: () => null } });
    notify.notifyImageEditorSuccess({ nodeTitle: 'Editor', prompt: 'test' });
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].options.silent, true);
    assert.equal(sounds, 1);
});
