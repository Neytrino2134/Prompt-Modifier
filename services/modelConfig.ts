import { useState, useEffect } from 'react';
import { 
    isOpenAiEnabled, 
    setOpenAiEnabled, 
    getOpenAiApiKey, 
    setOpenAiApiKey, 
    OPENAI_CONFIG_CHANGE_EVENT, 
    notifyOpenAiConfigChanged,
    isOpenAiTextModel
} from './openaiService';
import {
    isTripoEnabled,
    setTripoEnabled,
    getTripoApiKey,
    setTripoApiKey,
    getTripoModelVersion,
    setTripoModelVersion,
    TRIPO_CONFIG_CHANGE_EVENT,
    notifyTripoConfigChanged,
    useTripoEnabled,
    TRIPO_MODEL_OPTIONS,
    type TripoModelOption,
    getTripoModelOption,
    DEFAULT_TRIPO_MODEL_VERSION
} from './tripoService';

export { 
    isOpenAiEnabled, 
    setOpenAiEnabled, 
    getOpenAiApiKey, 
    setOpenAiApiKey, 
    OPENAI_CONFIG_CHANGE_EVENT, 
    notifyOpenAiConfigChanged,
    isOpenAiTextModel,
    isTripoEnabled,
    setTripoEnabled,
    getTripoApiKey,
    setTripoApiKey,
    getTripoModelVersion,
    setTripoModelVersion,
    TRIPO_CONFIG_CHANGE_EVENT,
    notifyTripoConfigChanged,
    useTripoEnabled,
    TRIPO_MODEL_OPTIONS,
    type TripoModelOption,
    getTripoModelOption,
    DEFAULT_TRIPO_MODEL_VERSION
};

export type LLMMode = 'flash' | 'pro';

export interface ModelOption {
    id: string;
    name: string;
    description: string;
    tier: LLMMode;
    provider?: 'google' | 'openai';
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
    { value: 'gemini-nano-banana-2.1', label: 'Gemini 3.6 Flash Image (Nana Banana 2.1)', provider: 'google', description: 'Next-gen multimodal image generation with Thinking Mode, 4K & Search Grounding' },
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro Image (Nano Banana Pro)', provider: 'google' },
    { value: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image (Nano Banana 2)', provider: 'google' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image Preview (Nano Banana 2 Lite)', provider: 'google' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana)', provider: 'google' }
];

export const OPENAI_IMAGE_MODELS: ImageModelOption[] = [
    { value: 'gpt-image-2.5-sunburst', label: 'GPT-Image-2.5 Sunburst (High Precision / 4-View Turnaround)', provider: 'openai', description: 'Максимальное качество и тонкие детали, оптимален для 4-view turnaround и концепт-арта' },
    { value: 'gpt-image-2.5-flare', label: 'GPT-Image-2.5 Flare (Fast / Primary)', provider: 'openai', description: 'Быстрый и практичный основной вариант генерации нового поколения' },
    { value: 'gpt-image-2', label: 'GPT-Image-2 (OpenAI)', provider: 'openai', description: 'Базовая модель GPT-Image с кастомным разрешением' }
];

export const IMAGE_EDITOR_GOOGLE_MODELS: ImageModelOption[] = [
    { value: 'gemini-nano-banana-2.1', label: 'Gemini 3.6 Flash Image (Nana Banana 2.1)', provider: 'google', description: 'Next-gen high-speed multimodal image editing with Thinking Mode, 4K & Search Grounding' },
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro Image (Nano Banana Pro)', provider: 'google', description: 'Advanced image editing, inpainting & multi-input composition' },
    { value: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image (Nano Banana 2)', provider: 'google', description: 'High-speed multimodal image editing & transformations' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image Preview (Nano Banana 2 Lite)', provider: 'google', description: 'Lightweight preview editing model' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana)', provider: 'google', description: 'Fast standard multimodal image editing' }
];

export const IMAGE_EDITOR_OPENAI_MODELS: ImageModelOption[] = [
    { value: 'gpt-image-2.5-flare', label: 'GPT-Image-2.5 Flare (Fast / Primary)', provider: 'openai', description: 'Fast primary image editing model' },
    { value: 'gpt-image-2.5-sunburst', label: 'GPT-Image-2.5 Sunburst (High Precision / Edits)', provider: 'openai', description: 'High precision production editing & inpainting' },
    { value: 'gpt-image-2', label: 'GPT-Image-2 (OpenAI)', provider: 'openai', description: 'Next-generation OpenAI image model with custom resolution & quality' }
];

