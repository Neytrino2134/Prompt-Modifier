const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Resolve mocks by their original file paths so extracted modules can reuse them.
function loadTypeScript(file, mocks = {}, globals = {}) {
    const entry = path.resolve(file);
    const relativeMocks = new Map(Object.entries(mocks)
        .filter(([name]) => name.startsWith('.'))
        .map(([name, value]) => [path.resolve(path.dirname(entry), name), value]));
    const cache = new Map();

    function load(sourceFile) {
        if (cache.has(sourceFile)) return cache.get(sourceFile);
        const exports = {};
        cache.set(sourceFile, exports);
        const code = ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
        }).outputText.replaceAll('import.meta.env', '({ DEV: false })');

        vm.runInNewContext(code, {
            exports, console, Date, Map, Set, TextEncoder, Blob, Uint8Array, ArrayBuffer, atob,
            AbortController, DOMException, setTimeout, clearTimeout, setInterval, clearInterval,
            ...globals,
            require(name) {
                if (!name.startsWith('.')) {
                    if (name in mocks) return mocks[name];
                    throw new Error('Unexpected dependency: ' + name);
                }
                const target = path.resolve(path.dirname(sourceFile), name);
                if (relativeMocks.has(target)) return relativeMocks.get(target);
                const resolved = [target + '.ts', target + '.tsx', path.join(target, 'index.ts')].find(fs.existsSync);
                if (!resolved) throw new Error('Unresolved module: ' + name + ' from ' + sourceFile);
                return load(resolved);
            }
        }, { filename: sourceFile });
        return exports;
    }

    return load(entry);
}

module.exports = { loadTypeScript };
