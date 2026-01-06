
import { NodeProcessor } from './types';
import { enhancePrompt, sanitizePrompt, enhanceVideoPrompt, translateText } from '../geminiService';

export const processPromptProcessor: NodeProcessor = async ({ node, upstreamData }) => {
    let texts = upstreamData.filter(v => typeof v === 'string') as string[];
    
    let parsed: any = {};
    let safePrompt = true;
    // Added technicalPrompt extraction from node value
    let technicalPrompt = false;
    try {
        parsed = JSON.parse(node.value || '{}');
        if (typeof parsed === 'object' && parsed !== null) {
            safePrompt = parsed.safePrompt !== false;
            // Extract technicalPrompt state
            technicalPrompt = parsed.technicalPrompt === true;
        }
    } catch {}

    // Fallback to internal input if no upstream connection
    if (texts.length === 0 && parsed.inputPrompt) {
        texts = [parsed.inputPrompt];
    }
    
    // Fix: Pass technicalPrompt as the third argument to match enhancePrompt signature
    const enhanced = await enhancePrompt(texts, safePrompt, technicalPrompt);
    
    return {
        value: { ...parsed, prompt: enhanced, safePrompt: safePrompt, technicalPrompt: technicalPrompt }
    };
};

export const processPromptSanitizer: NodeProcessor = async ({ upstreamData }) => {
    const texts = upstreamData.filter(v => typeof v === 'string') as string[];
    // Sanitizer is usually simple pass-through/transform, assume direct connection
    // If we wanted internal input, we'd need to change Node UI too. Keeping strictly connection-based or use TextInput node before it.
    const result = await sanitizePrompt(texts.join(', '));
    return { value: result };
};

export const processVideoPromptProcessor: NodeProcessor = async ({ node, upstreamData }) => {
    let texts = upstreamData.filter(v => typeof v === 'string') as string[];
    
    let parsed: any = {};
    try {
        parsed = JSON.parse(node.value || '{}');
    } catch {}

    // Fallback to internal input
    if (texts.length === 0 && parsed.inputPrompt) {
        texts = [parsed.inputPrompt];
    }

    const result = await enhanceVideoPrompt(texts);
    // Persist inputPrompt and other state
    return { value: { ...parsed, prompt: result } };
};

export const processTranslator: NodeProcessor = async ({ node, upstreamData }) => {
    const parsed = JSON.parse(node.value || '{}');
    const upstreamTexts = upstreamData.filter(v => typeof v === 'string') as string[];
    const textToTranslate = upstreamTexts.length > 0 ? upstreamTexts.join('\n') : parsed.inputText;
    const targetLanguage = parsed.targetLanguage || 'en';
    
    const translatedText = await translateText(textToTranslate, targetLanguage);
    
    return {
        value: { ...parsed, inputText: textToTranslate, translatedText }
    };
};
