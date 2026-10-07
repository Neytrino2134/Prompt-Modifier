import type { BatchJobRecord, BatchJobItem } from '../types';
import { readBatchArchive, batchResultKey } from './batchResultsCache';

export function batchJobMetadata(job: BatchJobRecord): BatchJobRecord {
    if (!job.resultsCached) return job;
    return { ...job, rawJsonl: undefined, items: job.items.map(({ resultUrl, resultThumbnail, images, ...item }) => item) };
}

export async function acquireBatchJobPayload(job: BatchJobRecord): Promise<BatchJobRecord> {
    if (!job.resultsCached) return job;
    const archive = await readBatchArchive<{ items: BatchJobItem[]; rawJsonl?: string }>(batchResultKey(job));
    if (!archive || !Array.isArray(archive.items)) throw new Error('The local batch archive is unavailable; download results again to recover it.');
    const metadata = new Map(job.items.map(item => [item.id, item]));
    return { ...job, rawJsonl: archive.rawJsonl, items: archive.items.map(item => ({
        ...metadata.get(item.id), ...item,
        savedToDisk: metadata.get(item.id)?.savedToDisk ?? item.savedToDisk
    })) };
}
