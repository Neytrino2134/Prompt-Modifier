
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
        sceneContexts = {},
        modifiedSceneContexts = {} // Get local modified contexts
    } = JSON.parse(node.value || '{}');
    
    if (!instruction?.trim()) throw new Error("Modification instruction is empty.");
    if (checkedSourceFrameNumbers.length === 0) throw new Error("No source prompts selected for modification.");
    
    const promptsToModify = sourcePrompts.filter((p: any) => checkedSourceFrameNumbers.includes(p.frameNumber));
    if (promptsToModify.length === 0) throw new Error("Selected prompts not found.");
    
    // Prepare Contexts to send (Merged Source + Modified)
    // AI receives the *current visible state* to modify further or use as context
    let contextsToSend: Record<string, string> = {};
    
    // Merge: Modified overrides Source
    const mergedContexts = { ...sceneContexts, ...modifiedSceneContexts };

    const distinctScenes = new Set(promptsToModify.map((p: any) => p.sceneNumber));
    distinctScenes.forEach((sceneNum: any) => {
        if (mergedContexts[sceneNum] && checkedContextScenes.includes(sceneNum)) {
                contextsToSend[String(sceneNum)] = mergedContexts[sceneNum];
        }
    });

    const { modifiedFrames, modifiedSceneContexts: newAiModifiedContexts } = await modifyPromptSequence(
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
        // Retrieve original prompt to copy static fields like videoPrompt and sceneTitle if the AI didn't return them
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
    let updatedModifiedSceneContexts = { ...modifiedSceneContexts };
    if (newAiModifiedContexts && newAiModifiedContexts.length > 0) {
        newAiModifiedContexts.forEach((item: any) => {
            if (item.sceneNumber && item.context) {
                updatedModifiedSceneContexts[String(item.sceneNumber)] = item.context;
            }
        });
    }
    
    // IMPORTANT: When generating the final value for the node, we must construct the output object
    // such that downstream nodes (ImageSequenceGenerator) see the "final" merged contexts.
    // However, the node state MUST keep them separate to allow further editing and UI distinction.
    // The processor returns the updated NODE STATE.
    // But downstream nodes read `node.value`. 
    // So `node.value` must contain `sceneContexts` and `modifiedSceneContexts` separately,
    // and the downstream node is responsible for merging them.
    // See ImageSequenceGeneratorNode.tsx: calculateUpstreamUpdates update.

    return {
        value: { 
            ...currentVal, 
            modifiedPrompts: Array.from(modifiedMap.values()),
            modifiedSceneContexts: updatedModifiedSceneContexts
        }
    };
};