export const isOpenAiImageModel = (model?: string): boolean => {
    if (!model) return false;
    return model.startsWith('gpt-image') || model.startsWith('dall-e') || model.startsWith('openai') || model.includes('gpt-image');
};

export const isGptImage2Model = (model?: string): boolean => {
    if (!model) return false;
    return model.startsWith('gpt-image') || model.includes('gpt-image');
};

export const normalizeImageModelId = (modelId?: string): string => {
    if (!modelId) return '';
    const trimmed = modelId.trim();
    if (
        trimmed === 'gemini-3.6-flash-image' ||
        trimmed === 'gemini-3.6-image' ||
        trimmed === 'gemini-3.6-flash-image-preview' ||
        trimmed === 'nano-banana-2.1' ||
        trimmed === 'nana-banana-2.1'
    ) {
        return 'gemini-nano-banana-2.1';
    }
    return trimmed;
};

export const isNanoBanana21Model = (modelId?: string): boolean => {
    if (!modelId) return false;
    return normalizeImageModelId(modelId) === 'gemini-nano-banana-2.1';
};

export interface ImageModelCapabilities {
    supportedAspectRatios: string[];
    supportedResolutions: string[];
    supportedThinkingLevels: string[];
    supportedSearchTypes: ('none' | 'web' | 'image' | 'both')[];
    supportsQuality: boolean;
    supportsSize: boolean;
    supportsOutputFormat: boolean;
}

/**
 * Returns the exact supported parameters for a given image generation/editing model
 * strictly aligned with official Gemini API & OpenAI API specifications.
 */
