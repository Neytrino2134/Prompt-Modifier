export const STORAGE_KEY_TRIPO_ENABLED = 'settings_tripo_enabled';
export const STORAGE_KEY_TRIPO_API_KEY = 'settings_tripo_api_key';
export const STORAGE_KEY_TRIPO_MODEL_VERSION = 'settings_tripo_model_version';
export const STORAGE_KEY_TRIPO_RECENT_TASKS = 'settings_tripo_recent_tasks';
export const STORAGE_KEY_TRIPO_LAST_BALANCE = 'settings_tripo_last_balance';
export const TRIPO_CONFIG_CHANGE_EVENT = 'tripo-config-changed';
export const TRIPO_LOG_EVENT = 'tripo-log-event';
export const TRIPO_BALANCE_CHANGE_EVENT = 'tripo-balance-changed';
export const TRIPO_TASKS_CHANGE_EVENT = 'tripo-tasks-changed';

export const DEFAULT_TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';
export const DEFAULT_TRIPO_V3_API_BASE = 'https://openapi.tripo3d.ai/v3';
export const TRIPO_PROXY_API_BASE = '/api/tripo';
export const TRIPO_PROXY_V3_API_BASE = '/api/tripo-v3';
export const DEFAULT_TRIPO_MODEL_VERSION = 'v3.1-20260211';

export interface TripoLogEntry {
    id: string;
    timestamp: number;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
}

export interface TripoModelOption {
    value: string;
    label: string;
    description: string;
    isFlagship?: boolean;
    badge?: string;
}

export const TRIPO_MODEL_OPTIONS: TripoModelOption[] = [
    {
        value: 'v3.1-20260211',
        label: 'Tripo H3.1 (Flagship • v3.1-20260211)',
        description: 'Top-tier geometry with PBR textures. Best choice for production assets (~40s, up to 2M faces).',
        isFlagship: true,
        badge: 'Flagship'
    },
    {
        value: 'P1-20260311',
        label: 'Tripo P1 (Ultra Precision • P1-20260311)',
        description: 'Next-generation high-precision structural geometry model.',
        badge: 'Precision'
    },
    {
        value: 'v3.0-20250812',
        label: 'Tripo v3.0 (High Quality • v3.0-20250812)',
        description: 'Enhanced edge sharpness, hard-surface support, and PBR textures.',
        badge: 'Quality'
    },
    {
        value: 'Turbo-v1.0-20250506',
        label: 'Tripo Turbo v1.0 (Fast • Turbo-v1.0-20250506)',
        description: 'Ultra-fast rapid generation model for quick prototyping and low latency.',
        badge: 'Fast'
    },
    {
        value: 'v2.5-20250123',
        label: 'Tripo v2.5 (Stable Legacy • v2.5-20250123)',
        description: 'Stable legacy model for multiview and standard texture generation.',
        badge: 'Stable'
    },
    {
        value: 'v2.0-20240919',
        label: 'Tripo v2.0 (v2.0-20240919)',
        description: 'Previous-generation Tripo 3D reconstruction model.'
    },
    {
        value: 'v1.4-20240625',
        label: 'Tripo v1.4 (v1.4-20240625)',
        description: 'Legacy v1.4 model.'
    },
    {
        value: 'default',
        label: 'Tripo Auto Default',
        description: 'Automatically use the latest engine recommended by Tripo API.'
    }
];

export interface TripoBalanceData {
    balance: number;
    frozen?: number;
    timestamp?: number;
}

export interface TripoRecentTask {
    taskId: string;
    type?: string;
    prompt?: string;
    createdAt: number;
    status: TripoTaskStatus;
    progress?: number;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    creditsConsumed?: number;
    error?: string;
}

export type TripoTextureQuality = 'standard' | 'detailed' | 'extreme';
export type TripoTextureAlignment = 'original_image' | 'geometry';
export type TripoTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';

export interface TripoFileInput {
    type?: string;
    file_token?: string;
    url?: string;
}

export interface TripoMultiviewViews {
    front: string | Blob | File; // base64, dataUrl, url, file_token, or Blob/File (Required)
    left?: string | Blob | File;  // (Optional)
    back?: string | Blob | File;  // (Optional)
    right?: string | Blob | File; // (Optional)
}

export interface TripoMultiviewTo3DParams {
    views: TripoMultiviewViews;
    texture?: boolean; // Default: true
    textureQuality?: TripoTextureQuality; // Default: 'standard'
    textureAlignment?: TripoTextureAlignment; // Default: 'original_image'
    pbr?: boolean; // Default: true (generate PBR materials)
    textureSeed?: number;
    modelSeed?: number;
    faceLimit?: number;
    quadMesh?: boolean;
    modelVersion?: string; // Defaults to configured model
    prompt?: string;
}

export interface TripoImageTo3DParams {
    image: string | Blob | File; // base64, dataUrl, url, file_token, or Blob/File (Required)
    texture?: boolean; // Default: true
    textureQuality?: TripoTextureQuality; // Default: 'standard'
    textureAlignment?: TripoTextureAlignment; // Default: 'original_image'
    pbr?: boolean; // Default: true (generate PBR materials)
    textureSeed?: number;
    modelSeed?: number;
    faceLimit?: number;
    quadMesh?: boolean;
    modelVersion?: string; // Default: 'v2.5-20250123'
    prompt?: string;
}

export interface TripoUploadResponse {
    code: number;
    data: {
        image_token?: string;
        file_token?: string;
    };
    message?: string;
}

export interface TripoTaskOutput {
    model_url?: string;
    rendered_image_url?: string;
    thumbnail_url?: string;
    model?: string; // Legacy model URL
    base_model?: string;
    pbr_model?: string;
    rendered_image?: string;
    thumbnail?: string;
    texture_maps?: {
        base_color?: string;
        normal?: string;
        roughness?: string;
        metallic?: string;
    };
    [key: string]: any;
}

export interface TripoTaskData {
    task_id: string;
    type: string;
    status: TripoTaskStatus;
    progress: number;
    output?: TripoTaskOutput;
    result?: TripoTaskOutput;
    error?: {
        code?: string | number;
        message?: string;
    } | string;
    error_code?: number;
    error_message?: string;
    credits_consumed?: number;
    created_at?: number | string;
    updated_at?: number;
}

export interface TripoTaskStatusResponse {
    code: number;
    data: TripoTaskData;
    message?: string;
}

export interface TripoTaskCreateResult {
    taskId: string;
    status: TripoTaskStatus;
    rawResponse: any;
}

export interface TripoTaskResult {
    taskId: string;
    status: 'success' | 'failed' | 'cancelled';
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    output?: TripoTaskOutput;
    error?: string;
}
