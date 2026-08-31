import { useState, useEffect } from 'react';
import { 
    isOpenAiEnabled, 
    setOpenAiEnabled, 
    getOpenAiApiKey, 
    setOpenAiApiKey, 
    OPENAI_CONFIG_CHANGE_EVENT, 
    notifyOpenAiConfigChanged 
} from './openaiService';

export { 
    isOpenAiEnabled, 
    setOpenAiEnabled, 
    getOpenAiApiKey, 
    setOpenAiApiKey, 
    OPENAI_CONFIG_CHANGE_EVENT, 
    notifyOpenAiConfigChanged 
};

export type LLMMode = 'flash' | 'pro';

export interface ModelOption {
    id: string;
    name: string;
    description: string;
    tier: LLMMode;
}

export interface ImageModelOption {
    value: string;
    label: string;
    provider: 'google' | 'openai';
    description?: string;
}

export const GOOGLE_IMAGE_MODELS: ImageModelOption[] = [
    { value: 'imagen-4.0-generate-001', label: 'Imagen 4.0 (Quality)', provider: 'google' },
    { value: 'imagen-4.0-ultra-generate-preview-06-06', label: 'Imagen 4.0 Ultra (Preview)', provider: 'google' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3.0', provider: 'google' },
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro Image (Nano Banana Pro)', provider: 'google' },
    { value: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image (Nano Banana 2)', provider: 'google' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image Preview (Nano Banana 2 Lite)', provider: 'google' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana)', provider: 'google' }
];

export const OPENAI_IMAGE_MODELS: ImageModelOption[] = [
    { value: 'gpt-image-2', label: 'GPT-Image-2 (OpenAI)', provider: 'openai', description: 'Next-generation OpenAI image model with custom resolution & quality' },
    { value: 'dall-e-3', label: 'DALL·E 3 (OpenAI - Natural/HD)', provider: 'openai', description: 'Latest OpenAI high quality image generation model' },
    { value: 'dall-e-3-vivid', label: 'DALL·E 3 Vivid (OpenAI - Hyperrealistic)', provider: 'openai', description: 'Vivid, dramatic aesthetic' },
    { value: 'dall-e-2', label: 'DALL·E 2 (OpenAI - Fast)', provider: 'openai', description: 'Fast standard model' }
];

export const IMAGE_EDITOR_GOOGLE_MODELS: ImageModelOption[] = [
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro', provider: 'google' },
    { value: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash', provider: 'google' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Lite', provider: 'google' }
];

export const IMAGE_EDITOR_OPENAI_MODELS: ImageModelOption[] = [
    { value: 'gpt-image-2', label: 'GPT-Image-2 (OpenAI)', provider: 'openai', description: 'Next-generation OpenAI image model with custom resolution & quality' }
];

export const isOpenAiImageModel = (model?: string): boolean => {
    if (!model) return false;
    return model.startsWith('gpt-image') || model.startsWith('dall-e') || model.startsWith('openai') || model.includes('gpt-image');
};

export const isGptImage2Model = (model?: string): boolean => {
    if (!model) return false;
    return model === 'gpt-image-2' || model.startsWith('gpt-image-2') || model.includes('gpt-image');
};

export const getImageModelOptions = (includeOpenAi: boolean = isOpenAiEnabled()): ImageModelOption[] => {
    if (includeOpenAi) {
        return [...GOOGLE_IMAGE_MODELS, ...OPENAI_IMAGE_MODELS];
    }
    return GOOGLE_IMAGE_MODELS;
};

export const getImageEditorModelOptions = (includeOpenAi: boolean = isOpenAiEnabled()): ImageModelOption[] => {
    if (includeOpenAi) {
        return [...IMAGE_EDITOR_GOOGLE_MODELS, ...IMAGE_EDITOR_OPENAI_MODELS];
    }
    return IMAGE_EDITOR_GOOGLE_MODELS;
};

/**
 * React hook to subscribe to OpenAI toggle updates in real-time
 */
export const useOpenAiEnabled = (): boolean => {
    const [enabled, setEnabled] = useState<boolean>(() => isOpenAiEnabled());

    useEffect(() => {
        const handleUpdate = () => {
            setEnabled(isOpenAiEnabled());
        };

        window.addEventListener(OPENAI_CONFIG_CHANGE_EVENT, handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener(OPENAI_CONFIG_CHANGE_EVENT, handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    return enabled;
};


// Built-in pool of Flash and Pro models that can easily be extended as Google releases new versions
export const DEFAULT_FLASH_MODELS: ModelOption[] = [
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Next-gen hybrid reasoning & high-speed model', tier: 'flash' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Ultra-fast & intelligent Flash model (Default)', tier: 'flash' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Advanced Flash model with enhanced multimodal performance', tier: 'flash' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Ultra lightweight, cost-efficient, and fast', tier: 'flash' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash Preview', description: 'Fast multimodal reasoning model', tier: 'flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Balanced speed, cost, and multimodal capabilities', tier: 'flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'High-speed production model', tier: 'flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Cost-effective high throughput model', tier: 'flash' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'High throughput, low latency', tier: 'flash' },
];

export const DEFAULT_PRO_MODELS: ModelOption[] = [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Highest intelligence & complex reasoning (Default)', tier: 'pro' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview', description: 'Advanced reasoning and large context', tier: 'pro' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Deep reasoning, coding, and structured analysis', tier: 'pro' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Extended context 2M tokens reasoning model', tier: 'pro' },
];

export const DEFAULT_CONFIG = {
    flashModel: 'gemini-3.6-flash',
    proModel: 'gemini-3.1-pro-preview',
};

export const STORAGE_KEY_FLASH_MODEL = 'settings_llm_flash_model';
export const STORAGE_KEY_PRO_MODEL = 'settings_llm_pro_model';
export const STORAGE_KEY_CUSTOM_MODELS = 'settings_llm_custom_models';

export const LLM_CONFIG_CHANGE_EVENT = 'llm-models-config-changed';

/**
 * Get all available Flash models (built-in + user added)
 */
export const getAvailableFlashModels = (): ModelOption[] => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const customFlash = custom.filter(m => m.tier === 'flash');
        const customIds = new Set(customFlash.map(m => m.id));
        return [...DEFAULT_FLASH_MODELS.filter(m => !customIds.has(m.id)), ...customFlash];
    } catch {
        return DEFAULT_FLASH_MODELS;
    }
};

/**
 * Get all available Pro models (built-in + user added)
 */
export const getAvailableProModels = (): ModelOption[] => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const customPro = custom.filter(m => m.tier === 'pro');
        const customIds = new Set(customPro.map(m => m.id));
        return [...DEFAULT_PRO_MODELS.filter(m => !customIds.has(m.id)), ...customPro];
    } catch {
        return DEFAULT_PRO_MODELS;
    }
};