export const getImageModelCapabilities = (modelId?: string): ImageModelCapabilities => {
    const normalized = normalizeImageModelId(modelId);

    // 1. Nana Banana 2.1 (gemini-nano-banana-2.1)
    if (isNanoBanana21Model(normalized)) {
        return {
            supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9', '1:4', '1:8', '4:1', '8:1'],
            supportedResolutions: ['1K', '2K', '4K'],
            supportedThinkingLevels: ['AUTO', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH'],
            supportedSearchTypes: ['none', 'web', 'image', 'both'],
            supportsQuality: false,
            supportsSize: false,
            supportsOutputFormat: false,
        };
    }

    // 2. Nano Banana Pro 3.0 (gemini-3-pro-image-preview / gemini-3-pro-image)
    if (normalized === 'gemini-3-pro-image-preview' || normalized === 'gemini-3-pro-image') {
        return {
            supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9'],
            supportedResolutions: ['1K', '2K', '4K'],
            supportedThinkingLevels: ['AUTO', 'LOW', 'HIGH'],
            supportedSearchTypes: ['none', 'web'],
            supportsQuality: false,
            supportsSize: false,
            supportsOutputFormat: false,
        };
    }

    // 3. Nano Banana 2 / 2 Lite (gemini-3.1-flash-image / gemini-3.1-flash-image-preview / gemini-3.1-flash-lite-image)
    if (
        normalized === 'gemini-3.1-flash-image' ||
        normalized === 'gemini-3.1-flash-image-preview' ||
        normalized === 'gemini-3.1-flash-lite-image'
    ) {
        return {
            supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
            supportedResolutions: [], // Fixed 1K output; imageSize parameter not supported
            supportedThinkingLevels: ['AUTO', 'MINIMAL', 'LOW', 'HIGH'],
            supportedSearchTypes: [], // googleSearch not supported on flash-lite-image
            supportsQuality: false,
            supportsSize: false,
            supportsOutputFormat: false,
        };
    }

    // 4. Nano Banana 2.5 (gemini-2.5-flash-image)
    if (normalized === 'gemini-2.5-flash-image') {
        return {
            supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
            supportedResolutions: [], // Fixed 1K output; imageSize not supported
            supportedThinkingLevels: [], // Gemini 2.5 Flash Image does not support thinkingLevel
            supportedSearchTypes: [], // Does not support googleSearch grounding
            supportsQuality: false,
            supportsSize: false,
            supportsOutputFormat: false,
        };
    }

    // 5. OpenAI GPT-Image models (gpt-image-2.5-flare, gpt-image-2.5-sunburst, gpt-image-2)
    if (isGptImage2Model(normalized)) {
        return {
            supportedAspectRatios: [], // Uses size (1024x1024, 1536x1024, 1024x1536, auto) instead
            supportedResolutions: [],
            supportedThinkingLevels: [],
            supportedSearchTypes: [],
            supportsQuality: true,
            supportsSize: true,
            supportsOutputFormat: true,
        };
    }

    // 6. DALL-E 3
    if (normalized === 'dall-e-3') {
        return {
            supportedAspectRatios: ['1:1', '16:9', '9:16'],
            supportedResolutions: [],
            supportedThinkingLevels: [],
            supportedSearchTypes: [],
            supportsQuality: true,
            supportsSize: false,
            supportsOutputFormat: false,
        };
    }

    // 7. DALL-E 2
    if (normalized === 'dall-e-2') {
        return {
            supportedAspectRatios: [],
            supportedResolutions: [],
            supportedThinkingLevels: [],
            supportedSearchTypes: [],
            supportsQuality: false,
            supportsSize: true,
            supportsOutputFormat: false,
        };
    }

    // Default fallback (e.g. Imagen 4 / 3)
    return {
        supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        supportedResolutions: [],
        supportedThinkingLevels: [],
        supportedSearchTypes: [],
        supportsQuality: false,
        supportsSize: false,
        supportsOutputFormat: false,
    };
};

export const getImageModelOptions = (includeOpenAi: boolean = true): ImageModelOption[] => {
    if (includeOpenAi) {
        return [...GOOGLE_IMAGE_MODELS, ...OPENAI_IMAGE_MODELS];
    }
    return GOOGLE_IMAGE_MODELS;
};

export const getImageEditorModelOptions = (includeOpenAi: boolean = true): ImageModelOption[] => {
    // Specifically ignore legacy Imagen and DALL-E models for Image Editor as requested
    const googleModels = IMAGE_EDITOR_GOOGLE_MODELS.filter(m => !m.value.startsWith('imagen-') && !m.value.startsWith('dall-e'));
    if (includeOpenAi) {
        const openAiModels = IMAGE_EDITOR_OPENAI_MODELS.filter(m => !m.value.startsWith('imagen-') && !m.value.startsWith('dall-e'));
        return [...googleModels, ...openAiModels];
    }
    return googleModels;
};

export const isImageEditorModel = (modelId?: string): boolean => {
    if (!modelId) return false;
    const all = getImageEditorModelOptions(true);
    return all.some(m => m.value === modelId);
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


// Google Flash and Pro models
export const GOOGLE_FLASH_MODELS: ModelOption[] = [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Next-gen ultra-fast multimodal reasoning model', tier: 'flash', provider: 'google' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Next-gen hybrid reasoning & high-speed model', tier: 'flash', provider: 'google' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Ultra-fast & intelligent Flash model (Default)', tier: 'flash', provider: 'google' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Advanced Flash model with enhanced multimodal performance', tier: 'flash', provider: 'google' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Ultra lightweight, cost-efficient, and fast', tier: 'flash', provider: 'google' },
];

export const OPENAI_FLASH_MODELS: ModelOption[] = [
    { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol (OpenAI)', description: '⚡ Оптимальный баланс: near-Astra интеллект по доступной цене ($2/$10 за 1M, 1.05M ctx)', tier: 'flash', provider: 'openai' },
    { id: 'gpt-6-luna', name: 'GPT-6 Luna (OpenAI)', description: '💰 Сверхбыстрая и экономичная модель для массовых задач ($0.10/$0.50 за 1M, 1.05M ctx)', tier: 'flash', provider: 'openai' },
    { id: 'o3-mini', name: 'o3-mini (OpenAI)', description: 'Высокоскоростной специализированный reasoning для кода, математики и STEM', tier: 'flash', provider: 'openai' },
];

export const GOOGLE_PRO_MODELS: ModelOption[] = [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Highest intelligence & complex reasoning (Default)', tier: 'pro', provider: 'google' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview', description: 'Advanced reasoning and large context', tier: 'pro', provider: 'google' },
];

export const OPENAI_PRO_MODELS: ModelOption[] = [
    { id: 'gpt-6-astra', name: 'GPT-6 Astra (OpenAI)', description: '🏆 Максимальное качество и глубокий reasoning. Флагман линейки GPT-6 ($10/$50 за 1M, 1.05M ctx, 128K out)', tier: 'pro', provider: 'openai' },
    { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol (OpenAI)', description: '⚡ Near-Astra интеллект: идеален для сложного 3D/Turnaround анализа и деконструкции промптов', tier: 'pro', provider: 'openai' },
    { id: 'o3', name: 'o3 (OpenAI)', description: 'Фронтирный глубокий логический reasoning с настраиваемым chain-of-thought', tier: 'pro', provider: 'openai' },
];

export const DEFAULT_FLASH_MODELS: ModelOption[] = [
    ...GOOGLE_FLASH_MODELS,
    ...OPENAI_FLASH_MODELS
];

export const DEFAULT_PRO_MODELS: ModelOption[] = [
    ...GOOGLE_PRO_MODELS,
    ...OPENAI_PRO_MODELS
];

export const DEFAULT_CONFIG = {
    flashModel: 'gemini-3.6-flash',
    proModel: 'gemini-3.1-pro-preview',
    transcribeModel: 'gemini-3.8-flash',
    videoModel: 'gemini-omni-1.1-flash',
    imageModel: 'imagen-4.0-generate-001',
    imageEditorModel: 'gemini-3-pro-image-preview',
};

export const DEFAULT_TRANSCRIBE_MODELS: ModelOption[] = [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Multimodal Audio)', description: 'Fast, highly accurate speech recognition for all languages (Default)', tier: 'flash' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Ultra-fast speech & audio transcription', tier: 'flash' },
    { id: 'gemini-3.5-transcribe', name: 'Gemini 3.5 Transcribe', description: 'Audio & Speech Transcription Model', tier: 'flash' },
];

export interface VideoModelOption {
    id: string;
    name: string;
    description: string;
    isOmni?: boolean;
    provider?: 'google' | 'openai';
    tier?: LLMMode;
    supportedAspectRatios?: string[];
    supportedResolutions?: string[];
    supportedDurations?: string[];
}

export const DEFAULT_VIDEO_MODELS: VideoModelOption[] = [
    { 
        id: 'gemini-omni-1.1-flash', 
        name: 'Gemini Omni 1.1 Flash (Interactions / Video, Audio, Multimodal)', 
        description: 'Newest multimodal video generator via Interactions API. Supports text-to-video, image-to-video, animation & video editing.', 
        isOmni: true,
        provider: 'google',
        tier: 'flash',
        supportedAspectRatios: ['16:9', '9:16', '1:1'],
        supportedResolutions: ['720p', '1080p'],
        supportedDurations: ['5s', '10s']
    },
    { 
        id: 'veo-2.0-generate-001', 
        name: 'Veo 2.0 (High Quality)', 
        description: 'Google Veo high-definition video generation model.', 
        isOmni: false,
        provider: 'google',
        tier: 'pro',
        supportedAspectRatios: ['16:9', '9:16'],
        supportedResolutions: ['720p', '1080p'],
        supportedDurations: ['5s']
    },
    { 
        id: 'veo-3.1-fast-generate-preview', 
        name: 'Veo 3.1 Fast Preview', 
        description: 'Fast preview video generation model.', 
        isOmni: false,
        provider: 'google',
        tier: 'flash',
        supportedAspectRatios: ['16:9', '9:16'],
        supportedResolutions: ['720p'],
        supportedDurations: ['5s']
    },
    { 
        id: 'veo-2.0-generate-preview-01-15', 
        name: 'Veo 2.0 Preview', 
        description: 'Veo experimental preview model.', 
        isOmni: false,
        provider: 'google',
        tier: 'flash',
        supportedAspectRatios: ['16:9', '9:16'],
        supportedResolutions: ['720p', '1080p'],
        supportedDurations: ['5s']
    }
];

export const STORAGE_KEY_FLASH_MODEL = 'settings_llm_flash_model';
export const STORAGE_KEY_PRO_MODEL = 'settings_llm_pro_model';
export const STORAGE_KEY_TRANSCRIBE_MODEL = 'settings_llm_transcribe_model';
export const STORAGE_KEY_VIDEO_MODEL = 'settings_llm_video_model';
export const STORAGE_KEY_IMAGE_MODEL = 'settings_image_model';
export const STORAGE_KEY_IMAGE_EDITOR_MODEL = 'settings_image_editor_model';
export const STORAGE_KEY_CUSTOM_MODELS = 'settings_llm_custom_models';

export const LLM_CONFIG_CHANGE_EVENT = 'llm-models-config-changed';

/**
 * Get all available Flash models (built-in + user added)
 */
export const getAvailableFlashModels = (includeOpenAi: boolean = true): ModelOption[] => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const customFlash = custom.filter(m => m.tier === 'flash');
        const customIds = new Set(customFlash.map(m => m.id));
        const base = (includeOpenAi || isOpenAiTextModel(getConfiguredFlashModel()))
            ? [...GOOGLE_FLASH_MODELS, ...OPENAI_FLASH_MODELS]
            : GOOGLE_FLASH_MODELS;
        return [...base.filter(m => !customIds.has(m.id)), ...customFlash];
    } catch {
        return includeOpenAi ? [...GOOGLE_FLASH_MODELS, ...OPENAI_FLASH_MODELS] : GOOGLE_FLASH_MODELS;
    }
};

