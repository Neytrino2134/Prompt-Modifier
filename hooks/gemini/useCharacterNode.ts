
import { useState, useCallback } from 'react';
import { generateImage } from '../../services/geminiService';
import { GeminiGenerationCommonProps } from './types';

export const useCharacterNode = ({
    nodes,
    setError,
    t,
    registerOperation,
    unregisterOperation,
    updateNodeInStorage,
    activeTabId,
    activeTabName,
    activeTabIdRef,
    addToHistory
}: GeminiGenerationCommonProps) => {
    const [isGeneratingCharacterImage, setIsGeneratingCharacterImage] = useState<string | null>(null);

    const handleGenerateCharacterImage = useCallback(async (nodeId: string, characterId: string) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        setIsGeneratingCharacterImage(`${nodeId}-${characterId}`);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const parsed = JSON.parse(node.value || '{}');
            const characters = parsed.characters || [];
            const char = characters.find((c: any) => c.id === characterId);
            if (!char) throw new Error("Character not found");

            const basePrompt = char.prompt || char.imagePrompt;
            if (!basePrompt) throw new Error("No prompt for character");
            
            const suffix = parsed.additionalPrompt || '';
            const prompt = suffix.trim() ? `${basePrompt}, ${suffix}` : basePrompt;
            
            // Use character specific aspect ratio, defaulting to 1:1 if not set
            const aspectRatio = char.aspectRatio || '1:1';

            const imageUrl = await generateImage(prompt, aspectRatio, undefined, 'gemini-3-flash-preview');
            
            if (addToHistory) {
                addToHistory(imageUrl, prompt);
            }
            
            const base64 = imageUrl.split(',')[1];
            
            const newCharacters = characters.map((c: any) => c.id === characterId ? { ...c, imageBase64: base64 } : c);
            
            updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, characters: newCharacters }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGeneratingCharacterImage(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef, addToHistory]);

    return {
        isGeneratingCharacterImage,
        handleGenerateCharacterImage
    };
};
