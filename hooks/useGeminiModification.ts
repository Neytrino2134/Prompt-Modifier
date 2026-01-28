







/* Fix: Added missing React import to resolve namespace errors */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeType, type Node, type Tab, type ActiveOperation, type ToastType } from '../types';
import { enhancePrompt, enhanceVideoPrompt, translateText, generateScript, generateCharacters, sanitizePrompt, translateScript, modifyPromptSequence, updateCharacterDescription, modifyCharacter, extractTextFromImage, updateCharacterPersonality, updateCharacterSection } from '../services/geminiService';
import { languages } from '../localization';

interface UseGeminiModificationProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    setError: (error: string | null) => void;
    t: (key: string) => string;
    activeTabId: string;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTabName: string;
    registerOperation: (op: ActiveOperation) => void;
    unregisterOperation: (id: string) => void;
    addToast: (message: string, type?: ToastType) => void;
}

export const useGeminiModification = ({ nodes, setNodes, getUpstreamNodeValues, setError, t, activeTabId, setTabs, activeTabName, registerOperation, unregisterOperation, addToast }: UseGeminiModificationProps) => {
    const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
    const [isEnhancingVideo, setIsEnhancingVideo] = useState<string | null>(null);
    const [isSanitizing, setIsSanitizing] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const [isTranslatingScript, setIsTranslatingScript] = useState<string | null>(null);
    const [isGeneratingScript, setIsGeneratingScript] = useState<string | null>(null);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState<string | null>(null);
    const [isModifyingPromptSequence, setIsModifyingPromptSequence] = useState<string | null>(null);
    const [isUpdatingDescription, setIsUpdatingDescription] = useState<string | null>(null);
    const [isUpdatingPersonality, setIsUpdatingPersonality] = useState<string | null>(null);
    const [isUpdatingAppearance, setIsUpdatingAppearance] = useState<string | null>(null);
    const [isUpdatingClothing, setIsUpdatingClothing] = useState<string | null>(null);
    const [isModifyingCharacter, setIsModifyingCharacter] = useState<string | null>(null);
    const [isStopping, setIsStopping] = useState(false);
    const charGenAbortController = useRef<AbortController | null>(null);

    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => {
        activeTabIdRef.current = activeTabId;
    }, [activeTabId]);

    const updateNodeInStorage = useCallback((targetTabId: string, nodeId: string, valueUpdater: (prevVal: any) => any) => {
        const safeParse = (val: string) => {
            try { 
                const parsed = JSON.parse(val || '{}');
                return parsed;
            } catch { return val; } 
        };

        if (activeTabIdRef.current === targetTabId) {
            setNodes(nds => nds.map(n => {
                if (n.id === nodeId) {
                    const currentVal = safeParse(n.value);
                    const newVal = valueUpdater(currentVal);
                    const finalValue = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);
                    return { ...n, value: finalValue };
                }
                return n;
            }));
        } else {
            setTabs(prevTabs => prevTabs.map(tab => {
                if (tab.id === targetTabId) {
                    const newNodes = tab.state.nodes.map(n => {
                        if (n.id === nodeId) {
                            const currentVal = safeParse(n.value);
                            const newVal = valueUpdater(currentVal);
                            const finalValue = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);
                            return { ...n, value: finalValue };
                        }
                        return n;
                    });
                    return { ...tab, state: { ...tab.state, nodes: newNodes }};
                }
                return tab;
            }));
        }
    }, [setNodes, setTabs]);


    const handleEnhance = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsEnhancing(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.enhancing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            
            let parsedValue: any;
            try {
                parsedValue = JSON.parse(node.value || '{}');
            } catch {
                parsedValue = { prompt: node.value };
            }
            
            const safePrompt = parsedValue.safePrompt !== false;
            const technicalPrompt = parsedValue.technicalPrompt === true;
            const model = parsedValue.model || 'gemini-3-flash-preview';

            let texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            if (texts.length === 0 && parsedValue.inputPrompt) {
                texts = [parsedValue.inputPrompt];
            }

            const enhanced = await enhancePrompt(texts, safePrompt, technicalPrompt, model);
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => ({ 
                ...prev, 
                prompt: enhanced
            }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsEnhancing(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleSanitizePrompt = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsSanitizing(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.sanitizing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const sanitized = await sanitizePrompt(texts.join(', '));
            updateNodeInStorage(currentTabId, nodeId, () => sanitized);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSanitizing(null);
            unregisterOperation(nodeId);
        }
    }, [getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);
    
    const handleEnhanceVideo = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsEnhancingVideo(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.enhancing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const enhanced = await enhanceVideoPrompt(texts);
            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                if (typeof prev === 'object') return { ...prev, prompt: enhanced };
                return enhanced;
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsEnhancingVideo(null);
            unregisterOperation(nodeId);
        }
    }, [getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleTranslate = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsTranslating(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.translating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const initialParsed = JSON.parse(node.value || '{}');
            const upstreamTexts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            let textToTranslate = upstreamTexts.length > 0 ? upstreamTexts.join('\n') : initialParsed.inputText;
            const targetLanguage = initialParsed.targetLanguage || 'en';

            // Check if there is an image to extract text from (OCR)
            if (initialParsed.image && typeof initialParsed.image === 'string' && initialParsed.image.startsWith('data:image')) {
                 const parts = initialParsed.image.split(',');
                 if (parts.length === 2) {
                     const mimeMatch = initialParsed.image.match(/:(.*?);/);
                     const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                     const base64 = parts[1];
                     
                     // Perform OCR
                     const extractedText = await extractTextFromImage(base64, mime);
                     if (extractedText && extractedText !== "No text found") {
                         textToTranslate = extractedText;
                         // Update parsed input text to reflect what was extracted
                         initialParsed.inputText = extractedText;
                     }
                 }
            }
            
            const translatedText = await translateText(textToTranslate, targetLanguage);
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, inputText: textToTranslate, translatedText }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsTranslating(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);
    
    const handleTranslateScript = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsTranslatingScript(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.translating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const scriptData = JSON.parse(node.value || '{}');
            const targetLanguage = scriptData.targetLanguage || 'en';
            
            const langMap: { [key: string]: string } = { 'en': 'English', 'ru': 'Russian' };
            const targetLanguageName = langMap[targetLanguage] || 'English';
    
            const translatedScript = await translateScript(scriptData, targetLanguageName);
    
            updateNodeInStorage(currentTabId, nodeId, () => {
                translatedScript.targetLanguage = targetLanguage;
                return translatedScript;
            });

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsTranslatingScript(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleGenerateScript = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsGeneratingScript(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const initialParsed = JSON.parse(node.value || '{}');
            const upstreamTexts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const prompt = upstreamTexts.length > 0 ? upstreamTexts.join('\n') : initialParsed.prompt;
            const targetLanguage = initialParsed.targetLanguage || 'en';
            
            const scriptData = await generateScript(prompt, targetLanguage);
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, ...scriptData, prompt, type: 'script-generator-data' }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGeneratingScript(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);
    
    const handleGenerateCharacters = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsGeneratingCharacters(nodeId);
        setError(null);
        charGenAbortController.current = new AbortController();
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const initialParsed = JSON.parse(node.value || '{}');
            const upstreamTexts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const prompt = upstreamTexts.length > 0 ? upstreamTexts.join('\n') : initialParsed.prompt;
            const numberOfCharacters = initialParsed.numberOfCharacters || 1;
            const targetLanguage = initialParsed.targetLanguage || 'ru';
            const characterType = initialParsed.characterType || 'simple';
            const style = initialParsed.style || 'simple';
            const customStyle = initialParsed.customStyle || '';
            const existingCharacters = initialParsed.characters || [];

            // Explicitly map target language to English header names to avoid parsing issues
            // We ask Gemini to use English Headers "Appearance, Personality, Clothing" but write CONTENT in target language
            // This is safer for the regex parser in the UI.
            
            const instruction = `Generate ${numberOfCharacters} detailed character description(s) based on this prompt: "${prompt}". 
            Language for CONTENT: ${targetLanguage}. 
            Character Type: ${characterType}. 
            Visual Style: ${style === 'custom' ? customStyle : style}.
            
            **CRITICAL REQUIREMENTS:**
            1. **APPEARANCE ONLY**: Focus strictly on physical attributes: physiognomy, hair/fur texture, eye color, body type, clothing details, colors, and materials.
            2. **NEGATIVE CONSTRAINTS**: Do NOT describe the pose, action, gesture, expression (e.g. smiling), background, lighting, or camera angle.
            3. **FORMAT**: You MUST use the following English Markdown Headers exactly as written, regardless of content language:
               #### Appearance
               #### Personality
               #### Clothing
            
            REQUIRED OUTPUT FORMAT:
            Return a JSON array where each object has:
            - 'name': Character name.
            - 'index': Short identifier (e.g. Entity-1, Entity-2).
            - 'imagePrompt': A highly detailed English image generation prompt describing the character's visual features ONLY.
            - 'fullDescription': A detailed text description formatted with the markdown headers specified above.
            `;

            const newCharacters = await generateCharacters(instruction);
            
            if (charGenAbortController.current?.signal.aborted) return;

            let maxIndex = 0;
            existingCharacters.forEach((c: any) => {
                const idStr = c.index || c.alias || '';
                // Updated regex to catch Entity- (or legacy Character-)
                const match = idStr.match(/(?:Entity|Character)-(\d+)/i);
                if (match) {
                    maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
                }
            });

            const charsWithIds = newCharacters.map((c: any, index: number) => ({
                id: `char-${Date.now()}-${index}`,
                ...c,
                index: c.index || `Entity-${maxIndex + index + 1}`,
                prompt: c.imagePrompt,
            }));

            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                 const currentExisting = prev.characters || [];
                 const combinedCharacters = [...charsWithIds, ...currentExisting];
                 return { ...prev, characters: combinedCharacters, prompt, error: null };
            });

        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setError(e.message);
            }
        } finally {
            setIsGeneratingCharacters(null);
            charGenAbortController.current = null;
            setIsStopping(false);
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleStopGeneration = useCallback(() => {
        if (charGenAbortController.current) {
            setIsStopping(true);
            charGenAbortController.current.abort();
        }
    }, []);

    const onModifyPromptSequence = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsModifyingPromptSequence(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'sequence', description: t('prompt_sequence_editor.modifying'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const { 
                instruction, 
                sourcePrompts = [], 
                checkedSourceFrameNumbers = [],
                targetLanguage = 'en',
                modificationModel = 'gemini-2.5-flash',
                includeVideoPrompts = false,
                checkedContextScenes = [], // Array of scene IDs to include context for
                sceneContexts = {}
            } = JSON.parse(node.value || '{}');

            if (!instruction || !instruction.trim()) {
                throw new Error("Modification instruction is empty.");
            }
            if (!checkedSourceFrameNumbers || checkedSourceFrameNumbers.length === 0) {
                throw new Error("No source prompts selected for modification.");
            }

            const promptsToModify = sourcePrompts.filter((p: any) => checkedSourceFrameNumbers.includes(p.frameNumber));
            
            if (promptsToModify.length === 0) {
                throw new Error("Selected prompts not found in the source list.");
            }
            
            // Build contexts object based on checkedContextScenes array
            // It maps "SceneNumber" -> "ContextText"
            let contextsToSend: Record<string, string> = {};
            const distinctScenes = new Set(promptsToModify.map((p: any) => p.sceneNumber));
            
            distinctScenes.forEach((sceneNum: any) => {
                // If scene context exists AND this scene is checked for context inclusion
                if (sceneContexts[sceneNum] && checkedContextScenes.includes(sceneNum)) {
                     contextsToSend[String(sceneNum)] = sceneContexts[sceneNum];
                }
            });

            const result = await modifyPromptSequence(
                promptsToModify, 
                instruction, 
                targetLanguage, 
                modificationModel, 
                includeVideoPrompts,
                contextsToSend // Pass context map
            );
            
            const { modifiedFrames, modifiedSceneContexts } = result;

            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const existingModified = prev.modifiedPrompts || [];
                const sourcePrompts = prev.sourcePrompts || []; // Get source
                const sourceMap = new Map(sourcePrompts.map((p: any) => [p.frameNumber, p]));
                const modifiedMap = new Map(existingModified.map((p: any) => [p.frameNumber, p]));

                modifiedFrames.forEach((newPrompt: any) => {
                    // Backfill scene info from source to ensure consistency
                    const original = sourceMap.get(newPrompt.frameNumber) as any;
                    if (original) {
                        newPrompt.sceneNumber = original.sceneNumber;
                        newPrompt.sceneTitle = original.sceneTitle;
                    }
                    modifiedMap.set(newPrompt.frameNumber, newPrompt);
                });

                const newModifiedPrompts = Array.from(modifiedMap.values());
                
                // Update Scene Contexts if returned
                let newSceneContexts = { ...(prev.modifiedSceneContexts || {}) }; 
                // Note: We might want to store modified contexts separately from source contexts 
                // in the node state to visualize them on the right panel.
                // Let's assume the node state has a `modifiedSceneContexts` property.
                
                if (modifiedSceneContexts && modifiedSceneContexts.length > 0) {
                    modifiedSceneContexts.forEach((item: any) => {
                        if (item.sceneNumber && item.context) {
                             newSceneContexts[String(item.sceneNumber)] = item.context;
                        }
                    });
                }

                return { ...prev, modifiedPrompts: newModifiedPrompts, modifiedSceneContexts: newSceneContexts };
            });

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsModifyingPromptSequence(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleUpdateCharacterDescription = useCallback(async (nodeId: string, cardIndex: number) => {
        const currentTabId = activeTabIdRef.current;
        const opKey = `${nodeId}-${cardIndex}`;
        setIsUpdatingDescription(opKey);
        setError(null);
        registerOperation({ id: opKey, type: 'generation', description: t('node.content.enhancing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsedArray = JSON.parse(node.value || '[]');
            const characters = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            const charData = characters[cardIndex];
            
            if (!charData) throw new Error("Character card not found at specified index.");

            const imagePrompt = charData.prompt;
            const currentFullDescription = charData.fullDescription;
            const langCode = charData.targetLanguage || (localStorage.getItem('settings_secondaryLanguage') || 'en');
            const targetLanguageName = (languages as any)[langCode]?.name || 'English';

            if (!imagePrompt || !imagePrompt.trim()) throw new Error("Image prompt is missing for this character.");

            const updatedDescription = await updateCharacterDescription(imagePrompt, currentFullDescription, targetLanguageName);
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const next = Array.isArray(prev) ? [...prev] : [prev];
                if (next[cardIndex]) {
                    next[cardIndex] = { ...next[cardIndex], fullDescription: updatedDescription };
                }
                return next;
            });
            
            addToast("Description updated successfully", "success");

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUpdatingDescription(null);
            unregisterOperation(opKey);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, addToast]);

    const handleUpdateCharacterSection = useCallback(async (nodeId: string, cardIndex: number, sectionName: string, stateSetter: React.Dispatch<React.SetStateAction<string | null>>) => {
        const currentTabId = activeTabIdRef.current;
        const opKey = `${nodeId}-${cardIndex}-${sectionName}`;
        stateSetter(opKey);
        setError(null);
        registerOperation({ id: opKey, type: 'generation', description: t('node.content.enhancing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsedArray = JSON.parse(node.value || '[]');
            const characters = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            const charData = characters[cardIndex];
            
            if (!charData) throw new Error("Character card not found at specified index.");

            const imagePrompt = charData.prompt;
            if (!imagePrompt) throw new Error("Image prompt required for update.");
            
            const currentFullDescription = charData.fullDescription || '';
            const langCode = charData.targetLanguage || (localStorage.getItem('settings_secondaryLanguage') || 'en');
            const targetLanguageName = (languages as any)[langCode]?.name || 'English';

            // Extract Current Section
            // Regex tailored to match both localized and English headers
            const sectionRegex = new RegExp(`####\\s*(${sectionName}|${t(`node.content.${sectionName.toLowerCase()}` as any)})\\s*([\\s\\S]*?)(?=####|$)`, 'i');
            const match = sectionRegex.exec(currentFullDescription);
            const currentSectionText = match ? match[2].trim() : '';

            const updatedSectionText = await updateCharacterSection(sectionName, imagePrompt, currentSectionText, targetLanguageName);

            // Replace in full description
            let newFullDescription = currentFullDescription;
            if (match) {
                 const fullMatch = match[0];
                 const header = match[1]; 
                 const newSection = `#### ${header}\n${updatedSectionText}\n`;
                 newFullDescription = currentFullDescription.replace(fullMatch, newSection);
            } else {
                 // Append if not found
                 // Use localized header if available
                 const headerName = t(`node.content.${sectionName.toLowerCase()}` as any) || sectionName;
                 newFullDescription += `\n\n#### ${headerName}\n${updatedSectionText}`;
            }
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const next = Array.isArray(prev) ? [...prev] : [prev];
                if (next[cardIndex]) {
                    next[cardIndex] = { ...next[cardIndex], fullDescription: newFullDescription };
                }
                return next;
            });
            
            addToast(`${sectionName} updated successfully`, "success");

        } catch (e: any) {
            setError(e.message);
        } finally {
            stateSetter(null);
            unregisterOperation(opKey);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, addToast]);

    const handleUpdateCharacterAppearance = useCallback((nodeId: string, cardIndex: number) => {
        handleUpdateCharacterSection(nodeId, cardIndex, 'Appearance', setIsUpdatingAppearance);
    }, [handleUpdateCharacterSection]);

    const handleUpdateCharacterClothing = useCallback((nodeId: string, cardIndex: number) => {
        handleUpdateCharacterSection(nodeId, cardIndex, 'Clothing', setIsUpdatingClothing);
    }, [handleUpdateCharacterSection]);

    const handleUpdateCharacterPersonality = useCallback(async (nodeId: string, cardIndex: number) => {
        const currentTabId = activeTabIdRef.current;
        const opKey = `${nodeId}-${cardIndex}-personality`;
        setIsUpdatingPersonality(opKey);
        setError(null);
        registerOperation({ id: opKey, type: 'generation', description: t('node.content.enhancing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsedArray = JSON.parse(node.value || '[]');
            const characters = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            const charData = characters[cardIndex];
            
            if (!charData) throw new Error("Character card not found at specified index.");

            const currentFullDescription = charData.fullDescription || '';
            const langCode = charData.targetLanguage || (localStorage.getItem('settings_secondaryLanguage') || 'en');
            const targetLanguageName = (languages as any)[langCode]?.name || 'English';

            // Extract Personality Section manually as we don't have the helper here
            // Simple regex for "#### Personality" (or localized) until next header
            const personalityRegex = /####\s*(Personality|Личность|Характер|Personalidad)\s*([\s\S]*?)(?=####|$)/i;
            const match = personalityRegex.exec(currentFullDescription);
            const currentPersonality = match ? match[2].trim() : '';

            if (!currentPersonality) throw new Error("Personality section is empty or not found.");

            const updatedPersonality = await updateCharacterPersonality(currentPersonality, targetLanguageName);

            // Replace in full description
            let newFullDescription = currentFullDescription;
            if (match) {
                 const fullMatch = match[0];
                 const header = match[1]; // Keep original header language
                 const newSection = `#### ${header}\n${updatedPersonality}\n`;
                 newFullDescription = currentFullDescription.replace(fullMatch, newSection);
            } else {
                 newFullDescription += `\n\n#### Personality\n${updatedPersonality}`;
            }
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const next = Array.isArray(prev) ? [...prev] : [prev];
                if (next[cardIndex]) {
                    next[cardIndex] = { ...next[cardIndex], fullDescription: newFullDescription };
                }
                return next;
            });
            
            addToast("Personality updated successfully", "success");

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUpdatingPersonality(null);
            unregisterOperation(opKey);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, addToast]);

    const handleModifyCharacter = useCallback(async (nodeId: string, cardIndex: number, instruction: string) => {
        const currentTabId = activeTabIdRef.current;
        const opKey = `${nodeId}-${cardIndex}`;
        setIsModifyingCharacter(opKey);
        setError(null);
        registerOperation({ id: opKey, type: 'generation', description: t('prompt_sequence_editor.modifying'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsedArray = JSON.parse(node.value || '[]');
            const characters = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            const charData = characters[cardIndex];
            
            if (!charData) throw new Error("Character card not found.");

            const currentPrompt = charData.prompt;
            const currentDescription = charData.fullDescription;
            const langCode = charData.targetLanguage || (localStorage.getItem('settings_secondaryLanguage') || 'en');
            const targetLanguageName = (languages as any)[langCode]?.name || 'English';

            const result = await modifyCharacter(instruction, currentPrompt, currentDescription, targetLanguageName);
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const next = Array.isArray(prev) ? [...prev] : [prev];
                if (next[cardIndex]) {
                    next[cardIndex] = { 
                        ...next[cardIndex], 
                        prompt: result.newPrompt, 
                        fullDescription: result.newDescription 
                    };
                }
                return next;
            });
            
            addToast(t('toast.modificationComplete'), 'success');

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsModifyingCharacter(null);
            unregisterOperation(opKey);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, addToast]);

    return {
        isEnhancing,
        isEnhancingVideo,
        isSanitizing,
        isTranslating,
        isTranslatingScript,
        isGeneratingScript,
        isGeneratingCharacters,
        isModifyingPromptSequence,
        isUpdatingDescription,
        isUpdatingPersonality,
        isUpdatingAppearance,
        isUpdatingClothing,
        isModifyingCharacter,
        handleEnhance,
        handleEnhanceVideo,
        handleSanitizePrompt,
        handleTranslate,
        handleTranslateScript,
        handleGenerateScript,
        handleGenerateCharacters,
        onModifyPromptSequence,
        handleUpdateCharacterDescription,
        handleUpdateCharacterPersonality,
        handleUpdateCharacterAppearance,
        handleUpdateCharacterClothing,
        handleModifyCharacter,
        isStopping,
        handleStopGeneration
    };
};