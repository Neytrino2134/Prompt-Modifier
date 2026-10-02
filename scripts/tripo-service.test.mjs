import { build } from 'esbuild';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Exercise the real TypeScript service without a browser, credentials or paid API calls.
async function loadService(dev) {
    const { outputFiles } = await build({
        entryPoints: ['services/tripoService.ts'], bundle: true, write: false,
        platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ DEV: dev }) }
    });
    return import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));
}
const service = await loadService(false);
const devService = await loadService(true);
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ioAAAAASUVORK5CYII=';
const image = 'data:image/png;base64,' + png;
let calls, replies;
const ok = data => ({ code: 0, data });

beforeEach(() => {
    const values = new Map([['settings_tripo_api_key', 'test-only'], ['settings_tripo_enabled', 'true']]);
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    calls = []; replies = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        assert.ok(replies.length, 'Unexpected fetch: ' + url);
        const reply = replies.shift();
        if (typeof reply === 'function') return reply(url, options);
        if (reply instanceof Error) throw reply;
        return new Response(JSON.stringify(reply), { status: 200 });
    };
});

test('upload and single-image generation share the v3 API and contract', async () => {
    replies.push(ok({ file_token: 'file_uploaded' }), ok({ task_id: 'task_single' }));
    const task = await service.createImageTo3DTask({ image, texture: false });
    assert.equal(task.taskId, 'task_single');
    assert.equal(calls[0].url, 'https://openapi.tripo3d.ai/v3/files');
    const file = calls[0].options.body.get('file');
    assert.equal(file.size, Buffer.from(png, 'base64').length);
    assert.equal(file.type, 'image/png');
    assert.equal(calls[0].options.headers.has('Content-Type'), false);
    assert.equal(calls[1].url, 'https://openapi.tripo3d.ai/v3/generation/image-to-model');
    const body = JSON.parse(calls[1].options.body);
    assert.deepEqual(body, { model: 'v3.1-20260211', texture: false, pbr: false, input: 'file_uploaded' });
});

test('front/back multiview preserves named directions', async () => {
    replies.push(ok({ task_id: 'task_multi' }));
    await service.createMultiviewTo3DTask({ views: { front: 'file_front', back: 'file_back' } });
    assert.equal(calls[0].url, 'https://openapi.tripo3d.ai/v3/generation/multiview-to-model');
    assert.deepEqual(JSON.parse(calls[0].options.body).inputs, [{ front: 'file_front' }, { back: 'file_back' }]);
});

test('a sole front view uses the single-image endpoint', async () => {
    replies.push(ok({ task_id: 'task_one' }));
    await service.createMultiviewTo3DTask({ views: { front: 'file_front' } });
    assert.ok(calls[0].url.endsWith('/generation/image-to-model'));
});

test('missing front and invalid polygon options fail before uploads', async () => {
    await assert.rejects(service.createMultiviewTo3DTask({ views: { back: image } }), /Front view/);
    await assert.rejects(service.createImageTo3DTask({ image, faceLimit: 2000000 }), /Face limit/);
    await assert.rejects(service.createImageTo3DTask({ image, modelVersion: 'P1-20260311', faceLimit: 50000 }), /Face limit/);
    await assert.rejects(service.createImageTo3DTask({ image, modelVersion: 'v2.5-20250123', quadMesh: true }), /Quad mesh/);
    assert.equal(calls.length, 0);
});

test('public image URL and default model produce valid v3 input', async () => {
    replies.push(ok({ task_id: 'task_url' }));
    await service.createImageTo3DTask({ image: 'https://example.com/image.png', modelVersion: 'default' });
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.input, 'https://example.com/image.png');
    assert.equal(body.model, 'v3.1-20260211');
});

test('legacy geometry omits unsupported texture_quality options', async () => {
    replies.push(ok({ task_id: 'task_legacy_model' }));
    await service.createImageTo3DTask({ image: 'file_existing', modelVersion: 'v2.5-20250123' });
    assert.equal('texture_quality' in JSON.parse(calls[0].options.body), false);
    await assert.rejects(service.createImageTo3DTask({ image, modelVersion: 'v2.5-20250123', textureQuality: 'detailed' }), /legacy model/);
    assert.equal(calls.length, 1);
});

test('bare base64 is uploaded instead of being mistaken for a file token', async () => {
    replies.push(ok({ file_token: 'file_base64' }));
    assert.equal(await service.uploadTripoFile(png), 'file_base64');
    assert.equal(calls[0].options.body.get('file').type, 'image/png');
});

test('empty or corrupt images fail locally', async () => {
    await assert.rejects(service.uploadTripoFile(new Blob([])), /empty/);
    await assert.rejects(service.uploadTripoFile(new Blob(['<html>error</html>'], { type: 'image/png' })), /corrupted/);
    await assert.rejects(service.uploadTripoFile('garbage'), /Invalid image/);
    assert.equal(calls.length, 0);
});

