
import { NodeProcessor } from './types';
import { enhancePrompt, sanitizePrompt, enhanceVideoPrompt, translateText, extractTextFromImage } from '../geminiService';

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
    let textToTranslate = upstreamTexts.length > 0 ? upstreamTexts.join('\n') : parsed.inputText;
    const targetLanguage = parsed.targetLanguage || 'en';
    
    // Check for image to OCR
    if (parsed.image && typeof parsed.image === 'string' && parsed.image.startsWith('data:image')) {
         const parts = parsed.image.split(',');
         if (parts.length === 2) {
             const mimeMatch = parsed.image.match(/:(.*?);/);
             const mime = mimeMatch ? mimeMatch[1] : 'image/png';
             const base64 = parts[1];
             
             // Perform OCR
             const extractedText = await extractTextFromImage(base64, mime);
             if (extractedText && extractedText !== "No text found") {
                 textToTranslate = extractedText;
                 // Update parsed input text to reflect what was extracted
                 parsed.inputText = extractedText;
             }
         }
    }

    const translatedText = await translateText(textToTranslate, targetLanguage);
    
    return {
        value: { ...parsed, inputText: textToTranslate, translatedText }
    };
};
