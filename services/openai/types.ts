export const STORAGE_KEY_OPENAI_ENABLED = 'settings_openai_enabled';
export const STORAGE_KEY_OPENAI_API_KEY = 'settings_openai_api_key';
export const OPENAI_CONFIG_CHANGE_EVENT = 'openai-config-changed';

export const STORAGE_KEY_OPENAI_BATCH_JOBS = 'openai_batch_store_v1';
export const OPENAI_BATCH_IMAGE_GEN_ENDPOINT = '/v1/images/generations';
export const OPENAI_BATCH_IMAGE_EDITS_ENDPOINT = '/v1/images/edits';

export interface OpenAiImageGenerationOptions {
    model?: string;
    aspectRatio?: string;
    quality?: 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd' | string;
    style?: 'vivid' | 'natural';
    resolution?: string;
    size?: string;
    outputFormat?: 'png' | 'jpeg' | 'webp' | string;
    images?: { base64ImageData: string; mimeType: string }[];
}

export interface StoredOpenAiBatchItem {
    id: string;
    prompt: string;
    aspectRatio?: string;
    size?: string;
    quality?: string;
    outputFormat?: string;
    images?: { base64ImageData: string; mimeType: string }[];
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    resultUrl?: string;
    error?: string;
}

export interface StoredOpenAiBatch {
    id: string;
    deviceId?: string;
    model: string;
    displayName: string;
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    createdAt: number;
    updatedAt: number;
    nativeBatchId?: string;
    outputCached?: boolean;
    endpoint?: string;
    error?: string;
    rawJsonl?: string;
    items: StoredOpenAiBatchItem[];
}