/**
 * Get all available Pro models (built-in + user added)
 */
export const getAvailableProModels = (includeOpenAi: boolean = true): ModelOption[] => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const customPro = custom.filter(m => m.tier === 'pro');
        const customIds = new Set(customPro.map(m => m.id));
        const base = (includeOpenAi || isOpenAiTextModel(getConfiguredProModel()))
            ? [...GOOGLE_PRO_MODELS, ...OPENAI_PRO_MODELS]
            : GOOGLE_PRO_MODELS;
        return [...base.filter(m => !customIds.has(m.id)), ...customPro];
    } catch {
        return includeOpenAi ? [...GOOGLE_PRO_MODELS, ...OPENAI_PRO_MODELS] : GOOGLE_PRO_MODELS;
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
            const trimmed = saved.trim();
            const deprecated = [
                'gemini-1.5-flash',
                'gemini-2.0-flash',
                'gemini-2.0-flash-lite',
                'gemini-2.5-flash',
                'gemini-3-flash-preview',
            ];
            if (!deprecated.includes(trimmed)) {
                return trimmed;
            }
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
            const trimmed = saved.trim();
            const deprecated = [
                'gemini-1.5-pro',
                'gemini-2.0-pro',
                'gemini-2.5-pro',
            ];
            if (!deprecated.includes(trimmed)) {
                return trimmed;
            }
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
 * Get all available audio transcription models
 */
export const getAvailableTranscribeModels = (): ModelOption[] => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const customTranscribe = custom.filter(m => m.id.includes('transcribe'));
        const customIds = new Set(customTranscribe.map(m => m.id));
        return [...DEFAULT_TRANSCRIBE_MODELS.filter(m => !customIds.has(m.id)), ...customTranscribe];
    } catch {
        return DEFAULT_TRANSCRIBE_MODELS;
    }
};