/**
 * Add a custom model to the pool
 */
export const addCustomModel = (model: ModelOption): void => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const filtered = custom.filter(m => m.id !== model.id);
        filtered.push(model);
        localStorage.setItem(STORAGE_KEY_CUSTOM_MODELS, JSON.stringify(filtered));
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to add custom model', e);
    }
};

/**
 * Get the currently configured Flash model ID
 */
export const getConfiguredFlashModel = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_FLASH_MODEL);
        if (saved && saved.trim()) {
            return saved.trim();
        }
    } catch {}
    return DEFAULT_CONFIG.flashModel;
};

/**
 * Set the Flash model ID
 */
export const setConfiguredFlashModel = (modelId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_FLASH_MODEL, modelId.trim());
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to save flash model', e);
    }
};

/**
 * Get the currently configured Pro model ID
 */
export const getConfiguredProModel = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_PRO_MODEL);
        if (saved && saved.trim()) {
            return saved.trim();
        }
    } catch {}
    return DEFAULT_CONFIG.proModel;
};

/**
 * Set the Pro model ID
 */
export const setConfiguredProModel = (modelId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_PRO_MODEL, modelId.trim());
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to save pro model', e);
    }
};

/**
 * Normalize any mode or model identifier into either 'flash' or 'pro'
 */
export const normalizeModelMode = (input: string | undefined | null): LLMMode => {
    if (!input) return 'flash';
    const lower = input.toLowerCase().trim();
    if (lower === 'pro' || lower.includes('pro')) {
        return 'pro';
    }
    return 'flash';
};

/**
 * Central Model Resolver:
 * Takes either a mode ('flash' | 'pro'), a legacy model name, or a specific model name,
 * and returns the exact Gemini model identifier configured for that mode.
 */
export const getModelForMode = (modeOrModel?: string | null): string => {
    if (!modeOrModel) {
        return getConfiguredFlashModel();
    }

    const trimmed = modeOrModel.trim();
    
    // Explicit 'flash' or 'pro' mode
    if (trimmed === 'flash') {
        return getConfiguredFlashModel();
    }
    if (trimmed === 'pro') {
        return getConfiguredProModel();
    }

    // Legacy flash aliases
    if (trimmed === 'gemini-3.7-flash' || trimmed === 'gemini-3.6-flash' || trimmed === 'gemini-3.5-flash' || trimmed === 'gemini-3.5-flash-lite' || trimmed === 'gemini-3-flash-preview' || trimmed === 'gemini-2.5-flash' || trimmed === 'gemini-2.0-flash' || trimmed === 'gemini-2.0-flash-lite' || trimmed === 'gemini-1.5-flash') {
        return getConfiguredFlashModel();
    }

    // Legacy pro aliases
    if (trimmed === 'gemini-3.1-pro-preview' || trimmed === 'gemini-3-pro-preview' || trimmed === 'gemini-2.5-pro' || trimmed === 'gemini-1.5-pro') {
        return getConfiguredProModel();
    }

    // If it contains "pro", resolve to configured Pro model unless it's an image model
    if (trimmed.includes('pro') && !trimmed.includes('image')) {
        return getConfiguredProModel();
    }

    // If it contains "flash" and not image, resolve to configured Flash model
    if (trimmed.includes('flash') && !trimmed.includes('image')) {
        return getConfiguredFlashModel();
    }

    // Return as-is for specific or image models (e.g. gemini-2.5-flash-image)
    return trimmed;
};

/**
 * Get human-readable label for a model mode
 */
export const getModelLabelForMode = (modeOrModel?: string | null): string => {
    const mode = normalizeModelMode(modeOrModel);
    const modelId = mode === 'pro' ? getConfiguredProModel() : getConfiguredFlashModel();
    const available = mode === 'pro' ? getAvailableProModels() : getAvailableFlashModels();
    const found = available.find(m => m.id === modelId);
    return found ? found.name : modelId;
};

/**
 * Emit event on window so React components and hooks can reactively update
 */
export const notifyModelConfigChanged = (): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LLM_CONFIG_CHANGE_EVENT, {
            detail: {
                flashModel: getConfiguredFlashModel(),
                proModel: getConfiguredProModel(),
            }
        }));
    }
};