test('wrong MIME is corrected using image bytes', async () => {
    replies.push(ok({ file_token: 'file_corrected' }));
    await service.uploadTripoFile(new Blob([Buffer.from(png, 'base64')]), 'wrong.jpeg');
    const file = calls[0].options.body.get('file');
    assert.equal(file.type, 'image/png');
    assert.equal(file.name, 'wrong.png');
});

for (const code of [2003, 1000, 2010, 2000]) {
    test('API error ' + code + ' is preserved without another POST', async () => {
        replies.push({ code, message: 'original failure', suggestion: 'fix this input' });
        await assert.rejects(devService.createImageTo3DTask({ image: 'file_existing' }), new RegExp('code ' + code + '.*original failure'));
        assert.equal(calls.length, 1);
    });
}

test('a lost POST response is never retried', async () => {
    replies.push(new TypeError('Failed to fetch'));
    await assert.rejects(devService.createImageTo3DTask({ image: 'file_existing' }), /server may have accepted/);
    assert.equal(calls.length, 1);
});

test('missing dev proxy falls back to the same API and request body', async () => {
    replies.push(() => new Response('<html><title>App</title></html>'), ok({ task_id: 'task_direct' }));
    await devService.createImageTo3DTask({ image: 'file_existing' });
    assert.ok(calls[0].url.startsWith('/api/tripo-v3/'));
    assert.ok(calls[1].url.startsWith('https://openapi.tripo3d.ai/v3/'));
    assert.equal(calls[0].options.body, calls[1].options.body);
});

test('v3 result URLs and credits reach the task history', async () => {
    replies.push(ok({ task_id: 'task_result', status: 'success', progress: 100,
        output: { model_url: 'https://example.com/result.glb', rendered_image_url: 'https://example.com/render.png' }, credits_consumed: 0 }));
    const result = await service.pollTripoTask('task_result');
    assert.equal(result.modelUrl, 'https://example.com/result.glb');
    assert.equal(result.thumbnailUrl, 'https://example.com/render.png');
    assert.equal(service.getTripoRecentTasks()[0].creditsConsumed, 0);
    assert.ok(calls[0].url.endsWith('/tasks/task_result'));
});

test('success without output and failed v3 task retain useful errors', async () => {
    replies.push(ok({ status: 'success' }));
    await assert.rejects(service.pollTripoTask('task_empty'), /no model URL.*task_empty/);
    replies.push(ok({ status: 'failed', error_message: 'model too complex', error_code: 2018 }));
    assert.equal((await service.pollTripoTask('task_failed')).error, 'model too complex');
});

test('batch task map is parsed and ISO timestamps become milliseconds', async () => {
    replies.push(ok({ tasks: { task_batch: { status: 'success', created_at: '2026-10-02T12:00:00Z', output: { model_url: 'https://example.com/model.glb' } } }, missed: [] }));
    const tasks = await service.queryTripoTasksBatch(['task_batch']);
    assert.equal(calls.length, 1);
    assert.equal(tasks[0].createdAt, Date.parse('2026-10-02T12:00:00Z'));
    assert.deepEqual(JSON.parse(calls[0].options.body), { task_ids: ['task_batch'] });
});

test('legacy status query fallback is read-only and limited to not-found', async () => {
    replies.push(() => new Response(JSON.stringify({ code: 404, message: 'not found' }), { status: 404 }), ok({ status: 'success' }));
    await service.getTripoTaskStatus('old_id');
    assert.equal(calls[1].url, 'https://api.tripo3d.ai/v2/openapi/task/old_id');
    replies.push({ code: 2000, message: 'rate limit' });
    await assert.rejects(service.getTripoTaskStatus('rate_limited'), /rate limit/);
    assert.equal(calls.length, 3);
});

test('cancellation interrupts upload and never creates a task', async () => {
    const controller = new AbortController();
    replies.push((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        controller.abort();
    }));
    await assert.rejects(service.generateImageTo3D({ image }, undefined, controller.signal), { name: 'AbortError' });
    assert.equal(calls.length, 1);
});

test('poll cancellation removes the abort listener after waits', async () => {
    const controller = new AbortController();
    let added = 0, removed = 0;
    const add = controller.signal.addEventListener.bind(controller.signal);
    const remove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = (...args) => { added++; return add(...args); };
    controller.signal.removeEventListener = (...args) => { removed++; return remove(...args); };
    replies.push(ok({ status: 'running', progress: 50 }), ok({ status: 'success', output: { model_url: 'https://example.com/model.glb' } }));
    await service.pollTripoTask('task_wait', undefined, controller.signal, 1);
    assert.equal(added, removed);
});

test('a temporary status-query error is retried without creating another task', async () => {
    replies.push({ code: 2000, message: 'rate limit' }, ok({ status: 'success', output: { model_url: 'https://example.com/model.glb' } }));
    const result = await service.pollTripoTask('task_retry', undefined, undefined, 1);
    assert.equal(result.status, 'success');
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.options.method === 'GET' && call.url.endsWith('/tasks/task_retry')));
});