/**
 * Get the currently configured audio transcription model ID
 */
export const getConfiguredTranscribeModel = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_TRANSCRIBE_MODEL);
        if (saved && saved.trim()) {
            return saved.trim();
        }
    } catch {}
    return DEFAULT_CONFIG.transcribeModel;
};

/**
 * Set the audio transcription model ID
 */
export const setConfiguredTranscribeModel = (modelId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRANSCRIBE_MODEL, modelId.trim());
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to save transcribe model', e);
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

    // Direct OpenAI text model identifier - return as-is
    if (isOpenAiTextModel(trimmed)) {
        return trimmed;
    }

    // Transcribe model aliases
    if (trimmed === 'gemini-3.5-transcribe' || trimmed === 'transcribe' || trimmed === 'audio-transcribe') {
        return getConfiguredTranscribeModel();
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
    const available = mode === 'pro' ? getAvailableProModels(true) : getAvailableFlashModels(true);
    const found = available.find(m => m.id === modelId);
    return found ? found.name : modelId;
};

/**
 * Get all available video generation models
 */
export const getAvailableVideoModels = (): VideoModelOption[] => {
    try {
        const custom: ModelOption[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS) || '[]');
        const customVideo = custom.filter(m => m.id.includes('video') || m.id.includes('veo') || m.id.includes('omni'));
        const customIds = new Set(customVideo.map(m => m.id));
        const formattedCustom: VideoModelOption[] = customVideo.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            isOmni: m.id.includes('omni'),
            provider: 'google',
            tier: m.tier
        }));
        return [...DEFAULT_VIDEO_MODELS.filter(m => !customIds.has(m.id)), ...formattedCustom];
    } catch {
        return DEFAULT_VIDEO_MODELS;
    }
};

