import {
    STORAGE_KEY_OPENAI_ENABLED,
    STORAGE_KEY_OPENAI_API_KEY,
    OPENAI_CONFIG_CHANGE_EVENT
} from './types';

/**
 * Check if OpenAI API is enabled in settings
 */
export const isOpenAiEnabled = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY_OPENAI_ENABLED) === 'true';
    } catch {
        return false;
    }
};

/**
 * Enable or disable OpenAI API
 */
export const setOpenAiEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(STORAGE_KEY_OPENAI_ENABLED, String(enabled));
        notifyOpenAiConfigChanged();
    } catch (e) {
        console.error('Failed to set OpenAI enabled status', e);
    }
};

/**
 * Get configured OpenAI API Key
 */
export const getOpenAiApiKey = (): string => {
    try {
        const key = localStorage.getItem(STORAGE_KEY_OPENAI_API_KEY);
        if (key && key.trim()) {
            return key.trim();
        }
    } catch {}
    return (process.env.OPENAI_API_KEY || '').trim();
};

/**
 * Save OpenAI API Key
 */
export const setOpenAiApiKey = (key: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_OPENAI_API_KEY, key.trim());
        notifyOpenAiConfigChanged();
    } catch (e) {
        console.error('Failed to save OpenAI API Key', e);
    }
};

/**
 * Notify subscribers about OpenAI config updates
 */
export const notifyOpenAiConfigChanged = (): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OPENAI_CONFIG_CHANGE_EVENT, {
            detail: {
                enabled: isOpenAiEnabled(),
                hasKey: !!getOpenAiApiKey()
            }
        }));
    }
};

/**
 * Map aspect ratio or direct size to supported OpenAI resolutions
 */
export const mapAspectRatioToOpenAiSize = (
    aspectRatio?: string,
    model: string = 'gpt-image-2.5-flare',
    sizeOverride?: string
): string => {
    if (sizeOverride && (sizeOverride === '1024x1024' || sizeOverride === '1024x1536' || sizeOverride === '1536x1024' || sizeOverride === '1792x1024' || sizeOverride === '1024x1792' || sizeOverride === '512x512' || sizeOverride === '256x256')) {
        return sizeOverride;
    }

    if (model.includes('gpt-image') || model.startsWith('gpt-image')) {
        if (!aspectRatio) return '1024x1024';
        const ratio = aspectRatio.trim();
        if (ratio === '16:9' || ratio === '4:3' || ratio === '3:2' || ratio === '4:1' || ratio === '8:1') {
            return '1536x1024'; // Landscape for GPT-Image models
        }
        if (ratio === '9:16' || ratio === '3:4' || ratio === '2:3' || ratio === '1:4' || ratio === '1:8') {
            return '1024x1536'; // Portrait for GPT-Image models
        }
        return '1024x1024';
    }

    if (model === 'dall-e-2') {
        return '1024x1024';
    }

    if (!aspectRatio) return '1024x1024';
    const ratio = aspectRatio.trim();

    if (ratio === '16:9' || ratio === '4:3' || ratio === '4:1' || ratio === '8:1') {
        return '1792x1024'; // Wide horizontal
    }
    if (ratio === '9:16' || ratio === '3:4' || ratio === '1:4' || ratio === '1:8') {
        return '1024x1792'; // Tall vertical
    }
    return '1024x1024'; // Square (1:1)
};

/**
 * Maps user-selected model presets (e.g. 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst')
 * or internal model IDs to valid, supported OpenAI API image model names ('gpt-image-2', 'dall-e-3', 'dall-e-2').
 * Prevents non-existent models or accidental LLM models (e.g. 'gpt-5.6') from being sent to image endpoints.
 */
export const mapToOpenAiApiImageModel = (modelName?: string): string => {
    if (!modelName) return 'gpt-image-2';
    const m = modelName.trim().toLowerCase();
    if (m.includes('dall-e-2') || m === 'dall-e-2') return 'dall-e-2';
    if (m.includes('dall-e-3') || m.includes('dalle3') || m === 'dall-e-3') return 'dall-e-3';
    // All GPT-Image models and presets in OpenAI API are backed by 'gpt-image-2'
    if (m.includes('gpt-image') || m.includes('flare') || m.includes('sunburst')) return 'gpt-image-2';
    // Guard against accidental LLM model names passed to image generation/editing
    if (m.startsWith('gpt-')) return 'gpt-image-2';
    return 'gpt-image-2';
};

export const resolveOpenAiBatchModel = (modelName?: string): string => {
    if (!modelName) return 'gpt-image-2.5-flare';
    const m = modelName.trim().toLowerCase();
    if (m.includes('flare') || m === 'gpt-image-2.5-flare') return 'gpt-image-2.5-flare';
    if (m.includes('sunburst') || m === 'gpt-image-2.5-sunburst') return 'gpt-image-2.5-sunburst';
    if (m === 'gpt-image-2.5') return 'gpt-image-2.5';
    if (m === 'gpt-image-2' || m.includes('gpt-image-2')) return 'gpt-image-2';
    if (m.includes('gpt-image-1.5')) return 'gpt-image-1.5';
    if (m.includes('gpt-image-1-mini')) return 'gpt-image-1-mini';
    if (m.includes('gpt-image-1')) return 'gpt-image-1';
    if (m.startsWith('gpt-image')) return 'gpt-image-2';
    if (m.includes('dall-e-2')) return 'dall-e-2';
    if (m.includes('dall-e-3')) return 'dall-e-3';
    // If an LLM model or invalid name is passed, fallback safely to gpt-image-2.5-flare
    if (m.startsWith('gpt-')) return 'gpt-image-2.5-flare';
    return 'gpt-image-2.5-flare';
};
