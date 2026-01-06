
import { NodeProcessor } from './types';
import { analyzePrompt, analyzeCharacter, describeImage } from '../geminiService';

export const processPromptAnalyzer: NodeProcessor = async ({ node, upstreamData }) => {
    const texts = upstreamData.filter(v => typeof v === 'string') as string[];
    const softPrompt = JSON.parse(node.value || '{}').softPrompt || false;
    const analysis = await analyzePrompt(texts.join(', '), softPrompt);
    
    // Merge with existing value to preserve settings not returned by API
    const currentVal = JSON.parse(node.value || '{}');
    return { value: { ...currentVal, ...analysis } };
};

export const processCharacterAnalyzer: NodeProcessor = async ({ upstreamData }) => {
    const texts = upstreamData.filter(v => typeof v === 'string') as string[];
    const result = await analyzeCharacter(texts.join(', '));
    return { value: result };
};

export const processImageAnalyzer: NodeProcessor = async ({ node, upstreamData }) => {
    const imageInput = upstreamData.find(v => typeof v === 'object') as { base64ImageData: string, mimeType: string } | undefined;
    if (!imageInput) throw new Error("No image provided to analyzer.");
    
    const currentVal = JSON.parse(node.value || '{}');
    const softPrompt = currentVal.softPrompt || false;
    
    const description = await describeImage(imageInput.base64ImageData, imageInput.mimeType, softPrompt);
    
    return { value: { ...currentVal, description } };
};
