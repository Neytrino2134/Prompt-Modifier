import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const compress = promisify(gzip);
const decompress = promisify(gunzip);
const filename = key => `${createHash('sha256').update(key).digest('hex')}.json.gz`;

// Only this directory and our hashed archive files are managed. No project files
// or session backups are deleted. Serialize operations across renderer windows.
export function createBatchCache(root) {
  let pending = Promise.resolve();
  const serialize = action => {
    const next = pending.then(action);
    pending = next.catch(() => {});
    return next;
  };
  const read = async file => JSON.parse((await decompress(await fs.readFile(file))).toString('utf8'));
  const validateKey = key => {
    if (typeof key !== 'string' || !key || key.length > 2048) throw new Error('Invalid cache key');
  };
  return {
    root,
    get: key => serialize(async () => {
      validateKey(key);
      try {
        const entry = await read(path.join(root, filename(key)));
        if (entry.version !== 1 || entry.key !== key) throw new Error('Invalid archive');
        return entry.payload;
      } catch (error) {
        if (error.code !== 'ENOENT') console.warn('[Batch cache] Cannot read archive:', error.message);
        return null;
      }
    }),
    put: (key, payload, imageHashes = [], relatedKeys = []) => serialize(async () => {
      validateKey(key);
      if (!Array.isArray(imageHashes) || !imageHashes.every(h => /^[a-f0-9]{64}$/.test(h))) throw new Error('Invalid image hashes');
      if (!Array.isArray(relatedKeys)) throw new Error('Invalid related keys');
      relatedKeys.forEach(validateKey);
      await fs.mkdir(root, { recursive: true });
      const target = path.join(root, filename(key));
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        const data = await compress(Buffer.from(JSON.stringify({ version: 1, key, payload, imageHashes, relatedKeys, savedAt: Date.now() })));
        await fs.writeFile(temporary, data, { flag: 'wx' });
        await fs.rename(temporary, target);
      } finally { await fs.unlink(temporary).catch(() => {}); }
      return true;
    }),
    prune: ({ keys, imageHashes, before }) => serialize(async () => {
      if (!Array.isArray(keys) || !Array.isArray(imageHashes) || !Number.isFinite(before)) throw new Error('Invalid cleanup references');
      const retainedKeys = new Set(keys), retainedImages = new Set(imageHashes);
      const entries = [];
      let skipped = 0, removed = 0, bytes = 0;
      let files;
      try { files = await fs.readdir(root, { withFileTypes: true }); }
      catch (error) { if (error.code === 'ENOENT') return { removed, bytes, skipped }; throw error; }
      for (const file of files) {
        if (!file.isFile() || !/^[a-f0-9]{64}\.json\.gz$/.test(file.name)) continue;
        const absolute = path.join(root, file.name);
        try {
          const entry = await read(absolute);
          if (entry.version !== 1 || filename(entry.key) !== file.name || !Array.isArray(entry.imageHashes) || !Array.isArray(entry.relatedKeys)) throw new Error('Invalid archive');
          entries.push({ ...entry, absolute });
          if (entry.savedAt >= before || entry.imageHashes.some(hash => retainedImages.has(hash))) retainedKeys.add(entry.key);
        } catch { skipped++; } // An unreadable archive is retained for recovery.
      }
      let changed;
      do {
        changed = false;
        for (const entry of entries) if (retainedKeys.has(entry.key)) {
          for (const key of entry.relatedKeys) if (!retainedKeys.has(key)) { retainedKeys.add(key); changed = true; }
        }
      } while (changed);
      // Unknown dependencies in a damaged results archive may still require its
      // original provider response to recover images.
      if (skipped) for (const entry of entries) if (entry.key.startsWith('openai-output:')) retainedKeys.add(entry.key);
      for (const entry of entries) if (!retainedKeys.has(entry.key)) {
        const stat = await fs.lstat(entry.absolute);
        if (!stat.isFile() || stat.isSymbolicLink()) { skipped++; continue; }
        await fs.unlink(entry.absolute);
        removed++;
        bytes += stat.size;
      }
      return { removed, bytes, skipped };
    })
  };
}