/**
 * Get the currently configured default video model ID
 */
export const getConfiguredVideoModel = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_VIDEO_MODEL);
        if (saved && saved.trim()) {
            return saved.trim();
        }
    } catch {}
    return DEFAULT_CONFIG.videoModel;
};

/**
 * Set the default video model ID
 */
export const setConfiguredVideoModel = (modelId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_VIDEO_MODEL, modelId.trim());
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to save video model', e);
    }
};

/**
 * Check if a model is an Omni model (requiring Interactions API)
 */
export const isOmniModel = (model?: string): boolean => {
    if (!model) return false;
    const lower = model.toLowerCase().trim();
    return lower.includes('omni') || lower === 'gemini-omni-1.1-flash' || lower.startsWith('gemini-omni');
};

/**
 * Get human-readable label for a video model
 */
export const getVideoModelLabel = (modelId?: string): string => {
    const id = modelId || getConfiguredVideoModel();
    const available = getAvailableVideoModels();
    const found = available.find(m => m.id === id);
    return found ? found.name : id;
};

/**
 * Get video model options for node dropdowns
 */
export const getVideoModelOptions = (): VideoModelOption[] => {
    return getAvailableVideoModels();
};

/**
 * Get the currently configured default Image model ID (for Image Output & Character Cards)
 */
export const getConfiguredImageModel = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_IMAGE_MODEL);
        if (saved && saved.trim()) {
            return normalizeImageModelId(saved);
        }
    } catch {}
    return DEFAULT_CONFIG.imageModel;
};

/**
 * Set the default Image model ID
 */
export const setConfiguredImageModel = (modelId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_IMAGE_MODEL, normalizeImageModelId(modelId));
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to save image model', e);
    }
};

/**
 * Get human-readable label for an Image Generation model
 */
export const getImageModelLabel = (modelId?: string): string => {
    const id = normalizeImageModelId(modelId) || getConfiguredImageModel();
    const available = getImageModelOptions(true);
    const found = available.find(m => m.value === id);
    return found ? found.label : id;
};

/**
 * Resolve an image generation model: returns the configured default if not specified
 */
export const resolveImageModel = (modelId?: string): string => {
    if (modelId && modelId.trim()) {
        return normalizeImageModelId(modelId);
    }
    return getConfiguredImageModel();
};

/**
 * Get the currently configured default AI Image Editor model ID
 */
export const getConfiguredImageEditorModel = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_IMAGE_EDITOR_MODEL);
        if (saved && saved.trim()) {
            const normalized = normalizeImageModelId(saved);
            // Check if saved model is valid for editor (must not be legacy imagen or dall-e)
            if (!normalized.startsWith('imagen-') && !normalized.startsWith('dall-e')) {
                return normalized;
            }
        }
    } catch {}
    return DEFAULT_CONFIG.imageEditorModel;
};

/**
 * Set the default AI Image Editor model ID
 */
export const setConfiguredImageEditorModel = (modelId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_IMAGE_EDITOR_MODEL, normalizeImageModelId(modelId));
        notifyModelConfigChanged();
    } catch (e) {
        console.error('Failed to save image editor model', e);
    }
};

/**
 * Get human-readable label for an AI Image Editor model
 */
export const getImageEditorModelLabel = (modelId?: string): string => {
    const id = normalizeImageModelId(modelId) || getConfiguredImageEditorModel();
    const available = getImageEditorModelOptions(true);
    const found = available.find(m => m.value === id);
    return found ? found.label : id;
};

/**
 * Resolve an image editor model: filters out legacy imagen & dall-e and falls back to configured editor model
 */
export const resolveImageEditorModel = (modelId?: string): string => {
    if (modelId && modelId.trim() && !modelId.startsWith('imagen-') && !modelId.startsWith('dall-e')) {
        return normalizeImageModelId(modelId);
    }
    return getConfiguredImageEditorModel();
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
                transcribeModel: getConfiguredTranscribeModel(),
                videoModel: getConfiguredVideoModel(),
                imageModel: getConfiguredImageModel(),
                imageEditorModel: getConfiguredImageEditorModel(),
            }
        }));
    }
};
