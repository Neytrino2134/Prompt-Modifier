import { BatchJobState, Node, ToastType } from '../../types';

export const STORAGE_KEY_BATCH_JOBS = 'gemini_batch_jobs_v1';
export const STORAGE_KEY_AUTO_DOWNLOAD = 'task_queue_auto_download_from_server';
export const STORAGE_KEY_BATCH_MODE = 'settings_isBatchMode';
export const STORAGE_KEY_RESTORE_FINISHED_CARDS = 'task_queue_restore_finished_cards';
export const STORAGE_KEY_RESTORE_FAILED_CARDS = 'task_queue_restore_failed_cards';

export interface UseBatchManagerProps {
    getCacheProtection?: () => Promise<unknown[]>;
    getTargetNode?: (tabId: string, nodeId: string) => Node | undefined;
    updateNodeInStorage?: (tabId: string, nodeId: string, updater: (nodeVal: any) => any, cacheData?: { frame: number; url: string }) => void;
    setFullSizeImage?: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    addToHistory?: (imageUrl: string, prompt: string, model: string, meta?: any) => void;
    addToast?: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
    enqueueTask?: (options: any) => string;
    updateTaskByBatchJob?: (batchJobIdOrName: string, patch: Partial<any>) => void;
    completeBatchTasksForNode?: (nodeId: string, resultUrl?: string) => void;
    triggerAutoSave?: () => Promise<void> | void;
    t?: (key: string) => string;
}

export interface CreateBatchGenerationParams {
    nodeId: string;
    nodeTitle?: string;
    tabId?: string;
    tabName?: string;
    model: string;
    isSequence: boolean;
    items: {
        id: string;
        frameIndex?: number;
        prompt: string;
        aspectRatio?: string;
        resolution?: string;
        quality?: string;
        outputFormat?: string;
        size?: string;
        thinkingLevel?: string;
        searchGrounding?: string;
        images?: { base64ImageData: string; mimeType: string }[];
        autoCrop169?: boolean;
        autoDownload?: boolean;
        autoInsertResults?: boolean;
        autoSaveImages?: boolean;
    }[];
    signal?: AbortSignal;
}

// Map SDK JobState string to BatchJobState
export const mapSdkState = (sdkState: string): BatchJobState => {
    const s = String(sdkState || '').toUpperCase();
    if (s.includes('SUCCEEDED') || s.includes('SUCCESS') || s === 'JOB_STATE_SUCCEEDED') return 'SUCCEEDED';
    if (s.includes('FAILED') || s === 'JOB_STATE_FAILED') return 'FAILED';
    if (s.includes('CANCELLED') || s.includes('CANCELED') || s === 'JOB_STATE_CANCELLED') return 'CANCELLED';
    if (s.includes('EXPIRED') || s === 'JOB_STATE_EXPIRED') return 'EXPIRED';
    if (s.includes('RUNNING') || s === 'JOB_STATE_RUNNING') return 'RUNNING';
    if (s.includes('PENDING') || s === 'JOB_STATE_PENDING') return 'PENDING';
    return 'PENDING';
};

export const extractBatchPromptText = (req: any, idx: number): string => {
    const geminiPrompt = req?.contents?.[0]?.parts?.find((p: any) => p?.text)?.text;
    if (geminiPrompt) return geminiPrompt;

    const responseInput = req?.body?.input ?? req?.input;
    if (typeof responseInput === 'string' && responseInput.trim()) return responseInput;
    if (Array.isArray(responseInput)) {
        for (const inputItem of responseInput) {
            const content = Array.isArray(inputItem?.content) ? inputItem.content : [];
            const textPart = content.find((p: any) => p?.type === 'input_text' && p?.text);
            if (textPart?.text) return textPart.text;
        }
    }

    return `Batch Item #${idx + 1}`;
};

export const extractBatchAspectRatio = (req: any): string | undefined => {
    return req?.config?.imageConfig?.aspectRatio || req?.body?.metadata?.aspectRatio;
};

export const extractBatchResolution = (req: any): string | undefined => {
    return req?.config?.imageConfig?.imageSize || req?.body?.tools?.[0]?.size || req?.body?.metadata?.size;
};
