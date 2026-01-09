
import { NodeProcessor } from './types';
import { generateScript, generateCharacters, modifyPromptSequence } from '../geminiService';

export const processScriptGenerator: NodeProcessor = async ({ node, upstreamData }) => {
    const initialParsed = JSON.parse(node.value || '{}');
    const texts = upstreamData.filter(v => typeof v === 'string') as string[];
    const prompt = texts.length > 0 ? texts.join('\n') : initialParsed.prompt;
    const targetLanguage = initialParsed.targetLanguage || 'en';
    
    const scriptData = await generateScript(prompt, targetLanguage);
    
    return {
        value: { ...initialParsed, ...scriptData, prompt, type: 'script-generator-data' }
    };
};

export const processCharacterGenerator: NodeProcessor = async ({ node, upstreamData }) => {
    const initialParsed = JSON.parse(node.value || '{}');
    const texts = upstreamData.filter(v => typeof v === 'string') as string[];
    const prompt = texts.length > 0 ? texts.join('\n') : initialParsed.prompt;
    
    const newCharacters = await generateCharacters(prompt);
    const combinedCharacters = [...(initialParsed.characters || []), ...newCharacters];
    
    return {
        value: { ...initialParsed, characters: combinedCharacters, prompt }
    };
};

export const processPromptSequenceEditor: NodeProcessor = async ({ node }) => {
    const { 
        instruction, 
        sourcePrompts = [], 
        checkedSourceFrameNumbers = [],
        targetLanguage = 'en',
        modificationModel = 'gemini-3-flash-preview',
        includeVideoPrompts = false,
        checkedContextScenes = [],
        sceneContexts = {}
    } = JSON.parse(node.value || '{}');
    
    if (!instruction?.trim()) throw new Error("Modification instruction is empty.");
    if (checkedSourceFrameNumbers.length === 0) throw new Error("No source prompts selected for modification.");
    
    const promptsToModify = sourcePrompts.filter((p: any) => checkedSourceFrameNumbers.includes(p.frameNumber));
    if (promptsToModify.length === 0) throw new Error("Selected prompts not found.");
    
    // Prepare Contexts to send
    let contextsToSend: Record<string, string> = {};
    const distinctScenes = new Set(promptsToModify.map((p: any) => p.sceneNumber));
    distinctScenes.forEach((sceneNum: any) => {
        if (sceneContexts[sceneNum] && checkedContextScenes.includes(sceneNum)) {
                contextsToSend[String(sceneNum)] = sceneContexts[sceneNum];
        }
    });

    const { modifiedFrames, modifiedSceneContexts } = await modifyPromptSequence(
        promptsToModify, 
        instruction,
        targetLanguage,
        modificationModel,
        includeVideoPrompts,
        contextsToSend
    );
    
    const currentVal = JSON.parse(node.value || '{}');
    const existingModified = currentVal.modifiedPrompts || [];
    const modifiedMap = new Map(existingModified.map((p: any) => [p.frameNumber, p]));
    
    // Create a lookup map for source prompts to easily retrieve original data like videoPrompt and sceneTitle
    const sourceMap = new Map(sourcePrompts.map((p: any) => [p.frameNumber, p]));

    modifiedFrames.forEach((newPrompt: any) => {
        // Retrieve original prompt to copy static fields like videoPrompt and sceneTitle if the API didn't return them
        const original = sourceMap.get(newPrompt.frameNumber) as any;
        if (original) {
            // Ensure videoPrompt is preserved from source if not present in API response
            if (!newPrompt.videoPrompt && original.videoPrompt) {
                newPrompt.videoPrompt = original.videoPrompt;
            }
            // Ensure sceneTitle is preserved
            if (!newPrompt.sceneTitle && original.sceneTitle) {
                newPrompt.sceneTitle = original.sceneTitle;
            }
            // Ensure sceneNumber is preserved if missing
             if (!newPrompt.sceneNumber && original.sceneNumber) {
                newPrompt.sceneNumber = original.sceneNumber;
            }
            // Ensure shotType is preserved if missing or was not modified by the AI
            if (!newPrompt.shotType && original.shotType) {
                newPrompt.shotType = original.shotType;
            }
        }
        modifiedMap.set(newPrompt.frameNumber, newPrompt);
    });
    
    // Update Scene Contexts if returned
    let newModifiedSceneContexts = { ...(currentVal.modifiedSceneContexts || {}) };
    if (modifiedSceneContexts && modifiedSceneContexts.length > 0) {
        modifiedSceneContexts.forEach((item: any) => {
            if (item.sceneNumber && item.context) {
                newModifiedSceneContexts[String(item.sceneNumber)] = item.context;
            }
        });
    }

    return {
        value: { 
            ...currentVal, 
            modifiedPrompts: Array.from(modifiedMap.values()),
            modifiedSceneContexts: newModifiedSceneContexts
        }
    };
};
